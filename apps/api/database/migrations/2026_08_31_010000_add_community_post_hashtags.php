<?php

use App\Models\CommunityPost;
use App\Support\CommunityHashtagParser;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('community_posts', 'hashtags')) {
            Schema::table('community_posts', function (Blueprint $table): void {
                $table->json('hashtags')->nullable()->after('body');
            });
        }

        $parser = new CommunityHashtagParser;
        CommunityPost::query()->whereNull('hashtags')->orderBy('id')->each(function (CommunityPost $post) use ($parser): void {
            $parsed = $parser->apply($post->body);
            if ($parsed['tags'] === [] && $parsed['body'] === $post->body) {
                $post->update(['hashtags' => []]);

                return;
            }

            $post->update(['body' => $parsed['body'], 'hashtags' => $parsed['tags']]);
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('community_posts', 'hashtags')) {
            Schema::table('community_posts', function (Blueprint $table): void {
                $table->dropColumn('hashtags');
            });
        }
    }
};
