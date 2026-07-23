<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class SocialAuthenticationController extends Controller
{
    private const PROVIDERS = ['google', 'facebook'];

    public function __construct(private readonly AuditRecorder $audit) {}

    public function redirect(Request $request, string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::PROVIDERS, true), 404);
        $settings = $this->settings($provider);
        abort_if($settings['client_id'] === '' || $settings['client_secret'] === '', 503, 'Social sign-in is not configured.');

        $state = Str::random(64);
        $request->session()->put("social_auth.$state", [
            'provider' => $provider,
            'next' => $this->safeDestination($request->query('next')),
            'provider_intent' => $request->boolean('providerIntent'),
            'created_at' => now()->timestamp,
        ]);

        $parameters = [
            'client_id' => $settings['client_id'],
            'redirect_uri' => $settings['redirect_uri'],
            'response_type' => 'code',
            'scope' => $provider === 'google' ? 'openid email profile' : 'email public_profile',
            'state' => $state,
        ];

        if ($provider === 'google') {
            $parameters['prompt'] = 'select_account';
        }

        return redirect()->away($settings['authorize_url'].'?'.http_build_query($parameters));
    }

    public function callback(Request $request, string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::PROVIDERS, true), 404);
        $state = $request->string('state')->toString();
        $pending = $state === '' ? null : $request->session()->pull("social_auth.$state");
        $fallback = $this->failureRedirect('/', 'Social sign-in expired. Please try again.');

        if (! is_array($pending)
            || ($pending['provider'] ?? null) !== $provider
            || (int) ($pending['created_at'] ?? 0) < now()->subMinutes(10)->timestamp) {
            return $fallback;
        }

        $destination = $this->safeDestination($pending['next'] ?? '/');
        if ($request->filled('error') || ! $request->filled('code')) {
            return $this->failureRedirect($destination, 'Social sign-in was cancelled.');
        }

        try {
            $profile = $this->profile($provider, $request->string('code')->toString());
            $user = DB::transaction(function () use ($profile, $provider, $pending): User {
                $subject = $provider.':'.$profile['id'];
                $user = User::query()->where('auth_subject', $subject)->lockForUpdate()->first();

                if (! $user) {
                    $user = User::query()->where('email', $profile['email'])->lockForUpdate()->first();
                }

                if ($user && $user->auth_subject !== null && $user->auth_subject !== $subject) {
                    throw new SocialAuthenticationException('That email is already connected to another sign-in provider.');
                }

                $values = [
                    'auth_provider' => $provider,
                    'auth_subject' => $subject,
                    'social_photo_url' => $profile['avatar'],
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ];

                if ($user) {
                    $user->forceFill($values)->save();

                    return $user;
                }

                return User::query()->create($values + [
                    'name' => $profile['name'],
                    'email' => $profile['email'],
                    'password' => Str::random(64),
                    'terms_accepted_version' => (string) config('policies.terms_version'),
                    'privacy_accepted_version' => (string) config('policies.privacy_version'),
                    'provider_intent' => (bool) ($pending['provider_intent'] ?? false),
                ]);
            });

            Auth::login($user);
            $request->session()->regenerate();
            $this->audit->record($request, 'auth.social_login_succeeded', $user, 'user', (string) $user->getKey());

            return redirect()->away($this->publicDestination($destination));
        } catch (Throwable $exception) {
            if (! $exception instanceof SocialAuthenticationException) {
                report($exception);
            }
            $this->audit->record($request, 'auth.social_login_failed');

            return $this->failureRedirect($destination, $exception instanceof SocialAuthenticationException
                ? $exception->getMessage()
                : 'Social sign-in is unavailable right now. Please try again.');
        }
    }

    /** @return array{id:string,name:string,email:string,avatar:?string} */
    private function profile(string $provider, string $code): array
    {
        $settings = $this->settings($provider);
        $tokenResponse = Http::asForm()->timeout(10)->post($settings['token_url'], [
            'client_id' => $settings['client_id'],
            'client_secret' => $settings['client_secret'],
            'redirect_uri' => $settings['redirect_uri'],
            'grant_type' => 'authorization_code',
            'code' => $code,
        ])->throw()->json();
        $accessToken = is_array($tokenResponse) ? ($tokenResponse['access_token'] ?? null) : null;

        throw_unless(is_string($accessToken) && $accessToken !== '', SocialAuthenticationException::class, 'The sign-in provider did not return an access token.');

        $response = $provider === 'google'
            ? Http::withToken($accessToken)->timeout(10)->get($settings['user_url'])->throw()->json()
            : Http::timeout(10)->get($settings['user_url'], [
                'fields' => 'id,name,email,picture.type(large)',
                'access_token' => $accessToken,
            ])->throw()->json();

        $email = is_array($response) ? ($response['email'] ?? null) : null;
        $verified = $provider === 'facebook' || (($response['email_verified'] ?? $response['verified_email'] ?? false) === true);
        throw_unless(is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL) && $verified, SocialAuthenticationException::class, 'Your provider must share a verified email address with KAILA.');
        $subject = $response['id'] ?? $response['sub'] ?? null;
        throw_unless(is_string($subject) && $subject !== '', SocialAuthenticationException::class, 'The sign-in provider did not return an account identifier.');

        $avatar = $provider === 'google'
            ? ($response['picture'] ?? null)
            : ($response['picture']['data']['url'] ?? null);

        return [
            'id' => $subject,
            'name' => trim((string) ($response['name'] ?? 'KAILA member')),
            'email' => Str::lower($email),
            'avatar' => is_string($avatar) ? $avatar : null,
        ];
    }

    /** @return array{client_id:string,client_secret:string,redirect_uri:string,authorize_url:string,token_url:string,user_url:string} */
    private function settings(string $provider): array
    {
        /** @var array<string, string|null> $settings */
        $settings = config("services.$provider");

        return [
            'client_id' => (string) ($settings['client_id'] ?? ''),
            'client_secret' => (string) ($settings['client_secret'] ?? ''),
            'redirect_uri' => (string) ($settings['redirect_uri'] ?? ''),
            'authorize_url' => (string) ($settings['authorize_url'] ?? ''),
            'token_url' => (string) ($settings['token_url'] ?? ''),
            'user_url' => (string) ($settings['user_url'] ?? ''),
        ];
    }

    private function safeDestination(mixed $destination): string
    {
        return is_string($destination) && str_starts_with($destination, '/') && ! str_starts_with($destination, '//')
            ? $destination
            : '/';
    }

    private function failureRedirect(string $destination, string $message): RedirectResponse
    {
        return redirect()->away($this->publicDestination('/login').'?'.http_build_query([
            'next' => $destination,
            'socialError' => $message,
        ]));
    }

    private function publicDestination(string $destination): string
    {
        return rtrim((string) config('services.kaila.public_url'), '/').$this->safeDestination($destination);
    }
}

class SocialAuthenticationException extends \RuntimeException {}
