<?php

namespace App\Http\Middleware;

use App\Support\StaffAuthorization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdministrator
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(StaffAuthorization::canAccessOperations($request->user()), 403, 'Staff access is required.');

        return $next($request);
    }
}
