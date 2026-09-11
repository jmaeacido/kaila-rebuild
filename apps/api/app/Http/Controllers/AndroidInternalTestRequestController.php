<?php

namespace App\Http\Controllers;

use App\Notifications\BrandedAndroidInternalTestAccessRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class AndroidInternalTestRequestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:254'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $name = trim($validated['name']);
        $email = Str::lower(trim($validated['email']));
        $note = isset($validated['note']) ? trim((string) $validated['note']) : '';
        if ($note === '') {
            $note = null;
        }

        $supportEmail = (string) config('kaila.support_email');

        Notification::route('mail', $supportEmail)
            ->notify(new BrandedAndroidInternalTestAccessRequest(
                requesterName: $name,
                requesterEmail: $email,
                note: $note,
            ));

        return response()->json([
            'data' => [
                'accepted' => true,
            ],
        ], 202);
    }
}
