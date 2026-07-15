<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\ServiceCategory;
use Illuminate\Http\JsonResponse;

class ReferenceDataController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['data' => [
            'categories' => ServiceCategory::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'parent_id', 'name', 'slug', 'icon']),
            'areas' => Area::query()->where('is_active', true)->orderBy('type')->orderBy('name')->get(['id', 'parent_id', 'type', 'name', 'code']),
        ]]);
    }
}
