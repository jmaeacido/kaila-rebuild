<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Notifications\BrandedResetPassword;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable([
    'legacy_id',
    'name',
    'email',
    'password',
    'terms_accepted_version',
    'privacy_accepted_version',
    'provider_intent',
    'active_mode',
    'is_admin',
    'role',
    'area',
    'category',
    'username',
    'contact_number',
    'messenger_link',
    'preferred_contact_channel',
    'best_contact_time',
    'data_privacy_consent',
    'deleted_at',
    'auth_provider',
    'auth_subject',
    'social_photo_url',
    'account_status',
    'status_updated_at',
    'banned_at',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new BrandedResetPassword($token));
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'provider_intent' => 'boolean',
            'is_admin' => 'boolean',
        ];
    }
}
