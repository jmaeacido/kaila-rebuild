<?php

namespace App\Domain\Maps;

readonly class RouteStep
{
    public function __construct(
        public string $instruction,
        public string $maneuver,
        public ?string $modifier,
        public int $distanceMeters,
        public int $durationSeconds,
        public GeoPoint $location,
    ) {}
}
