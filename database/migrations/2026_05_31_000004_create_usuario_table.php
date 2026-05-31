<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuario', function (Blueprint $table) {
            // CI = Carnet de Identidad, asignado manualmente (no auto-increment)
            $table->integer('CI')->primary();
            $table->string('nombre_completo', 150);
            $table->string('email', 120)->unique();
            $table->string('contraseña', 255);
            $table->string('estado', 20)->default('activo');
            $table->unsignedBigInteger('rol_id');

            $table->foreign('rol_id')->references('id')->on('rol');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuario');
    }
};
