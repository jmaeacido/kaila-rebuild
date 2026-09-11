<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'mfa_secret')) {
                $table->text('mfa_secret')->nullable()->after('remember_token');
                $table->timestamp('mfa_confirmed_at')->nullable()->after('mfa_secret');
                $table->json('mfa_recovery_codes')->nullable()->after('mfa_confirmed_at');
            }
        });

        Schema::table('identity_verifications', function (Blueprint $table): void {
            if (! Schema::hasColumn('identity_verifications', 'consent_purpose')) {
                $table->string('consent_purpose', 255)->nullable()->after('status');
                $table->string('consent_version', 64)->nullable()->after('consent_purpose');
            }
        });

        Schema::table('identity_verification_consents', function (Blueprint $table): void {
            if (! Schema::hasColumn('identity_verification_consents', 'consent_version')) {
                $table->string('consent_version', 64)->nullable()->after('notice_version');
                $table->string('purpose_statement', 512)->nullable()->after('purpose');
            }
        });

        Schema::table('identity_evidence', function (Blueprint $table): void {
            if (! Schema::hasColumn('identity_evidence', 'encrypted_at_rest')) {
                $table->boolean('encrypted_at_rest')->default(false)->after('disk');
                $table->timestamp('legal_hold_at')->nullable()->after('purged_at');
                $table->string('legal_hold_id', 36)->nullable()->index()->after('legal_hold_at');
            }
        });

        if (! Schema::hasTable('identity_legal_holds')) {
            Schema::create('identity_legal_holds', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('identity_verification_id')->constrained()->cascadeOnDelete();
                $table->foreignId('authorized_by')->constrained('users')->cascadeOnDelete();
                $table->string('case_reference', 128);
                $table->string('reason', 255);
                $table->timestamp('starts_at');
                $table->timestamp('review_at')->nullable();
                $table->timestamp('released_at')->nullable();
                $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('release_reason', 255)->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('identity_deletion_tombstones')) {
            Schema::create('identity_deletion_tombstones', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('identity_evidence_id')->unique();
                $table->uuid('identity_verification_id')->index();
                $table->string('disk', 48);
                $table->string('object_key', 255);
                $table->timestamp('purged_at');
                $table->timestamps();
            });
        }

        // Append-only enforcement for audit_events is implemented in App\Models\AuditEvent
        // (Eloquent updating/deleting guards). DB triggers are omitted on this host.
    }

    public function down(): void
    {
        Schema::dropIfExists('identity_deletion_tombstones');
        Schema::dropIfExists('identity_legal_holds');

        Schema::table('identity_evidence', function (Blueprint $table): void {
            $table->dropColumn(['encrypted_at_rest', 'legal_hold_at', 'legal_hold_id']);
        });

        Schema::table('identity_verification_consents', function (Blueprint $table): void {
            $table->dropColumn(['consent_version', 'purpose_statement']);
        });

        Schema::table('identity_verifications', function (Blueprint $table): void {
            $table->dropColumn(['consent_purpose', 'consent_version']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['mfa_secret', 'mfa_confirmed_at', 'mfa_recovery_codes']);
        });
    }
};
