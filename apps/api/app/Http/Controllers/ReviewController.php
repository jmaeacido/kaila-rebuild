<?php

namespace App\Http\Controllers;

use App\Models\JobReview;
use App\Models\ServiceJob;
use App\Models\User;
use App\Support\HiredJobAccess;
use App\Support\JobLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function __construct(private readonly JobLifecycleService $lifecycle, private readonly HiredJobAccess $access) {}

    public function index(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $this->access->requireParticipant($serviceJob, $user);
        $data = [];
        foreach (JobReview::query()->where('service_job_id', $serviceJob->id)->where(fn ($query) => $query->whereNotNull('published_at')->orWhere('author_user_id', $user->id))->get() as $review) {
            $visible = $review->author_user_id === $user->id || $review->published_at !== null;
            $data[] = ['id' => $review->id, 'mine' => $review->author_user_id === $user->id, 'rating' => $visible ? $review->rating : null, 'comment' => $visible ? $review->comment : null, 'publishedAt' => $review->published_at?->toIso8601String()];
        }

        return response()->json(['data' => $data]);
    }

    public function store(Request $request, ServiceJob $serviceJob): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $data = $request->validate(['rating' => 'required|integer|between:1,5', 'comment' => 'nullable|string|max:2000']);
        $review = $this->lifecycle->submitReview($serviceJob, $user, $data['rating'], $data['comment'] ?? null);

        return response()->json(['data' => ['id' => $review->id, 'publishedAt' => $review->published_at]], 201);
    }
}
