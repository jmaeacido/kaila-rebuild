<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminPhaseNineController
{
    public function analytics(): JsonResponse
    {
        abort_unless(config('phase_nine.enabled') && config('phase_nine.analytics'), 404);
        $minimum = (int) config('phase_nine.analytics_minimum_cohort');
        $users = DB::table('users')->count();
        $suppressed = $users < $minimum;

        return response()->json(['data' => [
            'privacy' => ['minimumCohort' => $minimum, 'suppressed' => $suppressed],
            'marketplace' => $suppressed ? null : ['users' => $users, 'jobs' => DB::table('service_jobs')->count(), 'completedJobs' => DB::table('service_jobs')->whereIn('status', ['completed', 'rated'])->count(), 'offers' => DB::table('offer_threads')->count()],
            'phaseNine' => ['directConversations' => DB::table('direct_conversations')->count(), 'communityPosts' => DB::table('community_posts')->where('moderation_status', 'published')->count(), 'assistantInteractions' => DB::table('assistant_interactions')->count(), 'calls' => DB::table('call_sessions')->count()],
        ]]);
    }

    public function operations(): JsonResponse
    {
        $checks = [
            'database' => DB::select('select 1') !== [],
            'phaseNineSchema' => collect(['direct_conversations', 'call_sessions', 'community_posts', 'assistant_interactions'])->every(fn ($table) => Schema::hasTable($table)),
            'queueConfigured' => config('queue.default') !== 'sync',
            'realtimeSigningConfigured' => filled(config('realtime.ticket_signing_seed_base64')),
            'turnConfigured' => (bool) config('phase_nine.turn_configured'),
        ];

        return response()->json(['data' => ['status' => collect($checks)->except('turnConfigured')->every(fn (bool $passing) => $passing) ? 'ready' : 'attention', 'checks' => $checks, 'checkedAt' => now()->toIso8601String()]]);
    }
}
