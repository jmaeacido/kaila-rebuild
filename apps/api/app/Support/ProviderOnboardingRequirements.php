<?php

namespace App\Support;

use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use App\Models\User;

class ProviderOnboardingRequirements
{
    public function __construct(private readonly ProfileAvatarResolver $avatars) {}

    public function avatarUploaded(User $user): bool
    {
        $latest = $this->avatars->latest((int) $user->id, 'provider_avatar');

        return $latest !== null && in_array($latest->scan_status, ['pending', 'clean'], true);
    }

    public function avatarApproved(User $user): bool
    {
        return $this->approvedAvatar($user) !== null;
    }

    public function approvedAvatar(User $user): ?ProfileAsset
    {
        return $this->avatars->approved((int) $user->id, 'provider_avatar');
    }

    public function assertAvatarUploaded(User $user): void
    {
        abort_unless(
            $this->avatarUploaded($user),
            422,
            'Upload a provider logo or profile picture before submitting your provider profile.',
        );
    }

    public function assertAvatarApproved(ProviderProfile $profile): void
    {
        abort_unless(
            $this->avatarApproved(User::query()->findOrFail($profile->user_id)),
            409,
            'Approve the provider logo or profile picture before activating this profile.',
        );
    }

    /** @return array{uploaded: bool, scanStatus: string|null, url: string|null} */
    public function avatarState(User $user): array
    {
        $latest = $this->avatars->latest((int) $user->id, 'provider_avatar');
        $clean = $this->approvedAvatar($user);

        return [
            'uploaded' => $latest !== null && in_array($latest->scan_status, ['pending', 'clean'], true),
            'scanStatus' => $latest?->scan_status,
            'url' => $clean ? "/api/v1/profile-assets/{$clean->id}" : null,
        ];
    }

    /** @return list<array{id: string, caption: string|null, scanStatus: string, downloadPath: string, sortOrder: int}> */
    public function portfolioAssets(User $user): array
    {
        return array_values(ProfileAsset::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'portfolio')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get()
            ->map(fn (ProfileAsset $asset): array => [
                'id' => $asset->id,
                'caption' => $asset->caption,
                'scanStatus' => $asset->scan_status,
                'downloadPath' => "/api/v1/profile-assets/{$asset->id}",
                'sortOrder' => (int) $asset->sort_order,
            ])
            ->all());
    }
}
