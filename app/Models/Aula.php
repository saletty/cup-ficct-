<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Aula extends Model
{
    protected $table      = 'aula';
    protected $primaryKey = 'nro';
    public    $incrementing = false;
    protected $keyType    = 'string';
    public    $timestamps = false;

    protected $fillable = ['nro', 'capacidad', 'descripcion'];

    public function horarios()
    {
        return $this->hasMany(Horario::class, 'aula_nro', 'nro');
    }
}
