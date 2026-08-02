<?php

namespace App\Support;

use App\Models\User;
use InvalidArgumentException;

class StaffAuthorization
{
    public const ROLE_SUPER_ADMIN = 'super_admin';

    public const ROLE_ADMIN = 'admin';

    public const ROLE_STAFF = 'staff';

    /** @return list<string> */
    public static function roles(): array
    {
        return [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN, self::ROLE_STAFF];
    }

    public static function isStaff(?User $user): bool
    {
        return $user !== null && in_array($user->staff_role, self::roles(), true);
    }

    public static function canAccessOperations(?User $user): bool
    {
        return self::isStaff($user) || ($user?->is_admin === true);
    }

    public static function canViewAccounts(?User $user): bool
    {
        return self::isStaff($user);
    }

    public static function canCreateRole(?User $actor, string $targetRole): bool
    {
        return match ($actor?->staff_role) {
            self::ROLE_SUPER_ADMIN => in_array($targetRole, [self::ROLE_ADMIN, self::ROLE_STAFF, 'user'], true),
            self::ROLE_ADMIN => in_array($targetRole, [self::ROLE_STAFF, 'user'], true),
            default => false,
        };
    }

    public static function canEdit(?User $actor, User $target): bool
    {
        if ($actor === null || ! self::isStaff($actor) || $actor->is($target)) {
            return false;
        }
        if ($target->account_status === 'deleted' || $target->deleted_at !== null) {
            return false;
        }

        return match ($actor->staff_role) {
            self::ROLE_SUPER_ADMIN => $target->staff_role !== self::ROLE_SUPER_ADMIN,
            self::ROLE_ADMIN => ! in_array($target->staff_role, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN], true),
            default => false,
        };
    }

    public static function canAssignRole(?User $actor, string $targetRole): bool
    {
        return self::canCreateRole($actor, $targetRole);
    }

    public static function canChangeStatus(?User $actor, User $target): bool
    {
        if ($actor === null || ! self::isStaff($actor) || $actor->is($target)) {
            return false;
        }

        return match ($actor->staff_role) {
            self::ROLE_SUPER_ADMIN => true,
            self::ROLE_ADMIN => ! in_array($target->staff_role, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN], true),
            default => false,
        };
    }

    public static function canDelete(?User $actor, User $target): bool
    {
        if ($actor?->staff_role !== self::ROLE_SUPER_ADMIN || $actor->is($target)) {
            return false;
        }

        return $target->staff_role !== self::ROLE_SUPER_ADMIN;
    }

    public static function canManageMaintenance(?User $user): bool
    {
        return in_array($user?->staff_role, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN], true);
    }

    public static function normalizeRole(?string $role): ?string
    {
        if ($role === null || $role === '' || $role === 'user') {
            return null;
        }
        if (! in_array($role, self::roles(), true)) {
            throw new InvalidArgumentException('Unsupported staff role.');
        }

        return $role;
    }

    /** @return array{canCreateAdmin: bool, canCreateStaff: bool, canCreateUser: bool, canDeleteAccounts: bool, canManageStatuses: bool, canManageMaintenance: bool, canEditAccounts: bool} */
    public static function capabilities(?User $user): array
    {
        $role = $user?->staff_role;

        return [
            'canCreateAdmin' => $role === self::ROLE_SUPER_ADMIN,
            'canCreateStaff' => in_array($role, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN], true),
            'canCreateUser' => in_array($role, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN], true),
            'canDeleteAccounts' => $role === self::ROLE_SUPER_ADMIN,
            'canManageStatuses' => in_array($role, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN], true),
            'canManageMaintenance' => self::canManageMaintenance($user),
            'canEditAccounts' => in_array($role, [self::ROLE_SUPER_ADMIN, self::ROLE_ADMIN], true),
        ];
    }
}
