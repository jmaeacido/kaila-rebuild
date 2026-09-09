<?php

namespace App\Http\Resources;

use App\Models\ProviderProfile;
use App\Support\IdentityVerificationService;
use App\Support\ProfileAvatarResolver;
use App\Support\StaffAuthorization;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class CurrentUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $providerEligible = ProviderProfile::query()->where('user_id', $this->resource->getKey())->where('status', 'active')->exists();
        $avatars = app(ProfileAvatarResolver::class);
        $userId = (int) $this->resource->getKey();
        $avatarUrl = $avatars->clientUrl($userId);
        $providerAvatarUrl = $avatars->providerUrl($userId, fallbackToClient: false);
        $activeMode = $this->resource->active_mode;
        $reputation = DB::table('reputation_projections')
            ->where('user_id', $userId)
            ->first(['average_rating', 'published_review_count']);
        $identityVerified = app(IdentityVerificationService::class)->approved($this->resource);

        return [
            'id' => (string) $userId,
            'name' => $this->resource->name,
            'email' => $this->resource->email,
            'modes' => ['client', 'provider'],
            'activeMode' => $activeMode,
            'appearanceTheme' => in_array((string) ($this->resource->appearance_theme ?: 'system'), ['light', 'dark', 'system'], true)
                ? (string) ($this->resource->appearance_theme ?: 'system')
                : 'system',
            'providerEligible' => $providerEligible,
            'identityVerified' => $identityVerified,
            'staffRole' => in_array((string) ($this->resource->staff_role ?? ''), ['super_admin', 'admin', 'staff'], true)
                ? (string) $this->resource->staff_role
                : null,
            'staffCapabilities' => StaffAuthorization::capabilities($this->resource),
            'avatarUrl' => $avatarUrl,
            'providerAvatarUrl' => $providerAvatarUrl,
            'displayAvatarUrl' => $activeMode === 'provider' && $providerEligible
                ? ($providerAvatarUrl ?? $avatarUrl)
                : $avatarUrl,
            'reputation' => [
                'averageRating' => $reputation?->average_rating !== null
                    ? (float) $reputation->average_rating
                    : null,
                'reviewCount' => (int) ($reputation->published_review_count ?? 0),
            ],
        ];
    }
}
