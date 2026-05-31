<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Postulante extends Model
{
    protected $table      = 'postulante'; // tabla cup.postulante
    protected $primaryKey = 'CI';
    public    $incrementing = false;
    protected $keyType    = 'integer';
    public    $timestamps = false;

    protected $fillable = [
        'CI',
        'fecha_nacimiento',
        'sexo',
        'direccion',
        'telefono',
        'colegio_procedencia',
        'ciudad',
        'anio_egreso',
        'titulo_bachiller',
        'carrera_opcion1_id',
        'carrera_opcion2_id',
    ];

    protected function casts(): array
    {
        return [
            'CI'         => 'integer',
            'anio_egreso' => 'integer',
        ];
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'CI', 'CI');
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
