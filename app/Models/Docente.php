<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Docente extends Model
{
    protected $table      = 'docente';
    protected $primaryKey = 'CI';
    public    $incrementing = false;
    protected $keyType    = 'integer';
    public    $timestamps = false;

    protected $fillable = ['CI', 'profesion', 'maestria', 'diplomado_educacion_superior'];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'CI', 'CI');
    }

    public function asignaciones()
    {
        return $this->hasMany(AsignacionDocente::class, 'docente_ci', 'CI');
    }
}
