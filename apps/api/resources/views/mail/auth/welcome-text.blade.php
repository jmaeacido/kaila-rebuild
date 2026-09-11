Welcome to KAILA

Hi {{ $name !== '' ? $name : 'there' }},

Your KAILA account is ready.

Find local services nearby, post what you need, and connect with people in your community.
@if ($providerIntent)
You can also finish your provider profile when you are ready to offer your services.
@endif

Explore KAILA:
{{ $appUrl }}

Questions? Email {{ config('kaila.support_email') }}

KAILA — Nearby help, made simple.
