<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grupo extends Model
{
    protected $table        = 'grupo';
    // PK compuesta: (id, convocatoria_id) — Laravel no soporta nativamente
    // composite PK con find(), usamos findByKey() como helper.
    protected $primaryKey   = 'id';
    public    $incrementing = false;
    protected $keyType      = 'string';
    public    $timestamps   = false;

    protected $fillable = ['id', 'convocatoria_id', 'carrera_id', 'modalidad', 'cupo_maximo', 'estado', 'turno'];

    public static function findByKey(string $id, string $convocatoriaId): ?self
    {
        return self::where('id', $id)->where('convocatoria_id', $convocatoriaId)->first();
    }

    public function convocatoria()
    {
        return $this->belongsTo(Convocatoria::class, 'convocatoria_id', 'id');
    }

    public function carrera()
    {
        return $this->belongsTo(Carrera::class, 'carrera_id', 'id');
    }

    public function horarios()
    {
        return $this->hasMany(Horario::class, 'grupo_id', 'id')
                    ->where('convocatoria_id', $this->convocatoria_id);
    }

    public function asignaciones()
    {
        return $this->hasMany(AsignacionDocente::class, 'grupo_id', 'id')
                    ->where('convocatoria_id', $this->convocatoria_id);
    }
}
