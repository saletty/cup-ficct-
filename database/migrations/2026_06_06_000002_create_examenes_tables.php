<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * CU17/CU18/CU19 — Exámenes, Asignaciones y Evaluaciones
 *
 * Modificaciones: aula (+ estado, CHECK capacidad > 0)
 * Tablas nuevas:  examen_admision, asignacion_examen, evaluacion
 */
return new class extends Migration
{
    public function up(): void
    {
        /* ── Modificar aula: añadir estado y CHECK capacidad ─────────── */
        if (! Schema::hasColumn('aula', 'estado')) {
            Schema::table('aula', function (Blueprint $table) {
                $table->string('estado', 20)->default('activo')->after('descripcion');
            });

            DB::statement("UPDATE aula SET estado = 'activo'");
        }

        DB::statement("ALTER TABLE aula DROP CONSTRAINT IF EXISTS chk_aula_estado");
        DB::statement("ALTER TABLE aula ADD CONSTRAINT chk_aula_estado
            CHECK (estado IN ('activo','inactivo'))");

        DB::statement("ALTER TABLE aula DROP CONSTRAINT IF EXISTS chk_aula_capacidad");
        DB::statement("ALTER TABLE aula ADD CONSTRAINT chk_aula_capacidad
            CHECK (capacidad > 0)");

        /* ── CU17: Exámenes de admisión ───────────────────────────────── */
        if (! Schema::hasTable('examen_admision')) {
            Schema::create('examen_admision', function (Blueprint $table) {
                $table->id();
                $table->string('descripcion', 200);
                $table->date('fecha');
                $table->time('hora_inicio');
                $table->time('hora_fin');
                $table->string('estado', 20)->default('borrador');
            });

            DB::statement("ALTER TABLE examen_admision ADD CONSTRAINT chk_examen_estado
                CHECK (estado IN ('borrador','programado','finalizado'))");

            DB::statement("ALTER TABLE examen_admision ADD CONSTRAINT chk_examen_horas
                CHECK (hora_fin > hora_inicio)");
        }

        /* ── CU17: Asignación de postulantes a examen + aula ─────────── */
        if (! Schema::hasTable('asignacion_examen')) {
            Schema::create('asignacion_examen', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('examen_id');
                $table->integer('postulante_ci');
                $table->string('aula_nro', 10);

                $table->unique(['examen_id', 'postulante_ci'], 'uq_asig_examen_post');
                $table->foreign('examen_id')->references('id')->on('examen_admision')->onDelete('cascade');
                $table->foreign('postulante_ci')->references('CI')->on('postulante')->onDelete('cascade');
                $table->foreign('aula_nro')->references('nro')->on('aula');
            });
        }

        /* ── CU18/CU19: Evaluaciones (resultados de admisión) ────────── */
        if (! Schema::hasTable('evaluacion')) {
            Schema::create('evaluacion', function (Blueprint $table) {
                $table->id();
                $table->integer('postulante_ci');
                $table->unsignedBigInteger('examen_id');
                // Notas parciales: una por cada sesión de examen
                $table->decimal('nota_examen1', 5, 2); // Computación
                $table->decimal('nota_examen2', 5, 2); // Matemáticas / Inglés
                $table->decimal('nota_examen3', 5, 2); // Física
                $table->decimal('promedio_final', 5, 2)->nullable();
                $table->string('estado_resultado', 20)->nullable();

                $table->unique(['postulante_ci', 'examen_id'], 'uq_eval_post_examen');
                $table->index('postulante_ci', 'idx_evaluacion_post');
                $table->foreign('postulante_ci')->references('CI')->on('postulante')->onDelete('cascade');
                $table->foreign('examen_id')->references('id')->on('examen_admision')->onDelete('cascade');
            });

            DB::statement("ALTER TABLE evaluacion ADD CONSTRAINT chk_eval_nota1
                CHECK (nota_examen1 BETWEEN 0 AND 100)");
            DB::statement("ALTER TABLE evaluacion ADD CONSTRAINT chk_eval_nota2
                CHECK (nota_examen2 BETWEEN 0 AND 100)");
            DB::statement("ALTER TABLE evaluacion ADD CONSTRAINT chk_eval_nota3
                CHECK (nota_examen3 BETWEEN 0 AND 100)");
            DB::statement("ALTER TABLE evaluacion ADD CONSTRAINT chk_eval_estado
                CHECK (estado_resultado IN ('aprobado','reprobado'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluacion');
        Schema::dropIfExists('asignacion_examen');
        Schema::dropIfExists('examen_admision');

        try {
            DB::statement("ALTER TABLE aula DROP CONSTRAINT IF EXISTS chk_aula_estado");
            DB::statement("ALTER TABLE aula DROP CONSTRAINT IF EXISTS chk_aula_capacidad");
        } catch (\Exception $e) {}

        if (Schema::hasColumn('aula', 'estado')) {
            Schema::table('aula', function (Blueprint $table) {
                $table->dropColumn('estado');
            });
        }
    }
};
