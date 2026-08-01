<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\ServiceCategory;
use Database\Seeders\MarketplaceReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketplaceReferenceSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_copies_all_legacy_services_and_addresses_with_their_hierarchy(): void
    {
        $this->seed(MarketplaceReferenceSeeder::class);

        $this->assertSame(17, ServiceCategory::query()->count());
        $this->assertSame(
            ['Plumbing', 'Electrical', 'Carpentry', 'Welding', 'Aircon & Refrigeration', 'Appliance Repair',
                'Computer & IT Services', 'Cellphone & Gadget Repair', 'Cleaning Services', 'Beauty Services',
                'Tutoring & Education', 'Automotive Services', 'Motorcycle Services', 'Photography & Videography',
                'Home Improvement', 'General Handyman', 'Other Services'],
            ServiceCategory::query()->orderBy('sort_order')->pluck('name')->all(),
        );
        $this->assertSame([
            'Plumbing' => 'Droplets',
            'Electrical' => 'Zap',
            'Carpentry' => 'Hammer',
            'Welding' => 'Flame',
            'Aircon & Refrigeration' => 'Snowflake',
            'Appliance Repair' => 'Cog',
            'Computer & IT Services' => 'MonitorCog',
            'Cellphone & Gadget Repair' => 'Smartphone',
            'Cleaning Services' => 'Sparkles',
            'Beauty Services' => 'Heart',
            'Tutoring & Education' => 'BookOpen',
            'Automotive Services' => 'Car',
            'Motorcycle Services' => 'Bike',
            'Photography & Videography' => 'Camera',
            'Home Improvement' => 'House',
            'General Handyman' => 'Drill',
            'Other Services' => 'Ellipsis',
        ], ServiceCategory::query()->orderBy('sort_order')->pluck('icon', 'name')->all());

        $this->assertSame(171, Area::query()->count());
        $this->assertSame(2, Area::query()->where('type', 'region')->count());
        $this->assertSame(2, Area::query()->where('type', 'province')->count());
        $this->assertSame(2, Area::query()->where('type', 'city')->count());
        $this->assertSame(165, Area::query()->where('type', 'barangay')->count());

        $gingoog = Area::query()->where('code', '1004308000')->firstOrFail();
        $butuan = Area::query()->where('code', '1630400000')->firstOrFail();

        $this->assertSame('Misamis Oriental', Area::query()->findOrFail($gingoog->parent_id)->name);
        $this->assertSame('Agusan del Norte', Area::query()->findOrFail($butuan->parent_id)->name);
        $this->assertSame(79, Area::query()->where('parent_id', $gingoog->id)->count());
        $this->assertSame(86, Area::query()->where('parent_id', $butuan->id)->count());
        $this->assertDatabaseHas('areas', ['code' => '1004308083', 'name' => 'Tagpako', 'parent_id' => $gingoog->id]);
        $this->assertDatabaseHas('areas', ['code' => '1630400103', 'name' => 'Pigdaulan', 'parent_id' => $butuan->id]);
    }

    public function test_it_is_safe_to_rerun(): void
    {
        $this->seed(MarketplaceReferenceSeeder::class);
        $this->seed(MarketplaceReferenceSeeder::class);

        $this->assertSame(17, ServiceCategory::query()->count());
        $this->assertSame(171, Area::query()->count());
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
            'name' => 'Davao City',
            'code' => 'PH-DVO',
            'is_active' => true,
        ]);

        $this->seed(MarketplaceReferenceSeeder::class);

        $this->assertDatabaseHas('service_categories', ['slug' => 'home-cleaning', 'is_active' => false]);
        $this->assertDatabaseHas('areas', ['code' => 'PH-DVO', 'is_active' => false]);
        $this->assertSame(17, ServiceCategory::query()->where('is_active', true)->count());
        $this->assertSame(171, Area::query()->where('is_active', true)->count());
    }
}
