<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('service_categories')
            ->where('slug', 'plumbing')
            ->update(['icon' => 'Droplets']);
    }

    public function down(): void
    {
        DB::table('service_categories')
            ->where('slug', 'plumbing')
            ->update(['icon' => 'Wrench']);
    }
};
