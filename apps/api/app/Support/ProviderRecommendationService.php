<?php

namespace App\Support;

use App\Models\Area;
use App\Models\ClientProfile;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Support\Str;

class ProviderRecommendationService
{
    /**
     * @return array{category: array{id: int, name: string}|null, area: array{id: int, name: string}|null, providers: array<int, array<string, mixed>>, total: int}
     */
    public function recommend(User $user, ?string $serviceQuery, string $message): array
    {
        $categories = ServiceCategory::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'slug']);
        $category = $categories->first(function (ServiceCategory $candidate) use ($serviceQuery, $message): bool {
            $needles = array_filter([$this->normalize($serviceQuery), $this->normalize($message)]);
            $names = array_filter([$this->normalize($candidate->name), $this->normalize($candidate->slug)]);

            foreach ($needles as $needle) {
                foreach ($names as $name) {
                    if ($needle === $name || str_contains(" {$needle} ", " {$name} ")) {
                        return true;
                    }
                }
            }

            return false;
        });

        $clientAreaId = ClientProfile::query()->where('user_id', $user->id)->value('area_id');
        $area = $clientAreaId ? Area::query()->whereKey($clientAreaId)->first() : null;

        if (! $category instanceof ServiceCategory) {
            return ['category' => null, 'area' => $this->area($area), 'providers' => [], 'total' => 0];
        }

        $matchingAreaIds = $area ? array_values(array_filter([$area->id, $area->parent_id])) : [];
        $query = ProviderProfile::query()
            ->where('status', 'active')
            ->where('user_id', '!=', $user->id)
            ->whereHas('services', fn ($services) => $services->whereKey($category->id)->where('is_active', true))
            ->when($area, fn ($providers) => $providers->whereHas(
                'serviceAreas',
                fn ($areas) => $areas->whereKey($matchingAreaIds)->where('is_active', true),
            ));
        $total = (clone $query)->count();
        $providers = $query
            ->with(['serviceAreas:id,name,type,parent_id', 'credentials' => fn ($credentials) => $credentials->where('review_status', 'approved')])
            ->orderByDesc('rating')
            ->orderBy('id')
            ->limit(5)
            ->get();

        return [
            'category' => ['id' => $category->id, 'name' => $category->name],
            'area' => $this->area($area),
            'providers' => $providers->map(fn (ProviderProfile $provider): array => [
                'id' => $provider->id,
                'displayName' => $provider->display_name,
                'rating' => $provider->rating === null ? null : (float) $provider->rating,
                'completedJobs' => $provider->completedJobsCount(),
                'verified' => $provider->credentials->isNotEmpty(),
                'responseMinutes' => $provider->response_minutes,
                'serviceAreas' => $provider->serviceAreas->pluck('name')->values()->all(),
                'href' => "/providers/{$provider->id}",
            ])->all(),
            'total' => $total,
        ];
    }

    private function normalize(?string $value): string
    {
        return trim(Str::of((string) $value)->lower()->replaceMatches('/[^a-z0-9]+/', ' ')->value());
    }

    /** @return array{id: int, name: string}|null */
    private function area(?Area $area): ?array
    {
        return $area ? ['id' => $area->id, 'name' => $area->name] : null;
    }
}
