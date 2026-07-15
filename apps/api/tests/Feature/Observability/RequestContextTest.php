<?php

namespace Tests\Feature\Observability;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class RequestContextTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_generates_request_id_and_rejects_untrusted_identifier_format(): void
    {
        $response = $this->withHeader('X-Request-ID', 'not-a-uuid-injected-value')
            ->getJson('/api/v1/missing')
            ->assertNotFound();

        $this->assertTrue(Str::isUuid((string) $response->headers->get('X-Request-ID')));
    }

    public function test_valid_request_and_trace_context_reach_audit_events(): void
    {
        $user = User::factory()->create();
        $requestId = (string) Str::uuid();
        $traceId = '4bf92f3577b34da6a3ce929d0e0e4736';

        $this->withHeaders([
            'X-Request-ID' => $requestId,
            'traceparent' => '00-'.$traceId.'-00f067aa0ba902b7-01',
        ])->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk()->assertHeader('X-Request-ID', $requestId);

        $event = AuditEvent::query()->where('event_type', 'auth.login_succeeded')->firstOrFail();
        $this->assertSame($requestId, $event->request_id);
        $this->assertSame($traceId, $event->trace_id);
    }
}
