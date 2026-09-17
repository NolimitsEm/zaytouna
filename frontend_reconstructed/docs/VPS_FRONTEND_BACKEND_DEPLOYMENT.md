# VPS frontend/backend connection

The frontend uses relative same-origin `/api/*` requests. A production build contains no backend URL and does not use `BACKEND_ORIGIN`; that variable is development-only. Nginx must serve the generated `build/` directory from the public site and proxy `/api/*` to the Node backend. This keeps cookies same-origin.

## Before building

On the VPS backend, confirm these non-secret settings in `backend/.env`. Do not replace the file or reveal its secrets.

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
COOKIE_SECURE=true
CORS_ALLOWED_ORIGINS=https://YOUR_DOMAIN
```

Replace `YOUR_DOMAIN` with the actual public HTTPS origin, with no trailing slash. It must match the `server_name` used by Nginx. Multiple trusted frontend origins are comma-separated. Because the backend rejects untrusted POST origins, this setting is necessary even when Nginx proxies the same domain.

## Build and proxy

The prepared Nginx example is [nginx-zaytouna.conf.example](../deploy/nginx-zaytouna.conf.example). Replace `YOUR_DOMAIN`, then merge it with the VPS's existing Nginx/TLS configuration. Do not blindly overwrite an existing live site configuration.

From the frontend directory, create the build:

```sh
cd /var/www/zaytouna/frontend_reconstructed
npm ci
npm run build
```

Nginx must use this exact build directory:

```text
/var/www/zaytouna/frontend_reconstructed/build
```

After installing/adapting the Nginx configuration, validate and reload it:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

Start or restart the backend using the VPS process manager after its updated files and `.env` are in place. The precise command depends on whether the VPS uses systemd, PM2, Docker, or another manager; do not start a second unmanaged copy on port 3001.

## Safe live checks

Run these on the VPS after the backend process and Nginx are running; replace the domain:

```sh
curl -i https://YOUR_DOMAIN/api/health
curl -I https://YOUR_DOMAIN/
```

The first must return `200` with JSON containing `"ok":true`; the second must return `200` and HTML. These checks do not log in or write database data.

If `/api/health` returns 502, inspect the backend service status/logs and verify that it is listening only on `127.0.0.1:3001`. If a POST returns `403 Untrusted request origin`, correct `CORS_ALLOWED_ORIGINS` to exactly the public frontend origin, then restart the backend.

## Limits

This links the deployed frontend and backend; it does not insert data, alter MySQL, configure Zoom credentials, or resolve the remaining review findings. Existing generated links/old client assets are replaced only when the new `build/` directory is deployed.
