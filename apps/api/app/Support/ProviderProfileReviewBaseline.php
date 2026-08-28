<?php

namespace App\Support;

use App\Models\ProviderProfile;

class ProviderProfileReviewBaseline
{
    /** @return array<string, mixed> */
    public static function capture(ProviderProfile $profile): array
    {
        $profile->loadMissing(['services:id,name', 'serviceAreas:id,name,type', 'availability']);

        return [
            'displayName' => $profile->display_name,
            'bio' => $profile->bio,
            'yearsExperience' => $profile->years_experience,
            'offersAtShop' => (bool) $profile->offers_at_shop,
            'shopName' => $profile->shop_name,
            'shopAddress' => $profile->shop_address,
            'services' => $profile->services->map->only(['id', 'name'])->sortBy('id')->values()->all(),
            'serviceAreas' => $profile->serviceAreas->map->only(['id', 'name', 'type'])->sortBy('id')->values()->all(),
            'availability' => $profile->availability
                ->sortBy(fn ($slot) => sprintf('%d-%s', $slot->day_of_week, $slot->starts_at))
                ->map(fn ($slot) => [
                    'dayOfWeek' => $slot->day_of_week,
                    'startsAt' => substr((string) $slot->starts_at, 0, 5),
                    'endsAt' => substr((string) $slot->ends_at, 0, 5),
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $baseline
     * @return list<array{field: string, label: string, previous: string, current: string}>
     */
    public static function changes(array $baseline, ProviderProfile $profile): array
    {
        $current = self::capture($profile);
        $changes = [];

        foreach ([
            'displayName' => 'Display name',
            'bio' => 'About',
            'yearsExperience' => 'Experience',
            'offersAtShop' => 'Shop service',
            'shopName' => 'Shop name',
            'shopAddress' => 'Shop address',
        ] as $field => $label) {
            $previous = $baseline[$field] ?? null;
            $next = $current[$field] ?? null;
            if ($previous === $next) {
                continue;
            }

            $changes[] = [
                'field' => $field,
                'label' => $label,
                'previous' => self::formatScalar($field, $previous),
                'current' => self::formatScalar($field, $next),
            ];
        }

        if (self::listLabel($baseline['services'] ?? []) !== self::listLabel($current['services'] ?? [])) {
            $changes[] = [
                'field' => 'services',
                'label' => 'Services',
                'previous' => self::listLabel($baseline['services'] ?? []),
                'current' => self::listLabel($current['services'] ?? []),
            ];
        }

        if (self::listLabel($baseline['serviceAreas'] ?? []) !== self::listLabel($current['serviceAreas'] ?? [])) {
            $changes[] = [
                'field' => 'serviceAreas',
                'label' => 'Areas',
                'previous' => self::listLabel($baseline['serviceAreas'] ?? []),
                'current' => self::listLabel($current['serviceAreas'] ?? []),
            ];
        }

        if (json_encode($baseline['availability'] ?? []) !== json_encode($current['availability'] ?? [])) {
            $changes[] = [
                'field' => 'availability',
                'label' => 'Availability',
                'previous' => self::formatAvailability($baseline['availability'] ?? []),
                'current' => self::formatAvailability($current['availability'] ?? []),
            ];
        }

        return $changes;
    }

    private static function formatScalar(string $field, mixed $value): string
    {
        if ($field === 'offersAtShop') {
            return $value ? 'Enabled' : 'Disabled';
        }

        if ($field === 'yearsExperience') {
            return $value === null ? 'Not set' : "{$value} years";
        }

        if ($value === null || $value === '') {
            return 'Not set';
        }

        return (string) $value;
    }

    /** @param  list<array{name?: string}>  $items */
    private static function listLabel(array $items): string
    {
        $labels = array_values(array_filter(array_map(
            fn (array $item) => $item['name'] ?? null,
            $items,
        )));

        return $labels === [] ? 'Not set' : implode(', ', $labels);
    }

    /** @param  list<array{dayOfWeek?: int, startsAt?: string, endsAt?: string}>  $slots */
    private static function formatAvailability(array $slots): string
    {
        if ($slots === []) {
            return 'Not set';
        }

        $days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return implode('; ', array_map(
            fn (array $slot) => sprintf(
                '%s %s-%s',
                $days[$slot['dayOfWeek'] ?? 0] ?? 'Day',
                $slot['startsAt'] ?? '??:??',
                $slot['endsAt'] ?? '??:??',
            ),
            $slots,
        ));
    }
}
