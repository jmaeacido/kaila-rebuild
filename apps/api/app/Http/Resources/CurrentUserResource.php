<?php

namespace App\Http\Resources;

use App\Models\ProfileAsset;
use App\Models\ProviderProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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

        return [
            'id' => (string) $this->resource->getKey(),
            'name' => $this->resource->name,
            'email' => $this->resource->email,
            'modes' => ['client', 'provider'],
            'activeMode' => $this->resource->active_mode,
            'providerEligible' => $providerEligible,
            'avatarUrl' => $avatar ? "/api/v1/profile-assets/{$avatar->getKey()}" : null,
        ];
    }
}
