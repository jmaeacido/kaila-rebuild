<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class AdminAccountService
{
    public function __construct(private readonly AuditRecorder $audit) {}

    /**
     * @param  array{name: string, email: string, password: string, staffRole: string|null, accountType: string}  $data
     */
    public function create(User $actor, array $data): User
    {
        $targetRole = $data['accountType'] === 'user' ? 'user' : (string) $data['staffRole'];
        abort_unless(StaffAuthorization::canCreateRole($actor, $targetRole), 403, 'You cannot create this account type.');

        $staffRole = StaffAuthorization::normalizeRole($data['accountType'] === 'user' ? null : $targetRole);

        return DB::transaction(function () use ($actor, $data, $staffRole): User {
            abort_if(User::query()->where('email', Str::lower($data['email']))->exists(), 422, 'That email is already registered.');

            $user = User::query()->create([
                'name' => $data['name'],
                'email' => Str::lower($data['email']),
                'password' => $data['password'],
                'terms_accepted_version' => (string) config('policies.terms_version'),
                'privacy_accepted_version' => (string) config('policies.privacy_version'),
                'provider_intent' => false,
                'active_mode' => 'client',
                'appearance_theme' => 'system',
                'staff_role' => $staffRole,
                'is_admin' => $staffRole !== null,
                'role' => $staffRole ?? 'client',
                'account_status' => 'active',
                'status_updated_at' => now(),
                'data_privacy_consent' => true,
            ]);

            $this->audit->record(request(), 'admin.account.created', $actor, 'user', (string) $user->id, [
                'staffRole' => $staffRole,
                'email' => $user->email,
            ]);

            return $user;
        });
    }

    public function activate(User $actor, User $target): User
    {
        abort_unless(StaffAuthorization::canChangeStatus($actor, $target), 403, 'You cannot activate this account.');
        abort_if($target->account_status === 'deleted' || $target->deleted_at !== null, 409, 'Deleted accounts cannot be reactivated here.');

        $target->forceFill([
            'account_status' => 'active',
            'banned_at' => null,
            'status_updated_at' => now(),
        ])->save();

        $this->audit->record(request(), 'admin.account.activated', $actor, 'user', (string) $target->id);

        return $target->refresh();
    }

    public function deactivate(User $actor, User $target): User
    {
        abort_unless(StaffAuthorization::canChangeStatus($actor, $target), 403, 'You cannot deactivate this account.');
        abort_if($target->account_status === 'deleted' || $target->deleted_at !== null, 409, 'Deleted accounts cannot be deactivated.');

        $target->forceFill([
            'account_status' => 'deactivated',
            'status_updated_at' => now(),
        ])->save();

        DB::table('sessions')->where('user_id', $target->id)->delete();

        $this->audit->record(request(), 'admin.account.deactivated', $actor, 'user', (string) $target->id);

        return $target->refresh();
    }

    public function restrict(User $actor, User $target): User
    {
        abort_unless(StaffAuthorization::canChangeStatus($actor, $target), 403, 'You cannot restrict this account.');
        abort_if($target->account_status === 'deleted' || $target->deleted_at !== null, 409, 'Deleted accounts cannot be restricted.');

        $target->forceFill([
            'account_status' => 'restricted',
            'status_updated_at' => now(),
        ])->save();

        DB::table('sessions')->where('user_id', $target->id)->delete();

        $this->audit->record(request(), 'admin.account.restricted', $actor, 'user', (string) $target->id);

        return $target->refresh();
    }

    /**
     * @param  array{name?: string, email?: string, password?: string|null, accountType?: string}  $data
     */
    public function update(User $actor, User $target, array $data): User
    {
        abort_unless(StaffAuthorization::canEdit($actor, $target), 403, 'You cannot edit this account.');

        return DB::transaction(function () use ($actor, $target, $data): User {
            $changes = [];

            if (isset($data['name']) && $data['name'] !== $target->name) {
                $target->name = $data['name'];
                $changes['name'] = true;
            }

            if (isset($data['email'])) {
                $email = Str::lower($data['email']);
                if ($email !== $target->email) {
                    abort_if(
                        User::query()->where('email', $email)->whereKeyNot($target->id)->exists(),
                        422,
                        'That email is already registered.',
                    );
                    $target->email = $email;
                    $changes['email'] = true;
                }
            }

            if (! empty($data['password'])) {
                $target->password = $data['password'];
                $changes['password'] = true;
            }

            if (isset($data['accountType'])) {
                $targetRole = $data['accountType'] === 'user' ? 'user' : $data['accountType'];
                abort_unless(StaffAuthorization::canAssignRole($actor, $targetRole), 403, 'You cannot assign this role.');
                $staffRole = StaffAuthorization::normalizeRole($data['accountType'] === 'user' ? null : $targetRole);
                if ($staffRole !== $target->staff_role) {
                    $target->staff_role = $staffRole;
                    $target->is_admin = $staffRole !== null;
                    $target->role = $staffRole ?? 'client';
                    $changes['staffRole'] = $staffRole;
                }
            }

            if ($changes !== []) {
                $target->save();
                $this->audit->record(request(), 'admin.account.updated', $actor, 'user', (string) $target->id, $changes);
            }

            return $target->refresh();
        });
    }

    public function setStatus(User $actor, User $target, string $status): User
    {
        return match ($status) {
            'active' => $this->activate($actor, $target),
            'deactivated' => $this->deactivate($actor, $target),
            'restricted' => $this->restrict($actor, $target),
            'deleted' => $this->delete($actor, $target),
            default => throw new RuntimeException('Unsupported account status.'),
        };
    }

    public function delete(User $actor, User $target): User
    {
        abort_unless(StaffAuthorization::canDelete($actor, $target), 403, 'Only a super admin can delete this account.');
        abort_if($target->account_status === 'deleted' || $target->deleted_at !== null, 409, 'This account is already deleted.');

        return DB::transaction(function () use ($actor, $target): User {
            $deletedAt = now();
            $target->forceFill([
                'account_status' => 'deleted',
                'deleted_at' => $deletedAt,
                'status_updated_at' => $deletedAt,
                'staff_role' => null,
                'is_admin' => false,
                'password' => Hash::make(Str::random(64)),
                'remember_token' => null,
            ])->save();

            DB::table('sessions')->where('user_id', $target->id)->delete();
            DB::table('mobile_sessions')->where('user_id', $target->id)->whereNull('revoked_at')->update([
                'revoked_at' => $deletedAt,
                'revoke_reason' => 'admin_deleted',
                'updated_at' => $deletedAt,
            ]);
            DB::table('push_devices')->where('user_id', $target->id)->delete();

            $this->audit->record(request(), 'admin.account.deleted', $actor, 'user', (string) $target->id);

            return $target->refresh();
        });
    }

    public function assertMutable(User $target): void
    {
        if ($target->staff_role === StaffAuthorization::ROLE_SUPER_ADMIN) {
            throw new RuntimeException('Super admin accounts are protected.');
        }
    }
}
