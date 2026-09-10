<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionStatusController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $authenticated = $request->user() !== null;
        if (! $authenticated) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'data' => [
                'authenticated' => $authenticated,
            ],
        ]);
    }
}
