<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('community_posts', function (Blueprint $table): void {
            $table->foreignId('featured_provider_profile_id')
                ->nullable()
                ->after('area_id')
                ->constrained('provider_profiles')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('community_posts', function (Blueprint $table): void {
            $table->dropForeign(['featured_provider_profile_id']);
            $table->dropColumn('featured_provider_profile_id');
        });
    }
};
