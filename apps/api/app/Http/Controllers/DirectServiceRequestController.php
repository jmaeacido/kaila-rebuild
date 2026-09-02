<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\JobConversation;
use App\Models\JobOpportunity;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\JobPresenter;
use App\Support\NotificationService;
use App\Support\OfferService;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DirectServiceRequestController extends Controller
{
    public function __construct(
        private readonly JobPresenter $presenter,
        private readonly NotificationService $notifications,
        private readonly OutboxRecorder $outbox,
        private readonly OfferService $offers,
    ) {}

    public function store(Request $request, ProviderProfile $providerProfile): JsonResponse
    {
        $client = $this->user($request);
        abort_unless($providerProfile->status === 'active' && $providerProfile->user_id !== $client->id, 404);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'], 'description' => ['required', 'string', 'min:10', 'max:3000'],
            'categoryId' => ['required', 'integer', Rule::exists('provider_services', 'service_category_id')->where('provider_profile_id', $providerProfile->id)],
            'areaId' => ['required', 'integer', 'exists:areas,id'], 'scheduleType' => ['required', Rule::in(['asap', 'scheduled'])],
            'scheduledAt' => ['nullable', 'required_if:scheduleType,scheduled', 'date', 'after:now'],
            'budgetMinCentavos' => ['nullable', 'integer', 'min:0', 'max:100000000'], 'budgetMaxCentavos' => ['nullable', 'integer', 'gte:budgetMinCentavos', 'max:100000000'],
            'latitude' => ['required', 'numeric', 'between:-90,90'], 'longitude' => ['required', 'numeric', 'between:-180,180'],
            'addressLabel' => ['nullable', 'string', 'max:180'],
        ]);
        $requestArea = Area::query()->whereKey((int) $data['areaId'])->firstOrFail();
        $coveredAreaIds = array_values(array_filter([$requestArea->id, $requestArea->parent_id]));
        abort_unless($providerProfile->serviceAreas()->whereKey($coveredAreaIds)->exists(), 422, 'This provider does not currently cover the selected area.');

        $job = DB::transaction(function () use ($data, $client, $providerProfile): ServiceJob {
            $job = ServiceJob::query()->create([
                'client_user_id' => $client->id, 'direct_provider_profile_id' => $providerProfile->id,
                'service_category_id' => $data['categoryId'], 'area_id' => $data['areaId'], 'status' => 'posted', 'version' => 1,
                'title' => $data['title'], 'description' => $data['description'], 'service_location_mode' => 'at_client',
                'schedule_type' => $data['scheduleType'], 'scheduled_at' => $data['scheduleType'] === 'scheduled' ? $data['scheduledAt'] : null,
                'budget_min_centavos' => $data['budgetMinCentavos'] ?? null, 'budget_max_centavos' => $data['budgetMaxCentavos'] ?? null,
                'latitude' => $data['latitude'], 'longitude' => $data['longitude'], 'address_label' => $data['addressLabel'] ?? null, 'posted_at' => now(),
            ]);
            JobOpportunity::query()->create(['service_job_id' => $job->id, 'provider_profile_id' => $providerProfile->id, 'state' => 'new']);
            JobConversation::query()->create(['id' => (string) Str::uuid(), 'service_job_id' => $job->id]);
            $job->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $client->id, 'event_type' => 'direct_request.created', 'job_version' => 1, 'metadata' => ['providerProfileId' => $providerProfile->id], 'occurred_at' => now()]);
            $this->notifications->send($providerProfile->user_id, 'direct_request.created', 'New direct service request', "{$client->name} requested your service.", 'service_job', $job->id, ['jobId' => $job->id, 'providerProfileId' => $providerProfile->id]);
            $this->outbox->record('direct_request.created', 'service_job', $job->id, 1, ['recipientUserIds' => [(string) $client->id, (string) $providerProfile->user_id], 'data' => ['jobId' => $job->id]]);

            return $job;
        });

        return response()->json(['data' => $this->presenter->owned($job) + ['conversationPath' => "/messages/{$job->id}"]], 201);
    }

    public function accept(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        [$provider, $actor] = $this->providerRecipient($request, $serviceJob);
        $data = $request->validate([
            'amountCentavos' => ['nullable', 'integer', 'min:1', 'max:1000000000'],
            'availabilityText' => ['required', 'string', 'max:160'], 'estimatedDurationText' => ['nullable', 'string', 'max:160'],
            'scope' => ['nullable', 'string', 'max:2000'], 'message' => ['nullable', 'string', 'max:1000'],
        ]);
        $amount = $data['amountCentavos'] ?? $serviceJob->budget_max_centavos ?? $serviceJob->budget_min_centavos;
        abort_if($amount === null, 422, 'Confirm a price before accepting this request.');
        $thread = $this->offers->create($serviceJob, $provider, $actor, [
            'amount_centavos' => $amount, 'availability_text' => $data['availabilityText'],
            'estimated_duration_text' => $data['estimatedDurationText'] ?? null, 'scope' => $data['scope'] ?? $serviceJob->description,
            'message' => $data['message'] ?? null, 'expires_at' => null,
        ]);
        $revision = $thread->revisions()->where('revision_number', 1)->firstOrFail();
        $snapshot = $this->offers->select($serviceJob, $revision, User::query()->findOrFail($serviceJob->client_user_id));

        return response()->json(['data' => ['jobId' => $serviceJob->id, 'status' => 'provider_selected', 'acceptedOfferId' => $snapshot->id]]);
    }

    public function decline(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        [$provider, $actor] = $this->providerRecipient($request, $serviceJob);
        DB::transaction(function () use ($serviceJob, $provider, $actor): void {
            $serviceJob->update(['status' => 'cancelled', 'version' => $serviceJob->version + 1]);
            $serviceJob->opportunities()->where('provider_profile_id', $provider->id)->update(['state' => 'dismissed', 'decided_at' => now()]);
            $serviceJob->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $actor->id, 'event_type' => 'direct_request.declined', 'job_version' => $serviceJob->version, 'metadata' => [], 'occurred_at' => now()]);
            $this->notifications->send($serviceJob->client_user_id, 'direct_request.declined', 'Service request declined', 'The provider is unable to take this request.', 'service_job', $serviceJob->id, ['jobId' => $serviceJob->id]);
            $this->outbox->record('direct_request.declined', 'service_job', $serviceJob->id, $serviceJob->version, ['recipientUserIds' => [(string) $serviceJob->client_user_id, (string) $actor->id], 'data' => ['jobId' => $serviceJob->id, 'status' => 'cancelled']]);
        });

        return response()->json(['data' => ['jobId' => $serviceJob->id, 'status' => 'cancelled']]);
    }

    /** @return array{ProviderProfile, User} */
    private function providerRecipient(Request $request, ServiceJob $job): array
    {
        $actor = $this->user($request);
        $provider = ProviderProfile::query()->whereKey($job->direct_provider_profile_id)->where('user_id', $actor->id)->where('status', 'active')->firstOrFail();
        abort_unless(in_array($job->status, ['posted', 'offers_received'], true), 409, 'This request is no longer pending.');

        return [$provider, $actor];
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
