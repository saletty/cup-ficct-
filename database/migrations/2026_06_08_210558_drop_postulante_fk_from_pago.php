<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// El pago es el PRIMER paso del flujo de admisión: el postulante paga en caja
// antes de existir en el sistema. Se elimina el FK a postulante para permitirlo.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pago', function (Blueprint $table) {
            $table->dropForeign(['postulante_ci']);
        });
    }

    public function down(): void
    {
        Schema::table('pago', function (Blueprint $table) {
            $table->foreign('postulante_ci')->references('CI')->on('postulante')->onDelete('cascade');
        });
    }
};
