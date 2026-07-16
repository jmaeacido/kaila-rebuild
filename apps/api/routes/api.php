<?php

use App\Http\Controllers\AdminMarketplaceController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\MobileSessionController;
use App\Http\Controllers\Auth\PasswordRecoveryController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\CurrentUserController;
use App\Http\Controllers\DurableNotificationController;
use App\Http\Controllers\JobAssetController;
use App\Http\Controllers\MarketplaceProfileController;
use App\Http\Controllers\NotificationPreferenceController;
use App\Http\Controllers\OpportunityController;
use App\Http\Controllers\ProfileAssetController;
use App\Http\Controllers\ProviderCredentialController;
use App\Http\Controllers\PushDeviceController;
use App\Http\Controllers\RealtimeTicketController;
use App\Http\Controllers\ReferenceDataController;
use App\Http\Controllers\ServiceJobController;
use App\Http\Controllers\UserSessionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/auth/csrf', fn () => response()->noContent());

Route::middleware('throttle:registration')->post('/auth/register', RegisteredUserController::class);
Route::get('/marketplace/reference-data', ReferenceDataController::class);
Route::get('/providers', [MarketplaceProfileController::class, 'discover']);
Route::get('/providers/{providerProfile}', [MarketplaceProfileController::class, 'publicProfile']);
Route::get('/profile-assets/{profileAsset}', [ProfileAssetController::class, 'show']);
Route::middleware('throttle:login')->post('/auth/login', [AuthenticatedSessionController::class, 'store']);
Route::middleware('throttle:login')->post('/auth/mobile/login', [MobileSessionController::class, 'store']);
Route::middleware('throttle:login')->post('/auth/mobile/refresh', [MobileSessionController::class, 'refresh']);
Route::middleware('throttle:password-recovery')->group(function (): void {
    Route::post('/auth/password/forgot', [PasswordRecoveryController::class, 'requestLink']);
    Route::post('/auth/password/reset', [PasswordRecoveryController::class, 'reset']);
});

Route::middleware('mobile.auth')->group(function (): void {
    Route::get('/auth/mobile/me', [MobileSessionController::class, 'me']);
    Route::post('/auth/mobile/logout', [MobileSessionController::class, 'destroyCurrent']);
    Route::get('/auth/mobile/sessions', [MobileSessionController::class, 'index']);
    Route::delete('/auth/mobile/sessions/{sessionId}', [MobileSessionController::class, 'destroy']);
    Route::post('/auth/mobile/realtime-ticket', [RealtimeTicketController::class, 'mobile']);
    Route::get('/auth/mobile/notification-preferences', [NotificationPreferenceController::class, 'show']);
    Route::put('/auth/mobile/notification-preferences', [NotificationPreferenceController::class, 'update']);
    Route::get('/auth/mobile/marketplace-profile', [MarketplaceProfileController::class, 'show']);
    Route::put('/auth/mobile/active-mode', [MarketplaceProfileController::class, 'mode']);
    Route::put('/auth/mobile/client-profile', [MarketplaceProfileController::class, 'client']);
    Route::put('/auth/mobile/provider-profile', [MarketplaceProfileController::class, 'provider']);
    Route::post('/auth/mobile/profile-assets', [ProfileAssetController::class, 'store']);
    Route::post('/auth/mobile/provider-credentials', [ProviderCredentialController::class, 'store']);
    Route::get('/auth/mobile/jobs', [ServiceJobController::class, 'index']);
    Route::post('/auth/mobile/jobs', [ServiceJobController::class, 'store']);
    Route::get('/auth/mobile/jobs/{serviceJob}', [ServiceJobController::class, 'show']);
    Route::put('/auth/mobile/jobs/{serviceJob}', [ServiceJobController::class, 'update']);
    Route::post('/auth/mobile/jobs/{serviceJob}/post', [ServiceJobController::class, 'post']);
    Route::post('/auth/mobile/jobs/{serviceJob}/assets', [JobAssetController::class, 'store']);
    Route::get('/auth/mobile/opportunities', [OpportunityController::class, 'index']);
    Route::put('/auth/mobile/opportunities/{opportunity}', [OpportunityController::class, 'decide']);
    Route::get('/auth/mobile/notifications', [DurableNotificationController::class, 'index']);
    Route::put('/auth/mobile/notifications/{notification}/read', [DurableNotificationController::class, 'read']);
    Route::delete('/auth/mobile/notifications/{notification}', [DurableNotificationController::class, 'clear']);
    Route::post('/auth/mobile/push-devices', [PushDeviceController::class, 'store']);
    Route::delete('/auth/mobile/push-devices/{pushDevice}', [PushDeviceController::class, 'destroy']);
});

Route::middleware('auth')->group(function (): void {
    Route::get('/me', CurrentUserController::class);
    Route::post('/auth/logout', [AuthenticatedSessionController::class, 'destroy']);
    Route::post('/auth/logout-all', [AuthenticatedSessionController::class, 'destroyAll']);
    Route::get('/me/sessions', [UserSessionController::class, 'index']);
    Route::delete('/me/sessions/{sessionId}', [UserSessionController::class, 'destroy']);
    Route::post('/realtime/ticket', [RealtimeTicketController::class, 'browser']);
    Route::get('/me/notification-preferences', [NotificationPreferenceController::class, 'show']);
    Route::put('/me/notification-preferences', [NotificationPreferenceController::class, 'update']);
    Route::get('/me/marketplace-profile', [MarketplaceProfileController::class, 'show']);
    Route::put('/me/active-mode', [MarketplaceProfileController::class, 'mode']);
    Route::put('/me/client-profile', [MarketplaceProfileController::class, 'client']);
    Route::put('/me/provider-profile', [MarketplaceProfileController::class, 'provider']);
    Route::post('/me/profile-assets', [ProfileAssetController::class, 'store']);
    Route::post('/me/provider-credentials', [ProviderCredentialController::class, 'store']);
    Route::get('/jobs', [ServiceJobController::class, 'index']);
    Route::post('/jobs', [ServiceJobController::class, 'store']);
    Route::get('/jobs/{serviceJob}', [ServiceJobController::class, 'show']);
    Route::put('/jobs/{serviceJob}', [ServiceJobController::class, 'update']);
    Route::post('/jobs/{serviceJob}/post', [ServiceJobController::class, 'post']);
    Route::post('/jobs/{serviceJob}/assets', [JobAssetController::class, 'store']);
    Route::get('/opportunities', [OpportunityController::class, 'index']);
    Route::put('/opportunities/{opportunity}', [OpportunityController::class, 'decide']);
    Route::get('/notifications', [DurableNotificationController::class, 'index']);
    Route::put('/notifications/{notification}/read', [DurableNotificationController::class, 'read']);
    Route::delete('/notifications/{notification}', [DurableNotificationController::class, 'clear']);
    Route::post('/push-devices', [PushDeviceController::class, 'store']);
    Route::delete('/push-devices/{pushDevice}', [PushDeviceController::class, 'destroy']);
    Route::middleware('admin')->prefix('admin/marketplace')->group(function (): void {
        Route::get('/review-queue', [AdminMarketplaceController::class, 'queue']);
        Route::post('/categories', [AdminMarketplaceController::class, 'category']);
        Route::put('/categories/{serviceCategory}', [AdminMarketplaceController::class, 'category']);
        Route::post('/areas', [AdminMarketplaceController::class, 'area']);
        Route::put('/areas/{area}', [AdminMarketplaceController::class, 'area']);
        Route::put('/providers/{providerProfile}/status', [AdminMarketplaceController::class, 'provider']);
        Route::put('/assets/{profileAsset}/scan', [AdminMarketplaceController::class, 'asset']);
        Route::put('/credentials/{providerCredential}/review', [AdminMarketplaceController::class, 'credential']);
    });
});

Route::fallback(function (Request $request) {
    return response()->json([
        'error' => [
            'code' => 'NOT_FOUND',
            'message' => 'The requested endpoint was not found.',
            'fields' => (object) [],
        ],
    ], 404);
});
