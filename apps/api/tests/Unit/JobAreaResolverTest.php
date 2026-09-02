<?php

namespace Tests\Unit;

use App\Models\Area;
use App\Models\User;
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
        $this->assertTrue($resolved?->relationLoaded('parent'));
        $this->assertTrue($city->is($resolved?->parent));
    }

    public function test_resolve_area_endpoint_includes_city_identifiers(): void
    {
        $user = User::factory()->create();
        $city = Area::query()->create([
            'type' => 'city',
            'name' => 'City of Butuan',
            'code' => 'PH-BUT',
            'is_active' => true,
        ]);
        Area::query()->create([
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

        $this->actingAs($user)
            ->getJson('/api/v1/jobs/resolve-area?latitude=8.95&longitude=125.54')
            ->assertOk()
            ->assertJsonPath('data.cityId', $city->id)
            ->assertJsonPath('data.cityName', 'City of Butuan')
            ->assertJsonPath('data.cityType', 'city');
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

    public function test_it_falls_back_to_name_match_within_the_detected_city(): void
    {
        $city = Area::query()->create([
            'type' => 'city',
            'name' => 'City of Butuan',
            'code' => '1630400000',
            'is_active' => true,
        ]);
        $barangay = Area::query()->create([
            'parent_id' => $city->id,
            'type' => 'barangay',
            'name' => 'Lapu-lapu Pob.',
            'code' => '1630400051',
            'is_active' => true,
        ]);
        Area::query()->create([
            'type' => 'city',
            'name' => 'City of Davao',
            'code' => '1130700000',
            'is_active' => true,
        ]);
        Http::fake(['http://boundaries.test/query*' => Http::response(['features' => [[
            'attributes' => [
                'brgy_name' => 'Lapu-Lapu Pob. (Bgy. 8)',
                'city_name' => 'Butuan City',
                'psgc_10d' => null,
            ],
        ]]])]);

        $resolved = app(JobAreaResolver::class)->resolve(8.9500, 125.5400);

        $this->assertTrue($barangay->is($resolved));
    }
}
