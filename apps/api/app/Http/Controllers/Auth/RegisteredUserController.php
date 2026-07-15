<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\CurrentUserResource;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class RegisteredUserController extends Controller
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $user = User::query()->create([
            'name' => $request->string('name')->trim()->toString(),
            'email' => $request->string('email')->lower()->toString(),
            'password' => $request->string('password')->toString(),
            'terms_accepted_version' => $request->string('termsVersion')->toString(),
            'privacy_accepted_version' => $request->string('privacyVersion')->toString(),
            'provider_intent' => $request->boolean('providerIntent'),
        ]);

        event(new Registered($user));
        Auth::login($user);
        $request->session()->regenerate();

        $this->audit->record($request, 'auth.registered', $user, 'user', (string) $user->getKey());

        return (new CurrentUserResource($user))
            ->response()
            ->setStatusCode(201);
    }
}
