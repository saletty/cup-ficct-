<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evaluacion', function (Blueprint $table) {
            // Inglés → nota_examen3, Física → nota_examen4
            $table->decimal('nota_examen4', 5, 2)->nullable()->after('nota_examen3');
        });
    }

    public function down(): void
    {
        Schema::table('evaluacion', function (Blueprint $table) {
            $table->dropColumn('nota_examen4');
        });
    }
};
