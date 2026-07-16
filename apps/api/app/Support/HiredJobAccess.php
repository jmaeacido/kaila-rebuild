<?php

namespace App\Support;

use App\Models\AcceptedOfferSnapshot;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;
use App\Models\User;

class HiredJobAccess
{
    /** @return array{clientId:int,providerId:int} */
    public function participants(ServiceJob $job): array
    {
        $snapshot = AcceptedOfferSnapshot::query()->where('service_job_id', $job->id)->firstOrFail();
        $provider = ProviderProfile::query()->findOrFail($snapshot->provider_profile_id);

        return ['clientId' => $job->client_user_id, 'providerId' => $provider->user_id];
    }

    /** @return array{clientId:int,providerId:int} */
    public function requireParticipant(ServiceJob $job, User $actor): array
    {
        $participants = $this->participants($job);
        if ($actor->id !== $participants['clientId'] && $actor->id !== $participants['providerId']) {
            abort(404);
        }

        return $participants;
    }

    /** @param array{clientId:int,providerId:int} $participants */
    public function blocked(array $participants): bool
    {
        return \DB::table('user_blocks')->where(fn ($q) => $q->where('blocker_user_id', $participants['clientId'])->where('blocked_user_id', $participants['providerId']))
            ->orWhere(fn ($q) => $q->where('blocker_user_id', $participants['providerId'])->where('blocked_user_id', $participants['clientId']))->exists();
    }
}
