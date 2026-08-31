<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** @property string $id @property string $community_post_id @property int $user_id @property string $disk @property string $object_key @property string $original_name @property string $mime_type @property int $size_bytes @property string $scan_status */
class CommunityPostMedia extends Model
{
    use HasUuids;

    protected $table = 'community_post_media';

    protected $guarded = [];
}
