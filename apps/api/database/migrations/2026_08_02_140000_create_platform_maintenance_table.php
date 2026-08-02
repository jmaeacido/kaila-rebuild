<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_maintenance', function (Blueprint $table): void {
            $table->id();
            $table->string('phase', 32)->default('idle');
            $table->boolean('enabled')->default(false);
            $table->text('message')->nullable();
            $table->unsignedInteger('countdown_seconds')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        DB::table('platform_maintenance')->insert([
            'phase' => 'idle',
            'enabled' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_maintenance');
    }
};
