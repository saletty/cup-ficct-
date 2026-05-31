<x-mail::message>
# Bienvenido al Sistema CUP — FICCT

Estimado/a **{{ $nombre }}**,

Su registro en el **Curso Pre-universitario (CUP)** de la FICCT ha sido completado. A continuación su contraseña temporal:

<x-mail::panel>
**Contraseña temporal:** `{{ $contrasena }}`
</x-mail::panel>

> Al ingresar por primera vez, el sistema le solicitará crear una nueva contraseña. Guarde este correo hasta completar ese paso.

<x-mail::button :url="$urlLogin" color="blue">
Ingresar al Sistema CUP
</x-mail::button>

**Pasos:**
1. Ingrese con su correo y la contraseña temporal.
2. El sistema le pedirá crear una contraseña nueva y segura.
3. ¡Listo! Acceso completo a su perfil de postulante.

Atentamente,
**Administración CUP — FICCT · UAGRM**
</x-mail::message>
