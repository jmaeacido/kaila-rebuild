<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = Carbon::now();
        $existingId = DB::table('service_categories')->where('slug', 'tailoring')->value('id');

        if ($existingId === null) {
            DB::table('service_categories')->insert([
                'name' => 'Tailoring',
                'slug' => 'tailoring',
                'icon' => 'SewingMachine',
                'sort_order' => 16,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            DB::table('service_categories')->whereKey($existingId)->update([
                'name' => 'Tailoring',
                'icon' => 'SewingMachine',
                'sort_order' => 16,
                'is_active' => true,
                'updated_at' => $now,
            ]);
        }

        DB::table('service_categories')
            ->where('slug', 'other-services')
            ->update(['sort_order' => 17, 'updated_at' => $now]);
    }

    public function down(): void
    {
        DB::table('service_categories')->where('slug', 'tailoring')->delete();

        DB::table('service_categories')
            ->where('slug', 'other-services')
            ->update(['sort_order' => 16, 'updated_at' => Carbon::now()]);
    }
};
