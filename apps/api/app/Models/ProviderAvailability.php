<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProviderAvailability extends Model
{
    public $timestamps = false;

    protected $table = 'provider_availability';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['is_available' => 'boolean'];
    }
}
