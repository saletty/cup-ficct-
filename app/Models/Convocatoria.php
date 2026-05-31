<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Convocatoria extends Model
{
    protected $table      = 'convocatoria';
    protected $primaryKey = 'id';
    public    $incrementing = false;
    protected $keyType    = 'string';
    public    $timestamps = false;

    protected $fillable = ['id', 'nombre', 'fecha_inicio', 'fecha_fin', 'estado', 'cupo_maximo'];

    public function postulaciones()
    {
        return $this->hasMany(Postulacion::class, 'convocatoria_id', 'id');
    }
}
