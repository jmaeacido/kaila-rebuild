<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\ProfileAsset;
use App\Models\ProviderCredential;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Notifications\BrandedProviderProfileDecision;
use App\Support\NotificationService;
use App\Support\OpportunityMatchingService;
use App\Support\OutboxRecorder;
use App\Support\ProviderProfileReviewBaseline;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminMarketplaceController extends Controller
{
    public function __construct(
        private readonly OutboxRecorder $outbox,
        private readonly NotificationService $notifications,
        private readonly OpportunityMatchingService $matching,
    ) {}

    public function queue(): JsonResponse
    {
        return response()->json(['data' => [
            'providers' => ProviderProfile::query()
                ->where('status', 'pending_review')
                ->with(['user:id,name,email', 'services:id,name', 'serviceAreas:id,name,type', 'availability'])
                ->oldest()
                ->get()
                ->map(fn (ProviderProfile $profile): array => $this->presentProvider($profile)),
            'credentials' => ProviderCredential::query()
                ->where('review_status', 'pending')
                ->with(['providerProfile.user:id,name,email', 'asset'])
                ->oldest()
                ->get()
                ->map(fn (ProviderCredential $credential): array => $this->presentCredential($credential)),
            'assets' => ProfileAsset::query()
                ->where('scan_status', 'pending')
                ->with('user:id,name,email')
                ->oldest()
                ->get(['id', 'user_id', 'purpose', 'original_name', 'mime_type', 'size_bytes', 'created_at'])
                ->map(fn (ProfileAsset $asset): array => [
                    'id' => $asset->id,
                    'originalName' => $asset->original_name,
                    'mimeType' => $asset->mime_type,
                    'sizeBytes' => $asset->size_bytes,
                    'purpose' => $asset->purpose,
                    'createdAt' => $asset->created_at?->toIso8601String(),
                    'previewUrl' => "/api/v1/admin/marketplace/assets/{$asset->id}/preview",
                    'uploadedBy' => [
                        'id' => $asset->user_id,
                        'name' => $asset->user?->name ?? 'Unknown user',
                        'email' => $asset->user?->email,
                    ],
                ]),
            'assetReviews' => ProfileAsset::query()
                ->whereNotNull('reviewed_at')
                ->with(['user:id,name,email', 'reviewer:id,name,email'])
                ->latest('reviewed_at')
                ->limit(50)
                ->get(['id', 'user_id', 'purpose', 'original_name', 'mime_type', 'size_bytes', 'scan_status', 'reviewed_by', 'review_note', 'reviewed_at', 'created_at'])
                ->map(fn (ProfileAsset $asset): array => [
                    'id' => $asset->id,
                    'originalName' => $asset->original_name,
                    'mimeType' => $asset->mime_type,
                    'sizeBytes' => $asset->size_bytes,
                    'purpose' => $asset->purpose,
                    'createdAt' => $asset->created_at?->toIso8601String(),
                    'previewUrl' => "/api/v1/admin/marketplace/assets/{$asset->id}/preview",
                    'decision' => $asset->scan_status === 'clean' ? 'approved' : 'rejected',
                    'reviewReason' => $asset->review_note,
                    'reviewedAt' => $asset->reviewed_at?->toIso8601String(),
                    'uploadedBy' => [
                        'id' => $asset->user_id,
                        'name' => $asset->user?->name ?? 'Unknown user',
                        'email' => $asset->user?->email,
                    ],
                    'reviewedBy' => [
                        'id' => $asset->reviewed_by,
                        'name' => $asset->reviewer?->name ?? 'Unknown reviewer',
                        'email' => $asset->reviewer?->email,
                    ],
                ]),
            'providerReviews' => ProviderProfile::query()
                ->whereNotNull('reviewed_at')
                ->with(['user:id,name,email', 'reviewer:id,name,email', 'services:id,name', 'serviceAreas:id,name,type'])
                ->latest('reviewed_at')
                ->limit(50)
                ->get()
                ->map(fn (ProviderProfile $profile): array => $this->presentProvider($profile, true)),
            'credentialReviews' => ProviderCredential::query()
                ->whereNotNull('reviewed_at')
                ->with(['providerProfile.user:id,name,email', 'asset', 'reviewer:id,name,email'])
                ->latest('reviewed_at')
                ->limit(50)
                ->get()
                ->map(fn (ProviderCredential $credential): array => $this->presentCredential($credential, true)),
        ]]);
    }

    public function assetPreview(ProfileAsset $profileAsset): StreamedResponse
    {
        return Storage::disk($profileAsset->disk)->response(
            $profileAsset->object_key,
            $profileAsset->original_name,
            [
                'Content-Type' => $profileAsset->mime_type,
                'Cache-Control' => 'private, no-store, max-age=0',
                'Content-Disposition' => HeaderUtils::makeDisposition(
                    HeaderUtils::DISPOSITION_INLINE,
                    $profileAsset->original_name,
                    'profile-asset',
                ),
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
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
        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'rejected', 'suspended'])],
            'reviewReason' => ['nullable', 'required_unless:status,active', 'string', 'min:10', 'max:1000'],
        ]);
        /** @var User $admin */ $admin = $request->user();
        DB::transaction(function () use ($providerProfile, $data, $admin): void {
            $approved = $data['status'] === 'active';
            $providerProfile->update([
                'status' => $data['status'],
                'reviewed_by' => $admin->id,
                'review_note' => $approved ? null : trim($data['reviewReason']),
                'reviewed_at' => now(),
                'review_baseline' => null,
            ]);
            $this->outbox->record('profile.updated', 'provider_profile', (string) $providerProfile->id, (int) now()->format('U'), ['recipientUserIds' => $this->reviewAudience($providerProfile->user_id), 'data' => ['providerProfileId' => $providerProfile->id, 'status' => $providerProfile->status, 'reviewReason' => $providerProfile->review_note]]);
            $this->notifications->send(
                $providerProfile->user_id,
                $approved ? 'profile.provider_approved' : 'profile.provider_rejected',
                $approved ? 'Provider profile approved' : 'Provider profile not approved',
                $approved
                    ? 'Your provider profile is approved and can now appear in KAILA discovery.'
                    : "Your provider profile wasn't approved. Reason: {$providerProfile->review_note}",
                'provider_profile',
                (string) $providerProfile->id,
                ['providerProfileId' => $providerProfile->id, 'reviewStatus' => $approved ? 'approved' : 'rejected', 'reviewReason' => $providerProfile->review_note],
            );
        });
        if ($providerProfile->status === 'active') {
            $this->matching->reconcileProvider($providerProfile);
        }
        User::query()->findOrFail($providerProfile->user_id)->notify(
            new BrandedProviderProfileDecision(
                $data['status'] === 'active',
                $providerProfile->review_note,
            ),
        );

        return response()->json(['data' => $providerProfile]);
    }

    public function asset(Request $request, ProfileAsset $profileAsset): JsonResponse
    {
        $data = $request->validate([
            'scanStatus' => ['required', Rule::in(['clean', 'rejected'])],
            'reviewReason' => ['nullable', 'required_if:scanStatus,rejected', 'string', 'min:10', 'max:500'],
        ]);
        /** @var User $admin */
        $admin = $request->user();
        DB::transaction(function () use ($profileAsset, $data, $admin): void {
            $profileAsset->update([
                'scan_status' => $data['scanStatus'],
                'reviewed_by' => $admin->id,
                'review_note' => $data['scanStatus'] === 'rejected' ? trim($data['reviewReason']) : null,
                'reviewed_at' => now(),
            ]);
            $this->outbox->record('profile.media.updated', 'profile_asset', $profileAsset->id, (int) now()->format('U'), ['recipientUserIds' => $this->reviewAudience($profileAsset->user_id), 'data' => ['profileAssetId' => $profileAsset->id, 'scanStatus' => $profileAsset->scan_status]]);
            $approved = $profileAsset->scan_status === 'clean';
            $purpose = match ($profileAsset->purpose) {
                'avatar' => 'profile picture',
                'portfolio' => 'portfolio image',
                'credential' => 'credential file',
                default => 'file',
            };
            $this->notifications->send(
                $profileAsset->user_id,
                $approved ? 'profile.file_approved' : 'profile.file_rejected',
                $approved ? ucfirst($purpose).' approved' : ucfirst($purpose).' not approved',
                $approved
                    ? "Your {$purpose} is now available on KAILA."
                    : "Your {$purpose} wasn't approved. Reason: {$profileAsset->review_note}",
                'profile_asset',
                $profileAsset->id,
                [
                    'profileAssetId' => $profileAsset->id,
                    'purpose' => $profileAsset->purpose,
                    'reviewStatus' => $approved ? 'approved' : 'rejected',
                    'reviewReason' => $profileAsset->review_note,
                ],
            );
        });

        return response()->json(['data' => $profileAsset->only(['id', 'scan_status'])]);
    }

    public function credential(Request $request, ProviderCredential $providerCredential): JsonResponse
    {
        $data = $request->validate([
            'reviewStatus' => ['required', Rule::in(['approved', 'rejected'])],
            'reviewNote' => ['nullable', 'required_if:reviewStatus,rejected', 'string', 'min:10', 'max:1000'],
        ]);
        /** @var User $admin */ $admin = $request->user();
        DB::transaction(function () use ($providerCredential, $data, $admin): void {
            $asset = ProfileAsset::query()->lockForUpdate()->findOrFail($providerCredential->asset_id);
            abort_if($data['reviewStatus'] === 'approved' && $asset->scan_status !== 'clean', 409, 'A credential cannot be approved before its file passes scanning.');
            $approved = $data['reviewStatus'] === 'approved';
            $providerCredential->update(['review_status' => $data['reviewStatus'], 'review_note' => $approved ? null : trim($data['reviewNote']), 'reviewed_by' => $admin->id, 'reviewed_at' => now()]);
            $profile = ProviderProfile::query()->findOrFail($providerCredential->provider_profile_id);
            $this->outbox->record('profile.updated', 'provider_profile', (string) $profile->id, (int) now()->format('U'), ['recipientUserIds' => $this->reviewAudience($profile->user_id), 'data' => ['providerProfileId' => $profile->id, 'credentialReviewStatus' => $providerCredential->review_status]]);
            $this->notifications->send(
                $profile->user_id,
                $approved ? 'profile.credential_approved' : 'profile.credential_rejected',
                $approved ? 'Credential approved' : 'Credential not approved',
                $approved
                    ? "Your {$providerCredential->label} credential was approved."
                    : "Your {$providerCredential->label} credential wasn't approved. Reason: {$providerCredential->review_note}",
                'provider_credential',
                (string) $providerCredential->id,
                ['providerProfileId' => $profile->id, 'credentialId' => $providerCredential->id, 'reviewStatus' => $approved ? 'approved' : 'rejected', 'reviewReason' => $providerCredential->review_note],
            );
        });

        return response()->json(['data' => $providerCredential->fresh()]);
    }

    /** @return array<string, mixed> */
    private function presentProvider(ProviderProfile $profile, bool $reviewed = false): array
    {
        $baseline = is_array($profile->review_baseline) ? $profile->review_baseline : null;

        return [
            'id' => $profile->id,
            'displayName' => $profile->display_name,
            'bio' => $profile->bio,
            'yearsExperience' => $profile->years_experience,
            'offersAtShop' => $profile->offers_at_shop,
            'shopName' => $profile->shop_name,
            'shopAddress' => $profile->shop_address,
            'submittedAt' => $profile->updated_at?->toIso8601String(),
            'isUpdate' => $baseline !== null,
            'changes' => $baseline ? ProviderProfileReviewBaseline::changes($baseline, $profile) : [],
            'user' => ['id' => $profile->user_id, 'name' => $profile->user?->name, 'email' => $profile->user?->email],
            'services' => $profile->services->map->only(['id', 'name'])->values(),
            'serviceAreas' => $profile->serviceAreas->map->only(['id', 'name', 'type'])->values(),
            'availability' => $profile->relationLoaded('availability') ? $profile->availability : [],
            ...($reviewed ? [
                'decision' => $profile->status === 'active' ? 'approved' : 'rejected',
                'reviewReason' => $profile->review_note,
                'reviewedAt' => $profile->reviewed_at?->toIso8601String(),
                'reviewedBy' => ['id' => $profile->reviewed_by, 'name' => $profile->reviewer?->name ?? 'Unknown reviewer', 'email' => $profile->reviewer?->email],
            ] : []),
        ];
    }

    /** @return array<string, mixed> */
    private function presentCredential(ProviderCredential $credential, bool $reviewed = false): array
    {
        $asset = $credential->asset;
        $profile = $credential->providerProfile;

        return [
            'id' => $credential->id,
            'label' => $credential->label,
            'type' => $credential->type,
            'submittedAt' => $credential->created_at?->toIso8601String(),
            'provider' => ['id' => $profile->id, 'displayName' => $profile->display_name, 'user' => ['id' => $profile->user_id, 'name' => $profile->user?->name, 'email' => $profile->user?->email]],
            'asset' => ['id' => $asset->id, 'originalName' => $asset->original_name, 'mimeType' => $asset->mime_type, 'sizeBytes' => $asset->size_bytes, 'scanStatus' => $asset->scan_status, 'previewUrl' => "/api/v1/admin/marketplace/assets/{$asset->id}/preview"],
            ...($reviewed ? [
                'decision' => $credential->review_status,
                'reviewReason' => $credential->review_note,
                'reviewedAt' => $credential->reviewed_at?->toIso8601String(),
                'reviewedBy' => ['id' => $credential->reviewed_by, 'name' => $credential->reviewer?->name ?? 'Unknown reviewer', 'email' => $credential->reviewer?->email],
            ] : []),
        ];
    }

    /** @return list<string> */
    private function reviewAudience(int $subjectUserId): array
    {
        return User::query()
            ->where('is_admin', true)
            ->pluck('id')
            ->push($subjectUserId)
            ->unique()
            ->map(static fn (int $id): string => (string) $id)
            ->values()
            ->all();
    }
}
