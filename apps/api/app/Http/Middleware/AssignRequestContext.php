<?php

namespace App\Http\Middleware;

use App\Contracts\MetricsRecorder;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AssignRequestContext
{
    public function __construct(private readonly MetricsRecorder $metrics) {}

    public function handle(Request $request, Closure $next): Response
    {
        $startedAt = hrtime(true);
        $requestedId = $request->header('X-Request-ID');
        $requestId = is_string($requestedId) && Str::isUuid($requestedId)
            ? $requestedId
            : (string) Str::uuid();
        $traceId = $this->traceId($request->header('traceparent'));

        $request->attributes->set('requestId', $requestId);
        $request->attributes->set('traceId', $traceId);
        Log::withContext(array_filter([
            'request_id' => $requestId,
            'trace_id' => $traceId,
        ]));

        $response = $next($request);
        $response->headers->set('X-Request-ID', $requestId);
        $this->metrics->record('http.server.duration', (hrtime(true) - $startedAt) / 1_000_000, 'ms', [
            'http.request.method' => $request->method(),
            'http.response.status_code' => $response->getStatusCode(),
            'http.route' => $request->route()?->uri() ?? 'unmatched',
        ]);

        return $response;
    }

    private function traceId(?string $traceparent): ?string
    {
        if (! $traceparent || preg_match('/^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i', $traceparent, $matches) !== 1) {
            return null;
        }

        return strtolower($matches[1]);
    }
}
