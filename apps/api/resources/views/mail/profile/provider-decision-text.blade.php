{{ $approved ? 'Provider profile approved' : 'Provider profile not approved' }}

Hi {{ $name !== '' ? $name : 'there' }},

@if ($approved)
Your provider profile has been approved. It can now appear in KAILA discovery, and you can start connecting with nearby clients.
@else
Your provider profile was not approved yet. Update it and submit it again for review.
@if ($reason)

Reason: {{ $reason }}
@endif
@endif

{{ $approved ? 'View provider profile' : 'Update provider profile' }}:
{{ $appUrl }}/profile

Questions? Email {{ config('kaila.support_email') }}

KAILA — Nearby help, made simple.
