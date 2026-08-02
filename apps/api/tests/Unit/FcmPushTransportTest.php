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
            'type' => 'offer.created', 'resource_id' => 'job-1', 'data' => ['type' => 'offer', 'eventType' => 'offer.created', 'jobId' => 'job-1'],
        ]);
        $notification->id = 'notification-1';
        $device = new PushDevice(['token_encrypted' => 'device-token']);

        $this->assertSame('projects/kaila-test/messages/1', (new FcmPushTransport($tokens))->send($device, $notification));

        Http::assertSent(fn ($request) => $request['message']['android']['priority'] === 'high'
            && $request['message']['android']['notification']['channel_id'] === 'kaila_offers_v1'
            && $request['message']['android']['notification']['sound'] === 'kaila_offer'
            && $request['message']['data']['type'] === 'offer');
    }

    public function test_it_maps_match_hired_message_and_call_sounds(): void
    {
        config()->set('services.fcm.project_id', 'kaila-test');
        Http::fake(['https://fcm.googleapis.com/*' => Http::response(['name' => 'message-id'])]);
        $tokens = Mockery::mock(FcmAccessTokenProvider::class);
        $tokens->shouldReceive('token')->times(5)->andReturn('oauth-token');
        $transport = new FcmPushTransport($tokens);
        $device = new PushDevice(['token_encrypted' => 'device-token']);

        foreach ([
            ['type' => 'opportunity.matched', 'data' => ['type' => 'job', 'eventType' => 'opportunity.matched'], 'channel' => 'kaila_match_v1', 'sound' => 'kaila_job_match'],
            ['type' => 'offer.selected', 'data' => ['type' => 'offer', 'eventType' => 'offer.selected'], 'channel' => 'kaila_hired_v1', 'sound' => 'kaila_job_hired'],
            ['type' => 'message.created', 'data' => ['type' => 'message', 'eventType' => 'message.created'], 'channel' => 'kaila_messages_v1', 'sound' => 'kaila_message'],
            ['type' => 'offer.revised', 'data' => ['type' => 'offer', 'eventType' => 'offer.revised'], 'channel' => 'kaila_counters_v1', 'sound' => 'kaila_counter_offer'],
            ['type' => 'call.ringing', 'data' => ['type' => 'call', 'eventType' => 'call.ringing', 'callId' => 'call-1', 'action' => 'ring'], 'channel' => 'kaila_calls_v3', 'sound' => null],
        ] as $index => $case) {
            $notification = new DurableNotification([
                'title' => 'Title',
                'body' => 'Body',
                'type' => $case['type'],
                'resource_id' => 'resource',
                'data' => $case['data'],
            ]);
            $notification->id = "notification-{$index}";
            $transport->send($device, $notification);
        }

        Http::assertSentInOrder([
            fn ($request) => $request['message']['android']['notification']['channel_id'] === 'kaila_match_v1'
                && $request['message']['android']['notification']['sound'] === 'kaila_job_match',
            fn ($request) => $request['message']['android']['notification']['channel_id'] === 'kaila_hired_v1'
                && $request['message']['android']['notification']['sound'] === 'kaila_job_hired',
            fn ($request) => $request['message']['android']['notification']['channel_id'] === 'kaila_messages_v1'
                && $request['message']['android']['notification']['sound'] === 'kaila_message',
            fn ($request) => $request['message']['android']['notification']['channel_id'] === 'kaila_counters_v1'
                && $request['message']['android']['notification']['sound'] === 'kaila_counter_offer',
            fn ($request) => ! isset($request['message']['notification'])
                && $request['message']['data']['channelId'] === 'kaila_calls_v3'
                && $request['message']['data']['sound'] === 'kaila_call_ring',
        ]);
    }

    public function test_it_uses_call_data_primary_and_silent_channels_when_required(): void
    {
        config()->set('services.fcm.project_id', 'kaila-test');
        Http::fake(['https://fcm.googleapis.com/*' => Http::response(['name' => 'message-id'])]);
        $tokens = Mockery::mock(FcmAccessTokenProvider::class);
        $tokens->shouldReceive('token')->times(4)->andReturn('oauth-token');
        $transport = new FcmPushTransport($tokens);
        $device = new PushDevice(['token_encrypted' => 'device-token']);

        foreach ([
            ['type' => 'call', 'callId' => 'call-1', 'action' => 'ring', 'eventType' => 'call.ringing'],
            ['type' => 'call', 'callId' => 'call-1', 'action' => 'cancel', 'status' => 'active', 'eventType' => 'call.status.changed'],
            ['type' => 'call', 'callId' => 'call-1', 'action' => 'cancel', 'status' => 'ended', 'eventType' => 'call.status.changed'],
            ['type' => 'message', 'silent' => '1', 'eventType' => 'message.created'],
        ] as $index => $data) {
            $notification = new DurableNotification(['title' => 'Title', 'body' => 'Body', 'resource_id' => 'resource', 'data' => $data]);
            $notification->id = "notification-{$index}";
            $transport->send($device, $notification);
        }

        Http::assertSentInOrder([
            fn ($request) => ! isset($request['message']['notification'])
                && $request['message']['android']['priority'] === 'high'
                && $request['message']['android']['ttl'] === '60s'
                && $request['message']['data']['type'] === 'call'
                && $request['message']['data']['channelId'] === 'kaila_calls_v3'
                && $request['message']['data']['action'] === 'ring',
            fn ($request) => ! isset($request['message']['notification'])
                && $request['message']['data']['action'] === 'dismiss'
                && $request['message']['data']['status'] === 'active'
                && $request['message']['android']['ttl'] === '30s',
            fn ($request) => ! isset($request['message']['notification'])
                && $request['message']['data']['action'] === 'cancel'
                && $request['message']['android']['ttl'] === '30s',
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
