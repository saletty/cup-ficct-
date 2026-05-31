<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Postulacion extends Model
{
    protected $table    = 'postulacion';
    public $timestamps  = false;

    protected $fillable = [
        'postulante_ci', 'convocatoria_id',
        'carrera_opcion1_id', 'carrera_opcion2_id',
        'estado_admision', 'fecha_registro',
    ];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class, 'postulante_ci', 'CI');
    }

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class, 'convocatoria_id', 'id');
    }

    public function carreraOpcion1()
    {
        return $this->belongsTo(Carrera::class, 'carrera_opcion1_id', 'id');
    }

    public function carreraOpcion2()
    {
        return $this->belongsTo(Carrera::class, 'carrera_opcion2_id', 'id');
    }
}
