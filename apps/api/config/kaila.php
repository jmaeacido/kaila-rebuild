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

];
