import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { DB_PATH, UPLOADS_DIR } from '../config.ts';
export { isUsingSupabase } from './supabaseClient.ts';

const require = createRequire(import.meta.url);

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const sqlite = require('node:sqlite') as typeof import('node:sqlite');
  const db = new sqlite.DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'writer')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      legacy_key TEXT UNIQUE,
      section TEXT NOT NULL CHECK (section IN ('bento', 'stories')),
      status TEXT NOT NULL CHECK (status IN ('draft', 'in_review', 'published')) DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      review_note TEXT NOT NULL DEFAULT '',
      cover_image TEXT NOT NULL,
      image_alt TEXT NOT NULL DEFAULT '',
      theme_key TEXT NOT NULL CHECK (theme_key IN ('coffee', 'culture', 'nature', 'cuisine')),
      section_meta_json TEXT NOT NULL DEFAULT '{}',

      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      read_time TEXT NOT NULL,
      cta_label TEXT NOT NULL,
      preview_paragraphs_json TEXT NOT NULL DEFAULT '[]',
      content_html TEXT NOT NULL DEFAULT '',
      quote TEXT NOT NULL DEFAULT '',
      quote_source TEXT NOT NULL DEFAULT '',
      glossary_json TEXT NOT NULL DEFAULT '[]',

      title_en TEXT NOT NULL DEFAULT '',
      excerpt_en TEXT NOT NULL DEFAULT '',
      category_en TEXT NOT NULL DEFAULT '',
      location_en TEXT NOT NULL DEFAULT '',
      read_time_en TEXT NOT NULL DEFAULT '',
      cta_label_en TEXT NOT NULL DEFAULT '',
      preview_paragraphs_en_json TEXT NOT NULL DEFAULT '[]',
      content_html_en TEXT NOT NULL DEFAULT '',
      quote_en TEXT NOT NULL DEFAULT '',
      quote_source_en TEXT NOT NULL DEFAULT '',
      glossary_en_json TEXT NOT NULL DEFAULT '[]',
      translation_status TEXT NOT NULL DEFAULT 'none' CHECK (translation_status IN ('none', 'pending', 'translated', 'failed')),
      translation_provider TEXT NOT NULL DEFAULT '',
      translated_at TEXT,

      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_section_status ON posts(section, status, sort_order);
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS stays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      area TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('budget', 'standard', 'luxury')),
      nightly_rate_vnd INTEGER NOT NULL,
      capacity_min INTEGER NOT NULL DEFAULT 1,
      capacity_max INTEGER NOT NULL DEFAULT 4,
      suitable_for_json TEXT NOT NULL DEFAULT '[]',
      amenities_json TEXT NOT NULL DEFAULT '[]',
      source_note TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('budget', 'standard', 'luxury')),
      daily_rate_vnd INTEGER NOT NULL,
      capacity_min INTEGER NOT NULL DEFAULT 1,
      capacity_max INTEGER NOT NULL DEFAULT 4,
      suitable_for_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS place_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_title TEXT UNIQUE NOT NULL,
      area_cluster TEXT NOT NULL,
      ticket_vnd INTEGER NOT NULL DEFAULT 0,
      estimated_spend_vnd INTEGER NOT NULL DEFAULT 0,
      price_source TEXT NOT NULL DEFAULT 'seed' CHECK (price_source IN ('seed', 'sqlite_cache', 'tavily', 'estimated')),
      price_note TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      fetched_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_traces (
      trace_id TEXT PRIMARY KEY,
      lang TEXT NOT NULL DEFAULT 'vi',
      user_message TEXT NOT NULL,
      intent TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('needs_clarification', 'completed')),
      provider TEXT NOT NULL DEFAULT '',
      intake_json TEXT NOT NULL DEFAULT '{}',
      capacity_json TEXT NOT NULL DEFAULT '{}',
      budget_json TEXT NOT NULL DEFAULT '{}',
      purpose_json TEXT NOT NULL DEFAULT '{}',
      eval_json TEXT NOT NULL DEFAULT '{}',
      latency_ms INTEGER NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      feedback_rating INTEGER CHECK (feedback_rating IN (-1, 1)),
      feedback_comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_stays_tier_active ON stays(tier, is_active);
    CREATE INDEX IF NOT EXISTS idx_stays_area ON stays(area);
    CREATE INDEX IF NOT EXISTS idx_logistics_tier_active ON logistics(tier, is_active);
    CREATE INDEX IF NOT EXISTS idx_place_prices_area ON place_prices(area_cluster);
    CREATE INDEX IF NOT EXISTS idx_place_prices_fetched ON place_prices(fetched_at);
    CREATE INDEX IF NOT EXISTS idx_ai_traces_created ON ai_traces(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_traces_intent_status ON ai_traces(intent, status);
  `);

  dbInstance = db;
  return db;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
