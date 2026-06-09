<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Asistencia extends Model
{
    protected $table      = 'asistencia';
    public    $timestamps = false;

    protected $fillable = [
        'postulante_ci',
        'docente_ci',
        'grupo_id',
        'convocatoria_id',
        'fecha',
        'estado',
        'observacion',
    ];

    protected function casts(): array
    {
        return [
            'postulante_ci' => 'integer',
            'docente_ci'    => 'integer',
            'fecha'         => 'date',
        ];
    }

    public function postulante()
    {
        return $this->belongsTo(Postulante::class, 'postulante_ci', 'CI');
    }

    public function docente()
    {
        return $this->belongsTo(Docente::class, 'docente_ci', 'CI');
    }
}
