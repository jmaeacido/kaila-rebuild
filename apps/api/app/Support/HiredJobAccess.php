<?php

namespace App\Support;

use App\Models\AcceptedOfferSnapshot;
use App\Models\ProviderProfile;
use App\Models\ServiceJob;
use App\Models\User;

class HiredJobAccess
{
    /** @return array{clientId:int,providerId:int,travelerId:int|null,serviceLocationMode:string,destinationLabel:?string,destinationLatitude:?float,destinationLongitude:?float} */
    public function participants(ServiceJob $job): array
    {
        $snapshot = AcceptedOfferSnapshot::query()->where('service_job_id', $job->id)->first();
        $providerProfileId = $snapshot?->provider_profile_id ?? $job->direct_provider_profile_id;
        abort_if($providerProfileId === null, 404);
        $provider = ProviderProfile::query()->findOrFail($providerProfileId);

        $mode = $snapshot?->service_location_mode ?? $job->service_location_mode ?? 'at_client';
        $destinationLabel = $snapshot?->destination_label ?? ($mode === 'at_client' ? $job->address_label : $provider->shop_address);
        $destinationLatitude = $snapshot?->destination_latitude ?? ($mode === 'at_client' ? $job->latitude : $provider->shop_latitude);
        $destinationLongitude = $snapshot?->destination_longitude ?? ($mode === 'at_client' ? $job->longitude : $provider->shop_longitude);

        return [
            'clientId' => $job->client_user_id,
            'providerId' => $provider->user_id,
            'travelerId' => match ($mode) {
                'at_provider' => $job->client_user_id,
                'remote' => null,
                default => $provider->user_id,
            },
            'serviceLocationMode' => $mode,
            'destinationLabel' => $destinationLabel,
            'destinationLatitude' => $destinationLatitude !== null ? (float) $destinationLatitude : null,
            'destinationLongitude' => $destinationLongitude !== null ? (float) $destinationLongitude : null,
        ];
    }

    /** @return array{clientId:int,providerId:int,travelerId:int|null,serviceLocationMode:string,destinationLabel:?string,destinationLatitude:?float,destinationLongitude:?float} */
    public function requireParticipant(ServiceJob $job, User $actor): array
    {
        $participants = $this->participants($job);
        if ($actor->id !== $participants['clientId'] && $actor->id !== $participants['providerId']) {
            abort(404);
        }

        return $participants;
    }

    /** @param array{clientId:int,providerId:int,travelerId:int|null,serviceLocationMode:string,destinationLabel:?string,destinationLatitude:?float,destinationLongitude:?float} $participants */
    public function blocked(array $participants): bool
    {
        return \DB::table('user_blocks')->where(fn ($q) => $q->where('blocker_user_id', $participants['clientId'])->where('blocked_user_id', $participants['providerId']))
            ->orWhere(fn ($q) => $q->where('blocker_user_id', $participants['providerId'])->where('blocked_user_id', $participants['clientId']))->exists();
    }
}
