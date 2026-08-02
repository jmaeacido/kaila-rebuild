<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateAppearanceRequest;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppearanceController extends Controller
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => $this->serialize($user)]);
    }

    public function update(UpdateAppearanceRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->forceFill([
            'appearance_theme' => $request->string('appearanceTheme')->toString(),
        ])->save();
        $this->audit->record($request, 'appearance.theme_updated', $user, 'user', (string) $user->getKey());

        return response()->json(['data' => $this->serialize($user->refresh())]);
    }

    /** @return array{appearanceTheme: string} */
    private function serialize(User $user): array
    {
        $theme = (string) ($user->appearance_theme ?: 'system');
        if (! in_array($theme, ['light', 'dark', 'system'], true)) {
            $theme = 'system';
        }

        return ['appearanceTheme' => $theme];
    }
}
