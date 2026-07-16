<?php

namespace App\Http\Controllers;

use App\Models\OfferRevision;
use App\Models\OfferThread;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\OfferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfferController
{
    public function __construct(private readonly OfferService $service) {}

    public function index(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $user = $this->user($request);
        $query = OfferThread::query()->where('service_job_id', $serviceJob->id)->with(['revisions', 'provider.credentials']);
        if ($serviceJob->client_user_id !== $user->id) {
            $provider = ProviderProfile::query()->where('user_id', $user->id)->first();
            if (! $provider instanceof ProviderProfile) {
                abort(404);
            }
            $query->where('provider_profile_id', $provider->id);
        }

        return response()->json(['data' => $query->get()->map(fn (OfferThread $thread) => $this->present($thread, $user))]);
    }

    public function store(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $user = $this->user($request);
        $provider = ProviderProfile::query()->where('user_id', $user->id)->where('status', 'active')->firstOrFail();
        $thread = $this->service->create($serviceJob, $provider, $user, $this->terms($request));

        return response()->json(['data' => $this->present($thread, $user)], 201);
    }

    public function show(Request $request, OfferThread $offerThread): JsonResponse
    {
        $user = $this->user($request);
        $offerThread->load(['job', 'provider.credentials', 'revisions']);
        $job = $offerThread->job;
        $provider = $offerThread->provider;
        if (! $job instanceof ServiceJob || ! $provider instanceof ProviderProfile || ($job->client_user_id !== $user->id && $provider->user_id !== $user->id)) {
            abort(404);
        }

        return response()->json(['data' => $this->present($offerThread, $user)]);
    }

    public function revise(Request $request, OfferThread $offerThread): JsonResponse
    {
        $thread = $this->service->revise($offerThread, $this->user($request), $this->terms($request));

        return response()->json(['data' => $this->present($thread, $this->user($request))], 201);
    }

    public function withdraw(Request $request, OfferThread $offerThread): JsonResponse
    {
        return response()->json(['data' => $this->service->close($offerThread, $this->user($request), 'withdrawn')]);
    }

    public function decline(Request $request, OfferThread $offerThread): JsonResponse
    {
        return response()->json(['data' => $this->service->close($offerThread, $this->user($request), 'rejected')]);
    }

    public function select(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $data = $request->validate(['offerRevisionId' => ['required', 'uuid']]);
        $revision = OfferRevision::query()->whereKey($data['offerRevisionId'])->firstOrFail();
        $snapshot = $this->service->select($serviceJob, $revision, $this->user($request));

        return response()->json(['data' => ['id' => $snapshot->id, 'jobId' => $snapshot->service_job_id, 'offerRevisionId' => $snapshot->offer_revision_id, 'providerProfileId' => $snapshot->provider_profile_id, 'amountCentavos' => $snapshot->amount_centavos, 'availabilityText' => $snapshot->availability_text, 'estimatedDurationText' => $snapshot->estimated_duration_text, 'scope' => $snapshot->scope, 'message' => $snapshot->message, 'acceptedAt' => $snapshot->accepted_at->toIso8601String()]]);
    }

    /** @return array<string, mixed> */
    private function terms(Request $request): array
    {
        $data = $request->validate(['amountCentavos' => ['required', 'integer', 'min:1', 'max:1000000000'], 'availabilityText' => ['required', 'string', 'max:160'], 'estimatedDurationText' => ['nullable', 'string', 'max:160'], 'scope' => ['required', 'string', 'max:2000'], 'message' => ['nullable', 'string', 'max:1000'], 'expiresAt' => ['nullable', 'date', 'after:now']]);

        return ['amount_centavos' => $data['amountCentavos'], 'availability_text' => $data['availabilityText'], 'estimated_duration_text' => $data['estimatedDurationText'] ?? null, 'scope' => $data['scope'], 'message' => $data['message'] ?? null, 'expires_at' => $data['expiresAt'] ?? null];
    }

    /** @return array<string, mixed> */
    private function present(OfferThread $thread, User $viewer): array
    {
        $thread->loadMissing(['provider.credentials', 'revisions', 'job']);
        $provider = $thread->provider;
        $job = $thread->job;
        if (! $provider instanceof ProviderProfile || ! $job instanceof ServiceJob) {
            abort(404);
        }

        return ['id' => $thread->id, 'jobId' => $thread->service_job_id, 'status' => $thread->status, 'provider' => ['id' => $provider->id, 'displayName' => $provider->display_name, 'rating' => $provider->rating, 'completedJobs' => $provider->completed_jobs, 'responseMinutes' => $provider->response_minutes, 'verified' => $provider->credentials->contains('status', 'approved')], 'latestRevisionNumber' => $thread->latest_revision_number, 'revisions' => $thread->revisions->map(fn (OfferRevision $revision) => ['id' => $revision->id, 'revisionNumber' => $revision->revision_number, 'proposedBy' => $revision->proposed_by_user_id === $job->client_user_id ? 'client' : 'provider', 'amountCentavos' => $revision->amount_centavos, 'availabilityText' => $revision->availability_text, 'estimatedDurationText' => $revision->estimated_duration_text, 'scope' => $revision->scope, 'message' => $revision->message, 'expiresAt' => $revision->expires_at?->toIso8601String(), 'createdAt' => $revision->created_at->toIso8601String()])];
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
