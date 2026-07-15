<?php

namespace App\Domain\Maps;

readonly class GeoPoint
{
    public function __construct(
        public float $latitude,
        public float $longitude,
    ) {}
}
