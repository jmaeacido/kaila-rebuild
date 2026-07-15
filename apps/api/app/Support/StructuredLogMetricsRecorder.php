<?php

namespace App\Support;

use App\Contracts\MetricsRecorder;
use Illuminate\Support\Facades\Log;

class StructuredLogMetricsRecorder implements MetricsRecorder
{
    public function __construct(private readonly SensitiveDataRedactor $redactor) {}

    public function record(string $name, float|int $value, string $unit, array $attributes = []): void
    {
        Log::info('metric.recorded', [
            'metric_name' => $name,
            'metric_value' => $value,
            'metric_unit' => $unit,
            'metric_attributes' => $this->redactor->redact($attributes),
        ]);
    }
}
