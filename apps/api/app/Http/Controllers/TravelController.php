<?php

namespace App\Http\Controllers;

use App\Contracts\MapsProvider;
use App\Domain\Maps\GeoPoint;
use App\Models\ServiceJob;
use App\Models\TravelSession;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\NotificationService;
use App\Support\OutboxRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class TravelController extends Controller
{
    public function __construct(private readonly HiredJobAccess $access, private readonly MapsProvider $maps, private readonly OutboxRecorder $outbox, private readonly NotificationService $notifications) {}

    public function start(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $data = $request->validate(['consentConfirmed' => 'accepted', 'foreground' => 'accepted']);
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $p = $this->access->requireParticipant($serviceJob, $actor);
        abort_unless($actor->id === $p['providerId'], 404);
        abort_unless($serviceJob->status === 'provider_selected', 409);
        $session = DB::transaction(function () use ($serviceJob, $actor, $data, $p) {
            $job = ServiceJob::query()->lockForUpdate()->findOrFail($serviceJob->id);
            $active = TravelSession::query()->where('service_job_id', $job->id)->where('status', 'active')->first();
            if ($active) {
                return $active;
            }$session = TravelSession::query()->create(['id' => (string) Str::uuid(), 'service_job_id' => $job->id, 'provider_user_id' => $actor->id, 'consent_confirmed' => $data['consentConfirmed'], 'started_at' => now()]);
            $job->update(['status' => 'provider_traveling', 'version' => $job->version + 1]);
            $job->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $actor->id, 'event_type' => 'travel.started', 'job_version' => $job->version, 'metadata' => ['travelSessionId' => $session->id], 'occurred_at' => now()]);
            $this->outbox->record('travel.started', 'travel_session', $session->id, 1, ['rooms' => ["user:{$p['clientId']}", "user:{$p['providerId']}"], 'jobId' => $job->id]);
            $this->notifications->send($p['clientId'], 'travel.started', 'Provider is on the way', 'Live travel progress is now available.', 'service_job', $job->id, ['jobId' => $job->id]);

            return $session;
        });

        return response()->json(['data' => $this->present($session->refresh())]);
    }

    public function update(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $data = $request->validate(['latitude' => 'required|numeric|between:-90,90', 'longitude' => 'required|numeric|between:-180,180', 'accuracyMeters' => 'required|integer|min:1|max:200', 'capturedAt' => 'required|date', 'foreground' => 'accepted']);
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $p = $this->access->requireParticipant($serviceJob, $actor);
        abort_unless($actor->id === $p['providerId'], 404);
        abort_unless($serviceJob->status === 'provider_traveling', 409);
        $session = TravelSession::query()->where('service_job_id', $serviceJob->id)->where('status', 'active')->firstOrFail();
        $last = DB::table('location_samples')->where('travel_session_id', $session->id)->latest('captured_at')->first();
        abort_if($last && now()->parse($data['capturedAt'])->lessThanOrEqualTo(now()->parse($last->captured_at)), 409, 'Location updates must be ordered.');
        DB::table('location_samples')->insert(['travel_session_id' => $session->id, 'latitude' => $data['latitude'], 'longitude' => $data['longitude'], 'accuracy_meters' => $data['accuracyMeters'], 'captured_at' => $data['capturedAt']]);
        $routeAvailable = true;
        try {
            if ($serviceJob->latitude === null || $serviceJob->longitude === null) {
                throw new \RuntimeException('The destination is not pinned.');
            }
            $route = $this->maps->route(new GeoPoint((float) $data['latitude'], (float) $data['longitude']), new GeoPoint((float) $serviceJob->latitude, (float) $serviceJob->longitude));
            $distance = $route->distanceMeters;
            $eta = $route->durationSeconds;
        } catch (Throwable) {
            $routeAvailable = false;
            [$distance, $eta] = $this->fallbackMetrics(
                (float) $data['latitude'],
                (float) $data['longitude'],
                $serviceJob->latitude !== null ? (float) $serviceJob->latitude : null,
                $serviceJob->longitude !== null ? (float) $serviceJob->longitude : null,
            );
        }$arrived = $distance !== null && $distance <= 30;
        $newArrival = $arrived && $session->arrived_at === null;
        $session->update(['version' => $session->version + 1, 'last_distance_meters' => $distance, 'last_eta_seconds' => $eta, 'arrived_at' => $arrived ? ($session->arrived_at ?? now()) : $session->arrived_at]);
        DB::transaction(function () use ($arrived, $newArrival, $session, $p, $serviceJob, $routeAvailable): void {
            $this->outbox->record($arrived ? 'travel.arrival.changed' : 'travel.location.changed', 'travel_session', $session->id, $session->version, ['rooms' => ["user:{$p['clientId']}", "user:{$p['providerId']}"], 'jobId' => $serviceJob->id, 'routeAvailable' => $routeAvailable]);
            if ($newArrival) {
                $this->notifications->send($p['clientId'], 'travel.arrived', 'Provider has arrived', 'Your provider is at the job location.', 'service_job', $serviceJob->id, ['jobId' => $serviceJob->id]);
            }
        });

        return response()->json(['data' => $this->present($session->refresh())]);
    }

    public function show(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $participants = $this->access->requireParticipant($serviceJob, $actor);
        $session = TravelSession::query()->where('service_job_id', $serviceJob->id)->latest('started_at')->first();
        if (! $session) {
            return response()->json(['data' => [
                'status' => 'not_started',
                'canShareLocation' => $actor->id === $participants['providerId'],
                'distanceMeters' => null,
                'etaSeconds' => null,
                'arrivedAt' => null,
                'location' => null,
                'destination' => $serviceJob->latitude !== null && $serviceJob->longitude !== null
                    ? ['latitude' => (float) $serviceJob->latitude, 'longitude' => (float) $serviceJob->longitude]
                    : null,
                'routeGeometry' => null,
            ]]);
        }

        $sample = DB::table('location_samples')->where('travel_session_id', $session->id)->latest('captured_at')->first();
        $data = $this->present($session);
        $data['canShareLocation'] = $actor->id === $participants['providerId'];
        $data['location'] = $sample ? ['latitude' => (float) $sample->latitude, 'longitude' => (float) $sample->longitude, 'accuracyMeters' => $sample->accuracy_meters, 'capturedAt' => $sample->captured_at] : null;
        $data['destination'] = $serviceJob->latitude !== null && $serviceJob->longitude !== null
            ? ['latitude' => (float) $serviceJob->latitude, 'longitude' => (float) $serviceJob->longitude]
            : null;
        $data['routeGeometry'] = null;
        if ($sample && $data['destination']) {
            try {
                $route = $this->maps->route(
                    new GeoPoint((float) $sample->latitude, (float) $sample->longitude),
                    new GeoPoint($data['destination']['latitude'], $data['destination']['longitude']),
                );
                $data['routeGeometry'] = array_map(
                    fn (GeoPoint $point): array => ['latitude' => $point->latitude, 'longitude' => $point->longitude],
                    $route->geometry,
                );
            } catch (Throwable) {
                // Distance and ETA already degrade safely when routing is unavailable.
            }
        }

        return response()->json(['data' => $data]);
    }

    public function stop(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 401);
        $p = $this->access->requireParticipant($serviceJob, $actor);
        abort_unless($actor->id === $p['providerId'], 404);
        $session = TravelSession::query()->where('service_job_id', $serviceJob->id)->where('status', 'active')->firstOrFail();
        DB::transaction(function () use ($session, $p, $serviceJob, $actor) {
            $session->update(['status' => 'stopped', 'stopped_at' => now(), 'version' => $session->version + 1]);
            $job = ServiceJob::query()->lockForUpdate()->findOrFail($serviceJob->id);
            if ($job->status === 'provider_traveling') {
                $job->update(['status' => 'provider_selected', 'version' => $job->version + 1]);
                $job->timeline()->create(['id' => (string) Str::uuid(), 'actor_user_id' => $actor->id, 'event_type' => 'travel.stopped', 'job_version' => $job->version, 'metadata' => ['travelSessionId' => $session->id], 'occurred_at' => now()]);
            }$this->outbox->record('travel.stopped', 'travel_session', $session->id, $session->version, ['rooms' => ["user:{$p['clientId']}", "user:{$p['providerId']}"], 'jobId' => $serviceJob->id]);
        });

        return response()->json(['data' => $this->present($session->refresh())]);
    }

    /** @return array<string, mixed> */
    private function present(TravelSession $s): array
    {
        return ['id' => $s->id, 'status' => $s->status, 'version' => $s->version, 'startedAt' => $s->started_at->toIso8601String(), 'stoppedAt' => $s->stopped_at?->toIso8601String(), 'arrivedAt' => $s->arrived_at?->toIso8601String(), 'distanceMeters' => $s->last_distance_meters, 'etaSeconds' => $s->last_eta_seconds];
    }

    /** @return array{int|null, int|null} */
    private function fallbackMetrics(float $fromLatitude, float $fromLongitude, ?float $toLatitude, ?float $toLongitude): array
    {
        if ($toLatitude === null || $toLongitude === null) {
            return [null, null];
        }

        $earthRadiusMeters = 6371000;
        $latitudeDelta = deg2rad($toLatitude - $fromLatitude);
        $longitudeDelta = deg2rad($toLongitude - $fromLongitude);
        $a = sin($latitudeDelta / 2) ** 2
            + cos(deg2rad($fromLatitude)) * cos(deg2rad($toLatitude)) * sin($longitudeDelta / 2) ** 2;
        $distance = (int) round($earthRadiusMeters * 2 * atan2(sqrt($a), sqrt(1 - $a)));
        $etaSeconds = max(60, (int) ceil(($distance / 1000 / 22) * 3600));

        return [$distance, $etaSeconds];
    }
}
