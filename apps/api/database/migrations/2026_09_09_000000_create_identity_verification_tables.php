<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('identity_verifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status', 32)->default('not_started')->index();
            $table->string('id_type', 48)->nullable();
            $table->char('issuing_country', 2)->nullable();
            $table->date('document_expires_at')->nullable();
            $table->boolean('name_matches')->nullable();
            $table->boolean('date_of_birth_matches')->nullable();
            $table->boolean('age_eligible')->nullable();
            $table->string('decision_reason', 64)->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('verified_until')->nullable();
            $table->timestamp('appeal_requested_at')->nullable();
            $table->foreignId('appeal_reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('consent_withdrawn_at')->nullable();
            $table->timestamps();
        });

        Schema::create('identity_verification_consents', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('identity_verification_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('notice_version', 64);
            $table->string('privacy_policy_version', 64);
            $table->string('purpose', 64);
            $table->string('trigger', 64);
            $table->uuid('request_id');
            $table->timestamp('consented_at');
            $table->timestamp('withdrawn_at')->nullable();
            $table->timestamps();
        });

        Schema::create('identity_verification_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('identity_verification_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('consent_id')->constrained('identity_verification_consents')->cascadeOnDelete();
            $table->char('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('identity_evidence', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('identity_verification_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('session_id')->constrained('identity_verification_sessions')->cascadeOnDelete();
            $table->string('kind', 16);
            $table->string('disk', 48);
            $table->string('object_key', 255)->unique();
            $table->string('mime_type', 32);
            $table->unsignedBigInteger('size_bytes');
            $table->char('sha256', 64);
            $table->string('scan_status', 16)->default('pending');
            $table->string('scan_signature', 255)->nullable();
            $table->text('scan_error')->nullable();
            $table->timestamp('scanned_at')->nullable();
            $table->timestamp('purge_after');
            $table->timestamp('purged_at')->nullable();
            $table->timestamps();
            $table->unique(['session_id', 'kind']);
            $table->index(['purged_at', 'purge_after']);
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('identity_evidence');
        Schema::dropIfExists('identity_verification_sessions');
        Schema::dropIfExists('identity_verification_consents');
        Schema::dropIfExists('identity_verifications');
    }
};
