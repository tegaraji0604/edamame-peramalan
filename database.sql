-- ═══════════════════════════════════════════════════════════════
--  Database: flask_peramalan
--  Jalankan di Laragon phpMyAdmin atau HeidiSQL
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS `flask_peramalan`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `flask_peramalan`;

-- ─── Users ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `nama`       VARCHAR(150)  NOT NULL,
  `email`      VARCHAR(191)  NOT NULL UNIQUE,
  `password`   VARCHAR(255)  NOT NULL,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Data Histori ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `data_histori` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `tanggal`          DATE           NOT NULL UNIQUE,
  `jumlah_penjualan` DOUBLE         NOT NULL DEFAULT 0,
  `created_at`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Hasil Peramalan ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `hasil_peramalan` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `bulan`        VARCHAR(50)   NOT NULL,
  `prediksi`     DOUBLE        NOT NULL DEFAULT 0,
  `batas_bawah`  DOUBLE        NOT NULL DEFAULT 0,
  `batas_atas`   DOUBLE        NOT NULL DEFAULT 0,
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Sample User (password: admin123) ───────────────────────────
-- bcrypt hash of "admin123"
INSERT IGNORE INTO `users` (`nama`, `email`, `password`, `created_at`) VALUES
  ('Administrator', 'admin@gmail.com',
   '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
   NOW());
