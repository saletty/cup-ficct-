<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Agrega la carrera que finalmente le fue asignada al postulante tras el proceso de admisión.
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('postulacion', 'carrera_admitida_id')) {
            Schema::table('postulacion', function (Blueprint $table) {
                $table->string('carrera_admitida_id', 10)->nullable()->after('carrera_opcion2_id');
                $table->foreign('carrera_admitida_id')
                      ->references('id')->on('carrera')
                      ->nullOnDelete()->onUpdate('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::table('postulacion', function (Blueprint $table) {
            $table->dropForeign(['carrera_admitida_id']);
            $table->dropColumn('carrera_admitida_id');
        });
    }
};
