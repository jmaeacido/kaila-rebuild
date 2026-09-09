<?php

namespace App\Http\Controllers;

use App\Jobs\ScanIdentityEvidence;
use App\Models\IdentityEvidence;
use App\Models\IdentityVerification;
use App\Models\IdentityVerificationConsent;
use App\Models\IdentityVerificationSession;
use App\Models\User;
use App\Support\AuditRecorder;
use App\Support\IdentityVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class IdentityVerificationController extends Controller
{
    public function __construct(private readonly IdentityVerificationService $service, private readonly AuditRecorder $audit) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->status($this->user($request))]);
    }

    public function consent(Request $request): JsonResponse
    {
        abort_unless(config('identity_verification.capture_enabled'), 503, 'Identity verification is not available yet.');
        $data = $request->validate([
            'noticeVersion' => ['required', Rule::in([(string) config('identity_verification.notice_version')])],
            'privacyPolicyVersion' => ['required', Rule::in([(string) config('identity_verification.privacy_policy_version')])],
            'purpose' => ['required', Rule::in(['identity_verification'])],
            'trigger' => ['required', Rule::in(['post_first_job', 'activate_provider', 'account_settings'])],
            'consented' => ['required', 'accepted'],
        ]);
        $user = $this->user($request);
        abort_if($this->service->approved($user), 409, 'Your identity is already verified.');
        $plainToken = Str::random(64);

        [$verification, $session] = DB::transaction(function () use ($user, $data, $request, $plainToken): array {
            $verification = IdentityVerification::query()->firstOrCreate(['user_id' => $user->id], ['status' => 'not_started']);
            abort_if(in_array($verification->status, ['submitted', 'in_review'], true), 409, 'Your identity check is already in review.');
            $consent = IdentityVerificationConsent::query()->create([
                'identity_verification_id' => $verification->id, 'user_id' => $user->id,
                'notice_version' => $data['noticeVersion'], 'privacy_policy_version' => $data['privacyPolicyVersion'],
                'purpose' => $data['purpose'], 'trigger' => $data['trigger'],
                'request_id' => $request->attributes->get('requestId') ?? (string) Str::uuid(), 'consented_at' => now(),
            ]);
            $session = IdentityVerificationSession::query()->create([
                'identity_verification_id' => $verification->id, 'consent_id' => $consent->id,
                'token_hash' => hash('sha256', $plainToken), 'expires_at' => now()->addMinutes(30),
            ]);
            $verification->update(['status' => 'capturing', 'consent_withdrawn_at' => null]);
            $this->audit->record($request, 'identity.consent_given', $user, 'identity_verification', $verification->id, ['noticeVersion' => $data['noticeVersion'], 'trigger' => $data['trigger']]);
            return [$verification, $session];
        });

        return response()->json(['data' => ['sessionId' => $session->id, 'uploadToken' => $plainToken, 'expiresAt' => Carbon::parse($session->expires_at)->toIso8601String(), 'verificationId' => $verification->id]], 201);
    }

    public function submit(Request $request): JsonResponse
    {
        abort_unless(config('identity_verification.capture_enabled'), 503, 'Identity verification is not available yet.');
        $max = (int) config('identity_verification.max_upload_kilobytes');
        $data = $request->validate([
            'sessionId' => ['required', 'uuid'], 'uploadToken' => ['required', 'string', 'size:64'],
            'idType' => ['required', Rule::in(['philid', 'passport', 'drivers_license', 'umid', 'postal_id', 'prc_id'])],
            'issuingCountry' => ['required', Rule::in(['PH'])], 'documentExpiresAt' => ['nullable', 'date', 'after:today'],
            'idFront' => ['required', 'file', 'image', "max:{$max}"], 'idBack' => ['nullable', 'file', 'image', "max:{$max}"],
            'selfie' => ['required', 'file', 'image', "max:{$max}"], 'selfieCapturedNow' => ['required', 'accepted'],
        ]);
        $user = $this->user($request);
        $session = IdentityVerificationSession::query()->whereKey($data['sessionId'])->lockForUpdate()->firstOrFail();
        abort_unless(hash_equals($session->token_hash, hash('sha256', $data['uploadToken'])), 403, 'This verification session is invalid.');
        abort_if($session->used_at !== null || Carbon::parse($session->expires_at)->isPast(), 409, 'This verification session has expired.');
        $verification = IdentityVerification::query()->whereKey($session->identity_verification_id)->where('user_id', $user->id)->firstOrFail();
        $disk = (string) config('identity_verification.disk');
        $stored = [];
        try {
            foreach (['id_front' => 'idFront', 'id_back' => 'idBack', 'selfie' => 'selfie'] as $kind => $field) {
                if (! $request->hasFile($field)) continue;
                $upload = $request->file($field);
                $source = file_get_contents($upload->getRealPath());
                abort_if($source === false, 422, 'One of the images could not be safely decoded.');
                $bytes = $this->normalizedJpeg($source);
                $key = "quarantine/{$verification->id}/".Str::uuid().'.jpg';
                Storage::disk($disk)->put($key, $bytes);
                $stored[] = IdentityEvidence::query()->create([
                    'identity_verification_id' => $verification->id, 'session_id' => $session->id, 'kind' => $kind, 'disk' => $disk,
                    'object_key' => $key, 'mime_type' => 'image/jpeg', 'size_bytes' => strlen($bytes),
                    'sha256' => hash('sha256', $bytes), 'scan_status' => 'pending', 'purge_after' => now()->addHours((int) config('identity_verification.abandoned_hours')),
                ]);
            }
            DB::transaction(function () use ($session, $verification, $data, $request, $user): void {
                $session->update(['used_at' => now()]);
                $verification->update(['status' => 'submitted', 'id_type' => $data['idType'], 'issuing_country' => $data['issuingCountry'], 'document_expires_at' => $data['documentExpiresAt'] ?? null, 'submitted_at' => now(), 'decision_reason' => null]);
                $this->audit->record($request, 'identity.evidence_submitted', $user, 'identity_verification', $verification->id, ['evidenceCount' => count($verification->evidence()->get())]);
            });
        } catch (\Throwable $exception) {
            foreach ($stored as $evidence) { Storage::disk($evidence->disk)->delete($evidence->object_key); $evidence->delete(); }
            throw $exception;
        }
        foreach ($stored as $evidence) ScanIdentityEvidence::dispatch($evidence->id);

        return response()->json(['data' => $this->service->status($user->refresh())], 201);
    }

    public function appeal(Request $request): JsonResponse
    {
        $user = $this->user($request); $verification = $user->identityVerification()->firstOrFail();
        abort_unless(in_array($verification->status, ['rejected', 'needs_resubmission'], true), 409, 'This identity check cannot be appealed.');
        abort_if($verification->appeal_requested_at !== null, 409, 'An appeal is already pending.');
        $verification->update(['appeal_requested_at' => now(), 'assigned_to' => null]);
        $this->audit->record($request, 'identity.appeal_requested', $user, 'identity_verification', $verification->id);
        return response()->json(['data' => $this->service->status($user)]);
    }

    public function withdraw(Request $request): JsonResponse
    {
        $user = $this->user($request); $verification = $user->identityVerification()->firstOrFail();
        $verification->update(['status' => 'withdrawn', 'consent_withdrawn_at' => now()]);
        $verification->consents()->whereNull('withdrawn_at')->update(['withdrawn_at' => now()]);
        $verification->evidence()->whereNull('purged_at')->update(['purge_after' => now()]);
        $this->audit->record($request, 'identity.consent_withdrawn', $user, 'identity_verification', $verification->id);
        return response()->json(['data' => $this->service->status($user)]);
    }

    private function user(Request $request): User { $user = $request->user(); abort_unless($user instanceof User, 401); return $user; }

    private function normalizedJpeg(string $source): string
    {
        abort_unless(function_exists('imagecreatefromstring'), 503, 'Secure image processing is temporarily unavailable.');
        $image = @imagecreatefromstring($source);
        abort_if($image === false, 422, 'One of the images could not be safely decoded.');
        ob_start();
        try { imagejpeg($image, null, 90); $encoded = ob_get_clean(); } finally { imagedestroy($image); }
        abort_if($encoded === '', 422, 'One of the images could not be safely decoded.');
        return $encoded;
    }
}
