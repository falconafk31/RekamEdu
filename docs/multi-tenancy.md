# Multi-Tenancy

## Model: Shared Schema

RekamEdu memakai **satu database, satu schema, dengan kolom `tenant_id`** di setiap tabel
yang datanya milik sekolah (tenant). Model ini dipilih karena:

- Operasional sederhana (satu migrasi, satu backup).
- Jumlah tenant awal kecil-menengah (sekolah).
- Isolasi ditegakkan di lapisan backend, bukan di struktur database.

## Aturan Wajib

1. **Setiap tabel tenant memiliki kolom `tenant_id`** (UUID, FK ke `tenants.id`, `ON DELETE CASCADE`).
2. **Isolasi ditegakkan di BACKEND, bukan frontend:**
   - `TenantGuard` membaca tenant dari JWT yang sudah terverifikasi (bukan dari query/body request).
   - Request context (AsyncLocalStorage) menyimpan `tenantId` aktif.
   - **Prisma extension/middleware** otomatis menambahkan `where: { tenant_id }` pada setiap query
     ke tabel tenant, sehingga lupa filter manual tidak menyebabkan kebocoran data.
3. **Frontend tidak dipercaya.** Filter `tenant_id` di query string atau state Pinia hanyalah
   untuk UX; otorisasi selalu diputuskan server.
4. **Tabel platform (milik Owner)** seperti `ai_models` tidak memakai `tenant_id`,
   tetapi aksesnya dibatasi guard peran `OWNER`.

## Index Komposit

Setiap tabel tenant wajib punya index komposit dengan `tenant_id` sebagai kolom pertama:

```prisma
model Presensi {
  id        String   @id @default(uuid())
  tenant_id String
  tanggal   DateTime
  // ...

  @@index([tenant_id, tanggal])
}
```

Pola `@@index([tenant_id, ...])` memastikan query per-tenant selalu memakai index
dan tidak melakukan full table scan lintas tenant.

## Tabel Tenant vs Tabel Platform

| Tabel | `tenant_id`? | Keterangan |
|-------|:---:|------------|
| `tenants`, `users`, `subscriptions`, `audit_logs` | Ya | Data milik sekolah |
| Tabel modul 1–5 (presensi, jurnal, rpp, perpustakaan, surat) | Ya | Data milik sekolah |
| `ai_usage_logs` | Ya | Kuota & audit pemakaian AI per tenant |
| `ai_models` | Tidak | Katalog model milik platform (Owner) |
| `plan_ai_models` | Tidak | Relasi paket → model yang diizinkan |
