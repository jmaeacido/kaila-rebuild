<?php

namespace App\Http\Controllers;

use App\Models\PushDevice;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PushDeviceController
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['platform' => ['required', Rule::in(['android', 'web'])], 'token' => ['required', 'string', 'max:4096']]);
        $hash = hash('sha256', $data['token']);
        $device = PushDevice::query()->firstOrNew(['token_hash' => $hash]);
        if (! $device->exists) {
            $device->id = (string) Str::uuid();
        }
        $device->fill(['user_id' => $this->user($request)->id, 'platform' => $data['platform'], 'token_encrypted' => $data['token'], 'last_seen_at' => now(), 'revoked_at' => null])->save();

        return response()->json(['data' => ['id' => $device->id, 'platform' => $device->platform]], 201);
    }

    public function destroy(Request $request, PushDevice $pushDevice): JsonResponse
    {
        abort_unless($pushDevice->user_id === $this->user($request)->id, 404);
        $pushDevice->update(['revoked_at' => now()]);

        return response()->json(['data' => ['revoked' => true]]);
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
