<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;

class MarketplaceReferenceSeeder extends Seeder
{
    private const SUPERSEDED_SERVICE_SLUGS = [
        'home-cleaning',
        'beauty-wellness',
        'tutoring',
    ];

    private const SUPERSEDED_AREA_CODES = [
        'PH-11',
        'PH-DAV',
        'PH-DVO',
        'PH-TAG',
    ];

    /** @var list<array{string, string, string}> */
    private const LEGACY_SERVICES = [
        ['Plumbing', 'plumbing', 'Wrench'],
        ['Electrical', 'electrical', 'Zap'],
        ['Carpentry', 'carpentry', 'Hammer'],
        ['Welding', 'welding', 'Flame'],
        ['Aircon & Refrigeration', 'aircon-refrigeration', 'Snowflake'],
        ['Appliance Repair', 'appliance-repair', 'Cog'],
        ['Computer & IT Services', 'computer-it-services', 'MonitorCog'],
        ['Cellphone & Gadget Repair', 'cellphone-gadget-repair', 'Smartphone'],
        ['Cleaning Services', 'cleaning-services', 'Sparkles'],
        ['Beauty Services', 'beauty-services', 'Heart'],
        ['Tutoring & Education', 'tutoring-education', 'BookOpen'],
        ['Automotive Services', 'automotive-services', 'Car'],
        ['Motorcycle Services', 'motorcycle-services', 'Bike'],
        ['Photography & Videography', 'photography-videography', 'Camera'],
        ['Home Improvement', 'home-improvement', 'House'],
        ['General Handyman', 'general-handyman', 'Drill'],
        ['Other Services', 'other-services', 'Ellipsis'],
    ];

    public function run(): void
    {
        ServiceCategory::query()->whereIn('slug', self::SUPERSEDED_SERVICE_SLUGS)->update(['is_active' => false]);
        Area::query()->whereIn('code', self::SUPERSEDED_AREA_CODES)->update(['is_active' => false]);

        foreach (self::LEGACY_SERVICES as $order => [$name, $slug, $icon]) {
            ServiceCategory::query()->updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'icon' => $icon, 'sort_order' => $order, 'is_active' => true],
            );
        }

        foreach (LegacyMarketplaceReferenceData::areas() as $regionData) {
            $region = $this->area(null, 'region', $regionData['name'], $regionData['code']);

            foreach ($regionData['children'] as $childData) {
                if ($childData['type'] === 'province') {
                    $province = $this->area($region, 'province', $childData['name'], $childData['code']);
                    foreach ($childData['children'] as $cityData) {
                        $this->seedCity($province, $cityData);
                    }
                } else {
                    $this->seedCity($region, $childData);
                }
            }
        }
    }

    /** @param array{code: string, name: string, type: string, children: list<array{string, string}>} $cityData */
    private function seedCity(Area $parent, array $cityData): void
    {
        $city = $this->area($parent, $cityData['type'], $cityData['name'], $cityData['code']);

        foreach ($cityData['children'] as [$code, $name]) {
            $this->area($city, 'barangay', $name, $code);
        }
    }

    private function area(?Area $parent, string $type, string $name, string $code): Area
    {
        return Area::query()->updateOrCreate(
            ['code' => $code],
            ['parent_id' => $parent?->id, 'type' => $type, 'name' => $name, 'is_active' => true],
        );
    }
}
