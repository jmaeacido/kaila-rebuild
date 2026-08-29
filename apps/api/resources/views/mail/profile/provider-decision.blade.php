<x-mail.layout
    :action-label="$approved ? 'View provider profile' : 'Update provider profile'"
    :action-url="$appUrl.'/profile'"
    :eyebrow="$approved ? 'Provider profile approved' : 'Provider profile not approved'"
    :preheader="$approved ? 'You can now offer your services on KAILA.' : 'Your provider profile needs changes.'"
    :title="$approved ? 'You’re ready to offer services' : 'Your profile needs an update'"
>
    <p style="margin:0 0 16px;">
        Hi {{ $name !== '' ? $name : 'there' }},
        @if ($approved)
            your provider profile has been approved. It can now appear in KAILA discovery, and you can start connecting with nearby clients.
        @else
            your provider profile was not approved yet. Update it and submit it again for review.
        @endif
    </p>
    @if (! $approved && $reason)
        <p style="margin:0;"><strong>Reason:</strong> {{ $reason }}</p>
    @endif

    <x-slot:after>
        <p style="margin:0;color:#667085;font-size:14px;line-height:1.6;">
            @if ($approved)
                Keep your availability, service area, and portfolio current so clients know when and how you can help.
            @else
                Need help with the requested changes? Contact KAILA support.
            @endif
        </p>
    </x-slot:after>
</x-mail.layout>
