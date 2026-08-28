<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('moderation_reports', function (Blueprint $table): void {
            $table->string('target_type', 32)->nullable()->change();
            $table->string('target_id', 64)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('moderation_reports', function (Blueprint $table): void {
            $table->string('target_type', 32)->nullable(false)->change();
            $table->string('target_id', 64)->nullable(false)->change();
        });
    }
};
