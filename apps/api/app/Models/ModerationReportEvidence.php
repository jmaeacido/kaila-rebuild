<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ModerationReportEvidence extends Model
{
    use HasUuids;

    protected $table = 'moderation_report_evidence';

    protected $guarded = [];
}
