{{ $isCorrection ? 'Correction: KAILA Android testing link' : "You're invited to test KAILA on Android" }}

Hi {{ $name !== '' ? $name : 'there' }},

@if ($isCorrection)
Our earlier invitation included the wrong Google Play testing link. We're sorry for the confusion. Please use the corrected link below to join KAILA's closed test.
@else
You're invited to participate in KAILA's closed testing on Android.
@endif

Please open the link below using the Google account associated with this email address:

{{ $testUrl }}

Select Become a tester, then download and install KAILA through Google Play. Your feedback will help us identify issues and improve the app before its public release.

Thank you for helping us test KAILA!

Best regards,
{{ $founderName }}
{{ $founderTitle }}

Questions? Email {{ config('kaila.support_email') }}

KAILA — Nearby help, made simple.
