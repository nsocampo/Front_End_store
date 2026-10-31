# Configuración de PostgreSQL

## Requisitos

- Instala **Node.js LTS** desde https://nodejs.org/ y PostgreSQL (incluye pgAdmin) desde https://www.postgresql.org/download/.
- No pongas la contraseña de PostgreSQL en los archivos del navegador. Se guarda únicamente en `api/.env`.

## Preparar la base de datos

1. Abre pgAdmin y conéctate al servidor local de PostgreSQL.
2. Crea una base de datos llamada `frontend_store`.
3. Abre el Query Tool de esa base de datos y ejecuta el contenido de `api/schema.sql`. Esto crea las tablas `orders` y `order_items`.

También puedes automatizar la creación de la base de datos, la aplicación del esquema y el arranque de la API con `api\setup.ps1`. Desde una terminal de PowerShell abierta en la carpeta del proyecto, ejecuta:

```powershell
.\api\setup.ps1
```

El script te pedirá el usuario y la contraseña de PostgreSQL (la contraseña no se muestra en pantalla). Usa esta opción en lugar de los pasos manuales de abajo; no compartas la contraseña por chat.

## Preparar e iniciar el backend

Desde una terminal, entra a la carpeta `api` del proyecto y ejecuta:

```powershell
npm install
Copy-Item .env.example .env
```

Edita `api/.env` y sustituye `TU_PASSWORD` por la contraseña del usuario de PostgreSQL. Si tu usuario, puerto o base de datos son distintos, actualiza también la URL:

```text
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/frontend_store
```

Con PostgreSQL iniciado, arranca el backend desde la carpeta `api`:

```powershell
npm start
```

La API debe responder en `http://localhost:3000/api/health` con `{"status":"ok"}`. Mantén esa terminal abierta mientras uses la tienda.

## Abrir la tienda

Usa Live Server para abrir `index.html` en `http://127.0.0.1:5500` o `http://localhost:5500`. Esos orígenes están permitidos por defecto. Si Live Server usa otro origen, añádelo a `FRONTEND_ORIGINS` en `api/.env`, reinicia el backend y prueba de nuevo.

Al finalizar el pedido, el servidor valida los datos y guarda el pedido y sus productos en una transacción de PostgreSQL. Solo si el guardado termina correctamente aparece **“Pedido realizado correctamente.”** y se vacían el carrito y el formulario. Si la API o PostgreSQL no están disponibles, se informa el error y el carrito se conserva.

## Publicar la tienda en Internet

La publicación preparada usa Netlify para las páginas, Render para la API y Neon para PostgreSQL. Necesitas cuentas en esos servicios y subir a GitHub los archivos de este proyecto. **No subas `api/.env` ni copies sus contraseñas a Netlify o al navegador.** La contraseña de la base de datos se configura solamente como variable secreta `DATABASE_URL` en Render.

### 1. Crear la base de datos en Neon

1. Crea un proyecto PostgreSQL en [Neon](https://neon.tech/).
2. Copia la cadena de conexión PostgreSQL que te proporciona Neon. Es privada: no la publiques ni la compartas por chat.

### 2. Publicar la API en Render

1. En [Render](https://render.com/), elige crear un **Blueprint** y conecta el repositorio de GitHub que contiene este proyecto. Render detectará `render.yaml` y propondrá un servicio llamado `frontend-store-api`.
2. Cuando Render solicite las variables pendientes, configura `DATABASE_URL` con la cadena privada de Neon. Render también solicitará `FRONTEND_ORIGINS`; puedes completarla después de publicar la página.
3. Espera a que termine el despliegue. Copia la URL pública de la API, por ejemplo `https://frontend-store-api.onrender.com`.
4. Abre `https://TU-API.onrender.com/api/health`. Debe responder `{"status":"ok"}`. Si no responde, revisa los registros del servicio en Render.

### 3. Publicar las páginas en Netlify

1. En [Netlify](https://www.netlify.com/), crea un sitio nuevo importando el mismo repositorio de GitHub. Netlify usará la configuración de `netlify.toml`.
2. En la configuración del sitio, agrega la variable de entorno `API_BASE_URL` con la URL pública de la API, por ejemplo `https://frontend-store-api.onrender.com` (sin `/api` al final).
3. Vuelve a desplegar el sitio. El proceso genera `dist` con solo las páginas y los recursos que necesitan; no incluye el backend ni `api/.env`.
4. Copia el dominio público asignado por Netlify, por ejemplo `https://mi-tienda.netlify.app`.

### 4. Permitir que la página se conecte a la API

En Render, configura `FRONTEND_ORIGINS` con el dominio de Netlify, sin barra final. Por ejemplo:

```text
https://mi-tienda.netlify.app
```

Si Netlify muestra más de un dominio que usarás, sepáralos con comas. Guarda el cambio y reinicia o vuelve a desplegar el servicio de Render.

Finalmente, abre el dominio de Netlify y prueba un pedido. Los pedidos guardados en la base de datos de Neon se pueden consultar desde pgAdmin conectándote con los datos que proporciona Neon, o desde su consola web.
