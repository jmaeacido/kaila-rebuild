<?php

namespace App\Http\Controllers;

use App\Models\JobOpportunity;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\JobPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OpportunityController
{
    public function __construct(private readonly JobPresenter $presenter) {}

    public function index(Request $request): JsonResponse
    {
        $provider = ProviderProfile::query()->where('user_id', $this->user($request)->id)->where('status', 'active')->first();
        if (! $provider) {
            return response()->json(['data' => []]);
        } $rows = JobOpportunity::query()->where('provider_profile_id', $provider->id)->whereIn('state', ['new', 'seen', 'passed'])->whereHas('job', fn ($q) => $q->where('status', 'posted'))->with('job')->latest()->get();
        foreach ($rows->where('state', 'new') as $row) {
            $row->update(['state' => 'seen', 'seen_at' => now()]);
        }

        return response()->json(['data' => $rows->map(function (JobOpportunity $row): array {
            $job = $row->job;
            abort_unless($job instanceof ServiceJob, 404);

            return $this->presenter->opportunity($job, $row->id, $row->state);
        })]);
    }

    public function decide(Request $request, JobOpportunity $opportunity): JsonResponse
    {
        $data = $request->validate(['decision' => ['required', Rule::in(['passed', 'dismissed'])]]);
        $provider = ProviderProfile::query()->where('user_id', $this->user($request)->id)->first();
        abort_unless($provider && $opportunity->provider_profile_id === $provider->id, 404);
        $opportunity->update(['state' => $data['decision'], 'decided_at' => now()]);

        return response()->json(['data' => ['id' => $opportunity->id, 'state' => $opportunity->state]]);
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }
}
