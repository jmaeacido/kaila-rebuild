<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_cases', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('reference', 20)->unique();
            $table->foreignId('customer_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('assigned_to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('service_job_id')->nullable()->constrained('service_jobs')->nullOnDelete();
            $table->string('category', 32);
            $table->string('subject', 120);
            $table->string('status', 24)->default('open');
            $table->string('priority', 16)->default('normal');
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('customer_read_at')->nullable();
            $table->timestamp('staff_read_at')->nullable();
            $table->timestamp('last_message_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['customer_user_id', 'last_message_at']);
            $table->index(['status', 'priority', 'last_message_at']);
        });
        Schema::create('support_messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('support_case_id')->constrained('support_cases')->cascadeOnDelete();
            $table->foreignId('sender_user_id')->constrained('users')->restrictOnDelete();
            $table->string('sender_role', 16);
            $table->text('body');
            $table->timestamps();
            $table->index(['support_case_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_messages');
        Schema::dropIfExists('support_cases');
    }
};
