<?php

namespace App\Http\Controllers;

use App\Models\IdentityEvidence;
use App\Models\IdentityVerification;
use App\Models\IdentityVerificationSession;
use App\Models\User;
use App\Support\AuditRecorder;
use App\Support\IdentityVerificationService;
use App\Support\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class AdminIdentityVerificationController extends Controller
{
    public function __construct(private readonly AuditRecorder $audit, private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        $items = IdentityVerification::query()->where(function ($query): void {
            $query->whereIn('status', ['submitted', 'in_review'])->orWhereNotNull('appeal_requested_at');
        })->where(fn ($query) => $query->whereNull('assigned_to')->orWhere('assigned_to', $actor->id))->with(['user:id,name,email', 'evidence'])->oldest('submitted_at')->get();
        return response()->json(['data' => $items->map(fn (IdentityVerification $item) => $this->present($item))]);
    }

    public function preview(Request $request, IdentityEvidence $identityEvidence): Response
    {
        $data = $request->validate(['reason' => ['required', Rule::in(['initial_review', 'appeal_review', 'safety_investigation'])]]);
        abort_unless($identityEvidence->scan_status === 'clean' && $identityEvidence->purged_at === null, 409, 'This evidence is not available for review.');
        $actor = $this->user($request);
        DB::transaction(function () use ($identityEvidence, $actor): void {
            $verification = IdentityVerification::query()->lockForUpdate()->findOrFail($identityEvidence->identity_verification_id);
            abort_if($verification->appeal_requested_at !== null && $verification->reviewed_by === $actor->id, 409, 'Appeals must be handled by a different reviewer.');
            abort_if($verification->assigned_to !== null && $verification->assigned_to !== $actor->id, 409, 'Another reviewer is handling this case.');
            if ($verification->assigned_to === null) $verification->update(['assigned_to' => $actor->id, 'status' => 'in_review']);
        });
        $this->audit->record($request, 'identity.evidence_viewed', $actor, 'identity_evidence', $identityEvidence->id, ['reason' => $data['reason'], 'verificationId' => $identityEvidence->identity_verification_id]);

        $bytes = Storage::disk($identityEvidence->disk)->get($identityEvidence->object_key);
        abort_if($bytes === null, 404, 'This evidence is no longer available.');
        abort_unless(function_exists('imagecreatefromstring'), 503, 'Protected preview processing is unavailable.');
        $image = @imagecreatefromstring($bytes); abort_if($image === false, 409, 'This evidence cannot be previewed.');
        $label = "KAILA REVIEW · USER {$actor->id} · ".now()->utc()->format('Y-m-d H:i').' UTC';
        $background = imagecolorallocatealpha($image, 10, 18, 32, 35); $foreground = imagecolorallocate($image, 255, 255, 255);
        abort_if($background === false || $foreground === false, 500, 'Protected preview processing failed.');
        imagefilledrectangle($image, 0, max(0, imagesy($image) - 28), imagesx($image), imagesy($image), $background);
        imagestring($image, 3, 8, max(4, imagesy($image) - 21), $label, $foreground);
        ob_start(); imagejpeg($image, null, 86); $preview = ob_get_clean(); imagedestroy($image);

        return response($preview, 200, [
            'Content-Type' => 'image/jpeg', 'Cache-Control' => 'private, no-store, max-age=0',
            'Content-Disposition' => 'inline; filename="identity-review.jpg"',
            'X-Content-Type-Options' => 'nosniff', 'Content-Security-Policy' => "default-src 'none'; sandbox",
        ]);
    }

    public function decide(Request $request, IdentityVerification $identityVerification): JsonResponse
    {
        $data = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'rejected', 'needs_resubmission', 'escalated'])],
            'reason' => ['required', Rule::in(['matched', 'image_unclear', 'document_expired', 'document_unsupported', 'identity_mismatch', 'age_uncertain', 'underage', 'suspected_tampering', 'needs_senior_review'])],
            'nameMatches' => ['required', 'boolean'], 'dateOfBirthMatches' => ['required', 'boolean'], 'ageEligible' => ['required', 'boolean'],
        ]);
        $reviewer = $this->user($request);
        abort_unless($identityVerification->assigned_to === $reviewer->id, 409, 'Open the evidence to claim this case before deciding it.');
        abort_unless($identityVerification->status === 'submitted' || $identityVerification->status === 'in_review' || $identityVerification->appeal_requested_at !== null, 409, 'This case is not awaiting review.');
        $latestSessionId = IdentityVerificationSession::query()->where('identity_verification_id', $identityVerification->id)->whereNotNull('used_at')->latest('used_at')->value('id');
        abort_if($latestSessionId === null || $identityVerification->evidence()->where('session_id', $latestSessionId)->where('scan_status', '!=', 'clean')->exists(), 409, 'Every evidence image must pass scanning before review.');
        if ($data['decision'] === 'approved') {
            abort_unless($data['reason'] === 'matched' && $data['nameMatches'] && $data['dateOfBirthMatches'] && $data['ageEligible'], 422, 'Approval requires every identity check to pass.');
            abort_if($identityVerification->document_expires_at?->isPast() === true, 422, 'An expired document cannot be approved.');
        }
        if ($identityVerification->appeal_requested_at !== null) {
            abort_if($identityVerification->reviewed_by === $reviewer->id, 409, 'An appeal must be decided by a different reviewer.');
        }

        DB::transaction(function () use ($identityVerification, $data, $reviewer, $request): void {
            $appeal = $identityVerification->appeal_requested_at !== null;
            $identityVerification->update([
                'status' => $data['decision'], 'decision_reason' => $data['reason'], 'name_matches' => $data['nameMatches'],
                'date_of_birth_matches' => $data['dateOfBirthMatches'], 'age_eligible' => $data['ageEligible'],
                'reviewed_by' => $reviewer->id, 'reviewed_at' => now(),
                'verified_until' => $data['decision'] === 'approved' ? now()->addYear() : null,
                'appeal_reviewed_by' => $appeal ? $reviewer->id : $identityVerification->appeal_reviewed_by,
                'appeal_requested_at' => null,
                'assigned_to' => null,
            ]);
            $retention = $data['decision'] === 'approved' ? config('identity_verification.approved_retention_days') : config('identity_verification.rejected_retention_days');
            $identityVerification->evidence()->update(['purge_after' => now()->addDays((int) $retention)]);
            $this->audit->record($request, 'identity.review_decided', $reviewer, 'identity_verification', $identityVerification->id, ['decision' => $data['decision'], 'reason' => $data['reason'], 'appeal' => $appeal]);
        });
        $approved = $data['decision'] === 'approved';
        $this->notifications->send($identityVerification->user_id, 'identity.reviewed', $approved ? 'Identity verified' : 'Identity check updated', $approved ? 'Your identity is verified.' : 'Open identity verification to review the result and next step.', 'identity_verification', $identityVerification->id, ['status' => $data['decision']]);

        $identityVerification->refresh()->load(['user', 'evidence']);
        return response()->json(['data' => $this->present($identityVerification)]);
    }

    /** @return array<string, mixed> */
    private function present(IdentityVerification $item): array
    {
        return ['id' => $item->id, 'status' => $item->status, 'idType' => $item->id_type, 'issuingCountry' => $item->issuing_country,
            'documentExpiresAt' => $item->document_expires_at?->toDateString(), 'submittedAt' => $item->submitted_at?->toIso8601String(),
            'appealRequestedAt' => $item->appeal_requested_at?->toIso8601String(), 'user' => ['id' => $item->user_id, 'name' => $item->user?->name, 'email' => $item->user?->email],
            'evidence' => $item->evidence->where('session_id', $item->evidence->sortByDesc('created_at')->first()?->session_id)->values()->map(fn (IdentityEvidence $evidence) => ['id' => $evidence->id, 'kind' => $evidence->kind, 'scanStatus' => $evidence->scan_status, 'previewUrl' => "/api/v1/admin/marketplace/identity-verifications/evidence/{$evidence->id}/preview"]),
        ];
    }

    private function user(Request $request): User { $user = $request->user(); abort_unless($user instanceof User, 401); return $user; }
}
