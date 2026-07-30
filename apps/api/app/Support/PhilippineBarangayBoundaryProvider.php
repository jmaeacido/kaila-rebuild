<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class PhilippineBarangayBoundaryProvider
{
    /** @return array{code: string|null, barangay: string, city: string|null}|null */
    public function locate(float $latitude, float $longitude): ?array
    {
        $response = Http::acceptJson()
            ->withUserAgent('KAILA/1.0 (https://kaila-app.com)')
            ->timeout((int) config('maps.request_timeout_seconds', 5))
            ->retry(2, 100, throw: false)
            ->get((string) config('maps.barangay_boundaries_url'), [
                'geometry' => "{$longitude},{$latitude}",
                'geometryType' => 'esriGeometryPoint',
                'inSR' => 4326,
                'spatialRel' => 'esriSpatialRelIntersects',
                'outFields' => 'brgy_name,city_name,psgc_10d',
                'returnGeometry' => 'false',
                'f' => 'json',
            ]);

        if (! $response->successful() || $response->json('error')) {
            throw new RuntimeException('The barangay boundary service is unavailable.');
        }

        $attributes = $response->json('features.0.attributes');
        if ($attributes === null) {
            return null;
        }
        if (! is_array($attributes) || ! is_string($attributes['brgy_name'] ?? null)) {
            throw new RuntimeException('The barangay boundary service returned invalid data.');
        }

        return [
            'code' => is_string($attributes['psgc_10d'] ?? null) ? $attributes['psgc_10d'] : null,
            'barangay' => $attributes['brgy_name'],
            'city' => is_string($attributes['city_name'] ?? null) ? $attributes['city_name'] : null,
        ];
    }
}
