<?php

namespace Tests\Unit;

use App\Models\Area;
use App\Support\JobAreaResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobAreaResolverTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('maps.barangay_boundaries_url', 'http://boundaries.test/query');
    }

    public function test_it_resolves_a_pin_to_an_active_barangay_and_city(): void
    {
        $city = Area::query()->create([
            'type' => 'city',
            'name' => 'City of Butuan',
            'code' => 'PH-BUT',
            'is_active' => true,
        ]);
        $barangay = Area::query()->create([
            'parent_id' => $city->id,
            'type' => 'barangay',
            'name' => 'Lapu-lapu Pob.',
            'code' => 'PH-BUT-AMP',
            'is_active' => true,
        ]);
        Http::fake(['http://boundaries.test/query*' => Http::response(['features' => [[
            'attributes' => [
                'brgy_name' => 'Lapu-Lapu Pob. (Bgy. 8)',
                'city_name' => 'Butuan City',
                'psgc_10d' => 'PH-BUT-AMP',
            ],
        ]]])]);

        $resolved = app(JobAreaResolver::class)->resolve(8.9500, 125.5400);

        $this->assertTrue($barangay->is($resolved));
    }

    public function test_it_does_not_resolve_an_unsupported_barangay(): void
    {
        Http::fake(['http://boundaries.test/query*' => Http::response(['features' => [[
            'attributes' => [
                'brgy_name' => 'Unsupported',
                'city_name' => 'Butuan City',
                'psgc_10d' => 'unsupported',
            ],
        ]]])]);

        $this->assertNull(app(JobAreaResolver::class)->resolve(8.9500, 125.5400));
    }
}
