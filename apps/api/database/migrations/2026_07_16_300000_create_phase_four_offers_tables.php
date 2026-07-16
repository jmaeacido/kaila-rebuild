<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offer_threads', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->string('status', 16)->default('active');
            $table->unsignedInteger('latest_revision_number')->default(0);
            $table->timestamps();
            $table->unique(['service_job_id', 'provider_profile_id']);
            $table->index(['service_job_id', 'status']);
        });

        Schema::create('offer_revisions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('offer_thread_id')->constrained('offer_threads')->cascadeOnDelete();
            $table->unsignedInteger('revision_number');
            $table->foreignId('proposed_by_user_id')->constrained('users')->restrictOnDelete();
            $table->unsignedBigInteger('amount_centavos');
            $table->string('availability_text', 160);
            $table->string('estimated_duration_text', 160)->nullable();
            $table->text('scope');
            $table->text('message')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->unique(['offer_thread_id', 'revision_number']);
        });

        Schema::create('accepted_offer_snapshots', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->unique()->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignUuid('offer_thread_id')->unique()->constrained('offer_threads')->restrictOnDelete();
            $table->foreignUuid('offer_revision_id')->unique()->constrained('offer_revisions')->restrictOnDelete();
            $table->foreignId('provider_profile_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('amount_centavos');
            $table->string('availability_text', 160);
            $table->string('estimated_duration_text', 160)->nullable();
            $table->text('scope');
            $table->text('message')->nullable();
            $table->timestamp('accepted_at');
            $table->timestamps();
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('accepted_offer_snapshots');
        Schema::dropIfExists('offer_revisions');
        Schema::dropIfExists('offer_threads');
    }
};
