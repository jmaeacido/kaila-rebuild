<?php

namespace App\Http\Controllers;

use App\Models\AndroidInternalTestRequest;
use App\Notifications\BrandedAndroidInternalTestAccessRequest;
use App\Support\AdminNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

class AndroidInternalTestRequestController extends Controller
{
    public function __construct(private readonly AdminNotificationService $adminNotifications) {}

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

        $record = AndroidInternalTestRequest::query()->create([
            'name' => $name,
            'email' => $email,
            'note' => $note,
            'status' => AndroidInternalTestRequest::STATUS_PENDING,
        ]);

        $supportEmail = (string) config('kaila.support_email');

        Notification::route('mail', $supportEmail)
            ->notify(new BrandedAndroidInternalTestAccessRequest(
                requesterName: $name,
                requesterEmail: $email,
                note: $note,
                requestId: $record->id,
            ));

        $this->adminNotifications->send(
            'ops.android_test_access_request',
            'Android early access request',
            "{$name} ({$email}) requested Play internal testing access.",
            'android_internal_test_request',
            $record->id,
            [
                'requestId' => $record->id,
                'requesterEmail' => $email,
                'requesterName' => $name,
            ],
        );

        return response()->json([
            'data' => [
                'accepted' => true,
                'id' => $record->id,
            ],
        ], 202);
    }
}
