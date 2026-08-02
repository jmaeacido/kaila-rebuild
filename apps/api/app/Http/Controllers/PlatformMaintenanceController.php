<?php

namespace App\Http\Controllers;

use App\Support\MaintenanceService;
use Illuminate\Http\JsonResponse;

class PlatformMaintenanceController extends Controller
{
    public function __construct(private readonly MaintenanceService $maintenance) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->maintenance->publicStatus()]);
    }
}
