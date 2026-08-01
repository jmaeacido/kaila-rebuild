<?php

namespace App\Http\Controllers;

use App\Models\AccountDeletionRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAccountDeletionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $outcome = $request->string('outcome')->toString();
        $records = AccountDeletionRecord::query()
            ->when(in_array($outcome, ['completed', 'blocked'], true), fn ($query) => $query->where('outcome', $outcome))
            ->latest()
            ->paginate(25);

        return response()->json(['data' => [
            'items' => $records->map(fn (AccountDeletionRecord $record) => [
                'id' => (string) $record->id,
                'reference' => 'DEL-'.strtoupper(substr((string) $record->id, 0, 8)),
                'outcome' => $record->outcome,
                'blockers' => collect($record->blockers)->map(fn (array $blocker) => ['code' => $blocker['code'], 'title' => $blocker['title']])->values(),
                'requestedAt' => $record->created_at->toIso8601String(),
                'completedAt' => $record->completed_at?->toIso8601String(),
            ])->values(),
            'summary' => [
                'completed' => AccountDeletionRecord::query()->where('outcome', 'completed')->count(),
                'blocked' => AccountDeletionRecord::query()->where('outcome', 'blocked')->count(),
                'lastCompletedAt' => AccountDeletionRecord::query()->where('outcome', 'completed')->max('completed_at'),
            ],
            'pagination' => ['currentPage' => $records->currentPage(), 'lastPage' => $records->lastPage(), 'total' => $records->total()],
        ]]);
    }
}
