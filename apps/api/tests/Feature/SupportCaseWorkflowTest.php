<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SupportCaseWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_and_staff_can_complete_a_support_conversation(): void
    {
        Queue::fake();
        $customer = User::factory()->create();
        $staff = User::factory()->create(['is_admin' => true]);

        $id = $this->actingAs($customer)->postJson('/api/v1/support/cases', [
            'category' => 'account',
            'subject' => 'I cannot update my contact details',
            'message' => 'The save button returns an error every time I try.',
        ])->assertCreated()->assertJsonPath('data.status', 'open')->json('data.id');

        $this->assertDatabaseHas('support_cases', ['id' => $id, 'customer_user_id' => $customer->id]);
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'support.case.created']);
        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $staff->id,
            'type' => 'support.case.created',
            'resource_type' => 'support_case',
        ]);

        $this->actingAs($staff)->getJson("/api/v1/admin/marketplace/support/cases/$id")
            ->assertOk()->assertJsonPath('data.messages.0.senderRole', 'customer');
        $this->postJson("/api/v1/admin/marketplace/support/cases/$id/messages", [
            'message' => 'Thanks for reporting this. Please retry after signing in again.',
        ])->assertOk()->assertJsonPath('data.status', 'waiting_for_customer');

        $this->actingAs($customer)->getJson("/api/v1/support/cases/$id")
            ->assertOk()->assertJsonCount(2, 'data.messages');
        $this->postJson("/api/v1/support/cases/$id/messages", ['message' => 'That fixed it. Thank you.'])
            ->assertOk()->assertJsonPath('data.status', 'waiting_for_support');
        $this->postJson("/api/v1/support/cases/$id/close")->assertOk()->assertJsonPath('data.status', 'closed');
        $this->postJson("/api/v1/support/cases/$id/reopen")->assertOk()->assertJsonPath('data.status', 'waiting_for_support');

        $this->assertDatabaseHas('durable_notifications', ['user_id' => $customer->id, 'type' => 'support.reply']);
    }

    public function test_customers_cannot_read_or_change_another_customers_case(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $id = $this->actingAs($owner)->postJson('/api/v1/support/cases', [
            'category' => 'technical', 'subject' => 'Messages are not loading',
            'message' => 'The conversation remains empty after I refresh the page.',
        ])->assertCreated()->json('data.id');

        $this->actingAs($other)->getJson("/api/v1/support/cases/$id")->assertNotFound();
        $this->postJson("/api/v1/support/cases/$id/messages", ['message' => 'Unauthorized reply'])->assertNotFound();
        $this->postJson("/api/v1/support/cases/$id/close")->assertNotFound();
    }

    public function test_support_input_is_validated_and_staff_routes_require_admin(): void
    {
        $customer = User::factory()->create();
        $this->actingAs($customer)->postJson('/api/v1/support/cases', [
            'category' => 'unknown', 'subject' => 'No', 'message' => 'short',
        ])->assertUnprocessable();
        $this->getJson('/api/v1/admin/marketplace/support/cases')->assertForbidden();
    }
}
