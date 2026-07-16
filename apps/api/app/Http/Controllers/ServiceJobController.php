<?php

namespace App\Http\Controllers;

use App\Models\ServiceJob;
use App\Models\User;
use App\Support\JobPostingService;
use App\Support\JobPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ServiceJobController extends Controller
{
    public function __construct(private readonly JobPresenter $presenter, private readonly JobPostingService $posting) {}

    public function index(Request $request): JsonResponse
    {
        $jobs = ServiceJob::query()->where('client_user_id', $this->user($request)->id)->latest()->get();

        return response()->json(['data' => $jobs->map(fn (ServiceJob $job) => $this->presenter->owned($job))]);
    }

    public function show(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $this->owns($request, $serviceJob);

        return response()->json(['data' => $this->presenter->owned($serviceJob)]);
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
        abort_unless($serviceJob->status === 'draft', 409, 'Posted jobs cannot be edited in Phase 3.');
        $data = $this->validated($request);
        $serviceJob->update($this->attributes($data) + ['version' => $serviceJob->version + 1]);
        $serviceJob->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $this->user($request)->id, 'event_type' => 'job.draft_updated', 'job_version' => $serviceJob->version, 'metadata' => [], 'occurred_at' => now()]);

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

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
