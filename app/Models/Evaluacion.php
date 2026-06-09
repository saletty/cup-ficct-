<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Evaluacion extends Model
{
    protected $table      = 'evaluacion';
    public    $timestamps = false;
    protected $fillable   = [
        'postulante_ci',
        'examen_id',
        'nota_examen1',
        'nota_examen2',
        'nota_examen3',
        'nota_examen4',
        'promedio_final',
        'estado_resultado',
    ];

    protected $casts = [
        'nota_examen1'   => 'float',
        'nota_examen2'   => 'float',
        'nota_examen3'   => 'float',
        'nota_examen4'   => 'float',
        'promedio_final' => 'float',
    ];

    public function postulante()
    {
        return $this->belongsTo(Postulante::class, 'postulante_ci', 'CI');
    }

    public function examen()
    {
        return $this->belongsTo(ExamenAdmision::class, 'examen_id');
    }

    // Calcula promedio y estado a partir de las tres notas
    public static function calcular(float $n1, float $n2, float $n3, float $n4): array
    {
        $reprobado = $n1 < 60 || $n2 < 60 || $n3 < 60 || $n4 < 60;
        $promedio  = round(($n1 + $n2 + $n3 + $n4) / 4, 2);
        return [
            'promedio_final'   => $promedio,
            'estado_resultado' => $reprobado ? 'reprobado' : 'aprobado',
        ];
    }
}
