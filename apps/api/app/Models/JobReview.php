<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $author_user_id
 * @property int $subject_user_id
 * @property int $rating
 * @property string|null $comment
 * @property Carbon|null $published_at
 * @property Carbon|null $moderated_at
 */
class JobReview extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['published_at' => 'datetime', 'moderated_at' => 'datetime'];
    }
}
