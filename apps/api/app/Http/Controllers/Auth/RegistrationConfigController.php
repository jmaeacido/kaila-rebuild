<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class RegistrationConfigController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => [
                'termsVersion' => (string) config('policies.terms_version'),
                'privacyVersion' => (string) config('policies.privacy_version'),
            ],
        ]);
    }
}
