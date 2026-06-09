<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('tipo_pago', 'nombre')) {
            Schema::table('tipo_pago', function (Blueprint $table) {
                $table->string('nombre', 100)->nullable()->after('id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('tipo_pago', function (Blueprint $table) {
            $table->dropColumn('nombre');
        });
    }
};
