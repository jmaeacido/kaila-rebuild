<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('retention_runs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('policy', 100)->index();
            $table->string('status', 20);
            $table->unsignedBigInteger('deleted_records')->default(0);
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->string('error', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('retention_runs');
    }
};
