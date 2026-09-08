<?php

namespace App\Http\Controllers;

use App\Models\ServiceCategory;
use App\Models\User;
use App\Support\KatabangAssistant;
use App\Support\ProviderRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class KatabangController
{
    public function __invoke(Request $request, KatabangAssistant $assistant, ProviderRecommendationService $recommendations): JsonResponse
    {
        abort_unless(config('phase_nine.enabled') && config('phase_nine.katabang'), 404);
        $data = $request->validate([
            'message' => 'required|string|max:500',
            'conversation' => 'sometimes|array|max:6',
            'conversation.*.role' => 'required|in:user,assistant',
            'conversation.*.content' => 'required|string|max:500',
        ]);
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $serviceCategories = ServiceCategory::query()->where('is_active', true)->orderBy('name')->pluck('name')->all();
        try {
            $result = $assistant->answer($data['message'], $data['conversation'] ?? [], $serviceCategories);
        } catch (RuntimeException $exception) {
            Log::warning('Katabang AI request failed.', [
                'reason' => $exception->getMessage(),
                'model' => (string) config('services.katabang_ai.model'),
            ]);

            return response()->json(['message' => 'Katabang is temporarily unavailable. Please try again.'], 503);
        }

        $providerRecommendations = $result['intent'] === 'provider_recommendation'
            ? $recommendations->recommend($user, $result['service_query'], $data['message'])
            : null;
        if ($providerRecommendations !== null) {
            $query = array_filter([
                'categoryId' => $providerRecommendations['category']['id'] ?? null,
                'areaId' => $providerRecommendations['area']['id'] ?? null,
            ]);
            $result['action']['href'] = '/providers'.($query === [] ? '' : '?'.http_build_query($query));
        }

        DB::table('assistant_interactions')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'intent' => $result['intent'], 'input_redacted' => json_encode(['length' => Str::length($data['message']), 'turns' => count($data['conversation'] ?? [])], JSON_THROW_ON_ERROR), 'response_metadata' => json_encode(['action' => $result['action']['href'], 'engine' => 'groq-chat-completions', 'model' => config('services.katabang_ai.model'), 'response_id' => $result['response_id'], 'recommendation_count' => $providerRecommendations['total'] ?? null], JSON_THROW_ON_ERROR), 'escalated' => $result['escalated'], 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['data' => ['intent' => $result['intent'], 'answer' => $result['answer'], 'action' => $result['action'], 'providers' => $providerRecommendations, 'disclaimer' => 'Katabang can make mistakes. Review provider details before choosing.']]);
    }
}
