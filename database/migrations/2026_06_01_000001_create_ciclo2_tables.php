<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ciclo #2 — CU11..CU14
 *
 * Tablas nuevas: docente, materia, aula, grupo, horario, asignacion_docente
 * Alteración:   convocatoria → estados ['habilitada','finalizada'] + CHECK fechas
 */
return new class extends Migration
{
    public function up(): void
    {
        /* ── CU11: Ajustar convocatoria ──────────────────────────────── */

        // 1. Primero migrar datos existentes con el valor antiguo
        DB::table('convocatoria')
            ->whereNotIn('estado', ['habilitada', 'finalizada'])
            ->update(['estado' => 'habilitada']);

        // 2. Cambiar el default de la columna
        Schema::table('convocatoria', function (Blueprint $table) {
            $table->string('estado', 20)->default('habilitada')->change();
        });

        // 3. Añadir constraints DESPUÉS de que los datos ya son válidos
        DB::statement("ALTER TABLE convocatoria DROP CONSTRAINT IF EXISTS chk_conv_estados");
        DB::statement("ALTER TABLE convocatoria ADD CONSTRAINT chk_conv_estados
            CHECK (estado IN ('habilitada','finalizada'))");

        DB::statement("ALTER TABLE convocatoria DROP CONSTRAINT IF EXISTS chk_conv_fechas");
        DB::statement("ALTER TABLE convocatoria ADD CONSTRAINT chk_conv_fechas
            CHECK (fecha_fin > fecha_inicio)");

        /* ── CU12: Tabla docente ─────────────────────────────────────── */
        if (! Schema::hasTable('docente')) {
            Schema::create('docente', function (Blueprint $table) {
                $table->integer('CI')->primary();
                $table->string('profesion', 100);
                $table->string('maestria', 150);
                $table->string('diplomado_educacion_superior', 150);
                $table->foreign('CI')->references('CI')->on('usuario')->onDelete('cascade');
            });
        }

        /* ── CU13/14: Catálogo de materias ───────────────────────────── */
        if (! Schema::hasTable('materia')) {
            Schema::create('materia', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 100)->unique();
                $table->string('descripcion', 200)->nullable();
            });

            DB::table('materia')->insert([
                ['nombre' => 'Matemáticas',               'descripcion' => 'Álgebra, cálculo y geometría'],
                ['nombre' => 'Física',                    'descripcion' => 'Mecánica y termodinámica'],
                ['nombre' => 'Química',                   'descripcion' => 'Química general e inorgánica'],
                ['nombre' => 'Lenguaje y Comunicación',   'descripcion' => 'Redacción y comprensión lectora'],
                ['nombre' => 'Programación Básica',       'descripcion' => 'Introducción a la programación'],
                ['nombre' => 'Lógica y Razonamiento',     'descripcion' => 'Pensamiento lógico-matemático'],
            ]);
        }

        /* ── CU14: Catálogo de aulas ─────────────────────────────────── */
        if (! Schema::hasTable('aula')) {
            Schema::create('aula', function (Blueprint $table) {
                $table->string('nro', 10)->primary();
                $table->integer('capacidad');
                $table->string('descripcion', 150)->nullable();
            });

            DB::table('aula')->insert([
                ['nro' => 'A-101',  'capacidad' => 40, 'descripcion' => 'Aula 101 — Edificio A'],
                ['nro' => 'A-102',  'capacidad' => 35, 'descripcion' => 'Aula 102 — Edificio A'],
                ['nro' => 'A-201',  'capacidad' => 45, 'descripcion' => 'Aula 201 — Edificio A'],
                ['nro' => 'LAB-1',  'capacidad' => 25, 'descripcion' => 'Laboratorio de Computación 1'],
                ['nro' => 'LAB-2',  'capacidad' => 25, 'descripcion' => 'Laboratorio de Computación 2'],
                ['nro' => 'VIRT',   'capacidad' => 200,'descripcion' => 'Sala virtual (Meet/Teams)'],
            ]);
        }

        /* ── CU14: Grupos ────────────────────────────────────────────── */
        if (! Schema::hasTable('grupo')) {
            Schema::create('grupo', function (Blueprint $table) {
                // Llave compuesta: (id, convocatoria_id) — ej: 'M001' + '1-2026'
                $table->string('id', 10);
                $table->string('convocatoria_id', 10);
                $table->string('carrera_id', 10)->nullable();
                $table->string('modalidad', 20);
                $table->integer('cupo_maximo');
                $table->string('estado', 20)->default('activo');
                $table->primary(['id', 'convocatoria_id']);
                $table->foreign('convocatoria_id')->references('id')->on('convocatoria')->onDelete('cascade');
                $table->foreign('carrera_id')->references('id')->on('carrera')->nullOnDelete();
            });

            DB::statement("ALTER TABLE grupo ADD CONSTRAINT chk_grupo_modalidad
                CHECK (modalidad IN ('virtual','presencial'))");
            DB::statement("ALTER TABLE grupo ADD CONSTRAINT chk_grupo_estado
                CHECK (estado IN ('activo','inactivo'))");
        }

        /* ── CU14: Horarios de grupo ─────────────────────────────────── */
        if (! Schema::hasTable('horario')) {
            Schema::create('horario', function (Blueprint $table) {
                $table->id();
                $table->string('grupo_id', 10);
                $table->string('convocatoria_id', 10);
                $table->string('dia', 20);
                $table->time('hora_inicio');
                $table->time('hora_fin');
                $table->string('aula_nro', 10)->nullable();
                $table->foreign(['grupo_id', 'convocatoria_id'])
                    ->references(['id', 'convocatoria_id'])
                    ->on('grupo')
                    ->onDelete('cascade');
                $table->foreign('aula_nro')->references('nro')->on('aula')->nullOnDelete();
            });

            DB::statement("ALTER TABLE horario ADD CONSTRAINT chk_horario_dia
                CHECK (dia IN ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'))");
            DB::statement("ALTER TABLE horario ADD CONSTRAINT chk_horario_horas
                CHECK (hora_fin > hora_inicio)");
        }

        /* ── CU13: Asignaciones de carga horaria docente ─────────────── */
        if (! Schema::hasTable('asignacion_docente')) {
            Schema::create('asignacion_docente', function (Blueprint $table) {
                $table->id();
                $table->integer('docente_ci');
                $table->unsignedBigInteger('materia_id');
                $table->string('grupo_id', 10);
                $table->string('convocatoria_id', 10);
                $table->unique(['docente_ci', 'grupo_id', 'convocatoria_id'], 'uq_asig_docente_grupo');
                $table->foreign('docente_ci')->references('CI')->on('docente')->onDelete('cascade');
                $table->foreign('materia_id')->references('id')->on('materia');
                $table->foreign(['grupo_id', 'convocatoria_id'])
                    ->references(['id', 'convocatoria_id'])
                    ->on('grupo')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('asignacion_docente');
        Schema::dropIfExists('horario');
        Schema::dropIfExists('grupo');
        Schema::dropIfExists('aula');
        Schema::dropIfExists('materia');
        Schema::dropIfExists('docente');

        try {
            DB::statement("ALTER TABLE convocatoria DROP CONSTRAINT IF EXISTS chk_conv_estados");
            DB::statement("ALTER TABLE convocatoria DROP CONSTRAINT IF EXISTS chk_conv_fechas");
        } catch (\Exception $e) {}

        Schema::table('convocatoria', function (Blueprint $table) {
            $table->string('estado', 20)->default('activa')->change();
        });
    }
};
