<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('community_posts', function (Blueprint $table): void {
            $table->foreignId('mentioned_user_id')
                ->nullable()
                ->after('featured_provider_profile_id')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('community_comments', function (Blueprint $table): void {
            $table->foreignId('mentioned_user_id')
                ->nullable()
                ->after('featured_provider_profile_id')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('community_comments', function (Blueprint $table): void {
            $table->dropForeign(['mentioned_user_id']);
            $table->dropColumn('mentioned_user_id');
        });

        Schema::table('community_posts', function (Blueprint $table): void {
            $table->dropForeign(['mentioned_user_id']);
            $table->dropColumn('mentioned_user_id');
        });
    }
};
