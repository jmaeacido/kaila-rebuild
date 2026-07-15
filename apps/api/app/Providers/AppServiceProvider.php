<?php

namespace App\Providers;

use App\Contracts\MapsProvider;
use App\Contracts\MetricsRecorder;
use App\Contracts\OutboxTransport;
use App\Support\DeterministicFakeMapsProvider;
use App\Support\LogOutboxTransport;
use App\Support\RedisRealtimeOutboxTransport;
use App\Support\StructuredLogMetricsRecorder;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use LogicException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $transport = (string) config('outbox.transport');
        if ($transport === 'log' && $this->app->environment('production')) {
            throw new LogicException('The local log outbox transport must not be used in production.');
        }

        $implementation = match ($transport) {
            'log' => LogOutboxTransport::class,
            'redis-realtime' => RedisRealtimeOutboxTransport::class,
            default => throw new LogicException('The configured outbox transport is not supported.'),
        };
        $this->app->bind(OutboxTransport::class, $implementation);

        if (config('maps.provider') !== 'fake') {
            throw new LogicException('The configured maps provider is not supported.');
        }
        if ($this->app->environment('production')) {
            throw new LogicException('The deterministic fake maps provider must not be used in production.');
        }
        $this->app->bind(MapsProvider::class, DeterministicFakeMapsProvider::class);
        $this->app->bind(MetricsRecorder::class, StructuredLogMetricsRecorder::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('registration', fn (Request $request) => [
            Limit::perMinute(5)->by($request->ip()),
        ]);

        RateLimiter::for('login', function (Request $request) {
            $email = Str::lower((string) $request->input('email'));

            return [
                Limit::perMinute(5)->by(hash('sha256', $email.'|'.$request->ip())),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });

        RateLimiter::for('password-recovery', function (Request $request) {
            $email = Str::lower((string) $request->input('email'));

            return [
                Limit::perMinute(5)->by(hash('sha256', $email.'|'.$request->ip())),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });
    }
}
