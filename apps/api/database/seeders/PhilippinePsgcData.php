<?php

namespace Database\Seeders;

use RuntimeException;

final class PhilippinePsgcData
{
    /**
     * @return array{
     *     source: string,
     *     publicationDate: string,
     *     areas: list<array{code: string, name: string, type: string, parentCode: string|null}>
     * }
     */
    public static function load(): array
    {
        $path = database_path('data/philippines-psgc.json');
        if (! is_file($path)) {
            throw new RuntimeException("Philippine PSGC dataset missing at {$path}");
        }

        /** @var array{source?: mixed, publicationDate?: mixed, areas?: mixed} $payload */
        $payload = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        if (! is_string($payload['source'] ?? null) || ! is_string($payload['publicationDate'] ?? null) || ! is_array($payload['areas'] ?? null)) {
            throw new RuntimeException('Philippine PSGC dataset is malformed.');
        }

        /** @var list<array{code: string, name: string, type: string, parentCode: string|null}> $areas */
        $areas = [];
        foreach ($payload['areas'] as $index => $area) {
            if (! is_array($area)
                || ! is_string($area['code'] ?? null)
                || ! is_string($area['name'] ?? null)
                || ! is_string($area['type'] ?? null)
                || ! (is_string($area['parentCode'] ?? null) || ($area['parentCode'] ?? null) === null)) {
                throw new RuntimeException("Philippine PSGC area at index {$index} is malformed.");
            }

            $areas[] = [
                'code' => $area['code'],
                'name' => $area['name'],
                'type' => $area['type'],
                'parentCode' => $area['parentCode'],
            ];
        }

        return [
            'source' => $payload['source'],
            'publicationDate' => $payload['publicationDate'],
            'areas' => $areas,
        ];
    }
}
