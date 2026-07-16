<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $sender_user_id
 * @property string $conversation_id
 * @property int $sequence
 * @property string|null $body_ciphertext
 * @property int $encryption_key_version
 * @property Carbon|null $created_at
 */
class ConversationMessage extends Model
{
    use HasUuids;

    protected $guarded = [];
}
