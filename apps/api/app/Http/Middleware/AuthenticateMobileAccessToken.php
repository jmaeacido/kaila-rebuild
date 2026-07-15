<?php

namespace App\Http\Middleware;

use App\Models\MobileAccessToken;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateMobileAccessToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainToken = $request->bearerToken();
        if (! $plainToken || ! str_starts_with($plainToken, 'kaila_at_')) {
            throw new AuthenticationException;
        }

        $accessToken = MobileAccessToken::query()
            ->with('mobileSession.user')
            ->where('token_hash', hash('sha256', $plainToken))
            ->first();
        $session = $accessToken?->mobileSession;

        if (! $accessToken || $accessToken->revoked_at || $accessToken->expires_at->isPast() || ! $session || $session->revoked_at) {
            throw new AuthenticationException;
        }

        $request->setUserResolver(fn () => $session->user);
        $request->attributes->set('mobileSession', $session);
        $session->forceFill(['last_used_at' => now()])->save();

        return $next($request);
    }
}
