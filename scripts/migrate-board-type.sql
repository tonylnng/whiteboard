-- Migration: add board_type column to boards
ALTER TABLE boards ADD COLUMN IF NOT EXISTS board_type VARCHAR(20) NOT NULL DEFAULT 'tldraw';
ALTER TABLE boards ADD COLUMN IF NOT EXISTS excalidraw_snapshot JSONB;
