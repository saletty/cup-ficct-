<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AsignacionExamen extends Model
{
    protected $table      = 'asignacion_examen';
    public    $timestamps = false;
    protected $fillable   = ['examen_id', 'postulante_ci', 'aula_nro'];

    public function examen()
    {
        return $this->belongsTo(ExamenAdmision::class, 'examen_id');
    }

    public function postulante()
    {
        return $this->belongsTo(Postulante::class, 'postulante_ci', 'CI');
    }

    public function aula()
    {
        return $this->belongsTo(Aula::class, 'aula_nro', 'nro');
    }
}
