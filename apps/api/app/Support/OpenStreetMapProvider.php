<?php

namespace App\Support;

use App\Contracts\MapsProvider;
use App\Domain\Maps\GeoPoint;
use App\Domain\Maps\RouteEstimate;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenStreetMapProvider implements MapsProvider
{
    public function geocode(string $query): GeoPoint
    {
        $response = $this->client()->get(rtrim((string) config('maps.nominatim_url'), '/').'/search', [
            'q' => trim($query),
            'format' => 'jsonv2',
            'countrycodes' => 'ph',
            'limit' => 1,
        ]);

        $latitude = $response->json('0.lat');
        $longitude = $response->json('0.lon');
        if (! $response->successful() || ! is_numeric($latitude) || ! is_numeric($longitude)) {
            throw new RuntimeException('The address could not be located.');
        }

        return new GeoPoint((float) $latitude, (float) $longitude);
    }

    public function route(GeoPoint $origin, GeoPoint $destination): RouteEstimate
    {
        $coordinates = "{$origin->longitude},{$origin->latitude};{$destination->longitude},{$destination->latitude}";
        $response = $this->client()->get(rtrim((string) config('maps.osrm_url'), '/')."/route/v1/driving/{$coordinates}", [
            'overview' => 'full',
            'geometries' => 'geojson',
            'steps' => 'false',
        ]);

        $distance = $response->json('routes.0.distance');
        $duration = $response->json('routes.0.duration');
        $coordinates = $response->json('routes.0.geometry.coordinates');
        if (! $response->successful() || ! is_numeric($distance) || ! is_numeric($duration) || ! is_array($coordinates)) {
            throw new RuntimeException('A route is not currently available.');
        }

        $geometry = [];
        foreach ($coordinates as $coordinate) {
            if (! is_array($coordinate) || ! is_numeric($coordinate[0] ?? null) || ! is_numeric($coordinate[1] ?? null)) {
                throw new RuntimeException('The routing service returned invalid geometry.');
            }
            $geometry[] = new GeoPoint((float) $coordinate[1], (float) $coordinate[0]);
        }

        return new RouteEstimate((int) round((float) $distance), (int) round((float) $duration), $geometry);
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()
            ->withUserAgent('KAILA/1.0 (https://kaila-app.com)')
            ->timeout((int) config('maps.request_timeout_seconds', 5))
            ->retry(2, 100, throw: false);
    }
}
