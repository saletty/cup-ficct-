<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Documenta la tabla cupo_carrera creada manualmente en pgAdmin.
// La migración es idempotente: no recrea la tabla si ya existe.
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cupo_carrera')) {
            Schema::create('cupo_carrera', function (Blueprint $table) {
                $table->string('carrera_id', 10);
                $table->string('convocatoria_id', 10);
                $table->integer('cupo_maximo')->default(0);
                $table->integer('cupo_ocupado')->default(0);

                $table->primary(['carrera_id', 'convocatoria_id']);

                $table->foreign('carrera_id')
                      ->references('id')->on('carrera')
                      ->onDelete('cascade')->onUpdate('cascade');

                $table->foreign('convocatoria_id')
                      ->references('id')->on('convocatoria')
                      ->onDelete('cascade')->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cupo_carrera');
    }
};
