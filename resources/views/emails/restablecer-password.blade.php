<x-mail::message>
# Restablecimiento de Contraseña — CUP FICCT

Estimado/a **{{ $nombre }}**,

Recibimos una solicitud para restablecer la contraseña de su cuenta en el Sistema CUP.

Haga clic en el siguiente enlace para crear una nueva contraseña. **El enlace expira en 15 minutos.**

<x-mail::button :url="$urlReset" color="blue">
Restablecer mi Contraseña
</x-mail::button>

Si no solicitó este cambio, puede ignorar este correo. Su contraseña actual permanecerá sin cambios.

Atentamente,
**Administración CUP — FICCT · UAGRM**
</x-mail::message>
