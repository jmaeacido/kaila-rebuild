<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('active_mode', 16)->default('client');
            $table->boolean('is_admin')->default(false);
        });

        Schema::create('service_categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('service_categories')->restrictOnDelete();
            $table->string('name', 100);
            $table->string('slug', 120)->unique();
            $table->string('icon', 64);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['parent_id', 'name']);
        });
        Schema::create('areas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('areas')->restrictOnDelete();
            $table->string('type', 24);
            $table->string('name', 120);
            $table->string('code', 32)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['parent_id', 'type', 'name']);
        });
        Schema::create('client_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('display_name', 100);
            $table->foreignId('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->timestamps();
        });
        Schema::create('provider_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('display_name', 100);
            $table->text('bio');
            $table->string('status', 24)->default('draft');
            $table->unsignedSmallInteger('years_experience')->default(0);
            $table->unsignedInteger('completed_jobs')->default(0);
            $table->decimal('rating', 3, 2)->nullable();
            $table->unsignedSmallInteger('response_minutes')->nullable();
            $table->timestamps();
            $table->index(['status', 'rating']);
        });
        Schema::create('provider_services', function (Blueprint $table): void {
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_category_id')->constrained()->restrictOnDelete();
            $table->primary(['provider_profile_id', 'service_category_id']);
        });
        Schema::create('provider_service_areas', function (Blueprint $table): void {
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('area_id')->constrained()->restrictOnDelete();
            $table->primary(['provider_profile_id', 'area_id']);
        });
        Schema::create('provider_availability', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->boolean('is_available')->default(true);
            $table->unique(['provider_profile_id', 'day_of_week', 'starts_at'], 'provider_availability_slot_unique');
        });
        Schema::create('profile_assets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('purpose', 24);
            $table->string('disk', 32);
            $table->string('object_key', 255)->unique();
            $table->string('original_name', 255);
            $table->string('mime_type', 64);
            $table->unsignedBigInteger('size_bytes');
            $table->string('scan_status', 16)->default('pending');
            $table->string('caption', 180)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['user_id', 'purpose', 'scan_status']);
        });
        Schema::create('provider_credentials', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('asset_id')->constrained('profile_assets')->restrictOnDelete();
            $table->string('type', 48);
            $table->string('label', 120);
            $table->string('review_status', 24)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_credentials');
        Schema::dropIfExists('profile_assets');
        Schema::dropIfExists('provider_availability');
        Schema::dropIfExists('provider_service_areas');
        Schema::dropIfExists('provider_services');
        Schema::dropIfExists('provider_profiles');
        Schema::dropIfExists('client_profiles');
        Schema::dropIfExists('areas');
        Schema::dropIfExists('service_categories');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['active_mode', 'is_admin']));
    }
};
