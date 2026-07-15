<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;

class MarketplaceReferenceSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['Plumbing', 'plumbing', 'Wrench'], ['Electrical', 'electrical', 'Zap'], ['Home cleaning', 'home-cleaning', 'Sparkles'], ['Appliance repair', 'appliance-repair', 'Cog'], ['Beauty and wellness', 'beauty-wellness', 'Heart'], ['Tutoring', 'tutoring', 'BookOpen']] as $order => [$name, $slug, $icon]) {
            ServiceCategory::query()->updateOrCreate(['slug' => $slug], ['name' => $name, 'icon' => $icon, 'sort_order' => $order, 'is_active' => true]);
        }

        $region = Area::query()->updateOrCreate(['code' => 'PH-11'], ['type' => 'region', 'name' => 'Davao Region', 'is_active' => true]);
        $province = Area::query()->updateOrCreate(['code' => 'PH-DAV'], ['parent_id' => $region->id, 'type' => 'province', 'name' => 'Davao del Norte', 'is_active' => true]);
        Area::query()->updateOrCreate(['code' => 'PH-DVO'], ['parent_id' => $region->id, 'type' => 'city', 'name' => 'Davao City', 'is_active' => true]);
        Area::query()->updateOrCreate(['code' => 'PH-TAG'], ['parent_id' => $province->id, 'type' => 'city', 'name' => 'Tagum City', 'is_active' => true]);
    }
}
