<?php

namespace App\Support;

final class CommunityHashtagParser
{
    public const MAX_TAGS = 5;

    private const PATTERN = '/#([A-Za-z][A-Za-z0-9_]{0,39})\b/u';

    /** @return array{tags: list<string>, body: string} */
    public function apply(string $body): array
    {
        $tags = [];
        $seen = [];

        if (preg_match_all(self::PATTERN, $body, $matches)) {
            foreach ($matches[1] as $raw) {
                $tag = strtolower($raw);
                if (isset($seen[$tag]) || count($tags) >= self::MAX_TAGS) {
                    continue;
                }

                $seen[$tag] = true;
                $tags[] = $tag;
            }
        }

        $cleanBody = trim(preg_replace(self::PATTERN, '', $body) ?? $body);
        $cleanBody = trim(preg_replace('/[ \t]{2,}/', ' ', $cleanBody) ?? $cleanBody);
        $cleanBody = trim(preg_replace("/\n{3,}/", "\n\n", $cleanBody) ?? $cleanBody);

        return ['tags' => $tags, 'body' => $cleanBody];
    }
}
