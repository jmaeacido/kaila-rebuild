<?php

namespace Tests\Unit;

use App\Models\Area;
use App\Models\ClientProfile;
use App\Models\CommunityPost;
use App\Models\User;
use App\Support\CommunityFeedContextService;
use App\Support\CommunityPostVisibility;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CommunityFeedContextServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_feed_context_returns_home_area_trending_tags_and_new_providers(): void
    {
        $city = Area::query()->create(['name' => 'Adams', 'type' => 'municipality', 'code' => 'ADAMS']);
        $user = User::factory()->create();
        ClientProfile::query()->create(['user_id' => $user->id, 'display_name' => $user->name, 'area_id' => $city->id]);

        CommunityPost::query()->create([
            'id' => (string) Str::uuid(),
            'author_user_id' => $user->id,
            'author_display_mode' => 'member',
            'kind' => 'local_tip',
            'title' => 'Tip',
            'body' => 'Useful tip',
            'hashtags' => ['plumbing', 'plumbing', 'leakfix'],
            'area_id' => $city->id,
            'area_label' => 'Adams',
            'moderation_status' => 'published',
            'published_at' => now(),
        ]);

        CommunityPost::query()->create([
            'id' => (string) Str::uuid(),
            'author_user_id' => $user->id,
            'author_display_mode' => 'official',
            'kind' => 'official_update',
            'title' => 'Welcome Rico Santos Plumbing to KAILA',
            'body' => 'Welcome',
            'hashtags' => ['newprovider', 'welcometokaila'],
            'area_id' => $city->id,
            'area_label' => 'Adams',
            'moderation_status' => 'published',
            'published_at' => now(),
        ]);

        $service = new CommunityFeedContextService(new CommunityPostVisibility());
        $context = $service->forUser($user);

        $this->assertSame('Adams', $context['homeArea']['name']);
        $this->assertSame('plumbing', $context['trendingTags'][0]['tag']);
        $this->assertSame(2, $context['trendingTags'][0]['count']);
        $this->assertCount(1, $context['newProviders']);
        $this->assertSame('Welcome Rico Santos Plumbing to KAILA', $context['newProviders'][0]['title']);
    }
}
