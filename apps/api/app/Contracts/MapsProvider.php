<?php

namespace App\Contracts;

use App\Domain\Maps\GeoPoint;
use App\Domain\Maps\RouteEstimate;

interface MapsProvider
{
    public function geocode(string $query): GeoPoint;

    public function route(GeoPoint $origin, GeoPoint $destination): RouteEstimate;
}
