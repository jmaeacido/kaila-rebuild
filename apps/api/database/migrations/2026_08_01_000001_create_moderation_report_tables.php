<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('moderation_reports', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('reporter_user_id')->constrained('users')->restrictOnDelete();
            $table->string('target_type', 32);
            $table->string('target_id', 64);
            $table->string('category', 32);
            $table->text('details');
            $table->string('status', 24)->default('open');
            $table->foreignId('assigned_to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'assigned_to_user_id']);
            $table->index(['reporter_user_id', 'created_at']);
            $table->index(['target_type', 'target_id']);
        });

        Schema::create('moderation_report_actions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('moderation_report_id')->constrained('moderation_reports')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->constrained('users')->restrictOnDelete();
            $table->string('action', 32);
            $table->text('reason');
            $table->json('metadata');
            $table->timestamp('occurred_at');
            $table->timestamps();
        });

        Schema::create('moderation_report_access_audits', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('moderation_report_id')->constrained('moderation_reports')->cascadeOnDelete();
            $table->foreignId('staff_user_id')->constrained('users')->restrictOnDelete();
            $table->string('reason', 500);
            $table->timestamp('accessed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moderation_report_access_audits');
        Schema::dropIfExists('moderation_report_actions');
        Schema::dropIfExists('moderation_reports');
    }
};
