<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(MarketplaceReferenceSeeder::class);

        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        User::query()->updateOrCreate(
            ['email' => 'test@example.com'],
            User::factory()->make([
                'name' => 'Development Administrator',
                'email' => 'test@example.com',
                'is_admin' => true,
            ])->getAttributes(),
        );
    }
}
