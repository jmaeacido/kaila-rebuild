<?php

namespace Tests\Unit;

use App\Support\FcmAccessTokenProvider;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class FcmAccessTokenProviderTest extends TestCase
{
    private string $credentialsPath;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $opensslConfig = dirname(PHP_BINARY).DIRECTORY_SEPARATOR.'extras'.DIRECTORY_SEPARATOR.'ssl'.DIRECTORY_SEPARATOR.'openssl.cnf';
        $keyOptions = ['private_key_bits' => 2048];
        if (is_file($opensslConfig)) {
            $keyOptions['config'] = $opensslConfig;
        }
        $key = openssl_pkey_new($keyOptions);
        openssl_pkey_export($key, $privateKey, null, $keyOptions);
        $this->credentialsPath = tempnam(sys_get_temp_dir(), 'kaila-fcm-');
        file_put_contents($this->credentialsPath, json_encode([
            'project_id' => 'kaila-test',
            'client_email' => 'firebase-adminsdk@kaila-test.iam.gserviceaccount.com',
            'private_key' => $privateKey,
            'token_uri' => 'https://oauth2.googleapis.com/token',
        ], JSON_THROW_ON_ERROR));
        config()->set('services.fcm.access_token', null);
        config()->set('services.fcm.service_account_path', $this->credentialsPath);
    }

    protected function tearDown(): void
    {
        @unlink($this->credentialsPath);
        parent::tearDown();
    }

    public function test_it_exchanges_a_signed_service_account_assertion_and_caches_the_token(): void
    {
        Http::fake(['https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'oauth-token', 'expires_in' => 3600])]);
        $provider = app(FcmAccessTokenProvider::class);

        $this->assertSame('oauth-token', $provider->token());
        $this->assertSame('oauth-token', $provider->token());

        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request['grant_type'] === 'urn:ietf:params:oauth:grant-type:jwt-bearer'
            && substr_count((string) $request['assertion'], '.') === 2);
    }

    public function test_it_rejects_a_missing_service_account_file(): void
    {
        config()->set('services.fcm.service_account_path', '/missing/firebase.json');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('FCM service-account credentials are not configured.');
        app(FcmAccessTokenProvider::class)->token();
    }
}
