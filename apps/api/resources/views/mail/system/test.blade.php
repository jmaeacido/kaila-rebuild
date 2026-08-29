<x-mail.layout
    action-label="Open KAILA"
    :action-url="$appUrl"
    eyebrow="KAILA email check"
    preheader="Your KAILA email configuration is working."
    title="Your email is working"
>
    <p style="margin:0 0 16px;">
        This KAILA-branded message was delivered through the configured transactional mail service.
    </p>
    <p style="margin:0;">
        Account updates, support messages, and other notifications will use this trusted KAILA identity.
    </p>

    <x-slot:after>
        <p style="margin:0;color:#667085;font-size:14px;line-height:1.6;">
            No action is needed. This message is only a delivery check.
        </p>
    </x-slot:after>
</x-mail.layout>
