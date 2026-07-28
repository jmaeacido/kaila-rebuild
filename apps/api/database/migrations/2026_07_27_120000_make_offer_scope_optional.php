<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offer_revisions', function (Blueprint $table): void {
            $table->text('scope')->nullable()->change();
        });

        Schema::table('accepted_offer_snapshots', function (Blueprint $table): void {
            $table->text('scope')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('offer_revisions', function (Blueprint $table): void {
            $table->text('scope')->nullable(false)->change();
        });

        Schema::table('accepted_offer_snapshots', function (Blueprint $table): void {
            $table->text('scope')->nullable(false)->change();
        });
    }
};
