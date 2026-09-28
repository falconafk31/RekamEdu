-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'PUSTAKAWAN', 'TU');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('trial', 'pro', 'custom');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'suspended');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "StatusSiswa" AS ENUM ('aktif', 'lulus', 'pindah', 'keluar');

-- CreateEnum
CREATE TYPE "StatusPresensi" AS ENUM ('Hadir', 'Izin', 'Sakit', 'Alfa');

-- CreateEnum
CREATE TYPE "StatusHari" AS ENUM ('Masuk', 'Libur');

-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('Ganjil', 'Genap');

-- CreateEnum
CREATE TYPE "StatusPinjaman" AS ENUM ('dipinjam', 'dikembalikan', 'terlambat', 'hilang');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "kodeSekolah" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "npsn" TEXT,
    "alamat" TEXT,
    "telepon" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "kepalaSekolah" TEXT,
    "nipKepalaSekolah" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "nama" TEXT,
    "kelas" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_ai_models" (
    "id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "aiModelId" TEXT NOT NULL,

    CONSTRAINT "plan_ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "aiModelId" TEXT NOT NULL,
    "tokensInput" INTEGER NOT NULL DEFAULT 0,
    "tokensOutput" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "aksi" TEXT NOT NULL,
    "tabelTerkait" TEXT,
    "recordId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nisn" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jk" "JenisKelamin",
    "kelas" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusSiswa" NOT NULL DEFAULT 'aktif',
    "tanggalMasuk" DATE,
    "tanggalKeluar" DATE,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "StatusPresensi" NOT NULL,
    "kelas" TEXT,
    "guruInput" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_calendar" (
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "StatusHari" NOT NULL DEFAULT 'Masuk',

    CONSTRAINT "academic_calendar_pkey" PRIMARY KEY ("tenantId","date")
);

-- CreateTable
CREATE TABLE "academic_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tahunAjaran" TEXT NOT NULL,
    "semester" "Semester" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tahunAjaran" TEXT NOT NULL,
    "kelas" TEXT,
    "waliKelas" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "namaSekolah" TEXT,
    "alamat" TEXT,
    "kepalaSekolah" TEXT,
    "nipKepalaSekolah" TEXT,
    "logoUrl" TEXT,
    "daftarKelas" JSONB NOT NULL DEFAULT '[]',
    "kopBaris2" TEXT,
    "kopBaris3" TEXT,
    "kopBaris4" TEXT,
    "kopBaris5" TEXT,
    "namaPerpustakaan" TEXT,
    "hariLiburMingguan" JSONB NOT NULL DEFAULT '[0, 6]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "pengarang" TEXT,
    "penerbit" TEXT,
    "tahunTerbit" TEXT,
    "isbn" TEXT,
    "stok" INTEGER NOT NULL DEFAULT 1,
    "kategori" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_loans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tanggalPinjam" DATE NOT NULL,
    "tanggalKembaliSeharusnya" DATE NOT NULL,
    "tanggalKembaliAktual" DATE,
    "status" "StatusPinjaman" NOT NULL DEFAULT 'dipinjam',
    "guruInput" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_visits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_kodeSekolah_key" ON "tenants"("kodeSekolah");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_username_key" ON "users"("tenantId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenantId_key" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_idx" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_provider_model_key" ON "ai_models"("provider", "model");

-- CreateIndex
CREATE INDEX "plan_ai_models_plan_idx" ON "plan_ai_models"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "plan_ai_models_plan_aiModelId_key" ON "plan_ai_models"("plan", "aiModelId");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenantId_createdAt_idx" ON "ai_usage_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "students_tenantId_kelas_idx" ON "students"("tenantId", "kelas");

-- CreateIndex
CREATE INDEX "students_tenantId_status_idx" ON "students"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "students_tenantId_nisn_key" ON "students"("tenantId", "nisn");

-- CreateIndex
CREATE INDEX "attendance_logs_tenantId_date_idx" ON "attendance_logs"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_tenantId_date_studentId_key" ON "attendance_logs"("tenantId", "date", "studentId");

-- CreateIndex
CREATE INDEX "academic_periods_tenantId_isActive_idx" ON "academic_periods"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "academic_periods_tenantId_tahunAjaran_semester_key" ON "academic_periods"("tenantId", "tahunAjaran", "semester");

-- CreateIndex
CREATE INDEX "class_history_tenantId_tahunAjaran_idx" ON "class_history"("tenantId", "tahunAjaran");

-- CreateIndex
CREATE UNIQUE INDEX "class_history_tenantId_studentId_tahunAjaran_key" ON "class_history"("tenantId", "studentId", "tahunAjaran");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "tenant_settings"("tenantId");

-- CreateIndex
CREATE INDEX "books_tenantId_kategori_idx" ON "books"("tenantId", "kategori");

-- CreateIndex
CREATE INDEX "books_tenantId_judul_idx" ON "books"("tenantId", "judul");

-- CreateIndex
CREATE INDEX "book_loans_tenantId_status_idx" ON "book_loans"("tenantId", "status");

-- CreateIndex
CREATE INDEX "book_loans_tenantId_studentId_idx" ON "book_loans"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "book_loans_tenantId_tanggalPinjam_idx" ON "book_loans"("tenantId", "tanggalPinjam");

-- CreateIndex
CREATE INDEX "library_visits_tenantId_tanggal_idx" ON "library_visits"("tenantId", "tanggal");

-- CreateIndex
CREATE INDEX "library_visits_tenantId_studentId_idx" ON "library_visits"("tenantId", "studentId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_ai_models" ADD CONSTRAINT "plan_ai_models_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_history" ADD CONSTRAINT "class_history_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_visits" ADD CONSTRAINT "library_visits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

