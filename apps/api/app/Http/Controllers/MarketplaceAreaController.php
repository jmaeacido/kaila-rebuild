<?php

namespace App\Http\Controllers;

use App\Models\Area;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MarketplaceAreaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'parentId' => ['sometimes', 'integer', 'exists:areas,id'],
            'ids' => ['sometimes', 'array', 'min:1', 'max:50'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        if (! array_key_exists('parentId', $data) && ! array_key_exists('ids', $data)) {
            throw ValidationException::withMessages([
                'parentId' => 'Provide parentId or ids.',
            ]);
        }

        $query = Area::query()->where('is_active', true);

        if (array_key_exists('parentId', $data)) {
            $query->where('parent_id', $data['parentId']);
        }

        if (array_key_exists('ids', $data)) {
            $query->whereIn('id', $data['ids']);
        }

        $areas = $query
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id', 'parent_id', 'type', 'name', 'code']);

        return response()->json(['data' => $areas]);
    }

    public function show(Area $area): JsonResponse
    {
        if (! $area->is_active) {
            abort(404);
        }

        $area->load(['parent:id,parent_id,type,name,code']);

        return response()->json([
            'data' => [
                'id' => $area->id,
                'parent_id' => $area->parent_id,
                'type' => $area->type,
                'name' => $area->name,
                'code' => $area->code,
                'parent' => $area->parent
                    ? $area->parent->only(['id', 'parent_id', 'type', 'name', 'code'])
                    : null,
            ],
        ]);
    }
}
