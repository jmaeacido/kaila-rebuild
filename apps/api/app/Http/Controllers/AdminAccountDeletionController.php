<?php

namespace App\Http\Controllers;

use App\Models\AccountDeletionRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminAccountDeletionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $outcome = $request->string('outcome')->toString();
        $records = AccountDeletionRecord::query()
            ->when(in_array($outcome, ['completed', 'blocked'], true), fn ($query) => $query->where('outcome', $outcome))
            ->latest()
            ->paginate(25);

        $lastCompletedRaw = AccountDeletionRecord::query()
            ->where('outcome', 'completed')
            ->latest('completed_at')
            ->value('completed_at');

        return response()->json(['data' => [
            'items' => $records->getCollection()->map(fn (AccountDeletionRecord $record): array => [
                'id' => (string) $record->id,
                'reference' => 'DEL-'.strtoupper(substr((string) $record->id, 0, 8)),
                'outcome' => $record->outcome,
                'blockers' => $this->presentBlockers($record->getAttribute('blockers')),
                'requestedAt' => Carbon::parse($record->getAttribute('created_at'))->toIso8601String(),
                'completedAt' => $record->getAttribute('completed_at') === null
                    ? null
                    : Carbon::parse($record->getAttribute('completed_at'))->toIso8601String(),
            ])->values(),
            'summary' => [
                'completed' => AccountDeletionRecord::query()->where('outcome', 'completed')->count(),
                'blocked' => AccountDeletionRecord::query()->where('outcome', 'blocked')->count(),
                'lastCompletedAt' => $lastCompletedRaw === null
                    ? null
                    : Carbon::parse($lastCompletedRaw)->toIso8601String(),
            ],
            'pagination' => ['currentPage' => $records->currentPage(), 'lastPage' => $records->lastPage(), 'total' => $records->total()],
        ]]);
    }

    /**
     * @return list<array{code: string, title: string}>
     */
    private function presentBlockers(mixed $blockers): array
    {
        if (! is_array($blockers)) {
            return [];
        }

        $presented = [];
        foreach ($blockers as $blocker) {
            if (! is_array($blocker)) {
                continue;
            }
            $presented[] = [
                'code' => is_string($blocker['code'] ?? null) ? $blocker['code'] : '',
                'title' => is_string($blocker['title'] ?? null) ? $blocker['title'] : '',
            ];
        }

        return $presented;
    }
}
