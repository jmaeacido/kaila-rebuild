<?php

namespace App\Support;

use App\Jobs\ActivateScheduledMaintenanceJob;
use App\Models\PlatformMaintenance;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class MaintenanceService
{
    public const PHASE_IDLE = 'idle';

    public const PHASE_SCHEDULED = 'scheduled';

    public const PHASE_ACTIVE = 'active';

    public const DEFAULT_MESSAGE = 'KAILA will pause briefly for maintenance. Please finish what you are doing.';

    public const DEFAULT_ACTIVE_MESSAGE = 'We are improving the marketplace. Please check back soon — your jobs and messages will be waiting.';

    public function current(): PlatformMaintenance
    {
        $row = PlatformMaintenance::query()->orderBy('id')->first();
        if ($row !== null) {
            return $row;
        }

        return PlatformMaintenance::query()->create([
            'phase' => self::PHASE_IDLE,
            'enabled' => false,
        ]);
    }

    /** @return array<string, mixed> */
    public function publicStatus(?PlatformMaintenance $row = null): array
    {
        $row ??= $this->current();
        $secondsRemaining = null;
        if ($row->phase === self::PHASE_SCHEDULED && $row->scheduled_at !== null) {
            $secondsRemaining = max(0, $row->scheduled_at->getTimestamp() - time());
        }

        return [
            'phase' => $row->phase,
            'enabled' => $row->enabled || $row->phase === self::PHASE_ACTIVE,
            'message' => $this->messageForPhase($row),
            'countdownSeconds' => $row->countdown_seconds,
            'secondsRemaining' => $secondsRemaining,
            'scheduledAt' => $row->scheduled_at?->toIso8601String(),
            'activatedAt' => $row->activated_at?->toIso8601String(),
        ];
    }

    public function isActive(?PlatformMaintenance $row = null): bool
    {
        $row ??= $this->current();

        return $row->phase === self::PHASE_ACTIVE || $row->enabled === true;
    }

    public function schedule(User $actor, int $countdownSeconds, ?string $message = null): PlatformMaintenance
    {
        if ($countdownSeconds < 5 || $countdownSeconds > 3600) {
            throw new InvalidArgumentException('Countdown must be between 5 and 3600 seconds.');
        }

        return DB::transaction(function () use ($actor, $countdownSeconds, $message): PlatformMaintenance {
            $row = $this->current()->fresh();
            abort_unless($row !== null, 500);
            if ($row->phase === self::PHASE_ACTIVE) {
                throw new InvalidArgumentException('Maintenance is already active. End it before scheduling again.');
            }

            $scheduledAt = now()->addSeconds($countdownSeconds);
            $row->fill([
                'phase' => self::PHASE_SCHEDULED,
                'enabled' => false,
                'message' => $this->normalizeMessage($message),
                'countdown_seconds' => $countdownSeconds,
                'scheduled_at' => $scheduledAt,
                'activated_at' => null,
                'updated_by' => $actor->id,
            ])->save();

            $this->broadcast('platform.maintenance.scheduled', $row, [
                'phase' => self::PHASE_SCHEDULED,
                'message' => $row->message,
                'countdownSeconds' => $countdownSeconds,
                'secondsRemaining' => $countdownSeconds,
                'scheduledAt' => $scheduledAt->toIso8601String(),
            ]);

            ActivateScheduledMaintenanceJob::dispatch((int) $row->getKey())
                ->delay($scheduledAt)
                ->onQueue('default');

            return $row->fresh() ?? $row;
        });
    }

    public function cancel(User $actor): PlatformMaintenance
    {
        return DB::transaction(function () use ($actor): PlatformMaintenance {
            $row = $this->current()->fresh();
            abort_unless($row !== null, 500);
            if ($row->phase !== self::PHASE_SCHEDULED) {
                throw new InvalidArgumentException('There is no scheduled maintenance window to cancel.');
            }

            $row->fill([
                'phase' => self::PHASE_IDLE,
                'enabled' => false,
                'message' => null,
                'countdown_seconds' => null,
                'scheduled_at' => null,
                'activated_at' => null,
                'updated_by' => $actor->id,
            ])->save();

            $this->broadcast('platform.maintenance.cancelled', $row, [
                'phase' => self::PHASE_IDLE,
                'message' => 'Scheduled maintenance was cancelled.',
            ]);

            return $row->fresh() ?? $row;
        });
    }

    public function activateDue(): ?PlatformMaintenance
    {
        return DB::transaction(function (): ?PlatformMaintenance {
            $row = $this->current()->fresh();
            if ($row === null || $row->phase !== self::PHASE_SCHEDULED || $row->scheduled_at === null) {
                return null;
            }
            if ($row->scheduled_at->isFuture()) {
                return null;
            }

            return $this->activateRow($row, null);
        });
    }

    public function activateNow(User $actor, ?string $message = null): PlatformMaintenance
    {
        return DB::transaction(function () use ($actor, $message): PlatformMaintenance {
            $row = $this->current()->fresh();
            abort_unless($row !== null, 500);
            if ($message !== null && trim($message) !== '') {
                $row->message = $this->activeFacingMessage($this->normalizeMessage($message));
            } elseif ($row->message === null || $row->message === '') {
                $row->message = self::DEFAULT_ACTIVE_MESSAGE;
            } else {
                $row->message = $this->activeFacingMessage($row->message);
            }

            return $this->activateRow($row, $actor);
        });
    }

    public function end(User $actor): PlatformMaintenance
    {
        return DB::transaction(function () use ($actor): PlatformMaintenance {
            $row = $this->current()->fresh();
            abort_unless($row !== null, 500);
            if ($row->phase === self::PHASE_IDLE && ! $row->enabled) {
                throw new InvalidArgumentException('Maintenance is not active.');
            }

            $row->fill([
                'phase' => self::PHASE_IDLE,
                'enabled' => false,
                'message' => null,
                'countdown_seconds' => null,
                'scheduled_at' => null,
                'activated_at' => null,
                'updated_by' => $actor->id,
            ])->save();

            $this->broadcast('platform.maintenance.ended', $row, [
                'phase' => self::PHASE_IDLE,
                'message' => 'KAILA is back online.',
            ]);

            return $row->fresh() ?? $row;
        });
    }

    private function activateRow(PlatformMaintenance $row, ?User $actor): PlatformMaintenance
    {
        $activeMessage = $this->activeFacingMessage($row->message);

        $row->fill([
            'phase' => self::PHASE_ACTIVE,
            'enabled' => true,
            'message' => $activeMessage,
            'activated_at' => now(),
            'updated_by' => $actor !== null ? $actor->id : $row->updated_by,
        ])->save();

        $this->broadcast('platform.maintenance.activated', $row, [
            'phase' => self::PHASE_ACTIVE,
            'message' => $activeMessage,
            'activatedAt' => $row->activated_at?->toIso8601String(),
        ]);

        return $row->fresh() ?? $row;
    }

    /** @param array<string, mixed> $data */
    private function broadcast(string $eventType, PlatformMaintenance $row, array $data): void
    {
        app(OutboxRecorder::class)->record(
            $eventType,
            'platform_maintenance',
            (string) $row->getKey(),
            (int) ($row->updated_at?->getTimestamp() ?? time()),
            [
                'broadcast' => 'authenticated',
                'data' => $data,
            ],
        );
    }

    private function normalizeMessage(?string $message): string
    {
        $trimmed = trim((string) $message);
        if ($trimmed === '') {
            return self::DEFAULT_MESSAGE;
        }

        return mb_substr($trimmed, 0, 500);
    }

    private function messageForPhase(PlatformMaintenance $row): ?string
    {
        if ($row->phase === self::PHASE_ACTIVE || $row->enabled) {
            return $this->activeFacingMessage($row->message);
        }

        return $row->message;
    }

    private function activeFacingMessage(?string $message): string
    {
        $trimmed = trim((string) $message);
        if ($trimmed === '' || $this->isPreStartMessage($trimmed)) {
            return self::DEFAULT_ACTIVE_MESSAGE;
        }

        return mb_substr($trimmed, 0, 500);
    }

    private function isPreStartMessage(string $message): bool
    {
        $normalized = mb_strtolower($message);

        return str_contains($normalized, 'finish what you are doing')
            || str_contains($normalized, 'going into maintenance shortly')
            || str_contains($normalized, 'will pause briefly')
            || str_contains($normalized, 'starts soon')
            || $normalized === mb_strtolower(self::DEFAULT_MESSAGE);
    }
}
