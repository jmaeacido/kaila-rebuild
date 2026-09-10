<?php

namespace App\Support;

use App\Models\Area;
use App\Models\ClientProfile;
use App\Models\DisputeCase;
use App\Models\IdentityVerification;
use App\Models\ModerationReport;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;
use App\Models\SupportCase;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AdminUserDossierPresenter
{
    public function __construct(private readonly ProfileAvatarResolver $avatars) {}

    /**
     * @param  array<string, mixed>  $account
     * @return array<string, mixed>
     */
    public function present(User $target, array $account): array
    {
        $provider = ProviderProfile::query()
            ->with(['services:id,name', 'serviceAreas:id,name', 'reviewer:id,name'])
            ->where('user_id', $target->id)
            ->first();
        $recentJobs = $this->recentJobs($target, $provider);

        return [
            'account' => $account,
            'client' => $this->client($target),
            'provider' => $provider ? $this->provider($provider) : null,
            'identity' => $this->identity($target),
            'recentJobs' => $recentJobs,
            'activity' => $this->activity($target, $provider, $recentJobs),
        ];
    }

    /** @return array<string, mixed>|null */
    private function client(User $target): ?array
    {
        $profile = ClientProfile::query()->where('user_id', $target->id)->first();
        if ($profile === null) {
            return null;
        }

        $area = $profile->area_id
            ? Area::query()->find($profile->area_id, ['id', 'name'])
            : null;

        return [
            'displayName' => $profile->display_name,
            'area' => $area ? ['id' => $area->id, 'name' => $area->name] : null,
            'updatedAt' => $profile->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function provider(ProviderProfile $profile): array
    {
        return [
            'id' => $profile->id,
            'displayName' => $profile->display_name,
            'bio' => $profile->bio,
            'status' => $profile->status,
            'yearsExperience' => $profile->years_experience,
            'rating' => $profile->rating !== null ? (float) $profile->rating : null,
            'completedJobs' => (int) $profile->completed_jobs,
            'responseMinutes' => $profile->response_minutes,
            'offersAtShop' => (bool) $profile->offers_at_shop,
            'shopName' => $profile->shop_name,
            'shopAddress' => $profile->shop_address,
            'services' => $profile->services->map(fn ($service) => [
                'id' => $service->id,
                'name' => $service->name,
            ])->values()->all(),
            'serviceAreas' => $profile->serviceAreas->map(fn ($area) => [
                'id' => $area->id,
                'name' => $area->name,
            ])->values()->all(),
            'reviewedAt' => $profile->reviewed_at?->toIso8601String(),
            'reviewNote' => $profile->review_note,
            'reviewedBy' => $profile->reviewed_by
                ? ['id' => (string) $profile->reviewed_by, 'name' => $profile->reviewer?->name ?? 'Unknown reviewer']
                : null,
            'avatarUrl' => $this->avatars->providerUrl((int) $profile->user_id),
        ];
    }

    /** @return array<string, mixed>|null */
    private function identity(User $target): ?array
    {
        $verification = IdentityVerification::query()->where('user_id', $target->id)->first();
        if ($verification === null) {
            return null;
        }

        return [
            'status' => $verification->status,
            'submittedAt' => $verification->submitted_at?->toIso8601String(),
            'reviewedAt' => $verification->reviewed_at?->toIso8601String(),
            'decisionReason' => $verification->decision_reason,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentJobs(User $target, ?ProviderProfile $provider): array
    {
        $clientJobs = ServiceJob::query()
            ->with('area:id,name')
            ->where('client_user_id', $target->id)
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get()
            ->map(fn (ServiceJob $job) => $this->jobRow($job, 'client'));

        $providerJobs = collect();
        if ($provider !== null) {
            $hiredIds = DB::table('accepted_offer_snapshots')
                ->where('provider_profile_id', $provider->id)
                ->pluck('service_job_id');
            $providerJobs = ServiceJob::query()
                ->with('area:id,name')
                ->where(function ($query) use ($provider, $hiredIds): void {
                    $query->whereIn('id', $hiredIds)
                        ->orWhere('direct_provider_profile_id', $provider->id);
                })
                ->orderByDesc('updated_at')
                ->limit(10)
                ->get()
                ->map(fn (ServiceJob $job) => $this->jobRow($job, 'provider'));
        }

        return $clientJobs
            ->concat($providerJobs)
            ->unique('id')
            ->sortByDesc(fn (array $row) => $row['updatedAt'] ?? $row['postedAt'] ?? '')
            ->take(10)
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function jobRow(ServiceJob $job, string $role): array
    {
        return [
            'id' => $job->id,
            'title' => $job->title,
            'status' => $job->status,
            'role' => $role,
            'postedAt' => $job->posted_at?->toIso8601String(),
            'updatedAt' => $job->updated_at?->toIso8601String(),
            'areaLabel' => $job->area?->name,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $recentJobs
     * @return list<array<string, mixed>>
     */
    private function activity(User $target, ?ProviderProfile $provider, array $recentJobs): array
    {
        /** @var Collection<int, array<string, mixed>> $items */
        $items = collect();

        SupportCase::query()
            ->where('customer_user_id', $target->id)
            ->orderByDesc('last_message_at')
            ->limit(10)
            ->get(['id', 'reference', 'subject', 'status', 'last_message_at', 'created_at'])
            ->each(function (SupportCase $case) use ($items): void {
                $at = $case->last_message_at ?? $case->created_at;
                if ($at === null) {
                    return;
                }
                $items->push([
                    'id' => 'support-'.$case->id,
                    'kind' => 'support',
                    'title' => "Support {$case->reference}: {$case->subject} ({$case->status})",
                    'at' => $at->toIso8601String(),
                    'href' => '/support?case='.$case->id,
                ]);
            });

        $identity = IdentityVerification::query()->where('user_id', $target->id)->first();
        if ($identity !== null) {
            $at = $identity->reviewed_at ?? $identity->submitted_at ?? $identity->updated_at ?? $identity->created_at;
            if ($at !== null) {
                $items->push([
                    'id' => 'identity-'.$identity->id,
                    'kind' => 'identity',
                    'title' => 'Identity verification '.$identity->status,
                    'at' => $at->toIso8601String(),
                    'href' => '/identity-verifications',
                ]);
            }
        }

        DisputeCase::query()
            ->where('opened_by_user_id', $target->id)
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get(['id', 'status', 'reason', 'created_at', 'updated_at', 'decided_at'])
            ->each(function (DisputeCase $dispute) use ($items): void {
                $at = $dispute->decided_at ?? $dispute->updated_at ?? $dispute->created_at;
                if ($at === null) {
                    return;
                }
                $summary = mb_strimwidth((string) $dispute->reason, 0, 80, '…');
                $items->push([
                    'id' => 'dispute-'.$dispute->id,
                    'kind' => 'dispute',
                    'title' => "Dispute {$dispute->status}: {$summary}",
                    'at' => $at->toIso8601String(),
                    'href' => '/cases?case='.$dispute->id,
                ]);
            });

        ModerationReport::query()
            ->where('reporter_user_id', $target->id)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'category', 'status', 'created_at', 'decided_at'])
            ->each(function (ModerationReport $report) use ($items): void {
                $at = $report->decided_at ?? $report->created_at;
                if ($at === null) {
                    return;
                }
                $items->push([
                    'id' => 'report-'.$report->id,
                    'kind' => 'report',
                    'title' => "Safety report ({$report->category}) · {$report->status}",
                    'at' => $at->toIso8601String(),
                    'href' => '/reports?report='.$report->id,
                ]);
            });

        if ($provider !== null && $provider->reviewed_at !== null) {
            $decision = $provider->status === 'active' ? 'approved' : 'reviewed';
            $items->push([
                'id' => 'provider-review-'.$provider->id,
                'kind' => 'provider_review',
                'title' => "Provider profile {$decision} ({$provider->status})",
                'at' => $provider->reviewed_at->toIso8601String(),
                'href' => null,
            ]);
        }

        foreach ($recentJobs as $job) {
            $at = $job['updatedAt'] ?? $job['postedAt'] ?? null;
            if (! is_string($at) || $at === '') {
                continue;
            }
            $items->push([
                'id' => 'job-'.$job['id'].'-'.$job['role'],
                'kind' => 'job',
                'title' => "Job as {$job['role']}: {$job['title']} ({$job['status']})",
                'at' => $at,
                'href' => null,
            ]);
        }

        $lastActivity = is_numeric($target->getAttribute('last_activity_at'))
            ? Carbon::createFromTimestamp((int) $target->getAttribute('last_activity_at'))
            : null;
        if ($lastActivity !== null) {
            $items->push([
                'id' => 'session-'.$target->id,
                'kind' => 'session',
                'title' => 'Last signed-in activity',
                'at' => $lastActivity->toIso8601String(),
                'href' => null,
            ]);
        }

        return $items
            ->sortByDesc('at')
            ->unique('id')
            ->take(20)
            ->values()
            ->all();
    }
}
