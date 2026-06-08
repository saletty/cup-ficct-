<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('horario', function (Blueprint $table) {
            // turno: mañana | tarde | noche (para horarios plantilla y de grupo)
            $table->string('turno', 10)->nullable()->after('aula_nro');

            // Nullable para horarios plantilla (sin grupo asignado todavía)
            $table->string('grupo_id', 20)->nullable()->change();
            $table->string('convocatoria_id', 20)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('horario', function (Blueprint $table) {
            $table->dropColumn('turno');
            $table->string('grupo_id', 20)->nullable(false)->change();
            $table->string('convocatoria_id', 20)->nullable(false)->change();
        });
    }
};
