<?php

namespace App\Http\Resources;

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

        return [
            'id' => (string) $this->resource->getKey(),
            'name' => $this->resource->name,
            'email' => $this->resource->email,
            'modes' => ['client', 'provider'],
            'activeMode' => $this->resource->active_mode,
            'providerEligible' => $providerEligible,
        ];
    }
}
