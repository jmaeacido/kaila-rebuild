<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Support\JobAreaResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class JobAreaController extends Controller
{
    public function __invoke(Request $request, JobAreaResolver $resolver): JsonResponse
    {
        $data = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        try {
            $area = $resolver->resolve((float) $data['latitude'], (float) $data['longitude']);
        } catch (RuntimeException) {
            return response()->json([
                'message' => 'KAILA could not identify this pin right now. Check your connection and try again.',
            ], 503);
        }

        if (! $area) {
            return response()->json([
                'message' => 'This pin is outside KAILA’s currently supported barangays. Try another job-site pin.',
            ], 422);
        }

        $area->loadMissing('parent');
        $city = $this->cityOf($area);

        return response()->json([
            'data' => [
                'id' => $area->id,
                'name' => $area->name,
                'city' => $city?->name,
                'cityId' => $city?->id,
                'cityName' => $city?->name,
                'cityType' => $city?->type,
            ],
        ]);
    }

    private function cityOf(Area $area): ?Area
    {
        if (in_array($area->type, ['city', 'municipality'], true)) {
            return $area;
        }

        $parent = $area->parent;
        if ($parent && in_array($parent->type, ['city', 'municipality'], true)) {
            return $parent;
        }

        return null;
    }
}
