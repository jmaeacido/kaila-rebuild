<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class KatabangController
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless(config('phase_nine.enabled') && config('phase_nine.katabang'), 404);
        $data = $request->validate(['message' => 'required|string|max:500']);
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $normalized = Str::lower($data['message']);
        [$intent, $answer, $action] = match (true) {
            Str::contains($normalized, ['post', 'book', 'need help']) => ['post_job', 'Tell us what you need, where the job is, and when you need help. You can review everything before posting.', ['label' => 'Post a Job', 'href' => '/post-job']],
            Str::contains($normalized, ['offer', 'price', 'quote']) => ['offers', 'Open the job to compare provider price, timing, rating, and completed work. KAILA never chooses an offer for you.', ['label' => 'View Jobs', 'href' => '/jobs']],
            Str::contains($normalized, ['message', 'chat']) => ['messages', 'Open Messages to continue an accepted conversation. You can block a person at any time.', ['label' => 'Open Messages', 'href' => '/messages']],
            Str::contains($normalized, ['cancel', 'dispute', 'problem', 'unsafe']) => ['safety', 'Open the job and choose the available cancellation or dispute action. For immediate danger, contact local emergency services.', ['label' => 'View Jobs', 'href' => '/jobs']],
            default => ['help', 'I can guide you to post a job, compare offers, message someone, or resolve a job issue. I do not set prices or make account decisions.', ['label' => 'Go Home', 'href' => '/']],
        };
        DB::table('assistant_interactions')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'intent' => $intent, 'input_redacted' => json_encode(['length' => Str::length($data['message'])], JSON_THROW_ON_ERROR), 'response_metadata' => json_encode(['action' => $action['href'], 'engine' => 'deterministic-v1'], JSON_THROW_ON_ERROR), 'escalated' => $intent === 'safety', 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['data' => ['intent' => $intent, 'answer' => $answer, 'action' => $action, 'disclaimer' => 'Katabang provides navigation help, not professional advice.']]);
    }
}
