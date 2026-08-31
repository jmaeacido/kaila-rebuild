<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_assets', function (Blueprint $table): void {
            $table->unsignedInteger('like_count')->default(0)->after('sort_order');
        });

        Schema::create('profile_asset_reactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('profile_asset_id')->constrained('profile_assets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reaction', 16)->default('heart');
            $table->timestamps();
            $table->unique(['profile_asset_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_asset_reactions');

        Schema::table('profile_assets', function (Blueprint $table): void {
            $table->dropColumn('like_count');
        });
    }
};
