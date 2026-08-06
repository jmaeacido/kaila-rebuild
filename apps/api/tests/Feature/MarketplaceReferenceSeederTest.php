<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\ServiceCategory;
use Database\Seeders\MarketplaceReferenceSeeder;
use Database\Seeders\PhilippinePsgcData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketplaceReferenceSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_copies_all_legacy_services_and_philippine_addresses(): void
    {
        $payload = PhilippinePsgcData::load();
        $expectedByType = collect($payload['areas'])->countBy(fn (array $area) => $area['type']);

        $this->seed(MarketplaceReferenceSeeder::class);

        $this->assertSame(17, ServiceCategory::query()->count());
        $this->assertSame(
            ['Plumbing', 'Electrical', 'Carpentry', 'Welding', 'Aircon & Refrigeration', 'Appliance Repair',
                'Computer & IT Services', 'Cellphone & Gadget Repair', 'Cleaning Services', 'Beauty Services',
                'Tutoring & Education', 'Automotive Services', 'Motorcycle Services', 'Photography & Videography',
                'Home Improvement', 'General Handyman', 'Other Services'],
            ServiceCategory::query()->orderBy('sort_order')->pluck('name')->all(),
        );

        $this->assertSame(count($payload['areas']), Area::query()->count());
        $this->assertSame($expectedByType['region'], Area::query()->where('type', 'region')->count());
        $this->assertSame($expectedByType['province'], Area::query()->where('type', 'province')->count());
        $this->assertSame($expectedByType['city'], Area::query()->where('type', 'city')->count());
        $this->assertSame($expectedByType['municipality'], Area::query()->where('type', 'municipality')->count());
        $this->assertSame($expectedByType['barangay'], Area::query()->where('type', 'barangay')->count());
        $this->assertSame(18, Area::query()->where('type', 'region')->count());

        $gingoog = Area::query()->where('code', '1004308000')->firstOrFail();
        $butuan = Area::query()->where('code', '1630400000')->firstOrFail();
        $nasipit = Area::query()->where('code', '1600209000')->firstOrFail();
        $davao = Area::query()->where('code', '1130700000')->firstOrFail();
        $manila = Area::query()->where('code', '1380600000')->firstOrFail();
        $cebu = Area::query()->where('code', '0730600000')->firstOrFail();
        $pateros = Area::query()->where('code', '1381701000')->firstOrFail();

        $this->assertSame('Misamis Oriental', Area::query()->findOrFail($gingoog->parent_id)->name);
        $this->assertSame('Agusan del Norte', Area::query()->findOrFail($butuan->parent_id)->name);
        $this->assertSame('Agusan del Norte', Area::query()->findOrFail($nasipit->parent_id)->name);
        $this->assertSame('Region XI (Davao Region)', Area::query()->findOrFail($davao->parent_id)->name);
        $this->assertSame('National Capital Region (NCR)', Area::query()->findOrFail($manila->parent_id)->name);
        $this->assertSame('Region VII (Central Visayas)', Area::query()->findOrFail($cebu->parent_id)->name);
        $this->assertSame('National Capital Region (NCR)', Area::query()->findOrFail($pateros->parent_id)->name);
        $this->assertSame('municipality', $nasipit->type);
        $this->assertSame('municipality', $pateros->type);
        $this->assertSame('city', $davao->type);
        $this->assertSame(79, Area::query()->where('parent_id', $gingoog->id)->count());
        $this->assertSame(86, Area::query()->where('parent_id', $butuan->id)->count());
        $this->assertSame(19, Area::query()->where('parent_id', $nasipit->id)->count());
        $this->assertSame(897, Area::query()->where('parent_id', $manila->id)->where('type', 'barangay')->count());
        $this->assertDatabaseHas('areas', ['code' => '1004308083', 'name' => 'Tagpako', 'parent_id' => $gingoog->id]);
        $this->assertDatabaseHas('areas', ['code' => '1630400103', 'name' => 'Pigdaulan', 'parent_id' => $butuan->id]);
        $this->assertDatabaseHas('areas', ['code' => '1600209020', 'name' => 'Triangulo', 'parent_id' => $nasipit->id]);
    }

    public function test_it_is_safe_to_rerun(): void
    {
        $this->seed(MarketplaceReferenceSeeder::class);
        $count = Area::query()->count();
        $this->seed(MarketplaceReferenceSeeder::class);

        $this->assertSame(17, ServiceCategory::query()->count());
        $this->assertSame($count, Area::query()->count());
        $butuan = Area::query()->where('code', '1630400000')->firstOrFail();
        $this->assertSame('Agusan del Norte', Area::query()->findOrFail($butuan->parent_id)->name);
    }

    public function test_it_deactivates_superseded_placeholder_reference_rows_without_deleting_them(): void
    {
        ServiceCategory::query()->create([
            'name' => 'Home cleaning',
            'slug' => 'home-cleaning',
            'icon' => 'Sparkles',
            'is_active' => true,
        ]);
        Area::query()->create([
            'type' => 'city',
            'name' => 'Legacy Davao Placeholder',
            'code' => 'PH-DVO',
            'is_active' => true,
        ]);

        $this->seed(MarketplaceReferenceSeeder::class);

        $this->assertDatabaseHas('service_categories', ['slug' => 'home-cleaning', 'is_active' => false]);
        $this->assertDatabaseHas('areas', ['code' => 'PH-DVO', 'is_active' => false]);
        $this->assertSame(17, ServiceCategory::query()->where('is_active', true)->count());
        $this->assertTrue(Area::query()->where('code', '1130700000')->where('is_active', true)->exists());
        $this->assertTrue(Area::query()->where('code', '0730600000')->where('is_active', true)->exists());
        $this->assertTrue(Area::query()->where('code', '1380600000')->where('is_active', true)->exists());
    }
}
