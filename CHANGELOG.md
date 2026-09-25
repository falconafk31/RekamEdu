# Changelog

Semua perubahan penting pada proyek ini dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

## [0.1.0] - 2026-09-26

### Ditambahkan

- **Tahap 0 fondasi:** dokumen & konfigurasi awal monorepo RekamEdu.
- `README.md` — ringkasan produk, 5 modul, peran, stack, quickstart, daftar env vars.
- `docker-compose.yml` — layanan `postgres`, `redis`, `minio`, `caddy`, `api`, `web` dengan healthcheck PostgreSQL.
- `.env.example` — seluruh variabel environment fondasi dengan placeholder yang jelas.
- `.gitignore` — Node, dist, `.env`, log, `.DS_Store`, coverage.
- `.editorconfig` — UTF-8, LF, 2 spasi, trim trailing whitespace.
- `infra/caddy/Caddyfile` — `{$DOMAIN}`: `/api/*` ke `api:3000`, sisanya ke `web:80`.
- `infra/README.md` — isi direktori `infra/`.
- `docs/architecture.md`, `docs/multi-tenancy.md`, `docs/auth.md`, `docs/ai.md`, `docs/deployment.md`, `docs/branding.md`, `docs/roadmap.md`, `docs/database.md`.
- `packages/shared/README.md` + stub `package.json` (`@rekamedu/shared`, private).
