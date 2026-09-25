# infra/

Konfigurasi infrastruktur RekamEdu (single VPS, Docker Compose + Caddy).

## Isi

- `caddy/` — `Caddyfile`:
  - `{$DOMAIN}` → reverse proxy `/api/*` ke service `api:3000`, sisanya ke service `web:80`.
  - TLS otomatis via Let's Encrypt saat `DOMAIN` adalah domain publik.
- `backup/` _(rencana Tahap 4)_ — skrip `pg_dump` terjadwal + rotasi backup database.
