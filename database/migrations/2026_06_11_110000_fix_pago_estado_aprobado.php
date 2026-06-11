<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // El estado 'aprobado' no existe en el flujo de pagos — se migra a 'verificado'
        DB::table('pago')->where('estado_pago', 'aprobado')->update(['estado_pago' => 'verificado']);

        DB::statement('ALTER TABLE pago DROP CONSTRAINT IF EXISTS chk_pago_estado');
        DB::statement("ALTER TABLE pago ADD CONSTRAINT chk_pago_estado
            CHECK (estado_pago IN ('pendiente','verificado','rechazado'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE pago DROP CONSTRAINT IF EXISTS chk_pago_estado');
        DB::statement("ALTER TABLE pago ADD CONSTRAINT chk_pago_estado
            CHECK (estado_pago IN ('pendiente','verificado','aprobado','rechazado'))");
    }
};
