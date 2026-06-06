<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // idx_postulacion_estado — usado por CU21 (Dashboard) para COUNT eficiente
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_postulacion_estado
            ON cup.postulacion(estado_admision)
        ");
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS cup.idx_postulacion_estado");
    }
};
