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
        Schema::table('docente', function (Blueprint $table) {
            $table->unsignedBigInteger('materia_id')->nullable()->after('CI');
            $table->foreign('materia_id')->references('id')->on('materia');
        });
    }

    public function down(): void
    {
        Schema::table('docente', function (Blueprint $table) {
            $table->dropForeign(['materia_id']);
            $table->dropColumn('materia_id');
        });
    }
};
