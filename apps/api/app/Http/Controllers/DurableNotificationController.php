<?php

namespace App\Http\Controllers;

use App\Models\DurableNotification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DurableNotificationController
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => DurableNotification::query()->where('user_id', $this->user($request)->id)->whereNull('cleared_at')->latest()->limit(100)->get()]);
    }

    public function read(Request $request, DurableNotification $notification): JsonResponse
    {
        $this->owns($request, $notification);
        $notification->update(['read_at' => $notification->read_at ?? now()]);

        return response()->json(['data' => $notification]);
    }

    public function clear(Request $request, DurableNotification $notification): JsonResponse
    {
        $this->owns($request, $notification);
        $notification->update(['cleared_at' => now()]);

        return response()->json(['data' => ['id' => $notification->id, 'cleared' => true]]);
    }

    private function owns(Request $request, DurableNotification $notification): void
    {
        abort_unless($notification->user_id === $this->user($request)->id, 404);
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
