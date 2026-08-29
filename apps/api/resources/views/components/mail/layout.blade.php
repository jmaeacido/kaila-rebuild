@props([
    'actionLabel' => null,
    'actionUrl' => null,
    'eyebrow' => 'KAILA',
    'preheader',
    'title',
])
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>{{ $title }}</title>
    <style>
        @media only screen and (max-width: 600px) {
            .kaila-shell { padding: 16px 8px !important; }
            .kaila-card { border-radius: 12px !important; }
            .kaila-content { padding: 24px 20px !important; }
            .kaila-footer { padding: 20px !important; }
            .kaila-title { font-size: 24px !important; }
            .kaila-button-table { width: 100% !important; }
            .kaila-button-cell, .kaila-button { display: block !important; }
            .kaila-button { padding: 14px 16px !important; text-align: center !important; }
        }
    </style>
</head>
<body style="margin:0;background:#f7f9fc;color:#0a1220;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        {{ $preheader }}
    </div>
    <div style="display:none;max-height:0;overflow:hidden;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f7f9fc;">
        <tr>
            <td class="kaila-shell" align="center" style="padding:32px 16px;">
                <table class="kaila-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e6eaf0;border-radius:16px;box-shadow:0 2px 8px rgba(10,18,32,.08);overflow:hidden;">
                    <tr>
                        <td aria-hidden="true" style="height:8px;background:#1463ff;background-image:linear-gradient(90deg,#1463ff,#27b7ff);font-size:0;line-height:0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td class="kaila-content" style="padding:32px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 32px;">
                                <tr>
                                    <td style="padding:0 12px 0 0;vertical-align:middle;">
                                        <a href="{{ rtrim((string) config('app.url'), '/') }}" style="display:block;text-decoration:none;" aria-label="Visit KAILA">
                                            <img src="{{ rtrim((string) config('app.url'), '/') }}/brand/kaila-bull-app-icon-v2.png" width="56" height="56" alt="KAILA bull mascot" style="display:block;width:56px;height:56px;border:0;border-radius:14px;color:#1463ff;font-size:12px;">
                                        </a>
                                    </td>
                                    <td style="vertical-align:middle;">
                                        <a href="{{ rtrim((string) config('app.url'), '/') }}" style="display:block;text-decoration:none;" aria-label="Visit KAILA">
                                            <img src="{{ rtrim((string) config('app.url'), '/') }}/brand/kaila-wordmark.png" width="142" alt="KAILA" style="display:block;width:142px;max-width:100%;height:auto;border:0;color:#0a1220;font-size:24px;font-weight:700;">
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:0 0 8px;color:#1463ff;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">
                                {{ $eyebrow }}
                            </p>
                            <h1 class="kaila-title" style="margin:0 0 16px;color:#0a1220;font-size:28px;line-height:1.2;font-weight:700;">{{ $title }}</h1>
                            <div style="color:#344054;font-size:16px;line-height:1.6;">
                                {{ $slot }}
                            </div>
                            @if ($actionUrl && $actionLabel)
                                <table class="kaila-button-table" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                                    <tr>
                                        <td class="kaila-button-cell" align="center" bgcolor="#1463ff" style="border-radius:14px;">
                                            <a class="kaila-button" href="{{ $actionUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-size:16px;font-weight:700;line-height:1.2;text-decoration:none;">
                                                {{ $actionLabel }}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            @endif
                            @isset($after)
                                {{ $after }}
                            @endisset
                        </td>
                    </tr>
                    <tr>
                        <td class="kaila-footer" style="padding:20px 32px;background:#f7f9fc;color:#667085;font-size:12px;line-height:1.5;">
                            <strong style="color:#344054;">KAILA</strong> · Nearby help, made simple.<br>
                            Questions? Email
                            <a href="mailto:{{ config('kaila.support_email') }}" style="color:#1463ff;text-decoration:none;font-weight:600;">{{ config('kaila.support_email') }}</a>
                            or visit
                            <a href="{{ rtrim((string) config('app.url'), '/') }}" style="color:#1463ff;text-decoration:none;">KAILA online</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
