<?php

namespace Tests\Feature;

use App\Contracts\MalwareScanner;
use App\Jobs\ScanCommunityPostMedia;
use App\Models\Area;
use App\Models\ClientProfile;
use App\Models\CommunityPost;
use App\Models\CommunityPostMedia;
use App\Models\User;
use App\Support\CommunityImageNormalizer;
use App\Support\CommunityMediaObjectKey;
use App\Support\MalwareScanResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
        $this->assertDatabaseHas('outbox_events', ['resource_id' => $conversation, 'event_type' => 'direct.conversation.requested']);
        $this->assertDatabaseHas('outbox_events', ['resource_id' => $conversation, 'event_type' => 'direct.conversation.accepted']);
        $this->assertDatabaseHas('outbox_events', ['resource_id' => $conversation, 'event_type' => 'direct.message.created']);
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
        $this->assertDatabaseHas('outbox_events', ['resource_id' => $post, 'event_type' => 'community.post.published']);
        $this->assertDatabaseHas('outbox_events', ['resource_id' => $post, 'event_type' => 'community.post.updated']);
    }

    public function test_community_posts_extract_hashtags_for_feed_filtering(): void
    {
        $author = User::factory()->create();
        $other = User::factory()->create();
        $taggedId = $this->actingAs($author)->postJson('/api/v1/community', [
            'kind' => 'local_tip',
            'title' => 'Leak prep',
            'body' => "Shut off the valve first.\n\n#Plumbing #LeakFix",
        ])->assertCreated()->assertJsonPath('data.hashtags', ['plumbing', 'leakfix'])->assertJsonPath('data.body', 'Shut off the valve first.')->json('data.id');

        $this->actingAs($author)->postJson('/api/v1/community', [
            'kind' => 'work_story',
            'title' => 'Cabinet install',
            'body' => 'Measured twice before drilling.',
        ])->assertCreated();

        $this->actingAs($other)->getJson('/api/v1/community?tag=plumbing')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $taggedId);
        $this->assertDatabaseHas('community_posts', ['id' => $taggedId, 'body' => 'Shut off the valve first.']);
    }

    public function test_community_feed_context_returns_local_discovery_sidebar_data(): void
    {
        $user = User::factory()->create();
        $city = Area::query()->create(['name' => 'Adams', 'type' => 'municipality', 'code' => 'CTX-ADAMS']);
        ClientProfile::query()->create(['user_id' => $user->id, 'display_name' => $user->name, 'area_id' => $city->id]);

        $welcomeId = (string) Str::uuid();
        CommunityPost::query()->create([
            'id' => $welcomeId,
            'author_user_id' => $user->id,
            'author_display_mode' => 'official',
            'kind' => 'official_update',
            'title' => 'Welcome Test Provider to KAILA',
            'body' => 'Welcome',
            'hashtags' => ['newprovider'],
            'area_id' => $city->id,
            'area_label' => 'Adams',
            'moderation_status' => 'published',
            'published_at' => now(),
        ]);

        $this->actingAs($user)->getJson('/api/v1/community/feed-context')
            ->assertOk()
            ->assertJsonPath('data.homeArea.name', 'Adams')
            ->assertJsonPath('data.newProviders.0.id', $welcomeId)
            ->assertJsonPath('data.trendingTags.0.tag', 'newprovider');
    }

    public function test_community_media_is_quarantined_scanned_and_stored_with_standard_names(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('WebP support is required.');
        }

        Storage::fake('private-assets');
        config(['filesystems.private_assets_disk' => 'private-assets']);
        Queue::fake();

        $user = User::factory()->create();
        $postId = $this->actingAs($user)->postJson('/api/v1/community', [
            'kind' => 'local_tip',
            'title' => 'Photo prep',
            'body' => 'Take a clear photo before opening the panel.',
        ])->assertCreated()->json('data.id');

        $upload = $this->actingAs($user)->postJson("/api/v1/community/$postId/media", [
            'file' => UploadedFile::fake()->image('vacation_photo.jfif', 1200, 800),
        ])->assertCreated()
            ->assertJsonPath('data.scanStatus', 'pending')
            ->assertJsonPath('data.url', null);

        $mediaId = $upload->json('data.id');
        $upload->assertJsonPath('data.originalName', CommunityMediaObjectKey::displayName($mediaId));

        $asset = CommunityPostMedia::query()->findOrFail($mediaId);
        $quarantineKey = CommunityMediaObjectKey::quarantine($postId, $mediaId);
        $this->assertSame($quarantineKey, $asset->object_key);
        $this->assertSame(CommunityMediaObjectKey::displayName($mediaId), $asset->original_name);
        Storage::disk('private-assets')->assertExists($quarantineKey);
        Queue::assertPushed(ScanCommunityPostMedia::class, fn (ScanCommunityPostMedia $job): bool => $job->assetId === $mediaId);

        (new ScanCommunityPostMedia($mediaId))->handle(new class implements MalwareScanner
        {
            public function scan($stream): MalwareScanResult
            {
                return MalwareScanResult::clean();
            }
        }, new CommunityImageNormalizer);

        $asset->refresh();
        $publishedKey = CommunityMediaObjectKey::published($postId, $mediaId);
        $this->assertSame('clean', $asset->scan_status);
        $this->assertSame('image/webp', $asset->mime_type);
        $this->assertSame($publishedKey, $asset->object_key);
        $this->assertSame(CommunityMediaObjectKey::displayName($mediaId), $asset->original_name);
        Storage::disk('private-assets')->assertMissing($quarantineKey);
        Storage::disk('private-assets')->assertExists($publishedKey);

        $this->actingAs($user)->getJson("/api/v1/community/$postId")
            ->assertOk()
            ->assertJsonPath('data.media.0.mimeType', 'image/webp')
            ->assertJsonPath('data.media.0.originalName', CommunityMediaObjectKey::displayName($mediaId));
    }

    public function test_community_changes_notify_post_owner_and_engaged_users(): void
    {
        $author = User::factory()->create(['name' => 'Post Author']);
        $engaged = User::factory()->create(['name' => 'Engaged Member']);
        $commenter = User::factory()->create(['name' => 'New Commenter']);
        $postId = $this->actingAs($author)->postJson('/api/v1/community', [
            'kind' => 'local_tip',
            'title' => 'Shared tip',
            'body' => 'Keep the valve closed before you start.',
        ])->assertCreated()->json('data.id');

        $this->actingAs($engaged)->postJson("/api/v1/community/$postId/comments", ['body' => 'Thanks for sharing.'])
            ->assertCreated();

        $this->actingAs($commenter)->postJson("/api/v1/community/$postId/comments", ['body' => 'This helped me too.'])
            ->assertCreated();

        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $author->id,
            'type' => 'community.comment.created',
            'resource_id' => $postId,
        ]);
        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $engaged->id,
            'type' => 'community.comment.created',
            'resource_id' => $postId,
        ]);
        $this->assertDatabaseMissing('durable_notifications', [
            'user_id' => $commenter->id,
            'type' => 'community.comment.created',
            'resource_id' => $postId,
        ]);

        $this->actingAs($commenter)->putJson("/api/v1/community/$postId/helpful")->assertOk();
        $this->assertDatabaseHas('durable_notifications', [
            'user_id' => $author->id,
            'type' => 'community.post.updated',
            'resource_id' => $postId,
        ]);

        $commentId = DB::table('community_comments')->where('author_user_id', $engaged->id)->value('id');
        $this->actingAs($engaged)->patchJson("/api/v1/community-comments/$commentId", ['body' => 'Updated thanks.'])
            ->assertOk();
        $this->assertDatabaseHas('outbox_events', [
            'resource_id' => $postId,
            'event_type' => 'community.comment.updated',
        ]);
    }

    public function test_community_feed_supports_comments_replies_reaction_toggle_author_delete_and_blocks(): void
    {
        $author = User::factory()->create(['name' => 'Helpful Provider']);
        $viewer = User::factory()->create(['name' => 'Local Client']);
        $postId = $this->actingAs($author)->postJson('/api/v1/community', [
            'kind' => 'work_story',
            'title' => 'A careful faucet repair',
            'body' => 'The shutoff valve was checked before the old fitting was replaced.',
        ])->assertCreated()->json('data.id');

        $commentId = $this->actingAs($viewer)->postJson("/api/v1/community/$postId/comments", ['body' => 'This explanation is useful.'])
            ->assertCreated()->json('data.id');
        $this->actingAs($author)->postJson("/api/v1/community/$postId/comments/$commentId/replies", ['body' => 'Glad it helped.'])->assertCreated();
        $this->getJson("/api/v1/community/$postId/comments")->assertOk()->assertJsonPath('data.0.replies.0.body', 'Glad it helped.');

        $this->actingAs($viewer)->patchJson("/api/v1/community-comments/$commentId", ['body' => 'Updated comment text.'])->assertOk()->assertJsonPath('data.body', 'Updated comment text.');
        $this->actingAs($author)->getJson("/api/v1/community/$postId/comments")->assertOk()
            ->assertJsonPath('data.0.canHide', true)
            ->assertJsonPath('data.0.canEdit', false);
        $this->actingAs($author)->deleteJson("/api/v1/community-comments/$commentId")->assertOk();
        $this->actingAs($author)->getJson("/api/v1/community/$postId/comments")->assertOk()->assertJsonCount(0, 'data');
        $this->assertDatabaseHas('community_comments', ['id' => $commentId, 'moderation_status' => 'hidden']);

        $this->actingAs($viewer)->putJson("/api/v1/community/$postId/helpful")->assertJsonPath('data.helpful', true);
        $this->deleteJson("/api/v1/community/$postId/helpful")->assertOk()->assertJsonPath('data.helpful', false);
        $this->assertDatabaseCount('community_reactions', 0);

        $this->actingAs($viewer)->postJson("/api/v1/community/$postId/block-author")->assertOk()->assertJsonPath('data.blocked', true);
        $this->actingAs($viewer)->getJson('/api/v1/community')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/community/$postId")->assertNotFound();

        $this->actingAs($author)->deleteJson("/api/v1/community/$postId")->assertOk();
        $this->assertDatabaseHas('community_posts', ['id' => $postId, 'moderation_status' => 'deleted']);
    }

    public function test_katabang_uses_ai_redacts_input_and_never_decides_price(): void
    {
        config(['services.katabang_ai.api_key' => 'test-key', 'services.katabang_ai.model' => 'openai/gpt-oss-120b']);
        Http::fake(['api.groq.com/*' => Http::response([
            'id' => 'resp_test',
            'choices' => [['message' => ['content' => json_encode([
                'intent' => 'offers',
                'answer' => 'Compare timing, reviews, scope, and price. The final choice is yours.',
                'action' => ['label' => 'View Jobs', 'href' => '/jobs'],
                'escalated' => false,
            ], JSON_THROW_ON_ERROR)]]],
        ])]);
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/v1/katabang', [
            'message' => 'Which offer and price should I choose?',
            'conversation' => [['role' => 'user', 'content' => 'I have two offers.']],
        ])
            ->assertOk()->assertJsonPath('data.intent', 'offers')->assertJsonPath('data.action.href', '/jobs');
        $row = DB::table('assistant_interactions')->first();
        $this->assertStringNotContainsString('offer', (string) $row->input_redacted);
        $this->assertSame('groq-chat-completions', json_decode((string) $row->response_metadata, true, 512, JSON_THROW_ON_ERROR)['engine']);
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer test-key')
            && $request['messages'][1]['content'] === 'I have two offers.'
            && $request['response_format']['json_schema']['strict'] === true
            && str_contains((string) $request['messages'][0]['content'], 'match the user\'s language exactly')
            && str_contains((string) $request['messages'][0]['content'], 'Never default to Filipino'));
    }

    public function test_katabang_prompt_requires_matching_latest_user_language(): void
    {
        config(['services.katabang_ai.api_key' => 'test-key']);
        Http::fake(['api.groq.com/*' => Http::response([
            'id' => 'resp_lang',
            'choices' => [['message' => ['content' => json_encode([
                'intent' => 'account',
                'answer' => 'Open Account Settings, find Delete Account, and follow the confirmation steps.',
                'action' => ['label' => 'Account Settings', 'href' => '/account'],
                'escalated' => false,
            ], JSON_THROW_ON_ERROR)]]],
        ])]);
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/v1/katabang', [
            'message' => 'How to delete account?',
            'conversation' => [
                ['role' => 'user', 'content' => 'Paano maghanap ng trabaho?'],
                ['role' => 'assistant', 'content' => 'Pumunta sa Nearby jobs.'],
            ],
        ])->assertOk();
        Http::assertSent(function ($request) {
            $system = (string) $request['messages'][0]['content'];
            $latest = $request['messages'][array_key_last($request['messages'])]['content'] ?? null;

            return $latest === 'How to delete account?'
                && str_contains($system, 'Follow the latest user message even if earlier turns used a different language')
                && str_contains($system, 'English latest message → English only');
        });
    }

    public function test_katabang_fails_closed_when_ai_is_not_configured(): void
    {
        config(['services.katabang_ai.api_key' => null]);
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/v1/katabang', ['message' => 'Help me post a job'])
            ->assertServiceUnavailable();
        Http::assertNothingSent();
        $this->assertDatabaseCount('assistant_interactions', 0);
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

    public function test_analytics_counts_jobs_that_advanced_to_rated_closed_as_completed(): void
    {
        config(['phase_nine.analytics_minimum_cohort' => 1]);
        $admin = User::factory()->create(['is_admin' => true]);
        $categoryId = DB::table('service_categories')->insertGetId(['name' => 'Analytics service', 'slug' => 'analytics-service', 'icon' => 'wrench', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $areaId = DB::table('areas')->insertGetId(['name' => 'Analytics area', 'code' => 'ANALYTICS', 'type' => 'city', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('service_jobs')->insert([
            ['id' => (string) Str::uuid(), 'client_user_id' => $admin->id, 'service_category_id' => $categoryId, 'area_id' => $areaId, 'status' => 'rated_closed', 'title' => 'Finished', 'description' => 'Finished and rated', 'schedule_type' => 'asap', 'completed_at' => now(), 'created_at' => now(), 'updated_at' => now()],
            ['id' => (string) Str::uuid(), 'client_user_id' => $admin->id, 'service_category_id' => $categoryId, 'area_id' => $areaId, 'status' => 'cancelled', 'title' => 'Cancelled', 'description' => 'Never completed', 'schedule_type' => 'asap', 'completed_at' => null, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->actingAs($admin)->getJson('/api/v1/admin/marketplace/analytics')
            ->assertOk()
            ->assertJsonPath('data.marketplace.completedJobs', 1);
    }
}
