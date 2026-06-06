<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * CU15/CU16 — Tipos de Pago y Pagos de Admisión
 *
 * Tablas nuevas: tipo_pago, pago
 */
return new class extends Migration
{
    public function up(): void
    {
        /* ── CU15: Catálogo de tipos de pago ─────────────────────────── */
        if (! Schema::hasTable('tipo_pago')) {
            Schema::create('tipo_pago', function (Blueprint $table) {
                $table->id();
                $table->string('descripcion', 200)->unique();
                $table->decimal('monto', 10, 2);
                $table->string('estado', 20)->default('activo');
            });

            DB::statement("ALTER TABLE tipo_pago ADD CONSTRAINT chk_tipopago_estado
                CHECK (estado IN ('activo','inactivo'))");

            // Aranceles oficiales del preuniversitario CUP
            DB::table('tipo_pago')->insert([
                ['descripcion' => 'Inscripción Preuniversitario CUP',    'monto' => 700.00, 'estado' => 'activo'],
                ['descripcion' => 'Reinscripción Preuniversitario CUP',  'monto' => 350.00, 'estado' => 'activo'],
            ]);
        }

        /* ── CU16: Pagos de admisión ──────────────────────────────────── */
        if (! Schema::hasTable('pago')) {
            Schema::create('pago', function (Blueprint $table) {
                $table->id();
                $table->integer('postulante_ci');
                $table->unsignedBigInteger('tipopago_id');
                $table->decimal('monto', 10, 2);
                $table->string('estado_pago', 20)->default('pendiente');
                $table->timestamp('fecha_pago')->useCurrent();
                $table->integer('cajero_ci')->nullable();
                $table->string('observacion', 500)->nullable();

                $table->foreign('postulante_ci')->references('CI')->on('postulante')->onDelete('cascade');
                $table->foreign('tipopago_id')->references('id')->on('tipo_pago');
                $table->foreign('cajero_ci')->references('CI')->on('usuario')->nullOnDelete();
            });

            DB::statement("ALTER TABLE pago ADD CONSTRAINT chk_pago_estado
                CHECK (estado_pago IN ('pendiente','verificado','aprobado','rechazado'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pago');
        Schema::dropIfExists('tipo_pago');
    }
};
