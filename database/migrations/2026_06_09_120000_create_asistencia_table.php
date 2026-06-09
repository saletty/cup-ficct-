<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asistencia', function (Blueprint $table) {
            $table->id();
            $table->integer('postulante_ci');
            $table->integer('docente_ci');
            $table->string('grupo_id', 20);
            $table->string('convocatoria_id', 20);
            $table->date('fecha');
            $table->string('estado', 20)->default('presente'); // presente | ausente | justificado
            $table->text('observacion')->nullable();

            $table->foreign('postulante_ci')->references('CI')->on('postulante')->onDelete('cascade');
            $table->foreign('docente_ci')->references('CI')->on('docente')->onDelete('cascade');

            $table->unique(['postulante_ci', 'grupo_id', 'convocatoria_id', 'fecha'], 'asistencia_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asistencia');
    }
};
