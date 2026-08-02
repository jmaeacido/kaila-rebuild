<?php

namespace App\Http\Resources;

use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
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
        $avatar = ProfileAsset::query()
            ->where('user_id', $this->resource->getKey())
            ->where('purpose', 'avatar')
            ->where('scan_status', 'clean')
            ->orderByRaw("CASE WHEN origin = 'upload' THEN 0 ELSE 1 END")
            ->latest()
            ->first();
        $reputation = DB::table('reputation_projections')
            ->where('user_id', $this->resource->getKey())
            ->first(['average_rating', 'published_review_count']);

        return [
            'id' => (string) $this->resource->getKey(),
            'name' => $this->resource->name,
            'email' => $this->resource->email,
            'modes' => ['client', 'provider'],
            'activeMode' => $this->resource->active_mode,
            'appearanceTheme' => in_array((string) ($this->resource->appearance_theme ?: 'system'), ['light', 'dark', 'system'], true)
                ? (string) ($this->resource->appearance_theme ?: 'system')
                : 'system',
            'providerEligible' => $providerEligible,
            'avatarUrl' => $avatar ? "/api/v1/profile-assets/{$avatar->getKey()}" : null,
            'reputation' => [
                'averageRating' => $reputation?->average_rating !== null
                    ? (float) $reputation->average_rating
                    : null,
                'reviewCount' => (int) ($reputation->published_review_count ?? 0),
            ],
        ];
    }
}
