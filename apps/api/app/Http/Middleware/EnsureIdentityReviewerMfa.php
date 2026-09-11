<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\AdminMfaService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureIdentityReviewerMfa
{
    public function __construct(private readonly AdminMfaService $mfa) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $this->mfa->assertCanAccessIdentityEvidence($user, $request);

        return $next($request);
    }
}
