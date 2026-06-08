<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Horario extends Model
{
    protected $table      = 'horario';
    public    $timestamps = false;

    protected $fillable = ['grupo_id', 'convocatoria_id', 'dia', 'hora_inicio', 'hora_fin', 'aula_nro', 'turno'];

    public function aula()
    {
        return $this->belongsTo(Aula::class, 'aula_nro', 'nro');
    }

    public function grupo()
    {
        return $this->belongsTo(Grupo::class, 'grupo_id', 'id');
    }
}
