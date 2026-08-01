<?php

namespace App\Domain\Maps;

readonly class RouteEstimate
{
    /**
     * @param  list<GeoPoint>  $geometry
     * @param  list<RouteStep>  $steps
     */
    public function __construct(
        public int $distanceMeters,
        public int $durationSeconds,
        public array $geometry,
        public array $steps = [],
    ) {}
}
