<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_assets', function (Blueprint $table): void {
            $table->string('scan_signature')->nullable()->after('scan_status');
            $table->string('scan_error', 500)->nullable()->after('scan_signature');
            $table->timestamp('scanned_at')->nullable()->after('scan_error');
        });
    }

    public function down(): void
    {
        Schema::table('job_assets', function (Blueprint $table): void {
            $table->dropColumn(['scan_signature', 'scan_error', 'scanned_at']);
        });
    }
};
