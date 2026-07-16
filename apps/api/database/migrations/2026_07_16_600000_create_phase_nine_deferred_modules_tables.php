<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('direct_conversations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('lower_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('higher_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('requested_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('status', 16)->default('pending');
            $table->unsignedInteger('version')->default(0);
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
            $table->unique(['lower_user_id', 'higher_user_id']);
        });
        Schema::create('direct_messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('direct_conversation_id')->constrained('direct_conversations')->cascadeOnDelete();
            $table->foreignId('sender_user_id')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('sequence');
            $table->text('body_ciphertext');
            $table->unsignedSmallInteger('encryption_key_version');
            $table->string('client_command_id', 100);
            $table->timestamps();
            $table->unique(['direct_conversation_id', 'sequence']);
            $table->unique(['sender_user_id', 'client_command_id']);
        });
        Schema::create('call_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('context_type', 24);
            $table->uuid('context_id');
            $table->foreignId('caller_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('callee_user_id')->constrained('users')->restrictOnDelete();
            $table->string('media', 8);
            $table->string('status', 16)->default('ringing');
            $table->timestamp('answered_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->string('ended_reason', 32)->nullable();
            $table->timestamps();
            $table->index(['context_type', 'context_id']);
        });
        Schema::create('community_posts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('author_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 24)->default('work_story');
            $table->string('title', 120);
            $table->text('body');
            $table->string('area_label', 120)->nullable();
            $table->string('moderation_status', 16)->default('published');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->index(['moderation_status', 'published_at']);
        });
        Schema::create('community_reactions', function (Blueprint $table): void {
            $table->foreignUuid('community_post_id')->constrained('community_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reaction', 16)->default('helpful');
            $table->timestamps();
            $table->primary(['community_post_id', 'user_id']);
        });
        Schema::create('assistant_interactions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('intent', 48);
            $table->json('input_redacted');
            $table->json('response_metadata');
            $table->boolean('escalated')->default(false);
            $table->timestamps();
            $table->index(['intent', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_interactions');
        Schema::dropIfExists('community_reactions');
        Schema::dropIfExists('community_posts');
        Schema::dropIfExists('call_sessions');
        Schema::dropIfExists('direct_messages');
        Schema::dropIfExists('direct_conversations');
    }
};
