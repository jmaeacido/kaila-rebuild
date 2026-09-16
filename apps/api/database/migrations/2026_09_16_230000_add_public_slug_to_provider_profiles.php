<?php

use App\Models\ProviderProfile;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table): void {
            $table->string('public_slug', 160)->nullable()->unique()->after('id');
        });

        ProviderProfile::query()->select(['id', 'display_name'])->eachById(function (ProviderProfile $profile): void {
            $profile->forceFill(['public_slug' => $this->slug((string) $profile->display_name)])->saveQuietly();
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table): void {
            $table->dropUnique(['public_slug']);
            $table->dropColumn('public_slug');
        });
    }

    private function slug(string $displayName): string
    {
        do {
            $slug = Str::slug($displayName).'-'.Str::lower(Str::random(10));
        } while (ProviderProfile::query()->where('public_slug', $slug)->exists());

        return $slug;
    }
};
