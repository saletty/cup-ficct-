<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /* ── CU6: Bitácora del sistema ─────────────────────────────── */
        if (! Schema::hasTable('bitacora')) {
            Schema::create('bitacora', function (Blueprint $table) {
                $table->id();
                $table->string('accion', 255);
                $table->timestamp('fecha')->useCurrent();
                $table->string('ip', 45)->nullable();
                $table->integer('usuario_ci')->nullable();
                $table->foreign('usuario_ci')->references('CI')->on('usuario')->nullOnDelete();
            });
        }

        /* ── CU9: Campo promedio de bachillerato ───────────────────── */
        if (! Schema::hasColumn('postulante', 'promedio_bachiller')) {
            Schema::table('postulante', function (Blueprint $table) {
                $table->decimal('promedio_bachiller', 5, 2)->nullable();
            });
        }

        /* ── CU10: Convocatoria ────────────────────────────────────── */
        if (! Schema::hasTable('convocatoria')) {
            Schema::create('convocatoria', function (Blueprint $table) {
                $table->string('id', 10)->primary();   // Ej: '1-2026'
                $table->string('nombre', 100);
                $table->date('fecha_inicio');
                $table->date('fecha_fin');
                $table->string('estado', 20)->default('activa');  // activa | cerrada
                $table->integer('cupo_maximo')->default(0);
            });

            DB::table('convocatoria')->insert([
                'id'          => '1-2026',
                'nombre'      => 'Primer Semestre 2026',
                'fecha_inicio' => '2026-01-05',
                'fecha_fin'   => '2026-03-13',
                'estado'      => 'activa',
                'cupo_maximo' => 1000,
            ]);
        }

        /* ── CU10: Postulación (inscripción al CUP) ────────────────── */
        if (! Schema::hasTable('postulacion')) {
            Schema::create('postulacion', function (Blueprint $table) {
                $table->id();
                $table->integer('postulante_ci');
                $table->string('convocatoria_id', 10);
                $table->string('carrera_opcion1_id', 10);
                $table->string('carrera_opcion2_id', 10)->nullable();
                $table->string('estado_admision', 30)->default('pendiente');
                $table->timestamp('fecha_registro')->useCurrent();

                $table->unique(['postulante_ci', 'convocatoria_id']);

                $table->foreign('postulante_ci')->references('CI')->on('postulante')->onDelete('cascade');
                $table->foreign('convocatoria_id')->references('id')->on('convocatoria');
                $table->foreign('carrera_opcion1_id')->references('id')->on('carrera');
                $table->foreign('carrera_opcion2_id')->references('id')->on('carrera');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('postulacion');
        Schema::dropIfExists('convocatoria');
        Schema::dropIfExists('bitacora');
        Schema::table('postulante', function (Blueprint $table) {
            $table->dropColumn('promedio_bachiller');
        });
    }
};
