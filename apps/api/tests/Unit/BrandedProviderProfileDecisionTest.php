<?php

namespace Tests\Unit;

use App\Models\User;
use App\Notifications\BrandedProviderProfileDecision;
use Illuminate\Contracts\Queue\ShouldQueue;
use Tests\TestCase;

class BrandedProviderProfileDecisionTest extends TestCase
{
    public function test_it_renders_approval_and_rejection_messages(): void
    {
        config(['app.url' => 'https://kaila-app.com']);
        $user = new User(['name' => 'Juan Dela Cruz', 'email' => 'juan@example.test']);

        $approval = new BrandedProviderProfileDecision(true);
        $approvalMail = $approval->toMail($user);
        $this->assertInstanceOf(ShouldQueue::class, $approval);
        $this->assertSame(['mail'], $approval->via($user));
        $this->assertSame('Your KAILA provider profile is approved', $approvalMail->subject);
        $this->assertStringContainsString('You’re ready to offer services', $approvalMail->render());

        $rejection = new BrandedProviderProfileDecision(false, 'Please add more service details.');
        $rejectionMail = $rejection->toMail($user);
        $this->assertSame('Update on your KAILA provider profile', $rejectionMail->subject);
        $this->assertStringContainsString('Please add more service details.', $rejectionMail->render());
    }
}
