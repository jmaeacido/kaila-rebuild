<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DisputeEvidence extends Model
{
    use HasUuids;

    protected $table = 'dispute_evidence';

    protected $guarded = [];
}
