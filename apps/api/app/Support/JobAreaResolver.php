<?php

namespace App\Support;

use App\Models\Area;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class JobAreaResolver
{
    public function __construct(private readonly PhilippineBarangayBoundaryProvider $boundaries) {}

    public function resolve(float $latitude, float $longitude): ?Area
    {
        $boundary = $this->boundaries->locate($latitude, $longitude);
        if (! $boundary) {
            return null;
        }

        if ($boundary['code']) {
            $byCode = Area::query()
                ->where('type', 'barangay')
                ->where('is_active', true)
                ->where('code', $boundary['code'])
                ->with('parent')
                ->first();
            if ($byCode) {
                return $byCode;
            }
        }

        $barangayName = $this->normalize($boundary['barangay']);
        if ($barangayName === '') {
            return null;
        }

        $cityIds = $this->matchingCityIds($boundary['city']);
        if ($boundary['city'] && $cityIds->isEmpty()) {
            return null;
        }

        $candidates = Area::query()
            ->where('type', 'barangay')
            ->where('is_active', true)
            ->with('parent')
            ->when($cityIds->isNotEmpty(), fn ($query) => $query->whereIn('parent_id', $cityIds))
            ->when($cityIds->isEmpty(), function ($query) use ($boundary): void {
                $query->where('name', $boundary['barangay'])->limit(25);
            })
            ->get();

        return $candidates->first(
            fn (Area $barangay): bool => $this->normalize($barangay->name) === $barangayName,
        );
    }

    /** @return Collection<int, int> */
    private function matchingCityIds(?string $cityName): Collection
    {
        if (! $cityName) {
            return collect();
        }

        $normalizedCity = $this->normalize($cityName);
        if ($normalizedCity === '') {
            return collect();
        }

        return Area::query()
            ->whereIn('type', ['city', 'municipality'])
            ->where('is_active', true)
            ->get(['id', 'name'])
            ->filter(fn (Area $city): bool => $this->normalize($city->name) === $normalizedCity)
            ->pluck('id')
            ->values();
    }

    private function normalize(string $name): string
    {
        return (string) Str::of($name)
            ->lower()
            ->replaceMatches('/\([^)]*\)/u', '')
            ->replaceMatches('/\b(barangay|brgy\.?|bgy\.?|city of|city|municipality of|municipality|poblacion|pob\.?)\b/u', '')
            ->replaceMatches('/[^a-z0-9]+/u', ' ')
            ->squish();
    }
}
