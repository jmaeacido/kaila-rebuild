<?php

namespace App\Jobs;

use App\Contracts\PushTransport;
use App\Models\DurableNotification;
use App\Models\PushDeliveryAttempt;
use App\Models\PushDevice;
use App\Support\FcmDeliveryException;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class DeliverPushNotification implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public function __construct(public readonly int $attemptId) {}

    /** @return list<int> */
    public function backoff(): array
    {
        return [10, 60, 300, 900];
    }

    public function handle(PushTransport $transport): void
    {
        $attempt = PushDeliveryAttempt::query()->findOrFail($this->attemptId);
        if ($attempt->status === 'delivered') {
            return;
        }$device = PushDevice::query()->findOrFail($attempt->push_device_id);
        $notification = DurableNotification::query()->findOrFail($attempt->notification_id);
        if ($device->revoked_at || $notification->cleared_at) {
            $attempt->update(['status' => 'cancelled']);

            return;
        }try {
            $message = $transport->send($device, $notification);
            $attempt->update(['status' => 'delivered', 'provider_message_id' => $message, 'delivered_at' => now(), 'last_error' => null]);
        } catch (FcmDeliveryException $exception) {
            if ($exception->invalidatesDevice()) {
                $device->update(['revoked_at' => now()]);
                $attempt->update(['status' => 'failed', 'last_error' => mb_substr($exception->getMessage(), 0, 500), 'next_attempt_at' => null]);

                return;
            }
            $this->retry($attempt, $exception);
            throw $exception;
        } catch (Throwable $exception) {
            $this->retry($attempt, $exception);
            throw $exception;
        }
    }

    private function retry(PushDeliveryAttempt $attempt, Throwable $exception): void
    {
        $attempt->update(['status' => 'retrying', 'last_error' => mb_substr($exception->getMessage(), 0, 500), 'next_attempt_at' => now()->addSeconds($this->backoff()[min($attempt->attempt, count($this->backoff()) - 1)])]);
    }

    public function failed(?Throwable $exception): void
    {
        PushDeliveryAttempt::query()->whereKey($this->attemptId)->update(['status' => 'failed', 'last_error' => mb_substr($exception?->getMessage() ?? 'Push delivery failed.', 0, 500)]);
    }
}
