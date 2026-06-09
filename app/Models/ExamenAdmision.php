<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamenAdmision extends Model
{
    protected $table      = 'examen_admision';
    public    $timestamps = false;
    protected $fillable   = [
        'convocatoria_id', 'numero_examen', 'descripcion',
        'fecha', 'hora_inicio', 'hora_fin', 'estado',
    ];

    public function asignaciones()
    {
        return $this->hasMany(AsignacionExamen::class, 'examen_id');
    }

    public function evaluaciones()
    {
        return $this->hasMany(Evaluacion::class, 'examen_id');
    }

    public function cronograma()
    {
        return $this->hasMany(CronogramaExamen::class, 'examen_id')->orderBy('hora_inicio');
    }

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class, 'convocatoria_id', 'id');
    }
}
