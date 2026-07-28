<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RevisionEvidence extends Model
{
    use HasUuids;

    protected $table = 'revision_evidence';

    protected $guarded = [];
}
