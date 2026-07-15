<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationPreferencesRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'muteMessages' => ['required', 'boolean'],
            'muteRoutineReminders' => ['required', 'boolean'],
            'quietHoursStart' => ['nullable', 'date_format:H:i', 'required_with:quietHoursEnd'],
            'quietHoursEnd' => ['nullable', 'date_format:H:i', 'required_with:quietHoursStart'],
            'timezone' => ['required', 'timezone:all'],
            'securityNotifications' => ['prohibited'],
            'materialJobNotifications' => ['prohibited'],
        ];
    }
}
