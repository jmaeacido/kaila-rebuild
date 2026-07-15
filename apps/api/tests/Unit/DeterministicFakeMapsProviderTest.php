<?php

namespace Tests\Unit;

use App\Domain\Maps\GeoPoint;
use App\Support\DeterministicFakeMapsProvider;
use PHPUnit\Framework\TestCase;

class DeterministicFakeMapsProviderTest extends TestCase
{
    public function test_geocoding_is_deterministic_and_normalizes_queries(): void
    {
        $maps = new DeterministicFakeMapsProvider;

        $this->assertEquals($maps->geocode('  Quezon City '), $maps->geocode('quezon city'));
        $this->assertNotEquals($maps->geocode('Quezon City'), $maps->geocode('Makati'));
    }

    public function test_route_estimate_is_deterministic_and_has_provider_neutral_geometry(): void
    {
        $maps = new DeterministicFakeMapsProvider;
        $origin = new GeoPoint(14.5995, 120.9842);
        $destination = new GeoPoint(14.6095, 120.9942);
        $route = $maps->route($origin, $destination);

        $this->assertGreaterThan(0, $route->distanceMeters);
        $this->assertGreaterThan(0, $route->durationSeconds);
        $this->assertSame([$origin, $destination], $route->geometry);
        $this->assertEquals($route, $maps->route($origin, $destination));
    }
}
