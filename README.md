# WorkDoc — Documentador de Trabajo Diario

Aplicación web para planificar jornadas y consultar el rendimiento agregado del equipo. Incluye Next.js (interfaz y API), PostgreSQL, autenticación mediante cookie HTTP-only y control de acceso por rol. El administrador crea las cuentas; los usuarios compañeros solo pueden consultar y modificar sus propias actividades.

## Requisitos previos

- Node.js 20 y npm.
- PostgreSQL 16 disponible localmente, o Docker Desktop con Compose para iniciar la base de datos.
- Una terminal PowerShell en esta carpeta.

## Preparación y ejecución local

1. Instala las dependencias:

   ```powershell
   npm.cmd install
   ```

2. Crea el archivo de configuración:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   Edita `.env.local`: define `JWT_SECRET` con al menos 32 caracteres aleatorios y establece `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD` (mínimo 12 caracteres). Los valores del ejemplo son solo para pruebas locales. Si usas otro PostgreSQL, ajusta `DATABASE_URL`.

3. Inicia PostgreSQL. Con Docker Desktop abierto:

   ```powershell
   docker compose up -d
   ```

   Alternativamente crea una base PostgreSQL y actualiza `DATABASE_URL` con sus credenciales. El contenedor de ejemplo expone el puerto 55432 y conserva los datos en un volumen.

4. Inicializa el esquema y crea el primer administrador. Next.js carga `.env.local` automáticamente, pero el script de inicialización necesita cargarlo explícitamente en PowerShell:

   ```powershell
   Get-Content .env.local | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object { $key, $value = $_ -split '=', 2; [Environment]::SetEnvironmentVariable($key, $value, 'Process') }
   npm.cmd run db:init
   ```

   El script es repetible: si el correo ya existe, no cambia su contraseña ni su rol. El esquema SQL está en `db/schema.sql`.

5. Inicia la aplicación:

   ```powershell
   npm.cmd run dev
   ```

   Abre http://localhost:3000. **El frontend y el backend se ejecutan juntos** en el mismo proceso Next.js; no hace falta iniciar otro servidor. Mantén esta terminal abierta. Para detenerlo presiona `Ctrl+C`; para detener PostgreSQL usa `docker compose stop`.

## Instalación local preparada en este equipo

La base de datos local utiliza el puerto `55432` y la aplicación se abre en http://localhost:3000. Se crearon estas cuentas exclusivamente para pruebas en este equipo:

- Administrador: `admin@workdoc.local` / `WorkDocLocal2026!`
- Compañero: `prueba@workdoc.local` / `WorkDocPrueba2026!`

La cuenta de prueba contiene una actividad de ejemplo. Estas contraseñas son solo para pruebas locales; no las uses en producción. Para volver a iniciar el sistema, abre Docker Desktop, ejecuta `docker compose up -d` y luego `npm.cmd run dev` en esta carpeta. También puedes ejecutar la tarea de VS Code «WorkDoc: iniciar aplicación» después de iniciar PostgreSQL.
## Prueba funcional

1. Inicia sesión con el administrador configurado en `.env.local`.
2. En el panel ejecutivo, crea un usuario compañero con contraseña de al menos 12 caracteres. También puedes crear otros administradores y activar o desactivar cuentas.
3. Cierra sesión e inicia con el compañero. Selecciona una fecha, añade actividades, cambia sus prioridades y estados, y pulsa **Guardar jornada**.
4. Recarga la página o cierra sesión y vuelve a entrar: la jornada guardada debe permanecer. El porcentaje se actualiza al cambiar estados, incluso antes de guardar. Cambiar de fecha con cambios pendientes solicita confirmación.
5. Vuelve al administrador y selecciona un intervalo que incluya la jornada. Comprueba las métricas, el gráfico y el progreso por usuario. Los compañeros no pueden consultar la información de otros usuarios a través de la API.

## Compilación y contenedor

```powershell
npm.cmd run build
npm.cmd start
```

Para construir la imagen de la aplicación:

```powershell
docker build -t workdoc .
docker run --rm -p 3000:3000 --env-file .env.production workdoc
```

Crea `.env.production` con `DATABASE_URL` apuntando a un PostgreSQL accesible desde el contenedor y un `JWT_SECRET` seguro. Inicializa la base de datos antes de iniciar el contenedor con `npm.cmd run db:init` desde un entorno que tenga acceso a ella. Las cookies de producción requieren HTTPS. El Dockerfile usa el servidor standalone de Next.js y puede utilizarse en un servicio de contenedores como Lightsail; Amplify requiere configurar su propio despliegue compatible con Next.js y las variables de entorno.

Para producción, utiliza PostgreSQL gestionado con cifrado y respaldos, secretos administrados, HTTPS, controles de red, registros y límites de intentos de inicio de sesión. El ejemplo local no configura estas capacidades de infraestructura. La aplicación está preparada como base para evolucionar; no implementa aislamiento entre organizaciones, recuperación de contraseña ni edición simultánea con control de versiones. Guardar una jornada reemplaza la copia anterior de ese usuario y fecha; evita editarla en varias pestañas a la vez.

## Estructura

```text
app/
  api/activities/route.js          API privada de jornadas
  api/admin/route.js               Métricas y usuarios para administradores
  api/admin/users/route.js         Creación de usuarios
  api/admin/users/[id]/route.js    Activación y desactivación
  api/auth/login/route.js          Inicio de sesión
  api/auth/logout/route.js         Cierre de sesión
  globals.css                      Estilos globales
  layout.js                        Estructura HTML
  page.js                          Carga de sesión en servidor
  workdoc.js                       Interfaz de los tres paneles
lib/auth.js                        Sesiones y autorización
lib/db.js                          Conexión PostgreSQL
db/schema.sql                      Esquema de la base de datos
db/init.js                         Inicialización y primer administrador
compose.yaml                       PostgreSQL para desarrollo
Dockerfile                         Imagen de producción
.env.example                       Variables de entorno de ejemplo
```

