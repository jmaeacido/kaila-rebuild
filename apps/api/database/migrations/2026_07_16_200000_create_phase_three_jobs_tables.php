<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_jobs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('service_category_id')->constrained()->restrictOnDelete();
            $table->foreignId('area_id')->constrained()->restrictOnDelete();
            $table->string('status', 24)->default('draft');
            $table->string('title', 120);
            $table->text('description');
            $table->string('schedule_type', 16);
            $table->timestamp('scheduled_at')->nullable();
            $table->unsignedBigInteger('budget_min_centavos')->nullable();
            $table->unsignedBigInteger('budget_max_centavos')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('address_label', 180)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();
            $table->index(['client_user_id', 'status']);
            $table->index(['service_category_id', 'area_id', 'status']);
        });

        Schema::create('job_idempotency_keys', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('operation', 32);
            $table->string('key', 100);
            $table->string('request_hash', 64);
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'operation', 'key']);
        });

        Schema::create('job_assets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('disk', 32);
            $table->string('object_key', 255)->unique();
            $table->string('original_name', 255);
            $table->string('mime_type', 64);
            $table->unsignedBigInteger('size_bytes');
            $table->string('scan_status', 16)->default('pending');
            $table->timestamps();
            $table->index(['service_job_id', 'scan_status']);
        });

        Schema::create('job_opportunities', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->string('state', 16)->default('new');
            $table->timestamp('seen_at')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
            $table->unique(['service_job_id', 'provider_profile_id']);
            $table->index(['provider_profile_id', 'state', 'created_at']);
        });

        Schema::create('job_timeline_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event_type', 48);
            $table->unsignedInteger('job_version');
            $table->json('metadata');
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->unique(['service_job_id', 'job_version', 'event_type']);
        });

        Schema::create('push_devices', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('platform', 16);
            $table->string('token_hash', 64)->unique();
            $table->text('token_encrypted');
            $table->timestamp('last_seen_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'revoked_at']);
        });

        Schema::create('durable_notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 48);
            $table->string('title', 120);
            $table->string('body', 240);
            $table->string('resource_type', 32);
            $table->string('resource_id', 64);
            $table->json('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamp('cleared_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'cleared_at', 'created_at']);
        });

        Schema::create('push_delivery_attempts', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('notification_id')->constrained('durable_notifications')->cascadeOnDelete();
            $table->foreignUuid('push_device_id')->constrained('push_devices')->cascadeOnDelete();
            $table->unsignedTinyInteger('attempt');
            $table->string('status', 16)->default('pending');
            $table->string('provider_message_id', 160)->nullable();
            $table->string('last_error', 500)->nullable();
            $table->timestamp('next_attempt_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
            $table->unique(['notification_id', 'push_device_id', 'attempt'], 'push_delivery_attempt_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_delivery_attempts');
        Schema::dropIfExists('durable_notifications');
        Schema::dropIfExists('push_devices');
        Schema::dropIfExists('job_timeline_events');
        Schema::dropIfExists('job_opportunities');
        Schema::dropIfExists('job_assets');
        Schema::dropIfExists('job_idempotency_keys');
        Schema::dropIfExists('service_jobs');
    }
};
