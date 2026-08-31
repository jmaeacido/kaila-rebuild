<?php

namespace Tests\Unit;

use App\Support\CommunityHashtagParser;
use PHPUnit\Framework\TestCase;

class CommunityHashtagParserTest extends TestCase
{
    public function test_it_extracts_normalizes_and_strips_hashtags(): void
    {
        $parser = new CommunityHashtagParser;
        $result = $parser->apply("Join the community today.\n\n#KAILA #LocalServices #ServiceProviders #SupportLocal");

        $this->assertSame(['kaila', 'localservices', 'serviceproviders', 'supportlocal'], $result['tags']);
        $this->assertSame('Join the community today.', $result['body']);
    }

    public function test_it_deduplicates_and_limits_hashtags(): void
    {
        $parser = new CommunityHashtagParser;
        $result = $parser->apply('#Plumbing #plumbing #Electrical #Cleaning #Repair #Paint #Tools');

        $this->assertSame(['plumbing', 'electrical', 'cleaning', 'repair', 'paint'], $result['tags']);
        $this->assertSame('', $result['body']);
    }

    public function test_it_keeps_inline_copy_without_hashtag_tokens(): void
    {
        $parser = new CommunityHashtagParser;
        $result = $parser->apply('Try #LeakFix before calling a plumber.');

        $this->assertSame(['leakfix'], $result['tags']);
        $this->assertSame('Try before calling a plumber.', $result['body']);
    }
}
