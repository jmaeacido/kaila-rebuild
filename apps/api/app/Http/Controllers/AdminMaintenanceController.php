<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\MaintenanceService;
use App\Support\StaffAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AdminMaintenanceController extends Controller
{
    public function __construct(private readonly MaintenanceService $maintenance) {}

    public function show(Request $request): JsonResponse
    {
        $actor = $this->actor($request);

        return response()->json(['data' => [
            ...$this->maintenance->publicStatus(),
            'capabilities' => [
                'canManageMaintenance' => StaffAuthorization::canManageMaintenance($actor),
            ],
            'viewer' => [
                'id' => (string) $actor->id,
                'staffRole' => $actor->staff_role,
            ],
        ]]);
    }

    public function schedule(Request $request): JsonResponse
    {
        $actor = $this->manager($request);

        $data = $request->validate([
            'countdownSeconds' => ['required', 'integer', 'min:5', 'max:3600'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $row = $this->maintenance->schedule($actor, (int) $data['countdownSeconds'], $data['message'] ?? null);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'error' => [
                    'code' => 'MAINTENANCE_SCHEDULE_FAILED',
                    'message' => $exception->getMessage(),
                    'fields' => (object) [],
                ],
            ], 422);
        }

        return response()->json(['data' => [
            ...$this->maintenance->publicStatus($row),
            'capabilities' => [
                'canManageMaintenance' => true,
            ],
        ]]);
    }

    public function activate(Request $request): JsonResponse
    {
        $actor = $this->manager($request);

        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $row = $this->maintenance->activateNow($actor, $data['message'] ?? null);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'error' => [
                    'code' => 'MAINTENANCE_ACTIVATE_FAILED',
                    'message' => $exception->getMessage(),
                    'fields' => (object) [],
                ],
            ], 422);
        }

        return response()->json(['data' => $this->maintenance->publicStatus($row)]);
    }

    public function cancel(Request $request): JsonResponse
    {
        $actor = $this->manager($request);

        try {
            $row = $this->maintenance->cancel($actor);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'error' => [
                    'code' => 'MAINTENANCE_CANCEL_FAILED',
                    'message' => $exception->getMessage(),
                    'fields' => (object) [],
                ],
            ], 422);
        }

        return response()->json(['data' => $this->maintenance->publicStatus($row)]);
    }

    public function end(Request $request): JsonResponse
    {
        $actor = $this->manager($request);

        try {
            $row = $this->maintenance->end($actor);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'error' => [
                    'code' => 'MAINTENANCE_END_FAILED',
                    'message' => $exception->getMessage(),
                    'fields' => (object) [],
                ],
            ], 422);
        }

        return response()->json(['data' => $this->maintenance->publicStatus($row)]);
    }

    private function actor(Request $request): User
    {
        $actor = $request->user();
        abort_unless($actor instanceof User && StaffAuthorization::canAccessOperations($actor), 403);

        return $actor;
    }

    private function manager(Request $request): User
    {
        $actor = $this->actor($request);
        abort_unless(StaffAuthorization::canManageMaintenance($actor), 403);

        return $actor;
    }
}
