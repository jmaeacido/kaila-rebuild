<?php

namespace Tests\Feature;

use App\Jobs\ScanModerationReportEvidence;
use App\Models\ModerationReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
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

    public function test_user_can_submit_a_general_safety_concern_without_an_item_id(): void
    {
        $reporter = User::factory()->create();

        $this->actingAs($reporter)->postJson('/api/v1/reports', [
            'category' => 'unsafe',
            'details' => 'I need help identifying repeated unsafe conduct in the app.',
        ])->assertCreated()
            ->assertJsonPath('data.targetType', null)
            ->assertJsonPath('data.targetId', null);

        $this->assertDatabaseHas('moderation_reports', [
            'reporter_user_id' => $reporter->id,
            'target_type' => null,
            'target_id' => null,
        ]);
    }

    public function test_user_can_attach_private_scanned_evidence_to_a_report(): void
    {
        Storage::fake((string) config('filesystems.private_assets_disk'));
        Queue::fake();
        $reporter = User::factory()->create();

        $response = $this->actingAs($reporter)->post('/api/v1/reports', [
            'category' => 'unsafe',
            'details' => 'This screenshot and photo show the unsafe behavior clearly.',
            'evidence' => [
                UploadedFile::fake()->image('screenshot.jpg'),
                UploadedFile::fake()->create('conversation.pdf', 200, 'application/pdf'),
            ],
        ])->assertCreated()->assertJsonCount(2, 'data.evidence');

        $reportId = $response->json('data.id');
        $this->assertDatabaseCount('moderation_report_evidence', 2);
        $this->assertDatabaseHas('moderation_report_evidence', [
            'moderation_report_id' => $reportId,
            'submitted_by_user_id' => $reporter->id,
            'scan_status' => 'pending',
        ]);
        Queue::assertPushed(ScanModerationReportEvidence::class, 2);
    }
}
