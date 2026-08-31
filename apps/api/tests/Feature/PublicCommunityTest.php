<?php

namespace Tests\Feature;

use App\Models\CommunityPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicCommunityTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_community_endpoints_expose_published_posts_without_authentication(): void
    {
        $author = User::factory()->create(['name' => 'Mia Santos']);
        $postId = $this->actingAs($author)->postJson('/api/v1/community', [
            'kind' => 'local_tip',
            'title' => 'Prepare before a repair visit',
            'body' => 'Take clear photos and note where the issue appears.',
        ])->assertCreated()->json('data.id');

        $this->getJson('/api/v1/public/community/'.$postId)
            ->assertOk()
            ->assertJsonPath('data.title', 'Prepare before a repair visit')
            ->assertJsonPath('data.author.name', 'Mia Santos')
            ->assertJsonMissingPath('data.author.id')
            ->assertJsonMissingPath('data.canManage');

        $this->getJson('/api/v1/public/community')
            ->assertOk()
            ->assertJsonPath('data.0.id', $postId)
            ->assertJsonPath('data.0.title', 'Prepare before a repair visit');

        $this->getJson('/api/v1/public/community/feed')
            ->assertOk()
            ->assertJsonPath('data.0.id', $postId);
    }

    public function test_deleted_or_unpublished_posts_stay_hidden_from_public_endpoints(): void
    {
        $author = User::factory()->create();
        $postId = $this->actingAs($author)->postJson('/api/v1/community', [
            'kind' => 'service_question',
            'title' => 'Need a plumber',
            'body' => 'Any recommendations nearby?',
        ])->assertCreated()->json('data.id');

        CommunityPost::query()->whereKey($postId)->update(['moderation_status' => 'deleted']);

        $this->getJson('/api/v1/public/community/'.$postId)->assertNotFound();
        $this->getJson('/api/v1/public/community/feed')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/public/community')->assertOk()->assertJsonCount(0, 'data');
    }
}
