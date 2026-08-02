<?php

namespace App\Http\Middleware;

use App\Support\MaintenanceService;
use App\Support\StaffAuthorization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNotInMaintenance
{
    public function __construct(private readonly MaintenanceService $maintenance) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->maintenance->isActive()) {
            return $next($request);
        }

        if ($this->isExempt($request)) {
            return $next($request);
        }

        if (StaffAuthorization::canAccessOperations($request->user())) {
            return $next($request);
        }

        $status = $this->maintenance->publicStatus();

        return response()->json([
            'error' => [
                'code' => 'MAINTENANCE_ACTIVE',
                'message' => $status['message'] ?: 'KAILA is under maintenance. Please try again later.',
                'fields' => (object) [],
            ],
            'data' => $status,
        ], Response::HTTP_SERVICE_UNAVAILABLE)->header('Retry-After', '300');
    }

    private function isExempt(Request $request): bool
    {
        if ($request->is('up') || $request->is('api/v1/platform/maintenance')) {
            return true;
        }

        if ($request->is('api/v1/auth/*')) {
            return true;
        }

        if ($request->is('api/v1/admin/marketplace/maintenance*')) {
            return true;
        }

        // Sanctum/CSRF bootstrap used by both apps.
        if ($request->is('sanctum/csrf-cookie') || $request->is('api/v1/csrf-cookie')) {
            return true;
        }

        return false;
    }
}
