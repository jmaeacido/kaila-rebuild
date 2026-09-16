<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\CurrentUserResource;
use App\Models\ClientProfile;
use App\Models\User;
use App\Notifications\BrandedWelcome;
use App\Support\AuditRecorder;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RegisteredUserController extends Controller
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request): User {
            $name = $request->string('name')->trim()->toString();
            $user = User::query()->create([
                'name' => $name,
                'email' => $request->string('email')->lower()->toString(),
                'password' => $request->string('password')->toString(),
                'terms_accepted_version' => $request->string('termsVersion')->toString(),
                'privacy_accepted_version' => $request->string('privacyVersion')->toString(),
                'provider_intent' => $request->boolean('providerIntent'),
            ]);
            ClientProfile::query()->create([
                'user_id' => $user->id,
                'display_name' => $name,
                'area_id' => null,
            ]);

            return $user;
        });

        event(new Registered($user));
        Auth::login($user, remember: true);
        $request->session()->regenerate();

        $this->audit->record($request, 'auth.registered', $user, 'user', (string) $user->getKey());
        $user->notify(new BrandedWelcome);

        return (new CurrentUserResource($user))
            ->response()
            ->setStatusCode(201);
    }
}
