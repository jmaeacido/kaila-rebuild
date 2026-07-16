<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_blocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('blocker_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('blocked_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['blocker_user_id', 'blocked_user_id']);
        });
        Schema::create('job_conversations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->unique()->constrained('service_jobs')->cascadeOnDelete();
            $table->unsignedInteger('version')->default(0);
            $table->timestamps();
        });
        Schema::create('conversation_messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('job_conversations')->cascadeOnDelete();
            $table->foreignId('sender_user_id')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('sequence');
            $table->text('body_ciphertext')->nullable();
            $table->unsignedSmallInteger('encryption_key_version');
            $table->string('client_command_id', 100);
            $table->timestamps();
            $table->unique(['conversation_id', 'sequence']);
            $table->unique(['sender_user_id', 'client_command_id']);
        });
        Schema::create('message_assets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('message_id')->constrained('conversation_messages')->cascadeOnDelete();
            $table->foreignId('owner_user_id')->constrained('users')->restrictOnDelete();
            $table->string('disk', 32);
            $table->string('object_key')->unique();
            $table->string('original_name');
            $table->string('mime_type', 64);
            $table->unsignedBigInteger('size_bytes');
            $table->string('scan_status', 16)->default('pending');
            $table->timestamps();
        });
        Schema::create('conversation_reads', function (Blueprint $table): void {
            $table->foreignUuid('conversation_id')->constrained('job_conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('last_read_sequence')->default(0);
            $table->timestamp('read_at');
            $table->primary(['conversation_id', 'user_id']);
        });
        Schema::create('conversation_access_audits', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('job_conversations')->cascadeOnDelete();
            $table->foreignId('staff_user_id')->constrained('users')->restrictOnDelete();
            $table->string('reason', 500);
            $table->timestamp('accessed_at');
            $table->timestamps();
        });
        Schema::create('travel_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignId('provider_user_id')->constrained('users')->restrictOnDelete();
            $table->string('status', 16)->default('active');
            $table->unsignedInteger('version')->default(1);
            $table->boolean('consent_confirmed');
            $table->timestamp('started_at');
            $table->timestamp('stopped_at')->nullable();
            $table->timestamp('arrived_at')->nullable();
            $table->unsignedInteger('last_distance_meters')->nullable();
            $table->unsignedInteger('last_eta_seconds')->nullable();
            $table->timestamps();
            $table->index(['service_job_id', 'status']);
        });
        Schema::create('location_samples', function (Blueprint $table): void {
            $table->id();
            $table->foreignUuid('travel_session_id')->constrained('travel_sessions')->cascadeOnDelete();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->unsignedSmallInteger('accuracy_meters');
            $table->timestamp('captured_at');
            $table->boolean('dispute_hold')->default(false);
            $table->boolean('legal_hold')->default(false);
            $table->index(['travel_session_id', 'captured_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('location_samples');
        Schema::dropIfExists('travel_sessions');
        Schema::dropIfExists('conversation_access_audits');
        Schema::dropIfExists('conversation_reads');
        Schema::dropIfExists('message_assets');
        Schema::dropIfExists('conversation_messages');
        Schema::dropIfExists('job_conversations');
        Schema::dropIfExists('user_blocks');
    }
};
