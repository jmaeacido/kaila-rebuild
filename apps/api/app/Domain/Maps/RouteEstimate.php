<?php

namespace App\Domain\Maps;

readonly class RouteEstimate
{
    /** @param list<GeoPoint> $geometry */
    public function __construct(
        public int $distanceMeters,
        public int $durationSeconds,
        public array $geometry,
    ) {}
}
