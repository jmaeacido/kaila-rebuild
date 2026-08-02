<?php

namespace App\Support;

use App\Models\Area;
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
        $cityName = $boundary['city'] ? $this->normalize($boundary['city']) : null;
        $barangays = Area::query()
            ->where('type', 'barangay')
            ->where('is_active', true)
            ->with('parent')
            ->get();

        return $barangays->first(function (Area $barangay) use ($barangayName, $cityName): bool {
            if ($this->normalize($barangay->name) !== $barangayName) {
                return false;
            }

            return $cityName === null
                || ($barangay->parent && $this->normalize($barangay->parent->name) === $cityName);
        });
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
