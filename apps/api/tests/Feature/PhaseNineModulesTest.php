<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PhaseNineModulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_direct_messages_require_recipient_consent_and_are_private_encrypted_and_idempotent(): void
    {
        $sender = User::factory()->create(['name' => 'Sender']);
        $recipient = User::factory()->create(['name' => 'Recipient']);
        $outsider = User::factory()->create();
        $conversation = $this->actingAs($sender)->postJson('/api/v1/direct-conversations', ['recipientUserId' => $recipient->id])
            ->assertCreated()->assertJsonPath('data.status', 'pending')->json('data.id');
        $this->postJson("/api/v1/direct-conversations/$conversation/messages", ['body' => 'hello', 'commandId' => 'one'])->assertConflict();
        $this->actingAs($outsider)->getJson("/api/v1/direct-conversations/$conversation")->assertNotFound();
        $this->actingAs($recipient)->postJson("/api/v1/direct-conversations/$conversation/accept")->assertOk()->assertJsonPath('data.status', 'accepted');
        $payload = ['body' => 'hello', 'commandId' => 'one'];
        $this->actingAs($sender)->postJson("/api/v1/direct-conversations/$conversation/messages", $payload)->assertCreated()->assertJsonPath('data.sequence', 1);
        $this->postJson("/api/v1/direct-conversations/$conversation/messages", $payload)->assertCreated()->assertJsonPath('data.sequence', 1);
        $this->actingAs($recipient)->getJson("/api/v1/direct-conversations/$conversation")->assertOk()->assertJsonPath('data.messages.0.body', 'hello');
        $this->assertDatabaseCount('direct_messages', 1);
        $this->assertDatabaseMissing('direct_messages', ['body_ciphertext' => 'hello']);
    }

    public function test_blocked_users_cannot_open_direct_conversations(): void
    {
        $one = User::factory()->create();
        $two = User::factory()->create();
        DB::table('user_blocks')->insert(['blocker_user_id' => $two->id, 'blocked_user_id' => $one->id, 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs($one)->postJson('/api/v1/direct-conversations', ['recipientUserId' => $two->id])->assertConflict();
    }

    public function test_community_posts_are_public_only_after_publication_and_reactions_are_unique(): void
    {
        $user = User::factory()->create();
        $post = $this->actingAs($user)->postJson('/api/v1/community', ['kind' => 'local_tip', 'title' => 'Prepare before a repair', 'body' => 'Take clear photos and describe where the issue appears.', 'areaLabel' => 'Davao City'])->assertCreated()->json('data.id');
        $this->getJson('/api/v1/community')->assertOk()->assertJsonPath('data.0.title', 'Prepare before a repair');
        $this->actingAs($user)->putJson("/api/v1/community/$post/helpful")->assertOk();
        $this->putJson("/api/v1/community/$post/helpful")->assertOk();
        $this->assertDatabaseCount('community_reactions', 1);
    }

    public function test_katabang_is_deterministic_redacts_input_and_never_decides_price(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/v1/katabang', ['message' => 'Which offer and price should I choose?'])
            ->assertOk()->assertJsonPath('data.intent', 'offers')->assertJsonPath('data.action.href', '/jobs');
        $row = DB::table('assistant_interactions')->first();
        $this->assertStringNotContainsString('offer', (string) $row->input_redacted);
        $this->assertSame('deterministic-v1', json_decode((string) $row->response_metadata, true, 512, JSON_THROW_ON_ERROR)['engine']);
    }

    public function test_calls_fail_closed_without_turn_and_admin_analytics_suppresses_small_cohorts(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/v1/calls', ['contextType' => 'direct', 'contextId' => fake()->uuid(), 'media' => 'audio'])->assertServiceUnavailable();
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->getJson('/api/v1/admin/marketplace/analytics')->assertOk()->assertJsonPath('data.privacy.suppressed', true)->assertJsonPath('data.marketplace', null);
        $this->getJson('/api/v1/admin/marketplace/operations-validation')->assertOk()->assertJsonPath('data.checks.phaseNineSchema', true);
        $this->actingAs($user)->getJson('/api/v1/admin/marketplace/analytics')->assertForbidden();
    }
}
