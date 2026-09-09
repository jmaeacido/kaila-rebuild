<?php

namespace App\Support;

use App\Models\ProfileAsset;

class ProfileAvatarResolver
{
    public function clientUrl(int $userId): ?string
    {
        return $this->urlFor($userId, 'avatar');
    }

    /** Provider marketplace mark; falls back to the client avatar for legacy accounts. */
    public function providerUrl(int $userId, bool $fallbackToClient = true): ?string
    {
        return $this->urlFor($userId, 'provider_avatar')
            ?? ($fallbackToClient ? $this->clientUrl($userId) : null);
    }

    public function approved(int $userId, string $purpose): ?ProfileAsset
    {
        return ProfileAsset::query()
            ->where('user_id', $userId)
            ->where('purpose', $purpose)
            ->where('scan_status', 'clean')
            ->orderByRaw("CASE WHEN origin = 'upload' THEN 0 ELSE 1 END")
            ->latest()
            ->first();
    }

    public function latest(int $userId, string $purpose): ?ProfileAsset
    {
        return ProfileAsset::query()
            ->where('user_id', $userId)
            ->where('purpose', $purpose)
            ->latest()
            ->first();
    }

    private function urlFor(int $userId, string $purpose): ?string
    {
        $asset = $this->approved($userId, $purpose);

        return $asset ? "/api/v1/profile-assets/{$asset->getKey()}" : null;
    }
}
