<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('community_posts', function (Blueprint $table): void {
            $table->foreignId('area_id')->nullable()->after('area_label')->constrained('areas')->nullOnDelete();
            $table->string('author_display_mode', 16)->default('member')->after('author_user_id');
            $table->timestamp('edited_at')->nullable()->after('published_at');
            $table->unsignedInteger('helpful_count')->default(0);
            $table->unsignedInteger('comments_count')->default(0);
            $table->index(['moderation_status', 'kind', 'published_at']);
        });

        Schema::create('community_post_media', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('community_post_id')->constrained('community_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('disk', 32);
            $table->string('object_key', 512);
            $table->string('original_name', 255);
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size_bytes');
            $table->string('scan_status', 16)->default('pending');
            $table->string('scan_signature')->nullable();
            $table->string('scan_error', 500)->nullable();
            $table->timestamp('scanned_at')->nullable();
            $table->timestamps();
            $table->index(['community_post_id', 'scan_status']);
        });

        Schema::create('community_comments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('community_post_id')->constrained('community_posts')->cascadeOnDelete();
            $table->foreignUuid('parent_comment_id')->nullable()->constrained('community_comments')->nullOnDelete();
            $table->foreignId('author_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->string('moderation_status', 16)->default('published');
            $table->timestamps();
            $table->index(['community_post_id', 'parent_comment_id', 'created_at'], 'community_comments_thread_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_comments');
        Schema::dropIfExists('community_post_media');
        Schema::table('community_posts', function (Blueprint $table): void {
            $table->dropForeign(['area_id']);
            $table->dropIndex(['moderation_status', 'kind', 'published_at']);
            $table->dropColumn(['area_id', 'author_display_mode', 'edited_at', 'helpful_count', 'comments_count']);
        });
    }
};
