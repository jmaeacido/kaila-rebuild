<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SessionAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_only_list_own_sessions(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $this->createSession('own-session', $user);
        $this->createSession('other-session', $otherUser);

        $this->actingAs($user)
            ->getJson('/api/v1/me/sessions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', 'own-session');
    }

    public function test_forged_cross_user_session_id_cannot_be_revoked(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $this->createSession('other-session', $otherUser);

        $this->actingAs($user)
            ->deleteJson('/api/v1/me/sessions/other-session')
            ->assertNotFound()
            ->assertJsonPath('error.code', 'SESSION_NOT_FOUND');

        $this->assertDatabaseHas('sessions', [
            'id' => 'other-session',
            'user_id' => $otherUser->getKey(),
        ]);
    }

    public function test_user_can_revoke_own_session(): void
    {
        $user = User::factory()->create();
        $this->createSession('own-session', $user);

        $this->actingAs($user)
            ->deleteJson('/api/v1/me/sessions/own-session')
            ->assertOk()
            ->assertJsonPath('data.revoked', true);

        $this->assertDatabaseMissing('sessions', ['id' => 'own-session']);
        $this->assertDatabaseHas('audit_events', ['event_type' => 'auth.session_revoked']);
    }

    private function createSession(string $id, User $user): void
    {
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->getKey(),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'KAILA test client',
            'payload' => '{}',
            'last_activity' => now()->timestamp,
        ]);
    }
}
