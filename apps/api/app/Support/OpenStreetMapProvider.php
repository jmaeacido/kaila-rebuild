<?php

namespace App\Support;

use App\Contracts\MapsProvider;
use App\Domain\Maps\GeoPoint;
use App\Domain\Maps\RouteEstimate;
use App\Domain\Maps\RouteStep;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenStreetMapProvider implements MapsProvider
{
    /** @return array<string, mixed> */
    public function reverse(float $latitude, float $longitude): array
    {
        $response = $this->client()->get(rtrim((string) config('maps.nominatim_url'), '/').'/reverse', [
            'lat' => $latitude,
            'lon' => $longitude,
            'format' => 'jsonv2',
            'addressdetails' => 1,
            'zoom' => 18,
        ]);

        $address = $response->json('address');
        if (! $response->successful() || ! is_array($address)) {
            throw new RuntimeException('The pinned location could not be identified.');
        }

        return $address;
    }

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
            'steps' => 'true',
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

        $steps = [];
        foreach ((array) $response->json('routes.0.legs.0.steps', []) as $step) {
            $maneuver = is_array($step['maneuver'] ?? null) ? $step['maneuver'] : [];
            $stepLocation = $maneuver['location'] ?? null;
            if (! is_array($stepLocation) || ! is_numeric($stepLocation[0] ?? null) || ! is_numeric($stepLocation[1] ?? null)) {
                continue;
            }
            $type = is_string($maneuver['type'] ?? null) ? $maneuver['type'] : 'continue';
            $modifier = is_string($maneuver['modifier'] ?? null) ? $maneuver['modifier'] : null;
            $name = is_string($step['name'] ?? null) ? trim($step['name']) : '';
            $steps[] = new RouteStep(
                $this->instruction($type, $modifier, $name),
                $type,
                $modifier,
                (int) round((float) ($step['distance'] ?? 0)),
                (int) round((float) ($step['duration'] ?? 0)),
                new GeoPoint((float) $stepLocation[1], (float) $stepLocation[0]),
            );
        }

        return new RouteEstimate((int) round((float) $distance), (int) round((float) $duration), $geometry, $steps);
    }

    private function instruction(string $type, ?string $modifier, string $road): string
    {
        if ($type === 'arrive') {
            return 'Arrive at the job site';
        }

        $direction = match ($modifier) {
            'slight left' => 'Bear left',
            'left' => 'Turn left',
            'sharp left' => 'Make a sharp left',
            'slight right' => 'Bear right',
            'right' => 'Turn right',
            'sharp right' => 'Make a sharp right',
            'uturn' => 'Make a U-turn',
            default => $type === 'depart' ? 'Head out' : 'Continue',
        };

        return $road === '' ? $direction : "$direction onto $road";
    }

    private function client(): PendingRequest
    {
        return Http::acceptJson()
            ->withUserAgent('KAILA/1.0 (https://kaila-app.com)')
            ->timeout((int) config('maps.request_timeout_seconds', 5))
            ->retry(2, 100, throw: false);
    }
}
