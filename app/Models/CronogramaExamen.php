<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CronogramaExamen extends Model
{
    protected $table    = 'cronograma_examen';
    public $timestamps  = false;
    protected $fillable = ['examen_id', 'grupo_id', 'convocatoria_id', 'hora_inicio', 'hora_fin', 'aula_nro'];

    public function examen()
    {
        return $this->belongsTo(ExamenAdmision::class, 'examen_id');
    }

    public function aula()
    {
        return $this->belongsTo(Aula::class, 'aula_nro', 'nro');
    }
}
