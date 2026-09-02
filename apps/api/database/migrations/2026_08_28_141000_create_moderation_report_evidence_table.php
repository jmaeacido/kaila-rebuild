<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('moderation_report_evidence', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('moderation_report_id')->constrained('moderation_reports')->cascadeOnDelete();
            $table->foreignId('submitted_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('disk', 32);
            $table->string('object_key')->unique();
            $table->string('original_name');
            $table->string('mime_type', 64);
            $table->unsignedBigInteger('size_bytes');
            $table->string('scan_status', 16)->default('pending');
            $table->timestamps();
            $table->index(['moderation_report_id', 'scan_status'], 'idx_mod_report_scan_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moderation_report_evidence');
    }
};
