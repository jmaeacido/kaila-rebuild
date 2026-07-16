<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class ImportLegacyUsers extends Command
{
    protected $signature = 'legacy:import-users {--source= : Path to the legacy SQL dump}';

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
        $imported = 0;
        foreach ($rows as $row) {
            $legacyId = (string) ($row['id'] ?? '');
            if ($legacyId === '') {
                continue;
            }

            $email = $row['email'] !== null ? (string) $row['email'] : 'legacy-'.$legacyId.'@example.invalid';
            $attributes = [
                'legacy_id' => $legacyId,
                'name' => (string) ($row['name'] ?? ''),
                'email' => $email,
                'password' => Hash::make(Str::random(64)),
                'terms_accepted_version' => '2026-07-16',
                'privacy_accepted_version' => '2026-07-16',
                'provider_intent' => false,
                'role' => $row['role'] !== null ? (string) $row['role'] : null,
                'area' => $row['area'] !== null ? (string) $row['area'] : null,
                'category' => $row['category'] !== null ? (string) $row['category'] : null,
                'username' => $row['username'] !== null ? (string) $row['username'] : null,
                'contact_number' => $row['contact_number'] !== null ? (string) $row['contact_number'] : null,
                'messenger_link' => $row['messenger_link'] !== null ? (string) $row['messenger_link'] : null,
                'preferred_contact_channel' => $row['preferred_contact_channel'] !== null ? (string) $row['preferred_contact_channel'] : null,
                'best_contact_time' => $row['best_contact_time'] !== null ? (string) $row['best_contact_time'] : null,
                'data_privacy_consent' => (bool) ($row['data_privacy_consent'] ?? 0),
                'deleted_at' => $row['deleted_at'] !== null ? $row['deleted_at'] : null,
                'auth_provider' => $row['auth_provider'] !== null ? (string) $row['auth_provider'] : null,
                'auth_subject' => $row['auth_subject'] !== null ? (string) $row['auth_subject'] : null,
                'social_photo_url' => $row['social_photo_url'] !== null ? (string) $row['social_photo_url'] : null,
                'account_status' => $row['account_status'] !== null ? (string) $row['account_status'] : null,
                'status_updated_at' => $row['status_updated_at'] !== null ? $row['status_updated_at'] : null,
                'banned_at' => $row['banned_at'] !== null ? $row['banned_at'] : null,
                'created_at' => $row['created_at'] ?? now()->toDateTimeString(),
                'updated_at' => $row['updated_at'] ?? now()->toDateTimeString(),
            ];

            User::updateOrCreate(
                ['legacy_id' => $legacyId],
                $attributes,
            );
            $imported++;
        }

        $this->info('Imported '.$imported.' legacy users.');

        return self::SUCCESS;
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
