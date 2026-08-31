<?php

namespace Tests\Unit;

use App\Models\CommunityComment;
use App\Models\CommunityPost;
use App\Models\User;
use App\Support\CommunityEngagementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class CommunityEngagementServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_engaged_user_ids_include_author_reactors_and_commenters(): void
    {
        $author = User::factory()->create();
        $reactor = User::factory()->create();
        $commenter = User::factory()->create();
        $post = CommunityPost::query()->create([
            'id' => (string) Str::uuid(),
            'author_user_id' => $author->id,
            'author_display_mode' => 'member',
            'kind' => 'local_tip',
            'title' => 'Tip',
            'body' => 'Body',
            'hashtags' => [],
            'moderation_status' => 'published',
            'published_at' => now(),
        ]);
        DB::table('community_reactions')->insert([
            'community_post_id' => $post->id,
            'user_id' => $reactor->id,
            'reaction' => 'helpful',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        CommunityComment::query()->create([
            'id' => (string) Str::uuid(),
            'community_post_id' => $post->id,
            'author_user_id' => $commenter->id,
            'body' => 'Useful',
            'moderation_status' => 'published',
        ]);

        $ids = app(CommunityEngagementService::class)->engagedUserIds($post);

        $this->assertEqualsCanonicalizing([$author->id, $reactor->id, $commenter->id], $ids);
    }

    public function test_notification_recipients_exclude_actor_and_blocked_users(): void
    {
        $author = User::factory()->create();
        $commenter = User::factory()->create();
        $blocked = User::factory()->create();
        $post = CommunityPost::query()->create([
            'id' => (string) Str::uuid(),
            'author_user_id' => $author->id,
            'author_display_mode' => 'member',
            'kind' => 'local_tip',
            'title' => 'Tip',
            'body' => 'Body',
            'hashtags' => [],
            'moderation_status' => 'published',
            'published_at' => now(),
        ]);
        CommunityComment::query()->create([
            'id' => (string) Str::uuid(),
            'community_post_id' => $post->id,
            'author_user_id' => $commenter->id,
            'body' => 'Useful',
            'moderation_status' => 'published',
        ]);
        DB::table('user_blocks')->insert([
            'blocker_user_id' => $blocked->id,
            'blocked_user_id' => $author->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $recipients = app(CommunityEngagementService::class)->notificationRecipients($post, $commenter->id);

        $this->assertSame([$author->id], $recipients);
    }
}
