<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppearancePreferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_appearance_defaults_to_system_and_can_be_updated(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.appearanceTheme', 'system');

        $this->actingAs($user)
            ->putJson('/api/v1/me/appearance', ['appearanceTheme' => 'dark'])
            ->assertOk()
            ->assertJsonPath('data.appearanceTheme', 'dark');

        $this->assertSame('dark', $user->fresh()->appearance_theme);

        $this->actingAs($user)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.appearanceTheme', 'dark');

        $this->actingAs($user)
            ->putJson('/api/v1/me/appearance', ['appearanceTheme' => 'light'])
            ->assertOk()
            ->assertJsonPath('data.appearanceTheme', 'light');
    }

    public function test_appearance_rejects_invalid_theme(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/me/appearance', ['appearanceTheme' => 'neon'])
            ->assertUnprocessable();
    }

    public function test_appearance_is_scoped_to_the_authenticated_user(): void
    {
        $user = User::factory()->create(['appearance_theme' => 'light']);
        $other = User::factory()->create(['appearance_theme' => 'dark']);

        $this->actingAs($user)
            ->putJson('/api/v1/me/appearance', ['appearanceTheme' => 'system'])
            ->assertOk()
            ->assertJsonPath('data.appearanceTheme', 'system');

        $this->assertSame('system', $user->fresh()->appearance_theme);
        $this->assertSame('dark', $other->fresh()->appearance_theme);
    }
}
