<?php

namespace App\Http\Controllers;

use App\Models\AcceptedOfferSnapshot;
use App\Models\JobReview;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\JobPostingService;
use App\Support\JobPresenter;
use App\Support\JobRealtimePublisher;
use App\Support\OpportunityMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ServiceJobController extends Controller
{
    public function __construct(private readonly JobPresenter $presenter, private readonly JobPostingService $posting, private readonly JobRealtimePublisher $realtime, private readonly OpportunityMatchingService $matching) {}

    public function index(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $provider = ProviderProfile::query()->where('user_id', $user->id)->first();
        $hiredJobIds = $provider
            ? AcceptedOfferSnapshot::query()->where('provider_profile_id', $provider->id)->pluck('service_job_id')
            : collect();
        $jobs = ServiceJob::query()
            ->where(fn ($query) => $query->where('client_user_id', $user->id)->orWhereIn('id', $hiredJobIds))
            ->latest()
            ->get();

        return response()->json(['data' => $jobs->map(
            fn (ServiceJob $job) => $this->presenter->owned($job) + $this->participantView($job, $user),
        )]);
    }

    public function show(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $user = $this->user($request);
        $role = $this->participantRole($serviceJob, $user);
        abort_unless($role !== null, 404);

        return response()->json(['data' => $this->presenter->owned($serviceJob) + $this->participantView($serviceJob, $user)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        /** @var User $user */ $user = $request->user();
        $key = (string) $request->header('Idempotency-Key');
        abort_if($key === '', 422, 'An Idempotency-Key header is required.');
        $hash = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
        $existing = DB::table('job_idempotency_keys')->where(['user_id' => $user->id, 'operation' => 'create', 'key' => $key])->first();
        if ($existing) {
            abort_unless(hash_equals($existing->request_hash, $hash), 409, 'This idempotency key was used for a different request.');

            return response()->json(['data' => $this->presenter->owned(ServiceJob::query()->whereKey($existing->service_job_id)->firstOrFail())]);
        }

        $job = DB::transaction(function () use ($data, $user, $key, $hash): ServiceJob {
            $job = ServiceJob::query()->create($this->attributes($data) + ['client_user_id' => $user->id]);
            $job->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $user->id, 'event_type' => 'job.draft_created', 'job_version' => 1, 'metadata' => [], 'occurred_at' => now()]);
            DB::table('job_idempotency_keys')->insert(['user_id' => $user->id, 'operation' => 'create', 'key' => $key, 'request_hash' => $hash, 'service_job_id' => $job->id, 'created_at' => now(), 'updated_at' => now()]);

            return $job;
        });

        return response()->json(['data' => $this->presenter->owned($job)], 201);
    }

    public function update(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $this->owns($request, $serviceJob);
        $editable = $serviceJob->status === 'draft'
            || ($serviceJob->status === 'posted' && ! $serviceJob->offers()->exists());
        abort_unless($editable, 409, 'This job can no longer be edited because an offer or work agreement already exists.');
        $data = $this->validated($request);
        if ($serviceJob->status === 'posted') {
            abort_unless(
                $data['categoryId'] === $serviceJob->service_category_id,
                409,
                'The service cannot change after posting. Cancel this job and post a new one instead.',
            );
        }
        $event = $serviceJob->status === 'draft' ? 'job.draft_updated' : 'job.updated';
        DB::transaction(function () use ($serviceJob, $data, $event, $request): void {
            $previousProviderProfileIds = $serviceJob->status === 'posted'
                ? $serviceJob->opportunities()
                    ->pluck('provider_profile_id')
                    ->map(static fn (mixed $id): int => (int) $id)
                    ->values()
                    ->all()
                : [];
            $serviceJob->update($this->attributes($data) + ['version' => $serviceJob->version + 1]);
            if ($serviceJob->status === 'posted') {
                $serviceJob->opportunities()->delete();
                $this->matching->matchJob($serviceJob, $this->user($request)->id);
            }
            $serviceJob->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $this->user($request)->id, 'event_type' => $event, 'job_version' => $serviceJob->version, 'metadata' => [], 'occurred_at' => now()]);
            $this->realtime->record($event, $serviceJob, 'service_job', $serviceJob->id, $serviceJob->version, ['status' => $serviceJob->status], $previousProviderProfileIds);
        });

        return response()->json(['data' => $this->presenter->owned($serviceJob->refresh())]);
    }

    public function post(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $this->owns($request, $serviceJob);

        return response()->json(['data' => $this->presenter->owned($this->posting->post($serviceJob, $this->user($request)))]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate(['title' => ['required', 'string', 'max:120'], 'description' => ['required', 'string', 'min:10', 'max:3000'], 'categoryId' => ['required', 'integer', 'exists:service_categories,id'], 'areaId' => ['required', 'integer', 'exists:areas,id'], 'scheduleType' => ['required', Rule::in(['asap', 'scheduled'])], 'scheduledAt' => ['nullable', 'required_if:scheduleType,scheduled', 'date', 'after:now'], 'budgetMinCentavos' => ['nullable', 'integer', 'min:0', 'max:100000000'], 'budgetMaxCentavos' => ['nullable', 'integer', 'gte:budgetMinCentavos', 'max:100000000'], 'latitude' => ['nullable', 'numeric', 'between:-90,90'], 'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'], 'addressLabel' => ['nullable', 'string', 'max:180']]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        return ['title' => $data['title'], 'description' => $data['description'], 'service_category_id' => $data['categoryId'], 'area_id' => $data['areaId'], 'schedule_type' => $data['scheduleType'], 'scheduled_at' => $data['scheduleType'] === 'scheduled' ? $data['scheduledAt'] : null, 'budget_min_centavos' => $data['budgetMinCentavos'] ?? null, 'budget_max_centavos' => $data['budgetMaxCentavos'] ?? null, 'latitude' => $data['latitude'] ?? null, 'longitude' => $data['longitude'] ?? null, 'address_label' => $data['addressLabel'] ?? null];
    }

    private function owns(Request $request, ServiceJob $job): void
    {
        abort_unless($job->client_user_id === $this->user($request)->id, 404);
    }

    private function participantRole(ServiceJob $job, User $user): ?string
    {
        if ($job->client_user_id === $user->id) {
            return 'client';
        }

        $provider = ProviderProfile::query()->where('user_id', $user->id)->first();
        if (! $provider) {
            return null;
        }

        return AcceptedOfferSnapshot::query()
            ->where('service_job_id', $job->id)
            ->where('provider_profile_id', $provider->id)
            ->exists() ? 'provider' : null;
    }

    /** @return array<string, mixed> */
    private function participantView(ServiceJob $job, User $user): array
    {
        $reviews = JobReview::query()
            ->where('service_job_id', $job->id)
            ->whereNotNull('published_at')
            ->get();
        $received = $reviews->firstWhere('subject_user_id', $user->id);
        $given = $reviews->firstWhere('author_user_id', $user->id);

        return [
            'role' => $job->client_user_id === $user->id ? 'client' : 'provider',
            'ratingReceived' => $received ? ['rating' => $received->rating] : null,
            'ratingGiven' => $given ? ['rating' => $given->rating] : null,
        ];
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
