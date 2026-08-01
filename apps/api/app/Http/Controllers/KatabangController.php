<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\KatabangAssistant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class KatabangController
{
    public function __invoke(Request $request, KatabangAssistant $assistant): JsonResponse
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
        try {
            $result = $assistant->answer($data['message'], $data['conversation'] ?? []);
        } catch (RuntimeException) {
            return response()->json(['message' => 'Katabang is temporarily unavailable. Please try again.'], 503);
        }

        DB::table('assistant_interactions')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'intent' => $result['intent'], 'input_redacted' => json_encode(['length' => Str::length($data['message']), 'turns' => count($data['conversation'] ?? [])], JSON_THROW_ON_ERROR), 'response_metadata' => json_encode(['action' => $result['action']['href'], 'engine' => 'groq-chat-completions', 'model' => config('services.katabang_ai.model'), 'response_id' => $result['response_id']], JSON_THROW_ON_ERROR), 'escalated' => $result['escalated'], 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['data' => ['intent' => $result['intent'], 'answer' => $result['answer'], 'action' => $result['action'], 'disclaimer' => 'Katabang can make mistakes. Review important details before acting.']]);
    }
}
