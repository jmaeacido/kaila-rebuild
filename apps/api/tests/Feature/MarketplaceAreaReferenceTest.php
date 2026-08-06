<?php

namespace Tests\Feature;

use App\Models\Area;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketplaceAreaReferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_reference_data_omits_barangays(): void
    {
        $province = Area::query()->create([
            'type' => 'province',
            'name' => 'Misamis Oriental',
            'code' => '1004300000',
            'is_active' => true,
        ]);
        $city = Area::query()->create([
            'parent_id' => $province->id,
            'type' => 'city',
            'name' => 'City of Gingoog',
            'code' => '1004308000',
            'is_active' => true,
        ]);
        Area::query()->create([
            'parent_id' => $city->id,
            'type' => 'barangay',
            'name' => 'Tagpako',
            'code' => '1004308083',
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/marketplace/reference-data')
            ->assertOk()
            ->assertJsonMissing(['name' => 'Tagpako'])
            ->assertJsonFragment(['name' => 'City of Gingoog'])
            ->assertJsonFragment(['name' => 'Misamis Oriental']);
    }

    public function test_areas_can_be_listed_by_parent_or_ids_and_shown_with_parent(): void
    {
        $province = Area::query()->create([
            'type' => 'province',
            'name' => 'Agusan del Norte',
            'code' => '1600200000',
            'is_active' => true,
        ]);
        $city = Area::query()->create([
            'parent_id' => $province->id,
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

        $this->getJson('/api/v1/marketplace/areas?parentId='.$city->id)
            ->assertOk()
            ->assertJsonPath('data.0.id', $barangay->id)
            ->assertJsonPath('data.0.name', 'Lapu-lapu Pob.');

        $this->getJson('/api/v1/marketplace/areas?ids[]='.$barangay->id)
            ->assertOk()
            ->assertJsonPath('data.0.id', $barangay->id);

        $this->getJson('/api/v1/marketplace/areas/'.$barangay->id)
            ->assertOk()
            ->assertJsonPath('data.parent.id', $city->id)
            ->assertJsonPath('data.parent.name', 'City of Butuan');

        $this->getJson('/api/v1/marketplace/areas')
            ->assertStatus(422);
    }
}
