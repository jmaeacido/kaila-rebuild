<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_assets', function (Blueprint $table): void {
            $table->string('origin', 24)->default('upload')->after('purpose');
            $table->index(['user_id', 'purpose', 'origin']);
        });
    }

    public function down(): void
    {
        Schema::table('profile_assets', function (Blueprint $table): void {
            $table->dropIndex(['user_id', 'purpose', 'origin']);
            $table->dropColumn('origin');
        });
    }
};
