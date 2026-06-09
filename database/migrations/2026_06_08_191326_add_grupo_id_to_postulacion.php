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
        Schema::table('postulacion', function (Blueprint $table) {
            $table->string('grupo_id', 20)->nullable()->after('convocatoria_id');
        });
    }

    public function down(): void
    {
        Schema::table('postulacion', function (Blueprint $table) {
            $table->dropColumn('grupo_id');
        });
    }
};
