<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

trait HasPrimaryUuid
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';
}
