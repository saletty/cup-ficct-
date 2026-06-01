<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Materia extends Model
{
    protected $table      = 'materia';
    public    $timestamps = false;

    protected $fillable = ['nombre', 'descripcion'];

    public function asignaciones()
    {
        return $this->hasMany(AsignacionDocente::class, 'materia_id');
    }
}
