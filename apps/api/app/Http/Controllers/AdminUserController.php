<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AdminAccountService;
use App\Support\StaffAuthorization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    public function __construct(private readonly AdminAccountService $accounts) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $this->staff($request);
        abort_unless(StaffAuthorization::canViewAccounts($actor), 403);

        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', 'in:super_admin,admin,staff,user'],
            'status' => ['nullable', 'in:active,deactivated,restricted,deleted'],
            'page' => ['nullable', 'integer', 'min:1'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = User::query()
            ->addSelect([
                'last_activity_at' => DB::table('sessions')
                    ->selectRaw('MAX(last_activity)')
                    ->whereColumn('sessions.user_id', 'users.id'),
            ])
            ->orderByDesc('updated_at');
        if (! empty($data['q'])) {
            $term = '%'.Str::lower($data['q']).'%';
            $query->where(function ($builder) use ($term): void {
                $builder->whereRaw('LOWER(name) like ?', [$term])
                    ->orWhereRaw('LOWER(email) like ?', [$term]);
            });
        }
        if (($data['role'] ?? null) === 'user') {
            $query->whereNull('staff_role');
        } elseif (! empty($data['role'])) {
            $query->where('staff_role', $data['role']);
        }
        if (! empty($data['status'])) {
            $query->where('account_status', $data['status']);
        }

        $page = $query->paginate((int) ($data['perPage'] ?? 25));
        $capabilities = StaffAuthorization::capabilities($actor);

        return response()->json(['data' => [
            'items' => $page->getCollection()->map(fn (User $user) => $this->present($user, $actor))->values(),
            'summary' => [
                'total' => User::query()->count(),
                'staff' => User::query()->whereNotNull('staff_role')->count(),
                'active' => User::query()->where(function ($builder): void {
                    $builder->where('account_status', 'active')->orWhereNull('account_status');
                })->count(),
                'deactivated' => User::query()->where('account_status', 'deactivated')->count(),
            ],
            'capabilities' => $capabilities,
            'viewer' => [
                'id' => (string) $actor->id,
                'staffRole' => $actor->staff_role,
            ],
            'pagination' => [
                'currentPage' => $page->currentPage(),
                'lastPage' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $this->staff($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:72'],
            'accountType' => ['required', 'in:admin,staff,user'],
        ]);

        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'accountType' => $data['accountType'],
            'staffRole' => $data['accountType'] === 'user' ? null : $data['accountType'],
        ];

        $user = $this->accounts->create($actor, $payload);

        return response()->json(['data' => $this->present($user, $actor)], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $actor = $this->staff($request);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'email' => ['sometimes', 'required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8', 'max:72'],
            'accountType' => ['sometimes', 'required', 'in:admin,staff,user'],
        ]);

        $updated = $this->accounts->update($actor, $user, $data);

        return response()->json(['data' => $this->present($updated, $actor)]);
    }

    public function setStatus(Request $request, User $user): JsonResponse
    {
        $actor = $this->staff($request);
        $data = $request->validate([
            'accountStatus' => ['required', 'in:active,deactivated,restricted,deleted'],
        ]);

        $updated = $this->accounts->setStatus($actor, $user, $data['accountStatus']);

        return response()->json(['data' => $this->present($updated, $actor)]);
    }

    public function activate(Request $request, User $user): JsonResponse
    {
        $actor = $this->staff($request);
        $updated = $this->accounts->activate($actor, $user);

        return response()->json(['data' => $this->present($updated, $actor)]);
    }

    public function deactivate(Request $request, User $user): JsonResponse
    {
        $actor = $this->staff($request);
        $updated = $this->accounts->deactivate($actor, $user);

        return response()->json(['data' => $this->present($updated, $actor)]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $actor = $this->staff($request);
        $updated = $this->accounts->delete($actor, $user);

        return response()->json(['data' => $this->present($updated, $actor)]);
    }

    /** @return array<string, mixed> */
    private function present(User $user, User $actor): array
    {
        $status = $user->account_status ?: 'active';
        $role = $user->staff_role ?: 'user';
        $rawStatusUpdatedAt = $user->getAttributes()['status_updated_at'] ?? null;

        return [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'staffRole' => $role,
            'accountStatus' => $status,
            'isSelf' => $actor->is($user),
            'createdAt' => $user->created_at?->toIso8601String(),
            'lastActiveAt' => is_numeric($user->getAttribute('last_activity_at'))
                ? Carbon::createFromTimestamp((int) $user->getAttribute('last_activity_at'))->toIso8601String()
                : null,
            'updatedAt' => $user->updated_at?->toIso8601String(),
            'statusUpdatedAt' => is_string($rawStatusUpdatedAt) && $rawStatusUpdatedAt !== ''
                ? Carbon::parse($rawStatusUpdatedAt)->toIso8601String()
                : null,
            'actions' => [
                'canEdit' => StaffAuthorization::canEdit($actor, $user),
                'canActivate' => StaffAuthorization::canChangeStatus($actor, $user) && in_array($status, ['deactivated', 'restricted'], true),
                'canDeactivate' => StaffAuthorization::canChangeStatus($actor, $user) && $status === 'active',
                'canRestrict' => StaffAuthorization::canChangeStatus($actor, $user) && in_array($status, ['active', 'deactivated'], true),
                'canDelete' => StaffAuthorization::canDelete($actor, $user) && $status !== 'deleted',
                'canDrag' => StaffAuthorization::canChangeStatus($actor, $user) && $status !== 'deleted',
            ],
        ];
    }

    private function staff(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User && StaffAuthorization::canAccessOperations($user), 403);

        return $user;
    }
}
