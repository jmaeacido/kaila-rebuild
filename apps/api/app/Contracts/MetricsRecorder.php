<?php

namespace App\Contracts;

interface MetricsRecorder
{
    /** @param array<string, bool|int|string> $attributes */
    public function record(string $name, float|int $value, string $unit, array $attributes = []): void;
}
