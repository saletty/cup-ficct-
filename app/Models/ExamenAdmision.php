<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamenAdmision extends Model
{
    protected $table      = 'examen_admision';
    public    $timestamps = false;
    protected $fillable   = ['descripcion', 'fecha', 'hora_inicio', 'hora_fin', 'estado'];

    public function asignaciones()
    {
        return $this->hasMany(AsignacionExamen::class, 'examen_id');
    }

    public function evaluaciones()
    {
        return $this->hasMany(Evaluacion::class, 'examen_id');
    }
}
