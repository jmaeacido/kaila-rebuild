<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\ClientProfile;
use App\Models\JobReview;
use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Support\AdminNotificationService;
use App\Support\OpportunityMatchingService;
use App\Support\OutboxRecorder;
use App\Support\ProviderProfileReviewBaseline;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MarketplaceProfileController extends Controller
{
    public function __construct(
        private readonly OpportunityMatchingService $matching,
        private readonly OutboxRecorder $outbox,
        private readonly AdminNotificationService $adminNotifications,
    ) {}

    public function show(Request $request): JsonResponse
    {
        /** @var User $user */ $user = $request->user();

        return response()->json(['data' => [
            'activeMode' => $user->active_mode,
            'client' => ClientProfile::query()->where('user_id', $user->id)->first(),
            'provider' => $this->ownedProvider($user)?->load(['services:id,name,slug,icon', 'serviceAreas:id,name,type,code', 'availability', 'credentials']),
        ]]);
    }

    public function mode(Request $request): JsonResponse
    {
        $data = $request->validate(['activeMode' => ['required', Rule::in(['client', 'provider'])]]);
        /** @var User $user */ $user = $request->user();
        $user->update(['active_mode' => $data['activeMode']]);

        return response()->json(['data' => ['activeMode' => $user->active_mode]]);
    }

    public function client(Request $request): JsonResponse
    {
        $data = $request->validate(['displayName' => ['required', 'string', 'max:100'], 'areaId' => ['nullable', 'integer', 'exists:areas,id']]);
        /** @var User $user */ $user = $request->user();
        $profile = ClientProfile::query()->updateOrCreate(['user_id' => $user->id], ['display_name' => $data['displayName'], 'area_id' => $data['areaId'] ?? null]);

        return response()->json(['data' => $profile], 200);
    }

    public function provider(Request $request): JsonResponse
    {
        $data = $request->validate([
            'displayName' => ['required', 'string', 'max:100'], 'bio' => ['required', 'string', 'min:20', 'max:1200'],
            'yearsExperience' => ['required', 'integer', 'min:0', 'max:80'],
            'serviceIds' => ['required', 'array', 'min:1'], 'serviceIds.*' => ['integer', 'distinct', 'exists:service_categories,id'],
            'areaIds' => ['required', 'array', 'min:1'], 'areaIds.*' => ['integer', 'distinct', 'exists:areas,id'],
            'availability' => ['required', 'array', 'min:1'], 'availability.*.dayOfWeek' => ['required', 'integer', 'between:0,6'],
            'availability.*.startsAt' => ['required', 'date_format:H:i'], 'availability.*.endsAt' => ['required', 'date_format:H:i', 'after:availability.*.startsAt'],
            'offersAtShop' => ['sometimes', 'boolean'],
            'shopName' => ['nullable', 'required_if:offersAtShop,true', 'string', 'max:120'],
            'shopAddress' => ['nullable', 'required_if:offersAtShop,true', 'string', 'max:180'],
            'shopLatitude' => ['nullable', 'required_if:offersAtShop,true', 'numeric', 'between:-90,90'],
            'shopLongitude' => ['nullable', 'required_if:offersAtShop,true', 'numeric', 'between:-180,180'],
        ]);
        /** @var User $user */ $user = $request->user();
        $profile = DB::transaction(function () use ($user, $data): ProviderProfile {
            $existing = ProviderProfile::query()
                ->where('user_id', $user->id)
                ->with(['services:id,name', 'serviceAreas:id,name,type', 'availability'])
                ->first();
            $reviewBaseline = $existing ? ProviderProfileReviewBaseline::capture($existing) : null;

            $profile = ProviderProfile::query()->updateOrCreate(['user_id' => $user->id], [
                'display_name' => $data['displayName'], 'bio' => $data['bio'], 'years_experience' => $data['yearsExperience'],
                'status' => 'pending_review',
                'reviewed_by' => null,
                'review_note' => null,
                'reviewed_at' => null,
                'review_baseline' => $reviewBaseline,
                'offers_at_shop' => $data['offersAtShop'] ?? false,
                'shop_name' => ($data['offersAtShop'] ?? false) ? $data['shopName'] : null,
                'shop_address' => ($data['offersAtShop'] ?? false) ? $data['shopAddress'] : null,
                'shop_latitude' => ($data['offersAtShop'] ?? false) ? $data['shopLatitude'] : null,
                'shop_longitude' => ($data['offersAtShop'] ?? false) ? $data['shopLongitude'] : null,
            ]);
            $profile->services()->sync($data['serviceIds']);
            $profile->serviceAreas()->sync($data['areaIds']);
            $profile->availability()->delete();
            $profile->availability()->createMany(array_map(fn (array $slot) => ['day_of_week' => $slot['dayOfWeek'], 'starts_at' => $slot['startsAt'], 'ends_at' => $slot['endsAt'], 'is_available' => true], $data['availability']));
            $this->outbox->record('profile.updated', 'provider_profile', (string) $profile->id, (int) now()->format('U'), ['rooms' => ["user:{$user->id}"], 'providerProfileId' => $profile->id]);

            return $profile;
        });
        $this->matching->reconcileProvider($profile);
        $this->adminNotifications->send(
            'admin.review.provider_submitted',
            'Provider profile needs review',
            "{$profile->display_name} submitted a provider profile.",
            'provider_profile',
            (string) $profile->id,
            ['providerProfileId' => $profile->id],
        );

        return response()->json(['data' => $profile->load(['services:id,name,slug,icon', 'serviceAreas:id,name,type,code', 'availability'])]);
    }

    public function discover(Request $request): JsonResponse
    {
        $data = $request->validate(['categoryId' => ['nullable', 'integer', 'exists:service_categories,id'], 'areaId' => ['nullable', 'integer', 'exists:areas,id'], 'query' => ['nullable', 'string', 'max:100']]);
        $area = isset($data['areaId']) ? Area::query()->whereKey($data['areaId'])->firstOrFail() : null;
        $matchingAreaIds = $area ? array_values(array_filter([$area->id, $area->parent_id])) : [];
        $profiles = ProviderProfile::query()->where('status', 'active')
            ->when(isset($data['categoryId']), fn ($q) => $q->whereHas('services', fn ($service) => $service->whereKey($data['categoryId'])->where('is_active', true)))
            ->when($area, fn ($q) => $q->whereHas('serviceAreas', fn ($serviceArea) => $serviceArea->whereKey($matchingAreaIds)->where('is_active', true)))
            ->when(trim($data['query'] ?? '') !== '', fn ($q) => $q->where(fn ($name) => $name->where('display_name', 'like', '%'.trim($data['query']).'%')->orWhere('shop_name', 'like', '%'.trim($data['query']).'%')))
            ->with(['services:id,name,slug,icon', 'serviceAreas:id,name,type,code', 'availability', 'portfolio:id,user_id,caption,sort_order', 'credentials' => fn ($q) => $q->where('review_status', 'approved')])
            ->orderByDesc('rating')->orderBy('id')->paginate(20);

        return response()->json(['data' => $profiles->getCollection()->map(fn (ProviderProfile $profile) => $this->publicProvider($profile)), 'meta' => ['currentPage' => $profiles->currentPage(), 'lastPage' => $profiles->lastPage()]]);
    }

    public function publicProfile(ProviderProfile $providerProfile): JsonResponse
    {
        abort_unless($providerProfile->status === 'active', 404);

        return response()->json(['data' => $this->publicProvider($providerProfile->load(['services:id,name,slug,icon', 'serviceAreas:id,name,type,code', 'availability', 'portfolio:id,user_id,caption,sort_order', 'credentials' => fn ($q) => $q->where('review_status', 'approved')]))]);
    }

    private function ownedProvider(User $user): ?ProviderProfile
    {
        return ProviderProfile::query()->where('user_id', $user->id)->first();
    }

    /** @return array<string, mixed> */
    private function publicProvider(ProviderProfile $profile): array
    {
        $reputation = DB::table('reputation_projections')
            ->where('user_id', $profile->user_id)
            ->first(['average_rating', 'published_review_count']);
        $avatar = ProfileAsset::query()
            ->where('user_id', $profile->user_id)
            ->where('purpose', 'avatar')
            ->where('scan_status', 'clean')
            ->latest()
            ->first();
        $completedJobs = DB::table('accepted_offer_snapshots')
            ->join('service_jobs', 'service_jobs.id', '=', 'accepted_offer_snapshots.service_job_id')
            ->where('accepted_offer_snapshots.provider_profile_id', $profile->id)
            ->whereNotNull('service_jobs.completed_at')
            ->count();

        return ['id' => $profile->id, 'displayName' => $profile->display_name, 'avatarUrl' => $avatar ? "/api/v1/profile-assets/{$avatar->id}" : null, 'bio' => $profile->bio, 'yearsExperience' => $profile->years_experience,
            'rating' => $reputation?->average_rating !== null
                ? (float) $reputation->average_rating
                : ($profile->rating !== null ? (float) $profile->rating : null),
            'reviewCount' => (int) ($reputation?->published_review_count ?? 0),
            'completedJobs' => $completedJobs, 'responseMinutes' => $profile->response_minutes,
            'memberSince' => $profile->created_at?->toDateString(), 'verified' => $profile->credentials->isNotEmpty(),
            'services' => $profile->services, 'serviceAreas' => $profile->serviceAreas, 'availability' => $profile->relationLoaded('availability') ? $profile->availability : [],
            'availabilityStatus' => $profile->relationLoaded('availability') && $profile->availability->contains('is_available', true) ? 'available' : 'unavailable',
            'offersAtShop' => $profile->offers_at_shop, 'shopName' => $profile->offers_at_shop ? $profile->shop_name : null,
            'shopAddress' => $profile->offers_at_shop ? $profile->shop_address : null,
            'shopLocation' => $profile->offers_at_shop && $profile->shop_latitude !== null ? ['latitude' => (float) $profile->shop_latitude, 'longitude' => (float) $profile->shop_longitude] : null,
            'reviews' => JobReview::query()->where('subject_user_id', $profile->user_id)->whereNotNull('published_at')->latest('published_at')->limit(10)->get()->map(fn (JobReview $review) => ['id' => $review->id, 'rating' => $review->rating, 'comment' => $review->comment, 'publishedAt' => $review->published_at?->toDateString()]),
            'portfolio' => $profile->portfolio->map(fn (ProfileAsset $asset) => ['id' => $asset->id, 'caption' => $asset->caption, 'downloadPath' => "/api/v1/profile-assets/{$asset->id}"])];
    }
}
