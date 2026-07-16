<?php

namespace Tests\Unit;

use App\Domain\Maps\GeoPoint;
use App\Support\OpenStreetMapProvider;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class OpenStreetMapProviderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('maps.nominatim_url', 'http://nominatim.test');
        config()->set('maps.osrm_url', 'http://osrm.test');
    }

    public function test_it_geocodes_only_philippine_results(): void
    {
        Http::fake(['http://nominatim.test/search*' => Http::response([['lat' => '14.5995', 'lon' => '120.9842']])]);

        $point = app(OpenStreetMapProvider::class)->geocode('Manila City Hall');

        $this->assertEquals(new GeoPoint(14.5995, 120.9842), $point);
        Http::assertSent(fn ($request) => $request['countrycodes'] === 'ph' && $request['limit'] === 1);
    }

    public function test_it_returns_provider_neutral_route_geometry(): void
    {
        Http::fake(['http://osrm.test/route/v1/driving/*' => Http::response(['routes' => [[
            'distance' => 1250.4,
            'duration' => 302.2,
            'geometry' => ['coordinates' => [[120.98, 14.59], [121.01, 14.62]]],
        ]]])]);

        $route = app(OpenStreetMapProvider::class)->route(new GeoPoint(14.59, 120.98), new GeoPoint(14.62, 121.01));

        $this->assertSame(1250, $route->distanceMeters);
        $this->assertSame(302, $route->durationSeconds);
        $this->assertEquals([new GeoPoint(14.59, 120.98), new GeoPoint(14.62, 121.01)], $route->geometry);
    }

    public function test_it_fails_closed_when_services_return_no_result(): void
    {
        Http::fake(['http://nominatim.test/search*' => Http::response([])]);
        $this->expectException(RuntimeException::class);
        app(OpenStreetMapProvider::class)->geocode('Unknown place');
    }
}
