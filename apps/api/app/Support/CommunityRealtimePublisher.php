<?php

namespace App\Support;

use App\Models\CommunityPost;
use App\Models\User;

class CommunityRealtimePublisher
{
    public function __construct(
        private readonly OutboxRecorder $outbox,
        private readonly CommunityEngagementService $engagement,
        private readonly CommunityMentionService $mentions,
        private readonly NotificationService $notifications,
    ) {}

    /** @param array<string, mixed> $data */
    public function publish(
        string $eventType,
        CommunityPost $post,
        User $actor,
        array $data = [],
        bool $broadcastFeed = true,
        bool $notifyEngaged = true,
    ): void {
        $version = (int) now()->format('U');
        $payload = ['postId' => $post->id] + $data;

        if ($broadcastFeed) {
            $this->outbox->record(
                $eventType,
                'community_post',
                $post->id,
                $version,
                ['broadcast' => 'authenticated', 'data' => $payload],
            );
        }

        if ($notifyEngaged) {
            $this->notifyEngaged($post, $actor, $eventType, $payload);
        }
    }

    public function publishFeedRefresh(User $recipient, CommunityPost $post): void
    {
        $this->outbox->record(
            'community.post.updated',
            'community_post',
            $post->id,
            (int) now()->format('U'),
            [
                'recipientUserIds' => [(string) $recipient->id],
                'data' => ['postId' => $post->id, 'action' => 'feed_refresh'],
            ],
        );
    }

    public function notifyMention(
        CommunityPost $post,
        User $actor,
        int $mentionedUserId,
        string $surface,
        ?string $commentId = null,
        bool $dedupeEngagedRecipients = false,
    ): void {
        if ($mentionedUserId === (int) $actor->id) {
            return;
        }

        if (in_array($mentionedUserId, $this->mentions->blockedUserIds((int) $actor->id), true)) {
            return;
        }

        if ($dedupeEngagedRecipients) {
            $engagedRecipients = $this->engagement->notificationRecipients($post, (int) $actor->id);
            if (in_array($mentionedUserId, $engagedRecipients, true)) {
                return;
            }
        }

        [$title, $body] = $this->mentionNotificationCopy($actor, $post, $surface);
        $payload = ['postId' => $post->id, 'mentionedUserId' => $mentionedUserId, 'surface' => $surface];
        if ($commentId !== null) {
            $payload['commentId'] = $commentId;
        }

        $this->notifications->send(
            $mentionedUserId,
            'community.mention.created',
            $title,
            $body,
            'community_post',
            $post->id,
            $payload,
            'routine',
        );
    }

    /** @return array{0: string, 1: string} */
    private function mentionNotificationCopy(User $actor, CommunityPost $post, string $surface): array
    {
        $name = $actor->name;
        $postTitle = mb_strlen($post->title) > 60 ? mb_substr($post->title, 0, 57).'…' : $post->title;

        return match ($surface) {
            'comment' => ['You were mentioned', "{$name} mentioned you in a comment on \"{$postTitle}\"."],
            'reply' => ['You were mentioned', "{$name} mentioned you in a reply on \"{$postTitle}\"."],
            default => ['You were mentioned', "{$name} mentioned you in \"{$postTitle}\"."],
        };
    }

    /** @param array<string, mixed> $data */
    private function notifyEngaged(CommunityPost $post, User $actor, string $eventType, array $data): void
    {
        foreach ($this->engagement->notificationRecipients($post, $actor->id) as $userId) {
            [$title, $body] = $this->notificationCopy($eventType, $actor, $post, $data);
            $this->notifications->send(
                $userId,
                $eventType,
                $title,
                $body,
                'community_post',
                $post->id,
                ['postId' => $post->id] + $data,
                'routine',
            );
        }
    }

    /** @param array<string, mixed> $data
     * @return array{0: string, 1: string}
     */
    private function notificationCopy(string $eventType, User $actor, CommunityPost $post, array $data): array
    {
        $name = $actor->name;
        $postTitle = mb_strlen($post->title) > 60 ? mb_substr($post->title, 0, 57).'…' : $post->title;

        return match ($eventType) {
            'community.post.updated' => isset($data['action']) && $data['action'] === 'helpful'
                ? ['Marked helpful', "{$name} found \"{$postTitle}\" helpful."]
                : (isset($data['action']) && $data['action'] === 'unhelpful'
                    ? ['Helpful removed', "{$name} removed their helpful mark on \"{$postTitle}\"."]
                    : (isset($data['action']) && $data['action'] === 'media_updated'
                        ? ['Photos updated', "New photos were added to \"{$postTitle}\"."]
                        : ['Community post updated', "{$name} updated \"{$postTitle}\"."])),
            'community.post.deleted' => ['Community post removed', "\"{$postTitle}\" is no longer available."],
            'community.comment.created' => isset($data['replyToCommentId'])
                ? ['New reply in Community', "{$name} replied in a thread on \"{$postTitle}\"."]
                : ['New comment in Community', "{$name} commented on \"{$postTitle}\"."],
            'community.comment.updated' => ['Comment updated', "{$name} edited a comment on \"{$postTitle}\"."],
            'community.comment.deleted' => ['Comment removed', "A comment on \"{$postTitle}\" was removed."],
            default => ['Community update', "There is new activity on \"{$postTitle}\"."],
        };
    }
}
