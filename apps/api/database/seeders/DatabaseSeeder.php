<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\ClientProfile;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

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

        $administrator = User::query()->where('email', 'admin@example.com')->first()
            ?? User::query()->where('email', 'test@example.com')->first()
            ?? new User;
        $administrator->fill(User::factory()->make([
            'name' => 'Development Administrator',
            'email' => 'admin@example.com',
            'is_admin' => true,
        ])->getAttributes())->save();

        DB::transaction(function (): void {
            $area = Area::query()->where('code', '1630400000')->firstOrFail();
            $service = ServiceCategory::query()->where('slug', 'general-handyman')->firstOrFail();

            $consumer = User::query()->updateOrCreate(
                ['email' => 'consumer@example.com'],
                User::factory()->make([
                    'name' => 'Development Consumer',
                    'email' => 'consumer@example.com',
                    'provider_intent' => true,
                    'active_mode' => 'client',
                    'is_admin' => false,
                ])->getAttributes(),
            );

            ClientProfile::query()->updateOrCreate(
                ['user_id' => $consumer->id],
                ['display_name' => $consumer->name, 'area_id' => $area->id],
            );

            $provider = ProviderProfile::query()->updateOrCreate(
                ['user_id' => $consumer->id],
                [
                    'display_name' => $consumer->name,
                    'bio' => 'Local development provider for testing KAILA marketplace workflows.',
                    'status' => 'active',
                    'years_experience' => 3,
                    'completed_jobs' => 0,
                    'response_minutes' => 10,
                ],
            );

            $provider->services()->syncWithoutDetaching([$service->id]);
            $provider->serviceAreas()->syncWithoutDetaching([$area->id]);
        });
    }
}
