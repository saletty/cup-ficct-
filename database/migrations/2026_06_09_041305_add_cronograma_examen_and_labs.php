<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Agregar convocatoria_id y numero_examen a examen_admision
        Schema::table('examen_admision', function (Blueprint $table) {
            $table->string('convocatoria_id', 20)->nullable()->after('id');
            $table->smallInteger('numero_examen')->nullable()->after('convocatoria_id');
            $table->foreign('convocatoria_id')->references('id')->on('convocatoria')->nullOnDelete();
        });

        DB::statement("ALTER TABLE examen_admision ADD CONSTRAINT chk_examen_numero
            CHECK (numero_examen BETWEEN 1 AND 3)");

        // Hacer hora_inicio/hora_fin opcionales (el horario queda en cronograma_examen)
        DB::statement("ALTER TABLE examen_admision ALTER COLUMN hora_inicio DROP NOT NULL");
        DB::statement("ALTER TABLE examen_admision ALTER COLUMN hora_fin DROP NOT NULL");

        // Tabla de cronograma: un slot por grupo dentro de un examen
        if (! Schema::hasTable('cronograma_examen')) {
            Schema::create('cronograma_examen', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('examen_id');
                $table->string('grupo_id', 20);
                $table->string('convocatoria_id', 20);
                $table->time('hora_inicio');
                $table->time('hora_fin');
                $table->string('aula_nro', 10);

                $table->unique(['examen_id', 'grupo_id', 'convocatoria_id'], 'uq_cron_examen_grupo');
                $table->foreign('examen_id')->references('id')->on('examen_admision')->onDelete('cascade');
                $table->foreign('aula_nro')->references('nro')->on('aula');
            });

            DB::statement("ALTER TABLE cronograma_examen ADD CONSTRAINT chk_cron_horas
                CHECK (hora_fin > hora_inicio)");
        }

        // Labs 41-46
        DB::table('aula')->insertOrIgnore([
            ['nro' => 'Lab-41', 'descripcion' => 'Laboratorio 41', 'capacidad' => 40, 'estado' => 'activo'],
            ['nro' => 'Lab-42', 'descripcion' => 'Laboratorio 42', 'capacidad' => 40, 'estado' => 'activo'],
            ['nro' => 'Lab-43', 'descripcion' => 'Laboratorio 43', 'capacidad' => 40, 'estado' => 'activo'],
            ['nro' => 'Lab-44', 'descripcion' => 'Laboratorio 44', 'capacidad' => 40, 'estado' => 'activo'],
            ['nro' => 'Lab-45', 'descripcion' => 'Laboratorio 45', 'capacidad' => 40, 'estado' => 'activo'],
            ['nro' => 'Lab-46', 'descripcion' => 'Laboratorio 46', 'capacidad' => 40, 'estado' => 'activo'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('cronograma_examen');

        Schema::table('examen_admision', function (Blueprint $table) {
            $table->dropForeign(['convocatoria_id']);
            $table->dropColumn(['convocatoria_id', 'numero_examen']);
        });

        DB::table('aula')->whereIn('nro', ['Lab-41','Lab-42','Lab-43','Lab-44','Lab-45','Lab-46'])->delete();
    }
};
