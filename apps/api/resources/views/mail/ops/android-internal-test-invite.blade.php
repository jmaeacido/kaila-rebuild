<x-mail.layout
    action-label="Become a tester"
    :action-url="$testUrl"
    eyebrow="Android internal testing"
    preheader="You’re invited to participate in KAILA’s internal testing on Android."
    title="You’re invited to test KAILA"
>
    <p style="margin:0 0 16px;">
        Hi {{ $name !== '' ? $name : 'there' }},
    </p>
    <p style="margin:0 0 16px;">
        You’re invited to participate in KAILA’s internal testing on Android.
    </p>
    <p style="margin:0 0 16px;">
        Please open the link below using the Google account associated with this email address.
        Select <strong>Become a tester</strong>, then download and install KAILA through Google Play.
        Your feedback will help us identify issues and improve the app before its public release.
    </p>
    <p style="margin:0;">
        Thank you for helping us test KAILA!
    </p>

    <x-slot:after>
        <p style="margin:0 0 4px;color:#344054;font-size:14px;line-height:1.6;">
            Best regards,
        </p>
        <p style="margin:0;color:#344054;font-size:14px;line-height:1.6;">
            <strong>{{ $founderName }}</strong><br>
            {{ $founderTitle }}
        </p>
    </x-slot:after>
</x-mail.layout>
