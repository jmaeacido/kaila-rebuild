<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * @property int $id
 * @property int $user_id
 * @property string|null $welcome_community_post_id
 * @property string $display_name
 * @property string|null $rating
 * @property int $completed_jobs
 * @property int|null $response_minutes
 * @property string $status
 * @property string|null $review_note
 * @property int|null $reviewed_by
 * @property array<string, mixed>|null $review_baseline
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $created_at
 * @property Collection<int, ProviderCredential> $credentials
 * @property-read User|null $user
 * @property-read User|null $reviewer
 */
class ProviderProfile extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['rating' => 'decimal:2', 'offers_at_shop' => 'boolean', 'shop_latitude' => 'decimal:7', 'shop_longitude' => 'decimal:7', 'reviewed_at' => 'datetime', 'review_baseline' => 'array'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /** @return BelongsToMany<ServiceCategory, $this> */
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(ServiceCategory::class, 'provider_services');
    }

    /** @return BelongsToMany<Area, $this> */
    public function serviceAreas(): BelongsToMany
    {
        return $this->belongsToMany(Area::class, 'provider_service_areas');
    }

    /** @return HasMany<ProviderAvailability, $this> */
    public function availability(): HasMany
    {
        return $this->hasMany(ProviderAvailability::class);
    }

    /** @return HasMany<ProviderCredential, $this> */
    public function credentials(): HasMany
    {
        return $this->hasMany(ProviderCredential::class);
    }

    /** @return HasMany<ProfileAsset, $this> */
    public function portfolio(): HasMany
    {
        return $this->hasMany(ProfileAsset::class, 'user_id', 'user_id')->where('purpose', 'portfolio')->where('scan_status', 'clean')->orderBy('sort_order');
    }

    public function completedJobsCount(): int
    {
        return (int) DB::table('accepted_offer_snapshots')
            ->join('service_jobs', 'service_jobs.id', '=', 'accepted_offer_snapshots.service_job_id')
            ->where('accepted_offer_snapshots.provider_profile_id', $this->id)
            ->whereNotNull('service_jobs.completed_at')
            ->count();
    }

    /**
     * Typical first-offer response time in minutes (median of recent samples).
     * Measured from opportunity match to the provider's first offer revision.
     */
    public function computeResponseMinutes(): ?int
    {
        $samples = DB::table('offer_threads')
            ->join('offer_revisions', function ($join): void {
                $join->on('offer_revisions.offer_thread_id', '=', 'offer_threads.id')
                    ->where('offer_revisions.revision_number', 1);
            })
            ->join('job_opportunities', function ($join): void {
                $join->on('job_opportunities.service_job_id', '=', 'offer_threads.service_job_id')
                    ->on('job_opportunities.provider_profile_id', '=', 'offer_threads.provider_profile_id');
            })
            ->where('offer_threads.provider_profile_id', $this->id)
            ->whereNotNull('job_opportunities.created_at')
            ->whereNotNull('offer_revisions.created_at')
            ->orderByDesc('offer_revisions.created_at')
            ->limit(20)
            ->get([
                'job_opportunities.created_at as opportunity_created_at',
                'offer_revisions.created_at as offer_created_at',
            ]);

        if ($samples->isEmpty()) {
            return null;
        }

        $sorted = $samples
            ->map(static function (object $sample): int {
                $opportunityAt = Carbon::parse($sample->opportunity_created_at);
                $offerAt = Carbon::parse($sample->offer_created_at);

                return max(1, (int) $opportunityAt->diffInMinutes($offerAt, false));
            })
            ->sort()
            ->values();
        $count = $sorted->count();
        $middle = intdiv($count, 2);

        if ($count % 2 === 1) {
            return $sorted[$middle];
        }

        return (int) round(($sorted[$middle - 1] + $sorted[$middle]) / 2);
    }

    public function refreshResponseMinutes(): ?int
    {
        $minutes = $this->computeResponseMinutes();
        if ($minutes === $this->response_minutes) {
            return $minutes;
        }

        $this->forceFill(['response_minutes' => $minutes])->save();

        return $minutes;
    }
}
