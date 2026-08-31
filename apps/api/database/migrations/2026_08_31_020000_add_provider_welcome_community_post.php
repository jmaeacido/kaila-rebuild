<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table): void {
            $table->foreignUuid('welcome_community_post_id')->nullable()->after('review_baseline')->constrained('community_posts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('welcome_community_post_id');
        });
    }
};
