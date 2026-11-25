# Brillo ✦ Agenda + página web para estudios de belleza

Una sola app que sirve a **muchos estudios** (uñas, pestañas, cejas…). Cada estudio tiene su propia página pública, sus citas, clientas, servicios y fotos. Los datos de un estudio no los ve ningún otro. Todo se controla desde el panel de administrador.

**Stack:** React 19 + Vite + Tailwind + Framer Motion · Node 22 + Express · SQLite (`node:sqlite`, sin dependencias nativas).

## Qué incluye

**Página pública por estudio** (`/tu-estudio`)
- Portada animada, servicios con foto y precio, galería de trabajos recientes con visor, horario, ubicación, WhatsApp e Instagram.
- **Reserva en línea**: la clienta elige el servicio. El calendario marca solo los días con lugar (🟢 disponible, 🟡 últimos lugares, tachado si está lleno o cerrado). Luego elige la hora y deja nombre y WhatsApp.
- Las horas con cita *por confirmar* o *confirmada*, la hora de comida y los bloqueos se ocultan solos. Antes de guardar se revisa otra vez que la hora siga libre, para que no haya dobles citas.
- Al terminar: botones para **agregar a Google Calendar**, guardar en iPhone (.ics con recordatorios) y avisar por WhatsApp.

**Panel del estudio** (`/app`)
- **Inicio:** ingresos del mes, próximas citas, citas por confirmar, gráfica de 7 días y link para compartir.
- **Agenda:** vista por día y semana, crear/editar/mover citas, cambiar estado (confirmada, completada, no vino, cancelada), recordatorio por WhatsApp con un toque y bloquear días u horas.
- **Clientas:** historial, notas, cumpleaños y cuánto ha gastado cada una.
- **Servicios:** agregar, editar, quitar, esconder y reordenar, con foto, precio, duración y categoría.
- **Galería:** subir varias fotos a la vez, descripción, servicio y "destacada" (sale en la portada).
- **Mi estudio:** logo, portada, colores, datos de contacto, **horario laboral por día con hora de comida**, cada cuánto se ofrecen horarios y anticipación mínima.
- **Calendario sincronizado:** un link iCal para suscribirse en Google Calendar o iPhone. Todas las citas aparecen solas con recordatorio 1 día y 1 hora antes.
- **Equipo:** la dueña da acceso a sus manicuristas (rol *staff*). Ellas pueden ver agenda, clientas y galería, pero no precios ni ajustes.

**Panel de administrador** (`/admin`, solo tú)
- Crear estudios y darle usuario y contraseña a cada dueña.
- Plan, fecha de pago y **suspender** si no pagan (su página y su login se bloquean).
- Entrar a cualquier estudio para ayudarles a configurarlo.
- Crear o desactivar usuarias, cambiar contraseñas e ingreso mensual estimado.

### Roles
| Rol | Qué puede hacer |
|---|---|
| `superadmin` (tú) | Todo: crear estudios, usuarias, suspender, entrar a cualquier estudio |
| `owner` (dueña) | Todo dentro de su estudio |
| `staff` (equipo) | Agenda, clientas y galería de su estudio |

## Correr en tu compu

```bash
npm run build          # instala todo y compila el frontend
npm start              # http://localhost:4000
```
Para desarrollo con recarga: `npm run dev:server` y en otra terminal `npm run dev:client` (http://localhost:5173).

La primera vez se crea:
- **Administrador:** `ADMIN_EMAIL` / `ADMIN_PASSWORD` (si no los pones: `admin@brillo.app` / `brillo-admin-2026`. **Cámbialos.**)
- **Demo:** `/starlight-studio`, con dueña `demo@starlight.studio` / `demo1234`. Desactívalo con `SEED_DEMO=0`.

Variables en `.env.example`.

## Publicarla (Render)
1. Sube este repo a GitHub.
2. En [render.com](https://render.com) elige **New → Blueprint** y selecciona el repo. Ya trae `render.yaml` con un disco de 1 GB para la base de datos y las fotos.
3. Pon tu `ADMIN_EMAIL` y `ADMIN_PASSWORD`, y listo.
4. (Opcional) Conecta tu dominio, por ejemplo `citas.tudominio.com`.

> El plan gratis de Render no guarda archivos en disco: usa *Starter* (~7 USD/mes) o un VPS. Cualquier host con Node 22.13+ y disco persistente sirve (Railway, Fly.io, un VPS de Hostinger…).

## Estructura
```
server/src/index.js   API (pública, estudio, super admin, iCal)
server/src/db.js      Tablas SQLite
server/src/seed.js    Admin + estudio demo
client/src/pages/     PublicStudio, app/*, admin/Admin, Landing, Login
client/src/config.js  Planes y WhatsApp de ventas de la página principal
```
