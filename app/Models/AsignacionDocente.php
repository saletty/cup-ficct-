<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AsignacionDocente extends Model
{
    protected $table      = 'asignacion_docente';
    public    $timestamps = false;

    protected $fillable = ['docente_ci', 'materia_id', 'grupo_id', 'convocatoria_id'];

    protected function casts(): array
    {
        return ['docente_ci' => 'integer', 'materia_id' => 'integer'];
    }

    public function docente()
    {
        return $this->belongsTo(Docente::class, 'docente_ci', 'CI');
    }

    public function materia()
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    public function grupo()
    {
        return $this->belongsTo(Grupo::class, 'grupo_id', 'id');
    }
}
