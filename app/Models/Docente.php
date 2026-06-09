<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Materia;

class Docente extends Model
{
    protected $table      = 'docente';
    protected $primaryKey = 'CI';
    public    $incrementing = false;
    protected $keyType    = 'integer';
    public    $timestamps = false;

    protected $fillable = ['CI', 'materia_id', 'profesion', 'maestria', 'diplomado_educacion_superior'];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'CI', 'CI');
    }

    public function materia()
    {
        return $this->belongsTo(Materia::class, 'materia_id', 'id');
    }

    public function asignaciones()
    {
        return $this->hasMany(AsignacionDocente::class, 'docente_ci', 'CI');
    }
}
