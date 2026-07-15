<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('terms_accepted_version', 32)->after('password');
            $table->string('privacy_accepted_version', 32)->after('terms_accepted_version');
            $table->boolean('provider_intent')->default(false)->after('privacy_accepted_version');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'terms_accepted_version',
                'privacy_accepted_version',
                'provider_intent',
            ]);
        });
    }
};
