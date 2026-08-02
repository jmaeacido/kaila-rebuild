<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_jobs', function (Blueprint $table): void {
            $table->foreignId('direct_provider_profile_id')->nullable()->after('client_user_id')->constrained('provider_profiles')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('service_jobs', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('direct_provider_profile_id');
        });
    }
};
