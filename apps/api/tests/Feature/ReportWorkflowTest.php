<?php

namespace Tests\Feature;

use App\Models\ModerationReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_report_a_user_and_track_the_structured_decision(): void
    {
        $reporter = User::factory()->create();
        $subject = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);

        $id = $this->actingAs($reporter)->postJson('/api/v1/reports', [
            'targetType' => 'user', 'targetId' => (string) $subject->id,
            'category' => 'harassment', 'details' => 'This person repeatedly sent threatening messages.',
        ])->assertCreated()->assertJsonPath('data.status', 'open')->json('data.id');

        $this->actingAs($admin)->postJson("/api/v1/admin/marketplace/reports/$id/assign", [])->assertOk();
        $this->getJson("/api/v1/admin/marketplace/reports/$id?accessReason=Reviewing%20the%20reported%20safety%20concern")->assertOk();
        $this->postJson("/api/v1/admin/marketplace/reports/$id/decision", [
            'outcome' => 'account_restricted', 'reason' => 'The available records support a temporary account restriction.',
        ])->assertOk()->assertJsonPath('data.outcome', 'account_restricted');

        $this->actingAs($reporter)->getJson('/api/v1/reports')->assertOk()
            ->assertJsonPath('data.0.status', 'resolved')
            ->assertJsonPath('data.0.outcome', 'account_restricted');
        $this->assertDatabaseHas('users', ['id' => $subject->id, 'account_status' => 'restricted']);
        $this->assertDatabaseHas('moderation_report_access_audits', ['moderation_report_id' => $id, 'staff_user_id' => $admin->id]);
        $this->assertDatabaseHas('durable_notifications', ['user_id' => $reporter->id, 'type' => 'report.resolved']);
    }

    public function test_reports_enforce_target_rules_duplicates_and_reporter_privacy(): void
    {
        $reporter = User::factory()->create();
        $subject = User::factory()->create();
        $other = User::factory()->create();
        $payload = ['targetType' => 'user', 'targetId' => (string) $subject->id, 'category' => 'scam', 'details' => 'The profile requested payment outside the agreed workflow.'];
        $id = $this->actingAs($reporter)->postJson('/api/v1/reports', $payload)->assertCreated()->json('data.id');
        $this->postJson('/api/v1/reports', $payload)->assertConflict();
        $this->actingAs($other)->getJson("/api/v1/reports/$id")->assertNotFound();
        $this->actingAs($reporter)->postJson('/api/v1/reports', [...$payload, 'targetId' => (string) $reporter->id])->assertUnprocessable();
        $this->assertSame(1, ModerationReport::query()->count());
    }
}
