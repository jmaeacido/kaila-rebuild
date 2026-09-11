<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\BrandedAndroidInternalTestInvite;
use App\Support\NotificationService;
use App\Support\StaffAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminMailController extends Controller
{
    public const MAX_RECIPIENTS = 50;

    public const INBOX_RESOURCE_TYPE = 'ops_invite';

    public const INBOX_RESOURCE_ID = 'android-internal-test';

    public const INBOX_EVENT_TYPE = 'ops.android_test_invite';

    public function __construct(private readonly NotificationService $notifications) {}

    public function sendAndroidInternalTestInvite(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User && StaffAuthorization::canSendOpsMail($actor), 403);

        $data = $request->validate([
            'userIds' => ['nullable', 'array', 'max:'.self::MAX_RECIPIENTS],
            'userIds.*' => ['string', 'max:64'],
            'emails' => ['nullable', 'array', 'max:'.self::MAX_RECIPIENTS],
            'emails.*' => ['nullable', 'string', 'max:255'],
        ]);

        $userIds = array_values(array_unique(array_filter($data['userIds'] ?? [])));
        $rawEmails = $data['emails'] ?? [];

        if ($userIds === [] && $rawEmails === []) {
            throw ValidationException::withMessages([
                'userIds' => 'Select at least one account or paste at least one email.',
            ]);
        }

        $skipped = 0;
        /** @var array<string, array{email: string, name: ?string, user: ?User}> $recipients */
        $recipients = [];

        if ($userIds !== []) {
            $users = User::query()
                ->whereIn('id', $userIds)
                ->get()
                ->keyBy(fn (User $user): string => (string) $user->id);

            foreach ($userIds as $userId) {
                $user = $users->get($userId);
                if ($user === null || $user->account_status === 'deleted' || $user->deleted_at !== null) {
                    $skipped++;

                    continue;
                }

                $email = Str::lower(trim((string) $user->email));
                if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $skipped++;

                    continue;
                }

                $recipients[$email] = [
                    'email' => $email,
                    'name' => (string) $user->name,
                    'user' => $user,
                ];
            }
        }

        foreach ($rawEmails as $rawEmail) {
            $email = Str::lower(trim((string) $rawEmail));
            if ($email === '') {
                continue;
            }
            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $skipped++;

                continue;
            }
            if (isset($recipients[$email])) {
                continue;
            }

            $existing = User::query()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->where(function ($query): void {
                    $query->whereNull('account_status')
                        ->orWhere('account_status', '!=', 'deleted');
                })
                ->whereNull('deleted_at')
                ->first();

            $recipients[$email] = [
                'email' => $email,
                'name' => $existing?->name,
                'user' => $existing,
            ];
        }

        if (count($recipients) > self::MAX_RECIPIENTS) {
            throw ValidationException::withMessages([
                'emails' => 'Send at most '.self::MAX_RECIPIENTS.' Android test invites at a time.',
            ]);
        }

        if ($recipients === []) {
            throw ValidationException::withMessages([
                'userIds' => 'No valid recipients were found to invite.',
            ]);
        }

        $sent = 0;
        $inboxSent = 0;
        $playTestUrl = (string) config('kaila.android_internal_test_url');

        foreach ($recipients as $recipient) {
            $mail = new BrandedAndroidInternalTestInvite($recipient['name']);
            if ($recipient['user'] instanceof User) {
                $recipient['user']->notify($mail);
                $this->notifications->send(
                    (int) $recipient['user']->id,
                    self::INBOX_EVENT_TYPE,
                    "You're invited to test KAILA on Android",
                    'KAILA invited you to join Android internal testing. Open this update, become a tester on Google Play, then install the app.',
                    self::INBOX_RESOURCE_TYPE,
                    self::INBOX_RESOURCE_ID,
                    [
                        'inviteKind' => 'android_internal_test',
                        'playTestUrl' => $playTestUrl,
                    ],
                );
                $inboxSent++;
            } else {
                Notification::route('mail', $recipient['email'])->notify($mail);
            }
            $sent++;
        }

        return response()->json([
            'data' => [
                'sent' => $sent,
                'inboxSent' => $inboxSent,
                'skipped' => $skipped,
            ],
        ]);
    }
}
