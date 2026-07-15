<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CurrentUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $modes = ['client'];

        if ($this->resource->provider_intent) {
            $modes[] = 'provider';
        }

        return [
            'id' => (string) $this->resource->getKey(),
            'name' => $this->resource->name,
            'email' => $this->resource->email,
            'modes' => $modes,
            'providerEligible' => false,
        ];
    }
}
