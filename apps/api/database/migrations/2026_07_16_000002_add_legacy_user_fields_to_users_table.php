<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('legacy_id')->nullable()->unique()->after('id');
            $table->string('role')->nullable()->after('password');
            $table->string('area')->nullable()->after('role');
            $table->string('category')->nullable()->after('area');
            $table->string('username')->nullable()->unique()->after('category');
            $table->string('contact_number')->nullable()->after('username');
            $table->string('messenger_link')->nullable()->after('contact_number');
            $table->string('preferred_contact_channel')->nullable()->after('messenger_link');
            $table->string('best_contact_time')->nullable()->after('preferred_contact_channel');
            $table->boolean('data_privacy_consent')->default(false)->after('best_contact_time');
            $table->timestamp('deleted_at')->nullable()->after('data_privacy_consent');
            $table->string('auth_provider')->nullable()->after('deleted_at');
            $table->string('auth_subject')->nullable()->unique()->after('auth_provider');
            $table->string('social_photo_url')->nullable()->after('auth_subject');
            $table->string('account_status')->nullable()->after('social_photo_url');
            $table->timestamp('status_updated_at')->nullable()->after('account_status');
            $table->timestamp('banned_at')->nullable()->after('status_updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'legacy_id',
                'role',
                'area',
                'category',
                'username',
                'contact_number',
                'messenger_link',
                'preferred_contact_channel',
                'best_contact_time',
                'data_privacy_consent',
                'deleted_at',
                'auth_provider',
                'auth_subject',
                'social_photo_url',
                'account_status',
                'status_updated_at',
                'banned_at',
            ]);
        });
    }
};
