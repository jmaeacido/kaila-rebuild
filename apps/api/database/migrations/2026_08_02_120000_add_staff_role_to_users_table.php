<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('staff_role', 32)->nullable()->after('is_admin');
            $table->index('staff_role');
        });

        DB::table('users')->where('is_admin', true)->whereNull('staff_role')->update([
            'staff_role' => 'admin',
            'updated_at' => now(),
        ]);

        DB::table('users')->where('email', 'jacido94@yahoo.com')->update([
            'staff_role' => 'super_admin',
            'is_admin' => true,
            'account_status' => 'active',
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['staff_role']);
            $table->dropColumn('staff_role');
        });
    }
};
