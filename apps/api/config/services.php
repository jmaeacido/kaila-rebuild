<?php

return [

    'kaila' => [
        'public_url' => rtrim((string) env('KAILA_PUBLIC_URL', 'http://localhost:3000'), '/'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'brevo' => [
        'key' => env('BREVO_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'fcm' => [
        'transport' => env('FCM_TRANSPORT', 'fake'),
        'project_id' => env('FCM_PROJECT_ID'),
        'access_token' => env('FCM_ACCESS_TOKEN'),
        'service_account_path' => env('FCM_SERVICE_ACCOUNT_PATH'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri' => rtrim((string) env('KAILA_PUBLIC_URL', 'http://localhost:3000'), '/').'/api/v1/auth/social/google/callback',
        'authorize_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
        'token_url' => 'https://oauth2.googleapis.com/token',
        'user_url' => 'https://openidconnect.googleapis.com/v1/userinfo',
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect_uri' => rtrim((string) env('KAILA_PUBLIC_URL', 'http://localhost:3000'), '/').'/api/v1/auth/social/facebook/callback',
        'authorize_url' => 'https://www.facebook.com/'.env('FACEBOOK_GRAPH_VERSION', 'v23.0').'/dialog/oauth',
        'token_url' => 'https://graph.facebook.com/'.env('FACEBOOK_GRAPH_VERSION', 'v23.0').'/oauth/access_token',
        'user_url' => 'https://graph.facebook.com/'.env('FACEBOOK_GRAPH_VERSION', 'v23.0').'/me',
    ],

];
