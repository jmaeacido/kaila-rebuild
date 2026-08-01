<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_jobs', function (Blueprint $table): void {
            $table->string('service_location_mode', 24)->default('at_client')->after('schedule_type');
        });
        Schema::table('provider_profiles', function (Blueprint $table): void {
            $table->boolean('offers_at_shop')->default(false)->after('response_minutes');
            $table->string('shop_name', 120)->nullable()->after('offers_at_shop');
            $table->string('shop_address', 180)->nullable()->after('shop_name');
            $table->decimal('shop_latitude', 10, 7)->nullable()->after('shop_address');
            $table->decimal('shop_longitude', 10, 7)->nullable()->after('shop_latitude');
        });
        Schema::table('accepted_offer_snapshots', function (Blueprint $table): void {
            $table->string('service_location_mode', 24)->default('at_client')->after('provider_profile_id');
            $table->string('destination_label', 180)->nullable()->after('service_location_mode');
            $table->decimal('destination_latitude', 10, 7)->nullable()->after('destination_label');
            $table->decimal('destination_longitude', 10, 7)->nullable()->after('destination_latitude');
        });
        Schema::table('travel_sessions', function (Blueprint $table): void {
            $table->foreignId('traveler_user_id')->nullable()->after('provider_user_id')->constrained('users')->restrictOnDelete();
        });
        DB::table('travel_sessions')->update(['traveler_user_id' => DB::raw('provider_user_id')]);
    }

    public function down(): void
    {
        Schema::table('travel_sessions', fn (Blueprint $table) => $table->dropConstrainedForeignId('traveler_user_id'));
        Schema::table('accepted_offer_snapshots', fn (Blueprint $table) => $table->dropColumn(['service_location_mode', 'destination_label', 'destination_latitude', 'destination_longitude']));
        Schema::table('provider_profiles', fn (Blueprint $table) => $table->dropColumn(['offers_at_shop', 'shop_name', 'shop_address', 'shop_latitude', 'shop_longitude']));
        Schema::table('service_jobs', fn (Blueprint $table) => $table->dropColumn('service_location_mode'));
    }
};
