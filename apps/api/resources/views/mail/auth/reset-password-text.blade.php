Reset your KAILA password

Hi {{ $name !== '' ? $name : 'there' }},

We received a request to reset your {{ $isAdministrator ? 'KAILA administrator' : 'KAILA' }} password.

Open this secure link:
{{ $resetUrl }}

This link expires in {{ $expiresInMinutes }} minutes. If you did not request it, you can safely ignore this email.

Questions? Email {{ config('kaila.support_email') }}

KAILA — Nearby help, made simple.
