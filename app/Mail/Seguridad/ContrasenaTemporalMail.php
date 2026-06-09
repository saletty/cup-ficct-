<?php

namespace App\Mail\Seguridad;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContrasenaTemporalMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $nombre,
        public readonly string $contrasenaTemp
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bienvenido al Sistema CUP — FICCT: Su contraseña temporal'
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.contrasena-temporal',
            with: [
                'nombre'     => $this->nombre,
                'contrasena' => $this->contrasenaTemp,
                'urlLogin'   => config('app.frontend_url', 'http://localhost:5174'),
            ]
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
