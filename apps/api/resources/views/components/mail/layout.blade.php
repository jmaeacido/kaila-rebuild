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
</head>
<body style="margin:0;background:#f7f9fc;color:#0a1220;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        {{ $preheader }}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f7f9fc;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e6eaf0;border-radius:16px;box-shadow:0 2px 8px rgba(10,18,32,.08);overflow:hidden;">
                    <tr>
                        <td aria-hidden="true" style="height:8px;background:#1463ff;"></td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <a href="{{ rtrim((string) config('app.url'), '/') }}" style="display:inline-block;margin:0 0 32px;text-decoration:none;">
                                <img src="{{ rtrim((string) config('app.url'), '/') }}/brand/kaila-wordmark.png" width="142" alt="KAILA" style="display:block;width:142px;max-width:100%;height:auto;border:0;">
                            </a>
                            <p style="margin:0 0 8px;color:#1463ff;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">
                                {{ $eyebrow }}
                            </p>
                            <h1 style="margin:0 0 16px;color:#0a1220;font-size:28px;line-height:1.2;font-weight:700;">{{ $title }}</h1>
                            <div style="color:#344054;font-size:16px;line-height:1.6;">
                                {{ $slot }}
                            </div>
                            @if ($actionUrl && $actionLabel)
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                                    <tr>
                                        <td align="center" bgcolor="#1463ff" style="border-radius:14px;">
                                            <a href="{{ $actionUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-size:16px;font-weight:700;line-height:1.2;text-decoration:none;">
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
                        <td style="padding:20px 32px;background:#f7f9fc;color:#667085;font-size:12px;line-height:1.5;">
                            KAILA · Nearby help, made simple.<br>
                            <a href="{{ rtrim((string) config('app.url'), '/') }}" style="color:#1463ff;text-decoration:none;">kaila-app.com</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
