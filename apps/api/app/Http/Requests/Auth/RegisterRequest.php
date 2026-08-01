<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'string', 'lowercase', 'email:rfc', 'max:254', 'unique:users,email'],
            'password' => ['required', 'string', 'max:128', Password::min(8)->mixedCase()->numbers(), 'confirmed'],
            'termsVersion' => ['required', 'string', Rule::in([(string) config('policies.terms_version')])],
            'privacyVersion' => ['required', 'string', Rule::in([(string) config('policies.privacy_version')])],
            'providerIntent' => ['sometimes', 'boolean'],
        ];
    }
}
