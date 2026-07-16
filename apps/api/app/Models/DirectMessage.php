<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DirectMessage extends Model
{
    use HasUuids;

    protected $guarded = [];
}
