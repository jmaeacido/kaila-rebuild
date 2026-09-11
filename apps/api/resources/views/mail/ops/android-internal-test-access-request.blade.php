<x-mail.layout
    action-label="Open Early Access queue"
    :action-url="$adminEarlyAccessUrl"
    eyebrow="Android early access"
    preheader="Someone requested KAILA Android closed testing access."
    title="New Android early access request"
>
    <p style="margin:0 0 16px;">
        Someone requested early access to KAILA’s Android closed testing on Google Play.
    </p>
    <p style="margin:0 0 8px;color:#344054;font-size:14px;line-height:1.6;">
        <strong>Name:</strong> {{ $requesterName }}
    </p>
    <p style="margin:0 0 8px;color:#344054;font-size:14px;line-height:1.6;">
        <strong>Google account email:</strong>
        <a href="mailto:{{ $requesterEmail }}" style="color:#1463ff;text-decoration:none;">{{ $requesterEmail }}</a>
    </p>
    <p style="margin:0 0 16px;color:#344054;font-size:14px;line-height:1.6;">
        <strong>Submitted:</strong> {{ $submittedAt }}
    </p>
    @if (filled($note))
        <p style="margin:0 0 8px;color:#344054;font-size:14px;line-height:1.6;">
            <strong>Note:</strong>
        </p>
        <p style="margin:0 0 16px;white-space:pre-wrap;color:#344054;font-size:14px;line-height:1.6;">{{ $note }}</p>
    @endif
    <p style="margin:0 0 16px;">
        Review and invite them from <strong>Admin → Early access</strong>.
        Reply to this message to contact the requester directly.
    </p>
    <p style="margin:0;color:#344054;font-size:14px;line-height:1.6;">
        Play closed testing:
        <a href="{{ $playTestUrl }}" style="color:#1463ff;text-decoration:none;">{{ $playTestUrl }}</a>
    </p>
</x-mail.layout>
