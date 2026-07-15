<?php

namespace App\Http\Controllers;

use App\Models\ClientProfile;
use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MarketplaceProfileController extends Controller
{
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
        ]);
        /** @var User $user */ $user = $request->user();
        $profile = DB::transaction(function () use ($user, $data): ProviderProfile {
            $profile = ProviderProfile::query()->updateOrCreate(['user_id' => $user->id], [
                'display_name' => $data['displayName'], 'bio' => $data['bio'], 'years_experience' => $data['yearsExperience'],
                'status' => $this->ownedProvider($user)?->status === 'active' ? 'active' : 'pending_review',
            ]);
            $profile->services()->sync($data['serviceIds']);
            $profile->serviceAreas()->sync($data['areaIds']);
            $profile->availability()->delete();
            $profile->availability()->createMany(array_map(fn (array $slot) => ['day_of_week' => $slot['dayOfWeek'], 'starts_at' => $slot['startsAt'], 'ends_at' => $slot['endsAt'], 'is_available' => true], $data['availability']));

            return $profile;
        });

        return response()->json(['data' => $profile->load(['services:id,name,slug,icon', 'serviceAreas:id,name,type,code', 'availability'])]);
    }

    public function discover(Request $request): JsonResponse
    {
        $data = $request->validate(['categoryId' => ['required', 'integer', 'exists:service_categories,id'], 'areaId' => ['required', 'integer', 'exists:areas,id']]);
        $profiles = ProviderProfile::query()->where('status', 'active')
            ->whereHas('services', fn ($q) => $q->whereKey($data['categoryId'])->where('is_active', true))
            ->whereHas('serviceAreas', fn ($q) => $q->whereKey($data['areaId'])->where('is_active', true))
            ->with(['services:id,name,slug,icon', 'serviceAreas:id,name,type,code', 'portfolio:id,user_id,caption,sort_order', 'credentials' => fn ($q) => $q->where('review_status', 'approved')])
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
        return ['id' => $profile->id, 'displayName' => $profile->display_name, 'bio' => $profile->bio, 'yearsExperience' => $profile->years_experience,
            'rating' => $profile->rating, 'completedJobs' => $profile->completed_jobs, 'responseMinutes' => $profile->response_minutes,
            'memberSince' => $profile->created_at?->toDateString(), 'verified' => $profile->credentials->isNotEmpty(),
            'services' => $profile->services, 'serviceAreas' => $profile->serviceAreas, 'availability' => $profile->relationLoaded('availability') ? $profile->availability : [],
            'portfolio' => $profile->portfolio->map(fn (ProfileAsset $asset) => ['id' => $asset->id, 'caption' => $asset->caption, 'downloadPath' => "/api/v1/profile-assets/{$asset->id}"])];
    }
}
