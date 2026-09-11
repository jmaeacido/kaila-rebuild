<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('service_categories')
            ->where('slug', 'tailoring')
            ->update([
                'icon' => 'SewingMachine',
                'updated_at' => Carbon::now(),
            ]);
    }

    public function down(): void
    {
        DB::table('service_categories')
            ->where('slug', 'tailoring')
            ->update([
                'icon' => 'Scissors',
                'updated_at' => Carbon::now(),
            ]);
    }
};
