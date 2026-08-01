<?php

namespace Tests\Unit;

use App\Models\DurableNotification;
use App\Models\PushDevice;
use App\Support\FcmAccessTokenProvider;
use App\Support\FcmDeliveryException;
use App\Support\FcmPushTransport;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class FcmPushTransportTest extends TestCase
{
    public function test_it_sends_audible_high_priority_notifications_to_the_expected_android_channel(): void
    {
        config()->set('services.fcm.project_id', 'kaila-test');
        Http::fake(['https://fcm.googleapis.com/*' => Http::response(['name' => 'projects/kaila-test/messages/1'])]);
        $tokens = Mockery::mock(FcmAccessTokenProvider::class);
        $tokens->shouldReceive('token')->once()->andReturn('oauth-token');

        $notification = new DurableNotification([
            'id' => 'notification-1', 'title' => 'New offer', 'body' => 'A provider sent an offer.',
            'resource_id' => 'job-1', 'data' => ['type' => 'offer', 'jobId' => 'job-1'],
        ]);
        $notification->id = 'notification-1';
        $device = new PushDevice(['token_encrypted' => 'device-token']);

        $this->assertSame('projects/kaila-test/messages/1', (new FcmPushTransport($tokens))->send($device, $notification));

        Http::assertSent(fn ($request) => $request['message']['android']['priority'] === 'high'
            && $request['message']['android']['notification']['channel_id'] === 'kaila_updates'
            && $request['message']['android']['notification']['sound'] === 'default'
            && $request['message']['data']['type'] === 'offer');
    }

    public function test_it_uses_call_and_silent_channels_when_required(): void
    {
        config()->set('services.fcm.project_id', 'kaila-test');
        Http::fake(['https://fcm.googleapis.com/*' => Http::response(['name' => 'message-id'])]);
        $tokens = Mockery::mock(FcmAccessTokenProvider::class);
        $tokens->shouldReceive('token')->twice()->andReturn('oauth-token');
        $transport = new FcmPushTransport($tokens);
        $device = new PushDevice(['token_encrypted' => 'device-token']);

        foreach ([
            ['type' => 'call'],
            ['type' => 'message', 'silent' => '1'],
        ] as $index => $data) {
            $notification = new DurableNotification(['title' => 'Title', 'body' => 'Body', 'resource_id' => 'resource', 'data' => $data]);
            $notification->id = "notification-{$index}";
            $transport->send($device, $notification);
        }

        Http::assertSentInOrder([
            fn ($request) => $request['message']['android']['notification']['channel_id'] === 'kaila_calls'
                && $request['message']['android']['notification']['sound'] === 'default',
            fn ($request) => $request['message']['android']['notification']['channel_id'] === 'kaila_silent'
                && ! isset($request['message']['android']['notification']['sound'])
                && $request['message']['android']['priority'] === 'normal',
        ]);
    }

    public function test_it_classifies_invalid_device_tokens_as_permanent_failures(): void
    {
        config()->set('services.fcm.project_id', 'kaila-test');
        Http::fake(['https://fcm.googleapis.com/*' => Http::response(['error' => ['details' => [['errorCode' => 'UNREGISTERED']]]], 404)]);
        $tokens = Mockery::mock(FcmAccessTokenProvider::class);
        $tokens->shouldReceive('token')->once()->andReturn('oauth-token');
        $notification = new DurableNotification(['title' => 'Title', 'body' => 'Body', 'resource_id' => 'resource', 'data' => []]);
        $notification->id = 'notification-1';

        try {
            (new FcmPushTransport($tokens))->send(new PushDevice(['token_encrypted' => 'expired-token']), $notification);
            $this->fail('Expected an FCM delivery exception.');
        } catch (FcmDeliveryException $exception) {
            $this->assertTrue($exception->invalidatesDevice());
            $this->assertSame('UNREGISTERED', $exception->errorCode);
        }
    }
}
