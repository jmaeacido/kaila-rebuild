<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Support inbox
    |--------------------------------------------------------------------------
    |
    | User-facing help address shown in branded email footers and public
    | contact surfaces. Must receive inbound mail (forwarder), separate from
    | the transactional MAIL_FROM_ADDRESS sender.
    |
    */

    'support_email' => env('SUPPORT_EMAIL', 'support@kaila-app.com'),

    /*
    |--------------------------------------------------------------------------
    | Android Play internal testing
    |--------------------------------------------------------------------------
    |
    | Used by the Admin “Send Android test invite” branded email. Keep the
    | Play Console internal-test URL here so copy stays consistent.
    |
    */

    'android_internal_test_url' => env(
        'ANDROID_INTERNAL_TEST_URL',
        'https://play.google.com/apps/internaltest/4701403150708602285',
    ),

    'founder_name' => env('KAILA_FOUNDER_NAME', 'John Mark Agustin E. Acido'),

    'founder_title' => env('KAILA_FOUNDER_TITLE', 'KAILA Founder'),

];
