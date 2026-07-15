<?php

namespace App\Http\Controllers;

use App\Models\ProfileAsset;
use App\Models\ProviderCredential;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderCredentialController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['assetId' => ['required', 'uuid', 'exists:profile_assets,id'], 'type' => ['required', 'string', 'max:48'], 'label' => ['required', 'string', 'max:120']]);
        /** @var User $user */ $user = $request->user();
        $profile = ProviderProfile::query()->where('user_id', $user->id)->firstOrFail();
        $asset = ProfileAsset::query()->whereKey($data['assetId'])->where('user_id', $user->id)->where('purpose', 'credential')->firstOrFail();
        $credential = ProviderCredential::query()->create(['provider_profile_id' => $profile->id, 'asset_id' => $asset->id, 'type' => $data['type'], 'label' => $data['label'], 'review_status' => 'pending']);

        return response()->json(['data' => $credential], 201);
    }
}
