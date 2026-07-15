<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateNotificationPreferencesRequest;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function __construct(private readonly AuditRecorder $audit) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->serialize($this->preferences($request))]);
    }

    public function update(UpdateNotificationPreferencesRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $preferences = NotificationPreference::query()->updateOrCreate(
            ['user_id' => $user->getKey()],
            [
                'mute_messages' => $request->boolean('muteMessages'),
                'mute_routine_reminders' => $request->boolean('muteRoutineReminders'),
                'quiet_hours_start' => $request->input('quietHoursStart'),
                'quiet_hours_end' => $request->input('quietHoursEnd'),
                'timezone' => $request->string('timezone')->toString(),
            ],
        );
        $this->audit->record($request, 'notification.preferences_updated', $user, 'user', (string) $user->getKey());

        return response()->json(['data' => $this->serialize($preferences)]);
    }

    private function preferences(Request $request): NotificationPreference
    {
        /** @var User $user */
        $user = $request->user();

        return NotificationPreference::query()->firstOrCreate(['user_id' => $user->getKey()]);
    }

    /** @return array<string, bool|string|null> */
    private function serialize(NotificationPreference $preferences): array
    {
        return [
            'muteMessages' => $preferences->mute_messages,
            'muteRoutineReminders' => $preferences->mute_routine_reminders,
            'quietHoursStart' => $preferences->quiet_hours_start,
            'quietHoursEnd' => $preferences->quiet_hours_end,
            'timezone' => $preferences->timezone,
            'securityNotificationsEnabled' => true,
            'materialJobNotificationsEnabled' => true,
        ];
    }
}
