<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_recovery_request_is_generic_for_existing_and_missing_accounts(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $existing = $this->postJson('/api/v1/auth/password/forgot', ['email' => $user->email])->assertOk();
        $missing = $this->postJson('/api/v1/auth/password/forgot', ['email' => 'missing@example.test'])->assertOk();

        $this->assertSame($existing->json('data.message'), $missing->json('data.message'));
        Notification::assertSentTo($user, ResetPassword::class);
        $this->assertDatabaseCount('audit_events', 2);
    }

    public function test_valid_token_resets_password_once_and_revokes_all_sessions(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $token = $this->requestToken($user);
        $mobile = $this->mobileLogin($user);
        DB::table('sessions')->insert([
            'id' => 'browser-session',
            'user_id' => $user->getKey(),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
            'payload' => 'test',
            'last_activity' => now()->getTimestamp(),
        ]);

        $payload = [
            'email' => $user->email,
            'token' => $token,
            'password' => 'a-new-secure-password',
            'password_confirmation' => 'a-new-secure-password',
        ];
        $this->postJson('/api/v1/auth/password/reset', $payload)
            ->assertOk()->assertJsonPath('data.passwordReset', true);

        $this->assertTrue(Hash::check('a-new-secure-password', $user->fresh()->password));
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->getKey()]);
        $this->assertDatabaseHas('mobile_sessions', [
            'id' => $mobile['sessionId'],
            'revoke_reason' => 'password_reset',
        ]);
        $this->withToken($mobile['accessToken'])->getJson('/api/v1/auth/mobile/me')->assertUnauthorized();
        $this->postJson('/api/v1/auth/password/reset', $payload)
            ->assertUnprocessable()->assertJsonPath('error.code', 'PASSWORD_RESET_INVALID');
    }

    public function test_expired_reset_token_is_rejected(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $token = $this->requestToken($user);

        $this->travel(61)->minutes();

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'a-new-secure-password',
            'password_confirmation' => 'a-new-secure-password',
        ])->assertUnprocessable()->assertJsonPath('error.code', 'PASSWORD_RESET_INVALID');
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_recovery_requests_are_rate_limited(): void
    {
        Notification::fake();

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/auth/password/forgot', ['email' => 'limited@example.test'])->assertOk();
        }

        $this->postJson('/api/v1/auth/password/forgot', ['email' => 'limited@example.test'])->assertTooManyRequests();
    }

    private function requestToken(User $user): string
    {
        $token = '';
        $this->postJson('/api/v1/auth/password/forgot', ['email' => $user->email])->assertOk();
        Notification::assertSentTo(
            $user,
            ResetPassword::class,
            function (ResetPassword $notification) use (&$token): bool {
                $token = $notification->token;

                return true;
            },
        );

        return $token;
    }

    /** @return array{accessToken: string, refreshToken: string, tokenType: string, accessExpiresAt: string, refreshExpiresAt: string, sessionId: string} */
    private function mobileLogin(User $user): array
    {
        return $this->postJson('/api/v1/auth/mobile/login', [
            'email' => $user->email,
            'password' => 'password',
            'deviceName' => 'Recovery test device',
        ])->assertOk()->json('data.tokens');
    }
}
