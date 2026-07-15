<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\ProfileAsset;
use App\Models\ProviderCredential;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminMarketplaceController extends Controller
{
    public function queue(): JsonResponse
    {
        return response()->json(['data' => [
            'providers' => ProviderProfile::query()->where('status', 'pending_review')->with(['services:id,name', 'serviceAreas:id,name'])->oldest()->get(),
            'credentials' => ProviderCredential::query()->where('review_status', 'pending')->with('providerProfile')->oldest()->get(),
            'assets' => ProfileAsset::query()->where('scan_status', 'pending')->oldest()->get(['id', 'user_id', 'purpose', 'original_name', 'mime_type', 'size_bytes', 'created_at']),
        ]]);
    }

    public function category(Request $request, ?ServiceCategory $serviceCategory = null): JsonResponse
    {
        $data = $request->validate(['parentId' => ['nullable', 'integer', 'exists:service_categories,id'], 'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'alpha_dash', 'max:120', Rule::unique('service_categories', 'slug')->ignore($serviceCategory?->id)], 'icon' => ['required', 'string', 'max:64'],
            'sortOrder' => ['integer', 'min:0', 'max:65535'], 'isActive' => ['boolean']]);
        $model = $serviceCategory ?? new ServiceCategory;
        $model->fill(['parent_id' => $data['parentId'] ?? null, 'name' => $data['name'], 'slug' => $data['slug'], 'icon' => $data['icon'], 'sort_order' => $data['sortOrder'] ?? 0, 'is_active' => $data['isActive'] ?? true])->save();

        return response()->json(['data' => $model], $serviceCategory ? 200 : 201);
    }

    public function area(Request $request, ?Area $area = null): JsonResponse
    {
        $data = $request->validate(['parentId' => ['nullable', 'integer', 'exists:areas,id'], 'type' => ['required', Rule::in(['region', 'province', 'city', 'municipality', 'barangay'])],
            'name' => ['required', 'string', 'max:120'], 'code' => ['required', 'alpha_dash', 'max:32', Rule::unique('areas', 'code')->ignore($area?->id)], 'isActive' => ['boolean']]);
        $model = $area ?? new Area;
        $model->fill(['parent_id' => $data['parentId'] ?? null, 'type' => $data['type'], 'name' => $data['name'], 'code' => $data['code'], 'is_active' => $data['isActive'] ?? true])->save();

        return response()->json(['data' => $model], $area ? 200 : 201);
    }

    public function provider(Request $request, ProviderProfile $providerProfile): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'rejected', 'suspended'])]]);
        $providerProfile->update(['status' => $data['status']]);

        return response()->json(['data' => $providerProfile]);
    }

    public function asset(Request $request, ProfileAsset $profileAsset): JsonResponse
    {
        $data = $request->validate(['scanStatus' => ['required', Rule::in(['clean', 'rejected'])]]);
        $profileAsset->update(['scan_status' => $data['scanStatus']]);

        return response()->json(['data' => $profileAsset->only(['id', 'scan_status'])]);
    }

    public function credential(Request $request, ProviderCredential $providerCredential): JsonResponse
    {
        $data = $request->validate(['reviewStatus' => ['required', Rule::in(['approved', 'rejected'])], 'reviewNote' => ['nullable', 'string', 'max:1000']]);
        /** @var User $admin */ $admin = $request->user();
        DB::transaction(function () use ($providerCredential, $data, $admin): void {
            $asset = ProfileAsset::query()->lockForUpdate()->findOrFail($providerCredential->asset_id);
            abort_if($data['reviewStatus'] === 'approved' && $asset->scan_status !== 'clean', 409, 'A credential cannot be approved before its file passes scanning.');
            $providerCredential->update(['review_status' => $data['reviewStatus'], 'review_note' => $data['reviewNote'] ?? null, 'reviewed_by' => $admin->id, 'reviewed_at' => now()]);
        });

        return response()->json(['data' => $providerCredential->fresh()]);
    }
}
