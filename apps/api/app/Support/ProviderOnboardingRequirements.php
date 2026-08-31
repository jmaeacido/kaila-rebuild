<?php

namespace App\Support;

use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use App\Models\User;

class ProviderOnboardingRequirements
{
    public function avatarUploaded(User $user): bool
    {
        return ProfileAsset::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'avatar')
            ->whereIn('scan_status', ['pending', 'clean'])
            ->exists();
    }

    public function avatarApproved(User $user): bool
    {
        return ProfileAsset::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'avatar')
            ->where('scan_status', 'clean')
            ->exists();
    }

    public function assertAvatarUploaded(User $user): void
    {
        abort_unless(
            $this->avatarUploaded($user),
            422,
            'Upload a profile picture before submitting your provider profile.',
        );
    }

    public function assertAvatarApproved(ProviderProfile $profile): void
    {
        abort_unless(
            $this->avatarApproved(User::query()->findOrFail($profile->user_id)),
            409,
            'Approve the provider profile picture before activating this profile.',
        );
    }

    /** @return array{uploaded: bool, scanStatus: string|null, url: string|null} */
    public function avatarState(User $user): array
    {
        $latest = ProfileAsset::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'avatar')
            ->latest()
            ->first();
        $clean = ProfileAsset::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'avatar')
            ->where('scan_status', 'clean')
            ->latest()
            ->first();

        return [
            'uploaded' => $latest !== null && in_array($latest->scan_status, ['pending', 'clean'], true),
            'scanStatus' => $latest?->scan_status,
            'url' => $clean ? "/api/v1/profile-assets/{$clean->id}" : null,
        ];
    }
}
