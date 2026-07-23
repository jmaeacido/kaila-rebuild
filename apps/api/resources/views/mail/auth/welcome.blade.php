<x-mail.layout
    action-label="Explore KAILA"
    :action-url="$appUrl"
    eyebrow="Welcome to KAILA"
    preheader="Your KAILA account is ready."
    title="Nearby help starts here"
>
    <p style="margin:0 0 16px;">
        Hi {{ $name !== '' ? $name : 'there' }}, welcome to KAILA. Your account is ready.
    </p>
    <p style="margin:0;">
        Find trusted local services, post what you need, and connect with people nearby.
        @if ($providerIntent)
            You can also finish your provider profile when you’re ready to offer your services.
        @endif
    </p>

    <x-slot:after>
        <p style="margin:0;color:#667085;font-size:14px;line-height:1.6;">
            KAILA keeps local hiring simple—from finding help to agreeing on the work.
        </p>
    </x-slot:after>
</x-mail.layout>
