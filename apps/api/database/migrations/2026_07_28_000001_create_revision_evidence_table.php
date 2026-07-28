<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revision_evidence', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_job_id')->constrained('service_jobs')->cascadeOnDelete();
            $table->foreignUuid('completion_submission_id')->constrained('completion_submissions')->cascadeOnDelete();
            $table->foreignId('owner_user_id')->constrained('users')->restrictOnDelete();
            $table->string('disk', 32);
            $table->string('object_key')->unique();
            $table->string('original_name');
            $table->string('mime_type', 64);
            $table->unsignedBigInteger('size_bytes');
            $table->string('scan_status', 16)->default('pending');
            $table->timestamps();
            $table->index(['service_job_id', 'completion_submission_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revision_evidence');
    }
};
