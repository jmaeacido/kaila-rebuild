<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('location_samples', function (Blueprint $table): void {
            $table->decimal('heading_degrees', 6, 2)->nullable()->after('accuracy_meters');
        });
    }

    public function down(): void
    {
        Schema::table('location_samples', function (Blueprint $table): void {
            $table->dropColumn('heading_degrees');
        });
    }
};
