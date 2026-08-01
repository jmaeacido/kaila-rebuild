<?php

namespace App\Support;

use App\Models\AccountDeletionRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AccountDeletionService
{
    /** @return list<array{code: string, title: string, message: string, href: string}> */
    public function blockers(User $user): array
    {
        $blockers = [];
        $activeJobs = DB::table('service_jobs')
            ->leftJoin('accepted_offer_snapshots', 'accepted_offer_snapshots.service_job_id', '=', 'service_jobs.id')
            ->leftJoin('provider_profiles', 'provider_profiles.id', '=', 'accepted_offer_snapshots.provider_profile_id')
            ->where(fn ($query) => $query->where('service_jobs.client_user_id', $user->id)->orWhere('provider_profiles.user_id', $user->id))
            ->whereNotIn('service_jobs.status', ['draft', 'cancelled', 'completed', 'rated'])
            ->count();
        if ($activeJobs > 0) {
            $blockers[] = ['code' => 'ACTIVE_JOBS', 'title' => 'Finish active work', 'message' => "$activeJobs active job(s) still need attention.", 'href' => '/jobs'];
        }

        $openDisputes = DB::table('dispute_cases')
            ->join('service_jobs', 'service_jobs.id', '=', 'dispute_cases.service_job_id')
            ->leftJoin('accepted_offer_snapshots', 'accepted_offer_snapshots.service_job_id', '=', 'service_jobs.id')
            ->leftJoin('provider_profiles', 'provider_profiles.id', '=', 'accepted_offer_snapshots.provider_profile_id')
            ->where(fn ($query) => $query->where('service_jobs.client_user_id', $user->id)->orWhere('provider_profiles.user_id', $user->id))
            ->whereNotIn('dispute_cases.status', ['resolved', 'closed', 'cancelled'])
            ->count();
        if ($openDisputes > 0) {
            $blockers[] = ['code' => 'OPEN_DISPUTES', 'title' => 'Resolve your dispute', 'message' => "$openDisputes dispute(s) are still under review.", 'href' => '/support'];
        }

        $openReports = DB::table('moderation_reports')
            ->where(fn ($query) => $query->where('reporter_user_id', $user->id)->orWhere(fn ($target) => $target->where('target_type', 'user')->where('target_id', (string) $user->id)))
            ->whereNotIn('status', ['resolved', 'dismissed', 'closed'])
            ->count();
        if ($openReports > 0) {
            $blockers[] = ['code' => 'OPEN_SAFETY_CASES', 'title' => 'Safety review in progress', 'message' => "$openReports safety case(s) must be completed first.", 'href' => '/safety'];
        }

        return $blockers;
    }

    /** @return array{recordId: string, deletedAt: string} */
    public function delete(User $user): array
    {
        $assets = DB::table('profile_assets')->where('user_id', $user->id)->get(['disk', 'object_key']);
        $draftAssets = DB::table('job_assets')->join('service_jobs', 'service_jobs.id', '=', 'job_assets.service_job_id')->where('service_jobs.client_user_id', $user->id)->where('service_jobs.status', 'draft')->get(['job_assets.disk', 'job_assets.object_key']);
        $recordId = (string) Str::uuid();
        $deletedAt = now();

        DB::transaction(function () use ($user, $recordId, $deletedAt): void {
            $locked = User::query()->lockForUpdate()->findOrFail($user->id);
            abort_if($locked->deleted_at !== null, 410, 'This account has already been deleted.');
            abort_if($this->blockers($locked) !== [], 409, 'Account deletion is currently blocked.');

            AccountDeletionRecord::query()->create([
                'id' => $recordId,
                'user_id' => $locked->id,
                'outcome' => 'completed',
                'blockers' => [],
                'identity_hash' => hash_hmac('sha256', Str::lower($locked->email), (string) config('app.key')),
                'completed_at' => $deletedAt,
            ]);

            DB::table('provider_credentials')->whereIn('asset_id', DB::table('profile_assets')->where('user_id', $locked->id)->select('id'))->delete();
            DB::table('profile_assets')->where('user_id', $locked->id)->delete();
            DB::table('service_jobs')->where('client_user_id', $locked->id)->where('status', 'draft')->delete();
            DB::table('client_profiles')->where('user_id', $locked->id)->update(['display_name' => 'Deleted KAILA member', 'area_id' => null, 'updated_at' => $deletedAt]);
            DB::table('provider_profiles')->where('user_id', $locked->id)->update(['display_name' => 'Deleted KAILA member', 'bio' => '', 'status' => 'suspended', 'updated_at' => $deletedAt]);
            DB::table('push_devices')->where('user_id', $locked->id)->delete();
            DB::table('durable_notifications')->where('user_id', $locked->id)->delete();
            DB::table('notification_preferences')->where('user_id', $locked->id)->delete();
            DB::table('sessions')->where('user_id', $locked->id)->delete();
            DB::table('mobile_sessions')->where('user_id', $locked->id)->update(['revoked_at' => $deletedAt, 'revoke_reason' => 'account_deleted', 'updated_at' => $deletedAt]);
            DB::table('password_reset_tokens')->where('email', $locked->email)->delete();

            $locked->forceFill([
                'name' => 'Deleted KAILA member',
                'email' => "deleted+$recordId@deleted.kaila.invalid",
                'password' => Str::random(80),
                'remember_token' => null,
                'username' => null,
                'contact_number' => null,
                'messenger_link' => null,
                'preferred_contact_channel' => null,
                'best_contact_time' => null,
                'area' => null,
                'category' => null,
                'auth_provider' => null,
                'auth_subject' => null,
                'social_photo_url' => null,
                'active_mode' => 'client',
                'provider_intent' => false,
                'account_status' => 'deleted',
                'status_updated_at' => $deletedAt,
                'deleted_at' => $deletedAt,
            ])->save();
        });

        $assets->concat($draftAssets)->each(fn ($asset) => Storage::disk($asset->disk)->delete($asset->object_key));

        return ['recordId' => $recordId, 'deletedAt' => $deletedAt->toIso8601String()];
    }
}
