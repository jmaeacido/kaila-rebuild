<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outbox_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('event_type', 150);
            $table->string('resource_type', 100);
            $table->string('resource_id', 100);
            $table->unsignedBigInteger('resource_version');
            $table->json('payload');
            $table->timestamp('occurred_at');
            $table->timestamp('available_at');
            $table->timestamp('processing_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->string('last_error', 500)->nullable();
            $table->timestamps();
            $table->index(['published_at', 'available_at']);
            $table->index(['resource_type', 'resource_id', 'resource_version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outbox_events');
    }
};
