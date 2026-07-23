<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class ImportLegacyUsers extends Command
{
    protected $signature = 'legacy:import-users
        {--source= : Path to the legacy SQL dump}
        {--dry-run : Reconcile eligible users without writing to the database}';

    protected $description = 'Import legacy KAILA users from the SQL dump into the rebuild users table';

    public function handle(): int
    {
        $source = (string) ($this->option('source') ?: base_path('../kaila_db.sql'));
        if (! is_file($source) || ! is_readable($source)) {
            $this->error('Legacy SQL dump not found at '.$source);

            return self::FAILURE;
        }

        $sql = file_get_contents($source);
        if ($sql === false) {
            throw new RuntimeException('Unable to read legacy SQL dump.');
        }

        $rows = $this->extractUsersRows($sql);
        $eligible = array_values(array_filter(
            $rows,
            fn (array $row): bool => ($row['deleted_at'] ?? null) === null
                && strtolower((string) ($row['account_status'] ?? 'active')) === 'active',
        ));
        $legacyIds = array_values(array_filter(array_map(
            fn (array $row): string => (string) ($row['id'] ?? ''),
            $eligible,
        )));
        $existing = User::query()->whereIn('legacy_id', $legacyIds)->count();
        $temporaryEmails = count(array_filter(
            $eligible,
            fn (array $row): bool => trim((string) ($row['email'] ?? '')) === '',
        ));
        $administrators = count(array_filter(
            $eligible,
            fn (array $row): bool => ($row['role'] ?? null) === 'admin',
        ));

        $this->table(
            ['Source rows', 'Eligible active', 'Excluded', 'Existing', 'New', 'Temporary email', 'Administrators'],
            [[count($rows), count($eligible), count($rows) - count($eligible), $existing, count($eligible) - $existing, $temporaryEmails, $administrators]],
        );

        if ($this->option('dry-run')) {
            $this->info('Dry run complete. No users were written.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($eligible): void {
            foreach ($eligible as $row) {
                $this->importRow($row);
            }
        }, 3);

        $this->info('Reconciled '.count($eligible).' eligible legacy users.');

        return self::SUCCESS;
    }

    /** @param array<string, mixed> $row */
    private function importRow(array $row): void
    {
        $legacyId = (string) $row['id'];
        $role = $row['role'] !== null ? (string) $row['role'] : null;
        $email = trim((string) ($row['email'] ?? ''));
        $user = User::query()->firstOrNew(['legacy_id' => $legacyId]);

        if (! $user->exists) {
            $user->password = Hash::make(Str::random(64));
        }

        $user->fill([
            'name' => (string) ($row['name'] ?? ''),
            'email' => $email !== '' ? strtolower($email) : 'legacy-'.$legacyId.'@temporary.com',
            'terms_accepted_version' => '2026-07-16',
            'privacy_accepted_version' => '2026-07-16',
            'provider_intent' => $role === 'provider',
            'active_mode' => $role === 'provider' ? 'provider' : 'client',
            'is_admin' => $role === 'admin',
            'role' => $role,
            'area' => $row['area'] !== null ? (string) $row['area'] : null,
            'category' => $row['category'] !== null ? (string) $row['category'] : null,
            'username' => $row['username'] !== null ? (string) $row['username'] : null,
            'contact_number' => $row['contact_number'] !== null ? (string) $row['contact_number'] : null,
            'messenger_link' => $row['messenger_link'] !== null ? (string) $row['messenger_link'] : null,
            'preferred_contact_channel' => $row['preferred_contact_channel'] !== null ? (string) $row['preferred_contact_channel'] : null,
            'best_contact_time' => $row['best_contact_time'] !== null ? (string) $row['best_contact_time'] : null,
            'data_privacy_consent' => (bool) ($row['data_privacy_consent'] ?? 0),
            'auth_provider' => $row['auth_provider'] !== null ? (string) $row['auth_provider'] : null,
            'auth_subject' => $row['auth_subject'] !== null ? (string) $row['auth_subject'] : null,
            'social_photo_url' => $row['social_photo_url'] !== null ? (string) $row['social_photo_url'] : null,
            'account_status' => 'active',
            'status_updated_at' => $row['status_updated_at'] !== null ? $row['status_updated_at'] : null,
            'banned_at' => null,
            'created_at' => $row['created_at'] ?? now()->toDateTimeString(),
            'updated_at' => $row['updated_at'] ?? now()->toDateTimeString(),
        ]);
        $user->save();
    }

    /** @return list<array<string, mixed>> */
    private function extractUsersRows(string $sql): array
    {
        $rows = [];
        if (preg_match_all('/INSERT INTO `users` VALUES\s*\((.*?)\);/is', $sql, $matches) === 0) {
            return $rows;
        }

        foreach ($matches[1] as $payload) {
            $values = $this->parseSqlValues($payload);
            if ($values === []) {
                continue;
            }

            $rows[] = [
                'id' => $this->decodeSqlValue($values[0] ?? null),
                'name' => $this->decodeSqlValue($values[1] ?? null),
                'email' => $this->decodeSqlValue($values[2] ?? null),
                'password_hash' => $this->decodeSqlValue($values[3] ?? null),
                'role' => $this->decodeSqlValue($values[4] ?? null),
                'area' => $this->decodeSqlValue($values[5] ?? null),
                'category' => $this->decodeSqlValue($values[6] ?? null),
                'created_at' => $this->decodeSqlValue($values[7] ?? null),
                'username' => $this->decodeSqlValue($values[8] ?? null),
                'photo_file' => $this->decodeSqlValue($values[9] ?? null),
                'photo_mime_type' => $this->decodeSqlValue($values[10] ?? null),
                'contact_number' => $this->decodeSqlValue($values[11] ?? null),
                'messenger_link' => $this->decodeSqlValue($values[12] ?? null),
                'preferred_contact_channel' => $this->decodeSqlValue($values[13] ?? null),
                'best_contact_time' => $this->decodeSqlValue($values[14] ?? null),
                'data_privacy_consent' => $this->decodeSqlValue($values[15] ?? null),
                'deleted_at' => $this->decodeSqlValue($values[16] ?? null),
                'auth_provider' => $this->decodeSqlValue($values[17] ?? null),
                'auth_subject' => $this->decodeSqlValue($values[18] ?? null),
                'social_photo_url' => $this->decodeSqlValue($values[19] ?? null),
                'account_status' => $this->decodeSqlValue($values[20] ?? null),
                'status_updated_at' => $this->decodeSqlValue($values[21] ?? null),
                'banned_at' => $this->decodeSqlValue($values[22] ?? null),
                'updated_at' => $this->decodeSqlValue($values[7] ?? null),
            ];
        }

        return $rows;
    }

    /** @return list<string|null> */
    private function parseSqlValues(string $payload): array
    {
        $values = [];
        $current = '';
        $inString = false;
        $length = strlen($payload);
        for ($i = 0; $i < $length; $i++) {
            $char = $payload[$i];
            if ($char === "'") {
                if ($inString && $i + 1 < $length && $payload[$i + 1] === "'") {
                    $current .= "''";
                    $i++;
                } else {
                    $inString = ! $inString;
                }
            } elseif (! $inString && $char === ',') {
                $values[] = trim($current);
                $current = '';

                continue;
            }

            if ($char !== "'") {
                $current .= $char;
            }
        }

        $values[] = trim($current);

        return $values;
    }

    private function decodeSqlValue(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value) && str_starts_with($value, "'")) {
            $inner = substr($value, 1, -1);

            return str_replace("''", "'", $inner);
        }

        if (is_string($value) && strcasecmp($value, 'null') === 0) {
            return null;
        }

        return $value;
    }
}
