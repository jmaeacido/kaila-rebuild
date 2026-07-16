<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ImportLegacyUsersTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_imports_legacy_users_from_the_sql_dump(): void
    {
        $dumpPath = dirname(__DIR__, 4).'/kaila_db.sql';
        $this->assertFileExists($dumpPath);

        $exitCode = Artisan::call('legacy:import-users', ['--source' => $dumpPath]);

        $this->assertSame(0, $exitCode);
        $this->assertDatabaseHas('users', ['legacy_id' => 'aa8d8d90-7e9a-4cb9-9c84-a0bad36a3327']);
        $this->assertSame('John Mark Agustin Acido', User::where('legacy_id', 'aa8d8d90-7e9a-4cb9-9c84-a0bad36a3327')->value('name'));
        $this->assertGreaterThan(5, User::query()->count());
    }
}
