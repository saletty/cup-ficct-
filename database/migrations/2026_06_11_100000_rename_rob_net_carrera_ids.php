<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $renames = ['ROB-P' => 'ROB', 'NET-P' => 'NET'];

    public function up(): void
    {
        // Soltar unique temporalmente para poder tener nombre duplicado mientras coexisten viejo y nuevo ID
        DB::statement('ALTER TABLE carrera DROP CONSTRAINT IF EXISTS carrera_nombre_carrera_unique');

        foreach ($this->renames as $old => $new) {
            $row = DB::table('carrera')->where('id', $old)->first();
            if (! $row) continue;

            if (! DB::table('carrera')->where('id', $new)->exists()) {
                DB::table('carrera')->insert(['id' => $new, 'nombre_carrera' => $row->nombre_carrera]);
            }

            DB::table('postulacion')->where('carrera_opcion1_id', $old)->update(['carrera_opcion1_id' => $new]);
            DB::table('postulacion')->where('carrera_opcion2_id', $old)->update(['carrera_opcion2_id' => $new]);
            DB::table('postulacion')->where('carrera_admitida_id', $old)->update(['carrera_admitida_id' => $new]);
            DB::table('postulante')->where('carrera_opcion1_id', $old)->update(['carrera_opcion1_id' => $new]);
            DB::table('postulante')->where('carrera_opcion2_id', $old)->update(['carrera_opcion2_id' => $new]);
            DB::table('grupo')->where('carrera_id', $old)->update(['carrera_id' => $new]);
            if (Schema::hasTable('cupo_carrera')) {
                DB::table('cupo_carrera')->where('carrera_id', $old)->update(['carrera_id' => $new]);
            }

            DB::table('carrera')->where('id', $old)->delete();
        }

        // Restaurar unique
        DB::statement('ALTER TABLE carrera ADD CONSTRAINT carrera_nombre_carrera_unique UNIQUE (nombre_carrera)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE carrera DROP CONSTRAINT IF EXISTS carrera_nombre_carrera_unique');

        foreach (array_flip($this->renames) as $old => $new) {
            $row = DB::table('carrera')->where('id', $old)->first();
            if (! $row) continue;

            if (! DB::table('carrera')->where('id', $new)->exists()) {
                DB::table('carrera')->insert(['id' => $new, 'nombre_carrera' => $row->nombre_carrera]);
            }

            DB::table('postulacion')->where('carrera_opcion1_id', $old)->update(['carrera_opcion1_id' => $new]);
            DB::table('postulacion')->where('carrera_opcion2_id', $old)->update(['carrera_opcion2_id' => $new]);
            DB::table('postulacion')->where('carrera_admitida_id', $old)->update(['carrera_admitida_id' => $new]);
            DB::table('postulante')->where('carrera_opcion1_id', $old)->update(['carrera_opcion1_id' => $new]);
            DB::table('postulante')->where('carrera_opcion2_id', $old)->update(['carrera_opcion2_id' => $new]);
            DB::table('grupo')->where('carrera_id', $old)->update(['carrera_id' => $new]);
            if (Schema::hasTable('cupo_carrera')) {
                DB::table('cupo_carrera')->where('carrera_id', $old)->update(['carrera_id' => $new]);
            }

            DB::table('carrera')->where('id', $old)->delete();
        }

        DB::statement('ALTER TABLE carrera ADD CONSTRAINT carrera_nombre_carrera_unique UNIQUE (nombre_carrera)');
    }
};
