<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $id
 * @property string $message_id
 * @property string $disk
 * @property string $object_key
 * @property string $original_name
 * @property string $mime_type
 * @property string $scan_status
 */
class MessageAsset extends Model
{
    use HasUuids;

    protected $guarded = [];
}
