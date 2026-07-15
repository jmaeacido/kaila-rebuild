<?php

namespace App\Http\Controllers;

use App\Models\MobileSession;
use App\Models\User;
use App\Support\AuditRecorder;
use App\Support\RealtimeTicketIssuer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RealtimeTicketController extends Controller
{
    public function __construct(
        private readonly RealtimeTicketIssuer $tickets,
        private readonly AuditRecorder $audit,
    ) {}

    public function browser(Request $request): JsonResponse
    {
        return $this->issue($request, $request->session()->getId());
    }

    public function mobile(Request $request): JsonResponse
    {
        /** @var MobileSession $session */
        $session = $request->attributes->get('mobileSession');

        return $this->issue($request, (string) $session->getKey());
    }

    private function issue(Request $request, string $sessionId): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $ticket = $this->tickets->issue($user, $sessionId);
        $this->audit->record($request, 'realtime.ticket_issued', $user, 'session', $sessionId);

        return response()->json(['data' => $ticket]);
    }
}
