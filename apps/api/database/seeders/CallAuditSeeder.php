<?php

namespace Database\Seeders;

use App\Models\AcceptedOfferSnapshot;
use App\Models\Area;
use App\Models\CallSession;
use App\Models\ClientProfile;
use App\Models\ConversationMessage;
use App\Models\JobConversation;
use App\Models\OfferRevision;
use App\Models\OfferThread;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\ServiceJob;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CallAuditSeeder extends Seeder
{
    private const JOB_TITLE = '[Call audit] Repair leaking kitchen tap';

    public function run(): void
    {
        if (! app()->environment('local')) {
            $this->command?->warn('CallAuditSeeder only runs in the local environment.');

            return;
        }

        $job = DB::transaction(function (): ServiceJob {
            $client = User::query()->where('email', 'consumer@example.com')->firstOrFail();
            $areaId = ClientProfile::query()->where('user_id', $client->id)->value('area_id');
            $area = Area::query()->findOrFail($areaId);
            $category = ServiceCategory::query()->where('slug', 'plumbing')->first()
                ?? ServiceCategory::query()->where('slug', 'general-handyman')->firstOrFail();

            ServiceJob::query()
                ->where('client_user_id', $client->id)
                ->where('title', self::JOB_TITLE)
                ->delete();

            $providerUser = User::query()->updateOrCreate(
                ['email' => 'call.provider@example.test'],
                [
                    'name' => 'Mariel Santos',
                    'password' => Hash::make('password'),
                    'terms_accepted_version' => config('policies.terms_version'),
                    'privacy_accepted_version' => config('policies.privacy_version'),
                    'provider_intent' => true,
                    'active_mode' => 'provider',
                    'is_admin' => false,
                ],
            );
            $provider = ProviderProfile::query()->updateOrCreate(
                ['user_id' => $providerUser->id],
                [
                    'display_name' => 'Mariel Santos',
                    'bio' => 'Local plumbing provider created for call interface auditing.',
                    'status' => 'active',
                    'years_experience' => 6,
                    'completed_jobs' => 48,
                    'rating' => 4.92,
                    'response_minutes' => 6,
                ],
            );
            $provider->services()->syncWithoutDetaching([$category->id]);
            $provider->serviceAreas()->syncWithoutDetaching([$area->id]);

            $job = ServiceJob::query()->create([
                'id' => (string) Str::uuid(),
                'client_user_id' => $client->id,
                'service_category_id' => $category->id,
                'area_id' => $area->id,
                'status' => 'provider_selected',
                'title' => self::JOB_TITLE,
                'description' => 'The kitchen tap leaks continuously near the handle and needs diagnosis and repair.',
                'schedule_type' => 'asap',
                'service_location_mode' => 'at_client',
                'budget_min_centavos' => 70000,
                'budget_max_centavos' => 120000,
                'latitude' => 8.8275,
                'longitude' => 125.1086,
                'address_label' => 'Near the Gingoog City public market',
                'version' => 3,
                'posted_at' => now()->subHours(3),
            ]);
            $thread = OfferThread::query()->create([
                'id' => (string) Str::uuid(),
                'service_job_id' => $job->id,
                'provider_profile_id' => $provider->id,
                'status' => 'accepted',
                'latest_revision_number' => 1,
            ]);
            $revision = OfferRevision::query()->create([
                'id' => (string) Str::uuid(),
                'offer_thread_id' => $thread->id,
                'revision_number' => 1,
                'proposed_by_user_id' => $providerUser->id,
                'amount_centavos' => 90000,
                'availability_text' => 'Today between 2:00 PM and 3:00 PM',
                'estimated_duration_text' => 'About 60 to 90 minutes',
                'scope' => 'Diagnosis, labor, and a standard replacement washer are included.',
                'message' => 'I can inspect the tap today and bring common replacement parts.',
            ]);
            AcceptedOfferSnapshot::query()->create([
                'id' => (string) Str::uuid(),
                'service_job_id' => $job->id,
                'offer_thread_id' => $thread->id,
                'offer_revision_id' => $revision->id,
                'provider_profile_id' => $provider->id,
                'service_location_mode' => 'at_client',
                'destination_label' => $job->address_label,
                'destination_latitude' => $job->latitude,
                'destination_longitude' => $job->longitude,
                'amount_centavos' => $revision->amount_centavos,
                'availability_text' => $revision->availability_text,
                'estimated_duration_text' => $revision->estimated_duration_text,
                'scope' => $revision->scope,
                'message' => $revision->message,
                'accepted_at' => now()->subHours(2),
            ]);

            $conversation = JobConversation::query()->create([
                'id' => (string) Str::uuid(),
                'service_job_id' => $job->id,
                'version' => 5,
            ]);
            $messages = [
                [$providerUser->id, 'Hi! I reviewed the tap details. Is the leak coming from the handle or the spout?', now()->subMinutes(52)],
                [$client->id, 'It is coming from the handle, even when the tap is fully closed.', now()->subMinutes(49)],
                [$providerUser->id, 'Thanks. I’ll bring replacement washers and a cartridge. May I call to confirm the tap model?', now()->subMinutes(45)],
                [$client->id, 'Yes, an audio or video call is fine.', now()->subMinutes(43)],
                [$providerUser->id, 'Great. I’m available now and will keep the call brief.', now()->subMinutes(41)],
            ];
            foreach ($messages as $index => [$senderId, $body, $createdAt]) {
                ConversationMessage::query()->create([
                    'id' => (string) Str::uuid(),
                    'conversation_id' => $conversation->id,
                    'sender_user_id' => $senderId,
                    'sequence' => $index + 1,
                    'body_ciphertext' => Crypt::encryptString($body),
                    'encryption_key_version' => (int) config('app.message_key_version', 1),
                    'client_command_id' => "call-audit-message-{$index}",
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }

            CallSession::query()->create([
                'id' => (string) Str::uuid(),
                'context_type' => 'job',
                'context_id' => $job->id,
                'caller_user_id' => $providerUser->id,
                'callee_user_id' => $client->id,
                'media' => 'audio',
                'status' => 'ended',
                'answered_at' => now()->subMinutes(37),
                'ended_at' => now()->subMinutes(34),
                'ended_reason' => 'completed',
                'created_at' => now()->subMinutes(38),
                'updated_at' => now()->subMinutes(34),
            ]);
            CallSession::query()->create([
                'id' => (string) Str::uuid(),
                'context_type' => 'job',
                'context_id' => $job->id,
                'caller_user_id' => $client->id,
                'callee_user_id' => $providerUser->id,
                'media' => 'video',
                'status' => 'declined',
                'ended_at' => now()->subMinutes(28),
                'ended_reason' => 'declined',
                'created_at' => now()->subMinutes(29),
                'updated_at' => now()->subMinutes(28),
            ]);

            return $job;
        });

        $this->command?->info("Call audit job ready: {$job->id}");
    }
}
