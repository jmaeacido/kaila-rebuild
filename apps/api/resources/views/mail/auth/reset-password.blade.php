<x-mail.layout
    action-label="Reset password"
    :action-url="$resetUrl"
    :eyebrow="$isAdministrator ? 'KAILA Administration' : 'Your KAILA account'"
    preheader="Secure your KAILA account with a new password."
    title="Choose a new password"
>
    <p style="margin:0;">
        Hi {{ $name !== '' ? $name : 'there' }}, we received a request to reset your KAILA password.
    </p>

    <x-slot:after>
        <p style="margin:0 0 16px;color:#667085;font-size:14px;line-height:1.6;">
            This secure link expires in {{ $expiresInMinutes }} minutes. If you didn’t request it, you can safely ignore this email.
        </p>
        <div style="padding:16px;background:#f7f9fc;border-radius:12px;">
            <p style="margin:0 0 8px;color:#667085;font-size:12px;line-height:1.5;">Button not working? Copy this link:</p>
            <p style="margin:0;word-break:break-all;color:#1463ff;font-size:12px;line-height:1.5;">{{ $resetUrl }}</p>
        </div>
    </x-slot:after>
</x-mail.layout>
