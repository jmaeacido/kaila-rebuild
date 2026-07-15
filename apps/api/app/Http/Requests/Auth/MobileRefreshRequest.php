<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class MobileRefreshRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['refreshToken' => ['required', 'string', 'starts_with:kaila_rt_']];
    }
}
