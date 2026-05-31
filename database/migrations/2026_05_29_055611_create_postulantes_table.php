<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('postulantes', function (Blueprint $table) {

        $table->id();

        $table->string('ci')->unique();

        $table->string('nombre');

        $table->string('apellido');

        $table->date('fecha_nacimiento')->nullable();

        $table->string('sexo')->nullable();

        $table->string('direccion')->nullable();

        $table->string('telefono');

        $table->string('correo')->unique();

        $table->string('colegio')->nullable();

        $table->string('ciudad');

        $table->string('carrera');

        $table->string('titulo_bachiller')->nullable();

        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('postulantes');
    }
};
