<?php

namespace Tests\Feature\Storage;

use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PrivateAssetStorageTest extends TestCase
{
    public function test_private_asset_disk_is_provider_neutral_and_not_public(): void
    {
        $this->assertSame('s3', config('filesystems.disks.private-assets.driver'));
        $this->assertSame('private', config('filesystems.disks.private-assets.visibility'));
        $this->assertTrue(config('filesystems.disks.private-assets.throw'));

        Storage::fake('private-assets');
        Storage::disk('private-assets')->put('quarantine/test-object', 'private-content');
        Storage::disk('private-assets')->assertExists('quarantine/test-object');
    }
}
