<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migración: Módulo de Registro y Seguridad
 *
 * 1) Ajusta 'usuario': campos anulables para el Paso 1 (operador registra sólo el CI)
 *    + columnas de seguridad: intentos fallidos, bloqueo y flag cambio de contraseña.
 * 2) Crea tabla 'carrera' (catálogo FICCT).
 * 3) Crea tabla 'postulante' (datos personales del postulante, relación 1:1 con usuario).
 */
return new class extends Migration
{
    public function up(): void
    {
        /* ── 1. Ajuste de tabla usuario ──────────────────────────────────── */
        Schema::table('usuario', function (Blueprint $table) {
            // Paso 1: el operador sólo registra el CI; el resto viene después
            $table->string('nombre_completo', 150)->nullable()->change();
            $table->string('email', 120)->nullable()->change();
            $table->string('contraseña', 255)->nullable()->change();

            // Estado por defecto INACTIVO hasta que el estudiante complete el registro
            $table->string('estado', 20)->default('INACTIVO')->change();

            // Seguridad: control de intentos y bloqueo temporal
            $table->smallInteger('intentos_fallidos')->default(0);
            $table->timestamp('bloqueado_hasta')->nullable();

            // Flag: obliga al usuario a cambiar la contraseña temporal en el primer login
            $table->boolean('debe_cambiar_contrasena')->default(false);
        });

        /* ── 2. Catálogo de carreras FICCT ───────────────────────────────── */
        if (! Schema::hasTable('carrera')) {
            Schema::create('carrera', function (Blueprint $table) {
                $table->string('id', 10)->primary();
                $table->string('nombre_carrera', 100)->unique();
            });

            DB::table('carrera')->insert([
                ['id' => 'SIS-V', 'nombre_carrera' => 'Ing. en Sistemas (Virtual)'],
                ['id' => 'SIS-P', 'nombre_carrera' => 'Ing. en Sistemas (Presencial)'],
                ['id' => 'INF-V', 'nombre_carrera' => 'Ing. en Informática (Virtual)'],
                ['id' => 'INF-P', 'nombre_carrera' => 'Ing. en Informática (Presencial)'],
                ['id' => 'ROB',   'nombre_carrera' => 'Ing. en Robótica (Presencial)'],
                ['id' => 'NET',   'nombre_carrera' => 'Ing. en Redes y Telecomunicaciones (Presencial)'],
            ]);
        }

        /* ── 3. Datos personales del postulante ──────────────────────────── */
        if (! Schema::hasTable('postulante')) {
            Schema::create('postulante', function (Blueprint $table) {
                // CI es PK y FK a usuario (herencia por ID)
                $table->integer('CI')->primary();

                // Campos obligatorios en el Paso 2 (registro web)
                $table->date('fecha_nacimiento')->nullable();
                $table->char('sexo', 1)->nullable();          // 'M' o 'F'
                $table->string('direccion', 255)->nullable();
                $table->string('telefono', 20)->nullable();

                // Datos opcionales / complementarios
                $table->string('colegio_procedencia', 150)->nullable();
                $table->string('ciudad', 100)->nullable();
                $table->smallInteger('anio_egreso')->nullable();
                $table->string('titulo_bachiller', 100)->nullable();

                // Preferencias de carrera elegidas durante el registro
                $table->string('carrera_opcion1_id', 10)->nullable();
                $table->string('carrera_opcion2_id', 10)->nullable();

                $table->foreign('CI')
                    ->references('CI')->on('usuario')
                    ->onDelete('cascade')->onUpdate('cascade');

                $table->foreign('carrera_opcion1_id')
                    ->references('id')->on('carrera')
                    ->nullOnDelete();

                $table->foreign('carrera_opcion2_id')
                    ->references('id')->on('carrera')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('postulante');
        Schema::dropIfExists('carrera');

        Schema::table('usuario', function (Blueprint $table) {
            $table->dropColumn(['intentos_fallidos', 'bloqueado_hasta', 'debe_cambiar_contrasena']);
            $table->string('nombre_completo', 150)->nullable(false)->change();
            $table->string('email', 120)->nullable(false)->change();
            $table->string('contraseña', 255)->nullable(false)->change();
        });
    }
};
