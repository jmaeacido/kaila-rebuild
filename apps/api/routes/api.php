<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\MobileSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\CurrentUserController;
use App\Http\Controllers\UserSessionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/auth/csrf', fn () => response()->noContent());

Route::middleware('throttle:registration')->post('/auth/register', RegisteredUserController::class);
Route::middleware('throttle:login')->post('/auth/login', [AuthenticatedSessionController::class, 'store']);
Route::middleware('throttle:login')->post('/auth/mobile/login', [MobileSessionController::class, 'store']);
Route::middleware('throttle:login')->post('/auth/mobile/refresh', [MobileSessionController::class, 'refresh']);

Route::middleware('mobile.auth')->group(function (): void {
    Route::get('/auth/mobile/me', [MobileSessionController::class, 'me']);
    Route::post('/auth/mobile/logout', [MobileSessionController::class, 'destroyCurrent']);
    Route::get('/auth/mobile/sessions', [MobileSessionController::class, 'index']);
    Route::delete('/auth/mobile/sessions/{sessionId}', [MobileSessionController::class, 'destroy']);
});

Route::middleware('auth')->group(function (): void {
    Route::get('/me', CurrentUserController::class);
    Route::post('/auth/logout', [AuthenticatedSessionController::class, 'destroy']);
    Route::post('/auth/logout-all', [AuthenticatedSessionController::class, 'destroyAll']);
    Route::get('/me/sessions', [UserSessionController::class, 'index']);
    Route::delete('/me/sessions/{sessionId}', [UserSessionController::class, 'destroy']);
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
