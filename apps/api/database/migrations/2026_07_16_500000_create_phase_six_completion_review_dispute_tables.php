<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_jobs', function (Blueprint $table): void {
            $table->timestamp('work_started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('auto_confirm_at')->nullable();
            $table->uuid('completion_deadline_id')->nullable()->index();
            $table->timestamp('review_closes_at')->nullable();
        });
        Schema::create('completion_submissions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignId('provider_user_id')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('cycle');
            $table->text('summary');
            $table->timestamp('submitted_at');
            $table->uuid('deadline_id');
            $table->timestamps();
            $table->unique(['service_job_id', 'cycle']);
        });
        Schema::create('completion_evidence', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('completion_submission_id')->constrained('completion_submissions')->cascadeOnDelete();
            $table->foreignId('owner_user_id')->constrained('users')->restrictOnDelete();
            $table->string('disk', 32);
            $table->string('object_key')->unique();
            $table->string('original_name');
            $table->string('mime_type', 64);
            $table->unsignedBigInteger('size_bytes');
            $table->string('scan_status', 16)->default('pending');
            $table->timestamps();
        });
        Schema::create('cancellation_requests', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignId('requested_by_user_id')->constrained('users')->restrictOnDelete();
            $table->text('reason');
            $table->string('status', 16)->default('pending');
            $table->foreignId('responded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->index(['service_job_id', 'status']);
        });
        Schema::create('dispute_cases', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignId('opened_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('resume_state', 24);
            $table->text('reason');
            $table->string('status', 24)->default('open');
            $table->foreignId('assigned_to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedTinyInteger('appeal_count')->default(0);
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'assigned_to_user_id']);
        });
        Schema::create('dispute_evidence', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('dispute_case_id')->constrained('dispute_cases')->cascadeOnDelete();
            $table->foreignId('submitted_by_user_id')->constrained('users')->restrictOnDelete();
            $table->text('note')->nullable();
            $table->string('disk', 32)->nullable();
            $table->string('object_key')->nullable()->unique();
            $table->string('original_name')->nullable();
            $table->string('mime_type', 64)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('scan_status', 16)->nullable();
            $table->timestamps();
        });
        Schema::create('dispute_case_actions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('dispute_case_id')->constrained('dispute_cases')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->constrained('users')->restrictOnDelete();
            $table->string('action', 32);
            $table->string('target_state', 24)->nullable();
            $table->text('reason');
            $table->json('metadata');
            $table->timestamp('occurred_at');
            $table->timestamps();
        });
        Schema::create('dispute_access_audits', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('dispute_case_id')->constrained('dispute_cases')->cascadeOnDelete();
            $table->foreignId('staff_user_id')->constrained('users')->restrictOnDelete();
            $table->string('reason', 500);
            $table->timestamp('accessed_at');
            $table->timestamps();
        });
        Schema::create('job_reviews', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignId('author_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('subject_user_id')->constrained('users')->restrictOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('moderated_at')->nullable();
            $table->foreignId('moderated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('moderation_reason')->nullable();
            $table->timestamps();
            $table->unique(['service_job_id', 'author_user_id']);
        });
        Schema::create('reputation_projections', function (Blueprint $table): void {
            $table->foreignId('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('published_review_count')->default(0);
            $table->unsignedBigInteger('rating_sum')->default(0);
            $table->decimal('average_rating', 3, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reputation_projections');
        Schema::dropIfExists('job_reviews');
        Schema::dropIfExists('dispute_access_audits');
        Schema::dropIfExists('dispute_case_actions');
        Schema::dropIfExists('dispute_evidence');
        Schema::dropIfExists('dispute_cases');
        Schema::dropIfExists('cancellation_requests');
        Schema::dropIfExists('completion_evidence');
        Schema::dropIfExists('completion_submissions');
        Schema::table('service_jobs', fn (Blueprint $table) => $table->dropColumn(['work_started_at', 'completed_at', 'auto_confirm_at', 'completion_deadline_id', 'review_closes_at']));
    }
};
