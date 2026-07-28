<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $regionId = DB::table('areas')->where('code', '1600000000')->value('id');
        if (! $regionId) {
            return;
        }

        DB::table('areas')->updateOrInsert(
            ['code' => '1600200000'],
            [
                'parent_id' => $regionId,
                'type' => 'province',
                'name' => 'Agusan del Norte',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $provinceId = DB::table('areas')->where('code', '1600200000')->value('id');
        DB::table('areas')->where('code', '1630400000')->update([
            'parent_id' => $provinceId,
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        $regionId = DB::table('areas')->where('code', '1600000000')->value('id');
        $provinceId = DB::table('areas')->where('code', '1600200000')->value('id');

        if ($regionId && $provinceId) {
            DB::table('areas')->where('code', '1630400000')->update([
                'parent_id' => $regionId,
                'updated_at' => now(),
            ]);
            DB::table('areas')->where('id', $provinceId)->delete();
        }
    }
};
