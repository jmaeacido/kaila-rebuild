<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use RuntimeException;

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

    private const BUTUAN_CITY_CODE = '1630400000';

    private const AGUSAN_DEL_NORTE_CODE = '1600200000';

    /** @var list<array{string, string, string}> */
    private const LEGACY_SERVICES = [
        ['Plumbing', 'plumbing', 'Droplets'],
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

        $this->seedPhilippineAreas();
        $this->groupButuanUnderAgusanDelNorte();
    }

    private function seedPhilippineAreas(): void
    {
        $payload = PhilippinePsgcData::load();
        $codeToId = [];
        foreach (array_chunk(array_column($payload['areas'], 'code'), 500) as $codes) {
            foreach (Area::query()->whereIn('code', $codes)->pluck('id', 'code') as $code => $id) {
                $codeToId[$code] = $id;
            }
        }

        $waves = [
            ['region'],
            ['province'],
            ['city', 'municipality'],
            ['barangay'],
        ];

        foreach ($waves as $types) {
            $batch = [];
            $now = Carbon::now();

            foreach ($payload['areas'] as $area) {
                if (! in_array($area['type'], $types, true)) {
                    continue;
                }

                $parentId = null;
                if ($area['parentCode'] !== null) {
                    $parentId = $codeToId[$area['parentCode']] ?? null;
                    if ($parentId === null) {
                        throw new RuntimeException("Missing parent area {$area['parentCode']} for {$area['code']}.");
                    }
                }

                $batch[] = [
                    'code' => $area['code'],
                    'parent_id' => $parentId,
                    'type' => $area['type'],
                    'name' => $area['name'],
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            foreach (array_chunk($batch, 500) as $chunk) {
                Area::query()->upsert(
                    $chunk,
                    ['code'],
                    ['parent_id', 'type', 'name', 'is_active', 'updated_at'],
                );
            }

            if ($types === ['barangay']) {
                continue;
            }

            foreach (array_chunk(array_column($batch, 'code'), 500) as $codes) {
                foreach (Area::query()->whereIn('code', $codes)->pluck('id', 'code') as $code => $id) {
                    $codeToId[$code] = $id;
                }
            }
        }
    }

    private function groupButuanUnderAgusanDelNorte(): void
    {
        $butuanId = Area::query()->where('code', self::BUTUAN_CITY_CODE)->value('id');
        $provinceId = Area::query()->where('code', self::AGUSAN_DEL_NORTE_CODE)->value('id');

        if ($butuanId === null || $provinceId === null) {
            throw new RuntimeException('Butuan marketplace grouping requires City of Butuan and Agusan del Norte.');
        }

        Area::query()->whereKey($butuanId)->update([
            'parent_id' => $provinceId,
            'type' => 'city',
            'is_active' => true,
        ]);
    }
}
