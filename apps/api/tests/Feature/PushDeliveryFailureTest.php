<?php

namespace Tests\Feature;

use App\Contracts\PushTransport;
use App\Jobs\DeliverPushNotification;
use App\Models\DurableNotification;
use App\Models\PushDeliveryAttempt;
use App\Models\PushDevice;
use App\Models\User;
use App\Support\FcmDeliveryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class PushDeliveryFailureTest extends TestCase
{
    use RefreshDatabase;

    public function test_permanently_invalid_fcm_token_is_revoked_without_retry(): void
    {
        $user = User::factory()->create();
        $device = PushDevice::query()->create(['user_id' => $user->id, 'platform' => 'android', 'token_hash' => hash('sha256', 'expired'), 'token_encrypted' => 'expired', 'last_seen_at' => now()]);
        $notification = DurableNotification::query()->create(['user_id' => $user->id, 'type' => 'job.updated', 'title' => 'Job updated', 'body' => 'Your job changed.', 'resource_type' => 'service_job', 'resource_id' => 'job-1', 'data' => []]);
        $attempt = PushDeliveryAttempt::query()->create(['notification_id' => $notification->id, 'push_device_id' => $device->id, 'attempt' => 1]);
        $transport = Mockery::mock(PushTransport::class);
        $transport->shouldReceive('send')->once()->andThrow(new FcmDeliveryException(404, 'UNREGISTERED'));

        (new DeliverPushNotification($attempt->id))->handle($transport);

        $this->assertNotNull($device->refresh()->revoked_at);
        $this->assertSame('failed', $attempt->refresh()->status);
        $this->assertNull($attempt->next_attempt_at);
    }
}
