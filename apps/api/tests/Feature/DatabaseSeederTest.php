<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_a_consumer_with_client_and_provider_profiles(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $administrator = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $consumer = User::query()->where('email', 'consumer@example.com')->firstOrFail();

        $this->assertTrue(Hash::check('password', $administrator->password));
        $this->assertTrue($administrator->is_admin);
        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
        $this->assertTrue(Hash::check('password', $consumer->password));
        $this->assertTrue($consumer->provider_intent);
        $this->assertSame('client', $consumer->active_mode);
        $this->assertDatabaseHas('client_profiles', ['user_id' => $consumer->id, 'display_name' => 'Development Consumer']);
        $this->assertDatabaseHas('provider_profiles', ['user_id' => $consumer->id, 'display_name' => 'Development Consumer', 'status' => 'active']);
        $this->assertDatabaseCount('client_profiles', 1);
        $this->assertDatabaseCount('provider_profiles', 1);
        $this->assertDatabaseCount('provider_services', 1);
        $this->assertDatabaseCount('provider_service_areas', 1);
    }
}
