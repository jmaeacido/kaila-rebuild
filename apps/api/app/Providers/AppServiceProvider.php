<?php

namespace App\Providers;

use App\Contracts\MapsProvider;
use App\Contracts\MetricsRecorder;
use App\Contracts\OutboxTransport;
use App\Contracts\PushTransport;
use App\Models\User;
use App\Support\BrevoMailTransport;
use App\Support\DeterministicFakeMapsProvider;
use App\Support\FakePushTransport;
use App\Support\FcmPushTransport;
use App\Support\LogOutboxTransport;
use App\Support\OpenStreetMapProvider;
use App\Support\RedisRealtimeOutboxTransport;
use App\Support\StructuredLogMetricsRecorder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
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

        $mapsProvider = (string) config('maps.provider');
        if ($mapsProvider === 'fake' && $this->app->environment('production')) {
            throw new LogicException('The deterministic fake maps provider must not be used in production.');
        }
        $mapsImplementation = match ($mapsProvider) {
            'fake' => DeterministicFakeMapsProvider::class,
            'openstreetmap' => OpenStreetMapProvider::class,
            default => throw new LogicException('The configured maps provider is not supported.'),
        };
        $this->app->bind(MapsProvider::class, $mapsImplementation);
        $this->app->bind(MetricsRecorder::class, StructuredLogMetricsRecorder::class);
        $push = (string) config('services.fcm.transport', 'fake');
        if ($push === 'fake' && $this->app->environment('production')) {
            throw new LogicException('The fake push transport must not be used in production.');
        }
        $this->app->bind(PushTransport::class, $push === 'fcm' ? FcmPushTransport::class : FakePushTransport::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            $origin = $user->is_admin
                ? (string) config('app.admin_url')
                : (string) config('app.url');

            return $origin.'/reset-password?'.http_build_query([
                'token' => $token,
                'email' => $user->email,
            ]);
        });

        Mail::extend(
            'brevo',
            fn (array $config): BrevoMailTransport => new BrevoMailTransport((string) ($config['key'] ?? '')),
        );

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
