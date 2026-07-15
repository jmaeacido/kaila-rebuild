<?php

namespace App\Support;

use App\Contracts\MapsProvider;
use App\Domain\Maps\GeoPoint;
use App\Domain\Maps\RouteEstimate;

class DeterministicFakeMapsProvider implements MapsProvider
{
    public function geocode(string $query): GeoPoint
    {
        $hash = hash('sha256', mb_strtolower(trim($query)));
        $latitudeOffset = hexdec(substr($hash, 0, 8)) / 0xFFFFFFFF * 0.2 - 0.1;
        $longitudeOffset = hexdec(substr($hash, 8, 8)) / 0xFFFFFFFF * 0.2 - 0.1;

        return new GeoPoint(14.5995 + $latitudeOffset, 120.9842 + $longitudeOffset);
    }

    public function route(GeoPoint $origin, GeoPoint $destination): RouteEstimate
    {
        $latitudeMeters = ($destination->latitude - $origin->latitude) * 111_320;
        $longitudeMeters = ($destination->longitude - $origin->longitude)
            * 111_320 * cos(deg2rad(($origin->latitude + $destination->latitude) / 2));
        $distance = (int) round(sqrt($latitudeMeters ** 2 + $longitudeMeters ** 2));
        $duration = (int) ceil($distance / 6.944444);

        return new RouteEstimate($distance, $duration, [$origin, $destination]);
    }
}
