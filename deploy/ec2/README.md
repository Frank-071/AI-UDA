# Despliegue de WorkDoc en Amazon EC2

El script `deploy.sh` permite desplegar desde la computadora local con un solo
comando. Empaqueta el codigo actual, se conecta por SSH, instala Docker si es la
primera ejecucion, construye la imagen, inicializa PostgreSQL y verifica que la
aplicacion quede saludable.

La base de datos permanece en el volumen Docker `workdoc_workdoc_data`. Los
redespliegues no eliminan usuarios ni actividades.

## Configuracion unica en la computadora local

El script requiere Git Bash o WSL y los comandos `ssh`, `scp` y `tar`.

### 1. Configurar la conexion EC2

Desde la raiz del proyecto:

```bash
cp deploy/ec2/deploy.config.example deploy/ec2/deploy.config
```

Edita `deploy/ec2/deploy.config`. La IP ya esta configurada como
`3.94.162.110`; debes corregir `EC2_KEY_PATH` para que apunte al archivo
`municipalidad.pem` descargado al crear la instancia.

Ejemplos de rutas:

```text
# Git Bash
/c/Users/frank/Downloads/municipalidad.pem

# WSL
/mnt/c/Users/frank/Downloads/municipalidad.pem
```

No copies la clave al repositorio ni pegues su contenido en el archivo de
configuracion.

### 2. Configurar WorkDoc

```bash
cp deploy/ec2/.env.example deploy/ec2/.env
```

Edita `deploy/ec2/.env` y reemplaza todos los marcadores. Usa una clave
alfanumerica larga para `POSTGRES_PASSWORD`, al menos 32 caracteres aleatorios
para `JWT_SECRET` y al menos 12 caracteres para `ADMIN_PASSWORD`.

Los archivos `deploy.config` y `.env` son locales y estan ignorados por Git.

## Desplegar con un comando

Desde Git Bash o WSL, en la raiz del proyecto:

```bash
bash deploy/ec2/deploy.sh
```

En la primera ejecucion puede tardar varios minutos porque instala Docker y
descarga las imagenes. Las siguientes ejecuciones usan el mismo comando para
publicar cualquier cambio local, incluso si aun no fue confirmado en Git.

Al finalizar, abre:

```text
http://3.94.162.110:3000
```

El grupo de seguridad debe permitir TCP 3000 desde las direcciones que usaran
la aplicacion y SSH 22 desde la IP de la computadora que ejecuta el script. No
abras PostgreSQL 5432.

## Diagnostico desde la instancia

Si el despliegue informa un error, conectate con la misma clave y revisa:

```bash
cd /home/ubuntu/workdoc/current
sudo docker compose --env-file deploy/ec2/.env -f compose.ec2.yaml ps
sudo docker compose --env-file deploy/ec2/.env -f compose.ec2.yaml logs --tail=200 app db
```

## Copia de seguridad

En la instancia EC2:

```bash
cd /home/ubuntu/workdoc/current
sudo docker compose --env-file deploy/ec2/.env -f compose.ec2.yaml exec -T db pg_dump -U workdoc -d workdoc > ~/workdoc-backup.sql
```

El despliegue inicial usa HTTP y por eso `COOKIE_SECURE=false`. Si luego agregas
un dominio y HTTPS, cambia ese valor a `true` y ejecuta nuevamente el script.

ejecuta con:
& "C:\Program Files\Git\bin\bash.exe" deploy/ec2/deploy.sh

prueba con:
http://100.58.151.158:3000/
