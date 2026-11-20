// server/app.ts
import fs4 from "node:fs";
import path4 from "node:path";
import express from "express";

// server/services/ai/arizeTelemetry.ts
import { SpanStatusCode, context, trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { getAttributesFromContext, setSession } from "@arizeai/openinference-core";
import {
  INPUT_VALUE,
  OUTPUT_VALUE,
  SemanticConventions,
  SEMRESATTRS_PROJECT_NAME
} from "@arizeai/openinference-semantic-conventions";

// server/config.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var ROOT_DIR = path.resolve(__dirname, "..");
var preExistingEnvKeys = new Set(Object.keys(process.env));
function readEnvFileIntoProcess(onlyKeys) {
  const candidates = [".env", ".env.local"];
  for (const fileName of candidates) {
    const filePath = path.join(ROOT_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (onlyKeys && !onlyKeys.has(key)) continue;
      let value = trimmed.slice(eqIdx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (!preExistingEnvKeys.has(key)) {
        if (fileName === ".env.local" ? value !== "" || process.env[key] === void 0 : process.env[key] === void 0 || onlyKeys && process.env[key] === "") {
          process.env[key] = value;
        }
      }
    }
  }
}
readEnvFileIntoProcess();
function getGeminiApiKey() {
  if (!process.env.GEMINI_API_KEY?.trim() && !preExistingEnvKeys.has("GEMINI_API_KEY")) {
    readEnvFileIntoProcess(/* @__PURE__ */ new Set(["GEMINI_API_KEY"]));
  }
  return (process.env.GEMINI_API_KEY || "").trim();
}
function getTavilyApiKey() {
  if (!process.env.TAVILY_API_KEY?.trim() && !preExistingEnvKeys.has("TAVILY_API_KEY")) {
    readEnvFileIntoProcess(/* @__PURE__ */ new Set(["TAVILY_API_KEY"]));
  }
  return (process.env.TAVILY_API_KEY || "").trim();
}
function parseTavilySearchDepth(raw) {
  const val = (raw || "").trim().toLowerCase();
  if (val === "advanced" || val === "fast" || val === "ultra-fast" || val === "basic") {
    return val;
  }
  return "basic";
}
function parseTavilyIncludeAnswer(raw) {
  const val = (raw || "").trim().toLowerCase();
  if (val === "false" || val === "0" || val === "no") return false;
  if (val === "advanced") return "advanced";
  if (val === "basic") return "basic";
  return true;
}
var IS_VERCEL = Boolean(process.env.VERCEL);
var SERVER_DIR = __dirname;
var DATA_DIR = IS_VERCEL ? path.join(os.tmpdir(), "daklak-data") : path.join(SERVER_DIR, "data");
var DB_PATH = process.env.CMS_DB_PATH || path.join(DATA_DIR, "daklak.db");
var UPLOADS_DIR = process.env.CMS_UPLOADS_DIR || (IS_VERCEL ? path.join(os.tmpdir(), "daklak-uploads") : path.join(SERVER_DIR, "uploads"));
var DIST_DIR = path.join(ROOT_DIR, "dist");
var SUPABASE_STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || "uploads").trim();
function getSupabaseUrl() {
  if (!process.env.SUPABASE_URL?.trim() && !preExistingEnvKeys.has("SUPABASE_URL")) {
    readEnvFileIntoProcess(/* @__PURE__ */ new Set(["SUPABASE_URL"]));
  }
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}
function getSupabaseSecretKey() {
  const keysToCheck = ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  if (!process.env.SUPABASE_SECRET_KEY?.trim() && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && !keysToCheck.some((k) => preExistingEnvKeys.has(k))) {
    readEnvFileIntoProcess(new Set(keysToCheck));
  }
  return (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}
function isSupabaseConfigured() {
  if (process.env.CMS_DB_PATH && process.env.FORCE_SUPABASE !== "1") {
    return false;
  }
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}
var PORT = Number(process.env.CMS_PORT || process.env.PORT || 4e3);
var SESSION_COOKIE_NAME = "daklak_session";
var SESSION_TTL_DAYS = 7;
var GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
var GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
var GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash";
var GEMINI_DECISION_MODEL = process.env.GEMINI_DECISION_MODEL || "";
var TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
var TAVILY_TIMEOUT_MS = Math.max(2e3, Number(process.env.TAVILY_TIMEOUT_MS || 1e4));
var TAVILY_SEARCH_DEPTH = parseTavilySearchDepth(process.env.TAVILY_SEARCH_DEPTH);
var TAVILY_INCLUDE_ANSWER = parseTavilyIncludeAnswer(process.env.TAVILY_INCLUDE_ANSWER);
var TAVILY_MAX_RESULTS = Math.min(10, Math.max(1, Number(process.env.TAVILY_MAX_RESULTS || 5)));
var TAVILY_COUNTRY = (process.env.TAVILY_COUNTRY ?? "vietnam").trim();
var AI_PRICE_TTL_HOURS = Number(process.env.AI_PRICE_TTL_HOURS || 168);
var AI_CHAT_TIMEOUT_MS = Number(process.env.AI_CHAT_TIMEOUT_MS || 3e4);
var AI_RESPONSE_MAX_TOKENS = Number(process.env.AI_RESPONSE_MAX_TOKENS || 4096);
var AI_PRICE_POLICY = {
  currency: "VND",
  priceTtlHours: AI_PRICE_TTL_HOURS,
  lodgingShareCapPct: 40,
  transitShareCapPct: 25,
  contingencyBufferPct: 10,
  fallbackStrategy: "tavily_then_estimate_with_disclaimer"
};
var AI_CHAT_MAX_MESSAGE_LENGTH = 1500;
var AI_CHAT_RATE_LIMIT_MAX = Number(process.env.AI_CHAT_RATE_LIMIT_MAX || 30);
var AI_CHAT_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1e3;
var ARIZE_API_KEY = process.env.ARIZE_API_KEY || "";
var ARIZE_SPACE_ID = process.env.ARIZE_SPACE_ID || "";
var ARIZE_PROJECT_NAME = process.env.ARIZE_PROJECT_NAME || "dak-lak-travel-concierge";
var ARIZE_COLLECTOR_ENDPOINT = process.env.ARIZE_COLLECTOR_ENDPOINT || "https://otlp.arize.com";
var DEFAULT_ADMIN_EMAIL = process.env.CMS_ADMIN_EMAIL || "admin@daklak.travel";
var DEFAULT_ADMIN_PASSWORD = process.env.CMS_ADMIN_PASSWORD || "Admin@123";
var DEFAULT_WRITER_EMAIL = process.env.CMS_WRITER_EMAIL || "writer@daklak.travel";
var DEFAULT_WRITER_PASSWORD = process.env.CMS_WRITER_PASSWORD || "Writer@123";

// server/services/ai/arizeTelemetry.ts
var providerInstance = null;
var initialized = false;
function buildArizeTracesUrl(baseEndpoint) {
  const trimmed = baseEndpoint.trim().replace(/\/+$/, "");
  if (!trimmed) return "https://otlp.arize.com/v1/traces";
  if (trimmed.endsWith("/v1/traces")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/traces`;
  return `${trimmed}/v1/traces`;
}
function isArizeConfigured() {
  return Boolean(ARIZE_API_KEY.trim() && ARIZE_SPACE_ID.trim());
}
function initArizeTelemetry() {
  if (initialized && providerInstance) return true;
  if (!isArizeConfigured()) {
    return false;
  }
  initialized = true;
  const projectName = ARIZE_PROJECT_NAME.trim() || "dak-lak-travel-concierge";
  const url = buildArizeTracesUrl(ARIZE_COLLECTOR_ENDPOINT);
  const exporter = new OTLPTraceExporter({
    url,
    headers: {
      "arize-space-id": ARIZE_SPACE_ID.trim(),
      "arize-api-key": ARIZE_API_KEY.trim()
    }
  });
  const processor = process.env.NODE_ENV === "production" ? new BatchSpanProcessor(exporter) : new SimpleSpanProcessor(exporter);
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: projectName,
      [SEMRESATTRS_PROJECT_NAME]: projectName
    }),
    spanProcessors: [processor]
  });
  provider.register();
  providerInstance = provider;
  console.log(
    `[Arize AX] Tracing initialized -> project="${projectName}", endpoint="${url}", space="${ARIZE_SPACE_ID.trim()}"`
  );
  return true;
}
function getArizeTracer() {
  return trace.getTracer("dak-lak-ai-concierge");
}
function toSafeSpanValue(value, maxLen = 12e3) {
  try {
    const raw = typeof value === "string" ? value : JSON.stringify(value ?? "", (_k, v) => typeof v === "bigint" ? v.toString() : v);
    if (!raw) return "";
    return raw.length > maxLen ? `${raw.slice(0, maxLen)}\u2026[truncated]` : raw;
  } catch {
    const fallback = String(value ?? "");
    return fallback.length > maxLen ? `${fallback.slice(0, maxLen)}\u2026[truncated]` : fallback;
  }
}
async function withSessionScope(sessionId, fn) {
  if (!sessionId.trim()) return fn();
  const sessionCtx = setSession(context.active(), { sessionId: sessionId.trim() });
  return context.with(sessionCtx, fn);
}
async function withOpenInferenceSpan(name, opts, fn) {
  const tracer = getArizeTracer();
  return tracer.startActiveSpan(name, async (span) => {
    const ctxAttrs = getAttributesFromContext(context.active());
    if (ctxAttrs) {
      span.setAttributes(ctxAttrs);
    }
    span.setAttribute(SemanticConventions.OPENINFERENCE_SPAN_KIND, opts.kind);
    span.setAttribute(INPUT_VALUE, toSafeSpanValue(opts.input));
    if (opts.attributes) {
      span.setAttributes(opts.attributes);
    }
    try {
      const result = await fn(span);
      const outputPayload = opts.formatOutput ? opts.formatOutput(result) : result;
      span.setAttribute(OUTPUT_VALUE, toSafeSpanValue(outputPayload));
      if (opts.onSuccess) {
        opts.onSuccess(span, result);
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      span.recordException(errorObj);
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorObj.message });
      span.setAttribute(OUTPUT_VALUE, toSafeSpanValue({ error: errorObj.message }));
      throw err;
    } finally {
      span.end();
    }
  });
}

// server/db/database.ts
import fs2 from "node:fs";
import { createRequire } from "node:module";
import path2 from "node:path";

// server/db/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
var adminClient = null;
var cachedSignature = "";
function isUsingSupabase() {
  return isSupabaseConfigured();
}
function getSupabaseAdmin() {
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!url || !secretKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  const signature = `${url}::${secretKey}`;
  if (adminClient && cachedSignature === signature) {
    return adminClient;
  }
  adminClient = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  cachedSignature = signature;
  return adminClient;
}

// server/db/database.ts
var require2 = createRequire(import.meta.url);
var dbInstance = null;
function getDb() {
  if (dbInstance) return dbInstance;
  fs2.mkdirSync(path2.dirname(DB_PATH), { recursive: true });
  fs2.mkdirSync(UPLOADS_DIR, { recursive: true });
  const sqlite = require2("node:sqlite");
  const db = new sqlite.DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
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

// src/data/articles.ts
var bentoOverviewCards = [
  {
    index: 0,
    articleKey: "coffee",
    size: "large",
    colSpanClass: "md:col-span-7 lg:col-span-8",
    imageLayout: "left",
    image: "https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=1000&q=80",
    imageAlt: "C\xE0 ph\xEA Robusta \u0110\u1EAFk L\u1EAFk",
    imageBgClass: "bg-[#132A1E]",
    title: "Th\u1EE7 ph\u1EE7 C\xE0 ph\xEA Th\u1EBF gi\u1EDBi",
    description: "H\xE0nh tr\xECnh t\u1EEB nh\u1EEFng r\u1EABy c\xE0 ph\xEA b\u1EA1t ng\xE0n tr\xEAn \u0111\u1EA5t \u0111\u1ECF bazan \u0111\u1EBFn B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA v\xE0 t\xE1ch Fine Robusta nguy\xEAn b\u1EA3n \u0111\xE1nh th\u1EE9c m\u1ECDi gi\xE1c quan.",
    cta: "Kh\xE1m ph\xE1 h\xE0nh tr\xECnh h\u1EA1t Robusta"
  },
  {
    index: 1,
    articleKey: "gong",
    size: "small",
    colSpanClass: "md:col-span-5 lg:col-span-4",
    imageLayout: "top",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/18/Tay_Nguyen_gongs.JPG",
    imageAlt: "Kh\xF4ng gian V\u0103n h\xF3a C\u1ED3ng chi\xEAng T\xE2y Nguy\xEAn",
    imageBgClass: "bg-[#132A1E]",
    title: "Kh\xF4ng gian V\u0103n h\xF3a C\u1ED3ng chi\xEAng",
    description: "Di s\u1EA3n v\u0103n h\xF3a phi v\u1EADt th\u1EC3 c\u1EE7a nh\xE2n lo\u1EA1i, n\u01A1i \xE2m thanh \u0111\u1EA1i ng\xE0n vang v\u1ECDng b\xEAn ch\xE9 r\u01B0\u1EE3u c\u1EA7n trong nh\u1EEFng \u0111\xEAm h\u1ED9i bu\xF4n l\xE0ng.",
    cta: "L\u1EAFng nghe \xE2m vang \u0111\u1EA1i ng\xE0n"
  },
  {
    index: 2,
    articleKey: "matriarchy",
    size: "small",
    colSpanClass: "md:col-span-5 lg:col-span-4",
    imageLayout: "top",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Dan_toc_hoc_19.jpg",
    imageAlt: "Ki\u1EBFn tr\xFAc Nh\xE0 D\xE0i \xCA \u0110\xEA",
    imageBgClass: "bg-[#132A1E]",
    title: "D\u1EA5u \u1EA5n Ch\u1EBF \u0111\u1ED9 M\u1EABu h\u1EC7",
    description: "N\xE9t \u0111\u1EB9p \u0111\u1ED9c b\u1EA3n trong ki\u1EBFn tr\xFAc nh\xE0 d\xE0i \xCA \u0110\xEA, c\u1EA7u thang c\xE1i ch\u1EA1m kh\u1EAFc v\u1EA7ng tr\u0103ng khuy\u1EBFt v\xE0 quy\u1EC1n uy d\u1ECBu d\xE0ng c\u1EE7a ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF T\xE2y Nguy\xEAn.",
    cta: "B\u01B0\u1EDBc v\xE0o kh\xF4ng gian Nh\xE0 D\xE0i"
  },
  {
    index: 3,
    articleKey: "waterfalls",
    size: "large",
    colSpanClass: "md:col-span-7 lg:col-span-8",
    imageLayout: "left",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Draynur_falls.jpg",
    imageAlt: "Th\xE1c Dray Nur \u0110\u1EAFk L\u1EAFk",
    imageBgClass: "bg-[#0F2419]",
    title: "K\u1EF3 quan Th\xE1c n\u01B0\u1EDBc & H\u1ED3 t\u1EF1 nhi\xEAn",
    description: "S\u1EF1 giao h\xF2a k\u1EF3 v\u0129 gi\u1EEFa b\u1EE9c t\u01B0\u1EDDng n\u01B0\u1EDBc tr\u1EAFng x\xF3a d\xE0i 250m c\u1EE7a c\u1EE5m th\xE1c Dray Nur \u2013 Dray S\xE1p v\xE0 m\u1EB7t g\u01B0\u01A1ng t\u0129nh l\u1EB7ng soi b\xF3ng thuy\u1EC1n \u0111\u1ED9c m\u1ED9c tr\xEAn H\u1ED3 L\u1EAFk l\xFAc ho\xE0ng h\xF4n.",
    cta: "Chinh ph\u1EE5c cung \u0111\u01B0\u1EDDng th\xE1c & h\u1ED3"
  },
  {
    index: 4,
    articleKey: "bandon",
    size: "large",
    colSpanClass: "md:col-span-7 lg:col-span-8",
    imageLayout: "top",
    image: "https://images.unsplash.com/photo-1677741447050-e166cf1a1f14?auto=format&fit=crop&w=1000&q=80",
    imageAlt: "Voi r\u1EEBng v\xE0 R\u1EEBng kh\u1ED9p Yok \u0110\xF4n",
    imageBgClass: "bg-[#182E22]",
    title: "Huy\u1EC1n tho\u1EA1i B\u1EA3n \u0110\xF4n & Voi r\u1EEBng",
    description: "V\xF9ng \u0111\u1EA5t giao thoa v\u0103n h\xF3a \xCA \u0110\xEA \u2013 M\u2019n\xF4ng \u2013 L\xE0o b\xEAn d\xF2ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c, n\u01A1i du kh\xE1ch \u0111i b\u1ED9 d\u01B0\u1EDBi t\xE1n r\u1EEBng kh\u1ED9p Yok \u0110\xF4n v\xE0 tr\u1EA3i nghi\u1EC7m du l\u1ECBch th\xE2n thi\u1EC7n c\xF9ng voi.",
    cta: "Gi\u1EA3i m\xE3 k\xFD \u1EE9c s\u0103n voi B\u1EA3n \u0110\xF4n"
  },
  {
    index: 5,
    articleKey: "cuisine",
    size: "small",
    colSpanClass: "md:col-span-5 lg:col-span-4",
    imageLayout: "top",
    image: "https://images.unsplash.com/photo-1648141643305-efb7d2542602?auto=format&fit=crop&w=1000&q=80",
    imageAlt: "G\xE0 n\u01B0\u1EDBng B\u1EA3n \u0110\xF4n & \u1EA8m th\u1EF1c T\xE2y Nguy\xEAn",
    imageBgClass: "bg-[#132A1E]",
    title: "B\u1EA3n giao h\u01B0\u1EDFng \u1EA8m th\u1EF1c \u0110\u1EA1i ng\xE0n",
    description: "\u0110\xE1nh th\u1EE9c v\u1ECB gi\xE1c v\u1EDBi g\xE0 n\u01B0\u1EDBng B\u1EA3n \u0110\xF4n ch\u1EA5m mu\u1ED1i \u1EDBt xi\xEAm xanh, c\u01A1m lam \u1ED1ng n\u1EE9a, c\xE1 l\u0103ng S\xEAr\xEAp\u1ED1k v\xE0 canh l\xE1 b\xE9p ng\u1ECDt thanh.",
    cta: "Th\u01B0\u1EDFng th\u1EE9c h\u01B0\u01A1ng v\u1ECB n\xFAi r\u1EEBng"
  }
];
var bentoArticlesData = {
  coffee: {
    category: "Th\u1EE7 ph\u1EE7 C\xE0 ph\xEA",
    readTime: "5 ph\xFAt \u0111\u1ECDc",
    location: "Bu\xF4n Ma Thu\u1ED9t \u2022 C\u01B0 M\u2019gar \u2022 Ea T\xE2n",
    themeKey: "coffee",
    title: "Th\u1EE7 ph\u1EE7 C\xE0 ph\xEA Th\u1EBF gi\u1EDBi: T\u1EEB \u0111\u1EA5t \u0111\u1ECF Bazan \u0111\u1EBFn t\xE1ch Robusta \u0111\xE1nh th\u1EE9c m\u1ECDi gi\xE1c quan",
    paragraphs: [
      "\u1EDE \u0111\u1ED9 cao 500\u2013800m so v\u1EDBi m\u1EF1c n\u01B0\u1EDBc bi\u1EC3n, l\u1EDBp \u0111\u1EA5t \u0111\u1ECF bazan m\xE0u m\u1EE1 c\u1EE7a \u0110\u1EAFk L\u1EAFk t\xEDch t\u1EE5 d\u01B0\u1EE1ng ch\u1EA5t t\u1EEB nh\u1EEFng \u0111\u1EE3t phun tr\xE0o n\xFAi l\u1EEDa c\u1ED5 \u0111\u1EA1i \u0111\xE3 t\u1EA1o n\xEAn \u201Cth\xE1nh \u0111\u1ECBa\u201D cho c\xE2y c\xE0 ph\xEA Robusta. Kh\xF4ng ch\u1EC9 \u0111\u1EE9ng \u0111\u1EA7u c\u1EA3 n\u01B0\u1EDBc v\u1EC1 s\u1EA3n l\u01B0\u1EE3ng, Bu\xF4n Ma Thu\u1ED9t \u0111ang d\u1EABn d\u1EAFt l\xE0n s\xF3ng Fine Robusta \u0111\u1EA7y t\u1EF1 h\xE0o.",
      "T\u1EA1i B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA v\u1EDBi ki\u1EBFn tr\xFAc l\u1EA5y c\u1EA3m h\u1EE9ng t\u1EEB nh\u1EEFng n\u1EBFp nh\xE0 d\xE0i \xCA \u0110\xEA, du kh\xE1ch \u0111\u01B0\u1EE3c \u0111i qua h\xE0nh tr\xECnh v\u0103n minh c\xE0 ph\xEA nh\xE2n lo\u1EA1i tr\u01B0\u1EDBc khi t\u1EF1 tay th\u01B0\u1EDFng th\u1EE9c m\u1ED9t t\xE1ch Robusta s\u01A1 ch\u1EBF m\u1EADt ong \u0111\u1EADm h\u1EADu ng\u1ECDt s\xE2u."
    ],
    quote: "\u201CM\u1ED7i t\xE1ch c\xE0 ph\xEA Bu\xF4n Ma Thu\u1ED9t l\xE0 tinh t\xFAy c\u1EE7a n\u1EAFng gi\xF3 cao nguy\xEAn v\xE0 s\u1EF1 ki\xEAn nh\u1EABn c\u1EE7a \u0111\xF4i b\xE0n tay ng\u01B0\u1EDDi tr\u1ED3ng v\u01B0\u1EDDn.\u201D",
    quoteSource: "\u2014 Ch\u1EC9 d\u1EABn \u0110\u1ECBa l\xFD Qu\u1ED1c gia C\xE0 ph\xEA Bu\xF4n Ma Thu\u1ED9t",
    glossary: [
      { term: "Fine Robusta", def: "C\xE0 ph\xEA Robusta ch\u1EA5t l\u01B0\u1EE3ng cao \u0111\u1EA1t chu\u1EA9n CQI v\u1EDBi h\u01B0\u01A1ng v\u1ECB socola \u0111en, h\u1EA1t d\u1EBB v\xE0 h\u1EADu ng\u1ECDt." },
      { term: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA", def: "Bi\u1EC3u t\u01B0\u1EE3ng ki\u1EBFn tr\xFAc \u0111\u01B0\u01A1ng \u0111\u1EA1i t\u1EA1i Bu\xF4n Ma Thu\u1ED9t l\u01B0u gi\u1EEF h\u01A1n 10.000 hi\u1EC7n v\u1EADt c\xE0 ph\xEA." }
    ]
  },
  gong: {
    category: "Di s\u1EA3n Nh\xE2n lo\u1EA1i",
    readTime: "6 ph\xFAt \u0111\u1ECDc",
    location: "Bu\xF4n l\xE0ng \xCA \u0110\xEA & M\u2019n\xF4ng \u2022 \u0110\u1EAFk L\u1EAFk",
    themeKey: "culture",
    title: "Kh\xF4ng gian V\u0103n h\xF3a C\u1ED3ng chi\xEAng: \xC2m thanh \u0111\u1EA1i ng\xE0n b\xEAn ch\xE9 r\u01B0\u1EE3u c\u1EA7n",
    paragraphs: [
      "Trong \u0111\u1EDDi s\u1ED1ng t\xE2m linh c\u1EE7a ng\u01B0\u1EDDi \xCA \u0110\xEA v\xE0 M\u2019n\xF4ng t\u1EA1i \u0110\u1EAFk L\u1EAFk, ti\u1EBFng c\u1ED3ng chi\xEAng l\xE0 s\u1EE3i d\xE2y k\u1EBFt n\u1ED1i con ng\u01B0\u1EDDi v\u1EDBi th\u1EA7n linh (Y\xE0ng) v\xE0 thi\xEAn nhi\xEAn. T\u1EEB l\u1EC5 th\u1ED5i tai cho tr\u1EBB s\u01A1 sinh, l\u1EC5 m\u1EEBng l\xFAa m\u1EDBi \u0111\u1EBFn l\u1EC5 c\xFAng b\u1EBFn n\u01B0\u1EDBc, \xE2m vang d\xE0n chi\xEAng Knah lu\xF4n gi\u1EEF vai tr\xF2 trung t\xE2m.",
      "Qu\xE2y qu\u1EA7n b\xEAn \xE1nh l\u1EEDa b\u1EADp b\xF9ng trong gian kh\xE1ch nh\xE0 d\xE0i, nh\u1EA5p ng\u1EE5m r\u01B0\u1EE3u c\u1EA7n \u1EE7 men l\xE1 r\u1EEBng v\xE0 l\u1EAFng nghe nh\u1ECBp chi\xEAng tr\u1EA7m b\u1ED5ng l\xE0 kho\u1EA3nh kh\u1EAFc du kh\xE1ch ch\u1EA1m s\xE2u nh\u1EA5t v\xE0o h\u1ED3n c\u1ED1t T\xE2y Nguy\xEAn."
    ],
    quote: "\u201CTi\u1EBFng chi\xEAng vang l\xEAn \u1EDF \u0111\xE2u, h\u1ED3n thi\xEAng \u0111\u1EA1i ng\xE0n th\u1EE9c gi\u1EA5c \u1EDF \u0111\xF3.\u201D",
    quoteSource: "\u2014 Kh\xF4ng gian V\u0103n h\xF3a C\u1ED3ng chi\xEAng T\xE2y Nguy\xEAn (UNESCO)",
    glossary: [
      { term: "Chi\xEAng Knah", def: "B\u1ED9 chi\xEAng \u0111\u1ED3ng truy\u1EC1n th\u1ED1ng c\u1EE7a ng\u01B0\u1EDDi \xCA \u0110\xEA g\u1ED3m nhi\u1EC1u chi\u1EBFc c\xF3 k\xEDch c\u1EE1 v\xE0 cao \u0111\u1ED9 h\xF2a \xE2m tinh t\u1EBF." },
      { term: "R\u01B0\u1EE3u c\u1EA7n", def: "Th\u1EE9c u\u1ED1ng c\u1ED9ng \u0111\u1ED3ng \u1EE7 t\u1EEB g\u1EA1o n\u1EBFp, bo bo c\xF9ng men v\u1ECF c\xE2y r\u1EEBng trong ch\xE9 g\u1ED1m c\u1ED5." }
    ]
  },
  matriarchy: {
    category: "V\u0103n h\xF3a M\u1EABu h\u1EC7",
    readTime: "6 ph\xFAt \u0111\u1ECDc",
    location: "Bu\xF4n Ako Dh\xF4ng \u2022 TP. Bu\xF4n Ma Thu\u1ED9t",
    themeKey: "culture",
    title: "D\u1EA5u \u1EA5n Ch\u1EBF \u0111\u1ED9 M\u1EABu h\u1EC7: Ki\u1EBFn tr\xFAc Nh\xE0 D\xE0i \xCA \u0110\xEA & C\u1EA7u thang ch\u1EA1m kh\u1EAFc",
    paragraphs: [
      "Theo truy\u1EC1n th\u1ED1ng m\u1EABu h\u1EC7 \xCA \u0110\xEA, ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF l\xE0 tr\u1EE5 c\u1ED9t gi\u1EEF l\u1EEDa v\xE0 con g\xE1i \xFAt l\xE0 ng\u01B0\u1EDDi th\u1EEBa k\u1EBF ng\xF4i nh\xE0 \u0111\u1EC3 ph\u1EE5ng d\u01B0\u1EE1ng cha m\u1EB9. M\u1ED7i khi m\u1ED9t ng\u01B0\u1EDDi con g\xE1i trong gia \u0111\xECnh l\u1EADp gia \u0111\xECnh v\xE0 \u0111\xF3n ch\u1ED3ng v\u1EC1 \u1EDF r\u1EC3, ng\xF4i nh\xE0 d\xE0i l\u1EA1i \u0111\u01B0\u1EE3c n\u1ED1i th\xEAm m\u1ED9t nh\u1ECBp x\xE0 m\u1EDBi.",
      "Ngay tr\u01B0\u1EDBc hi\xEAn nh\xE0, chi\u1EBFc c\u1EA7u thang ch\xEDnh lu\xF4n \u0111\u01B0\u1EE3c \u0111\u1EBDo t\u1EEB m\u1ED9t th\xE2n g\u1ED7 l\u1EDBn v\u1EDBi h\xECnh t\u01B0\u1EE3ng \u0111\xF4i b\u1EA7u s\u1EEFa m\u1EB9 v\xE0 v\u1EA7ng tr\u0103ng khuy\u1EBFt \u2014 l\u1EDDi nh\u1EAFc nh\u1EDF trang tr\u1ECDng v\u1EC1 l\xF2ng bi\u1EBFt \u01A1n ngu\u1ED3n c\u1ED9i."
    ],
    quote: "\u201CNg\xF4i nh\xE0 d\xE0i \xCA \u0110\xEA l\u1EDBn l\xEAn theo t\u1EEBng cu\u1ED9c h\xF4n nh\xE2n, l\u01B0u gi\u1EEF k\xFD \u1EE9c nhi\u1EC1u th\u1EBF h\u1EC7 d\u01B0\u1EDBi m\u1ED9t m\xE1i tranh.\u201D",
    quoteSource: "\u2014 T\u01B0 li\u1EC7u V\u0103n h\xF3a B\u1EA3n \u0111\u1ECBa Bu\xF4n Ako Dh\xF4ng",
    glossary: [
      { term: "C\u1EA7u thang c\xE1i (Kpan)", def: "C\u1EA7u thang ch\xEDnh ch\u1EA1m kh\u1EAFc \u0111\xF4i b\u1EA7u s\u1EEFa m\u1EB9 t\xF4n vinh ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF \xCA \u0110\xEA." },
      { term: "Gh\u1EBF Kpan", def: "Chi\u1EBFc gh\u1EBF g\u1ED7 nguy\xEAn kh\u1ED1i d\xE0i 10\u201320m \u0111\u1EB7t d\u1ECDc v\xE1ch gian kh\xE1ch d\xE0nh cho d\xE0n ngh\u1EC7 nh\xE2n \u0111\xE1nh chi\xEAng." }
    ]
  },
  waterfalls: {
    category: "K\u1EF3 quan Thi\xEAn nhi\xEAn",
    readTime: "5 ph\xFAt \u0111\u1ECDc",
    location: "S\xF4ng S\xEAr\xEAp\u1ED1k & Huy\u1EC7n L\u1EAFk",
    themeKey: "nature",
    title: "K\u1EF3 quan Th\xE1c n\u01B0\u1EDBc & H\u1ED3 t\u1EF1 nhi\xEAn: T\u1EEB Dray Nur h\xF9ng v\u0129 \u0111\u1EBFn H\u1ED3 L\u1EAFk t\u0129nh l\u1EB7ng",
    paragraphs: [
      "\u0110\u1EAFk L\u1EAFk s\u1EDF h\u1EEFu hai th\xE1i c\u1EF1c thi\xEAn nhi\xEAn k\u1EF3 th\xFA: s\u1EF1 m\u1EA1nh m\u1EBD cu\u1ED9n tr\xE0o c\u1EE7a c\u1EE5m th\xE1c Dray Nur \u2013 Dray S\xE1p \u2013 Gia Long tr\xEAn d\xF2ng s\xF4ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c, v\xE0 v\u1EBB \u0111\u1EB9p tr\u1EA7m m\u1EB7c, ph\u1EB3ng l\u1EB7ng nh\u01B0 g\u01B0\u01A1ng c\u1EE7a H\u1ED3 L\u1EAFk r\u1ED9ng h\u01A1n 500 hecta d\u01B0\u1EDBi ch\xE2n d\xE3y Ch\u01B0 Yang Sin.",
      "Du kh\xE1ch c\xF3 th\u1EC3 d\xE0nh bu\u1ED5i s\xE1ng trekking xuy\xEAn r\u1EEBng \u0111\u1EB7c d\u1EE5ng ng\u1EAFm m\xE0n n\u01B0\u1EDBc tr\u1EAFng x\xF3a v\xE0 bu\u1ED5i chi\u1EC1u ch\xE8o thuy\u1EC1n \u0111\u1ED9c m\u1ED9c \u0111\xF3n ho\xE0ng h\xF4n t\xEDm bi\u1EBFc tr\xEAn m\u1EB7t h\u1ED3."
    ],
    quote: "\u201CM\u1ED9t b\xEAn l\xE0 b\u1EA3n giao h\u01B0\u1EDFng c\u1EE7a n\u01B0\u1EDBc v\xE0 \u0111\xE1 bazan, m\u1ED9t b\xEAn l\xE0 t\u1EA5m g\u01B0\u01A1ng soi t\u0129nh t\u1EA1i c\u1EE7a tr\u1EDDi cao nguy\xEAn.\u201D",
    quoteSource: "\u2014 C\u1EA9m nang Kh\xE1m ph\xE1 Sinh th\xE1i \u0110\u1EAFk L\u1EAFk",
    glossary: [
      { term: "Th\xE1c Dray Nur", def: "Ng\u1ECDn th\xE1c h\xF9ng v\u0129 b\u1EADc nh\u1EA5t T\xE2y Nguy\xEAn v\u1EDBi b\u1EE9c t\u01B0\u1EDDng n\u01B0\u1EDBc r\u1ED9ng h\u01A1n 250m." },
      { term: "H\u1ED3 L\u1EAFk", def: "H\u1ED3 n\u01B0\u1EDBc ng\u1ECDt t\u1EF1 nhi\xEAn l\u1EDBn nh\u1EA5t T\xE2y Nguy\xEAn, g\u1EAFn v\u1EDBi bu\xF4n l\xE0ng ng\u01B0\u1EDDi M\u2019n\xF4ng R\u2019l\xE2m." }
    ]
  },
  bandon: {
    category: "Huy\u1EC1n tho\u1EA1i Cao nguy\xEAn",
    readTime: "5 ph\xFAt \u0111\u1ECDc",
    location: "Bu\xF4n \u0110\xF4n \u2022 V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n",
    themeKey: "nature",
    title: "Huy\u1EC1n tho\u1EA1i B\u1EA3n \u0110\xF4n & Voi r\u1EEBng: K\xFD \u1EE9c v\u01B0\u1EE3t s\xF4ng S\xEAr\xEAp\u1ED1k",
    paragraphs: [
      "N\u1EB1m b\xEAn b\u1EDD d\xF2ng s\xF4ng S\xEAr\xEAp\u1ED1k huy\u1EC1n tho\u1EA1i, B\u1EA3n \u0110\xF4n t\u1EEB l\xE2u n\u1ED5i ti\u1EBFng v\u1EDBi ngh\u1EC1 s\u0103n b\u1EAFt v\xE0 thu\u1EA7n d\u01B0\u1EE1ng voi r\u1EEBng tr\u1EE9 danh c\u1EE7a c\u1ED9ng \u0111\u1ED3ng ng\u01B0\u1EDDi M\u2019n\xF4ng, \xCA \u0110\xEA v\xE0 L\xE0o.",
      "Ng\xE0y nay, v\xF9ng \u0111\u1EA5t n\xE0y \u0111ang vi\u1EBFt ti\u1EBFp ch\u01B0\u01A1ng m\u1EDBi nh\xE2n v\u0103n h\u01A1n v\u1EDBi m\xF4 h\xECnh du l\u1ECBch th\xE2n thi\u1EC7n c\xF9ng voi t\u1EA1i V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n \u2014 n\u01A1i du kh\xE1ch \u0111i b\u1ED9 trong r\u1EEBng kh\u1ED9p v\xE0 quan s\xE1t voi t\u1EF1 do trong m\xF4i tr\u01B0\u1EDDng t\u1EF1 nhi\xEAn."
    ],
    quote: "\u201CVoi \u1EDF B\u1EA3n \u0110\xF4n kh\xF4ng ch\u1EC9 l\xE0 t\xE0i s\u1EA3n, m\xE0 l\xE0 ng\u01B0\u1EDDi b\u1EA1n th\xE2n thi\u1EBFt nh\u01B0 th\xE0nh vi\xEAn trong gia \u0111\xECnh.\u201D",
    quoteSource: "\u2014 K\xFD \u1EE9c Bu\xF4n \u0110\xF4n b\xEAn d\xF2ng S\xEAr\xEAp\u1ED1k",
    glossary: [
      { term: "R\u1EEBng kh\u1ED9p Yok \u0110\xF4n", def: "H\u1EC7 sinh th\xE1i r\u1EEBng r\u1EE5ng l\xE1 m\xF9a kh\xF4 \u0111\u1ED9c nh\u1EA5t Vi\u1EC7t Nam." },
      { term: "Du l\u1ECBch th\xE2n thi\u1EC7n v\u1EDBi voi", def: "Tr\u1EA3i nghi\u1EC7m kh\xF4ng c\u01B0\u1EE1i voi, t\xF4n tr\u1ECDng ph\xFAc l\u1EE3i \u0111\u1ED9ng v\u1EADt v\xE0 b\u1EA3o t\u1ED3n sinh c\u1EA3nh." }
    ]
  },
  cuisine: {
    category: "\u1EA8m th\u1EF1c B\u1EA3n \u0111\u1ECBa",
    readTime: "4 ph\xFAt \u0111\u1ECDc",
    location: "Bu\xF4n Ma Thu\u1ED9t \u2022 B\u1EA3n \u0110\xF4n \u2022 H\u1ED3 L\u1EAFk",
    themeKey: "cuisine",
    title: "B\u1EA3n giao h\u01B0\u1EDFng \u1EA8m th\u1EF1c \u0110\u1EA1i ng\xE0n: H\u01B0\u01A1ng v\u1ECB m\u1ED9c m\u1EA1c \u0111\xE1nh th\u1EE9c v\u1ECB gi\xE1c",
    paragraphs: [
      "\u1EA8m th\u1EF1c \u0110\u1EAFk L\u1EAFk l\xE0 s\u1EF1 h\xF2a quy\u1EC7n tinh t\u1EBF gi\u1EEFa nguy\xEAn li\u1EC7u n\xFAi r\u1EEBng nguy\xEAn b\u1EA3n v\xE0 c\xE1ch ch\u1EBF bi\u1EBFn m\u1ED9c m\u1EA1c b\xEAn b\u1EBFp l\u1EEDa: g\xE0 th\u1EA3 v\u01B0\u1EDDn B\u1EA3n \u0110\xF4n n\u01B0\u1EDBng mu\u1ED1i \u1EDBt xi\xEAm xanh, c\u01A1m lam n\u01B0\u1EDBng \u1ED1ng n\u1EE9a non d\u1EBBo th\u01A1m v\xE0 c\xE1 l\u0103ng t\u01B0\u01A1i r\xF3i t\u1EEB s\xF4ng S\xEAr\xEAp\u1ED1k.",
      "\u0110\u1EB7c bi\u1EC7t, du kh\xE1ch kh\xF3 c\xF3 th\u1EC3 qu\xEAn v\u1ECB ng\u1ECDt thanh c\u1EE7a canh l\xE1 b\xE9p n\u1EA5u t\xF4m s\xF4ng hay v\u1ECB \u0111\u1EAFng h\u1EADu \u0111\u1EA7y cu\u1ED1n h\xFAt c\u1EE7a m\xF3n c\xE0 \u0111\u1EAFng gi\xE3 ki\u1EBFn v\xE0ng."
    ],
    quote: "\u201CM\u1ED7i m\xF3n \u0103n \u0111\u1EA1i ng\xE0n \u0111\u1EC1u mang theo h\u01B0\u01A1ng kh\xF3i b\u1EBFp nh\xE0 d\xE0i v\xE0 v\u1ECB t\u01B0\u01A1i nguy\xEAn c\u1EE7a r\u1EEBng xanh.\u201D",
    quoteSource: "\u2014 B\u1EA3n \u0111\u1ED3 \u1EA8m th\u1EF1c \u0110\u1EAFk L\u1EAFk",
    glossary: [
      { term: "Canh l\xE1 b\xE9p", def: "Lo\u1EA1i rau r\u1EEBng \u0111\u1EB7c tr\u01B0ng c\xF3 v\u1ECB ng\u1ECDt b\xF9i t\u1EF1 nhi\xEAn, th\u01B0\u1EDDng n\u1EA5u c\xF9ng t\xF4m su\u1ED1i ho\u1EB7c th\u1ECBt hun kh\xF3i." },
      { term: "C\u01A1m lam \u1ED1ng n\u1EE9a", def: "G\u1EA1o n\u1EBFp n\u01B0\u01A1ng ng\xE2m n\u01B0\u1EDBc su\u1ED1i, n\u01B0\u1EDBng ch\xEDn trong \u1ED1ng n\u1EE9a non t\u1EA1o h\u01B0\u01A1ng th\u01A1m thanh khi\u1EBFt." }
    ]
  }
};
var redEarthStories = [
  {
    id: "re-1",
    tag: "Ngh\u1EC7 nh\xE2n Chi\xEAng Knah",
    title: "Ng\u01B0\u1EDDi gi\u1EEF l\u1EEDa b\xEAn b\u1EBFp nh\xE0 d\xE0i",
    desc: "C\xE2u chuy\u1EC7n c\u1EE7a nh\u1EEFng ngh\u1EC7 nh\xE2n gi\xE0 v\u1EABn ng\xE0y \u0111\xEAm truy\u1EC1n d\u1EA1y nh\u1ECBp chi\xEAng Knah cho th\u1EBF h\u1EC7 tr\u1EBB trong bu\xF4n.",
    cta: "Nghe ngh\u1EC7 nh\xE2n k\u1EC3 chuy\u1EC7n chi\xEAng",
    offsetClass: "mt-0",
    gradient: "from-[#132A1E] to-[#8C3B2B]",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/18/Tay_Nguyen_gongs.JPG",
    themeKey: "culture",
    location: "Bu\xF4n Ako Dh\xF4ng \u2022 Bu\xF4n Ma Thu\u1ED9t",
    fullParas: [
      "Khi \xE1nh l\u1EEDa b\u1EADp b\xF9ng gi\u1EEFa gian kh\xE1ch ng\xF4i nh\xE0 d\xE0i \xCA \u0110\xEA, \u0111\xF4i b\xE0n tay g\xE2n gu\u1ED1c c\u1EE7a gi\xE0 Ama H\u2019Loan l\u1EA1i n\xE2ng niu t\u1EEBng chi\u1EBFc chi\xEAng \u0111\u1ED3ng c\u1ED5. V\u1EDBi \xF4ng, m\u1ED7i chi\u1EBFc chi\xEAng trong b\u1ED9 chi\xEAng Knah \u0111\u1EC1u c\xF3 linh h\u1ED3n v\xE0 ti\u1EBFng n\xF3i ri\xEAng \u2014 t\u1EEB chi\u1EBFc chi\xEAng c\xE1i tr\u1EA7m h\xF9ng d\u1EABn nh\u1ECBp \u0111\u1EBFn nh\u1EEFng chi\u1EBFc chi\xEAng con ng\xE2n vang nh\u01B0 ti\u1EBFng su\u1ED1i reo.",
      "Su\u1ED1t h\u01A1n b\u1ED1n th\u1EADp k\u1EF7, \xF4ng mi\u1EC7t m\xE0i m\u1EDF l\u1EDBp truy\u1EC1n d\u1EA1y \u0111\xE1nh chi\xEAng mi\u1EC5n ph\xED cho thanh thi\u1EBFu ni\xEAn trong bu\xF4n v\xE0o m\u1ED7i t\u1ED1i cu\u1ED1i tu\u1EA7n, \u0111\u1EC3 thanh \xE2m \u0111\u1EA1i ng\xE0n kh\xF4ng bao gi\u1EDD \u0111\u1EE9t \u0111o\u1EA1n gi\u1EEFa nh\u1ECBp s\u1ED1ng hi\u1EC7n \u0111\u1EA1i."
    ],
    quote: "\u201CC\xF2n ti\u1EBFng chi\xEAng ng\xE2n b\xEAn b\u1EBFp l\u1EEDa l\xE0 c\xF2n h\u1ED3n c\u1ED1t c\u1EE7a ng\u01B0\u1EDDi \xCA \u0110\xEA tr\xEAn \u0111\u1EA5t \u0111\u1ECF bazan.\u201D"
  },
  {
    id: "re-2",
    tag: "M\xF9a Hoa Th\xE1ng Ba",
    title: "Gi\u1ECDt s\u01B0\u01A1ng tr\xEAn hoa c\xE0 ph\xEA th\xE1ng Ba",
    desc: "Khi c\u1EA3 cao nguy\xEAn ph\u1EE7 m\u1ED9t m\xE0u tr\u1EAFng tinh kh\xF4i v\xE0 h\u01B0\u01A1ng hoa ng\u1ECDt ng\xE0o \u0111\xE1nh th\u1EE9c t\u1EEBng \u0111\xE0n ong \u0111i l\u1EA5y m\u1EADt.",
    cta: "D\u1EA1o b\u01B0\u1EDBc gi\u1EEFa m\xF9a hoa tr\u1EAFng",
    offsetClass: "mt-7",
    gradient: "from-[#1D3B2A] to-[#B08968]",
    image: "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1000&q=80",
    themeKey: "coffee",
    location: "C\u01B0 M\u2019gar \u2022 \u0110\u1EAFk L\u1EAFk",
    fullParas: [
      "Sau \u0111\u1EE3t t\u01B0\u1EDBi n\u01B0\u1EDBc \u0111\u1EA7u xu\xE2n, ch\u1EC9 sau v\xE0i \u0111\xEAm, h\xE0ng tr\u0103m ngh\xECn hecta c\xE0 ph\xEA kh\u1EAFp \u0110\u1EAFk L\u1EAFk \u0111\u1ED3ng lo\u1EA1t bung n\u1EDF. Nh\u1EEFng ch\xF9m hoa tr\u1EAFng mu\u1ED1t k\u1EBFt th\xE0nh t\u1EEBng d\u1EA3i d\xE0i d\u1ECDc theo c\xE0nh c\xE0 ph\xEA, t\u1ECFa h\u01B0\u01A1ng th\u01A1m thanh khi\u1EBFt nh\u01B0 hoa nh\xE0i quy\u1EC7n c\xF9ng n\u1EAFng s\u1EDBm cao nguy\xEAn.",
      "\u0110\xF3 c\u0169ng l\xE0 m\xF9a nh\u1EEFng ng\u01B0\u1EDDi nu\xF4i ong di c\u01B0 \u0111\u01B0a \u0111\xE0n ong v\u1EC1 \u0111\u1EB7t d\u01B0\u1EDBi t\xE1n c\xE0 ph\xEA, t\u1EA1o n\xEAn th\u1EE9 m\u1EADt ong hoa c\xE0 ph\xEA v\xE0ng \xF3ng, s\xE1nh \u0111\u1EB7c mang h\u01B0\u01A1ng v\u1ECB \u0111\u1EB7c tr\u01B0ng kh\xF4ng n\u01A1i n\xE0o c\xF3 \u0111\u01B0\u1EE3c."
    ],
    quote: "\u201CTh\xE1ng Ba \u1EDF Ban M\xEA, ch\u1EC9 c\u1EA7n m\u1EDF c\u1EEDa s\u1ED5 bu\u1ED5i s\u1EDBm l\xE0 th\u1EA5y c\u1EA3 m\u1ED9t tr\u1EDDi tuy\u1EBFt tr\u1EAFng th\u01A1m n\u1ED3ng h\u01B0\u01A1ng m\u1EADt.\u201D"
  },
  {
    id: "re-3",
    tag: "Huy\u1EC1n Tho\u1EA1i D\xF2ng S\xF4ng",
    title: "D\xF2ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c v\xE0 k\xFD \u1EE9c b\u1EA3n \u0110\xF4n",
    desc: "L\u1EAFng nghe nh\u1EEFng giai tho\u1EA1i v\u1EC1 d\xF2ng s\xF4ng huy\u1EC1n tho\u1EA1i \xF4m tr\u1ECDn bao th\u1EBF h\u1EC7 ng\u01B0\u1EDDi M'n\xF4ng, \xCA \u0110\xEA.",
    cta: "L\u1EA7n theo huy\u1EC1n tho\u1EA1i s\xF4ng ng\u01B0\u1EE3c",
    offsetClass: "mt-2",
    gradient: "from-[#0F2419] to-[#2C4A3E]",
    image: "https://images.unsplash.com/photo-1575346571914-171503f16cc4?auto=format&fit=crop&w=1000&q=80",
    themeKey: "nature",
    location: "Bu\xF4n \u0110\xF4n \u2022 L\u01B0u v\u1EF1c S\xEAr\xEAp\u1ED1k",
    fullParas: [
      "H\u1EE3p l\u01B0u t\u1EEB hai d\xF2ng s\xF4ng Kr\xF4ng Ana (s\xF4ng C\xE1i) v\xE0 Kr\xF4ng N\xF4 (s\xF4ng \u0110\u1EF1c), s\xF4ng S\xEAr\xEAp\u1ED1k kh\xF4ng \u0111\u1ED5 ra bi\u1EC3n \u0110\xF4ng m\xE0 ch\u1EA3y ng\u01B0\u1EE3c v\u1EC1 ph\xEDa T\xE2y h\xF2a v\xE0o d\xF2ng M\xEA K\xF4ng. Ch\xEDnh s\u1EF1 k\u1EF3 th\xFA c\u1EE7a \u0111\u1ECBa h\xECnh \u1EA5y \u0111\xE3 nu\xF4i d\u01B0\u1EE1ng bao truy\u1EC1n thuy\u1EBFt h\xE0o h\xF9ng c\u1EE7a v\xF9ng \u0111\u1EA5t B\u1EA3n \u0110\xF4n.",
      "D\u01B0\u1EDBi nh\u1EEFng r\u1EB7ng si c\u1ED5 th\u1EE5 r\u1EE7 b\xF3ng xu\u1ED1ng b\u1EBFn n\u01B0\u1EDBc, k\xFD \u1EE9c v\u1EC1 nh\u1EEFng ng\u01B0\u1EDDi s\u0103n voi huy\u1EC1n tho\u1EA1i v\xE0 ngh\u1EC7 thu\u1EADt chung s\u1ED1ng h\xE0i h\xF2a v\u1EDBi thi\xEAn nhi\xEAn v\u1EABn \u0111\u01B0\u1EE3c k\u1EC3 l\u1EA1i qua t\u1EEBng th\u1EBF h\u1EC7."
    ],
    quote: "\u201CD\xF2ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c nh\u01B0 t\xEDnh c\xE1ch ph\xF3ng kho\xE1ng, m\u1EA1nh m\u1EBD c\u1EE7a con ng\u01B0\u1EDDi cao nguy\xEAn.\u201D"
  },
  {
    id: "re-4",
    tag: "Th\u1ED5 C\u1EA9m Truy\u1EC1n Th\u1ED1ng",
    title: "\u0110\xF4i tay d\u1EC7t th\u1ED5 c\u1EA9m d\u01B0\u1EDBi hi\xEAn nh\xE0",
    desc: "T\u1EEBng s\u1EE3i ch\u1EC9 nhu\u1ED9m m\xE0u v\u1ECF c\xE2y r\u1EEBng k\u1EBFt tinh th\xE0nh hoa v\u0103n k\u1EC3 chuy\u1EC7n n\xFAi s\xF4ng tr\xEAn t\u1EA5m Kpan.",
    cta: "Kh\xE1m ph\xE1 m\u1EADt m\xE3 hoa v\u0103n Kpan",
    offsetClass: "mt-9",
    gradient: "from-[#8C3B2B] to-[#3B1E14]",
    image: "https://images.unsplash.com/photo-1766875127679-00a421f8e126?auto=format&fit=crop&w=1000&q=80",
    themeKey: "culture",
    location: "Bu\xF4n T\u01A1ng J\xFA \u2022 Ea Kao",
    fullParas: [
      "B\xEAn khung d\u1EC7t truy\u1EC1n th\u1ED1ng \u0111\u1EB7t d\u01B0\u1EDBi hi\xEAn nh\xE0 d\xE0i, ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF \xCA \u0110\xEA ki\xEAn nh\u1EABn lu\u1ED3n t\u1EEBng s\u1EE3i ch\u1EC9 b\xF4ng \u0111\u01B0\u1EE3c nhu\u1ED9m t\u1EEB v\u1ECF c\xE2y k\u01A1-nia, c\u1EE7 n\xE2u v\xE0 l\xE1 ch\xE0m r\u1EEBng. Kh\xF4ng c\u1EA7n b\u1EA3n v\u1EBD gi\u1EA5y, m\u1ECDi hoa v\u0103n h\xECnh thoi, d\xE3y n\xFAi, con chim hay b\u1EADc c\u1EA7u thang \u0111\u1EC1u n\u1EB1m tr\u1ECDn trong tr\xED nh\u1EDB.",
      "M\u1ED7i t\u1EA5m th\u1ED5 c\u1EA9m ho\xE0n th\xE0nh c\xF3 th\u1EC3 m\u1EA5t h\xE0ng th\xE1ng tr\u1EDDi, mang theo l\u1EDDi ch\xFAc b\xECnh an v\xE0 ni\u1EC1m t\u1EF1 h\xE0o c\u1EE7a ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF T\xE2y Nguy\xEAn."
    ],
    quote: "\u201CM\u1ED7i \u0111\u01B0\u1EDDng d\u1EC7t Kteh l\xE0 m\u1ED9t c\xE2u chuy\u1EC7n n\xFAi s\xF4ng \u0111\u01B0\u1EE3c vi\u1EBFt b\u1EB1ng s\u1EE3i b\xF4ng v\xE0 s\u1EAFc m\xE0u c\u1EE7a r\u1EEBng.\u201D"
  },
  {
    id: "re-5",
    tag: "B\xECnh Minh H\u1ED3 L\u1EAFk",
    title: "M\u1ED9t s\u1EDBm b\xECnh minh tr\xEAn m\u1EB7t h\u1ED3 L\u1EAFk",
    desc: "Ti\u1EBFng m\xE1i ch\xE8o \u0111\u1ED9c m\u1ED9c khua nh\u1EB9 l\xE0n s\u01B0\u01A1ng m\u1EDD khi nh\u1EEFng tia n\u1EAFng \u0111\u1EA7u ti\xEAn ch\u1EA1m \u0111\u1EC9nh Ch\u01B0 Yang Sin.",
    cta: "Ch\xE8o \u0111\u1ED9c m\u1ED9c \u0111\xF3n b\xECnh minh",
    offsetClass: "mt-1",
    gradient: "from-[#182E22] to-[#D48C46]",
    image: "https://images.unsplash.com/photo-1669172463013-0c9a13d75bb4?auto=format&fit=crop&w=1000&q=80",
    themeKey: "coffee",
    location: "Bu\xF4n Jun \u2022 Huy\u1EC7n L\u1EAFk",
    fullParas: [
      "L\xFAc 5 gi\u1EDD 30 s\xE1ng, m\u1EB7t h\u1ED3 L\u1EAFk r\u1ED9ng h\u01A1n 500 hecta v\u1EABn c\xF2n ch\xECm trong l\u1EDBp s\u01B0\u01A1ng b\u1EA3ng l\u1EA3ng. T\u1EEB b\u1EBFn thuy\u1EC1n Bu\xF4n Jun, nh\u1EEFng chi\u1EBFc thuy\u1EC1n \u0111\u1ED9c m\u1ED9c \u0111\u1EBDo t\u1EEB nguy\xEAn th\xE2n c\xE2y sao c\u1ED5 th\u1EE5 l\u1EB7ng l\u1EBD r\u1EBD n\u01B0\u1EDBc.",
      "Khi \xE1nh n\u1EAFng b\xECnh minh \u0111\u1EA7u ti\xEAn v\u01B0\u1EE3t qua \u0111\u1EC9nh Ch\u01B0 Yang Sin chi\u1EBFu r\u1ECDi xu\u1ED1ng m\u1EB7t n\u01B0\u1EDBc ph\u1EB3ng l\u1EB7ng nh\u01B0 g\u01B0\u01A1ng, c\u1EA3 kh\xF4ng gian b\u1EEBng l\xEAn s\u1EAFc v\xE0ng h\u1ED5 ph\xE1ch \u0111\u1EA7y m\xEA ho\u1EB7c."
    ],
    quote: "\u201CTr\xEAn chi\u1EBFc thuy\u1EC1n \u0111\u1ED9c m\u1ED9c gi\u1EEFa s\u01B0\u01A1ng s\u1EDBm H\u1ED3 L\u1EAFk, th\u1EDDi gian d\u01B0\u1EDDng nh\u01B0 ng\u1EEBng tr\xF4i.\u201D"
  },
  {
    id: "re-6",
    tag: "Th\u1EBF H\u1EC7 N\xF4ng D\xE2n Tr\u1EBB",
    title: "V\u1ECB \u0111\u1EAFng thanh tao c\u1EE7a c\xE0 ph\xEA rang m\u1ED9c",
    desc: "H\xE0nh tr\xECnh c\u1EE7a nh\u1EEFng ng\u01B0\u1EDDi n\xF4ng d\xE2n tr\u1EBB b\u1ECF ph\u1ED1 v\u1EC1 r\u1EEBng, n\xE2ng t\u1EA7m gi\xE1 tr\u1ECB h\u1EA1t Robusta \u0110\u1EAFk L\u1EAFk.",
    cta: "G\u1EB7p nh\u1EEFng ng\u01B0\u1EDDi tr\u1EBB gi\u1EEF r\u1EABy",
    offsetClass: "mt-8",
    gradient: "from-[#2C1E16] to-[#132A1E]",
    image: "https://images.unsplash.com/photo-1565276002627-8dd8ae39a98b?auto=format&fit=crop&w=1000&q=80",
    themeKey: "coffee",
    location: "Ea T\xE2n \u2022 Kr\xF4ng N\u0103ng",
    fullParas: [
      "R\u1EDDi b\u1ECF nh\u1ECBp s\u1ED1ng h\u1ED1i h\u1EA3 n\u01A1i \u0111\xF4 th\u1ECB, nhi\u1EC1u ng\u01B0\u1EDDi tr\u1EBB \u0110\u1EAFk L\u1EAFk \u0111\xE3 tr\u1EDF v\u1EC1 ch\xEDnh khu v\u01B0\u1EDDn c\u1EE7a gia \u0111\xECnh \u0111\u1EC3 thay \u0111\u1ED5i c\xE1ch l\xE0m c\xE0 ph\xEA truy\u1EC1n th\u1ED1ng. H\u1ECD ki\xEAn tr\xEC h\xE1i ch\xEDn 100%, x\xE2y d\u1EF1ng nh\xE0 k\xEDnh ph\u01A1i gi\xE0n v\xE0 ghi ch\xE9p t\u1EC9 m\u1EC9 t\u1EEBng m\u1EBB l\xEAn men.",
      "Nh\u1EDD \u0111\xF3, h\u1EA1t Robusta \u0110\u1EAFk L\u1EAFk h\xF4m nay kh\xF4ng c\xF2n ch\u1EC9 l\xE0 nguy\xEAn li\u1EC7u th\xF4 m\xE0 \u0111\xE3 tr\u1EDF th\xE0nh ni\u1EC1m t\u1EF1 h\xE0o c\u1EE7a c\xE0 ph\xEA \u0111\u1EB7c s\u1EA3n Vi\u1EC7t Nam."
    ],
    quote: "\u201CKhi b\u1EA1n tr\xE2n tr\u1ECDng t\u1EEBng tr\xE1i c\xE0 ph\xEA ch\xEDn \u0111\u1ECF, \u0111\u1EA5t bazan s\u1EBD tr\u1EA3 l\u1EA1i h\u01B0\u01A1ng v\u1ECB ng\u1ECDt ng\xE0o nh\u1EA5t.\u201D"
  },
  {
    id: "re-7",
    tag: "T\xEDn Ng\u01B0\u1EE1ng Ngu\u1ED3n N\u01B0\u1EDBc",
    title: "M\xF9a l\u1EC5 c\xFAng b\u1EBFn n\u01B0\u1EDBc \u0111\u1EA7u n\u0103m",
    desc: "Nghi th\u1EE9c thi\xEAng li\xEAng t\u1EA1 \u01A1n th\u1EA7n ngu\u1ED3n n\u01B0\u1EDBc \u0111\xE3 ban cho bu\xF4n l\xE0ng m\xF9a m\xE0ng t\u01B0\u01A1i t\u1ED1t v\xE0 b\xECnh an.",
    cta: "T\xECm hi\u1EC3u nghi l\u1EC5 Kpin Ea",
    offsetClass: "mt-3",
    gradient: "from-[#132A1E] to-[#3A5A40]",
    image: "https://images.unsplash.com/photo-1444290679983-dd3aabf671ec?auto=format&fit=crop&w=1000&q=80",
    themeKey: "culture",
    location: "B\u1EBFn n\u01B0\u1EDBc c\u1ED5 \u2022 Bu\xF4n Ma Thu\u1ED9t",
    fullParas: [
      "V\u1EDBi ng\u01B0\u1EDDi \xCA \u0110\xEA, b\u1EBFn n\u01B0\u1EDBc \u0111\u1EA7u bu\xF4n l\xE0 m\u1EA1ch s\u1ED1ng thi\xEAng li\xEAng g\u1EAFn k\u1EBFt c\u1EA3 c\u1ED9ng \u0111\u1ED3ng. Sau m\xF9a thu ho\u1EA1ch, bu\xF4n l\xE0ng l\u1EA1i t\u1ED5 ch\u1EE9c l\u1EC5 c\xFAng b\u1EBFn n\u01B0\u1EDBc (Kpin Ea) \u0111\u1EC3 t\u1EA1 \u01A1n th\u1EA7n n\u01B0\u1EDBc v\xE0 nh\u1EAFc nh\u1EDF con ch\xE1u gi\u1EEF g\xECn r\u1EEBng \u0111\u1EA7u ngu\u1ED3n xanh m\xE1t.",
      "Ti\u1EBFng chi\xEAng r\u1ED9n r\xE3 h\xF2a c\xF9ng d\xF2ng n\u01B0\u1EDBc m\xE1t l\xE0nh ch\u1EA3y qua \u1ED1ng l\u1ED3 \xF4 t\u1EA1o n\xEAn b\u1EE9c tranh v\u0103n h\xF3a nguy\xEAn b\u1EA3n \u0111\u1EA7y s\u1EE9c s\u1ED1ng."
    ],
    quote: "\u201CGi\u1EEF cho r\u1EEBng \u0111\u1EA7u ngu\u1ED3n xanh c\u0169ng ch\xEDnh l\xE0 gi\u1EEF cho d\xF2ng n\u01B0\u1EDBc c\u1EE7a bu\xF4n l\xE0ng m\xE3i ch\u1EA3y.\u201D"
  },
  {
    id: "re-8",
    tag: "Nh\u1EA1c C\u1EE5 N\xFAi R\u1EEBng",
    title: "Giai \u0111i\u1EC7u \u0111\xE0n T'r\u01B0ng gi\u1EEFa \u0111\u1EA1i ng\xE0n",
    desc: "\xC2m thanh trong tr\u1EBBo nh\u01B0 ti\u1EBFng su\u1ED1i reo \u0111\u01B0\u1EE3c t\u1EA1o n\xEAn t\u1EEB nh\u1EEFng \u1ED1ng tre n\u1EE9a m\u1ED9c m\u1EA1c c\u1EE7a n\xFAi r\u1EEBng.",
    cta: "C\u1EA3m nh\u1EADn thanh \xE2m tre n\u1EE9a",
    offsetClass: "mt-6",
    gradient: "from-[#5C3A21] to-[#182E22]",
    image: "https://images.unsplash.com/photo-1649262763778-c70fda642ae9?auto=format&fit=crop&w=1000&q=80",
    themeKey: "culture",
    location: "Cao nguy\xEAn \u0110\u1EAFk L\u1EAFk",
    fullParas: [
      "\u0110\u01B0\u1EE3c ch\u1EBF t\xE1c t\u1EEB nh\u1EEFng \u1ED1ng tre, \u1ED1ng n\u1EE9a gi\xE0 ph\u01A1i kh\xF4 tr\xEAn g\xE1c b\u1EBFp, \u0111\xE0n T\u2019r\u01B0ng mang \xE2m s\u1EAFc trong v\u1EAFt, r\u1ED9n r\xE0ng nh\u01B0 ti\u1EBFng th\xE1c \u0111\u1ED5, ti\u1EBFng gi\xF3 l\xF9a qua r\u1EB7ng tre n\u1EE9a \u0111\u1EA1i ng\xE0n.",
      "D\u01B0\u1EDBi \u0111\xF4i tay \u0111i\xEAu luy\u1EC7n c\u1EE7a ngh\u1EC7 nh\xE2n b\u1EA3n \u0111\u1ECBa, nh\u1EEFng \u1ED1ng tre m\u1ED9c m\u1EA1c c\u1EA5t l\xEAn b\u1EA3n h\xF2a ca \u0111\u1EA7y l\u1EA1c quan v\u1EC1 t\xECnh y\xEAu thi\xEAn nhi\xEAn v\xE0 cu\u1ED9c s\u1ED1ng bu\xF4n l\xE0ng."
    ],
    quote: "\u201C\u0110\xE0n T\u2019r\u01B0ng l\xE0 ti\u1EBFng su\u1ED1i r\u1EEBng h\xF3a th\xE0nh \xE2m nh\u1EA1c trong b\xE0n tay ng\u01B0\u1EDDi T\xE2y Nguy\xEAn.\u201D"
  }
];

// src/data/places.ts
var dakLakPlaceDirectory = [
  {
    title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA",
    location: "\u0110\u01B0\u1EDDng Nguy\u1EC5n \u0110\xECnh Chi\u1EC3u \u2022 TP. BMT",
    x: 405,
    y: 172,
    lat: 12.69086,
    lng: 108.04471,
    googleMapsQuery: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA, Nguy\u1EC5n \u0110\xECnh Chi\u1EC3u, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "B\u1EA3o t\xE0ng & C\xE0 ph\xEA",
    rating: "4.8",
    reviews: "3.420",
    duration: "1.5 \u2013 2 gi\u1EDD",
    period: "Gi\u1EEFa s\xE1ng",
    time: "09:30 \u2013 11:30",
    image: "https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=600&q=80",
    desc: "Chi\xEAm ng\u01B0\u1EE1ng ki\u1EBFn tr\xFAc m\xE1i v\xF2m nh\xE0 d\xE0i \xCA \u0110\xEA \u0111\u01B0\u01A1ng \u0111\u1EA1i v\xE0 h\u01A1n 10.000 hi\u1EC7n v\u1EADt v\u0103n minh c\xE0 ph\xEA to\xE0n c\u1EA7u."
  },
  {
    title: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn",
    location: "163 L\xFD Th\xE1i T\u1ED5 \u2022 TP. BMT",
    x: 362,
    y: 186,
    lat: 12.701056,
    lng: 108.061103,
    googleMapsQuery: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn, 163 L\xFD Th\xE1i T\u1ED5, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "Kh\xF4ng gian C\xE0 ph\xEA",
    rating: "4.7",
    reviews: "2.180",
    duration: "1.5 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "08:00 \u2013 09:30",
    image: "https://images.unsplash.com/photo-1565276002627-8dd8ae39a98b?auto=format&fit=crop&w=600&q=80",
    desc: "Qu\u1EA7n th\u1EC3 ki\u1EBFn tr\xFAc g\u1ED7 c\u1ED5 v\xE0 v\u01B0\u1EDDn c\xE0 ph\xEA c\u1ED5 th\u1EE5 gi\u1EEFa l\xF2ng Bu\xF4n Ma Thu\u1ED9t v\u1EDBi h\u01B0\u01A1ng v\u1ECB Robusta \u0111\u1EB7c s\u1EA3n."
  },
  {
    title: "Bu\xF4n c\u1ED5 Ako Dh\xF4ng",
    location: "Cu\u1ED1i \u0111\u01B0\u1EDDng Tr\u1EA7n Nh\u1EADt Du\u1EADt \u2022 BMT",
    x: 392,
    y: 150,
    lat: 12.6964,
    lng: 108.0478,
    googleMapsQuery: "Bu\xF4n Ak\xF4 \u0110h\xF4ng, Tr\u1EA7n Nh\u1EADt Du\u1EADt, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "Di s\u1EA3n B\u1EA3n \u0111\u1ECBa",
    rating: "4.8",
    reviews: "1.540",
    duration: "2 gi\u1EDD",
    period: "Bu\u1ED5i chi\u1EC1u",
    time: "14:30 \u2013 16:30",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Dan_toc_hoc_19.jpg",
    desc: "Ng\xF4i bu\xF4n gi\xE0u truy\u1EC1n th\u1ED1ng nh\u1EA5t BMT v\u1EDBi h\xE0ng ch\u1EE5c n\u1EBFp nh\xE0 d\xE0i m\u1EABu h\u1EC7 nguy\xEAn b\u1EA3n d\u01B0\u1EDBi t\xE1n c\xE2y \u0111\u1EA7u ngu\u1ED3n."
  },
  {
    title: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk",
    location: "S\u1ED1 12 L\xEA Du\u1EA9n \u2022 TP. BMT",
    x: 378,
    y: 196,
    lat: 12.6715,
    lng: 108.0535,
    googleMapsQuery: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk, 12 L\xEA Du\u1EA9n, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "B\u1EA3o t\xE0ng V\u0103n h\xF3a",
    rating: "4.7",
    reviews: "980",
    duration: "1.5 \u2013 2 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "08:30 \u2013 10:30",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/18/Tay_Nguyen_gongs.JPG",
    desc: "Tr\u01B0ng b\xE0y b\u1ED9 s\u01B0u t\u1EADp chi\xEAng \u0111\u1ED3ng c\u1ED5, th\u1ED5 c\u1EA9m Kteh v\xE0 \u0111a d\u1EA1ng sinh h\u1ECDc cao nguy\xEAn \u0110\u1EAFk L\u1EAFk."
  },
  {
    title: "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n",
    location: "Huy\u1EC7n Kr\xF4ng N\u0103ng \u2022 Ea T\xE2n",
    x: 472,
    y: 92,
    lat: 12.94694,
    lng: 108.36111,
    googleMapsQuery: "X\xE3 Ea T\xE2n, Kr\xF4ng N\u0103ng, \u0110\u1EAFk L\u1EAFk",
    category: "Tr\u1EA3i nghi\u1EC7m N\xF4ng tr\u1EA1i",
    rating: "4.9",
    reviews: "410",
    duration: "2.5 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "07:30 \u2013 10:30",
    image: "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=600&q=80",
    desc: "Thu h\xE1i tr\xE1i ch\xEDn, xem ph\u01A1i gi\xE0n nh\xE0 k\xEDnh v\xE0 th\u1EED n\u1EBFm (cupping) c\xE1c m\u1EBB Fine Robusta rang m\u1EDBi."
  },
  {
    title: "\u0110\xE1 Voi M\u1EB9 Yang Tao",
    location: "X\xE3 Yang Tao \u2022 Qu\u1ED1c l\u1ED9 27",
    x: 478,
    y: 256,
    lat: 12.48139,
    lng: 108.23306,
    googleMapsQuery: "\u0110\xE1 Voi M\u1EB9, Yang Tao, L\u1EAFk, \u0110\u1EAFk L\u1EAFk",
    category: "Th\u1EAFng c\u1EA3nh Thi\xEAn nhi\xEAn",
    rating: "4.7",
    reviews: "1.120",
    duration: "1 gi\u1EDD",
    period: "Bu\u1ED5i tr\u01B0a",
    time: "11:30 \u2013 12:45",
    image: "https://images.unsplash.com/photo-1677741447050-e166cf1a1f14?auto=format&fit=crop&w=600&q=80",
    desc: "T\u1EA3ng \u0111\xE1 nguy\xEAn kh\u1ED1i l\u1EDBn nh\u1EA5t Vi\u1EC7t Nam v\u1EDBi t\u1EA7m nh\xECn to\xE0n c\u1EA3nh thung l\u0169ng l\xFAa d\u01B0\u1EDBi ch\xE2n Ch\u01B0 Yang Sin."
  },
  {
    title: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun",
    location: "Th\u1ECB tr\u1EA5n Li\xEAn S\u01A1n \u2022 Huy\u1EC7n L\u1EAFk",
    x: 545,
    y: 315,
    lat: 12.42167,
    lng: 108.18194,
    googleMapsQuery: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun, Th\u1ECB tr\u1EA5n Li\xEAn S\u01A1n, Huy\u1EC7n L\u1EAFk, \u0110\u1EAFk L\u1EAFk",
    category: "H\u1ED3 t\u1EF1 nhi\xEAn & V\u0103n h\xF3a",
    rating: "4.8",
    reviews: "1.890",
    duration: "2.5 gi\u1EDD",
    period: "S\xE1ng s\u1EDBm / Chi\u1EC1u",
    time: "05:45 \u2013 08:15",
    image: "https://images.unsplash.com/photo-1669172463013-0c9a13d75bb4?auto=format&fit=crop&w=600&q=80",
    desc: "H\u1ED3 n\u01B0\u1EDBc ng\u1ECDt t\u1EF1 nhi\xEAn r\u1ED9ng 500ha, n\u01A1i l\xFD t\u01B0\u1EDFng \u0111\u1EC3 ch\xE8o thuy\u1EC1n \u0111\u1ED9c m\u1ED9c \u0111\xF3n s\u01B0\u01A1ng mai v\xE0 giao l\u01B0u M\u2019n\xF4ng."
  },
  {
    title: "\u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i",
    location: "\u0110\u1ED3i Li\xEAn S\u01A1n \u2022 H\u1ED3 L\u1EAFk",
    x: 515,
    y: 288,
    lat: 12.426,
    lng: 108.176,
    googleMapsQuery: "Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i H\u1ED3 L\u1EAFk, Li\xEAn S\u01A1n, Huy\u1EC7n L\u1EAFk, \u0110\u1EAFk L\u1EAFk",
    category: "Di t\xEDch L\u1ECBch s\u1EED",
    rating: "4.6",
    reviews: "640",
    duration: "1 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "08:30 \u2013 09:45",
    image: "https://images.unsplash.com/photo-1444290679983-dd3aabf671ec?auto=format&fit=crop&w=600&q=80",
    desc: "Dinh th\u1EF1 c\u1ED5 tr\xEAn \u0111\u1EC9nh \u0111\u1ED3i cao v\u1EDBi g\xF3c nh\xECn 360 \u0111\u1ED9 bao tr\u1ECDn m\u1EB7t g\u01B0\u01A1ng H\u1ED3 L\u1EAFk v\xE0 c\xE1nh \u0111\u1ED3ng l\xFAa."
  },
  {
    title: "Th\xE1c Dray Nur H\xF9ng V\u0129",
    location: "X\xE3 Dray S\xE1p \u2022 Kr\xF4ng Ana",
    x: 268,
    y: 285,
    lat: 12.5028,
    lng: 107.925,
    googleMapsQuery: "Th\xE1c Dray Nur, Dray S\xE1p, Kr\xF4ng Ana, \u0110\u1EAFk L\u1EAFk",
    category: "Th\xE1c n\u01B0\u1EDBc & Sinh th\xE1i",
    rating: "4.8",
    reviews: "2.650",
    duration: "2.5 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "08:00 \u2013 11:00",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Draynur_falls.jpg",
    desc: "B\u1EE9c t\u01B0\u1EDDng n\u01B0\u1EDBc tr\u1EAFng x\xF3a r\u1ED9ng 250m tr\xEAn s\xF4ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c c\xF9ng h\u1EC7 th\u1ED1ng c\u1EA7u treo v\xE0 hang \u0111\xE1 bazan."
  },
  {
    title: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n",
    location: "X\xE3 Kr\xF4ng Na \u2022 Bu\xF4n \u0110\xF4n",
    x: 132,
    y: 112,
    lat: 12.8038,
    lng: 107.6707,
    googleMapsQuery: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n, Kr\xF4ng Na, Bu\xF4n \u0110\xF4n, \u0110\u1EAFk L\u1EAFk",
    category: "V\u01B0\u1EDDn Qu\u1ED1c gia",
    rating: "4.9",
    reviews: "890",
    duration: "3.5 gi\u1EDD",
    period: "Bu\u1ED5i s\xE1ng",
    time: "07:30 \u2013 11:00",
    image: "https://images.unsplash.com/photo-1575346571914-171503f16cc4?auto=format&fit=crop&w=600&q=80",
    desc: "Tr\u1EA3i nghi\u1EC7m \u0111i b\u1ED9 th\xE2n thi\u1EC7n c\xF9ng voi t\u1EF1 nhi\xEAn d\u01B0\u1EDBi t\xE1n r\u1EEBng kh\u1ED9p r\u1EE5ng l\xE1 m\xF9a kh\xF4 \u0111\u1ED9c nh\u1EA5t Vi\u1EC7t Nam."
  },
  {
    title: "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m T\u01A1ng J\xFA",
    location: "X\xE3 Ea Kao \u2022 TP. BMT",
    x: 342,
    y: 235,
    lat: 12.608,
    lng: 108.055,
    googleMapsQuery: "Bu\xF4n T\u01A1ng J\xFA, X\xE3 Ea Kao, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "L\xE0ng ngh\u1EC1 Th\u1EE7 c\xF4ng",
    rating: "4.7",
    reviews: "320",
    duration: "1.5 gi\u1EDD",
    period: "Bu\u1ED5i chi\u1EC1u",
    time: "15:00 \u2013 16:45",
    image: "https://images.unsplash.com/photo-1766875127679-00a421f8e126?auto=format&fit=crop&w=600&q=80",
    desc: "Xem ngh\u1EC7 nh\xE2n nhu\u1ED9m s\u1EE3i b\xF4ng b\u1EB1ng v\u1ECF c\xE2y r\u1EEBng v\xE0 t\u1EF1 tay d\u1EC7t th\u1EED hoa v\u0103n h\xECnh h\u1ECDc truy\u1EC1n th\u1ED1ng Kteh."
  },
  {
    title: "Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t",
    location: "Trung t\xE2m TP. Bu\xF4n Ma Thu\u1ED9t",
    x: 372,
    y: 194,
    lat: 12.6816,
    lng: 108.0398,
    googleMapsQuery: "\u0110\u01B0\u1EDDng Phan \u0110\xECnh Gi\xF3t, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk",
    category: "\u1EA8m th\u1EF1c B\u1EA3n \u0111\u1ECBa",
    rating: "4.8",
    reviews: "1.430",
    duration: "1.5 gi\u1EDD",
    period: "Bu\u1ED5i t\u1ED1i",
    time: "18:30 \u2013 20:30",
    image: "https://images.unsplash.com/photo-1648141643305-efb7d2542602?auto=format&fit=crop&w=600&q=80",
    desc: "Th\u01B0\u1EDFng th\u1EE9c b\xFAn \u0111\u1ECF Ban M\xEA, b\xE1nh \u01B0\u1EDBt th\u1ECBt n\u01B0\u1EDBng ch\u1ED3ng \u0111\u0129a v\xE0 c\xE0 ph\xEA v\u1EE3t n\xF3ng h\u1ED5i d\u01B0\u1EDBi ti\u1EBFt tr\u1EDDi se l\u1EA1nh."
  },
  {
    title: "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n",
    location: "Khu du l\u1ECBch Bu\xF4n \u0110\xF4n",
    x: 175,
    y: 138,
    lat: 12.875,
    lng: 107.817,
    googleMapsQuery: "Trung t\xE2m du l\u1ECBch C\u1EA7u treo Bu\xF4n \u0110\xF4n, Kr\xF4ng Na, \u0110\u1EAFk L\u1EAFk",
    category: "V\u0103n h\xF3a & S\xF4ng n\u01B0\u1EDBc",
    rating: "4.6",
    reviews: "1.760",
    duration: "1.5 gi\u1EDD",
    period: "Bu\u1ED5i tr\u01B0a",
    time: "12:00 \u2013 14:00",
    image: "https://images.unsplash.com/photo-1649262763778-c70fda642ae9?auto=format&fit=crop&w=600&q=80",
    desc: "D\u1EA1o b\u01B0\u1EDBc qua nh\u1EEFng nh\u1ECBp c\u1EA7u treo tre l\u1EAFc l\u01B0 d\u01B0\u1EDBi v\xF2m r\u1EC5 si c\u1ED5 th\u1EE5 v\xE0 th\u01B0\u1EDFng th\u1EE9c g\xE0 n\u01B0\u1EDBng c\u01A1m lam."
  }
];

// server/services/core/auth.ts
import crypto from "node:crypto";
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, stored) {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  const result = {};
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}
async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = /* @__PURE__ */ new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1e3);
  const expiresAt = expires.toISOString();
  const createdAt = now.toISOString();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("sessions").insert({
      token,
      user_id: userId,
      expires_at: expiresAt,
      created_at: createdAt
    });
    if (error) {
      throw new Error(`Failed to create session in Supabase: ${error.message}`);
    }
    return { token, expiresAt };
  }
  const db = getDb();
  db.prepare(
    "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).run(token, userId, expiresAt, createdAt);
  return { token, expiresAt };
}
async function deleteSession(token) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    await supabase.from("sessions").delete().eq("token", token);
    return;
  }
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
function extractSessionTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string") {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  const headerToken = req.headers["x-cms-token"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}
async function getAuthUserFromRequest(req) {
  const token = extractSessionTokenFromRequest(req);
  if (!token) return null;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: sessionRow, error } = await supabase.from("sessions").select(
      "token, expires_at, user:users(id, email, display_name, role, is_active)"
    ).eq("token", token).maybeSingle();
    if (error || !sessionRow) return null;
    const rawUser = Array.isArray(sessionRow.user) ? sessionRow.user[0] : sessionRow.user;
    if (!rawUser) return null;
    const userRow = rawUser;
    const isActive = userRow.is_active === true || userRow.is_active === 1;
    if (new Date(sessionRow.expires_at).getTime() < Date.now() || !isActive) {
      await supabase.from("sessions").delete().eq("token", token);
      return null;
    }
    return {
      id: Number(userRow.id),
      email: userRow.email,
      displayName: userRow.display_name,
      role: userRow.role,
      isActive: true
    };
  }
  const db = getDb();
  const row = db.prepare(
    `SELECT u.id, u.email, u.display_name, u.role, u.is_active, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
  ).get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now() || row.is_active !== 1) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active === 1
  };
}
async function attachOptionalAuth(req, _res, next) {
  try {
    req.authUser = await getAuthUserFromRequest(req) || void 0;
    next();
  } catch (err) {
    next(err);
  }
}
async function requireAuth(req, res, next) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 truy c\u1EADp c\u1ED5ng qu\u1EA3n tr\u1ECB." });
      return;
    }
    req.authUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
function requireAdmin(req, res, next) {
  if (!req.authUser) {
    res.status(401).json({ error: "Ch\u01B0a x\xE1c th\u1EF1c ng\u01B0\u1EDDi d\xF9ng." });
    return;
  }
  if (req.authUser.role !== "admin") {
    res.status(403).json({ error: "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y." });
    return;
  }
  next();
}

// server/services/core/slugify.ts
function slugifyVietnamese(input) {
  const cleaned = (input || "").toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
  return cleaned || `bai-viet-${Date.now()}`;
}
async function ensureUniqueSlug(rawTitleOrSlug, excludePostId) {
  const base = slugifyVietnamese(rawTitleOrSlug);
  let candidate = base;
  let counter = 2;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    while (true) {
      let query = supabase.from("posts").select("id").eq("slug", candidate).limit(1);
      if (excludePostId) {
        query = query.neq("id", excludePostId);
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(`Supabase slug check failed: ${error.message}`);
      }
      if (!data || data.length === 0) return candidate;
      candidate = `${base}-${counter}`;
      counter += 1;
    }
  }
  const db = getDb();
  while (true) {
    const existing = excludePostId ? db.prepare("SELECT id FROM posts WHERE slug = ? AND id != ?").get(candidate, excludePostId) : db.prepare("SELECT id FROM posts WHERE slug = ?").get(candidate);
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

// server/db/seedEn.ts
var seedBentoEn = {
  coffee: {
    title: "World Coffee Capital: From Basalt Red Soil to Sensory Fine Robusta",
    excerpt: "Journey from endless basalt coffee farms to the World Coffee Museum and an authentic Fine Robusta cup that awakens every sense.",
    category: "Coffee Capital",
    location: "Bu\xF4n Ma Thu\u1ED9t \u2022 C\u01B0 M\u2019gar \u2022 Ea T\xE2n",
    readTime: "5 min read",
    cta: "Explore the Robusta journey",
    previewParagraphs: [
      "At 500\u2013800 meters above sea level, \u0110\u1EAFk L\u1EAFk\u2019s fertile basalt red soil\u2014enriched by ancient volcanic eruptions\u2014creates a sanctuary for Robusta coffee. Beyond leading Vietnam in output, Bu\xF4n Ma Thu\u1ED9t is now pioneering a proud Fine Robusta specialty wave.",
      "At the World Coffee Museum, whose sweeping silhouette echoes traditional \xCA \u0110\xEA longhouses, visitors trace global coffee civilization before savoring a honey-processed Robusta with deep dark-chocolate notes."
    ],
    contentHtml: `
      <p>At 500\u2013800 meters above sea level, \u0110\u1EAFk L\u1EAFk\u2019s fertile basalt red soil\u2014enriched by ancient volcanic eruptions\u2014creates a sanctuary for Robusta coffee. Beyond leading Vietnam in output, Bu\xF4n Ma Thu\u1ED9t is now pioneering a proud Fine Robusta specialty wave.</p>
      <h2>From Red Basalt Hills to Specialty Roasteries</h2>
      <p>Across C\u01B0 M\u2019gar and Ea T\xE2n, a new generation of farmers selectively picks only 100% ripe red cherries, drying them slowly on raised beds under highland sun. The result overturns every stereotype about Robusta: layered sweetness, roasted hazelnut, and lingering cacao warmth.</p>
      <p>At the World Coffee Museum, whose sweeping silhouette echoes traditional \xCA \u0110\xEA longhouses, visitors trace global coffee civilization before savoring a honey-processed Robusta with deep dark-chocolate notes.</p>
    `,
    quote: "\u201CEvery cup of Bu\xF4n Ma Thu\u1ED9t coffee holds the essence of highland sun, wind, and the patience of farming hands.\u201D",
    quoteSource: "\u2014 National Geographical Indication for Bu\xF4n Ma Thu\u1ED9t Coffee",
    glossary: [
      {
        term: "Fine Robusta",
        def: "CQI-certified specialty Robusta prized for dark chocolate, roasted nut notes, and sweet finish."
      },
      {
        term: "World Coffee Museum",
        def: "Contemporary architectural landmark in Bu\xF4n Ma Thu\u1ED9t preserving over 10,000 coffee artifacts."
      }
    ]
  },
  gong: {
    title: "Space of Gong Culture: Resonances of the Great Forest Around R\u01B0\u1EE3u C\u1EA7n",
    excerpt: "A UNESCO Intangible Cultural Heritage of Humanity where highland bronze gongs echo beside jars of fermented rice wine in village nights.",
    category: "Human Heritage",
    location: "\xCA \u0110\xEA & M\u2019n\xF4ng Villages \u2022 \u0110\u1EAFk L\u1EAFk",
    readTime: "6 min read",
    cta: "Listen to forest resonances",
    previewParagraphs: [
      "In the spiritual life of the \xCA \u0110\xEA and M\u2019n\xF4ng peoples of \u0110\u1EAFk L\u1EAFk, bronze gongs bridge humanity with the deities (Y\xE0ng) and the natural world. From ear-blowing rites for newborns to new-rice festivals and water-wharf prayers, the Knah gong ensemble stands at the heart of every ceremony.",
      "Gathering by a crackling fire inside a longhouse, sipping herb-fermented r\u01B0\u1EE3u c\u1EA7n rice wine while listening to deep gong cadences is when travelers touch the true soul of the Central Highlands."
    ],
    contentHtml: `
      <p>In the spiritual life of the \xCA \u0110\xEA and M\u2019n\xF4ng peoples of \u0110\u1EAFk L\u1EAFk, bronze gongs bridge humanity with the deities (Y\xE0ng) and the natural world. From ear-blowing rites for newborns to new-rice festivals and water-wharf prayers, the Knah gong ensemble stands at the heart of every ceremony.</p>
      <h2>The Living Dialogue of Bronze and Firelight</h2>
      <p>Each gong in a traditional ensemble carries its own voice and role, passing melodies from player to player like flowing mountain streams. Gathering by a crackling fire inside a longhouse, sipping herb-fermented r\u01B0\u1EE3u c\u1EA7n while listening to deep gong cadences is when travelers touch the true soul of the Central Highlands.</p>
    `,
    quote: "\u201CWherever the gongs resound, the sacred spirit of the great forest awakens.\u201D",
    quoteSource: "\u2014 Space of Gong Culture in the Central Highlands (UNESCO)",
    glossary: [
      {
        term: "Knah Gong Set",
        def: "Traditional \xCA \u0110\xEA bronze gong ensemble featuring tuned gongs of varied sizes and pitches."
      },
      {
        term: "R\u01B0\u1EE3u c\u1EA7n",
        def: "Communal rice wine fermented with forest leaf yeast inside antique earthenware jars."
      }
    ]
  },
  matriarchy: {
    title: "Matriarchal Heritage: \xCA \u0110\xEA Longhouse Architecture & Carved Stairways",
    excerpt: "Distinctive beauty in \xCA \u0110\xEA longhouse architecture, crescent-carved mother stairways, and the gentle authority of highland women.",
    category: "Matriarchal Culture",
    location: "Bu\xF4n Ako Dh\xF4ng \u2022 Bu\xF4n Ma Thu\u1ED9t",
    readTime: "6 min read",
    cta: "Step inside the Longhouse",
    previewParagraphs: [
      "Under \xCA \u0110\xEA matriarchal tradition, women keep the family hearth and the youngest daughter inherits the ancestral home to care for her parents. Each time a daughter marries and welcomes her husband into the household, the timber longhouse extends by another structural bay.",
      "At the front porch, the main stairway is hand-carved from a single tree trunk bearing twin breasts and a crescent moon \u2014 a dignified tribute to maternal roots."
    ],
    contentHtml: `
      <p>Under \xCA \u0110\xEA matriarchal tradition, women keep the family hearth and the youngest daughter inherits the ancestral home to care for her parents. Each time a daughter marries and welcomes her husband into the household, the timber longhouse extends by another structural bay.</p>
      <h2>Architecture That Grows With Generations</h2>
      <p>At the front porch, the main stairway is hand-carved from a single tree trunk bearing twin breasts and a crescent moon \u2014 a dignified tribute to maternal roots. Inside the welcoming hall stretches the monumental Kpan bench, carved from a single forest tree for ceremonial gong musicians.</p>
    `,
    quote: "\u201CAn \xCA \u0110\xEA longhouse grows with every marriage, sheltering generations of memory beneath one thatched roof.\u201D",
    quoteSource: "\u2014 Indigenous Cultural Archives of Bu\xF4n Ako Dh\xF4ng",
    glossary: [
      {
        term: "Main Stairway",
        def: "Single-trunk wooden stairs carved with maternal motifs honoring \xCA \u0110\xEA women."
      },
      {
        term: "Kpan Bench",
        def: "Monolithic 10\u201320m wooden bench placed along the guest hall wall for gong performers."
      }
    ]
  },
  waterfalls: {
    title: "Wonders of Waterfalls & Natural Lakes: From Mighty Dray Nur to Serene Lake L\u1EAFk",
    excerpt: "A dramatic contrast between the 250m cascading curtain of Dray Nur \u2013 Dray S\xE1p and twilight reflections on Lake L\u1EAFk\u2019s dugout canoes.",
    category: "Natural Wonders",
    location: "S\xEAr\xEAp\u1ED1k River & L\u1EAFk District",
    readTime: "5 min read",
    cta: "Explore waterfalls & lakes",
    previewParagraphs: [
      "\u0110\u1EAFk L\u1EAFk holds two captivating faces of nature: the roaring majesty of the Dray Nur \u2013 Dray S\xE1p \u2013 Gia Long waterfalls along the westward-flowing S\xEAr\xEAp\u1ED1k River, and the mirror-like stillness of 500-hectare Lake L\u1EAFk resting beneath Ch\u01B0 Yang Sin.",
      "Travelers can spend the morning trekking beneath basalt mist and the afternoon paddling a wooden dugout canoe into violet-gold lake twilight."
    ],
    contentHtml: `
      <p>\u0110\u1EAFk L\u1EAFk holds two captivating faces of nature: the roaring majesty of the Dray Nur \u2013 Dray S\xE1p \u2013 Gia Long waterfalls along the westward-flowing S\xEAr\xEAp\u1ED1k River, and the mirror-like stillness of 500-hectare Lake L\u1EAFk resting beneath Ch\u01B0 Yang Sin.</p>
      <h2>Roaring Basalt Cascades & Mirror Waters</h2>
      <p>Travelers can spend the morning trekking forest trails beneath roaring curtains of white water and the afternoon gliding across Lake L\u1EAFk in a hand-carved dugout canoe beside M\u2019n\xF4ng R\u2019l\xE2m lakeside villages.</p>
    `,
    quote: "\u201COn one side, a symphony of water and basalt rock; on the other, a tranquil mirror reflecting highland skies.\u201D",
    quoteSource: "\u2014 \u0110\u1EAFk L\u1EAFk Eco-Discovery Guidebook",
    glossary: [
      {
        term: "Dray Nur Waterfall",
        def: "One of the Central Highlands\u2019 grandest falls with a 250m-wide wall of cascading water."
      },
      {
        term: "Lake L\u1EAFk",
        def: "The largest natural freshwater lake in the Central Highlands, home to M\u2019n\xF4ng R\u2019l\xE2m villages."
      }
    ]
  },
  bandon: {
    title: "Legends of B\u1EA3n \u0110\xF4n & Forest Elephants: Memories Along the S\xEAr\xEAp\u1ED1k River",
    excerpt: "Where \xCA \u0110\xEA, M\u2019n\xF4ng, and Lao cultures meet along the S\xEAr\xEAp\u1ED1k River, walking under Yok \u0110\xF4n dipterocarp forests with ethical elephant care.",
    category: "Highland Legends",
    location: "Bu\xF4n \u0110\xF4n \u2022 Yok \u0110\xF4n National Park",
    readTime: "5 min read",
    cta: "Uncover B\u1EA3n \u0110\xF4n legends",
    previewParagraphs: [
      "Nestled along the legendary S\xEAr\xEAp\u1ED1k River, B\u1EA3n \u0110\xF4n has long been celebrated for the elephant-taming heritage of its M\u2019n\xF4ng, \xCA \u0110\xEA, and Lao communities.",
      "Today, the region writes a humane new chapter through elephant-friendly ecotourism in Yok \u0110\xF4n National Park \u2014 walking quietly beneath dry dipterocarp canopies to observe elephants roaming freely."
    ],
    contentHtml: `
      <p>Nestled along the legendary S\xEAr\xEAp\u1ED1k River, B\u1EA3n \u0110\xF4n has long been celebrated for the elephant-taming heritage of its M\u2019n\xF4ng, \xCA \u0110\xEA, and Lao communities.</p>
      <h2>A Humane New Chapter in Yok \u0110\xF4n</h2>
      <p>Today, the region writes a compassionate new chapter through elephant-friendly ecotourism in Yok \u0110\xF4n National Park \u2014 walking quietly beneath dry dipterocarp canopies to observe elephants foraging naturally without riding.</p>
    `,
    quote: "\u201CIn B\u1EA3n \u0110\xF4n, elephants were never merely property; they were cherished companions like members of the family.\u201D",
    quoteSource: "\u2014 Bu\xF4n \u0110\xF4n Chronicles by the S\xEAr\xEAp\u1ED1k River",
    glossary: [
      {
        term: "Yok \u0110\xF4n Dipterocarp Forest",
        def: "Vietnam\u2019s only protected dry deciduous dipterocarp forest ecosystem."
      },
      {
        term: "Elephant-Friendly Tourism",
        def: "No-riding observation experiences respecting animal welfare and natural habitats."
      }
    ]
  },
  cuisine: {
    title: "Symphony of Highland Cuisine: Rustic Forest Flavors Awakening the Palate",
    excerpt: "Awaken your taste buds with B\u1EA3n \u0110\xF4n grilled chicken with green chili salt, bamboo-tube sticky rice, S\xEAr\xEAp\u1ED1k catfish, and sweet l\xE1 b\xE9p soup.",
    category: "Local Gastronomy",
    location: "Bu\xF4n Ma Thu\u1ED9t \u2022 B\u1EA3n \u0110\xF4n \u2022 Lake L\u1EAFk",
    readTime: "4 min read",
    cta: "Savor mountain flavors",
    previewParagraphs: [
      "\u0110\u1EAFk L\u1EAFk cuisine harmonizes wild mountain ingredients with rustic hearth cooking: free-range B\u1EA3n \u0110\xF4n grilled chicken dipped in green bird\u2019s-eye chili salt, fragrant bamboo-tube c\u01A1m lam sticky rice, and fresh catfish from the S\xEAr\xEAp\u1ED1k River.",
      "Unforgettable local signatures include sweet wild l\xE1 b\xE9p leaf soup with stream shrimp and savory pounded bitter eggplant."
    ],
    contentHtml: `
      <p>\u0110\u1EAFk L\u1EAFk cuisine harmonizes wild mountain ingredients with rustic hearth cooking: free-range B\u1EA3n \u0110\xF4n grilled chicken dipped in green bird\u2019s-eye chili salt, fragrant bamboo-tube c\u01A1m lam sticky rice, and fresh catfish from the S\xEAr\xEAp\u1ED1k River.</p>
      <h2>From Longhouse Hearths to Street-Side Plates</h2>
      <p>Unforgettable local signatures include sweet wild l\xE1 b\xE9p leaf soup simmered with stream shrimp, bitter eggplant pounded with weaver-ant salt, and hot charcoal-grilled pork skewers enjoyed in cool evening mist.</p>
    `,
    quote: "\u201CEvery highland dish carries the fragrance of longhouse hearth smoke and the crisp freshness of the forest.\u201D",
    quoteSource: "\u2014 \u0110\u1EAFk L\u1EAFk Culinary Atlas",
    glossary: [
      {
        term: "L\xE1 b\xE9p soup",
        def: "Naturally sweet wild forest greens cooked with stream shrimp or smoked meat."
      },
      {
        term: "C\u01A1m lam",
        def: "Upland glutinous rice soaked in spring water and slow-roasted inside young bamboo tubes."
      }
    ]
  }
};
var seedStoriesEn = {
  "re-1": {
    title: "Keepers of the Fire Inside the Longhouse",
    excerpt: "The devotion of elder gong artisans who tirelessly pass down Knah gong rhythms to village youth night after night.",
    category: "Knah Gong Artisan",
    location: "Bu\xF4n Ako Dh\xF4ng \u2022 Bu\xF4n Ma Thu\u1ED9t",
    readTime: "5 min read",
    cta: "Hear the gong keeper\u2019s story",
    previewParagraphs: [
      "As firelight flickers in the welcoming hall of the \xCA \u0110\xEA longhouse, elder Ama H\u2019Loan\u2019s weathered hands cradle each antique bronze gong. To him, every gong in the Knah ensemble holds its own spirit and voice.",
      "For over four decades, he has taught free weekend gong classes to village youth so the voice of the great forest never fades."
    ],
    contentHtml: `
      <p>As firelight flickers in the welcoming hall of the \xCA \u0110\xEA longhouse, elder Ama H\u2019Loan\u2019s weathered hands cradle each antique bronze gong. To him, every gong in the Knah ensemble holds its own spirit and voice \u2014 from the deep lead gong setting the pulse to smaller gongs shimmering like forest streams.</p>
      <p>For over four decades, he has taught free weekend gong classes to village youth so the voice of the great forest never fades amid modern life.</p>
    `,
    quote: "\u201CAs long as the gongs ring beside the hearth, the soul of the \xCA \u0110\xEA endures on this red basalt land.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Bu\xF4n Ako Dh\xF4ng",
    glossary: [
      {
        term: "Suggested Experience",
        def: "Visit Bu\xF4n Ako Dh\xF4ng in the early evening to hear live gong ensembles around the hearth."
      },
      {
        term: "Trip Integration",
        def: "Easily pair with a 2D1N or 3D2N cultural itinerary in Bu\xF4n Ma Thu\u1ED9t."
      }
    ]
  },
  "re-2": {
    title: "Morning Dew on March Coffee Blossoms",
    excerpt: "When the entire plateau turns snowy white and sweet floral fragrance beckons migratory honeybees.",
    category: "March Blossom Season",
    location: "C\u01B0 M\u2019gar \u2022 \u0110\u1EAFk L\u1EAFk",
    readTime: "5 min read",
    cta: "Stroll through white blossoms",
    previewParagraphs: [
      "After the first spring irrigation, hundreds of thousands of hectares of coffee across \u0110\u1EAFk L\u1EAFk burst into bloom over a few nights. Clusters of snow-white blossoms blanket the branches with a jasmine-like perfume.",
      "It is also the season when migratory beekeepers place hives beneath the canopy to harvest golden coffee-blossom honey."
    ],
    contentHtml: `
      <p>After the first spring irrigation, hundreds of thousands of hectares of coffee across \u0110\u1EAFk L\u1EAFk burst into bloom over a few nights. Clusters of snow-white blossoms blanket the branches with a jasmine-like perfume riding the morning breeze.</p>
      <p>It is also the season when migratory beekeepers place hives beneath the canopy to harvest golden, richly aromatic coffee-blossom honey found nowhere else.</p>
    `,
    quote: "\u201CIn March around Ban M\xEA, opening your window at dawn reveals an ocean of fragrant white snow.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 C\u01B0 M\u2019gar",
    glossary: [
      {
        term: "Peak Bloom Window",
        def: "Typically late February to March right after the first orchard watering."
      }
    ]
  },
  "re-3": {
    title: "The Westward-Flowing S\xEAr\xEAp\u1ED1k & B\u1EA3n \u0110\xF4n Memories",
    excerpt: "Legends of the mythic river that flows inland and embraces generations of M\u2019n\xF4ng and \xCA \u0110\xEA life.",
    category: "River Legends",
    location: "Bu\xF4n \u0110\xF4n \u2022 S\xEAr\xEAp\u1ED1k Basin",
    readTime: "5 min read",
    cta: "Follow the reverse river legend",
    previewParagraphs: [
      "Formed by the confluence of Kr\xF4ng Ana (Mother River) and Kr\xF4ng N\xF4 (Father River), the S\xEAr\xEAp\u1ED1k flows westward into the Mekong rather than east to the sea, inspiring heroic legends across B\u1EA3n \u0110\xF4n.",
      "Under ancient banyan trees overhanging the riverbank, tales of legendary elephant guardians and living in harmony with nature are passed down through generations."
    ],
    contentHtml: `
      <p>Formed by the confluence of Kr\xF4ng Ana (Mother River) and Kr\xF4ng N\xF4 (Father River), the S\xEAr\xEAp\u1ED1k flows westward into the Mekong rather than east to the sea, inspiring heroic legends across B\u1EA3n \u0110\xF4n.</p>
      <p>Under ancient banyan trees overhanging the riverbank, tales of legendary elephant guardians and living in harmony with nature are passed down through generations.</p>
    `,
    quote: "\u201CThe S\xEAr\xEAp\u1ED1k flows counter to the current, just like the bold, free spirit of highland people.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Bu\xF4n \u0110\xF4n",
    glossary: [
      {
        term: "Kr\xF4ng Ana & Kr\xF4ng N\xF4",
        def: "The twin rivers whose confluence forms the legendary S\xEAr\xEAp\u1ED1k."
      }
    ]
  },
  "re-4": {
    title: "Brocade Weaving Hands Beneath the Porch",
    excerpt: "Forest-bark dyed cotton threads woven into rhythmic motifs narrating mountains and rivers on Kpan cloth.",
    category: "Traditional Brocade",
    location: "Bu\xF4n T\u01A1ng J\xFA \u2022 Ea Kao",
    readTime: "5 min read",
    cta: "Decode Kpan weaving motifs",
    previewParagraphs: [
      "At her back-strap loom under the longhouse eaves, an \xCA \u0110\xEA weaver patiently threads cotton dyed with k\u01A1-nia bark, wild brown tubers, and indigo leaves. Without paper sketches, every diamond, mountain ridge, and stair motif lives in memory.",
      "A single finished textile can take months, carrying blessings of peace and highland pride."
    ],
    contentHtml: `
      <p>At her back-strap loom under the longhouse eaves, an \xCA \u0110\xEA weaver patiently threads cotton dyed with k\u01A1-nia bark, wild brown tubers, and indigo leaves. Without paper sketches, every diamond, mountain ridge, and stair motif lives in memory.</p>
      <p>A single finished textile can take months, carrying blessings of peace and the quiet pride of highland women.</p>
    `,
    quote: "\u201CEvery Kteh weave is a story of mountains and rivers written in cotton and forest colors.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Bu\xF4n T\u01A1ng J\xFA",
    glossary: [
      {
        term: "Kteh Brocade",
        def: "Traditional handwoven \xCA \u0110\xEA cotton fabric colored with natural forest dyes."
      }
    ]
  },
  "re-5": {
    title: "Dawn Breaking Over Lake L\u1EAFk",
    excerpt: "Dugout paddles parting silver mist as the first sunbeams brush the summit of Ch\u01B0 Yang Sin.",
    category: "Lake L\u1EAFk Sunrise",
    location: "Bu\xF4n Jun \u2022 L\u1EAFk District",
    readTime: "5 min read",
    cta: "Paddle into sunrise mist",
    previewParagraphs: [
      "At 5:30 AM, 500-hectare Lake L\u1EAFk still slumbers beneath drifting silver mist. From Bu\xF4n Jun landing, dugout canoes carved from ancient sao tree trunks glide silently across the water.",
      "When sunrise crests Ch\u01B0 Yang Sin peak, the mirror-calm lake ignites in luminous amber gold."
    ],
    contentHtml: `
      <p>At 5:30 AM, 500-hectare Lake L\u1EAFk still slumbers beneath drifting silver mist. From Bu\xF4n Jun landing, dugout canoes carved from ancient sao tree trunks glide silently across the water.</p>
      <p>When sunrise crests Ch\u01B0 Yang Sin peak, the mirror-calm lake ignites in luminous amber gold\u2014a moment where time itself seems to pause.</p>
    `,
    quote: "\u201CIn a dugout canoe amidst Lake L\u1EAFk morning mist, time seems to stand completely still.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Bu\xF4n Jun",
    glossary: [
      {
        term: "Bu\xF4n Jun Landing",
        def: "Lakeside M\u2019n\xF4ng village offering early-morning traditional dugout canoe rides."
      }
    ]
  },
  "re-6": {
    title: "The Refined Bitterness of Pure-Roasted Coffee",
    excerpt: "Young growers leaving big cities to return to family farms and elevate \u0110\u1EAFk L\u1EAFk\u2019s Robusta beans.",
    category: "Young Farmers",
    location: "Ea T\xE2n \u2022 Kr\xF4ng N\u0103ng",
    readTime: "5 min read",
    cta: "Meet young farm guardians",
    previewParagraphs: [
      "Leaving behind fast-paced city life, young people from \u0110\u1EAFk L\u1EAFk are returning to their family orchards to transform traditional coffee cultivation\u2014picking only ripe red cherries, building solar drying greenhouses, and logging every fermentation batch.",
      "Thanks to their craft, \u0110\u1EAFk L\u1EAFk Robusta has become a proud ambassador of Vietnamese specialty coffee."
    ],
    contentHtml: `
      <p>Leaving behind fast-paced city life, young people from \u0110\u1EAFk L\u1EAFk are returning to their family orchards to transform traditional coffee cultivation\u2014picking only ripe red cherries, building solar drying greenhouses, and logging every fermentation batch.</p>
      <p>Thanks to their craft, \u0110\u1EAFk L\u1EAFk Robusta has stepped beyond commodity bulk to become a proud ambassador of Vietnamese specialty coffee.</p>
    `,
    quote: "\u201CWhen you honor every ripe coffee cherry, the basalt earth rewards you with its sweetest cup.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Ea T\xE2n",
    glossary: [
      {
        term: "Solar Raised-Bed Drying",
        def: "Controlled drying inside greenhouses that protects clean sweetness and fruity aromatics."
      }
    ]
  },
  "re-7": {
    title: "The New Year Water-Wharf Thanksgiving Rite",
    excerpt: "A sacred ceremony thanking the water spirits for blessing the village with bountiful harvests and peace.",
    category: "Water-Wharf Belief",
    location: "Ancient Water Wharf \u2022 Bu\xF4n Ma Thu\u1ED9t",
    readTime: "5 min read",
    cta: "Discover the Kpin Ea rite",
    previewParagraphs: [
      "To the \xCA \u0110\xEA people, the village water wharf is the sacred lifeline uniting the community. After the harvest, villagers gather for the Kpin Ea water-wharf ceremony to thank the water spirits and remind younger generations to protect headwater forests.",
      "Lively gong rhythms blend with cool spring water flowing through bamboo spouts."
    ],
    contentHtml: `
      <p>To the \xCA \u0110\xEA people, the village water wharf is the sacred lifeline uniting the community. After the harvest, villagers gather for the Kpin Ea water-wharf ceremony to thank the water spirits and remind younger generations to protect headwater forests.</p>
      <p>Lively gong rhythms blend with cool spring water flowing through bamboo spouts in a vibrant celebration of ecological stewardship.</p>
    `,
    quote: "\u201CKeeping the headwater forest green is how we keep the village spring flowing forever.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Bu\xF4n Ma Thu\u1ED9t",
    glossary: [
      {
        term: "Kpin Ea Ceremony",
        def: "Annual \xCA \u0110\xEA thanksgiving ritual honoring water sources and forest conservation."
      }
    ]
  },
  "re-8": {
    title: "Melodies of the T\u2019r\u01B0ng Xylophone in the Great Forest",
    excerpt: "Crystal-clear tones like cascading forest brooks crafted from humble fire-cured bamboo tubes.",
    category: "Forest Instruments",
    location: "\u0110\u1EAFk L\u1EAFk Highlands",
    readTime: "5 min read",
    cta: "Feel the bamboo melodies",
    previewParagraphs: [
      "Crafted from mature bamboo tubes cured over kitchen hearths, the T\u2019r\u01B0ng produces bright, rippling notes reminiscent of mountain waterfalls and wind rustling through highland bamboo groves.",
      "Under an artisan\u2019s nimble mallets, simple bamboo tubes sing an optimistic hymn to nature and village life."
    ],
    contentHtml: `
      <p>Crafted from mature bamboo tubes cured over kitchen hearths, the T\u2019r\u01B0ng produces bright, rippling notes reminiscent of mountain waterfalls and wind rustling through highland bamboo groves.</p>
      <p>Under an artisan\u2019s nimble mallets, simple bamboo tubes sing an optimistic hymn to nature and village life.</p>
    `,
    quote: "\u201CThe T\u2019r\u01B0ng is a forest stream transformed into music in the hands of highland artisans.\u201D",
    quoteSource: "\u2014 Stories of \u0110\u1EAFk L\u1EAFk Red Earth \u2022 Central Highlands",
    glossary: [
      {
        term: "T\u2019r\u01B0ng Xylophone",
        def: "Traditional highland bamboo percussion instrument tuned by cutting graduated tube lengths."
      }
    ]
  }
};

// server/db/seed.ts
function paragraphsToHtml(paragraphs) {
  return paragraphs.map((p) => `<p>${p}</p>`).join("\n");
}
var INITIAL_STAYS = [
  {
    name: "Homestay Nh\xE0 D\xE0i Ako Dh\xF4ng",
    area: "BMT",
    tier: "budget",
    nightlyRateVnd: 45e4,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ["solo", "couple", "friends"],
    amenities: ["Ki\u1EBFn tr\xFAc nh\xE0 d\xE0i \xCA \u0110\xEA", "Wi-Fi", "C\xE0 ph\xEA rang m\u1ED9c bu\u1ED5i s\xE1ng"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu homestay trung t\xE2m BMT"
  },
  {
    name: "Zan Homestay V\u01B0\u1EDDn Ea Kao",
    area: "Ea Kao",
    tier: "budget",
    nightlyRateVnd: 52e4,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ["solo", "couple", "friends"],
    amenities: ["Kh\xF4ng gian v\u01B0\u1EDDn c\xE0 ph\xEA y\xEAn t\u0129nh", "B\u1EBFp chung", "H\u1ED7 tr\u1EE3 thu\xEA xe m\xE1y"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu homestay khu v\u1EF1c h\u1ED3 Ea Kao"
  },
  {
    name: "Elephants Hotel Bu\xF4n Ma Thu\u1ED9t",
    area: "BMT",
    tier: "standard",
    nightlyRateVnd: 115e4,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ["solo", "couple", "family", "friends"],
    amenities: ["Trung t\xE2m BMT", "Buffet s\xE1ng", "H\u1ED3 b\u01A1i & ph\xF2ng gia \u0111\xECnh"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu kh\xE1ch s\u1EA1n 4 sao trung t\xE2m BMT"
  },
  {
    name: "L\u1EAFk Tented Camp Bungalow",
    area: "H\u1ED3 L\u1EAFk",
    tier: "standard",
    nightlyRateVnd: 145e4,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ["couple", "family", "friends"],
    amenities: ["View m\u1EB7t h\u1ED3 L\u1EAFk", "Ch\xE8o kayak b\xECnh minh", "\u1EA8m th\u1EF1c b\u1EA3n \u0111\u1ECBa M\u2019n\xF4ng"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu bungalow ngh\u1EC9 d\u01B0\u1EE1ng ven H\u1ED3 L\u1EAFk"
  },
  {
    name: "M\u01B0\u1EDDng Thanh Luxury Bu\xF4n Ma Thu\u1ED9t",
    area: "BMT",
    tier: "luxury",
    nightlyRateVnd: 21e5,
    capacityMin: 1,
    capacityMax: 6,
    suitableFor: ["couple", "family", "friends"],
    amenities: ["Kh\xE1ch s\u1EA1n 5 sao", "H\u1ED3 b\u01A1i ngo\xE0i tr\u1EDDi", "\u0110\u01B0a \u0111\xF3n s\xE2n bay BMV"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu kh\xE1ch s\u1EA1n cao c\u1EA5p t\u1EA1i BMT"
  },
  {
    name: "L\u1EAFk Lake Eco-Resort & Villa",
    area: "H\u1ED3 L\u1EAFk",
    tier: "luxury",
    nightlyRateVnd: 265e4,
    capacityMin: 2,
    capacityMax: 6,
    suitableFor: ["couple", "family", "friends"],
    amenities: ["Villa ri\xEAng t\u01B0 ven h\u1ED3", "Spa th\u1EA3o m\u1ED9c T\xE2y Nguy\xEAn", "Thuy\u1EC1n \u0111\u1ED9c m\u1ED9c ri\xEAng"],
    sourceNote: "M\u1EE9c gi\xE1 tham chi\u1EBFu resort cao c\u1EA5p khu v\u1EF1c H\u1ED3 L\u1EAFk"
  }
];
var INITIAL_LOGISTICS = [
  {
    mode: "motorbike",
    label: "Thu\xEA xe m\xE1y (tay ga / xe s\u1ED1) t\u1EA1i BMT",
    tier: "budget",
    dailyRateVnd: 16e4,
    capacityMin: 1,
    capacityMax: 2,
    suitableFor: ["solo", "couple", "friends"],
    notes: "Linh ho\u1EA1t di chuy\u1EC3n n\u1ED9i \xF4 BMT, Ea Kao v\xE0 th\xE1c Dray Nur; ch\u01B0a g\u1ED3m x\u0103ng."
  },
  {
    mode: "local_bus_shuttle",
    label: "Xe bu\xFDt tuy\u1EBFn & Shuttle gh\xE9p \u0111i\u1EC3m",
    tier: "budget",
    dailyRateVnd: 22e4,
    capacityMin: 1,
    capacityMax: 8,
    suitableFor: ["solo", "friends"],
    notes: "Ph\xF9 h\u1EE3p tuy\u1EBFn tr\u1EE5c ch\xEDnh BMT \u2013 H\u1ED3 L\u1EAFk / Bu\xF4n \u0110\xF4n; c\u1EA7n ch\u1EE7 \u0111\u1ED9ng gi\u1EDD xu\u1EA5t b\u1EBFn."
  },
  {
    mode: "self_drive_car",
    label: "\xD4 t\xF4 4\u20135 ch\u1ED7 t\u1EF1 l\xE1i",
    tier: "standard",
    dailyRateVnd: 85e4,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ["couple", "family", "friends"],
    notes: "Tho\u1EA3i m\xE1i cho gia \u0111\xECnh ho\u1EB7c nh\xF3m nh\u1ECF ch\u1EA1y QL27 \u0111i H\u1ED3 L\u1EAFk, Ea T\xE2n, Dray Nur."
  },
  {
    mode: "private_car_driver",
    label: "Xe ri\xEAng 7 ch\u1ED7 k\xE8m t\xE0i x\u1EBF b\u1EA3n \u0111\u1ECBa",
    tier: "luxury",
    dailyRateVnd: 165e4,
    capacityMin: 2,
    capacityMax: 6,
    suitableFor: ["couple", "family", "friends"],
    notes: "Tr\u1ECDn g\xF3i nhi\xEAn li\u1EC7u, t\xE0i x\u1EBF am hi\u1EC3u cung \u0111\u01B0\u1EDDng \u0111\xE8o d\u1ED1c v\xE0 l\u1ECBch v\u0103n h\xF3a \u0111\u1ECBa ph\u01B0\u01A1ng."
  }
];
var SEED_PLACE_PRICING = {
  "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA": {
    areaCluster: "BMT",
    ticketVnd: 15e4,
    estimatedSpendVnd: 22e4,
    priceNote: "V\xE9 tham quan b\u1EA3o t\xE0ng & tr\u1EA3i nghi\u1EC7m th\u01B0\u1EDFng th\u1EE9c c\xE0 ph\xEA t\u1EA1i qu\u1EA7y."
  },
  "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn": {
    areaCluster: "BMT",
    ticketVnd: 0,
    estimatedSpendVnd: 12e4,
    priceNote: "Mi\u1EC5n ph\xED v\xE9 v\xE0o c\u1ED5ng; chi ph\xED \u0111\u1ED3 u\u1ED1ng c\xE0 ph\xEA t\u1EA1i nh\xE0 c\u1ED5."
  },
  "Bu\xF4n c\u1ED5 Ako Dh\xF4ng": {
    areaCluster: "BMT",
    ticketVnd: 0,
    estimatedSpendVnd: 1e5,
    priceNote: "Tham quan kh\xF4ng gian bu\xF4n l\xE0ng mi\u1EC5n ph\xED; chi ph\xED c\xE0 ph\xEA ho\u1EB7c \u0111\u1EB7c s\u1EA3n nh\u1EB9."
  },
  "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk": {
    areaCluster: "BMT",
    ticketVnd: 3e4,
    estimatedSpendVnd: 5e4,
    priceNote: "V\xE9 tham quan khu tr\u01B0ng b\xE0y v\u0103n h\xF3a T\xE2y Nguy\xEAn & \u0111a d\u1EA1ng sinh h\u1ECDc."
  },
  "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n": {
    areaCluster: "Kr\xF4ng N\u0103ng",
    ticketVnd: 12e4,
    estimatedSpendVnd: 25e4,
    priceNote: "Chi ph\xED tham quan v\u01B0\u1EDDn c\xE0 ph\xEA & workshop cupping Fine Robusta."
  },
  "\u0110\xE1 Voi M\u1EB9 Yang Tao": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    ticketVnd: 2e4,
    estimatedSpendVnd: 4e4,
    priceNote: "Ph\xED g\u1EEDi xe & tham quan khu v\u1EF1c \u0110\xE1 Voi M\u1EB9 tr\xEAn tuy\u1EBFn QL27."
  },
  "H\u1ED3 L\u1EAFk & Bu\xF4n Jun": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    ticketVnd: 0,
    estimatedSpendVnd: 22e4,
    priceNote: "D\u1EA1o bu\xF4n mi\u1EC5n ph\xED; \u01B0\u1EDBc t\xEDnh chi ph\xED ch\xE8o thuy\u1EC1n \u0111\u1ED9c m\u1ED9c tr\xEAn H\u1ED3 L\u1EAFk."
  },
  "\u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    ticketVnd: 3e4,
    estimatedSpendVnd: 6e4,
    priceNote: "V\xE9 tham quan di t\xEDch \u0111\u1ED3i Li\xEAn S\u01A1n nh\xECn to\xE0n c\u1EA3nh H\u1ED3 L\u1EAFk."
  },
  "Th\xE1c Dray Nur H\xF9ng V\u0129": {
    areaCluster: "Dray Nur",
    ticketVnd: 4e4,
    estimatedSpendVnd: 1e5,
    priceNote: "V\xE9 v\xE0o c\u1ED5ng khu du l\u1ECBch th\xE1c Dray Nur & n\u01B0\u1EDBc u\u1ED1ng ngh\u1EC9 ch\xE2n."
  },
  "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n": {
    areaCluster: "Bu\xF4n \u0110\xF4n",
    ticketVnd: 6e4,
    estimatedSpendVnd: 85e4,
    priceNote: "V\xE9 v\xE0o v\u01B0\u1EDDn qu\u1ED1c gia & tour \u0111i b\u1ED9 ng\u1EAFm voi t\u1EF1 nhi\xEAn kh\xF4ng c\u01B0\u1EE1i voi."
  },
  "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m T\u01A1ng J\xFA": {
    areaCluster: "Ea Kao",
    ticketVnd: 0,
    estimatedSpendVnd: 15e4,
    priceNote: "Tham quan nh\xE0 d\u1EC7t truy\u1EC1n th\u1ED1ng; \u01B0\u1EDBc t\xEDnh tr\u1EA3i nghi\u1EC7m d\u1EC7t ho\u1EB7c mua kh\u0103n th\u1EE7 c\xF4ng."
  },
  "Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t": {
    areaCluster: "BMT",
    ticketVnd: 0,
    estimatedSpendVnd: 15e4,
    priceNote: "Ph\u1ED1 \u0111i b\u1ED9 mi\u1EC5n ph\xED; \u01B0\u1EDBc t\xEDnh b\u1EEFa \u0103n \u0111\u1EB7c s\u1EA3n b\xFAn \u0111\u1ECF, b\xE1nh \u01B0\u1EDBt & c\xE0 ph\xEA."
  },
  "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n": {
    areaCluster: "Bu\xF4n \u0110\xF4n",
    ticketVnd: 5e4,
    estimatedSpendVnd: 18e4,
    priceNote: "V\xE9 qua c\u1EA7u treo & th\u01B0\u1EDFng th\u1EE9c g\xE0 n\u01B0\u1EDBng c\u01A1m lam khu v\u1EF1c B\u1EA3n \u0110\xF4n."
  }
};
function buildInitialPostPayloads(adminId, now) {
  const rows = [];
  bentoOverviewCards.forEach((card, idx) => {
    const article = bentoArticlesData[card.articleKey];
    const en = seedBentoEn[card.articleKey];
    const slug = slugifyVietnamese(card.title);
    const sectionMeta = {
      size: card.size,
      imageLayout: card.imageLayout,
      imageBgClass: card.imageBgClass,
      isCultureHighlight: card.articleKey === "gong" || card.articleKey === "matriarchy"
    };
    rows.push({
      slug,
      legacy_key: card.articleKey,
      section: "bento",
      status: "published",
      sort_order: idx,
      author_id: adminId,
      reviewed_by: adminId,
      review_note: "",
      cover_image: card.image,
      image_alt: card.imageAlt,
      theme_key: article.themeKey,
      section_meta_json: sectionMeta,
      title: article.title,
      excerpt: card.description,
      category: article.category,
      location: article.location,
      read_time: article.readTime,
      cta_label: card.cta,
      preview_paragraphs_json: article.paragraphs,
      content_html: paragraphsToHtml(article.paragraphs),
      quote: article.quote,
      quote_source: article.quoteSource,
      glossary_json: article.glossary,
      title_en: en.title,
      excerpt_en: en.excerpt,
      category_en: en.category,
      location_en: en.location,
      read_time_en: en.readTime,
      cta_label_en: en.cta,
      preview_paragraphs_en_json: en.previewParagraphs,
      content_html_en: en.contentHtml,
      quote_en: en.quote,
      quote_source_en: en.quoteSource,
      glossary_en_json: en.glossary,
      translation_status: "translated",
      translation_provider: "seed-curated",
      translated_at: now,
      published_at: now,
      created_at: now,
      updated_at: now
    });
  });
  redEarthStories.forEach((story, idx) => {
    const en = seedStoriesEn[story.id];
    const slug = slugifyVietnamese(story.title);
    const defaultGlossary = [
      {
        term: "Tr\u1EA3i nghi\u1EC7m g\u1EE3i \xFD",
        def: `Gh\xE9 th\u0103m ${story.location} v\xE0o bu\u1ED5i s\u1EDBm \u0111\u1EC3 c\u1EA3m nh\u1EADn tr\u1ECDn v\u1EB9n nh\u1ECBp s\u1ED1ng b\u1EA3n \u0111\u1ECBa.`
      },
      {
        term: "K\u1EBFt n\u1ED1i h\xE0nh tr\xECnh",
        def: "C\xF3 th\u1EC3 t\xEDch h\u1EE3p tr\u1EF1c ti\u1EBFp v\xE0o l\u1ECBch tr\xECnh 2N1\u0110 ho\u1EB7c 3N2\u0110 t\u1EA1i \u0110\u1EAFk L\u1EAFk."
      }
    ];
    const sectionMeta = {
      gradient: story.gradient,
      offsetClass: story.offsetClass
    };
    rows.push({
      slug,
      legacy_key: story.id,
      section: "stories",
      status: "published",
      sort_order: idx,
      author_id: adminId,
      reviewed_by: adminId,
      review_note: "",
      cover_image: story.image,
      image_alt: story.title,
      theme_key: story.themeKey,
      section_meta_json: sectionMeta,
      title: story.title,
      excerpt: story.desc,
      category: story.tag,
      location: story.location,
      read_time: "5 ph\xFAt \u0111\u1ECDc",
      cta_label: story.cta,
      preview_paragraphs_json: story.fullParas,
      content_html: paragraphsToHtml(story.fullParas),
      quote: story.quote,
      quote_source: `\u2014 Chuy\u1EC7n c\u1EE7a \u0111\u1EA5t \u0111\u1ECF \u0110\u1EAFk L\u1EAFk \u2022 ${story.location}`,
      glossary_json: defaultGlossary,
      title_en: en.title,
      excerpt_en: en.excerpt,
      category_en: en.category,
      location_en: en.location,
      read_time_en: en.readTime,
      cta_label_en: en.cta,
      preview_paragraphs_en_json: en.previewParagraphs,
      content_html_en: en.contentHtml,
      quote_en: en.quote,
      quote_source_en: en.quoteSource,
      glossary_en_json: en.glossary,
      translation_status: "translated",
      translation_provider: "seed-curated",
      translated_at: now,
      published_at: now,
      created_at: now,
      updated_at: now
    });
  });
  return rows;
}
async function ensureSeedDataSupabase() {
  const supabase = getSupabaseAdmin();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { count: userCount, error: userCountErr } = await supabase.from("users").select("id", { count: "exact", head: true });
  if (userCountErr) throw new Error(`Supabase seed users count failed: ${userCountErr.message}`);
  let adminId = 1;
  if (!userCount || userCount === 0) {
    const { data: insertedUsers, error: insertUsersErr } = await supabase.from("users").insert([
      {
        email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
        display_name: "Ban Bi\xEAn T\u1EADp (Admin)",
        password_hash: hashPassword(DEFAULT_ADMIN_PASSWORD),
        role: "admin",
        is_active: true,
        created_at: now
      },
      {
        email: DEFAULT_WRITER_EMAIL.toLowerCase(),
        display_name: "T\xE1c Gi\u1EA3 Cao Nguy\xEAn",
        password_hash: hashPassword(DEFAULT_WRITER_PASSWORD),
        role: "writer",
        is_active: true,
        created_at: now
      }
    ]).select("id, role");
    if (insertUsersErr) {
      throw new Error(`Supabase seed users insert failed: ${insertUsersErr.message}`);
    }
    const adminRow = insertedUsers?.find((u) => u.role === "admin");
    if (adminRow) adminId = Number(adminRow.id);
    console.log(`[CMS Seed] Created default users in Supabase.`);
  } else {
    const { data: existingAdmin } = await supabase.from("users").select("id").eq("role", "admin").order("id", { ascending: true }).limit(1).maybeSingle();
    if (existingAdmin?.id) adminId = Number(existingAdmin.id);
  }
  const { count: postCount, error: postCountErr } = await supabase.from("posts").select("id", { count: "exact", head: true });
  if (postCountErr) throw new Error(`Supabase seed posts count failed: ${postCountErr.message}`);
  if (!postCount || postCount === 0) {
    const postRows = buildInitialPostPayloads(adminId, now);
    const { error: insertPostsErr } = await supabase.from("posts").upsert(postRows, { onConflict: "slug", ignoreDuplicates: true });
    if (insertPostsErr) {
      throw new Error(`Supabase seed posts insert failed: ${insertPostsErr.message}`);
    }
    console.log("[CMS Seed] Seeded 6 Bento posts and 8 Red Earth stories into Supabase.");
  }
  const { count: staysCount, error: staysCountErr } = await supabase.from("stays").select("id", { count: "exact", head: true });
  if (staysCountErr) throw new Error(`Supabase seed stays count failed: ${staysCountErr.message}`);
  if (!staysCount || staysCount === 0) {
    const stayRows = INITIAL_STAYS.map((stay) => ({
      name: stay.name,
      area: stay.area,
      tier: stay.tier,
      nightly_rate_vnd: stay.nightlyRateVnd,
      capacity_min: stay.capacityMin,
      capacity_max: stay.capacityMax,
      suitable_for_json: stay.suitableFor,
      amenities_json: stay.amenities,
      source_note: stay.sourceNote,
      is_active: true,
      created_at: now,
      updated_at: now
    }));
    const { error: insertStaysErr } = await supabase.from("stays").upsert(stayRows, { onConflict: "name", ignoreDuplicates: true });
    if (insertStaysErr) {
      throw new Error(`Supabase seed stays insert failed: ${insertStaysErr.message}`);
    }
    console.log(`[AI Seed] Seeded ${stayRows.length} stays into Supabase.`);
  }
  const { count: logisticsCount, error: logisticsCountErr } = await supabase.from("logistics").select("id", { count: "exact", head: true });
  if (logisticsCountErr) {
    throw new Error(`Supabase seed logistics count failed: ${logisticsCountErr.message}`);
  }
  if (!logisticsCount || logisticsCount === 0) {
    const logisticsRows = INITIAL_LOGISTICS.map((item) => ({
      mode: item.mode,
      label: item.label,
      tier: item.tier,
      daily_rate_vnd: item.dailyRateVnd,
      capacity_min: item.capacityMin,
      capacity_max: item.capacityMax,
      suitable_for_json: item.suitableFor,
      notes: item.notes,
      is_active: true,
      created_at: now,
      updated_at: now
    }));
    const { error: insertLogisticsErr } = await supabase.from("logistics").upsert(logisticsRows, { onConflict: "mode", ignoreDuplicates: true });
    if (insertLogisticsErr) {
      throw new Error(`Supabase seed logistics insert failed: ${insertLogisticsErr.message}`);
    }
    console.log(`[AI Seed] Seeded ${logisticsRows.length} logistics options into Supabase.`);
  }
  const { count: placePricesCount, error: placePricesCountErr } = await supabase.from("place_prices").select("id", { count: "exact", head: true });
  if (placePricesCountErr) {
    throw new Error(`Supabase seed place_prices count failed: ${placePricesCountErr.message}`);
  }
  if (!placePricesCount || placePricesCount === 0) {
    const placeRows = dakLakPlaceDirectory.map((place) => {
      const pricing = SEED_PLACE_PRICING[place.title] || {
        areaCluster: place.location.includes("H\u1ED3 L\u1EAFk") ? "H\u1ED3 L\u1EAFk" : place.location.includes("Ea Kao") ? "Ea Kao" : "BMT",
        ticketVnd: 3e4,
        estimatedSpendVnd: 12e4,
        priceNote: "M\u1EE9c chi ph\xED \u01B0\u1EDBc t\xEDnh tham kh\u1EA3o t\u1EA1i \u0111i\u1EC3m tham quan."
      };
      return {
        place_title: place.title,
        area_cluster: pricing.areaCluster,
        ticket_vnd: pricing.ticketVnd,
        estimated_spend_vnd: pricing.estimatedSpendVnd,
        price_source: "seed",
        price_note: pricing.priceNote,
        source_url: "",
        fetched_at: now,
        updated_at: now
      };
    });
    const { error: insertPlaceErr } = await supabase.from("place_prices").upsert(placeRows, { onConflict: "place_title", ignoreDuplicates: true });
    if (insertPlaceErr) {
      throw new Error(`Supabase seed place_prices insert failed: ${insertPlaceErr.message}`);
    }
    console.log(`[AI Seed] Seeded ${placeRows.length} place_prices into Supabase.`);
  }
}
function ensureSeedDataSqlite() {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userCountRow = db.prepare("SELECT COUNT(*) AS cnt FROM users").get();
  let adminId = 1;
  if (userCountRow.cnt === 0) {
    const insertUser = db.prepare(
      `INSERT INTO users (email, display_name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`
    );
    const adminResult = insertUser.run(
      DEFAULT_ADMIN_EMAIL.toLowerCase(),
      "Ban Bi\xEAn T\u1EADp (Admin)",
      hashPassword(DEFAULT_ADMIN_PASSWORD),
      "admin",
      now
    );
    adminId = Number(adminResult.lastInsertRowid);
    insertUser.run(
      DEFAULT_WRITER_EMAIL.toLowerCase(),
      "T\xE1c Gi\u1EA3 Cao Nguy\xEAn",
      hashPassword(DEFAULT_WRITER_PASSWORD),
      "writer",
      now
    );
    console.log(
      `[CMS Seed] Created default users -> Admin: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD} | Writer: ${DEFAULT_WRITER_EMAIL} / ${DEFAULT_WRITER_PASSWORD}`
    );
  } else {
    const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").get();
    if (existingAdmin) adminId = existingAdmin.id;
  }
  const postCountRow = db.prepare("SELECT COUNT(*) AS cnt FROM posts").get();
  if (postCountRow.cnt === 0) {
    const insertPost = db.prepare(`
      INSERT INTO posts (
        slug, legacy_key, section, status, sort_order, author_id, reviewed_by, review_note,
        cover_image, image_alt, theme_key, section_meta_json,
        title, excerpt, category, location, read_time, cta_label,
        preview_paragraphs_json, content_html, quote, quote_source, glossary_json,
        title_en, excerpt_en, category_en, location_en, read_time_en, cta_label_en,
        preview_paragraphs_en_json, content_html_en, quote_en, quote_source_en, glossary_en_json,
        translation_status, translation_provider, translated_at,
        published_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, 'published', ?, ?, ?, '',
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        'translated', 'seed-curated', ?,
        ?, ?, ?
      )
    `);
    const postRows = buildInitialPostPayloads(adminId, now);
    for (const row of postRows) {
      insertPost.run(
        String(row.slug),
        row.legacy_key ? String(row.legacy_key) : null,
        String(row.section),
        Number(row.sort_order),
        Number(row.author_id),
        Number(row.reviewed_by),
        String(row.cover_image),
        String(row.image_alt),
        String(row.theme_key),
        JSON.stringify(row.section_meta_json),
        String(row.title),
        String(row.excerpt),
        String(row.category),
        String(row.location),
        String(row.read_time),
        String(row.cta_label),
        JSON.stringify(row.preview_paragraphs_json),
        String(row.content_html),
        String(row.quote),
        String(row.quote_source),
        JSON.stringify(row.glossary_json),
        String(row.title_en),
        String(row.excerpt_en),
        String(row.category_en),
        String(row.location_en),
        String(row.read_time_en),
        String(row.cta_label_en),
        JSON.stringify(row.preview_paragraphs_en_json),
        String(row.content_html_en),
        String(row.quote_en),
        String(row.quote_source_en),
        JSON.stringify(row.glossary_en_json),
        now,
        now,
        now,
        now
      );
    }
    console.log("[CMS Seed] Seeded 6 Bento posts and 8 Red Earth stories into SQLite.");
  }
  const staysCountRow = db.prepare("SELECT COUNT(*) AS cnt FROM stays").get();
  if (staysCountRow.cnt === 0) {
    const insertStay = db.prepare(`
      INSERT INTO stays (
        name, area, tier, nightly_rate_vnd, capacity_min, capacity_max,
        suitable_for_json, amenities_json, source_note, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    for (const stay of INITIAL_STAYS) {
      insertStay.run(
        stay.name,
        stay.area,
        stay.tier,
        stay.nightlyRateVnd,
        stay.capacityMin,
        stay.capacityMax,
        JSON.stringify(stay.suitableFor),
        JSON.stringify(stay.amenities),
        stay.sourceNote,
        now,
        now
      );
    }
    console.log(`[AI Seed] Seeded ${INITIAL_STAYS.length} stays into SQLite.`);
  }
  const logisticsCountRow = db.prepare("SELECT COUNT(*) AS cnt FROM logistics").get();
  if (logisticsCountRow.cnt === 0) {
    const insertLogistics = db.prepare(`
      INSERT INTO logistics (
        mode, label, tier, daily_rate_vnd, capacity_min, capacity_max,
        suitable_for_json, notes, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    for (const item of INITIAL_LOGISTICS) {
      insertLogistics.run(
        item.mode,
        item.label,
        item.tier,
        item.dailyRateVnd,
        item.capacityMin,
        item.capacityMax,
        JSON.stringify(item.suitableFor),
        item.notes,
        now,
        now
      );
    }
    console.log(`[AI Seed] Seeded ${INITIAL_LOGISTICS.length} logistics options into SQLite.`);
  }
  const placePricesCountRow = db.prepare("SELECT COUNT(*) AS cnt FROM place_prices").get();
  if (placePricesCountRow.cnt === 0) {
    const insertPlacePrice = db.prepare(`
      INSERT INTO place_prices (
        place_title, area_cluster, ticket_vnd, estimated_spend_vnd,
        price_source, price_note, source_url, fetched_at, updated_at
      ) VALUES (?, ?, ?, ?, 'seed', ?, '', ?, ?)
    `);
    for (const place of dakLakPlaceDirectory) {
      const pricing = SEED_PLACE_PRICING[place.title] || {
        areaCluster: place.location.includes("H\u1ED3 L\u1EAFk") ? "H\u1ED3 L\u1EAFk" : place.location.includes("Ea Kao") ? "Ea Kao" : "BMT",
        ticketVnd: 3e4,
        estimatedSpendVnd: 12e4,
        priceNote: "M\u1EE9c chi ph\xED \u01B0\u1EDBc t\xEDnh tham kh\u1EA3o t\u1EA1i \u0111i\u1EC3m tham quan."
      };
      insertPlacePrice.run(
        place.title,
        pricing.areaCluster,
        pricing.ticketVnd,
        pricing.estimatedSpendVnd,
        pricing.priceNote,
        now,
        now
      );
    }
    console.log(`[AI Seed] Seeded ${dakLakPlaceDirectory.length} place_prices into SQLite.`);
  }
}
async function ensureSeedData() {
  if (isUsingSupabase()) {
    await ensureSeedDataSupabase();
    return;
  }
  ensureSeedDataSqlite();
}

// server/routes/adminPostsRoutes.ts
import { Router } from "express";

// server/services/core/errors.ts
var ServiceError = class extends Error {
  statusCode;
  code;
  constructor(statusCode, code, message) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
};
function isServiceError(err) {
  return err instanceof ServiceError;
}

// server/services/cms/postMapper.ts
function safeJsonValue(raw, fallback) {
  if (raw === null || raw === void 0) return fallback;
  if (typeof raw !== "string") {
    return raw;
  }
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function mapRowToPublicPost(row, lang) {
  const useEn = lang === "en";
  const sectionMeta = safeJsonValue(row.section_meta_json, {});
  const previewParagraphsVi = safeJsonValue(row.preview_paragraphs_json, []);
  const previewParagraphsEn = safeJsonValue(row.preview_paragraphs_en_json, []);
  const glossaryVi = safeJsonValue(row.glossary_json, []);
  const glossaryEn = safeJsonValue(row.glossary_en_json, []);
  return {
    id: Number(row.id),
    slug: row.slug,
    legacyKey: row.legacy_key,
    section: row.section,
    status: row.status,
    sortOrder: row.sort_order,
    title: useEn && row.title_en ? row.title_en : row.title,
    excerpt: useEn && row.excerpt_en ? row.excerpt_en : row.excerpt,
    category: useEn && row.category_en ? row.category_en : row.category,
    location: useEn && row.location_en ? row.location_en : row.location,
    readTime: useEn && row.read_time_en ? row.read_time_en : row.read_time,
    cta: useEn && row.cta_label_en ? row.cta_label_en : row.cta_label,
    image: row.cover_image,
    imageAlt: row.image_alt || row.title,
    themeKey: row.theme_key,
    previewParagraphs: useEn && previewParagraphsEn.length > 0 ? previewParagraphsEn : previewParagraphsVi,
    contentHtml: useEn && row.content_html_en ? row.content_html_en : row.content_html,
    quote: useEn && row.quote_en ? row.quote_en : row.quote,
    quoteSource: useEn && row.quote_source_en ? row.quote_source_en : row.quote_source,
    glossary: useEn && glossaryEn.length > 0 ? glossaryEn : glossaryVi,
    bentoConfig: row.section === "bento" ? {
      size: sectionMeta.size === "small" ? "small" : "large",
      imageLayout: sectionMeta.imageLayout === "left" ? "left" : "top",
      imageBgClass: typeof sectionMeta.imageBgClass === "string" && sectionMeta.imageBgClass ? sectionMeta.imageBgClass : "bg-[#132A1E]",
      isCultureHighlight: Boolean(sectionMeta.isCultureHighlight)
    } : void 0,
    storyConfig: row.section === "stories" ? {
      gradient: typeof sectionMeta.gradient === "string" && sectionMeta.gradient ? sectionMeta.gradient : "from-[#132A1E] to-[#8C3B2B]",
      offsetClass: typeof sectionMeta.offsetClass === "string" && sectionMeta.offsetClass ? sectionMeta.offsetClass : "mt-0"
    } : void 0,
    authorId: row.author_id !== null ? Number(row.author_id) : null,
    authorName: row.author_name || "Ban Bi\xEAn T\u1EADp \u0110\u1EAFk L\u1EAFk",
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    translationStatus: row.translation_status
  };
}
function mapRowToAdminPost(row) {
  const base = mapRowToPublicPost(row, "vi");
  return {
    ...base,
    reviewNote: row.review_note || "",
    reviewedBy: row.reviewed_by !== null ? Number(row.reviewed_by) : null,
    titleEn: row.title_en || "",
    excerptEn: row.excerpt_en || "",
    categoryEn: row.category_en || "",
    locationEn: row.location_en || "",
    readTimeEn: row.read_time_en || "",
    ctaEn: row.cta_label_en || "",
    previewParagraphsEn: safeJsonValue(row.preview_paragraphs_en_json, []),
    contentHtmlEn: row.content_html_en || "",
    quoteEn: row.quote_en || "",
    quoteSourceEn: row.quote_source_en || "",
    glossaryEn: safeJsonValue(row.glossary_en_json, []),
    translationProvider: row.translation_provider || "",
    translatedAt: row.translated_at,
    createdAt: row.created_at
  };
}
function normalizeBentoMeta(input) {
  return {
    size: input?.size === "small" ? "small" : "large",
    imageLayout: input?.imageLayout === "left" ? "left" : "top",
    imageBgClass: input?.imageBgClass || "bg-[#132A1E]",
    isCultureHighlight: Boolean(input?.isCultureHighlight)
  };
}
function normalizeStoryMeta(input) {
  return {
    gradient: input?.gradient || "from-[#132A1E] to-[#8C3B2B]",
    offsetClass: input?.offsetClass || "mt-0"
  };
}

// server/services/core/sanitize.ts
import sanitizeHtml from "sanitize-html";
function sanitizeRichHtml(html) {
  return sanitizeHtml(html || "", {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "hr",
      "figure",
      "figcaption",
      "code",
      "pre"
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["class"]
    },
    allowedSchemes: ["http", "https", "data"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true)
    }
  });
}

// server/services/ai/translator.ts
var GeminiTranslationProvider = class {
  name = "gemini-ai";
  apiKey;
  model;
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }
  async translatePostToEnglish(input) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const prompt = [
      "Translate the following Vietnamese travel editorial blog post about \u0110\u1EAFk L\u1EAFk (Central Highlands, Vietnam) into natural, evocative editorial English.",
      "Rules:",
      "1. Preserve proper Vietnamese place and cultural names appropriately (e.g., \u0110\u1EAFk L\u1EAFk, Bu\xF4n Ma Thu\u1ED9t, \xCA \u0110\xEA, M\u2019n\xF4ng, S\xEAr\xEAp\u1ED1k, Dray Nur, H\u1ED3 L\u1EAFk, Yok \u0110\xF4n, Knah, Kpan, T\u2019r\u01B0ng).",
      '2. For "contentHtml", preserve ALL HTML tags, attributes (like img src, alt, href), and document structure intact \u2014 translate only human-readable text and img alt attributes.',
      "3. Return strictly valid JSON matching the exact input keys.",
      "",
      JSON.stringify(input)
    ].join("\n");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          responseMimeType: "application/json"
        }
      })
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Gemini translation API error (${response.status}): ${errText.slice(0, 200)}`);
    }
    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Gemini translation returned empty content");
    }
    const parsed = JSON.parse(rawText);
    return {
      title: parsed.title || input.title,
      excerpt: parsed.excerpt || input.excerpt,
      category: parsed.category || input.category,
      location: parsed.location || input.location,
      readTime: parsed.readTime || translateReadTimeFallback(input.readTime),
      cta: parsed.cta || "Read full story",
      previewParagraphs: Array.isArray(parsed.previewParagraphs) ? parsed.previewParagraphs : input.previewParagraphs,
      contentHtml: sanitizeRichHtml(parsed.contentHtml || input.contentHtml),
      quote: parsed.quote || input.quote,
      quoteSource: parsed.quoteSource || input.quoteSource,
      glossary: Array.isArray(parsed.glossary) ? parsed.glossary : input.glossary,
      provider: `${this.name}:${this.model}`
    };
  }
};
function translateReadTimeFallback(viReadTime) {
  const match = viReadTime.match(/\d+/);
  if (match) return `${match[0]} min read`;
  return viReadTime;
}
var LocalFallbackTranslationProvider = class {
  name = "local-fallback";
  async translatePostToEnglish(input) {
    return {
      title: input.title,
      excerpt: input.excerpt,
      category: input.category,
      location: input.location,
      readTime: translateReadTimeFallback(input.readTime),
      cta: "Explore story",
      previewParagraphs: [...input.previewParagraphs],
      contentHtml: sanitizeRichHtml(input.contentHtml),
      quote: input.quote,
      quoteSource: input.quoteSource,
      glossary: input.glossary.map((g) => ({ ...g })),
      provider: this.name
    };
  }
};
async function translatePostToEnglish(input) {
  const fallback = new LocalFallbackTranslationProvider();
  if (GEMINI_API_KEY.trim()) {
    const gemini = new GeminiTranslationProvider(GEMINI_API_KEY.trim(), GEMINI_MODEL);
    try {
      const result = await gemini.translatePostToEnglish(input);
      return { payload: result, status: "translated" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown AI translation error";
      console.warn("[CMS Translator] Gemini translation failed, using fallback:", message);
      const fbResult2 = await fallback.translatePostToEnglish(input);
      return { payload: fbResult2, status: "failed", errorMessage: message };
    }
  }
  const fbResult = await fallback.translatePostToEnglish(input);
  return { payload: fbResult, status: "translated" };
}

// server/services/cms/postsService.ts
var DEFAULT_COVER_IMAGE = "https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=1000&q=80";
var SUPABASE_POST_SELECT = "*, author:users!posts_author_id_fkey(display_name)";
function normalizeSupabasePostRow(raw) {
  const authorObj = Array.isArray(raw.author) ? raw.author[0] : raw.author;
  const authorName = authorObj && typeof authorObj === "object" && "display_name" in authorObj ? String(authorObj.display_name || "") || null : null;
  const { author: _ignored, ...rest } = raw;
  return {
    ...rest,
    id: Number(rest.id),
    author_id: rest.author_id !== null && rest.author_id !== void 0 ? Number(rest.author_id) : null,
    reviewed_by: rest.reviewed_by !== null && rest.reviewed_by !== void 0 ? Number(rest.reviewed_by) : null,
    author_name: authorName
  };
}
function validateSection(val) {
  return val === "stories" ? "stories" : "bento";
}
function validateTheme(val) {
  if (val === "culture" || val === "nature" || val === "cuisine") return val;
  return "coffee";
}
function sanitizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => String(item || "").trim()).filter(Boolean);
}
function sanitizeGlossary(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((g) => ({
    term: String(g?.term || "").trim(),
    def: String(g?.def || "").trim()
  })).filter((g) => g.term.length > 0 || g.def.length > 0);
}
function derivePreviewParagraphs(previewInput, contentHtml, excerpt) {
  const cleaned = sanitizeStringArray(previewInput);
  if (cleaned.length > 0) return cleaned;
  const extracted = Array.from(contentHtml.matchAll(/<p[^>]*>(.*?)<\/p>/gis)).map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean).slice(0, 2);
  if (extracted.length > 0) return extracted;
  return excerpt ? [excerpt] : [];
}
function validateTranslationStatus(val) {
  if (val === "none" || val === "pending" || val === "translated" || val === "failed") {
    return val;
  }
  return null;
}
async function getPostRowWithAuthorById(id) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("posts").select(SUPABASE_POST_SELECT).eq("id", id).maybeSingle();
    if (error) throw new Error(`Supabase getPostRowWithAuthorById failed: ${error.message}`);
    return data ? normalizeSupabasePostRow(data) : void 0;
  }
  const db = getDb();
  return db.prepare(
    `SELECT p.*, u.display_name AS author_name
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.id = ?`
  ).get(id);
}
async function getRawPostById(id) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Supabase getRawPostById failed: ${error.message}`);
    return data ? normalizeSupabasePostRow(data) : void 0;
  }
  const db = getDb();
  return db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
}
async function findPostRowWithAuthorBySlugOrLegacyKey(cleanedSlug) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: bySlug, error: slugErr } = await supabase.from("posts").select(SUPABASE_POST_SELECT).eq("slug", cleanedSlug).limit(1).maybeSingle();
    if (slugErr) throw new Error(`Supabase post lookup by slug failed: ${slugErr.message}`);
    if (bySlug) return normalizeSupabasePostRow(bySlug);
    const { data: byLegacy, error: legacyErr } = await supabase.from("posts").select(SUPABASE_POST_SELECT).eq("legacy_key", cleanedSlug).limit(1).maybeSingle();
    if (legacyErr) throw new Error(`Supabase post lookup by legacy_key failed: ${legacyErr.message}`);
    return byLegacy ? normalizeSupabasePostRow(byLegacy) : void 0;
  }
  const db = getDb();
  return db.prepare(
    `SELECT p.*, u.display_name AS author_name
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.slug = ? OR p.legacy_key = ?
       LIMIT 1`
  ).get(cleanedSlug, cleanedSlug);
}
async function runTranslationAndSave(postId) {
  const row = await getRawPostById(postId);
  if (!row) return;
  const previewParagraphs = safeJsonValue(row.preview_paragraphs_json, []);
  const glossary = safeJsonValue(row.glossary_json, []);
  const { payload, status } = await translatePostToEnglish({
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    location: row.location,
    readTime: row.read_time,
    cta: row.cta_label,
    previewParagraphs,
    contentHtml: row.content_html,
    quote: row.quote,
    quoteSource: row.quote_source,
    glossary
  });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").update({
      title_en: payload.title,
      excerpt_en: payload.excerpt,
      category_en: payload.category,
      location_en: payload.location,
      read_time_en: payload.readTime,
      cta_label_en: payload.cta,
      preview_paragraphs_en_json: payload.previewParagraphs,
      content_html_en: payload.contentHtml,
      quote_en: payload.quote,
      quote_source_en: payload.quoteSource,
      glossary_en_json: payload.glossary,
      translation_status: status,
      translation_provider: payload.provider,
      translated_at: now
    }).eq("id", postId);
    if (error) throw new Error(`Supabase save translation failed: ${error.message}`);
    return;
  }
  const db = getDb();
  db.prepare(
    `UPDATE posts SET
      title_en = ?,
      excerpt_en = ?,
      category_en = ?,
      location_en = ?,
      read_time_en = ?,
      cta_label_en = ?,
      preview_paragraphs_en_json = ?,
      content_html_en = ?,
      quote_en = ?,
      quote_source_en = ?,
      glossary_en_json = ?,
      translation_status = ?,
      translation_provider = ?,
      translated_at = ?
     WHERE id = ?`
  ).run(
    payload.title,
    payload.excerpt,
    payload.category,
    payload.location,
    payload.readTime,
    payload.cta,
    JSON.stringify(payload.previewParagraphs),
    payload.contentHtml,
    payload.quote,
    payload.quoteSource,
    JSON.stringify(payload.glossary),
    status,
    payload.provider,
    now,
    postId
  );
}
async function listPublicPosts(lang, section) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("posts").select(SUPABASE_POST_SELECT).eq("status", "published");
    if (section === "bento" || section === "stories") {
      query = query.eq("section", section);
    }
    const { data, error } = await query.order("sort_order", { ascending: true }).order("published_at", { ascending: false }).order("id", { ascending: true });
    if (error) throw new Error(`Supabase listPublicPosts failed: ${error.message}`);
    return (data || []).map(
      (r) => mapRowToPublicPost(normalizeSupabasePostRow(r), lang)
    );
  }
  const db = getDb();
  let sql = `
    SELECT p.*, u.display_name AS author_name
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE p.status = 'published'
  `;
  const params = [];
  if (section === "bento" || section === "stories") {
    sql += " AND p.section = ?";
    params.push(section);
  }
  sql += " ORDER BY p.sort_order ASC, p.published_at DESC, p.id ASC";
  const rows = db.prepare(sql).all(...params);
  return rows.map((row) => mapRowToPublicPost(row, lang));
}
async function queryRelevantPublishedPosts(params) {
  let rows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("posts").select(SUPABASE_POST_SELECT).eq("status", "published").order("sort_order", { ascending: true }).order("published_at", { ascending: false }).order("id", { ascending: true });
    if (error) throw new Error(`Supabase queryRelevantPublishedPosts failed: ${error.message}`);
    rows = (data || []).map(normalizeSupabasePostRow);
    rows.sort((a, b) => {
      const aStory = a.section === "stories" ? 1 : 0;
      const bStory = b.section === "stories" ? 1 : 0;
      if (bStory !== aStory) return bStory - aStory;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const aPub = a.published_at || "";
      const bPub = b.published_at || "";
      if (bPub !== aPub) return bPub.localeCompare(aPub);
      return a.id - b.id;
    });
  } else {
    const db = getDb();
    rows = db.prepare(
      `SELECT p.*, u.display_name AS author_name
         FROM posts p
         LEFT JOIN users u ON u.id = p.author_id
         WHERE p.status = 'published'
         ORDER BY (p.section = 'stories') DESC, p.sort_order ASC, p.published_at DESC, p.id ASC`
    ).all();
  }
  const posts = rows.map((row) => mapRowToPublicPost(row, params.lang));
  const limit = Math.max(1, Math.min(20, params.limit ?? 5));
  const cleanLocations = (params.locations || []).map((loc) => String(loc || "").trim().toLowerCase()).filter((loc) => loc.length >= 2);
  if (!params.themeKey && cleanLocations.length === 0) {
    return posts.slice(0, limit);
  }
  const scored = posts.map((post, idx) => {
    let score = post.section === "stories" ? 1 : 0;
    let matchedFilter = false;
    if (params.themeKey && post.themeKey === params.themeKey) {
      score += 10;
      matchedFilter = true;
    }
    const haystack = `${post.location} ${post.title} ${post.excerpt} ${post.category}`.toLowerCase();
    for (const loc of cleanLocations) {
      if (haystack.includes(loc)) {
        score += 5;
        matchedFilter = true;
      }
    }
    return { post, score, matchedFilter, idx };
  });
  const matching = scored.filter((item) => item.matchedFilter);
  const pool = matching.length > 0 ? matching : scored;
  pool.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx;
  });
  return pool.slice(0, limit).map((item) => item.post);
}
async function getPublicPostBySlug(slug, lang, isPreview, authUser) {
  const cleanedSlug = String(slug || "").trim();
  const row = await findPostRowWithAuthorBySlugOrLegacyKey(cleanedSlug);
  if (!row) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (row.status !== "published") {
    const canPreview = isPreview && authUser && (authUser.role === "admin" || authUser.id === row.author_id);
    if (!canPreview) {
      throw new ServiceError(404, "NOT_PUBLISHED", "B\xE0i vi\u1EBFt ch\u01B0a \u0111\u01B0\u1EE3c xu\u1EA5t b\u1EA3n.");
    }
  }
  let relatedRows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("posts").select(SUPABASE_POST_SELECT).eq("status", "published").neq("id", row.id).order("sort_order", { ascending: true });
    if (error) throw new Error(`Supabase related posts query failed: ${error.message}`);
    relatedRows = (data || []).map(normalizeSupabasePostRow);
    relatedRows.sort((a, b) => {
      const aSec = a.section === row.section ? 1 : 0;
      const bSec = b.section === row.section ? 1 : 0;
      if (bSec !== aSec) return bSec - aSec;
      const aTheme = a.theme_key === row.theme_key ? 1 : 0;
      const bTheme = b.theme_key === row.theme_key ? 1 : 0;
      if (bTheme !== aTheme) return bTheme - aTheme;
      return a.sort_order - b.sort_order;
    });
    relatedRows = relatedRows.slice(0, 3);
  } else {
    const db = getDb();
    relatedRows = db.prepare(
      `SELECT p.*, u.display_name AS author_name
         FROM posts p
         LEFT JOIN users u ON u.id = p.author_id
         WHERE p.status = 'published' AND p.id != ?
         ORDER BY (p.section = ?) DESC, (p.theme_key = ?) DESC, p.sort_order ASC
         LIMIT 3`
    ).all(row.id, row.section, row.theme_key);
  }
  return {
    post: mapRowToPublicPost(row, lang),
    related: relatedRows.map((r) => mapRowToPublicPost(r, lang))
  };
}
async function listAdminPosts(user, filters) {
  const section = filters?.section;
  const status = filters?.status;
  const slug = String(filters?.slug || "").trim();
  const q = String(filters?.q || "").trim().toLowerCase();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("posts").select(SUPABASE_POST_SELECT);
    if (user.role === "writer") {
      query = query.eq("author_id", user.id);
    }
    if (section === "bento" || section === "stories") {
      query = query.eq("section", section);
    }
    if (status === "draft" || status === "in_review" || status === "published") {
      query = query.eq("status", status);
    }
    const { data, error } = await query.order("section", { ascending: true }).order("sort_order", { ascending: true }).order("updated_at", { ascending: false });
    if (error) throw new Error(`Supabase listAdminPosts failed: ${error.message}`);
    let rows2 = (data || []).map(normalizeSupabasePostRow);
    if (slug) {
      rows2 = rows2.filter((r) => r.slug === slug || r.legacy_key === slug);
    }
    if (q) {
      rows2 = rows2.filter(
        (r) => r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)
      );
    }
    return rows2.map(mapRowToAdminPost);
  }
  const db = getDb();
  let sql = `
    SELECT p.*, u.display_name AS author_name
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    WHERE 1=1
  `;
  const params = [];
  if (user.role === "writer") {
    sql += " AND p.author_id = ?";
    params.push(user.id);
  }
  if (section === "bento" || section === "stories") {
    sql += " AND p.section = ?";
    params.push(section);
  }
  if (status === "draft" || status === "in_review" || status === "published") {
    sql += " AND p.status = ?";
    params.push(status);
  }
  if (slug) {
    sql += " AND (p.slug = ? OR p.legacy_key = ?)";
    params.push(slug, slug);
  }
  if (q) {
    sql += " AND (LOWER(p.title) LIKE ? OR LOWER(p.location) LIKE ? OR LOWER(p.category) LIKE ? OR LOWER(p.slug) LIKE ?)";
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern);
  }
  sql += " ORDER BY p.section ASC, p.sort_order ASC, p.updated_at DESC";
  const rows = db.prepare(sql).all(...params);
  return rows.map(mapRowToAdminPost);
}
async function getAdminPostById(user, id) {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const row = await getPostRowWithAuthorById(id);
  if (!row) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (user.role === "writer" && row.author_id !== user.id) {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 xem v\xE0 ch\u1EC9nh s\u1EEDa b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh."
    );
  }
  return mapRowToAdminPost(row);
}
async function getAdminPostByIdOrSlug(user, idOrSlug) {
  const raw = String(idOrSlug).trim();
  if (/^\d+$/.test(raw)) {
    return getAdminPostById(user, Number(raw));
  }
  const row = await findPostRowWithAuthorBySlugOrLegacyKey(raw);
  if (!row) {
    throw new ServiceError(404, "NOT_FOUND", `Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt "${raw}".`);
  }
  if (user.role === "writer" && row.author_id !== user.id) {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 xem v\xE0 ch\u1EC9nh s\u1EEDa b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh."
    );
  }
  return mapRowToAdminPost(row);
}
async function createAdminPost(user, body) {
  const title = String(body.title || "").trim();
  const excerpt = String(body.excerpt || "").trim();
  if (!title || !excerpt) {
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "Ti\xEAu \u0111\u1EC1 v\xE0 m\xF4 t\u1EA3 ng\u1EAFn (excerpt) l\xE0 b\u1EAFt bu\u1ED9c."
    );
  }
  const section = validateSection(body.section);
  const themeKey = validateTheme(body.themeKey);
  const slug = await ensureUniqueSlug(String(body.slug || title));
  const contentHtml = sanitizeRichHtml(String(body.contentHtml || ""));
  const previewParagraphs = derivePreviewParagraphs(body.previewParagraphs, contentHtml, excerpt);
  const glossary = sanitizeGlossary(body.glossary);
  const sectionMeta = section === "bento" ? normalizeBentoMeta(body.bentoConfig) : normalizeStoryMeta(body.storyConfig);
  const requestedStatus = body.status;
  const finalStatus = user.role === "admin" && requestedStatus === "published" ? "published" : requestedStatus === "in_review" ? "in_review" : "draft";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const publishedAt = finalStatus === "published" ? now : null;
  const hasExplicitEn = user.role === "admin" && (Boolean(String(body.titleEn || "").trim()) || Boolean(String(body.contentHtmlEn || "").trim()));
  const enTitle = user.role === "admin" && body.titleEn !== void 0 ? String(body.titleEn) : "";
  const enExcerpt = user.role === "admin" && body.excerptEn !== void 0 ? String(body.excerptEn) : "";
  const enCategory = user.role === "admin" && body.categoryEn !== void 0 ? String(body.categoryEn) : "";
  const enLocation = user.role === "admin" && body.locationEn !== void 0 ? String(body.locationEn) : "";
  const enReadTime = user.role === "admin" && body.readTimeEn !== void 0 ? String(body.readTimeEn) : "";
  const enCta = user.role === "admin" && body.ctaEn !== void 0 ? String(body.ctaEn) : "";
  const enPreviewParagraphsArr = user.role === "admin" && body.previewParagraphsEn !== void 0 ? sanitizeStringArray(body.previewParagraphsEn) : [];
  const enContentHtml = user.role === "admin" && body.contentHtmlEn !== void 0 ? sanitizeRichHtml(String(body.contentHtmlEn)) : "";
  const enQuote = user.role === "admin" && body.quoteEn !== void 0 ? String(body.quoteEn) : "";
  const enQuoteSource = user.role === "admin" && body.quoteSourceEn !== void 0 ? String(body.quoteSourceEn) : "";
  const enGlossaryArr = user.role === "admin" && body.glossaryEn !== void 0 ? sanitizeGlossary(body.glossaryEn) : [];
  const explicitStatus = validateTranslationStatus(body.translationStatus);
  const translationStatus = hasExplicitEn ? explicitStatus || "translated" : "none";
  const translationProvider = hasExplicitEn ? String(body.translationProvider || "ai-agent").trim() : "";
  const translatedAt = hasExplicitEn ? now : null;
  let createdId;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: maxRow } = await supabase.from("posts").select("sort_order").eq("section", section).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const maxOrder = maxRow?.sort_order !== void 0 ? Number(maxRow.sort_order) : -1;
    const { data: inserted, error } = await supabase.from("posts").insert({
      slug,
      legacy_key: null,
      section,
      status: finalStatus,
      sort_order: maxOrder + 1,
      author_id: user.id,
      reviewed_by: finalStatus === "published" ? user.id : null,
      review_note: "",
      cover_image: String(body.image || "").trim() || DEFAULT_COVER_IMAGE,
      image_alt: String(body.imageAlt || title).trim(),
      theme_key: themeKey,
      section_meta_json: sectionMeta,
      title,
      excerpt,
      category: String(body.category || "Kh\xE1m ph\xE1 \u0110\u1EAFk L\u1EAFk").trim(),
      location: String(body.location || "\u0110\u1EAFk L\u1EAFk").trim(),
      read_time: String(body.readTime || "5 ph\xFAt \u0111\u1ECDc").trim(),
      cta_label: String(body.cta || "\u0110\u1ECDc c\xE2u chuy\u1EC7n").trim(),
      preview_paragraphs_json: previewParagraphs,
      content_html: contentHtml || `<p>${excerpt}</p>`,
      quote: String(body.quote || "").trim(),
      quote_source: String(body.quoteSource || "").trim(),
      glossary_json: glossary,
      title_en: enTitle,
      excerpt_en: enExcerpt,
      category_en: enCategory,
      location_en: enLocation,
      read_time_en: enReadTime,
      cta_label_en: enCta,
      preview_paragraphs_en_json: enPreviewParagraphsArr,
      content_html_en: enContentHtml,
      quote_en: enQuote,
      quote_source_en: enQuoteSource,
      glossary_en_json: enGlossaryArr,
      translation_status: translationStatus,
      translation_provider: translationProvider,
      translated_at: translatedAt,
      published_at: publishedAt,
      created_at: now,
      updated_at: now
    }).select("id").single();
    if (error || !inserted) {
      throw new Error(`Supabase createAdminPost failed: ${error?.message || "Unknown error"}`);
    }
    createdId = Number(inserted.id);
  } else {
    const db = getDb();
    const maxOrderRow = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM posts WHERE section = ?").get(section);
    const result = db.prepare(
      `INSERT INTO posts (
          slug, legacy_key, section, status, sort_order, author_id, reviewed_by, review_note,
          cover_image, image_alt, theme_key, section_meta_json,
          title, excerpt, category, location, read_time, cta_label,
          preview_paragraphs_json, content_html, quote, quote_source, glossary_json,
          title_en, excerpt_en, category_en, location_en, read_time_en, cta_label_en,
          preview_paragraphs_en_json, content_html_en, quote_en, quote_source_en, glossary_en_json,
          translation_status, translation_provider, translated_at,
          published_at, created_at, updated_at
        ) VALUES (
          ?, NULL, ?, ?, ?, ?, ?, '',
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?
        )`
    ).run(
      slug,
      section,
      finalStatus,
      maxOrderRow.maxOrder + 1,
      user.id,
      finalStatus === "published" ? user.id : null,
      String(body.image || "").trim() || DEFAULT_COVER_IMAGE,
      String(body.imageAlt || title).trim(),
      themeKey,
      JSON.stringify(sectionMeta),
      title,
      excerpt,
      String(body.category || "Kh\xE1m ph\xE1 \u0110\u1EAFk L\u1EAFk").trim(),
      String(body.location || "\u0110\u1EAFk L\u1EAFk").trim(),
      String(body.readTime || "5 ph\xFAt \u0111\u1ECDc").trim(),
      String(body.cta || "\u0110\u1ECDc c\xE2u chuy\u1EC7n").trim(),
      JSON.stringify(previewParagraphs),
      contentHtml || `<p>${excerpt}</p>`,
      String(body.quote || "").trim(),
      String(body.quoteSource || "").trim(),
      JSON.stringify(glossary),
      enTitle,
      enExcerpt,
      enCategory,
      enLocation,
      enReadTime,
      enCta,
      JSON.stringify(enPreviewParagraphsArr),
      enContentHtml,
      enQuote,
      enQuoteSource,
      JSON.stringify(enGlossaryArr),
      translationStatus,
      translationProvider,
      translatedAt,
      publishedAt,
      now,
      now
    );
    createdId = Number(result.lastInsertRowid);
  }
  if (finalStatus === "published" && (!hasExplicitEn || Boolean(body.retranslateOnSave))) {
    await runTranslationAndSave(createdId);
  }
  const createdRow = await getPostRowWithAuthorById(createdId);
  return mapRowToAdminPost(createdRow);
}
async function updateAdminPost(user, id, body) {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (user.role === "writer") {
    if (existing.author_id !== user.id) {
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 ch\u1EC9nh s\u1EEDa b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh."
      );
    }
    if (existing.status === "published") {
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "B\xE0i vi\u1EBFt \u0111\xE3 xu\u1EA5t b\u1EA3n ch\u1EC9 c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c ch\u1EC9nh s\u1EEDa b\u1EDFi Qu\u1EA3n tr\u1ECB vi\xEAn (Admin)."
      );
    }
  }
  const title = String(body.title ?? existing.title).trim();
  const excerpt = String(body.excerpt ?? existing.excerpt).trim();
  if (!title || !excerpt) {
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "Ti\xEAu \u0111\u1EC1 v\xE0 m\xF4 t\u1EA3 ng\u1EAFn (excerpt) kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng."
    );
  }
  const section = body.section ? validateSection(body.section) : existing.section;
  const themeKey = body.themeKey ? validateTheme(body.themeKey) : existing.theme_key;
  const slug = body.slug ? await ensureUniqueSlug(String(body.slug), id) : existing.slug;
  const contentHtml = body.contentHtml !== void 0 ? sanitizeRichHtml(String(body.contentHtml)) : existing.content_html;
  const previewParagraphs = body.previewParagraphs !== void 0 ? derivePreviewParagraphs(body.previewParagraphs, contentHtml, excerpt) : safeJsonValue(existing.preview_paragraphs_json, []);
  const glossary = body.glossary !== void 0 ? sanitizeGlossary(body.glossary) : safeJsonValue(existing.glossary_json, []);
  const sectionMeta = section === "bento" ? normalizeBentoMeta(
    body.bentoConfig ?? safeJsonValue(existing.section_meta_json, {})
  ) : normalizeStoryMeta(
    body.storyConfig ?? safeJsonValue(existing.section_meta_json, {})
  );
  let nextStatus = existing.status;
  if (user.role === "writer") {
    if (body.status === "draft" || body.status === "in_review") {
      nextStatus = body.status;
    }
  } else if (body.status === "draft" || body.status === "in_review" || body.status === "published") {
    nextStatus = body.status;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const publishedAt = nextStatus === "published" ? existing.published_at || now : existing.published_at;
  const isAdmin = user.role === "admin";
  const enTitle = isAdmin && body.titleEn !== void 0 ? String(body.titleEn) : existing.title_en;
  const enExcerpt = isAdmin && body.excerptEn !== void 0 ? String(body.excerptEn) : existing.excerpt_en;
  const enCategory = isAdmin && body.categoryEn !== void 0 ? String(body.categoryEn) : existing.category_en;
  const enLocation = isAdmin && body.locationEn !== void 0 ? String(body.locationEn) : existing.location_en;
  const enReadTime = isAdmin && body.readTimeEn !== void 0 ? String(body.readTimeEn) : existing.read_time_en;
  const enCta = isAdmin && body.ctaEn !== void 0 ? String(body.ctaEn) : existing.cta_label_en;
  const enPreviewParagraphsArr = isAdmin && body.previewParagraphsEn !== void 0 ? sanitizeStringArray(body.previewParagraphsEn) : safeJsonValue(existing.preview_paragraphs_en_json, []);
  const enContentHtml = isAdmin && body.contentHtmlEn !== void 0 ? sanitizeRichHtml(String(body.contentHtmlEn)) : existing.content_html_en;
  const enQuote = isAdmin && body.quoteEn !== void 0 ? String(body.quoteEn) : existing.quote_en;
  const enQuoteSource = isAdmin && body.quoteSourceEn !== void 0 ? String(body.quoteSourceEn) : existing.quote_source_en;
  const enGlossaryArr = isAdmin && body.glossaryEn !== void 0 ? sanitizeGlossary(body.glossaryEn) : safeJsonValue(existing.glossary_en_json, []);
  const enFieldsSubmitted = isAdmin && [
    "titleEn",
    "excerptEn",
    "categoryEn",
    "locationEn",
    "readTimeEn",
    "ctaEn",
    "previewParagraphsEn",
    "contentHtmlEn",
    "quoteEn",
    "quoteSourceEn",
    "glossaryEn"
  ].some((k) => body[k] !== void 0);
  const explicitTranslationStatus = isAdmin ? validateTranslationStatus(body.translationStatus) : null;
  const nextTranslationStatus = explicitTranslationStatus ?? (enFieldsSubmitted && (enTitle.trim() || enContentHtml.trim()) ? "translated" : existing.translation_status);
  const nextTranslationProvider = isAdmin && body.translationProvider !== void 0 ? String(body.translationProvider).trim() : existing.translation_provider;
  const nextTranslatedAt = enFieldsSubmitted && (enTitle.trim() || enContentHtml.trim()) ? now : existing.translated_at;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").update({
      slug,
      section,
      status: nextStatus,
      cover_image: String(body.image ?? existing.cover_image).trim(),
      image_alt: String(body.imageAlt ?? existing.image_alt).trim(),
      theme_key: themeKey,
      section_meta_json: sectionMeta,
      title,
      excerpt,
      category: String(body.category ?? existing.category).trim(),
      location: String(body.location ?? existing.location).trim(),
      read_time: String(body.readTime ?? existing.read_time).trim(),
      cta_label: String(body.cta ?? existing.cta_label).trim(),
      preview_paragraphs_json: previewParagraphs,
      content_html: contentHtml,
      quote: String(body.quote ?? existing.quote).trim(),
      quote_source: String(body.quoteSource ?? existing.quote_source).trim(),
      glossary_json: glossary,
      title_en: enTitle,
      excerpt_en: enExcerpt,
      category_en: enCategory,
      location_en: enLocation,
      read_time_en: enReadTime,
      cta_label_en: enCta,
      preview_paragraphs_en_json: enPreviewParagraphsArr,
      content_html_en: enContentHtml,
      quote_en: enQuote,
      quote_source_en: enQuoteSource,
      glossary_en_json: enGlossaryArr,
      translation_status: nextTranslationStatus,
      translation_provider: nextTranslationProvider,
      translated_at: nextTranslatedAt,
      published_at: publishedAt,
      updated_at: now
    }).eq("id", id);
    if (error) throw new Error(`Supabase updateAdminPost failed: ${error.message}`);
  } else {
    const db = getDb();
    db.prepare(
      `UPDATE posts SET
        slug = ?, section = ?, status = ?, cover_image = ?, image_alt = ?, theme_key = ?, section_meta_json = ?,
        title = ?, excerpt = ?, category = ?, location = ?, read_time = ?, cta_label = ?,
        preview_paragraphs_json = ?, content_html = ?, quote = ?, quote_source = ?, glossary_json = ?,
        title_en = ?, excerpt_en = ?, category_en = ?, location_en = ?, read_time_en = ?, cta_label_en = ?,
        preview_paragraphs_en_json = ?, content_html_en = ?, quote_en = ?, quote_source_en = ?, glossary_en_json = ?,
        translation_status = ?, translation_provider = ?, translated_at = ?,
        published_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      slug,
      section,
      nextStatus,
      String(body.image ?? existing.cover_image).trim(),
      String(body.imageAlt ?? existing.image_alt).trim(),
      themeKey,
      JSON.stringify(sectionMeta),
      title,
      excerpt,
      String(body.category ?? existing.category).trim(),
      String(body.location ?? existing.location).trim(),
      String(body.readTime ?? existing.read_time).trim(),
      String(body.cta ?? existing.cta_label).trim(),
      JSON.stringify(previewParagraphs),
      contentHtml,
      String(body.quote ?? existing.quote).trim(),
      String(body.quoteSource ?? existing.quote_source).trim(),
      JSON.stringify(glossary),
      enTitle,
      enExcerpt,
      enCategory,
      enLocation,
      enReadTime,
      enCta,
      JSON.stringify(enPreviewParagraphsArr),
      enContentHtml,
      enQuote,
      enQuoteSource,
      JSON.stringify(enGlossaryArr),
      nextTranslationStatus,
      nextTranslationProvider,
      nextTranslatedAt,
      publishedAt,
      now,
      id
    );
  }
  const hasCustomEnTranslation = Boolean(enTitle.trim() && enContentHtml.trim());
  const shouldAutoTranslate = Boolean(body.retranslateOnSave) || nextStatus === "published" && existing.status !== "published" && !hasCustomEnTranslation;
  if (shouldAutoTranslate) {
    await runTranslationAndSave(id);
  }
  return mapRowToAdminPost(await getPostRowWithAuthorById(id));
}
async function submitAdminPost(user, id) {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (user.role === "writer" && existing.author_id !== user.id) {
    throw new ServiceError(403, "FORBIDDEN", "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 g\u1EEDi duy\u1EC7t b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").update({ status: "in_review", review_note: "", updated_at: now }).eq("id", id);
    if (error) throw new Error(`Supabase submitAdminPost failed: ${error.message}`);
  } else {
    const db = getDb();
    db.prepare(
      "UPDATE posts SET status = 'in_review', review_note = '', updated_at = ? WHERE id = ?"
    ).run(now, id);
  }
  return mapRowToAdminPost(await getPostRowWithAuthorById(id));
}
async function reviewAdminPost(admin, id, action, reviewNote = "") {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  if (!["publish", "return_draft", "unpublish"].includes(action)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "H\xE0nh \u0111\u1ED9ng duy\u1EC7t kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const cleanedNote = reviewNote.trim();
  if (action === "publish") {
    if (isUsingSupabase()) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("posts").update({
        status: "published",
        reviewed_by: admin.id,
        review_note: "",
        published_at: existing.published_at || now,
        updated_at: now
      }).eq("id", id);
      if (error) throw new Error(`Supabase reviewAdminPost publish failed: ${error.message}`);
    } else {
      const db = getDb();
      db.prepare(
        `UPDATE posts
         SET status = 'published', reviewed_by = ?, review_note = '', published_at = COALESCE(published_at, ?), updated_at = ?
         WHERE id = ?`
      ).run(admin.id, now, now, id);
    }
    const alreadyTranslatedByAgent = existing.translation_status === "translated" && Boolean(existing.title_en.trim()) && Boolean(existing.content_html_en.trim()) && existing.translation_provider !== "local-fallback";
    if (!alreadyTranslatedByAgent) {
      await runTranslationAndSave(id);
    }
  } else {
    if (isUsingSupabase()) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("posts").update({
        status: "draft",
        reviewed_by: admin.id,
        review_note: cleanedNote,
        updated_at: now
      }).eq("id", id);
      if (error) throw new Error(`Supabase reviewAdminPost return failed: ${error.message}`);
    } else {
      const db = getDb();
      db.prepare(
        `UPDATE posts
         SET status = 'draft', reviewed_by = ?, review_note = ?, updated_at = ?
         WHERE id = ?`
      ).run(admin.id, cleanedNote, now, id);
    }
  }
  return mapRowToAdminPost(await getPostRowWithAuthorById(id));
}
async function retranslateAdminPost(admin, id) {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  await runTranslationAndSave(id);
  return mapRowToAdminPost(await getPostRowWithAuthorById(id));
}
async function saveCustomTranslation(user, id, body) {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (user.role === "writer") {
    if (existing.author_id !== user.id) {
      throw new ServiceError(403, "FORBIDDEN", "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 d\u1ECBch b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh.");
    }
    if (existing.status === "published") {
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "B\xE0i vi\u1EBFt \u0111\xE3 xu\u1EA5t b\u1EA3n ch\u1EC9 c\xF3 th\u1EC3 \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt b\u1EA3n d\u1ECBch b\u1EDFi Qu\u1EA3n tr\u1ECB vi\xEAn (Admin)."
      );
    }
  }
  const titleEn = String(body.titleEn ?? body.title ?? existing.title_en).trim();
  const excerptEn = String(body.excerptEn ?? body.excerpt ?? existing.excerpt_en).trim();
  const categoryEn = String(body.categoryEn ?? body.category ?? existing.category_en).trim();
  const locationEn = String(body.locationEn ?? body.location ?? existing.location_en).trim();
  const readTimeEn = String(body.readTimeEn ?? body.readTime ?? existing.read_time_en).trim();
  const ctaEn = String(body.ctaEn ?? body.cta ?? existing.cta_label_en).trim();
  const rawHtml = body.contentHtmlEn ?? body.contentHtml;
  const contentHtmlEn = rawHtml !== void 0 ? sanitizeRichHtml(String(rawHtml)) : existing.content_html_en;
  const rawPreview = body.previewParagraphsEn ?? body.previewParagraphs;
  const previewParagraphsEn = rawPreview !== void 0 ? derivePreviewParagraphs(rawPreview, contentHtmlEn, excerptEn) : safeJsonValue(existing.preview_paragraphs_en_json, []);
  const quoteEn = String(body.quoteEn ?? body.quote ?? existing.quote_en).trim();
  const quoteSourceEn = String(
    body.quoteSourceEn ?? body.quoteSource ?? existing.quote_source_en
  ).trim();
  const rawGlossary = body.glossaryEn ?? body.glossary;
  const glossaryEn = rawGlossary !== void 0 ? sanitizeGlossary(rawGlossary) : safeJsonValue(existing.glossary_en_json, []);
  if (!titleEn || !excerptEn) {
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "B\u1EA3n d\u1ECBch ti\u1EBFng Anh c\u1EA7n c\xF3 t\u1ED1i thi\u1EC3u titleEn v\xE0 excerptEn."
    );
  }
  const provider = String(body.provider || body.translationProvider || "ai-agent").trim();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").update({
      title_en: titleEn,
      excerpt_en: excerptEn,
      category_en: categoryEn,
      location_en: locationEn,
      read_time_en: readTimeEn,
      cta_label_en: ctaEn,
      preview_paragraphs_en_json: previewParagraphsEn,
      content_html_en: contentHtmlEn,
      quote_en: quoteEn,
      quote_source_en: quoteSourceEn,
      glossary_en_json: glossaryEn,
      translation_status: "translated",
      translation_provider: provider,
      translated_at: now,
      updated_at: now
    }).eq("id", id);
    if (error) throw new Error(`Supabase saveCustomTranslation failed: ${error.message}`);
  } else {
    const db = getDb();
    db.prepare(
      `UPDATE posts SET
        title_en = ?, excerpt_en = ?, category_en = ?, location_en = ?, read_time_en = ?, cta_label_en = ?,
        preview_paragraphs_en_json = ?, content_html_en = ?, quote_en = ?, quote_source_en = ?, glossary_en_json = ?,
        translation_status = 'translated', translation_provider = ?, translated_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      titleEn,
      excerptEn,
      categoryEn,
      locationEn,
      readTimeEn,
      ctaEn,
      JSON.stringify(previewParagraphsEn),
      contentHtmlEn,
      quoteEn,
      quoteSourceEn,
      JSON.stringify(glossaryEn),
      provider,
      now,
      now,
      id
    );
  }
  return mapRowToAdminPost(await getPostRowWithAuthorById(id));
}
async function reorderAdminPosts(admin, sectionInput, orderedIdsInput) {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  const section = validateSection(sectionInput);
  const orderedIds = Array.isArray(orderedIdsInput) ? orderedIdsInput.map((x) => Number(x)).filter((n) => Number.isInteger(n)) : [];
  if (orderedIds.length === 0) {
    throw new ServiceError(400, "VALIDATION_ERROR", "Danh s\xE1ch ID s\u1EAFp x\u1EBFp kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    await Promise.all(
      orderedIds.map(async (postId, idx) => {
        const { error } = await supabase.from("posts").update({ sort_order: idx }).eq("id", postId).eq("section", section);
        if (error) throw new Error(`Supabase reorderAdminPosts failed: ${error.message}`);
      })
    );
    return;
  }
  const db = getDb();
  const stmt = db.prepare("UPDATE posts SET sort_order = ? WHERE id = ? AND section = ?");
  db.exec("BEGIN");
  try {
    orderedIds.forEach((postId, idx) => {
      stmt.run(idx, postId, section);
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
async function deleteAdminPost(user, id) {
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID b\xE0i vi\u1EBFt kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const existing = await getRawPostById(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt.");
  }
  if (user.role === "writer") {
    if (existing.author_id !== user.id) {
      throw new ServiceError(403, "FORBIDDEN", "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 x\xF3a b\xE0i vi\u1EBFt c\u1EE7a ch\xEDnh m\xECnh.");
    }
    if (existing.status !== "draft") {
      throw new ServiceError(
        403,
        "FORBIDDEN",
        "T\xE1c gi\u1EA3 ch\u1EC9 c\xF3 th\u1EC3 x\xF3a b\xE0i vi\u1EBFt \u1EDF tr\u1EA1ng th\xE1i B\u1EA3n nh\xE1p."
      );
    }
  }
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw new Error(`Supabase deleteAdminPost failed: ${error.message}`);
    return;
  }
  const db = getDb();
  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
}
async function getCmsStatsAndContext(sectionFilter) {
  let rows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("posts").select("id, slug, section, status, theme_key, title, category, location, translation_status");
    if (sectionFilter === "bento" || sectionFilter === "stories") {
      query = query.eq("section", sectionFilter);
    }
    const { data, error } = await query.order("section", { ascending: true }).order("sort_order", { ascending: true }).order("id", { ascending: true });
    if (error) throw new Error(`Supabase getCmsStatsAndContext failed: ${error.message}`);
    rows = (data || []).map((r) => ({ ...r, id: Number(r.id) }));
  } else {
    const db = getDb();
    let sql = "SELECT id, slug, section, status, theme_key, title, category, location, translation_status FROM posts";
    const params = [];
    if (sectionFilter === "bento" || sectionFilter === "stories") {
      sql += " WHERE section = ?";
      params.push(sectionFilter);
    }
    sql += " ORDER BY section ASC, sort_order ASC, id ASC";
    rows = db.prepare(sql).all(...params);
  }
  const byStatus = { draft: 0, in_review: 0, published: 0 };
  const bySection = { bento: 0, stories: 0 };
  const catSet = /* @__PURE__ */ new Set();
  const locSet = /* @__PURE__ */ new Set();
  for (const r of rows) {
    if (r.status in byStatus) byStatus[r.status] += 1;
    if (r.section in bySection) bySection[r.section] += 1;
    if (r.category) catSet.add(r.category);
    if (r.location) locSet.add(r.location);
  }
  return {
    counts: {
      total: rows.length,
      byStatus,
      bySection
    },
    categories: Array.from(catSet),
    locations: Array.from(locSet),
    existingPosts: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      section: r.section,
      status: r.status,
      themeKey: r.theme_key,
      title: r.title,
      category: r.category,
      location: r.location,
      translationStatus: r.translation_status
    }))
  };
}

// server/routes/adminPostsRoutes.ts
var adminPostsRouter = Router();
adminPostsRouter.use(requireAuth);
function handleRouteError(res, next, err) {
  if (isServiceError(err)) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  next(err);
}
adminPostsRouter.get("/context", async (req, res, next) => {
  try {
    const section = typeof req.query.section === "string" ? req.query.section : void 0;
    res.json(await getCmsStatsAndContext(section));
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.get("/", async (req, res, next) => {
  try {
    const posts = await listAdminPosts(req.authUser, {
      section: typeof req.query.section === "string" ? req.query.section : void 0,
      status: typeof req.query.status === "string" ? req.query.status : void 0,
      slug: typeof req.query.slug === "string" ? req.query.slug : void 0,
      q: typeof req.query.q === "string" ? req.query.q : void 0
    });
    res.json({ posts });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.get("/:id", async (req, res, next) => {
  try {
    const post = await getAdminPostByIdOrSlug(req.authUser, String(req.params.id));
    res.json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.post("/", async (req, res, next) => {
  try {
    const post = await createAdminPost(req.authUser, req.body || {});
    res.status(201).json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.put("/:id", async (req, res, next) => {
  try {
    const post = await updateAdminPost(
      req.authUser,
      Number(req.params.id),
      req.body || {}
    );
    res.json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.post("/:id/submit", async (req, res, next) => {
  try {
    const post = await submitAdminPost(req.authUser, Number(req.params.id));
    res.json({ post });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});
adminPostsRouter.post(
  "/:id/review",
  requireAdmin,
  async (req, res, next) => {
    try {
      const post = await reviewAdminPost(
        req.authUser,
        Number(req.params.id),
        String(req.body?.action || ""),
        String(req.body?.reviewNote || "")
      );
      res.json({ post });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);
adminPostsRouter.post(
  "/:id/retranslate",
  requireAdmin,
  async (req, res, next) => {
    try {
      const post = await retranslateAdminPost(req.authUser, Number(req.params.id));
      res.json({ post });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);
adminPostsRouter.post(
  "/:id/translation",
  async (req, res, next) => {
    try {
      const post = await saveCustomTranslation(
        req.authUser,
        Number(req.params.id),
        req.body || {}
      );
      res.json({ post });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);
adminPostsRouter.patch(
  "/reorder",
  requireAdmin,
  async (req, res, next) => {
    try {
      await reorderAdminPosts(req.authUser, req.body?.section, req.body?.orderedIds);
      res.json({ ok: true });
    } catch (err) {
      handleRouteError(res, next, err);
    }
  }
);
adminPostsRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteAdminPost(req.authUser, Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    handleRouteError(res, next, err);
  }
});

// server/routes/adminUsersRoutes.ts
import { Router as Router2 } from "express";

// server/services/cms/usersService.ts
function isActiveFlag(val) {
  return val === true || val === 1;
}
function mapUserRow(u) {
  return {
    id: Number(u.id),
    email: u.email,
    displayName: u.display_name,
    role: u.role,
    isActive: isActiveFlag(u.is_active),
    createdAt: u.created_at
  };
}
async function findUserForLoginByEmail(email) {
  const cleaned = email.trim().toLowerCase();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("users").select("id, email, display_name, password_hash, role, is_active, created_at").eq("email", cleaned).maybeSingle();
    if (error) {
      throw new Error(`Supabase login query failed: ${error.message}`);
    }
    return data ?? null;
  }
  const db = getDb();
  const row = db.prepare(
    "SELECT id, email, display_name, password_hash, role, is_active, created_at FROM users WHERE email = ?"
  ).get(cleaned);
  return row ?? null;
}
async function listUsers(admin) {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("users").select("id, email, display_name, role, is_active, created_at").order("id", { ascending: true });
    if (error) throw new Error(`Supabase listUsers failed: ${error.message}`);
    return (data || []).map(mapUserRow);
  }
  const db = getDb();
  const rows = db.prepare("SELECT id, email, display_name, role, is_active, created_at FROM users ORDER BY id ASC").all();
  return rows.map(mapUserRow);
}
async function createUser(admin, body) {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  const email = String(body.email || "").trim().toLowerCase();
  const displayName = String(body.displayName || "").trim();
  const password = String(body.password || "");
  const role = body.role === "admin" ? "admin" : "writer";
  if (!email || !displayName || password.length < 6) {
    throw new ServiceError(
      400,
      "VALIDATION_ERROR",
      "Email, t\xEAn hi\u1EC3n th\u1ECB v\xE0 m\u1EADt kh\u1EA9u (t\u1ED1i thi\u1EC3u 6 k\xFD t\u1EF1) l\xE0 b\u1EAFt bu\u1ED9c."
    );
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: dup2 } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (dup2) {
      throw new ServiceError(409, "CONFLICT", "Email n\xE0y \u0111\xE3 t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng.");
    }
    const { data, error } = await supabase.from("users").insert({
      email,
      display_name: displayName,
      password_hash: hashPassword(password),
      role,
      is_active: true,
      created_at: now
    }).select("id, email, display_name, role, is_active, created_at").single();
    if (error || !data) {
      throw new Error(`Supabase createUser failed: ${error?.message || "Unknown error"}`);
    }
    return mapUserRow(data);
  }
  const db = getDb();
  const dup = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (dup) {
    throw new ServiceError(409, "CONFLICT", "Email n\xE0y \u0111\xE3 t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng.");
  }
  const result = db.prepare(
    `INSERT INTO users (email, display_name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`
  ).run(email, displayName, hashPassword(password), role, now);
  return {
    id: Number(result.lastInsertRowid),
    email,
    displayName,
    role,
    isActive: true,
    createdAt: now
  };
}
async function updateUser(admin, id, body) {
  if (admin.role !== "admin") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Ch\u1EC9 qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
    );
  }
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, "VALIDATION_ERROR", "ID t\xE0i kho\u1EA3n kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: existing2, error: fetchErr } = await supabase.from("users").select("id, email, display_name, role, is_active, created_at").eq("id", id).maybeSingle();
    if (fetchErr) throw new Error(`Supabase updateUser fetch failed: ${fetchErr.message}`);
    if (!existing2) {
      throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n.");
    }
    if (admin.id === id && body.isActive === false) {
      throw new ServiceError(
        400,
        "VALIDATION_ERROR",
        "Kh\xF4ng th\u1EC3 t\u1EF1 kh\xF3a t\xE0i kho\u1EA3n \u0111ang \u0111\u0103ng nh\u1EADp."
      );
    }
    const existingRow = existing2;
    const nextActive2 = typeof body.isActive === "boolean" ? body.isActive : isActiveFlag(existingRow.is_active);
    const nextRole2 = body.role === "admin" || body.role === "writer" ? body.role : existingRow.role;
    const { data: updated, error: updateErr } = await supabase.from("users").update({ is_active: nextActive2, role: nextRole2 }).eq("id", id).select("id, email, display_name, role, is_active, created_at").single();
    if (updateErr || !updated) {
      throw new Error(`Supabase updateUser failed: ${updateErr?.message || "Unknown error"}`);
    }
    return mapUserRow(updated);
  }
  const db = getDb();
  const existing = db.prepare("SELECT id, email, display_name, role, is_active, created_at FROM users WHERE id = ?").get(id);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n.");
  }
  if (admin.id === id && body.isActive === false) {
    throw new ServiceError(400, "VALIDATION_ERROR", "Kh\xF4ng th\u1EC3 t\u1EF1 kh\xF3a t\xE0i kho\u1EA3n \u0111ang \u0111\u0103ng nh\u1EADp.");
  }
  const nextActive = typeof body.isActive === "boolean" ? body.isActive ? 1 : 0 : isActiveFlag(existing.is_active) ? 1 : 0;
  const nextRole = body.role === "admin" || body.role === "writer" ? body.role : existing.role;
  db.prepare("UPDATE users SET is_active = ?, role = ? WHERE id = ?").run(nextActive, nextRole, id);
  return {
    id: existing.id,
    email: existing.email,
    displayName: existing.display_name,
    role: nextRole,
    isActive: nextActive === 1,
    createdAt: existing.created_at
  };
}

// server/routes/adminUsersRoutes.ts
var adminUsersRouter = Router2();
adminUsersRouter.use(requireAuth, requireAdmin);
adminUsersRouter.get("/", async (req, res, next) => {
  try {
    res.json({ users: await listUsers(req.authUser) });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});
adminUsersRouter.post("/", async (req, res, next) => {
  try {
    const user = await createUser(req.authUser, req.body || {});
    res.status(201).json({ user });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});
adminUsersRouter.patch("/:id", async (req, res, next) => {
  try {
    const user = await updateUser(req.authUser, Number(req.params.id), req.body || {});
    res.json({ user });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});

// server/routes/aiRoutes.ts
import { Router as Router3 } from "express";

// server/services/ai/aiChatbot.ts
import crypto3 from "node:crypto";
import { OpenInferenceSpanKind as OpenInferenceSpanKind9 } from "@arizeai/openinference-semantic-conventions";

// src/data/plannerCatalog.ts
var companionLabels = {
  solo: "\u0110\u1ED9c h\xE0nh",
  couple: "C\u1EB7p \u0111\xF4i",
  family: "Gia \u0111\xECnh",
  friends: "Nh\xF3m b\u1EA1n"
};
var themeLabels = {
  culture: "V\u0103n h\xF3a & C\u1ED3ng chi\xEAng",
  coffee: "C\xE0 ph\xEA & Ngh\u1EC9 d\u01B0\u1EE1ng",
  nature: "Thi\xEAn nhi\xEAn & Th\xE1c n\u01B0\u1EDBc",
  cuisine: "\u1EA8m th\u1EF1c b\u1EA3n \u0111\u1ECBa"
};
var budgetMultipliers = {
  budget: {
    label: "Ti\u1EBFt ki\u1EC7m",
    perDay: 115e4,
    stayMove: "Homestay Nh\xE0 D\xE0i \xCA \u0110\xEA \u2022 Xe m\xE1y / Xe bu\xFDt tuy\u1EBFn \u0111i\u1EC3m"
  },
  standard: {
    label: "Ti\xEAu chu\u1EA9n",
    perDay: 175e4,
    stayMove: "Boutique Hotel 4\u2605 BMT + Bungalow ven h\u1ED3 \u2022 \xD4 t\xF4 t\u1EF1 l\xE1i"
  },
  luxury: {
    label: "Cao c\u1EA5p",
    perDay: 31e5,
    stayMove: "Eco-Resort cao c\u1EA5p H\u1ED3 L\u1EAFk \u2022 Xe ri\xEAng & H\u01B0\u1EDBng d\u1EABn vi\xEAn b\u1EA3n \u0111\u1ECBa"
  }
};
var plannerCatalog = {
  coffee: {
    relatedArticleKey: "coffee",
    title: "H\xE0nh Tr\xECnh S\u1EDBm Mai Gi\u1EEFa V\u01B0\u1EDDn Robusta & S\u01B0\u01A1ng M\u1EDD H\u1ED3 L\u1EAFk",
    hiddenGem: "N\xF4ng tr\u1EA1i Fine Robusta Ea T\xE2n & B\u1EBFn thuy\u1EC1n \u0111\u1ED9c m\u1ED9c Bu\xF4n L\xEA l\xFAc 5h45 s\xE1ng.",
    routeTip: "Tuy\u1EBFn kh\xE9p k\xEDn: S\xE2n bay BMV \u2192 Trung t\xE2m BMT \u2192 C\u01B0 M\u2019gar \u2192 QL27 \u0111i H\u1ED3 L\u1EAFk (138km), kh\xF4ng quay \u0111\u1EA7u.",
    totalKmBase: 138,
    days: [
      {
        day: "Ng\xE0y 1",
        title: "Ch\u1EA1m ng\xF5 Th\u1EE7 ph\u1EE7 C\xE0 ph\xEA & Bu\xF4n c\u1ED5 Ako Dh\xF4ng",
        area: "TP. Bu\xF4n Ma Thu\u1ED9t \u2022 ~24 km",
        slots: [
          {
            time: "08:00 \u2013 09:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Th\u01B0\u1EDFng th\u1EE9c C\xE0 ph\xEA Rang M\u1ED9c & \u0110i\u1EC3m t\xE2m Ph\u1ED1 n\xFAi",
            location: "Ph\u1ED1 Phan \u0110\xECnh Gi\xF3t \u2022 BMT",
            x: 375,
            y: 192,
            desc: "Kh\u1EDFi \u0111\u1EA7u b\u1EB1ng ly espresso Fine Robusta chi\u1EBFt xu\u1EA5t th\u1EE7 c\xF4ng d\u01B0\u1EDBi t\xE1n c\xE2y c\u1ED5 th\u1EE5 v\xE0 b\xFAn ch\xECa Ban M\xEA."
          },
          {
            time: "09:45 \u2013 12:00",
            period: "Gi\u1EEFa s\xE1ng",
            title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA",
            location: "\u0110\u01B0\u1EDDng Nguy\u1EC5n \u0110\xECnh Chi\u1EC3u \u2022 BMT",
            x: 405,
            y: 172,
            desc: "Chi\xEAm ng\u01B0\u1EE1ng ki\u1EBFn tr\xFAc m\xE1i v\xF2m nh\xE0 d\xE0i \xCA \u0110\xEA \u0111\u01B0\u01A1ng \u0111\u1EA1i v\xE0 h\u01A1n 10.000 hi\u1EC7n v\u1EADt v\u0103n minh c\xE0 ph\xEA to\xE0n c\u1EA7u."
          },
          {
            time: "14:30 \u2013 17:15",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "D\u1EA1o b\u01B0\u1EDBc Bu\xF4n c\u1ED5 Ako Dh\xF4ng",
            location: "Cu\u1ED1i \u0111\u01B0\u1EDDng Tr\u1EA7n Nh\u1EADt Du\u1EADt \u2022 BMT",
            x: 392,
            y: 150,
            desc: "Th\u0103m nh\u1EEFng n\u1EBFp nh\xE0 d\xE0i m\u1EABu h\u1EC7 nguy\xEAn b\u1EA3n gi\u1EEFa r\u1EEBng c\xE2y \u0111\u1EA7u ngu\u1ED3n v\xE0 tr\xF2 chuy\u1EC7n c\xF9ng gi\xE0 l\xE0ng."
          },
          {
            time: "19:00 \u2013 21:00",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "Tr\u1EA3i nghi\u1EC7m C\xE0 ph\xEA V\u1EE3t \u0110\xEAm & \u1EA8m th\u1EF1c Bazan",
            location: "Trung t\xE2m Bu\xF4n Ma Thu\u1ED9t",
            x: 368,
            y: 205,
            desc: "Th\u01B0\u1EDFng th\u1EE9c g\xE0 n\u01B0\u1EDBng c\u01A1m lam v\xE0 nh\xE2m nhi t\xE1ch c\xE0 ph\xEA v\u1EE3t n\xF3ng h\u1ED5i trong ti\u1EBFt tr\u1EDDi se l\u1EA1nh ph\u1ED1 n\xFAi."
          }
        ]
      },
      {
        day: "Ng\xE0y 2",
        title: "T\u1EEB R\u1EABy Fine Robusta C\u01B0 M\u2019gar \u0111\u1EBFn Ho\xE0ng h\xF4n H\u1ED3 L\u1EAFk",
        area: "C\u01B0 M\u2019gar \u2192 QL27 \u2192 H\u1ED3 L\u1EAFk \u2022 ~72 km",
        slots: [
          {
            time: "07:30 \u2013 11:00",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Workshop Thu h\xE1i & S\u01A1 ch\u1EBF C\xE0 ph\xEA Honey",
            location: "N\xF4ng tr\u1EA1i C\u01B0 M\u2019gar / Ea T\xE2n",
            x: 472,
            y: 92,
            desc: "Tr\u1EF1c ti\u1EBFp tr\u1EA3i nghi\u1EC7m quy tr\xECnh h\xE1i ch\xEDn 100%, ph\u01A1i gi\xE0n nh\xE0 k\xEDnh v\xE0 th\u1EED n\u1EBFm (cupping) c\xE1c m\u1EBB rang m\u1EDBi."
          },
          {
            time: "12:00 \u2013 13:45",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "D\u1EEBng ch\xE2n \u0110\xE1 Voi M\u1EB9 Yang Tao",
            location: "X\xE3 Yang Tao \u2022 Qu\u1ED1c l\u1ED9 27",
            x: 478,
            y: 256,
            desc: "Ng\u1EAFm to\xE0n c\u1EA3nh thung l\u0169ng l\xFAa d\u01B0\u1EDBi ch\xE2n d\xE3y Ch\u01B0 Yang Sin t\u1EEB t\u1EA3ng \u0111\xE1 nguy\xEAn kh\u1ED1i l\u1EDBn nh\u1EA5t Vi\u1EC7t Nam."
          },
          {
            time: "15:30 \u2013 18:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Ng\u1EAFm Ho\xE0ng h\xF4n tr\xEAn M\u1EB7t g\u01B0\u01A1ng H\u1ED3 L\u1EAFk",
            location: "Th\u1ECB tr\u1EA5n Li\xEAn S\u01A1n \u2022 Huy\u1EC7n L\u1EAFk",
            x: 545,
            y: 315,
            desc: "Nh\u1EADn ph\xF2ng bungalow ven h\u1ED3, th\u1EA3 b\u01B0\u1EDBc d\u1ECDc b\u1EDD h\u1ED3 n\u01B0\u1EDBc ng\u1ECDt t\u1EF1 nhi\xEAn r\u1ED9ng 500ha khi n\u1EAFng chi\u1EC1u nhu\u1ED9m v\xE0ng."
          },
          {
            time: "19:15 \u2013 21:15",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "\u0110\xEAm l\u1EEDa tr\u1EA1i & R\u01B0\u1EE3u c\u1EA7n M\u2019n\xF4ng R\u2019l\xE2m",
            location: "Bu\xF4n Jun \u2022 Ven H\u1ED3 L\u1EAFk",
            x: 525,
            y: 332,
            desc: "Giao l\u01B0u v\u0103n h\xF3a c\u1ED3ng chi\xEAng b\xEAn \xE1nh l\u1EEDa v\xE0 th\u01B0\u1EDFng th\u1EE9c ch\u1EA3 c\xE1 th\xE1c l\xE1c H\u1ED3 L\u1EAFk."
          }
        ]
      },
      {
        day: "Ng\xE0y 3",
        title: "B\xECnh minh Thuy\u1EC1n \u0111\u1ED9c m\u1ED9c & Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i",
        area: "H\u1ED3 L\u1EAFk \u2192 S\xE2n bay BMV \u2022 ~42 km",
        slots: [
          {
            time: "05:45 \u2013 07:30",
            period: "S\xE1ng s\u1EDBm",
            title: "Ch\xE8o Thuy\u1EC1n \u0110\u1ED9c M\u1ED9c Gi\u1EEFa S\u01B0\u01A1ng S\u1EDBm",
            location: "B\u1EBFn thuy\u1EC1n Bu\xF4n L\xEA \u2022 H\u1ED3 L\u1EAFk",
            x: 562,
            y: 302,
            desc: "L\u01B0\u1EDBt nh\u1EB9 tr\xEAn m\u1EB7t n\u01B0\u1EDBc b\u1EA3ng l\u1EA3ng s\u01B0\u01A1ng m\xF9 khi nh\u1EEFng tia n\u1EAFng \u0111\u1EA7u ti\xEAn ch\u1EA1m \u0111\u1EC9nh n\xFAi Ch\u01B0 Yang Sin."
          },
          {
            time: "08:30 \u2013 10:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "C\xE0 ph\xEA \u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i",
            location: "\u0110\u1ED3i l\u1ECBch s\u1EED Li\xEAn S\u01A1n \u2022 H\u1ED3 L\u1EAFk",
            x: 515,
            y: 288,
            desc: "Ng\u1EAFm tr\u1ECDn g\xF3c nh\xECn 360 \u0111\u1ED9 xu\u1ED1ng m\u1EB7t h\u1ED3 L\u1EAFk v\xE0 c\xE1nh \u0111\u1ED3ng l\xFAa M\u2019n\xF4ng t\u1EEB dinh th\u1EF1 c\u1ED5 tr\xEAn \u0111\u1ED3i cao."
          },
          {
            time: "13:30 \u2013 16:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Mua \u0110\u1EB7c s\u1EA3n M\u1EADt ong Hoa C\xE0 ph\xEA & Ti\u1EC5n s\xE2n bay",
            location: "QL27 \u2192 S\xE2n bay Bu\xF4n Ma Thu\u1ED9t",
            x: 605,
            y: 176,
            desc: "Gh\xE9 ch\u1ECDn mua m\u1EADt ong hoa c\xE0 ph\xEA nguy\xEAn ch\u1EA5t, b\u1ED9t cacao \u0110\u1EAFk L\u1EAFk v\xE0 h\u1EA1t Robusta rang m\u1ED9c tr\u01B0\u1EDBc gi\u1EDD kh\u1EDFi h\xE0nh."
          }
        ]
      },
      {
        day: "Ng\xE0y 4",
        title: "M\u1EDF r\u1ED9ng: Th\xE1c Dray Nur & D\xF2ng S\xEAr\xEAp\u1ED1k Ch\u1EA3y Ng\u01B0\u1EE3c",
        area: "Nam Bu\xF4n Ma Thu\u1ED9t \u2022 ~54 km",
        slots: [
          {
            time: "08:00 \u2013 11:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Chinh ph\u1EE5c Th\xE1c Dray Nur H\xF9ng V\u0129",
            location: "C\u1EE5m th\xE1c Dray Nur \u2022 Kr\xF4ng Ana",
            x: 268,
            y: 285,
            desc: "Chi\xEAm ng\u01B0\u1EE1ng b\u1EE9c t\u01B0\u1EDDng n\u01B0\u1EDBc tr\u1EAFng x\xF3a r\u1ED9ng 250m v\xE0 \u0111i qua c\u1EA7u treo ng\u1EAFm v\xE1ch \u0111\xE1 bazan c\u1ED5 \u0111\u1EA1i."
          },
          {
            time: "14:00 \u2013 17:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "\u0110\u1EA1p xe Xuy\xEAn R\u1EEBng & Ch\xE8o SUP S\xF4ng S\xEAr\xEAp\u1ED1k",
            location: "Bu\xF4n Ku\u1ED1p \u2022 L\u01B0u v\u1EF1c S\xEAr\xEAp\u1ED1k",
            x: 305,
            y: 252,
            desc: "H\xE0nh tr\xECnh s\u1ED1ng ch\u1EADm gi\u1EEFa thi\xEAn nhi\xEAn hoang s\u01A1 tr\u01B0\u1EDBc khi kh\xE9p l\u1EA1i chuy\u1EBFn \u0111i tr\u1ECDn v\u1EB9n."
          }
        ]
      }
    ]
  },
  culture: {
    relatedArticleKey: "gong",
    title: "L\u1EAFng Nghe \xC2m Vang Chi\xEAng Knah & K\xFD \u1EE8c Nh\xE0 D\xE0i M\u1EABu H\u1EC7",
    hiddenGem: "L\xE0ng g\u1ED1m c\u1ED5 kh\xF4ng b\xE0n xoay Yang Tao & Kh\xF4ng gian di\u1EC5n x\u01B0\u1EDBng s\u1EED thi \u0110am San.",
    routeTip: "K\u1EBFt n\u1ED1i c\u1EE5m di s\u1EA3n \u0111\xF4 th\u1ECB BMT (B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk \u2013 Ako Dh\xF4ng) sang v\xF9ng v\u0103n h\xF3a M\u2019n\xF4ng Huy\u1EC7n L\u1EAFk.",
    totalKmBase: 146,
    days: [
      {
        day: "Ng\xE0y 1",
        title: "Ki\u1EBFn tr\xFAc Nh\xE0 D\xE0i & C\u1EA7u thang C\xE1i M\u1EABu h\u1EC7",
        area: "Trung t\xE2m V\u0103n h\xF3a BMT \u2022 ~18 km",
        slots: [
          {
            time: "08:00 \u2013 10:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk & Kh\xF4ng gian \u0110a d\u1EA1ng Sinh h\u1ECDc",
            location: "S\u1ED1 12 L\xEA Du\u1EA9n \u2022 BMT",
            x: 378,
            y: 196,
            desc: "Kh\xE1m ph\xE1 b\u1ED9 s\u01B0u t\u1EADp chi\xEAng \u0111\u1ED3ng c\u1ED5, th\u1ED5 c\u1EA9m Kteh v\xE0 l\u1ECBch s\u1EED 49 d\xE2n t\u1ED9c c\xF9ng chung s\u1ED1ng tr\xEAn cao nguy\xEAn."
          },
          {
            time: "10:45 \u2013 12:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "B\u1EEFa c\u01A1m Gia \u0111\xECnh \xCA \u0110\xEA B\xEAn B\u1EBFp L\u1EEDa",
            location: "Bu\xF4n Ako Dh\xF4ng \u2022 BMT",
            x: 394,
            y: 152,
            desc: "Th\u01B0\u1EDFng th\u1EE9c canh b\u1ED9t l\xE1 b\xE9p, c\xE0 \u0111\u1EAFng gi\xE3 c\xE1 kh\xF4 v\xE0 t\xECm hi\u1EC3u phong t\u1EE5c th\u1EEBa k\u1EBF m\u1EABu h\u1EC7 c\u1EE7a ng\u01B0\u1EDDi con g\xE1i \xFAt."
          },
          {
            time: "15:00 \u2013 17:30",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m Bu\xF4n T\u01A1ng J\xFA",
            location: "X\xE3 Ea Kao \u2022 TP. Bu\xF4n Ma Thu\u1ED9t",
            x: 342,
            y: 235,
            desc: "Xem ngh\u1EC7 nh\xE2n nhu\u1ED9m s\u1EE3i b\xF4ng b\u1EB1ng v\u1ECF c\xE2y r\u1EEBng v\xE0 t\u1EF1 tay d\u1EC7t th\u1EED hoa v\u0103n h\xECnh h\u1ECDc truy\u1EC1n th\u1ED1ng."
          },
          {
            time: "19:30 \u2013 21:30",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "\u0110\xEAm H\u1ED9i Di\u1EC5n X\u01B0\u1EDBng Chi\xEAng Knah & S\u1EED Thi",
            location: "Nh\xE0 D\xE0i C\u1ED5 \u2022 Ako Dh\xF4ng",
            x: 388,
            y: 164,
            desc: "Ng\u1ED3i tr\xEAn gh\u1EBF Kpan d\xE0i 18m l\u1EAFng nghe h\xF2a t\u1EA5u chi\xEAng \u0111\u1ED3ng v\xE0 l\u1EDDi k\u1EC3 khan \u0110am San tr\u1EA7m h\xF9ng."
          }
        ]
      },
      {
        day: "Ng\xE0y 2",
        title: "G\u1ED1m c\u1ED5 Kh\xF4ng b\xE0n xoay Yang Tao & Bu\xF4n Jun",
        area: "QL27 \u2192 Yang Tao \u2192 Huy\u1EC7n L\u1EAFk \u2022 ~68 km",
        slots: [
          {
            time: "08:00 \u2013 11:15",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Ngh\u1EC7 nh\xE2n G\u1ED1m C\u1ED5 M\u2019n\xF4ng R\u2019l\xE2m Yang Tao",
            location: "X\xE3 Yang Tao \u2022 Huy\u1EC7n L\u1EAFk",
            x: 482,
            y: 262,
            desc: "Ch\u1EE9ng ki\u1EBFn k\u1EF9 thu\u1EADt l\xE0m g\u1ED1m ho\xE0n to\xE0n b\u1EB1ng tay ch\u1EA1y quanh v\u1EADt m\u1EABu v\xE0 nung l\u1ED9 thi\xEAn b\u1EB1ng c\u1EE7i kh\xF4."
          },
          {
            time: "14:00 \u2013 17:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Kh\xE1m ph\xE1 Bu\xF4n Jun & Bu\xF4n L\xEA C\u1ED5 K\xEDnh",
            location: "Ven H\u1ED3 L\u1EAFk \u2022 Huy\u1EC7n L\u1EAFk",
            x: 542,
            y: 318,
            desc: "D\u1EA1o b\u01B0\u1EDBc gi\u1EEFa nh\u1EEFng ng\xF4i nh\xE0 s\xE0n truy\u1EC1n th\u1ED1ng c\u1EE7a ng\u01B0\u1EDDi M\u2019n\xF4ng n\u1EB1m y\xEAn b\xECnh d\u01B0\u1EDBi r\u1EB7ng d\u1EEBa v\xE0 b\xF3ng c\u1ED5 th\u1EE5."
          },
          {
            time: "19:00 \u2013 21:00",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "Nghi th\u1EE9c M\u1EDDi R\u01B0\u1EE3u C\u1EA7n & \u0110\xE0n \u0110\xE1",
            location: "Nh\xE0 s\xE0n Bu\xF4n Jun \u2022 H\u1ED3 L\u1EAFk",
            x: 528,
            y: 334,
            desc: "T\xECm hi\u1EC3u quy t\u1EAFc c\u1EA7m c\u1EA7n r\u01B0\u1EE3u theo th\u1EE9 b\u1EADc m\u1EABu h\u1EC7 v\xE0 th\u01B0\u1EDFng th\u1EE9c \xE2m thanh trong tr\u1EBBo c\u1EE7a \u0111\xE0n \u0111\xE1, \u0111\xE0n T\u2019r\u01B0ng."
          }
        ]
      },
      {
        day: "Ng\xE0y 3",
        title: "B\u1EBFn N\u01B0\u1EDBc \u0110\u1EA7u Bu\xF4n & V\u0103n Minh C\xE0 Ph\xEA",
        area: "H\u1ED3 L\u1EAFk \u2192 Bu\xF4n Ma Thu\u1ED9t \u2022 ~60 km",
        slots: [
          {
            time: "07:30 \u2013 09:45",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Th\u0103m B\u1EBFn N\u01B0\u1EDBc C\u1ED5 Thi\xEAng Li\xEAng (Kpin Ea)",
            location: "Ngo\u1EA1i \xF4 Bu\xF4n Ma Thu\u1ED9t",
            x: 418,
            y: 185,
            desc: "L\u1EAFng nghe c\xE2u chuy\u1EC7n b\u1EA3o v\u1EC7 r\u1EEBng \u0111\u1EA7u ngu\u1ED3n v\xE0 nghi l\u1EC5 t\u1EA1 \u01A1n th\u1EA7n n\u01B0\u1EDBc h\xE0ng n\u0103m c\u1EE7a c\u1ED9ng \u0111\u1ED3ng \xCA \u0110\xEA."
          },
          {
            time: "10:15 \u2013 12:30",
            period: "Gi\u1EEFa s\xE1ng",
            title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA & Tri\u1EC3n l\xE3m \u0110\u01B0\u01A1ng \u0111\u1EA1i",
            location: "\u0110\u01B0\u1EDDng Nguy\u1EC5n \u0110\xECnh Chi\u1EC3u \u2022 BMT",
            x: 405,
            y: 172,
            desc: "Tr\u1EA3i nghi\u1EC7m s\u1EF1 giao thoa gi\u1EEFa di s\u1EA3n b\u1EA3n \u0111\u1ECBa ng\xE0n n\u0103m v\xE0 ng\xF4n ng\u1EEF thi\u1EBFt k\u1EBF ki\u1EBFn tr\xFAc hi\u1EC7n \u0111\u1EA1i."
          },
          {
            time: "14:30 \u2013 16:30",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Qu\xE0 t\u1EB7ng Th\u1EE7 c\xF4ng Th\u1ED5 c\u1EA9m & Kh\u1EDFi h\xE0nh",
            location: "Trung t\xE2m BMT \u2192 S\xE2n bay BMV",
            x: 605,
            y: 176,
            desc: "Ch\u1ECDn mua kh\u0103n cho\xE0ng th\u1ED5 c\u1EA9m d\u1EC7t tay, t\xFAi Kteh v\xE0 c\xE0 ph\xEA \u0111\u1EB7c s\u1EA3n l\xE0m qu\xE0 l\u01B0u ni\u1EC7m."
          }
        ]
      },
      {
        day: "Ng\xE0y 4",
        title: "M\u1EDF r\u1ED9ng: Giao thoa V\u0103n h\xF3a B\u1EA3n \u0110\xF4n (\xCA \u0110\xEA \u2013 M\u2019n\xF4ng \u2013 L\xE0o)",
        area: "T\xE2y B\u1EAFc BMT \u2022 ~85 km kh\u1EE9 h\u1ED3i",
        slots: [
          {
            time: "08:00 \u2013 11:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Nh\xE0 S\xE0n C\u1ED5 Vua S\u0103n Voi Khunjunob",
            location: "X\xE3 Kr\xF4ng Na \u2022 Bu\xF4n \u0110\xF4n",
            x: 155,
            y: 125,
            desc: "Tham quan ng\xF4i nh\xE0 s\xE0n g\u1ED7 ki\u1EBFn tr\xFAc L\xE0o \u2013 M\u2019n\xF4ng h\u01A1n 130 n\u0103m tu\u1ED5i l\u01B0u gi\u1EEF k\u1EF7 v\u1EADt ngh\u1EC1 thu\u1EA7n d\u01B0\u1EE1ng voi."
          },
          {
            time: "14:00 \u2013 16:45",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k & R\u1EB7ng Si C\u1ED5 Th\u1EE5",
            location: "\u0110\u1EA3o \xC2m Ph\u1EE7 \u2022 Bu\xF4n \u0110\xF4n",
            x: 182,
            y: 142,
            desc: "\u0110i b\u1ED9 qua nh\u1EEFng nh\u1ECBp c\u1EA7u treo tre l\u1EAFc l\u01B0 d\u01B0\u1EDBi v\xF2m r\u1EC5 si kh\u1ED5ng l\u1ED3 gi\u1EEFa l\xF2ng s\xF4ng S\xEAr\xEAp\u1ED1k."
          }
        ]
      }
    ]
  },
  nature: {
    relatedArticleKey: "waterfalls",
    title: "Chinh Ph\u1EE5c C\u1EE5m Th\xE1c S\xEAr\xEAp\u1ED1k & R\u1EEBng Kh\u1ED9p Nguy\xEAn Sinh Yok \u0110\xF4n",
    hiddenGem: "\u0110\u01B0\u1EDDng m\xF2n xuy\xEAn r\u1EEBng \u0111\u1EB7c d\u1EE5ng n\u1ED1i th\xE1c Dray Nur \u2013 Dray S\xE1p & \u0110\xE1 Voi M\u1EB9 Yang Tao.",
    routeTip: "Chia 2 h\u01B0\u1EDBng r\xF5 r\u1EC7t: H\u01B0\u1EDBng Nam (Th\xE1c Dray Nur) v\xE0 H\u01B0\u1EDBng T\xE2y B\u1EAFc (Yok \u0110\xF4n \u2013 B\u1EA3n \u0110\xF4n) gi\xFAp tr\u1ECDn v\u1EB9n th\u1EDDi gian.",
    totalKmBase: 175,
    days: [
      {
        day: "Ng\xE0y 1",
        title: "C\u1EE5m Th\xE1c Dray Nur \u2013 Dray S\xE1p & S\xF4ng Ch\u1EA3y Ng\u01B0\u1EE3c",
        area: "H\u01B0\u1EDBng Nam BMT \u2022 ~58 km",
        slots: [
          {
            time: "07:30 \u2013 10:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Chi\xEAm ng\u01B0\u1EE1ng B\u1EE9c T\u01B0\u1EDDng N\u01B0\u1EDBc Th\xE1c Dray Nur",
            location: "X\xE3 Dray S\xE1p \u2022 Kr\xF4ng Ana",
            x: 265,
            y: 288,
            desc: "\u0110\u1EE9ng tr\u01B0\u1EDBc ng\u1ECDn th\xE1c r\u1ED9ng 250m tung b\u1ECDt tr\u1EAFng x\xF3a v\xE0 kh\xE1m ph\xE1 hang \u0111\xE1 bazan ph\xEDa sau m\xE0n n\u01B0\u1EDBc."
          },
          {
            time: "10:45 \u2013 13:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "\u0110\u1EA1p Xe Xuy\xEAn R\u1EEBng \u0110\u1EB7c D\u1EE5ng & Th\xE1c Gia Long",
            location: "Tuy\u1EBFn r\u1EEBng Bu\xF4n Ku\u1ED1p \u2013 Dray S\xE1p",
            x: 298,
            y: 262,
            desc: "\u0110\u1EA1p xe d\u01B0\u1EDBi t\xE1n r\u1EEBng c\u1ED5 th\u1EE5 d\u1ECDc b\u1EDD s\xF4ng S\xEAr\xEAp\u1ED1k v\xE0 d\xF9ng b\u1EEFa tr\u01B0a d\xE3 ngo\u1EA1i b\xEAn su\u1ED1i m\xE1t."
          },
          {
            time: "14:30 \u2013 17:30",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Ch\xE8o Thuy\u1EC1n Kayak / SUP Tr\xEAn S\xF4ng S\xEAr\xEAp\u1ED1k",
            location: "H\u1EA1 l\u01B0u th\xE1c Dray Nur",
            x: 242,
            y: 274,
            desc: "Th\u1EA3 m\xECnh tr\xEAn d\xF2ng s\xF4ng ch\u1EA3y ng\u01B0\u1EE3c k\u1EF3 th\xFA gi\u1EEFa hai v\xE1ch \u0111\xE1 n\xFAi l\u1EEDa h\xF9ng v\u0129."
          },
          {
            time: "19:00 \u2013 21:00",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "Ngh\u1EC9 \u0111\xEAm Ph\u1ED1 n\xFAi & Th\u01B0\u1EDFng th\u1EE9c C\xE1 L\u0103ng",
            location: "TP. Bu\xF4n Ma Thu\u1ED9t",
            x: 378,
            y: 196,
            desc: "Th\u01B0\u1EDFng th\u1EE9c l\u1EA9u c\xE1 l\u0103ng s\xF4ng S\xEAr\xEAp\u1ED1k t\u01B0\u01A1i ng\u1ECDt v\xE0 n\u1EA1p n\u0103ng l\u01B0\u1EE3ng cho ng\xE0y trekking r\u1EEBng kh\u1ED9p."
          }
        ]
      },
      {
        day: "Ng\xE0y 2",
        title: "Trekking R\u1EEBng Kh\u1ED9p Yok \u0110\xF4n & Du L\u1ECBch Th\xE2n Thi\u1EC7n C\xF9ng Voi",
        area: "H\u01B0\u1EDBng T\xE2y B\u1EAFc (TL1) \u2022 ~86 km",
        slots: [
          {
            time: "07:30 \u2013 11:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "\u0110i B\u1ED9 D\u01B0\u1EDBi T\xE1n R\u1EEBng Kh\u1ED9p C\xF9ng Voi T\u1EF1 Nhi\xEAn",
            location: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n",
            x: 132,
            y: 112,
            desc: "H\xE0nh tr\xECnh nh\xE2n v\u0103n kh\xF4ng c\u01B0\u1EE1i voi: theo ch\xE2n ki\u1EC3m l\xE2m quan s\xE1t \u0111\xE0n voi t\u1EF1 do ki\u1EBFm \u0103n b\xEAn su\u1ED1i r\u1EEBng."
          },
          {
            time: "12:00 \u2013 13:45",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "\u1EA8m th\u1EF1c B\u1EA3n \u0110\xF4n B\xEAn B\u1EDD S\xF4ng S\xEAr\xEAp\u1ED1k",
            location: "Trung t\xE2m Du l\u1ECBch B\u1EA3n \u0110\xF4n",
            x: 168,
            y: 135,
            desc: "Th\u01B0\u1EDFng th\u1EE9c g\xE0 n\u01B0\u1EDBng B\u1EA3n \u0110\xF4n ch\u1EA5m mu\u1ED1i s\u1EA3 \u1EDBt r\u1EEBng v\xE0 c\u01A1m lam n\u01B0\u1EDBng \u1ED1ng tre non."
          },
          {
            time: "14:30 \u2013 17:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Kh\xE1m Ph\xE1 H\u1EC7 Sinh Th\xE1i R\u1EEBng R\u1EE5ng L\xE1 M\xF9a Kh\xF4",
            location: "Tr\u1EA1m Ki\u1EC3m l\xE2m Yok \u0110\xF4n",
            x: 115,
            y: 148,
            desc: "T\xECm hi\u1EC3u h\u1EC7 \u0111\u1ED9ng th\u1EF1c v\u1EADt qu\xFD hi\u1EBFm c\u1EE7a khu r\u1EEBng \u0111\u1EB7c d\u1EE5ng l\u1EDBn nh\u1EA5t Vi\u1EC7t Nam (h\u01A1n 115.000 ha)."
          }
        ]
      },
      {
        day: "Ng\xE0y 3",
        title: "\u0110\xE1 Voi M\u1EB9 Yang Tao & B\xECnh Y\xEAn H\u1ED3 L\u1EAFk",
        area: "H\u01B0\u1EDBng \u0110\xF4ng Nam (QL27) \u2022 ~64 km",
        slots: [
          {
            time: "08:00 \u2013 10:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Chinh Ph\u1EE5c \u0110\u1EC9nh \u0110\xE1 Voi M\u1EB9 Yang Tao",
            location: "X\xE3 Yang Tao \u2022 Qu\u1ED1c l\u1ED9 27",
            x: 478,
            y: 256,
            desc: "Leo nh\u1EB9 15 ph\xFAt l\xEAn l\u01B0ng t\u1EA3ng \u0111\xE1 nguy\xEAn kh\u1ED1i d\xE0i 200m \u0111\xF3n gi\xF3 l\u1ED9ng v\xE0 ng\u1EAFm d\xE3y Ch\u01B0 Yang Sin."
          },
          {
            time: "11:00 \u2013 14:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "Ngh\u1EC9 Ng\u01A1i & Ch\xE8o \u0110\u1ED9c M\u1ED9c H\u1ED3 L\u1EAFk",
            location: "H\u1ED3 L\u1EAFk \u2022 Th\u1ECB tr\u1EA5n Li\xEAn S\u01A1n",
            x: 545,
            y: 315,
            desc: "Th\u01B0 gi\xE3n b\xEAn m\u1EB7t h\u1ED3 t\u0129nh l\u1EB7ng tr\u01B0\u1EDBc khi quay v\u1EC1 s\xE2n bay Bu\xF4n Ma Thu\u1ED9t."
          },
          {
            time: "15:30 \u2013 17:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Di chuy\u1EC3n v\u1EC1 S\xE2n bay Bu\xF4n Ma Thu\u1ED9t",
            location: "QL27 \u2192 S\xE2n bay BMV",
            x: 605,
            y: 176,
            desc: "K\u1EBFt th\xFAc cung \u0111\u01B0\u1EDDng kh\xE1m ph\xE1 thi\xEAn nhi\xEAn \u2013 sinh th\xE1i \u0110\u1EAFk L\u1EAFk."
          }
        ]
      },
      {
        day: "Ng\xE0y 4",
        title: "M\u1EDF r\u1ED9ng: Trekking Ch\xE2n N\xFAi Ch\u01B0 Yang Sin & Th\xE1c B\xECm B\u1ECBp",
        area: "VQG Ch\u01B0 Yang Sin \u2022 ~45 km",
        slots: [
          {
            time: "07:30 \u2013 12:00",
            period: "Bu\u1ED5i s\xE1ng",
            title: "B\u0103ng R\u1EEBng Th\u01B0\u1EDDng Xanh T\u1EDBi Th\xE1c B\xECm B\u1ECBp",
            location: "V\u01B0\u1EDDn Qu\u1ED1c gia Ch\u01B0 Yang Sin",
            x: 598,
            y: 342,
            desc: "L\u1ED9i su\u1ED1i \u0111\xE1 trong v\u1EAFt d\u01B0\u1EDBi t\xE1n th\xF4ng c\u1ED5 th\u1EE5 v\xE0 p\u01A1-mu ng\xE0n n\u0103m tu\u1ED5i."
          },
          {
            time: "14:00 \u2013 16:30",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Th\u01B0\u1EDFng Th\u1EE9c Tr\xE0 Th\u1EA3o M\u1ED9c & C\xE0 Ph\xEA C\u1ED5 Th\u1EE5",
            location: "Thung l\u0169ng Yang Tao",
            x: 495,
            y: 275,
            desc: "Ngh\u1EC9 ng\u01A1i th\u01B0 gi\xE3n gi\u1EEFa kh\xF4ng kh\xED trong l\xE0nh c\u1EE7a v\xF9ng \u0111\u1EC7m Ch\u01B0 Yang Sin."
          }
        ]
      }
    ]
  },
  cuisine: {
    relatedArticleKey: "cuisine",
    title: "B\u1EA3n Giao H\u01B0\u1EDFng V\u1ECB Gi\xE1c N\xFAi R\u1EEBng \u0110\u1EAFk L\u1EAFk",
    hiddenGem: "B\u1EEFa c\u01A1m m\u1EABu h\u1EC7 t\u1EA1i b\u1EBFp l\u1EEDa nh\xE0 d\xE0i v\u1EDBi canh l\xE1 b\xE9p, c\xE0 \u0111\u1EAFng gi\xE3 ki\u1EBFn v\xE0ng & r\u01B0\u1EE3u c\u1EA7n \u1EE7 tr\u1EA5u.",
    routeTip: "K\u1EBFt h\u1EE3p tr\u1EA3i nghi\u1EC7m \u1EA9m th\u1EF1c theo khung gi\u1EDD: B\xFAn \u0111\u1ECF bu\u1ED5i chi\u1EC1u, g\xE0 n\u01B0\u1EDBng B\u1EA3n \u0110\xF4n bu\u1ED5i tr\u01B0a, c\xE0 ph\xEA v\u1EE3t \u0111\xEAm.",
    totalKmBase: 132,
    days: [
      {
        day: "Ng\xE0y 1",
        title: "Food Tour Ph\u1ED1 N\xFAi Bu\xF4n Ma Thu\u1ED9t T\u1EEB S\xE1ng \u0110\u1EBFn \u0110\xEAm",
        area: "TP. Bu\xF4n Ma Thu\u1ED9t \u2022 ~20 km",
        slots: [
          {
            time: "07:30 \u2013 09:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "B\xFAn Ch\xECa Ban M\xEA & C\xE0 Ph\xEA V\u1EE3t C\u1ED5 Truy\u1EC1n",
            location: "Khu ph\u1ED1 c\u1ED5 Phan \u0110\xECnh Gi\xF3t \u2022 BMT",
            x: 372,
            y: 194,
            desc: "Th\u01B0\u1EDFng th\u1EE9c t\xF4 b\xFAn ch\xECa ng\u1ECDt thanh ninh t\u1EEB gi\xF2 sau heo v\xE0 ly c\xE0 ph\xEA v\u1EE3t th\u01A1m l\u1EEBng h\u01B0\u01A1ng kh\xF3i."
          },
          {
            time: "11:30 \u2013 13:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "B\xE1nh \u01AF\u1EDBt Th\u1ECBt N\u01B0\u1EDBng \u0110\u0129a Ch\u1ED3ng Tr\u1EA7n Nh\u1EADt Du\u1EADt",
            location: "\u0110\u01B0\u1EDDng Tr\u1EA7n Nh\u1EADt Du\u1EADt \u2022 BMT",
            x: 388,
            y: 162,
            desc: "Cu\u1ED1n t\u1EEBng \u0111\u0129a b\xE1nh \u01B0\u1EDBt n\xF3ng h\u1ED5i c\xF9ng th\u1ECBt n\u01B0\u1EDBng than h\u1ED3ng, d\u01B0a c\u1EA3i chua, xo\xE0i xanh v\xE0 t\u01B0\u01A1ng n\u1EBFp."
          },
          {
            time: "15:30 \u2013 17:30",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Kem B\u01A1 S\xE1p \u0110\u1EAFk L\u1EAFk & Workshop Cacao Th\u1EE7 C\xF4ng",
            location: "Ng\xE3 S\xE1u Bu\xF4n Ma Thu\u1ED9t",
            x: 396,
            y: 185,
            desc: "N\u1EBFm v\u1ECB b\xE9o m\u1ECBn c\u1EE7a b\u01A1 s\xE1p \u0111\u1EA5t \u0111\u1ECF k\u1EBFt h\u1EE3p kem d\u1EEBa non v\xE0 t\xECm hi\u1EC3u quy tr\xECnh l\xE0m socola th\u1EE7 c\xF4ng."
          },
          {
            time: "19:00 \u2013 21:30",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "B\xFAn \u0110\u1ECF Ban M\xEA & L\u1EA9u L\xE1 R\u1EEBng",
            location: "\u0110\u01B0\u1EDDng Phan \u0110\xECnh Gi\xF3t \u2013 L\xEA H\u1ED3ng Phong",
            x: 365,
            y: 210,
            desc: "Tr\u1EA3i nghi\u1EC7m m\xF3n b\xFAn \u0111\u1ECF \u0111\u1EB7c tr\u01B0ng ch\u1EC9 xu\u1EA5t hi\u1EC7n khi ph\u1ED1 l\xEAn \u0111\xE8n v\xE0 n\u1ED3i l\u1EA9u h\u01A1n 10 lo\u1EA1i l\xE1 r\u1EEBng T\xE2y Nguy\xEAn."
          }
        ]
      },
      {
        day: "Ng\xE0y 2",
        title: "H\u01B0\u01A1ng V\u1ECB B\u1EA3n \u0110\xF4n & \u0110\u1EB7c S\u1EA3n S\xF4ng S\xEAr\xEAp\u1ED1k",
        area: "Bu\xF4n Ma Thu\u1ED9t \u2192 B\u1EA3n \u0110\xF4n \u2022 ~76 km",
        slots: [
          {
            time: "08:30 \u2013 11:00",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Th\u0103m V\u01B0\u1EDDn Ti\xEAu R\u1EEBng, Cacao & M\u1EAFc-ca",
            location: "Tuy\u1EBFn \u0111\u01B0\u1EDDng \u0111i Bu\xF4n \u0110\xF4n",
            x: 255,
            y: 158,
            desc: "T\xECm hi\u1EC3u c\xE1c lo\u1EA1i gia v\u1ECB b\u1EA3n \u0111\u1ECBa: h\u1EA1t ti\xEAu r\u1EEBng, \u1EDBt xi\xEAm xanh, l\xE1 \xE9 tr\u1EAFng v\xE0 h\u1EA1t m\u1EAFc-ca n\u01B0\u1EDBng c\u1EE7i."
          },
          {
            time: "11:30 \u2013 14:00",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "G\xE0 N\u01B0\u1EDBng B\u1EA3n \u0110\xF4n & C\u01A1m Lam \u1ED0ng N\u1EE9a Non",
            location: "B\u1EBFn n\u01B0\u1EDBc S\xEAr\xEAp\u1ED1k \u2022 B\u1EA3n \u0110\xF4n",
            x: 165,
            y: 132,
            desc: "G\xE0 th\u1EA3 v\u01B0\u1EDDn k\u1EB9p thanh tre n\u01B0\u1EDBng v\xE0ng \u01B0\u01A1m tr\xEAn than h\u1ED3ng, ch\u1EA5m mu\u1ED1i s\u1EA3 l\xE1 \xE9 \u0103n k\xE8m c\u01A1m lam d\u1EBBo th\u01A1m."
          },
          {
            time: "17:30 \u2013 20:30",
            period: "Bu\u1ED5i t\u1ED1i",
            title: "B\u1EEFa Ti\u1EC7c C\xE1 L\u0103ng S\xF4ng S\xEAr\xEAp\u1ED1k & R\u01B0\u1EE3u C\u1EA7n",
            location: "Nh\xE0 d\xE0i Bu\xF4n Ako Dh\xF4ng \u2022 BMT",
            x: 392,
            y: 150,
            desc: "Th\u01B0\u1EDFng th\u1EE9c c\xE1 l\u0103ng n\u01B0\u1EDBng mu\u1ED1i \u1EDBt, canh chua c\xE1 l\u0103ng m\u0103ng r\u1EEBng v\xE0 nh\u1EA5p r\u01B0\u1EE3u c\u1EA7n \u1EE7 men l\xE1 ng\u1ECDt d\u1ECBu."
          }
        ]
      },
      {
        day: "Ng\xE0y 3",
        title: "\u1EA8m Th\u1EF1c M\u2019n\xF4ng Ven H\u1ED3 L\u1EAFk & Qu\xE0 T\u1EB7ng N\xF4ng S\u1EA3n",
        area: "H\u1ED3 L\u1EAFk \u2192 S\xE2n bay BMV \u2022 ~56 km",
        slots: [
          {
            time: "08:30 \u2013 11:00",
            period: "Bu\u1ED5i s\xE1ng",
            title: "Tr\u1EA3i Nghi\u1EC7m B\u1EBFp L\u1EEDa Nh\xE0 D\xE0i: Canh L\xE1 B\xE9p & C\xE0 \u0110\u1EAFng",
            location: "Bu\xF4n Jun \u2022 H\u1ED3 L\u1EAFk",
            x: 538,
            y: 318,
            desc: "C\xF9ng ng\u01B0\u1EDDi ph\u1EE5 n\u1EEF M\u2019n\xF4ng ch\u1EBF bi\u1EBFn m\xF3n c\xE0 \u0111\u1EAFng gi\xE3 c\xE1 c\u01A1m kh\xF4, \u0111\u1ECDt m\xE2y n\u01B0\u1EDBng v\xE0 canh l\xE1 b\xE9p ng\u1ECDt thanh."
          },
          {
            time: "11:30 \u2013 13:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "Ch\u1EA3 C\xE1 Th\xE1c L\xE1c H\u1ED3 L\u1EAFk & L\u01B0\u01A1n \u0110\u1ED3ng Um Chu\u1ED1i",
            location: "Ven H\u1ED3 L\u1EAFk \u2022 Huy\u1EC7n L\u1EAFk",
            x: 552,
            y: 305,
            desc: "Th\u01B0\u1EDFng th\u1EE9c \u0111\u1EB7c s\u1EA3n tr\u1EE9 danh \u0111\xE1nh b\u1EAFt tr\u1EF1c ti\u1EBFp t\u1EEB l\xF2ng h\u1ED3 n\u01B0\u1EDBc ng\u1ECDt r\u1ED9ng 500ha."
          },
          {
            time: "15:00 \u2013 17:00",
            period: "Bu\u1ED5i chi\u1EC1u",
            title: "Mua S\u1EAFm N\xF4ng S\u1EA3n \u0110\u1EB7c S\u1EA3n \u0110\u1EAFk L\u1EAFk",
            location: "Trung t\xE2m BMT \u2192 S\xE2n bay BMV",
            x: 605,
            y: 176,
            desc: "\u0110\xF3ng g\xF3i c\xE0 ph\xEA Fine Robusta, m\u1EADt ong hoa c\xE0 ph\xEA, h\u1EA1t m\u1EAFc-ca, b\xF2 kh\xF4 th\u1ED1 \u0111\u1EA5t v\xE0 mu\u1ED1i ki\u1EBFn v\xE0ng."
          }
        ]
      },
      {
        day: "Ng\xE0y 4",
        title: "M\u1EDF r\u1ED9ng: Tr\u1EA3i Nghi\u1EC7m Rang C\xE0 Ph\xEA C\u1EE7i & \u1EA8m Th\u1EF1c Th\xE1c N\u01B0\u1EDBc",
        area: "C\u1EE5m th\xE1c Dray Nur \u2022 ~52 km",
        slots: [
          {
            time: "08:30 \u2013 11:30",
            period: "Bu\u1ED5i s\xE1ng",
            title: "T\u1EF1 Tay Rang C\xE0 Ph\xEA Ch\u1EA3o Gang B\xEAn Su\u1ED1i",
            location: "Khu sinh th\xE1i Dray Nur",
            x: 268,
            y: 285,
            desc: "L\u1EAFng nghe ti\u1EBFng h\u1EA1t c\xE0 ph\xEA n\u1ED5 l\xE1ch t\xE1ch tr\xEAn b\u1EBFp c\u1EE7i v\xE0 pha phin th\u01B0\u1EDFng th\u1EE9c ngay b\xEAn d\xF2ng th\xE1c m\xE1t l\xE0nh."
          },
          {
            time: "12:00 \u2013 14:30",
            period: "Bu\u1ED5i tr\u01B0a",
            title: "Heo R\u1EEBng Lai N\u01B0\u1EDBng \u1ED0ng Tre & Rau R\u1EEBng Lu\u1ED9c",
            location: "Bu\xF4n Ku\u1ED1p \u2022 Kr\xF4ng Ana",
            x: 302,
            y: 256,
            desc: "B\u1EEFa tr\u01B0a \u0111\u1EADm ch\u1EA5t \u0111\u1EA1i ng\xE0n kh\xE9p l\u1EA1i h\xE0nh tr\xECnh kh\xE1m ph\xE1 \u1EA9m th\u1EF1c \u0110\u1EAFk L\u1EAFk."
          }
        ]
      }
    ]
  }
};
var sampleSchedulePresets = [
  {
    key: "coffee",
    badge: "3N2\u0110 \u2022 C\u1EB7p \u0111\xF4i",
    title: "C\xE0 ph\xEA \u0110\u1EB7c s\u1EA3n & S\u01B0\u01A1ng s\u1EDBm H\u1ED3 L\u1EAFk",
    summary: "B\u1EA3o t\xE0ng C\xE0 ph\xEA \u2022 R\u1EABy C\u01B0 M\u2019gar \u2022 Ch\xE8o \u0111\u1ED9c m\u1ED9c Bu\xF4n Jun",
    image: "https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=1000&q=80",
    companion: "couple",
    duration: "3N2D",
    budget: "standard",
    theme: "coffee",
    prompt: "L\xEAn l\u1ECBch tr\xECnh 3N2\u0110 cho c\u1EB7p \u0111\xF4i th\xEDch c\xE0 ph\xEA \u0111\u1EB7c s\u1EA3n, th\u0103m B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA, n\xF4ng tr\u1EA1i C\u01B0 M\u2019gar v\xE0 ch\xE8o thuy\u1EC1n ng\u1EAFm b\xECnh minh H\u1ED3 L\u1EAFk."
  },
  {
    key: "culture",
    badge: "3N2\u0110 \u2022 Gia \u0111\xECnh",
    title: "Di s\u1EA3n C\u1ED3ng chi\xEAng & Nh\xE0 D\xE0i M\u1EABu h\u1EC7",
    summary: "Bu\xF4n c\u1ED5 Ako Dh\xF4ng \u2022 D\u1EC7t T\u01A1ng J\xFA \u2022 G\u1ED1m c\u1ED5 Yang Tao",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/18/Tay_Nguyen_gongs.JPG",
    companion: "family",
    duration: "3N2D",
    budget: "standard",
    theme: "culture",
    prompt: "Thi\u1EBFt k\u1EBF l\u1ECBch tr\xECnh 3N2\u0110 cho gia \u0111\xECnh t\xECm hi\u1EC3u v\u0103n h\xF3a C\u1ED3ng chi\xEAng \xCA \u0110\xEA, nh\xE0 d\xE0i m\u1EABu h\u1EC7 Ako Dh\xF4ng, d\u1EC7t th\u1ED5 c\u1EA9m v\xE0 l\xE0ng g\u1ED1m c\u1ED5 Yang Tao."
  },
  {
    key: "nature",
    badge: "2N1\u0110 \u2022 Nh\xF3m b\u1EA1n",
    title: "Th\xE1c Dray Nur & Trekking R\u1EEBng Yok \u0110\xF4n",
    summary: "Ch\xE8o SUP S\xEAr\xEAp\u1ED1k \u2022 R\u1EEBng kh\u1ED9p Yok \u0110\xF4n \u2022 \u0110\xE1 Voi M\u1EB9",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Draynur_falls.jpg",
    companion: "friends",
    duration: "2N1D",
    budget: "standard",
    theme: "nature",
    prompt: "G\u1EE3i \xFD l\u1ECBch tr\xECnh 2N1\u0110 cho nh\xF3m b\u1EA1n kh\xE1m ph\xE1 c\u1EE5m th\xE1c Dray Nur \u2013 s\xF4ng S\xEAr\xEAp\u1ED1k ch\u1EA3y ng\u01B0\u1EE3c v\xE0 trekking r\u1EEBng kh\u1ED9p V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n."
  },
  {
    key: "cuisine",
    badge: "3N2\u0110 \u2022 \u0110\u1ED9c h\xE0nh",
    title: "B\u1EA3n Giao H\u01B0\u1EDFng \u1EA8m Th\u1EF1c \u0110\u1EA1i Ng\xE0n",
    summary: "B\xFAn \u0111\u1ECF Ban M\xEA \u2022 G\xE0 n\u01B0\u1EDBng B\u1EA3n \u0110\xF4n \u2022 C\xE1 l\u0103ng S\xEAr\xEAp\u1ED1k",
    image: "https://images.unsplash.com/photo-1648141643305-efb7d2542602?auto=format&fit=crop&w=1000&q=80",
    companion: "solo",
    duration: "3N2D",
    budget: "standard",
    theme: "cuisine",
    prompt: "M\xECnh \u0111i \u0111\u1ED9c h\xE0nh 3N2\u0110 mu\u1ED1n kh\xE1m ph\xE1 tr\u1ECDn v\u1EB9n \u1EA9m th\u1EF1c b\u1EA3n \u0111\u1ECBa \u0110\u1EAFk L\u1EAFk: b\xFAn \u0111\u1ECF, g\xE0 n\u01B0\u1EDBng c\u01A1m lam B\u1EA3n \u0110\xF4n, c\xE1 l\u0103ng S\xEAr\xEAp\u1ED1k v\xE0 canh l\xE1 b\xE9p."
  }
];

// server/services/ai/aiTraceService.ts
function safeParseOptional(raw) {
  if (raw === null || raw === void 0) return void 0;
  if (typeof raw !== "string") {
    if (typeof raw === "object" && Object.keys(raw).length === 0) {
      return void 0;
    }
    return raw;
  }
  if (!raw || raw === "{}" || raw === "null") return void 0;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length === 0) {
      return void 0;
    }
    return parsed;
  } catch {
    return void 0;
  }
}
function mapRowToTraceRecord(row) {
  return {
    traceId: row.trace_id,
    lang: row.lang === "en" ? "en" : "vi",
    userMessage: row.user_message,
    intent: row.intent,
    status: row.status,
    provider: row.provider,
    intake: safeParseOptional(row.intake_json),
    capacityPlan: safeParseOptional(row.capacity_json),
    budgetResult: safeParseOptional(row.budget_json),
    purposeSelection: safeParseOptional(row.purpose_json),
    evalResult: safeParseOptional(row.eval_json),
    latencyMs: row.latency_ms,
    retryCount: row.retry_count,
    feedbackRating: row.feedback_rating ?? null,
    feedbackComment: row.feedback_comment || void 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function saveAiTrace(record) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const createdAt = record.createdAt || now;
  const updatedAt = record.updatedAt || now;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const existing = await getAiTraceById(record.traceId);
    const nextRating = record.feedbackRating ?? existing?.feedbackRating ?? null;
    const trimmedComment = (record.feedbackComment || "").trim();
    const nextComment = trimmedComment || existing?.feedbackComment || "";
    const { error } = await supabase.from("ai_traces").upsert(
      {
        trace_id: record.traceId,
        lang: record.lang,
        user_message: record.userMessage,
        intent: record.intent,
        status: record.status,
        provider: record.provider,
        intake_json: record.intake || {},
        capacity_json: record.capacityPlan || {},
        budget_json: record.budgetResult || {},
        purpose_json: record.purposeSelection || {},
        eval_json: record.evalResult || {},
        latency_ms: Math.max(0, Math.round(record.latencyMs)),
        retry_count: Math.max(0, Math.round(record.retryCount)),
        feedback_rating: nextRating,
        feedback_comment: nextComment,
        created_at: existing?.createdAt || createdAt,
        updated_at: updatedAt
      },
      { onConflict: "trace_id" }
    );
    if (error) {
      throw new Error(`Supabase saveAiTrace failed: ${error.message}`);
    }
    return;
  }
  const db = getDb();
  db.prepare(
    `INSERT INTO ai_traces (
      trace_id, lang, user_message, intent, status, provider,
      intake_json, capacity_json, budget_json, purpose_json, eval_json,
      latency_ms, retry_count, feedback_rating, feedback_comment, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(trace_id) DO UPDATE SET
      status = excluded.status,
      provider = excluded.provider,
      intake_json = excluded.intake_json,
      capacity_json = excluded.capacity_json,
      budget_json = excluded.budget_json,
      purpose_json = excluded.purpose_json,
      eval_json = excluded.eval_json,
      latency_ms = excluded.latency_ms,
      retry_count = excluded.retry_count,
      feedback_rating = COALESCE(excluded.feedback_rating, ai_traces.feedback_rating),
      feedback_comment = CASE
        WHEN excluded.feedback_comment != '' THEN excluded.feedback_comment
        ELSE ai_traces.feedback_comment
      END,
      updated_at = excluded.updated_at`
  ).run(
    record.traceId,
    record.lang,
    record.userMessage,
    record.intent,
    record.status,
    record.provider,
    JSON.stringify(record.intake || {}),
    JSON.stringify(record.capacityPlan || {}),
    JSON.stringify(record.budgetResult || {}),
    JSON.stringify(record.purposeSelection || {}),
    JSON.stringify(record.evalResult || {}),
    Math.max(0, Math.round(record.latencyMs)),
    Math.max(0, Math.round(record.retryCount)),
    record.feedbackRating ?? null,
    (record.feedbackComment || "").trim(),
    createdAt,
    updatedAt
  );
}
async function getAiTraceById(traceId) {
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("ai_traces").select("*").eq("trace_id", traceId).maybeSingle();
    if (error) throw new Error(`Supabase getAiTraceById failed: ${error.message}`);
    return data ? mapRowToTraceRecord(data) : null;
  }
  const db = getDb();
  const row = db.prepare("SELECT * FROM ai_traces WHERE trace_id = ?").get(traceId);
  return row ? mapRowToTraceRecord(row) : null;
}
async function submitAiTraceFeedback(input) {
  const traceId = String(input.traceId || "").trim();
  if (!traceId) {
    throw new ServiceError(400, "VALIDATION_ERROR", "traceId l\xE0 b\u1EAFt bu\u1ED9c.");
  }
  if (input.rating !== 1 && input.rating !== -1) {
    throw new ServiceError(400, "VALIDATION_ERROR", "rating ph\u1EA3i l\xE0 1 ho\u1EB7c -1.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const comment = typeof input.comment === "string" ? input.comment.trim().slice(0, 1e3) : "";
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const existing2 = await getAiTraceById(traceId);
    if (!existing2) {
      throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y trace AI t\u01B0\u01A1ng \u1EE9ng.");
    }
    const { data, error } = await supabase.from("ai_traces").update({
      feedback_rating: input.rating,
      feedback_comment: comment,
      updated_at: now
    }).eq("trace_id", traceId).select("*").single();
    if (error || !data) {
      throw new Error(`Supabase submitAiTraceFeedback failed: ${error?.message || "Unknown error"}`);
    }
    return mapRowToTraceRecord(data);
  }
  const db = getDb();
  const existing = db.prepare("SELECT trace_id FROM ai_traces WHERE trace_id = ?").get(traceId);
  if (!existing) {
    throw new ServiceError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y trace AI t\u01B0\u01A1ng \u1EE9ng.");
  }
  db.prepare(
    `UPDATE ai_traces
     SET feedback_rating = ?, feedback_comment = ?, updated_at = ?
     WHERE trace_id = ?`
  ).run(input.rating, comment, now, traceId);
  return await getAiTraceById(traceId);
}
async function listAiTraces(filters) {
  const limit = Math.max(1, Math.min(100, Number(filters?.limit) || 30));
  const offset = Math.max(0, Number(filters?.offset) || 0);
  const normalizedIntent = filters?.intent === "plan_trip" ? "update_itinerary" : filters?.intent;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("ai_traces").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (filters?.status === "needs_clarification" || filters?.status === "completed") {
      query = query.eq("status", filters.status);
    }
    if (normalizedIntent === "general_qa" || normalizedIntent === "update_itinerary" || normalizedIntent === "modify_stops") {
      query = query.eq("intent", normalizedIntent);
    }
    const { data, count, error } = await query;
    if (error) throw new Error(`Supabase listAiTraces failed: ${error.message}`);
    return {
      traces: (data || []).map(mapRowToTraceRecord),
      total: count ?? 0
    };
  }
  const db = getDb();
  const whereParts = ["1=1"];
  const params = [];
  if (filters?.status === "needs_clarification" || filters?.status === "completed") {
    whereParts.push("status = ?");
    params.push(filters.status);
  }
  if (normalizedIntent === "general_qa" || normalizedIntent === "update_itinerary" || normalizedIntent === "modify_stops") {
    whereParts.push("intent = ?");
    params.push(normalizedIntent);
  }
  const whereClause = whereParts.join(" AND ");
  const countRow = db.prepare(`SELECT COUNT(*) AS cnt FROM ai_traces WHERE ${whereClause}`).get(...params);
  const rows = db.prepare(
    `SELECT * FROM ai_traces
       WHERE ${whereClause}
       ORDER BY created_at DESC, rowid DESC
       LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);
  return {
    traces: rows.map(mapRowToTraceRecord),
    total: countRow.cnt
  };
}

// server/services/ai/workflow/langGraphAgent.ts
import crypto2 from "node:crypto";
import {
  EVALUATION_ANNOTATOR_KIND,
  EVALUATION_EXPLANATION,
  EVALUATION_LABEL,
  EVALUATION_NAME,
  EVALUATION_SCORE,
  LLM_MODEL_NAME as LLM_MODEL_NAME4,
  LLM_PROVIDER as LLM_PROVIDER4,
  LLM_SYSTEM as LLM_SYSTEM4,
  OpenInferenceSpanKind as OpenInferenceSpanKind8,
  TOOL_DESCRIPTION as TOOL_DESCRIPTION2,
  TOOL_NAME as TOOL_NAME2,
  TOOL_PARAMETERS as TOOL_PARAMETERS2
} from "@arizeai/openinference-semantic-conventions";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Annotation, END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";

// src/utils/googleMaps.ts
var KNOWN_GEO_LOOKUP = [
  {
    keywords: ["th\u1EBF gi\u1EDBi c\xE0 ph\xEA", "world coffee museum"],
    coord: { lat: 12.69086, lng: 108.04471 },
    googleMapsQuery: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA, Nguy\u1EC5n \u0110\xECnh Chi\u1EC3u, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["l\xE0ng c\xE0 ph\xEA trung nguy\xEAn", "trung nguy\xEAn"],
    coord: { lat: 12.701056, lng: 108.061103 },
    googleMapsQuery: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn, 163 L\xFD Th\xE1i T\u1ED5, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["ako dh\xF4ng", "ak\xF4 \u0111h\xF4ng"],
    coord: { lat: 12.6964, lng: 108.0478 },
    googleMapsQuery: "Bu\xF4n Ak\xF4 \u0110h\xF4ng, Tr\u1EA7n Nh\u1EADt Du\u1EADt, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["b\u1EA3o t\xE0ng \u0111\u1EAFk l\u1EAFk"],
    coord: { lat: 12.6715, lng: 108.0535 },
    googleMapsQuery: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk, 12 L\xEA Du\u1EA9n, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["ea t\xE2n", "kr\xF4ng n\u0103ng", "c\u01B0 m\u2019gar", "c\u01B0 m'gar"],
    coord: { lat: 12.94694, lng: 108.36111 },
    googleMapsQuery: "X\xE3 Ea T\xE2n, Kr\xF4ng N\u0103ng, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["\u0111\xE1 voi m\u1EB9", "\u0111\xE1 voi"],
    coord: { lat: 12.48139, lng: 108.23306 },
    googleMapsQuery: "\u0110\xE1 Voi M\u1EB9, Yang Tao, L\u1EAFk, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["g\u1ED1m c\u1ED5", "l\xE0ng g\u1ED1m", "yang tao"],
    coord: { lat: 12.468, lng: 108.215 },
    googleMapsQuery: "L\xE0ng g\u1ED1m c\u1ED5 Yang Tao, Huy\u1EC7n L\u1EAFk, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["bi\u1EC7t \u0111i\u1EC7n b\u1EA3o \u0111\u1EA1i"],
    coord: { lat: 12.426, lng: 108.176 },
    googleMapsQuery: "Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i H\u1ED3 L\u1EAFk, Li\xEAn S\u01A1n, Huy\u1EC7n L\u1EAFk, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["bu\xF4n jun", "bu\xF4n l\xEA", "h\u1ED3 l\u1EAFk", "\u0111\u1ED9c m\u1ED9c"],
    coord: { lat: 12.42167, lng: 108.18194 },
    googleMapsQuery: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun, Th\u1ECB tr\u1EA5n Li\xEAn S\u01A1n, Huy\u1EC7n L\u1EAFk, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["dray nur", "ch\u1EA3o gang b\xEAn su\u1ED1i"],
    coord: { lat: 12.5028, lng: 107.925 },
    googleMapsQuery: "Th\xE1c Dray Nur, Dray S\xE1p, Kr\xF4ng Ana, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["gia long"],
    coord: { lat: 12.5139, lng: 107.8889 },
    googleMapsQuery: "Th\xE1c Gia Long, S\xF4ng S\xEAr\xEAp\u1ED1k, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["bu\xF4n ku\u1ED1p"],
    coord: { lat: 12.5417, lng: 107.9125 },
    googleMapsQuery: "Bu\xF4n Ku\u1ED1p, Dray S\xE1p, Kr\xF4ng Ana, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["yok \u0111\xF4n"],
    coord: { lat: 12.8038, lng: 107.6707 },
    googleMapsQuery: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n, Kr\xF4ng Na, Bu\xF4n \u0110\xF4n, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["c\u1EA7u treo", "b\u1EA3n \u0111\xF4n", "khunjunob", "s\xEAr\xEAp\u1ED1k"],
    coord: { lat: 12.875, lng: 107.817 },
    googleMapsQuery: "Trung t\xE2m du l\u1ECBch C\u1EA7u treo Bu\xF4n \u0110\xF4n, Kr\xF4ng Na, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["t\u01A1ng j\xFA", "ea kao"],
    coord: { lat: 12.608, lng: 108.055 },
    googleMapsQuery: "Bu\xF4n T\u01A1ng J\xFA, X\xE3 Ea Kao, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["phan \u0111\xECnh gi\xF3t", "b\xFAn ch\xECa", "b\xFAn \u0111\u1ECF", "rang m\u1ED9c"],
    coord: { lat: 12.6816, lng: 108.0398 },
    googleMapsQuery: "\u0110\u01B0\u1EDDng Phan \u0110\xECnh Gi\xF3t, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["tr\u1EA7n nh\u1EADt du\u1EADt", "b\xE1nh \u01B0\u1EDBt th\u1ECBt n\u01B0\u1EDBng"],
    coord: { lat: 12.6895, lng: 108.0462 },
    googleMapsQuery: "\u0110\u01B0\u1EDDng Tr\u1EA7n Nh\u1EADt Du\u1EADt, Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["ng\xE3 s\xE1u", "kem b\u01A1"],
    coord: { lat: 12.6797, lng: 108.0445 },
    googleMapsQuery: "Ng\xE3 S\xE1u Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["s\xE2n bay", "bmv"],
    coord: { lat: 12.66806, lng: 108.12 },
    googleMapsQuery: "S\xE2n bay Bu\xF4n Ma Thu\u1ED9t, H\xF2a Th\u1EAFng, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["ch\u01B0 yang sin", "th\xE1c b\xECm b\u1ECBp"],
    coord: { lat: 12.455, lng: 108.375 },
    googleMapsQuery: "V\u01B0\u1EDDn Qu\u1ED1c gia Ch\u01B0 Yang Sin, Kr\xF4ng B\xF4ng, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["kpin ea", "b\u1EBFn n\u01B0\u1EDBc c\u1ED5"],
    coord: { lat: 12.686, lng: 108.062 },
    googleMapsQuery: "B\u1EBFn n\u01B0\u1EDBc c\u1ED5 Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  },
  {
    keywords: ["bu\xF4n ma thu\u1ED9t", "c\xE0 ph\xEA v\u1EE3t \u0111\xEAm", "c\xE1 l\u0103ng"],
    coord: { lat: 12.6788, lng: 108.0422 },
    googleMapsQuery: "Trung t\xE2m Th\xE0nh ph\u1ED1 Bu\xF4n Ma Thu\u1ED9t, \u0110\u1EAFk L\u1EAFk"
  }
];
function projectLegacyCanvasToLatLng(x, y) {
  const clampedX = Math.max(0, Math.min(760, x || 380));
  const clampedY = Math.max(0, Math.min(400, y || 200));
  const lat = 13.02 - clampedY / 400 * 0.68;
  const lng = 107.55 + clampedX / 760 * 0.92;
  return {
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5
  };
}
function resolveGeoForStop(input) {
  const haystack = `${input.title || ""} ${input.location || ""}`.toLowerCase();
  const matched = KNOWN_GEO_LOOKUP.find(
    (entry) => entry.keywords.some((kw) => haystack.includes(kw))
  );
  const lat = typeof input.lat === "number" ? input.lat : matched ? matched.coord.lat : projectLegacyCanvasToLatLng(input.x ?? 380, input.y ?? 200).lat;
  const lng = typeof input.lng === "number" ? input.lng : matched ? matched.coord.lng : projectLegacyCanvasToLatLng(input.x ?? 380, input.y ?? 200).lng;
  const googleMapsQuery = input.googleMapsQuery || matched?.googleMapsQuery || [input.title, input.location, "\u0110\u1EAFk L\u1EAFk"].filter(Boolean).join(", ");
  return { lat, lng, googleMapsQuery };
}
function haversineDistanceKm(a, b) {
  const toRad = (deg) => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// src/utils/plannerHelpers.ts
function computeLegMetrics(a, b) {
  const geoA = resolveGeoForStop(a);
  const geoB = resolveGeoForStop(b);
  const straightKm = haversineDistanceKm(geoA, geoB);
  const dist = Math.max(1.2, Math.round(straightKm * 1.28 * 10) / 10);
  const mins = Math.max(5, Math.round(dist * 1.45 + 3));
  return { dist, mins };
}

// server/services/ai/aiEvaluator.ts
var NEGATED_ELEPHANT_PATTERNS = [
  /không\s+cưỡi\s+voi/gi,
  /khong\s+cuoi\s+voi/gi,
  /nói\s+không\s+với\s+(?:hoạt\s+động\s+)?cưỡi\s+voi/gi,
  /noi\s+khong\s+voi\s+(?:hoat\s+dong\s+)?cuoi\s+voi/gi,
  /thay\s+vì\s+cưỡi\s+voi/gi,
  /thay\s+vi\s+cuoi\s+voi/gi,
  /(?:cấm|cam|ngừng|ngung|dừng|dung|bỏ|bo|chấm\s+dứt|cham\s+dut|tránh|tranh|từ\s+chối|tu\s+choi)\s+(?:hoạt\s+động\s+|dịch\s+vụ\s+)?(?:cưỡi\s+voi|cuoi\s+voi)/gi,
  /no\s+elephant[- ]rid(?:e|ing)/gi,
  /non[- ]rid(?:e|ing)/gi,
  /without\s+(?:elephant\s+)?rid(?:e|ing)(?:\s+elephants?)?/gi,
  /never\s+ride\s+elephants?/gi,
  /(?:avoid|stop|ban|banned|ending|end|against|replace|instead\s+of|refuse)\s+(?:elephant[- ]rid(?:e|ing)|riding\s+elephants?)/gi
];
var POSITIVE_ELEPHANT_RIDING_REGEX = /(cưỡi\s+voi|cuoi\s+voi|elephant\s+rid(?:e|ing)|ride\s+(?:an?\s+)?elephant|elephant[- ]back)/i;
function hasElephantRidingViolation(text) {
  let scrubbed = String(text || "");
  for (const negPattern of NEGATED_ELEPHANT_PATTERNS) {
    scrubbed = scrubbed.replace(negPattern, " ");
  }
  return POSITIVE_ELEPHANT_RIDING_REGEX.test(scrubbed);
}
function sanitizeEthicalElephantText(text) {
  if (!hasElephantRidingViolation(text)) return text;
  const preserved = [];
  let updated = text;
  for (const negPattern of NEGATED_ELEPHANT_PATTERNS) {
    updated = updated.replace(negPattern, (match) => {
      const idx = preserved.length;
      preserved.push(match);
      return `__ETHICAL_ELEPHANT_SAFE_${idx}__`;
    });
  }
  updated = updated.replace(/cưỡi\s+voi/gi, "\u0111i b\u1ED9 ng\u1EAFm voi t\u1EF1 nhi\xEAn kh\xF4ng c\u01B0\u1EE1i voi");
  updated = updated.replace(/cuoi\s+voi/gi, "\u0111i b\u1ED9 ng\u1EAFm voi t\u1EF1 nhi\xEAn kh\xF4ng c\u01B0\u1EE1i voi");
  updated = updated.replace(
    /(elephant\s+rid(?:e|ing)|ride\s+(?:an?\s+)?elephant|elephant[- ]back)/gi,
    "ethical elephant observation"
  );
  preserved.forEach((orig, idx) => {
    updated = updated.replace(`__ETHICAL_ELEPHANT_SAFE_${idx}__`, orig);
  });
  return updated;
}
function computeDayDistanceKm(day) {
  if (!day.slots || day.slots.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < day.slots.length; i++) {
    const a = day.slots[i - 1];
    const b = day.slots[i];
    dist += computeLegMetrics(
      {
        title: a.title,
        location: a.location,
        x: a.x ?? 378,
        y: a.y ?? 196,
        lat: a.lat,
        lng: a.lng
      },
      {
        title: b.title,
        location: b.location,
        x: b.x ?? 378,
        y: b.y ?? 196,
        lat: b.lat,
        lng: b.lng
      }
    ).dist;
  }
  return Math.round(dist * 10) / 10;
}
function isCitationUrlValid(citation, budgetResult, purposeSelection, validPostSlugs, allowedExternalUrls) {
  const url = String(citation.url || "").trim();
  if (!url) return false;
  if (url.startsWith("/blog/")) {
    const slug = url.slice("/blog/".length).split(/[?#]/)[0].trim();
    if (!slug) return false;
    const allowedSlugs = /* @__PURE__ */ new Set([
      ...purposeSelection?.relevantPosts.map((p) => p.slug) || [],
      ...validPostSlugs || []
    ]);
    if (allowedSlugs.size > 0) {
      return allowedSlugs.has(slug);
    }
    return /^[a-z0-9-]+$/i.test(slug) && !/khong-ton-tai|hallucinated|fake/i.test(slug);
  }
  if (/^https?:\/\//i.test(url)) {
    if (/\.invalid(?=\/|$)/i.test(url)) return false;
    if (url.startsWith("https://www.google.com/maps/")) return true;
    const externalWhitelist = /* @__PURE__ */ new Set([
      ...budgetResult?.citations.map((c) => c.url.trim()) || [],
      ...(allowedExternalUrls || []).map((u) => u.trim())
    ]);
    if (externalWhitelist.size > 0 || budgetResult || purposeSelection) {
      return externalWhitelist.has(url);
    }
    return true;
  }
  return false;
}
function evaluatePhase5Output(input) {
  const { response, capacityPlan, budgetResult, purposeSelection, validPostSlugs } = input;
  const violations = [];
  const repairsApplied = [];
  const checks = [];
  const repairedResponse = {
    ...response,
    itineraryMeta: response.itineraryMeta ? {
      ...response.itineraryMeta,
      tips: [...response.itineraryMeta.tips]
    } : void 0,
    generatedDays: response.generatedDays ? response.generatedDays.map((d) => ({
      ...d,
      slots: d.slots.map((s) => ({ ...s }))
    })) : void 0,
    generatedExpenses: response.generatedExpenses ? response.generatedExpenses.map((e) => ({ ...e })) : void 0,
    citations: response.citations ? response.citations.map((c) => ({ ...c })) : void 0
  };
  const selectedMap = new Map(
    purposeSelection.selectedPlaces.map((p) => [p.title.trim().toLowerCase(), p])
  );
  const days = repairedResponse.generatedDays || [];
  const distanceLimitKm = capacityPlan.maxDailyDistanceKm || 120;
  const maxStopsPerDay = capacityPlan.maxStopsPerDay || 4;
  const ungroundedTitles = [];
  days.forEach((day) => {
    day.slots.forEach((slot) => {
      const key = String(slot.title || "").trim().toLowerCase();
      if (!selectedMap.has(key)) {
        ungroundedTitles.push(slot.title);
      }
    });
  });
  if (ungroundedTitles.length > 0) {
    violations.push(
      `Ungrounded stop(s) not in selectedPlaces: ${ungroundedTitles.join(", ")}`
    );
    checks.push({
      name: "grounding_selected_places",
      passed: false,
      details: `Found ${ungroundedTitles.length} ungrounded stop(s).`
    });
    const usedKeys = /* @__PURE__ */ new Set();
    for (const day of days) {
      day.slots = day.slots.filter((slot) => {
        const k = String(slot.title || "").trim().toLowerCase();
        if (selectedMap.has(k) && !usedKeys.has(k)) {
          usedKeys.add(k);
          return true;
        }
        return false;
      });
    }
    const unusedPlaces = purposeSelection.selectedPlaces.filter(
      (p) => !usedKeys.has(p.title.trim().toLowerCase())
    );
    for (const place of unusedPlaces) {
      const currentTotal = days.reduce((sum, d) => sum + d.slots.length, 0);
      if (currentTotal >= capacityPlan.maxStopsTotal || days.length === 0) break;
      const dir = dakLakPlaceDirectory.find(
        (d) => d.title.toLowerCase() === place.title.toLowerCase()
      );
      const candidateSlot = {
        time: dir?.time || "09:00 \u2013 11:00",
        period: dir?.period || "Bu\u1ED5i s\xE1ng",
        title: place.title,
        location: place.location,
        desc: dir?.desc || `Kh\xE1m ph\xE1 ${place.title}.`,
        isCustom: false,
        areaCluster: place.areaCluster,
        x: dir?.x,
        y: dir?.y,
        lat: dir?.lat,
        lng: dir?.lng,
        googleMapsQuery: dir?.googleMapsQuery,
        estimatedCostVnd: place.estimatedSpendVnd
      };
      const eligibleDays = days.filter((d) => d.slots.length < maxStopsPerDay).sort((a, b) => a.slots.length - b.slots.length);
      const candidates = eligibleDays.length > 0 ? eligibleDays : [...days].sort((a, b) => a.slots.length - b.slots.length);
      let chosenDay = candidates.find((d) => {
        const simulated = { ...d, slots: [...d.slots, candidateSlot] };
        return computeDayDistanceKm(simulated) <= distanceLimitKm;
      });
      if (!chosenDay && candidates[0]?.slots.length === 0) {
        chosenDay = candidates[0];
      }
      if (chosenDay) {
        chosenDay.slots.push(candidateSlot);
      }
    }
    repairsApplied.push(`Replaced/pruned ${ungroundedTitles.length} ungrounded stop(s).`);
  } else {
    checks.push({
      name: "grounding_selected_places",
      passed: true,
      details: "All itinerary stops are grounded in selectedPlaces."
    });
  }
  const initialTotalStops = (response.generatedDays || []).reduce(
    (sum, d) => sum + d.slots.length,
    0
  );
  if (initialTotalStops > capacityPlan.maxStopsTotal) {
    violations.push(
      `Total stops (${initialTotalStops}) exceeds maxStopsTotal (${capacityPlan.maxStopsTotal}).`
    );
    checks.push({
      name: "stop_cap",
      passed: false,
      details: `${initialTotalStops} > ${capacityPlan.maxStopsTotal}`
    });
  } else {
    checks.push({
      name: "stop_cap",
      passed: true,
      details: `${initialTotalStops} <= ${capacityPlan.maxStopsTotal}`
    });
  }
  let currentCount = days.reduce((sum, d) => sum + d.slots.length, 0);
  if (currentCount > capacityPlan.maxStopsTotal || initialTotalStops > capacityPlan.maxStopsTotal) {
    while (currentCount > capacityPlan.maxStopsTotal) {
      const heaviest = [...days].sort((a, b) => b.slots.length - a.slots.length)[0];
      if (!heaviest || heaviest.slots.length === 0) break;
      heaviest.slots.pop();
      currentCount -= 1;
    }
    repairsApplied.push(`Trimmed stops to maxStopsTotal=${capacityPlan.maxStopsTotal}.`);
  }
  const initialExpenseTotal = (response.generatedExpenses || []).reduce(
    (sum, item) => sum + Math.max(0, Number(item.amount) || 0),
    0
  );
  if (budgetResult.totalBudgetVnd > 0 && initialExpenseTotal > budgetResult.totalBudgetVnd) {
    violations.push(
      `Total expenses (${initialExpenseTotal.toLocaleString(
        "vi-VN"
      )} VND) exceed budget cap (${budgetResult.totalBudgetVnd.toLocaleString("vi-VN")} VND).`
    );
    checks.push({
      name: "budget_cap",
      passed: false,
      details: `${initialExpenseTotal} > ${budgetResult.totalBudgetVnd}`
    });
    if (repairedResponse.generatedExpenses && repairedResponse.generatedExpenses.length > 0) {
      const scale = budgetResult.totalBudgetVnd / initialExpenseTotal;
      let running = 0;
      const scaled = repairedResponse.generatedExpenses.map((e, idx, arr) => {
        if (idx === arr.length - 1) {
          return { ...e, amount: Math.max(0, budgetResult.totalBudgetVnd - running) };
        }
        const nextAmt = Math.max(0, Math.floor(e.amount * scale / 1e3) * 1e3);
        running += nextAmt;
        return { ...e, amount: nextAmt };
      });
      repairedResponse.generatedExpenses = scaled;
      repairsApplied.push(
        `Scaled generatedExpenses to stay within ${budgetResult.totalBudgetVnd.toLocaleString("vi-VN")} VND.`
      );
    }
  } else {
    checks.push({
      name: "budget_cap",
      passed: true,
      details: `${initialExpenseTotal} <= ${budgetResult.totalBudgetVnd}`
    });
  }
  const originalDays = response.generatedDays || [];
  const overDistanceDays = [];
  originalDays.forEach((day, idx) => {
    const km = computeDayDistanceKm(day);
    if (km > distanceLimitKm) {
      overDistanceDays.push(`${day.day || `Day ${idx + 1}`} (${km} km)`);
    }
  });
  if (overDistanceDays.length > 0) {
    violations.push(
      `Daily route distance exceeds ${distanceLimitKm} km: ${overDistanceDays.join(", ")}.`
    );
    checks.push({
      name: "daily_distance_limit",
      passed: false,
      details: overDistanceDays.join("; ")
    });
  } else {
    checks.push({
      name: "daily_distance_limit",
      passed: true,
      details: `All days <= ${distanceLimitKm} km.`
    });
  }
  let prunedDistanceStops = false;
  for (const day of days) {
    while (day.slots.length > 1 && computeDayDistanceKm(day) > distanceLimitKm) {
      day.slots.pop();
      prunedDistanceStops = true;
    }
  }
  if (overDistanceDays.length > 0 || prunedDistanceStops) {
    repairsApplied.push(`Pruned long-distance detour stops to keep each day <= ${distanceLimitKm} km.`);
  }
  const textCorpus = [
    response.reply,
    response.itineraryMeta?.title || "",
    response.itineraryMeta?.stayMove || "",
    response.itineraryMeta?.routeTip || "",
    ...response.itineraryMeta?.tips || [],
    ...originalDays.flatMap((d) => [
      d.title,
      ...d.slots.flatMap((s) => [s.title, s.desc])
    ])
  ];
  const hasElephantViolation = textCorpus.some((t) => hasElephantRidingViolation(t));
  if (hasElephantViolation) {
    violations.push("Policy violation: elephant riding recommended instead of ethical observation.");
    checks.push({
      name: "ethical_elephant_policy",
      passed: false,
      details: "Detected elephant-riding phrasing."
    });
    repairedResponse.reply = sanitizeEthicalElephantText(repairedResponse.reply);
    if (repairedResponse.itineraryMeta) {
      repairedResponse.itineraryMeta.title = sanitizeEthicalElephantText(
        repairedResponse.itineraryMeta.title
      );
      repairedResponse.itineraryMeta.routeTip = sanitizeEthicalElephantText(
        repairedResponse.itineraryMeta.routeTip
      );
      repairedResponse.itineraryMeta.tips = repairedResponse.itineraryMeta.tips.map(
        sanitizeEthicalElephantText
      );
    }
    for (const day of days) {
      day.title = sanitizeEthicalElephantText(day.title);
      day.slots.forEach((slot) => {
        slot.title = sanitizeEthicalElephantText(slot.title);
        slot.desc = sanitizeEthicalElephantText(slot.desc);
      });
    }
    repairsApplied.push("Replaced elephant-riding references with ethical non-riding observation.");
  } else {
    checks.push({
      name: "ethical_elephant_policy",
      passed: true,
      details: "Complies with ethical elephant observation policy."
    });
  }
  const rawCitations = response.citations || [];
  const invalidCitations = rawCitations.filter(
    (c) => !isCitationUrlValid(c, budgetResult, purposeSelection, validPostSlugs)
  );
  if (invalidCitations.length > 0) {
    violations.push(
      `Invalid or hallucinated citation URL(s): ${invalidCitations.map((c) => c.url).join(", ")}`
    );
    checks.push({
      name: "valid_citation_urls",
      passed: false,
      details: `${invalidCitations.length} invalid citation(s)`
    });
    repairedResponse.citations = rawCitations.filter(
      (c) => isCitationUrlValid(c, budgetResult, purposeSelection, validPostSlugs)
    );
    repairsApplied.push(`Removed ${invalidCitations.length} ungrounded/invalid citation(s).`);
  } else {
    checks.push({
      name: "valid_citation_urls",
      passed: true,
      details: `${rawCitations.length} verified citation(s).`
    });
  }
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round(passedCount / checks.length * 100);
  const passed = violations.length === 0;
  const needsRetry = ungroundedTitles.length > 1 || overDistanceDays.length > 0 || hasElephantViolation;
  return {
    evalResult: {
      passed,
      score,
      violations,
      repairsApplied,
      checks
    },
    repairedResponse,
    needsRetry
  };
}
function evaluateQaOutput(input) {
  const { response, tavilySnippets, tavilyCitations, validPostSlugs } = input;
  const violations = [];
  const repairsApplied = [];
  const checks = [];
  const repairedResponse = {
    ...response,
    stopOperations: response.stopOperations ? [...response.stopOperations] : [],
    citations: response.citations ? response.citations.map((c) => ({ ...c })) : void 0
  };
  const rawReply = String(response.reply || "").trim();
  if (rawReply.length < 5) {
    violations.push("Q&A reply is empty or too short.");
    checks.push({
      name: "non_empty_reply",
      passed: false,
      details: `Reply length=${rawReply.length}`
    });
  } else {
    checks.push({
      name: "non_empty_reply",
      passed: true,
      details: `Reply length=${rawReply.length}`
    });
  }
  const hasElephantViolation = hasElephantRidingViolation(rawReply);
  if (hasElephantViolation) {
    violations.push("Policy violation: elephant riding recommended in Q&A reply.");
    checks.push({
      name: "ethical_elephant_policy",
      passed: false,
      details: "Detected elephant-riding phrasing in Q&A reply."
    });
    repairedResponse.reply = sanitizeEthicalElephantText(repairedResponse.reply);
    repairsApplied.push("Replaced elephant-riding references in Q&A reply with ethical observation.");
  } else {
    checks.push({
      name: "ethical_elephant_policy",
      passed: true,
      details: "Complies with ethical elephant observation policy."
    });
  }
  const mutatedItinerary = response.intent === "general_qa" && (Boolean(response.resetItineraryToTheme) || Boolean(response.shouldOpenPlanner) || Boolean(response.generatedDays && response.generatedDays.length > 0) || Boolean(response.stopOperations && response.stopOperations.length > 0));
  if (mutatedItinerary) {
    violations.push("general_qa response attempted to mutate or reset active itinerary.");
    checks.push({
      name: "no_unintended_itinerary_mutation",
      passed: false,
      details: "Detected planner mutation flags on general_qa response."
    });
    repairedResponse.resetItineraryToTheme = false;
    repairedResponse.shouldOpenPlanner = false;
    repairedResponse.generatedDays = void 0;
    repairedResponse.stopOperations = [];
    repairsApplied.push("Cleared itinerary mutation fields on general_qa response.");
  } else {
    checks.push({
      name: "no_unintended_itinerary_mutation",
      passed: true,
      details: "No unintended itinerary mutation."
    });
  }
  const allowedExternalUrls = [
    ...(tavilySnippets || []).map((s) => String(s.url || "").trim()).filter(Boolean),
    ...(tavilyCitations || []).map((c) => String(c.url || "").trim()).filter(Boolean)
  ];
  const rawCitations = response.citations || [];
  const invalidCitations = rawCitations.filter(
    (c) => !isCitationUrlValid(
      c,
      void 0,
      void 0,
      validPostSlugs,
      allowedExternalUrls.length > 0 ? allowedExternalUrls : void 0
    )
  );
  if (invalidCitations.length > 0) {
    violations.push(
      `Invalid or hallucinated Q&A citation URL(s): ${invalidCitations.map((c) => c.url).join(", ")}`
    );
    checks.push({
      name: "valid_citation_urls",
      passed: false,
      details: `${invalidCitations.length} invalid citation(s)`
    });
    repairedResponse.citations = rawCitations.filter(
      (c) => isCitationUrlValid(
        c,
        void 0,
        void 0,
        validPostSlugs,
        allowedExternalUrls.length > 0 ? allowedExternalUrls : void 0
      )
    );
    repairsApplied.push(`Removed ${invalidCitations.length} invalid Q&A citation(s).`);
  } else {
    checks.push({
      name: "valid_citation_urls",
      passed: true,
      details: `${rawCitations.length} verified citation(s).`
    });
  }
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round(passedCount / checks.length * 100);
  const passed = violations.length === 0;
  const needsRetry = rawReply.length < 5 || hasElephantViolation;
  return {
    evalResult: {
      passed,
      score,
      violations,
      repairsApplied,
      checks
    },
    repairedResponse,
    needsRetry
  };
}

// server/services/ai/tavilyService.ts
import { tavily } from "@tavily/core";
import {
  OpenInferenceSpanKind as OpenInferenceSpanKind2,
  TOOL_DESCRIPTION,
  TOOL_NAME,
  TOOL_PARAMETERS
} from "@arizeai/openinference-semantic-conventions";
var QA_CACHE_TTL_MS = 15 * 60 * 1e3;
var QA_CACHE_MAX_ENTRIES = 100;
var tavilyQaCache = /* @__PURE__ */ new Map();
var warnedMissingTavilyKey = false;
function foldVietnameseSearchText(input) {
  return String(input || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
function buildTavilyQaQuery(rawQuery) {
  const cleaned = String(rawQuery || "").trim();
  if (!cleaned) return "";
  const folded = foldVietnameseSearchText(cleaned);
  const hasProvinceOrCityAnchor = /(dak\s*lak|daklak|buon\s*ma\s*thuot|\bbmt\b|ban\s*me|tay\s*nguyen)/.test(folded);
  if (hasProvinceOrCityAnchor) {
    return cleaned;
  }
  const hasSubLocationAnchor = /(ho\s*lak|buon\s*jun|buon\s*le|buon\s*don|ban\s*don|dray\s*nur|dray\s*sap|yok\s*don|ea\s*kao|chu\s*yang\s*sin|kotam|ko\s*tam|tong\s*ju|ako\s*dhong|bao\s*tang\s*the\s*gioi\s*ca\s*phe|chu\s*dang\s*ya)/.test(
    folded
  );
  return hasSubLocationAnchor ? `${cleaned} \u0110\u1EAFk L\u1EAFk` : `${cleaned} \u0110\u1EAFk L\u1EAFk Bu\xF4n Ma Thu\u1ED9t`;
}
function extractVndPricesFromText(text) {
  const cleaned = String(text || "").replace(/\u00a0/g, " ");
  const amounts = [];
  const rangeRegex = /(\d{1,3}(?:[.,]\d{3})+|\d{4,8})\s*[-–~]\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,8})\s*(?:đồng|vnđ|vnd|đ|d)(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(rangeRegex)) {
    for (const group of [match[1], match[2]]) {
      const val = Number(group.replace(/[.,\s]/g, ""));
      if (Number.isFinite(val) && val >= 1e4 && val <= 1e7) {
        amounts.push(Math.round(val));
      }
    }
  }
  const fullNumberRegex = /(\d{1,3}(?:[.,\s]\d{3})+|\d{4,8})\s*(?:đồng|vnđ|vnd|đ|d)(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(fullNumberRegex)) {
    const rawNum = match[1].replace(/[.,\s]/g, "");
    const val = Number(rawNum);
    if (Number.isFinite(val) && val >= 1e4 && val <= 1e7) {
      amounts.push(Math.round(val));
    }
  }
  const kNumberRegex = /(\d{2,4})\s*k(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(kNumberRegex)) {
    const val = Number(match[1]) * 1e3;
    if (Number.isFinite(val) && val >= 1e4 && val <= 1e7) {
      amounts.push(Math.round(val));
    }
  }
  const millionRegex = /(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|million)(?=$|[^\p{L}\p{N}_])/giu;
  for (const match of cleaned.matchAll(millionRegex)) {
    const normalized = match[1].replace(",", ".");
    const val = Number(normalized) * 1e6;
    if (Number.isFinite(val) && val >= 1e5 && val <= 2e7) {
      amounts.push(Math.round(val));
    }
  }
  const uniqueSorted = Array.from(new Set(amounts)).sort((a, b) => a - b);
  const mentionsFree = /(?:^|[^\p{L}\p{N}_])(miễn phí|free entry|free admission|không mất vé)(?=$|[^\p{L}\p{N}_])/iu.test(
    cleaned
  );
  const mentionsExplicitFreeAdmission = /(miễn\s*phí\s*(?:vé|vào\s*cổng|tham\s*quan)|vé\s*(?:vào\s*cổng\s*)?miễn\s*phí|free\s+entry|free\s+admission|không\s+mất\s+vé)/iu.test(
    cleaned
  );
  const mentionsPaidTicketClause = /(?:giá\s*vé|vé\s*(?:vào\s*cổng|tham\s*quan|người\s*lớn|lẻ))\s*(?:là|:|khoảng|~)?\s*\d/iu.test(
    cleaned
  );
  if (uniqueSorted.length === 0) {
    return {
      amounts: [],
      ticketVnd: mentionsFree ? 0 : null,
      estimatedSpendVnd: null
    };
  }
  const isFreeAdmission = mentionsExplicitFreeAdmission && !mentionsPaidTicketClause;
  const ticketVnd = isFreeAdmission ? 0 : uniqueSorted[0];
  const estimatedSpendVnd = uniqueSorted.length > 1 ? uniqueSorted[Math.min(1, uniqueSorted.length - 1)] : uniqueSorted[0];
  return {
    amounts: uniqueSorted,
    ticketVnd,
    estimatedSpendVnd
  };
}
async function verifyTavilyPriceWithDecisionGate(placeTitle, snippets, extractedTicketVnd, fetchFn = fetch) {
  const decisionModel = GEMINI_DECISION_MODEL.trim();
  const apiKey = GEMINI_API_KEY.trim();
  if (!decisionModel || !apiKey || snippets.length === 0) {
    return {
      verified: true,
      reason: "deterministic-snippet-parsing",
      usedDecisionApi: false
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5e3);
  try {
    const inputSummary = [
      `Target place: ${placeTitle} (Dak Lak, Vietnam)`,
      `Parsed ticket VND: ${extractedTicketVnd ?? "none"}`,
      ...snippets.slice(0, 3).map((s, idx) => `[${idx + 1}] ${s.title} (${s.url}): ${s.content.slice(0, 400)}`)
    ].join("\n");
    const response = await fetchFn("https://generativelanguage.googleapis.com/v1beta/decisions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: decisionModel,
        input: inputSummary,
        questions: {
          is_relevant_place: {
            type: "noul",
            instructions: `Do the search snippets specifically describe "${placeTitle}" in Dak Lak, Vietnam?`
          },
          is_plausible_price: {
            type: "noul",
            instructions: "Is the parsed VND ticket/activity price plausible and consistent with the snippets (not an unrelated tour package or spam)?"
          }
        }
      })
    });
    if (!response.ok) {
      return {
        verified: true,
        reason: `decisions-api-http-${response.status}-fallback`,
        usedDecisionApi: false
      };
    }
    const data = await response.json();
    const relScore = data.answers?.is_relevant_place?.noul;
    const priceScore = data.answers?.is_plausible_price?.noul;
    if (typeof relScore === "number" && typeof priceScore === "number") {
      const verified = relScore >= 0.5 && priceScore >= 0.5;
      return {
        verified,
        reason: `gemini-decisions(rel=${relScore.toFixed(2)},price=${priceScore.toFixed(2)})`,
        usedDecisionApi: true
      };
    }
    return {
      verified: true,
      reason: "decisions-api-malformed-fallback",
      usedDecisionApi: false
    };
  } catch {
    return {
      verified: true,
      reason: "decisions-api-error-fallback",
      usedDecisionApi: false
    };
  } finally {
    clearTimeout(timer);
  }
}
async function searchPlacePriceWithTavily(placeTitle, areaCluster, options) {
  const apiKey = getTavilyApiKey();
  if (!apiKey && !options?.tavilyClient) {
    return null;
  }
  const query = `gi\xE1 v\xE9 tham quan ${placeTitle} ${areaCluster} \u0110\u1EAFk L\u1EAFk m\u1EDBi nh\u1EA5t VND`;
  const toolParamsSchema = JSON.stringify({
    type: "object",
    properties: {
      query: { type: "string" },
      placeTitle: { type: "string" },
      areaCluster: { type: "string" }
    },
    required: ["query", "placeTitle"]
  });
  return withOpenInferenceSpan(
    "tavily_search",
    {
      kind: OpenInferenceSpanKind2.TOOL,
      input: { query, placeTitle, areaCluster },
      attributes: {
        [TOOL_NAME]: "tavily_search",
        [TOOL_DESCRIPTION]: "Search real-time attraction ticket prices and local travel expenses in Dak Lak via Tavily.",
        [TOOL_PARAMETERS]: toolParamsSchema
      },
      formatOutput: (res) => res ? {
        placeTitle: res.placeTitle,
        ticketVnd: res.ticketVnd,
        estimatedSpendVnd: res.estimatedSpendVnd,
        sourceUrl: res.sourceUrl,
        verified: res.verified
      } : { result: null }
    },
    async () => {
      let timer;
      try {
        const client = options?.tavilyClient || tavily({ apiKey });
        const timeoutMs = options?.timeoutMs ?? TAVILY_TIMEOUT_MS;
        const TIMEOUT_SENTINEL = /* @__PURE__ */ Symbol("tavily_price_timeout");
        const timeoutPromise = new Promise((resolve) => {
          timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
        });
        const searchParams = {
          searchDepth: TAVILY_SEARCH_DEPTH,
          maxResults: 4,
          includeAnswer: TAVILY_INCLUDE_ANSWER,
          ...TAVILY_COUNTRY ? { country: TAVILY_COUNTRY } : {},
          timeout: Math.max(2, Math.ceil(timeoutMs / 1e3))
        };
        const response = await Promise.race([
          client.search(query, searchParams),
          timeoutPromise
        ]);
        if (response === TIMEOUT_SENTINEL || !response) {
          if (response === TIMEOUT_SENTINEL) {
            console.warn(`[Tavily Service] Price lookup timed out after ${timeoutMs}ms for "${placeTitle}".`);
          }
          return null;
        }
        const results = Array.isArray(response?.results) ? response.results : [];
        const snippets = results.filter((r) => typeof r?.url === "string" && r.url.startsWith("http")).map((r) => ({
          title: String(r.title || placeTitle).trim(),
          url: String(r.url).trim(),
          content: String(r.content || "").trim()
        }));
        const combinedText = [
          typeof response?.answer === "string" ? response.answer : "",
          ...snippets.map((s) => `${s.title} ${s.content}`)
        ].filter(Boolean).join("\n");
        if (!combinedText.trim() && snippets.length === 0) {
          return null;
        }
        const parsed = extractVndPricesFromText(combinedText);
        const gate = await withOpenInferenceSpan(
          "gemini_decisions_price_gate",
          {
            kind: OpenInferenceSpanKind2.GUARDRAIL,
            input: { placeTitle, parsedTicketVnd: parsed.ticketVnd, snippetCount: snippets.length }
          },
          () => verifyTavilyPriceWithDecisionGate(
            placeTitle,
            snippets,
            parsed.ticketVnd,
            options?.fetchFn
          )
        );
        if (!gate.verified) {
          return null;
        }
        const fallbackTicket = options?.fallbackTicketVnd ?? 0;
        const fallbackSpend = options?.fallbackEstimatedSpendVnd ?? Math.max(fallbackTicket, 1e5);
        const ticketVnd = parsed.ticketVnd !== null ? parsed.ticketVnd : fallbackTicket;
        const estimatedSpendVnd = parsed.estimatedSpendVnd !== null ? Math.max(ticketVnd, parsed.estimatedSpendVnd) : Math.max(ticketVnd, fallbackSpend);
        const primarySnippet = snippets[0];
        const citations = snippets.slice(0, 2).map((s) => ({
          title: s.title,
          url: s.url,
          snippet: s.content.slice(0, 180),
          source: "tavily"
        }));
        return {
          placeTitle,
          ticketVnd,
          estimatedSpendVnd,
          priceNote: parsed.ticketVnd !== null ? `C\u1EADp nh\u1EADt t\u1EEB Tavily (${gate.reason})` : `Tham chi\u1EBFu Tavily kh\xF4ng c\xF3 v\xE9 c\u1EE5 th\u1EC3, gi\u1EEF m\u1EE9c \u01B0\u1EDBc t\xEDnh (${gate.reason})`,
          sourceUrl: primarySnippet?.url || "",
          citations,
          verified: gate.verified,
          usedDecisionApi: gate.usedDecisionApi
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown Tavily error";
        console.warn(`[Tavily Service] Lookup failed for "${placeTitle}":`, msg);
        return null;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  );
}
async function searchGeneralQaWithTavily(queryText, options) {
  const searchQuery = buildTavilyQaQuery(queryText);
  if (options?.enableTavily === false) {
    return {
      query: searchQuery,
      snippets: [],
      citations: [],
      status: "disabled"
    };
  }
  if (!searchQuery) {
    return {
      query: "",
      snippets: [],
      citations: [],
      status: "empty_query"
    };
  }
  const apiKey = getTavilyApiKey();
  if (!apiKey && !options?.tavilyClient) {
    if (!warnedMissingTavilyKey) {
      warnedMissingTavilyKey = true;
      console.warn(
        "[Tavily Service] TAVILY_API_KEY is empty \u2014 live web search skipped (set TAVILY_API_KEY in .env or .env.local)."
      );
    }
    return {
      query: searchQuery,
      snippets: [],
      citations: [],
      status: "missing_api_key",
      error: "TAVILY_API_KEY is not configured"
    };
  }
  const cacheKey = searchQuery.toLowerCase();
  const useCache = !options?.tavilyClient && !options?.bypassCache;
  if (useCache) {
    const cached = tavilyQaCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data, fromCache: true };
    }
    if (cached) {
      tavilyQaCache.delete(cacheKey);
    }
  }
  const timeoutMs = options?.timeoutMs ?? TAVILY_TIMEOUT_MS;
  const maxResults = options?.maxResults ?? TAVILY_MAX_RESULTS;
  const searchOptions = {
    searchDepth: TAVILY_SEARCH_DEPTH,
    maxResults,
    includeAnswer: TAVILY_INCLUDE_ANSWER,
    ...TAVILY_COUNTRY ? { country: TAVILY_COUNTRY } : {},
    timeout: Math.max(2, Math.ceil(timeoutMs / 1e3))
  };
  const toolParamsSchema = JSON.stringify({
    type: "object",
    properties: {
      query: { type: "string" },
      searchDepth: { type: "string" },
      includeAnswer: { type: ["boolean", "string"] },
      maxResults: { type: "number" },
      country: { type: "string" },
      timeoutMs: { type: "number" }
    },
    required: ["query"]
  });
  return withOpenInferenceSpan(
    "tavily_qa_search",
    {
      kind: OpenInferenceSpanKind2.TOOL,
      input: {
        query: searchQuery,
        rawQuery: queryText,
        ...searchOptions,
        timeoutMs
      },
      attributes: {
        [TOOL_NAME]: "tavily_qa_search",
        [TOOL_DESCRIPTION]: "Search live web knowledge and external information for Dak Lak travel Q&A via Tavily.",
        [TOOL_PARAMETERS]: toolParamsSchema
      },
      formatOutput: (res) => ({
        query: res.query,
        status: res.status || "ok",
        ...res.error ? { error: res.error } : {},
        hasAnswer: Boolean(res.answer),
        snippetCount: res.snippets.length,
        citationUrls: res.citations.map((c) => c.url)
      })
    },
    async () => {
      let timer;
      try {
        const client = options?.tavilyClient || tavily({ apiKey });
        const TIMEOUT_SENTINEL = /* @__PURE__ */ Symbol("tavily_qa_timeout");
        const timeoutPromise = new Promise((resolve) => {
          timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), timeoutMs);
        });
        const response = await Promise.race([
          client.search(searchQuery, searchOptions),
          timeoutPromise
        ]);
        if (response === TIMEOUT_SENTINEL) {
          console.warn(`[Tavily Service] Q&A search timed out after ${timeoutMs}ms for "${searchQuery}".`);
          return {
            query: searchQuery,
            snippets: [],
            citations: [],
            status: "timeout",
            error: `Tavily request timed out after ${timeoutMs}ms`
          };
        }
        if (!response) {
          return {
            query: searchQuery,
            snippets: [],
            citations: [],
            status: "no_results"
          };
        }
        const answer = typeof response.answer === "string" && response.answer.trim() ? response.answer.trim() : void 0;
        const rawResults = Array.isArray(response.results) ? response.results : [];
        const snippets = rawResults.filter((r) => typeof r?.url === "string" && r.url.startsWith("http")).slice(0, maxResults).map((r) => ({
          title: String(r.title || "Tavily Reference").trim(),
          url: String(r.url).trim(),
          content: String(r.content || "").trim().slice(0, 500)
        }));
        const citations = snippets.slice(0, 3).map((s) => ({
          title: s.title,
          url: s.url,
          snippet: s.content.slice(0, 180),
          source: "tavily"
        }));
        const status = answer || snippets.length > 0 ? "ok" : "no_results";
        const lookupResult = {
          query: searchQuery,
          ...answer ? { answer } : {},
          snippets,
          citations,
          status
        };
        if (useCache && (answer || snippets.length > 0)) {
          if (tavilyQaCache.size >= QA_CACHE_MAX_ENTRIES) {
            const oldestKey = tavilyQaCache.keys().next().value;
            if (oldestKey) tavilyQaCache.delete(oldestKey);
          }
          tavilyQaCache.set(cacheKey, {
            expiresAt: Date.now() + QA_CACHE_TTL_MS,
            data: lookupResult
          });
        }
        return lookupResult;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown Tavily Q&A error";
        console.warn(`[Tavily Service] Q&A search failed for "${searchQuery}":`, msg);
        return {
          query: searchQuery,
          snippets: [],
          citations: [],
          status: "api_error",
          error: msg
        };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  );
}

// server/services/ai/workflow/followUpRouter.ts
import {
  LLM_MODEL_NAME as LLM_MODEL_NAME2,
  LLM_PROVIDER as LLM_PROVIDER2,
  LLM_SYSTEM as LLM_SYSTEM2,
  LLM_TOKEN_COUNT_COMPLETION as LLM_TOKEN_COUNT_COMPLETION2,
  LLM_TOKEN_COUNT_PROMPT as LLM_TOKEN_COUNT_PROMPT2,
  LLM_TOKEN_COUNT_TOTAL as LLM_TOKEN_COUNT_TOTAL2,
  OpenInferenceSpanKind as OpenInferenceSpanKind4,
  SemanticConventions as SemanticConventions3
} from "@arizeai/openinference-semantic-conventions";

// server/services/ai/plannerDataService.ts
var PLACE_PLANNER_METADATA = {
  "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA": {
    areaCluster: "BMT",
    themeTags: ["coffee", "culture"],
    defaultTicketVnd: 15e4,
    defaultEstimatedSpendVnd: 22e4
  },
  "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn": {
    areaCluster: "BMT",
    themeTags: ["coffee", "cuisine"],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 12e4
  },
  "Bu\xF4n c\u1ED5 Ako Dh\xF4ng": {
    areaCluster: "BMT",
    themeTags: ["culture", "coffee", "cuisine"],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 1e5
  },
  "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk": {
    areaCluster: "BMT",
    themeTags: ["culture"],
    defaultTicketVnd: 3e4,
    defaultEstimatedSpendVnd: 5e4
  },
  "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n": {
    areaCluster: "Kr\xF4ng N\u0103ng",
    themeTags: ["coffee", "nature"],
    defaultTicketVnd: 12e4,
    defaultEstimatedSpendVnd: 25e4
  },
  "\u0110\xE1 Voi M\u1EB9 Yang Tao": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    themeTags: ["nature", "culture"],
    defaultTicketVnd: 2e4,
    defaultEstimatedSpendVnd: 4e4
  },
  "H\u1ED3 L\u1EAFk & Bu\xF4n Jun": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    themeTags: ["nature", "culture", "coffee"],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 22e4
  },
  "\u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i": {
    areaCluster: "H\u1ED3 L\u1EAFk",
    themeTags: ["culture", "coffee"],
    defaultTicketVnd: 3e4,
    defaultEstimatedSpendVnd: 6e4
  },
  "Th\xE1c Dray Nur H\xF9ng V\u0129": {
    areaCluster: "Dray Nur",
    themeTags: ["nature"],
    defaultTicketVnd: 4e4,
    defaultEstimatedSpendVnd: 1e5
  },
  "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n": {
    areaCluster: "Bu\xF4n \u0110\xF4n",
    themeTags: ["nature"],
    defaultTicketVnd: 6e4,
    defaultEstimatedSpendVnd: 85e4
  },
  "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m T\u01A1ng J\xFA": {
    areaCluster: "Ea Kao",
    themeTags: ["culture"],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 15e4
  },
  "Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t": {
    areaCluster: "BMT",
    themeTags: ["cuisine", "coffee"],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 15e4
  },
  "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n": {
    areaCluster: "Bu\xF4n \u0110\xF4n",
    themeTags: ["culture", "nature", "cuisine"],
    defaultTicketVnd: 5e4,
    defaultEstimatedSpendVnd: 18e4
  }
};
function safeJsonArray(raw, fallback) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "string") return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
function inferPlaceMetadata(place) {
  const known = PLACE_PLANNER_METADATA[place.title];
  if (known) return known;
  const hay = `${place.title} ${place.location} ${place.category}`.toLowerCase();
  let areaCluster = "BMT";
  if (hay.includes("h\u1ED3 l\u1EAFk") || hay.includes("yang tao") || hay.includes("li\xEAn s\u01A1n")) {
    areaCluster = "H\u1ED3 L\u1EAFk";
  } else if (hay.includes("dray nur") || hay.includes("kr\xF4ng ana")) {
    areaCluster = "Dray Nur";
  } else if (hay.includes("yok \u0111\xF4n") || hay.includes("b\u1EA3n \u0111\xF4n") || hay.includes("bu\xF4n \u0111\xF4n")) {
    areaCluster = "Bu\xF4n \u0110\xF4n";
  } else if (hay.includes("kr\xF4ng n\u0103ng") || hay.includes("ea t\xE2n")) {
    areaCluster = "Kr\xF4ng N\u0103ng";
  } else if (hay.includes("ea kao") || hay.includes("t\u01A1ng j\xFA")) {
    areaCluster = "Ea Kao";
  }
  const themeTags = [];
  if (hay.includes("c\xE0 ph\xEA") || hay.includes("coffee")) themeTags.push("coffee");
  if (hay.includes("v\u0103n h\xF3a") || hay.includes("b\u1EA3o t\xE0ng") || hay.includes("bu\xF4n") || hay.includes("th\u1ED5 c\u1EA9m")) {
    themeTags.push("culture");
  }
  if (hay.includes("th\xE1c") || hay.includes("v\u01B0\u1EDDn qu\u1ED1c gia") || hay.includes("h\u1ED3") || hay.includes("\u0111\xE1 voi")) {
    themeTags.push("nature");
  }
  if (hay.includes("\u1EA9m th\u1EF1c") || hay.includes("ph\u1ED1")) themeTags.push("cuisine");
  if (themeTags.length === 0) themeTags.push("culture");
  return {
    areaCluster,
    themeTags,
    defaultTicketVnd: 3e4,
    defaultEstimatedSpendVnd: 12e4
  };
}
async function listActiveStays(filters) {
  let rows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("stays").select("*").eq("is_active", true).order("nightly_rate_vnd", { ascending: true }).order("id", { ascending: true });
    if (error) throw new Error(`Supabase listActiveStays failed: ${error.message}`);
    rows = data || [];
  } else {
    const db = getDb();
    rows = db.prepare("SELECT * FROM stays WHERE is_active = 1 ORDER BY nightly_rate_vnd ASC, id ASC").all();
  }
  let records = rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    area: row.area,
    tier: row.tier,
    nightlyRateVnd: row.nightly_rate_vnd,
    capacityMin: row.capacity_min,
    capacityMax: row.capacity_max,
    suitableFor: safeJsonArray(row.suitable_for_json, []),
    amenities: safeJsonArray(row.amenities_json, []),
    isActive: row.is_active === true || row.is_active === 1,
    sourceNote: row.source_note || void 0,
    updatedAt: row.updated_at
  }));
  if (filters?.tier) {
    records = records.filter((r) => r.tier === filters.tier);
  }
  if (filters?.area) {
    const areaLower = filters.area.toLowerCase();
    records = records.filter((r) => r.area.toLowerCase().includes(areaLower));
  }
  let exceedsSingleUnitCapacity = false;
  if (typeof filters?.travelersCount === "number" && filters.travelersCount > 0) {
    const count = filters.travelersCount;
    const capacityMatched = records.filter(
      (r) => count >= r.capacityMin && count <= r.capacityMax
    );
    if (capacityMatched.length > 0) {
      records = capacityMatched;
    } else {
      exceedsSingleUnitCapacity = true;
    }
  }
  if (filters?.companionType || exceedsSingleUnitCapacity) {
    const comp = filters?.companionType;
    records.sort((a, b) => {
      if (comp) {
        const aFit = a.suitableFor.includes(comp) ? 1 : 0;
        const bFit = b.suitableFor.includes(comp) ? 1 : 0;
        if (bFit !== aFit) return bFit - aFit;
      }
      if (exceedsSingleUnitCapacity && b.capacityMax !== a.capacityMax) {
        return b.capacityMax - a.capacityMax;
      }
      return a.nightlyRateVnd - b.nightlyRateVnd;
    });
  }
  return records;
}
async function listActiveLogistics(filters) {
  let rows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("logistics").select("*").eq("is_active", true).order("daily_rate_vnd", { ascending: true }).order("id", { ascending: true });
    if (error) throw new Error(`Supabase listActiveLogistics failed: ${error.message}`);
    rows = data || [];
  } else {
    const db = getDb();
    rows = db.prepare("SELECT * FROM logistics WHERE is_active = 1 ORDER BY daily_rate_vnd ASC, id ASC").all();
  }
  let records = rows.map((row) => ({
    id: Number(row.id),
    mode: row.mode,
    label: row.label,
    tier: row.tier,
    dailyRateVnd: row.daily_rate_vnd,
    capacityMin: row.capacity_min,
    capacityMax: row.capacity_max,
    suitableFor: safeJsonArray(row.suitable_for_json, []),
    notes: row.notes || "",
    isActive: row.is_active === true || row.is_active === 1,
    updatedAt: row.updated_at
  }));
  if (filters?.tier) {
    records = records.filter((r) => r.tier === filters.tier);
  }
  let exceedsSingleVehicleCapacity = false;
  if (typeof filters?.travelersCount === "number" && filters.travelersCount > 0) {
    const count = filters.travelersCount;
    const capacityMatched = records.filter(
      (r) => count >= r.capacityMin && count <= r.capacityMax
    );
    if (capacityMatched.length > 0) {
      records = capacityMatched;
    } else {
      exceedsSingleVehicleCapacity = true;
      if (count > 2) {
        const largerVehicles = records.filter((r) => r.capacityMax > 2);
        if (largerVehicles.length > 0) {
          records = largerVehicles;
        }
      }
    }
  }
  if (filters?.companionType || exceedsSingleVehicleCapacity) {
    const comp = filters?.companionType;
    records.sort((a, b) => {
      if (exceedsSingleVehicleCapacity && b.capacityMax !== a.capacityMax) {
        return b.capacityMax - a.capacityMax;
      }
      if (comp) {
        const aFit = a.suitableFor.includes(comp) ? 1 : 0;
        const bFit = b.suitableFor.includes(comp) ? 1 : 0;
        if (bFit !== aFit) return bFit - aFit;
      }
      return a.dailyRateVnd - b.dailyRateVnd;
    });
  }
  return records;
}
async function upsertPlacePrice(input) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const fetchedAt = input.fetchedAt || now;
  const ticketVnd = Math.max(0, Math.round(input.ticketVnd));
  const estimatedSpendVnd = Math.max(ticketVnd, Math.round(input.estimatedSpendVnd));
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("place_prices").upsert(
      {
        place_title: input.placeTitle.trim(),
        area_cluster: input.areaCluster.trim(),
        ticket_vnd: ticketVnd,
        estimated_spend_vnd: estimatedSpendVnd,
        price_source: input.priceSource,
        price_note: (input.priceNote || "").trim(),
        source_url: (input.sourceUrl || "").trim(),
        fetched_at: fetchedAt,
        updated_at: now
      },
      { onConflict: "place_title" }
    );
    if (error) throw new Error(`Supabase upsertPlacePrice failed: ${error.message}`);
    return;
  }
  const db = getDb();
  db.prepare(
    `INSERT INTO place_prices (
      place_title, area_cluster, ticket_vnd, estimated_spend_vnd,
      price_source, price_note, source_url, fetched_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(place_title) DO UPDATE SET
      area_cluster = excluded.area_cluster,
      ticket_vnd = excluded.ticket_vnd,
      estimated_spend_vnd = excluded.estimated_spend_vnd,
      price_source = excluded.price_source,
      price_note = excluded.price_note,
      source_url = excluded.source_url,
      fetched_at = excluded.fetched_at,
      updated_at = excluded.updated_at`
  ).run(
    input.placeTitle.trim(),
    input.areaCluster.trim(),
    ticketVnd,
    estimatedSpendVnd,
    input.priceSource,
    (input.priceNote || "").trim(),
    (input.sourceUrl || "").trim(),
    fetchedAt,
    now
  );
}
function isPriceTimestampStale(fetchedAt, ttlHours = AI_PRICE_TTL_HOURS, nowMs = Date.now()) {
  if (!fetchedAt) return true;
  const parsed = Date.parse(fetchedAt);
  if (!Number.isFinite(parsed)) return true;
  const ageMs = nowMs - parsed;
  return ageMs > ttlHours * 60 * 60 * 1e3;
}
async function listEnrichedPlaces(ttlHours = AI_PRICE_TTL_HOURS, nowMs = Date.now()) {
  let rows;
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("place_prices").select("*");
    if (error) throw new Error(`Supabase listEnrichedPlaces failed: ${error.message}`);
    rows = data || [];
  } else {
    const db = getDb();
    rows = db.prepare("SELECT * FROM place_prices").all();
  }
  const byTitle = /* @__PURE__ */ new Map();
  for (const row of rows) {
    byTitle.set(row.place_title.trim().toLowerCase(), row);
  }
  return dakLakPlaceDirectory.map((place) => {
    const plannerMeta = inferPlaceMetadata(place);
    const cached = byTitle.get(place.title.trim().toLowerCase());
    const fetchedAt = cached?.fetched_at || "";
    const isStale = !cached || isPriceTimestampStale(fetchedAt, ttlHours, nowMs);
    return {
      title: place.title,
      location: place.location,
      areaCluster: cached?.area_cluster || plannerMeta.areaCluster,
      themeTags: plannerMeta.themeTags,
      ticketVnd: cached ? cached.ticket_vnd : plannerMeta.defaultTicketVnd,
      estimatedSpendVnd: cached ? cached.estimated_spend_vnd : plannerMeta.defaultEstimatedSpendVnd,
      priceSource: cached ? cached.price_source : "estimated",
      priceNote: cached?.price_note || void 0,
      sourceUrl: cached?.source_url || void 0,
      fetchedAt: fetchedAt || new Date(nowMs).toISOString(),
      isStale,
      meta: place
    };
  });
}

// server/services/ai/workflow/phase1Intake.ts
import {
  LLM_MODEL_NAME,
  LLM_PROVIDER,
  LLM_SYSTEM,
  LLM_TOKEN_COUNT_COMPLETION,
  LLM_TOKEN_COUNT_PROMPT,
  LLM_TOKEN_COUNT_TOTAL,
  OpenInferenceSpanKind as OpenInferenceSpanKind3,
  SemanticConventions as SemanticConventions2
} from "@arizeai/openinference-semantic-conventions";

// src/data/seasons.ts
var seasonsData = [
  {
    milestone: "01 | Th\xE1ng 1 \u2013 Th\xE1ng 3",
    shortTimelineTitle: "Hoa c\xE0 ph\xEA tr\u1EAFng & L\u1EC5 h\u1ED9i",
    headline: "M\xF9a Xu\xE2n",
    subheadline: "M\xF9a hoa c\xE0 ph\xEA tr\u1EAFng & L\u1EC5 h\u1ED9i c\u1ED3ng chi\xEAng",
    description: "Ti\u1EBFt tr\u1EDDi se l\u1EA1nh kh\xF4 r\xE1o, c\u1EA3 cao nguy\xEAn b\u1EEBng t\u1EC9nh d\u01B0\u1EDBi s\u1EAFc hoa c\xE0 ph\xEA tr\u1EAFng mu\u1ED1t nh\u01B0 tuy\u1EBFt v\xE0 kh\xF4ng kh\xED l\u1EC5 h\u1ED9i r\u1ED9n r\xE0ng kh\u1EAFp c\xE1c bu\xF4n l\xE0ng.",
    cta: "L\xEAn k\u1EBF ho\u1EA1ch m\xF9a hoa c\xE0 ph\xEA",
    caption: "Th\u01B0\u1EDBc phim: Hoa c\xE0 ph\xEA bung n\u1EDF tr\u1EAFng cao nguy\xEAn",
    plannerTheme: "coffee",
    videoId: "A5ddpVRjkuc",
    videoStart: 1700,
    videoEnd: 1710,
    palette: { top: "#163022", mid: "#2D4B38", bottom: "#4D3826", accent: "#FFFFFF" }
  },
  {
    milestone: "02 | Th\xE1ng 4 \u2013 Th\xE1ng 6",
    shortTimelineTitle: "N\u1EAFng v\xE0ng & H\u1ED3 L\u1EAFk",
    headline: "M\xF9a H\u1EA1",
    subheadline: "N\u1EAFng v\xE0ng r\u1EF1c r\u1EE1 & S\u1EE9c s\u1ED1ng \u0111\u1EA1i ng\xE0n",
    description: "N\u1EAFng cao nguy\xEAn chan h\xF2a, s\u1EAFc hoa mu\u1ED3ng v\xE0ng r\u1EF1c r\u1EE1 tr\xEAn nh\u1EEFng cung \u0111\u01B0\u1EDDng \u0111\u1EA5t \u0111\u1ECF, l\xFD t\u01B0\u1EDFng \u0111\u1EC3 kh\xE1m ph\xE1 h\u1ED3 L\u1EAFk v\xE0 c\xE1c ho\u1EA1t \u0111\u1ED9ng ngo\xE0i tr\u1EDDi.",
    cta: "Kh\xE1m ph\xE1 cung \u0111\u01B0\u1EDDng n\u1EAFng cao nguy\xEAn",
    caption: "Th\u01B0\u1EDBc phim: N\u1EAFng v\xE0ng tr\xEAn m\u1EB7t g\u01B0\u01A1ng H\u1ED3 L\u1EAFk",
    plannerTheme: "coffee",
    videoId: "aeE9yVUTRTg",
    videoStart: 10,
    videoEnd: null,
    palette: { top: "#183629", mid: "#3B5934", bottom: "#8F5B24", accent: "#F4C44E" }
  },
  {
    milestone: "03 | Th\xE1ng 7 \u2013 Th\xE1ng 9",
    shortTimelineTitle: "M\u01B0a r\u1EEBng & Th\xE1c Dray Nur",
    headline: "M\xF9a Thu",
    subheadline: "M\xF9a m\u01B0a r\u1EEBng & Nh\u1EEFng ng\u1ECDn th\xE1c h\xF9ng v\u0129",
    description: "Nh\u1EEFng c\u01A1n m\u01B0a t\u01B0\u1EDBi m\xE1t \u0111\u1EA1i ng\xE0n, \u0111\xE1nh th\u1EE9c v\u1EBB \u0111\u1EB9p cu\u1ED3n cu\u1ED9n tung b\u1ECDt tr\u1EAFng x\xF3a c\u1EE7a th\xE1c Dray Nur, Dray S\xE1p gi\u1EEFa r\u1EEBng kh\u1ED9p xanh m\u01B0\u1EDBt.",
    cta: "S\u0103n m\xF9a th\xE1c \u0111\u1ED5 Dray Nur",
    caption: "Th\u01B0\u1EDBc phim: Th\xE1c Dray Nur cu\u1ED3n cu\u1ED9n gi\u1EEFa r\u1EEBng xanh",
    plannerTheme: "nature",
    videoId: "7oUAJJW8Blo",
    videoStart: 10,
    videoEnd: null,
    palette: { top: "#0D2118", mid: "#1B4332", bottom: "#274C43", accent: "#D8F3DC" }
  },
  {
    milestone: "04 | Th\xE1ng 10 \u2013 Th\xE1ng 12",
    shortTimelineTitle: "D\xE3 qu\u1EF3 & Thu ho\u1EA1ch c\xE0 ph\xEA",
    headline: "M\xF9a \u0110\xF4ng",
    subheadline: "M\xF9a d\xE3 qu\u1EF3 v\xE0ng & Thu ho\u1EA1ch c\xE0 ph\xEA",
    description: "N\u1EAFng hanh v\xE0ng d\u1ECBu nh\u1EB9, hoa d\xE3 qu\u1EF3 nhu\u1ED9m v\xE0ng tri\u1EC1n \u0111\u1ED3i h\xF2a c\xF9ng nh\u1ECBp s\u1ED1ng r\u1ED9n r\xE3 c\u1EE7a m\xF9a thu ho\u1EA1ch nh\u1EEFng tr\xE1i c\xE0 ph\xEA ch\xEDn \u0111\u1ECF.",
    cta: "\u0110\xF3n m\xF9a d\xE3 qu\u1EF3 & thu ho\u1EA1ch",
    caption: "Th\u01B0\u1EDBc phim: D\xE3 qu\u1EF3 v\xE0ng & M\xF9a h\xE1i c\xE0 ph\xEA ch\xEDn \u0111\u1ECF",
    plannerTheme: "coffee",
    videoId: "hSbKX-mcgmU",
    videoStart: 50,
    videoEnd: 55,
    palette: { top: "#231912", mid: "#4A2B18", bottom: "#7C361D", accent: "#EAB308" }
  }
];

// server/services/ai/workflow/phase2Capacity.ts
function resolveDayCount(duration) {
  if (duration === "2N1D") return 2;
  if (duration === "4N3D+") return 4;
  return 3;
}
function resolveSeasonFromDates(travelDates, rawGoal) {
  const combined = `${travelDates || ""} ${rawGoal || ""}`.toLowerCase();
  let month = null;
  const viMonth = combined.match(/tháng\s*(1[0-2]|[1-9])\b/i);
  const slashDate = combined.match(/\b\d{1,2}\/(1[0-2]|[1-9])(?:\/\d{2,4})?\b/);
  if (viMonth) {
    month = Number(viMonth[1]);
  } else if (slashDate) {
    month = Number(slashDate[1]);
  } else if (/\b(jan|january|feb|february|mar|march)\b/i.test(combined)) {
    month = 2;
  } else if (/\b(apr|april|may|jun|june)\b/i.test(combined)) {
    month = 5;
  } else if (/\b(jul|july|aug|august|sep|sept|september)\b/i.test(combined)) {
    month = 8;
  } else if (/\b(oct|october|nov|november|dec|december)\b/i.test(combined)) {
    month = 12;
  } else if (/(hoa cà phê|mùa xuân|tết|cồng chiêng)/i.test(combined)) {
    month = 2;
  } else if (/(mùa hạ|nắng vàng)/i.test(combined)) {
    month = 5;
  } else if (/(mùa mưa|mùa thu|thác đổ|thác nước)/i.test(combined)) {
    month = 8;
  } else if (/(dã quỳ|thu hoạch|mùa đông|cuối năm)/i.test(combined)) {
    month = 11;
  }
  if (month !== null) {
    if (month >= 1 && month <= 3) return seasonsData[0];
    if (month >= 4 && month <= 6) return seasonsData[1];
    if (month >= 7 && month <= 9) return seasonsData[2];
    return seasonsData[3];
  }
  const currentMonth = (/* @__PURE__ */ new Date()).getMonth() + 1;
  if (currentMonth <= 3) return seasonsData[0];
  if (currentMonth <= 6) return seasonsData[1];
  if (currentMonth <= 9) return seasonsData[2];
  return seasonsData[3];
}
function computePacing(dayCount, companionType) {
  if (companionType === "family") {
    const maxStopsTotal2 = dayCount <= 2 ? 4 : dayCount === 3 ? 6 : 8;
    return { maxStopsPerDay: 2, maxStopsTotal: maxStopsTotal2 };
  }
  if (companionType === "solo") {
    const maxStopsTotal2 = dayCount <= 2 ? 5 : dayCount === 3 ? 9 : 11;
    return { maxStopsPerDay: 3, maxStopsTotal: maxStopsTotal2 };
  }
  const maxStopsTotal = dayCount <= 2 ? 5 : dayCount === 3 ? 8 : 10;
  return { maxStopsPerDay: 3, maxStopsTotal };
}
async function runPhase2Capacity(intake, overrides) {
  const isEn = overrides?.lang === "en";
  const dayCount = resolveDayCount(intake.duration);
  const companionType = intake.companionType || "couple";
  const travelersCount = intake.travelersCount && intake.travelersCount > 0 ? intake.travelersCount : companionType === "solo" ? 1 : companionType === "couple" ? 2 : 4;
  const season = resolveSeasonFromDates(intake.travelDates, intake.rawUserGoal);
  const { maxStopsPerDay, maxStopsTotal } = computePacing(dayCount, companionType);
  const maxDailyDistanceKm = 120;
  const estimatedBudgetVnd = intake.totalBudgetVnd && intake.totalBudgetVnd > 0 ? intake.totalBudgetVnd : budgetMultipliers[intake.budgetTier].perDay * dayCount * travelersCount;
  const nights = Math.max(1, dayCount - 1);
  const lodgingCapVnd = estimatedBudgetVnd * AI_PRICE_POLICY.lodgingShareCapPct / 100;
  const transitCapVnd = estimatedBudgetVnd * AI_PRICE_POLICY.transitShareCapPct / 100;
  const allStays = overrides?.stays ?? await listActiveStays({ travelersCount, companionType });
  const allLogistics = overrides?.logistics ?? await listActiveLogistics({ travelersCount, companionType });
  const notes = [];
  const stayMatchesBudget = allStays.filter((stay) => {
    const rooms = Math.max(1, Math.ceil(travelersCount / Math.max(1, stay.capacityMax)));
    return stay.nightlyRateVnd * nights * rooms <= lodgingCapVnd;
  });
  const recommendedStays = stayMatchesBudget.length > 0 ? stayMatchesBudget : allStays.slice(0, 1);
  if (stayMatchesBudget.length === 0 && recommendedStays.length > 0) {
    notes.push(
      isEn ? `Tight lodging budget (${Math.round(lodgingCapVnd).toLocaleString("en-US")} VND); selected the most economical stay option.` : `Ng\xE2n s\xE1ch l\u01B0u tr\xFA ch\u1EB7t (${Math.round(lodgingCapVnd).toLocaleString("vi-VN")}\u0111); ch\u1ECDn ph\u01B0\u01A1ng \xE1n ti\u1EBFt ki\u1EC7m nh\u1EA5t.`
    );
  }
  const selectedStay = recommendedStays.find((s) => s.tier === intake.budgetTier) || recommendedStays[recommendedStays.length - 1] || null;
  const logisticsMatchesBudget = allLogistics.filter(
    (item) => item.dailyRateVnd * dayCount <= transitCapVnd
  );
  const recommendedLogistics = logisticsMatchesBudget.length > 0 ? logisticsMatchesBudget : allLogistics.slice(0, 1);
  if (logisticsMatchesBudget.length === 0 && recommendedLogistics.length > 0) {
    notes.push(
      isEn ? `Tight transit budget (${Math.round(transitCapVnd).toLocaleString("en-US")} VND); prioritized the most economical transport option.` : `Ng\xE2n s\xE1ch di chuy\u1EC3n ch\u1EB7t (${Math.round(transitCapVnd).toLocaleString("vi-VN")}\u0111); \u01B0u ti\xEAn ph\u01B0\u01A1ng ti\u1EC7n ti\u1EBFt ki\u1EC7m nh\u1EA5t.`
    );
  }
  const selectedLogistics = recommendedLogistics.find(
    (l) => l.tier === intake.budgetTier && l.suitableFor.includes(companionType)
  ) || recommendedLogistics.find((l) => l.suitableFor.includes(companionType)) || recommendedLogistics[0] || null;
  if (companionType === "family") {
    notes.push(
      isEn ? "Family pacing is relaxed to allow extra rest time and minimize long driving legs." : "Nh\u1ECBp \u0111\u1ED9 gia \u0111\xECnh \u0111\u01B0\u1EE3c gi\u1EA3m t\u1EA3i \u0111\u1EC3 c\xF3 th\u1EDDi gian ngh\u1EC9 ng\u01A1i v\xE0 h\u1EA1n ch\u1EBF di chuy\u1EC3n xa."
    );
  } else if (companionType === "solo") {
    notes.push(
      isEn ? "Flexible solo itinerary prioritizing motorbike or main-route shuttle transport." : "L\u1ECBch tr\xECnh \u0111\u1ED9c h\xE0nh linh ho\u1EA1t, \u01B0u ti\xEAn xe m\xE1y ho\u1EB7c shuttle tuy\u1EBFn ch\xEDnh."
    );
  }
  return {
    dayCount,
    duration: intake.duration,
    travelersCount,
    companionType,
    seasonMilestone: season.milestone,
    seasonHeadline: `${season.headline} (${season.subheadline})`,
    seasonTheme: season.plannerTheme,
    maxStopsPerDay,
    maxStopsTotal,
    maxDailyDistanceKm,
    recommendedStays,
    selectedStay,
    recommendedLogistics,
    selectedLogistics,
    notes
  };
}

// server/services/ai/workflow/phase1Intake.ts
var VALID_THEMES = ["coffee", "culture", "nature", "cuisine"];
var VALID_DURATIONS = ["2N1D", "3N2D", "4N3D+"];
var VALID_COMPANIONS = ["solo", "couple", "family", "friends"];
var VALID_BUDGETS = ["budget", "standard", "luxury"];
var DEFAULT_TRAVELERS_BY_COMPANION = {
  solo: 1,
  couple: 2,
  family: 4,
  friends: 4
};
function inferTravelersCountFromCompanion(companionType) {
  if (!companionType || !VALID_COMPANIONS.includes(companionType)) {
    return null;
  }
  return DEFAULT_TRAVELERS_BY_COMPANION[companionType];
}
function buildClarificationOptions(lang, missingFields) {
  const options = [];
  if (missingFields.includes("travelers")) {
    if (lang === "en") {
      options.push(
        { field: "travelers", label: "Solo (1 traveler)", valueText: "Solo trip (1 person)" },
        { field: "travelers", label: "Couple (2 travelers)", valueText: "Couple (2 travelers)" },
        { field: "travelers", label: "Family (4 travelers)", valueText: "Family of 4" },
        { field: "travelers", label: "Friends (4 travelers)", valueText: "Group of 4 friends" }
      );
    } else {
      options.push(
        { field: "travelers", label: "\u0110\u1ED9c h\xE0nh (1 ng\u01B0\u1EDDi)", valueText: "\u0110i 1 m\xECnh (\u0111\u1ED9c h\xE0nh)" },
        { field: "travelers", label: "C\u1EB7p \u0111\xF4i (2 ng\u01B0\u1EDDi)", valueText: "C\u1EB7p \u0111\xF4i 2 ng\u01B0\u1EDDi" },
        { field: "travelers", label: "Gia \u0111\xECnh (4 ng\u01B0\u1EDDi)", valueText: "Gia \u0111\xECnh 4 ng\u01B0\u1EDDi" },
        { field: "travelers", label: "Nh\xF3m b\u1EA1n (4 ng\u01B0\u1EDDi)", valueText: "Nh\xF3m b\u1EA1n 4 ng\u01B0\u1EDDi" }
      );
    }
  }
  if (missingFields.includes("dates")) {
    if (lang === "en") {
      options.push(
        { field: "dates", label: "2D1N \u2022 Weekend", valueText: "2N1D weekend trip" },
        { field: "dates", label: "3D2N \u2022 March (Coffee blossom)", valueText: "3N2D in March" },
        { field: "dates", label: "3D2N \u2022 August (Waterfalls)", valueText: "3N2D in August" },
        { field: "dates", label: "4D3N \u2022 November (Wildflowers)", valueText: "4N3D in November" }
      );
    } else {
      options.push(
        { field: "dates", label: "2N1\u0110 \u2022 Cu\u1ED1i tu\u1EA7n", valueText: "2N1\u0110" },
        { field: "dates", label: "3N2\u0110 \u2022 Th\xE1ng 3 (Hoa c\xE0 ph\xEA)", valueText: "3N2\u0110 v\xE0o th\xE1ng 3" },
        { field: "dates", label: "3N2\u0110 \u2022 Th\xE1ng 8 (M\xF9a th\xE1c)", valueText: "3N2\u0110 v\xE0o th\xE1ng 8" },
        { field: "dates", label: "4N3\u0110 \u2022 Th\xE1ng 11 (D\xE3 qu\u1EF3)", valueText: "4N3\u0110 v\xE0o th\xE1ng 11" }
      );
    }
  }
  if (missingFields.includes("budget")) {
    if (lang === "en") {
      options.push(
        {
          field: "budget",
          label: "Budget (~3\u20134M VND)",
          valueText: "Budget tier around 4 million VND"
        },
        {
          field: "budget",
          label: "Standard (~7\u201310M VND)",
          valueText: "Standard tier around 8 million VND"
        },
        {
          field: "budget",
          label: "Luxury (~15M+ VND)",
          valueText: "Luxury tier around 15 million VND"
        }
      );
    } else {
      options.push(
        {
          field: "budget",
          label: "Ti\u1EBFt ki\u1EC7m (~3\u20134 tri\u1EC7u)",
          valueText: "Ng\xE2n s\xE1ch ti\u1EBFt ki\u1EC7m kho\u1EA3ng 4 tri\u1EC7u"
        },
        {
          field: "budget",
          label: "Ti\xEAu chu\u1EA9n (~7\u201310 tri\u1EC7u)",
          valueText: "Ng\xE2n s\xE1ch ti\xEAu chu\u1EA9n kho\u1EA3ng 8 tri\u1EC7u"
        },
        {
          field: "budget",
          label: "Cao c\u1EA5p (~15+ tri\u1EC7u)",
          valueText: "Ng\xE2n s\xE1ch cao c\u1EA5p kho\u1EA3ng 15 tri\u1EC7u"
        }
      );
    }
  }
  return options;
}
function normalizeText(raw) {
  return String(raw || "").trim();
}
function extractBudgetVndFromText(rawText, travelersHint) {
  const text = rawText.toLowerCase();
  let totalBudgetVnd = null;
  let budgetTier = null;
  let explicitMention = false;
  const isPerPerson = /(\/người|\/khách|mỗi người|1 người|per person|each|pp\b)/i.test(text);
  const millionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr\b|million|m\b)/i);
  if (millionMatch) {
    const val = Number(millionMatch[1].replace(",", ".")) * 1e6;
    if (Number.isFinite(val) && val >= 3e5 && val <= 5e8) {
      totalBudgetVnd = Math.round(isPerPerson && travelersHint ? val * travelersHint : val);
      explicitMention = true;
    }
  }
  if (totalBudgetVnd === null) {
    const fullVndMatch = text.match(
      /(\d{1,3}(?:[.,]\d{3})+|\d{6,9})\s*(?:đồng|vnđ|vnd|đ)?(?=$|[^\p{L}\p{N}_])/iu
    );
    if (fullVndMatch) {
      const cleaned = Number(fullVndMatch[1].replace(/[.,]/g, ""));
      if (Number.isFinite(cleaned) && cleaned >= 3e5 && cleaned <= 5e8) {
        totalBudgetVnd = Math.round(isPerPerson && travelersHint ? cleaned * travelersHint : cleaned);
        explicitMention = true;
      }
    }
  }
  if (totalBudgetVnd === null) {
    const kMatch = text.match(/(\d{3,4})\s*k\b/i);
    if (kMatch) {
      const val = Number(kMatch[1]) * 1e3;
      if (Number.isFinite(val) && val >= 3e5) {
        totalBudgetVnd = Math.round(isPerPerson && travelersHint ? val * travelersHint : val);
        explicitMention = true;
      }
    }
  }
  if (/(tiết kiệm|bình dân|sinh viên|giá rẻ|homestay|budget|low[- ]cost|cheap)/i.test(text)) {
    budgetTier = "budget";
    explicitMention = true;
  } else if (/(cao cấp|nghỉ dưỡng|resort|5 sao|sang trọng|luxury|premium)/i.test(text)) {
    budgetTier = "luxury";
    explicitMention = true;
  } else if (/(tiêu chuẩn|vừa phải|tầm trung|trung bình|standard|moderate|mid[- ]range)/i.test(text)) {
    budgetTier = "standard";
    explicitMention = true;
  }
  if (totalBudgetVnd !== null && budgetTier === null) {
    const perDay = totalBudgetVnd / (3 * (travelersHint || 2));
    if (perDay < budgetMultipliers.budget.perDay * 1.15) {
      budgetTier = "budget";
    } else if (perDay >= budgetMultipliers.luxury.perDay * 0.85) {
      budgetTier = "luxury";
    } else {
      budgetTier = "standard";
    }
  }
  return { totalBudgetVnd, budgetTier, explicitMention };
}
function extractTravelersFromText(rawText) {
  const text = rawText.toLowerCase();
  let travelersCount = null;
  let companionType = null;
  let explicitMention = false;
  const countMatch = text.match(
    /(\d+)\s*(?:người|khách|bạn|thành viên|người lớn|adults?|people|persons?|travelers?|guests?|pax)\b/i
  );
  if (countMatch) {
    const n = Number(countMatch[1]);
    if (Number.isInteger(n) && n >= 1 && n <= 30) {
      travelersCount = n;
      explicitMention = true;
    }
  } else {
    const wordNumMap = {
      m\u1ED9t: 1,
      hai: 2,
      ba: 3,
      b\u1ED1n: 4,
      n\u0103m: 5,
      s\u00E1u: 6,
      b\u1EA3y: 7,
      t\u00E1m: 8
    };
    const wordMatch = text.match(
      /\b(một|hai|ba|bốn|năm|sáu|bảy|tám)\s+(?:người|khách|bạn|thành viên)\b/i
    );
    if (wordMatch) {
      travelersCount = wordNumMap[wordMatch[1].toLowerCase()] ?? null;
      if (travelersCount !== null) explicitMention = true;
    }
  }
  if (/(độc hành|một mình|1 mình|đi riêng|solo)/i.test(text)) {
    companionType = "solo";
    if (travelersCount === null) travelersCount = 1;
    explicitMention = true;
  } else if (/(gia đình|bố mẹ|trẻ nhỏ|con nhỏ|ông bà|family|kids|children)/i.test(text)) {
    companionType = "family";
    if (travelersCount === null) travelersCount = 4;
    explicitMention = true;
  } else if (/(nhóm bạn|bạn bè|hội bạn|team|friends|group)/i.test(text)) {
    companionType = "friends";
    if (travelersCount === null) travelersCount = 4;
    explicitMention = true;
  } else if (/(cặp đôi|người yêu|vợ chồng|lãng mạn|honeymoon|couple)/i.test(text)) {
    companionType = "couple";
    if (travelersCount === null) travelersCount = 2;
    explicitMention = true;
  } else if (travelersCount === 1) {
    companionType = "solo";
  } else if (travelersCount === 2) {
    companionType = "couple";
  } else if (travelersCount !== null && travelersCount >= 3) {
    companionType = "friends";
  }
  return { travelersCount, companionType, explicitMention };
}
function extractDatesAndDurationFromText(rawText) {
  const text = rawText.toLowerCase();
  let duration = null;
  const dateHints = [];
  if (/(2n1[đd]|2\s*ngày|2d1n|2\s*days?|cuối tuần|weekend)/i.test(text)) {
    duration = "2N1D";
    dateHints.push("2N1D");
  } else if (/(4n3[đd]|4\s*ngày|5\s*ngày|4d3n|4\s*days?|5\s*days?|dài ngày)/i.test(text)) {
    duration = "4N3D+";
    dateHints.push("4N3D+");
  } else if (/(3n2[đd]|3\s*ngày|3d2n|3\s*days?)/i.test(text)) {
    duration = "3N2D";
    dateHints.push("3N2D");
  }
  const viMonthMatch = text.match(/tháng\s*(1[0-2]|[1-9])\b/i);
  const shortMonthMatch = text.match(/\bt(1[0-2]|[1-9])\b/i);
  const enMonthMatch = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i
  );
  const dateRangeMatch = text.match(/\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/);
  const seasonKeywordMatch = text.match(
    /(mùa hoa cà phê|mùa mưa|mùa khô|mùa dã quỳ|mùa thu hoạch|dịp lễ|tết|mùa xuân|mùa hạ|mùa thu|mùa đông|harvest season|waterfall season)/i
  );
  if (viMonthMatch) dateHints.push(`Th\xE1ng ${viMonthMatch[1]}`);
  else if (shortMonthMatch) dateHints.push(`Th\xE1ng ${shortMonthMatch[1]}`);
  else if (enMonthMatch) dateHints.push(enMonthMatch[1]);
  if (dateRangeMatch) dateHints.push(dateRangeMatch[1]);
  if (seasonKeywordMatch) dateHints.push(seasonKeywordMatch[1]);
  const uniqueHints = Array.from(new Set(dateHints));
  return {
    travelDates: uniqueHints.length > 0 ? uniqueHints.join(" \u2022 ") : null,
    duration,
    explicitMention: uniqueHints.length > 0
  };
}
function extractPurposeFromText(rawText, fallbackTheme) {
  const text = rawText.toLowerCase();
  const scores = {
    coffee: 0,
    culture: 0,
    nature: 0,
    cuisine: 0
  };
  const interests = [];
  if (/(cà phê|coffee|robusta|cupping|nông trại|ea tân|trung nguyên)/i.test(text)) {
    scores.coffee += 3;
    interests.push("c\xE0 ph\xEA \u0111\u1EB7c s\u1EA3n");
  }
  if (/(văn hóa|cồng chiêng|nhà dài|mẫu hệ|thổ cẩm|gốm|di sản|ako dhông|bảo tàng|culture|heritage)/i.test(text)) {
    scores.culture += 3;
    interests.push("di s\u1EA3n b\u1EA3n \u0111\u1ECBa");
  }
  if (/(thác|dray nur|yok đôn|rừng|trekking|thiên nhiên|chèo sup|độc mộc|voi|hồ lắk|đá voi|waterfall|nature)/i.test(text)) {
    scores.nature += 3;
    interests.push("thi\xEAn nhi\xEAn & th\xE1c");
  }
  if (/(ẩm thực|ăn uống|món ăn|food|cuisine|bún đỏ|bún chìa|gà nướng|cơm lam|cá lăng|bánh ướt|lá bép)/i.test(text)) {
    scores.cuisine += 3;
    interests.push("\u1EA9m th\u1EF1c b\u1EA3n \u0111\u1ECBa");
  }
  let bestTheme = fallbackTheme;
  let bestScore = 0;
  for (const theme of VALID_THEMES) {
    if (scores[theme] > bestScore) {
      bestScore = scores[theme];
      bestTheme = theme;
    }
  }
  return { mainPurpose: bestTheme, secondaryInterests: interests };
}
function buildClarificationQuestion(lang, missingFields) {
  if (lang === "en") {
    const parts2 = [];
    if (missingFields.includes("travelers")) parts2.push("how many travelers / group type (solo, couple, family, friends)");
    if (missingFields.includes("dates")) parts2.push("your travel dates or trip length (e.g., 2N1D, 3N2D, month)");
    if (missingFields.includes("budget")) parts2.push("your estimated budget (in VND or budget/standard/luxury tier)");
    return `To tailor an accurate \u0110\u1EAFk L\u1EAFk itinerary for you, could you share ${parts2.join(", ")}? Or pick one of the preset plans below to start right away.`;
  }
  const parts = [];
  if (missingFields.includes("travelers")) parts.push("s\u1ED1 l\u01B0\u1EE3ng ng\u01B0\u1EDDi \u0111i (\u0111\u1ED9c h\xE0nh, c\u1EB7p \u0111\xF4i, gia \u0111\xECnh hay nh\xF3m b\u1EA1n)");
  if (missingFields.includes("dates")) parts.push("th\u1EDDi gian d\u1EF1 ki\u1EBFn ho\u1EB7c s\u1ED1 ng\xE0y (v\xED d\u1EE5 2N1\u0110, 3N2\u0110, th\xE1ng m\u1EA5y)");
  if (missingFields.includes("budget")) parts.push("ng\xE2n s\xE1ch d\u1EF1 ki\u1EBFn (v\xED d\u1EE5 4\u20136 tri\u1EC7u ho\u1EB7c m\u1EE9c Ti\u1EBFt ki\u1EC7m / Ti\xEAu chu\u1EA9n / Cao c\u1EA5p)");
  return `\u0110\u1EC3 m\xECnh thi\u1EBFt k\u1EBF l\u1ECBch tr\xECnh \u0110\u1EAFk L\u1EAFk chu\u1EA9n x\xE1c v\xE0 s\xE1t chi ph\xED th\u1EF1c t\u1EBF, b\u1EA1n cho m\xECnh bi\u1EBFt th\xEAm: ${parts.join("; ")} nh\xE9! Ho\u1EB7c b\u1EA1n c\xF3 th\u1EC3 ch\u1ECDn nhanh m\u1ED9t g\u1EE3i \xFD l\u1ECBch tr\xECnh b\xEAn d\u01B0\u1EDBi.`;
}
function foldVietnamese(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
}
var QUESTION_OR_INFO_REGEX = /(\?|có\s+[^\n.!?]{1,60}\s+(?:không|ko|k|chưa|nào)(?=$|[^\p{L}\p{N}_])|(?:được|đúng|phải|hay|ngon|đẹp|ổn|an toàn|tiện|kịp|đắt|rẻ|xa|gần)\s+(?:không|ko|chưa)(?=$|[^\p{L}\p{N}_])|bao nhiêu|bao xa|bao lâu|mấy giờ|giờ mở cửa|giờ đóng cửa|mấy km|xa không|ở đâu|địa chỉ|chỗ nào|nơi nào|quán nào|nhà hàng nào|khách sạn nào|homestay nào|resort nào|xe nào|hãng nào|đường nào|món nào|loại nào|khi nào|lúc nào|ngày nào|tại sao|vì sao|sao lại|là gì|nghĩa là gì|ăn gì|uống gì|chơi gì|mua gì|xem gì|quà gì|cần\s+(?:giấy tờ|thủ tục|chuẩn bị|mang|lưu ý)?\s*gì|giấy tờ gì|lưu ý gì|kinh nghiệm|thế nào|ra sao|như thế nào|có gì|nên ăn|nên ở|có nên|làm sao|mặc gì|review|đánh giá|gợi ý|giới thiệu|kể tên|liệt kê|thông tin về|cho hỏi|cho mình hỏi|cho biết|muốn biết|xin thêm|hỏi\s+(?:chút|thêm|về)|liệu\s+có|tiện ích|hồ bơi|bể bơi|bữa sáng|giá phòng|giá vé|giá thuê|1\s*đêm|mỗi đêm|thời tiết|khí hậu|dự báo|mùa nào|tháng mấy|lễ hội|văn hóa|lịch sử|đặc sản|sân bay|vé máy bay|xe khách|taxi|what|when|where|which|who|how|why|does\s+.*\s+have|is\s+there|are\s+there|can\s+(?:i|we|you)|should\s+(?:i|we)|do\s+(?:i|we)\s+need|is\s+it|how much|how far|how long|opening hours|amenities|pool|weather|season|tips|tell me|explain|recommend|suggest|info about|information on)/iu;
var PRIMARY_AMENITY_OR_INFO_QUESTION_REGEX = /(\?|có\s+[^\n.!?]{1,60}\s+(?:không|ko|k|chưa)(?=$|[^\p{L}\p{N}_])|(?:được|đúng|phải|hay|ngon|đẹp|ổn|an toàn|tiện|kịp|đắt|rẻ|xa|gần)\s+(?:không|ko|chưa)(?=$|[^\p{L}\p{N}_])|bao nhiêu|bao xa|bao lâu|mấy giờ|giờ mở cửa|giờ đóng cửa|ở đâu|địa chỉ|chỗ nào|nơi nào|quán nào|nhà hàng nào|khách sạn nào|homestay nào|resort nào|xe nào|hãng nào|khi nào|lúc nào|tại sao|vì sao|là gì|ăn gì|uống gì|chơi gì|mua gì|cần\s+(?:giấy tờ|thủ tục|chuẩn bị|mang|lưu ý)?\s*gì|giấy tờ gì|lưu ý gì|kinh nghiệm|thế nào|ra sao|như thế nào|có nên|làm sao|review|đánh giá|giới thiệu|kể tên|thông tin về|muốn biết|xin thêm|cho hỏi|cho mình hỏi|tiện ích|hồ bơi|bể bơi|giá phòng|giá vé|giá thuê|1\s*đêm|mỗi đêm|thời tiết|dự báo|mùa nào|tháng mấy|lễ hội|sân bay|vé máy bay|xe khách|taxi|what|when|where|which|who|how|why|how much|how far|does\s+.*\s+have|is\s+there|are\s+there|can\s+(?:i|we)|should\s+(?:i|we)|amenities|pool|opening hours|weather|tell me|explain)/iu;
function isQuestionOrInfoRequest(text) {
  const lower = String(text || "").toLowerCase().trim();
  if (!lower) return false;
  return QUESTION_OR_INFO_REGEX.test(lower) || /\btư vấn\b/i.test(lower);
}
function isPrimaryAmenityOrInfoQuestion(text) {
  const lower = String(text || "").toLowerCase().trim();
  if (!lower) return false;
  return PRIMARY_AMENITY_OR_INFO_QUESTION_REGEX.test(lower);
}
async function loadGroundedQaContext(options) {
  let rawStays = options?.stays ?? [];
  if (!options?.stays) {
    try {
      rawStays = await listActiveStays();
    } catch {
      rawStays = [];
    }
  }
  let rawLogistics = options?.logistics ?? [];
  if (!options?.logistics) {
    try {
      rawLogistics = await listActiveLogistics();
    } catch {
      rawLogistics = [];
    }
  }
  let places = [];
  try {
    places = (await listEnrichedPlaces()).map((p) => ({
      title: p.title,
      location: p.location,
      category: p.meta.category,
      areaCluster: p.areaCluster,
      time: p.meta.time,
      period: p.meta.period,
      duration: p.meta.duration,
      rating: p.meta.rating,
      ticketVnd: p.ticketVnd,
      estimatedSpendVnd: p.estimatedSpendVnd,
      priceNote: p.priceNote,
      desc: p.meta.desc
    }));
  } catch {
    places = dakLakPlaceDirectory.map((meta) => {
      const inferred = inferPlaceMetadata(meta);
      return {
        title: meta.title,
        location: meta.location,
        category: meta.category,
        areaCluster: inferred.areaCluster,
        time: meta.time,
        period: meta.period,
        duration: meta.duration,
        rating: meta.rating,
        ticketVnd: inferred.defaultTicketVnd,
        estimatedSpendVnd: inferred.defaultEstimatedSpendVnd,
        desc: meta.desc
      };
    });
  }
  return {
    stays: rawStays.map((s) => ({
      name: s.name,
      area: s.area,
      tier: s.tier,
      nightlyRateVnd: s.nightlyRateVnd,
      capacityMin: s.capacityMin,
      capacityMax: s.capacityMax,
      amenities: s.amenities,
      ...s.sourceNote ? { sourceNote: s.sourceNote } : {}
    })),
    logistics: rawLogistics.map((l) => ({
      mode: l.mode,
      label: l.label,
      tier: l.tier,
      dailyRateVnd: l.dailyRateVnd,
      capacityMin: l.capacityMin,
      capacityMax: l.capacityMax,
      notes: l.notes
    })),
    places,
    seasons: seasonsData.map((s) => ({
      milestone: s.milestone,
      headline: s.headline,
      subheadline: s.subheadline,
      description: s.description
    }))
  };
}
async function maybeFetchTavilyQaContext(queryText, options) {
  if (options?.enableTavily === false) {
    return { snippets: [], citations: [], status: "disabled" };
  }
  const apiKey = getTavilyApiKey();
  if (!apiKey && !options?.tavilyClient) {
    return {
      snippets: [],
      citations: [],
      status: "missing_api_key",
      error: "TAVILY_API_KEY is not configured"
    };
  }
  const trimmed = String(queryText || "").trim();
  if (trimmed.length < 3) {
    return { snippets: [], citations: [], status: "empty_query" };
  }
  const folded = foldVietnamese(trimmed);
  const needsExternalCheck = isQuestionOrInfoRequest(trimmed) || isPrimaryAmenityOrInfoQuestion(trimmed) || /(ho boi|be boi|pool|wifi|an sang|giay to|thu tuc|bang lai|mo cua|dong cua|gia ve|gia phong|1 dem|review|thue xe|thue thuyen|thoi tiet|du bao|le hoi|san bay|may bay|xe khach|limousine|taxi|khach san|homestay|resort|quan an|nha hang|ca phe|dac san|van hoa|lich su|dia chi|o dau|bao xa|kinh nghiem|kotam|ko tam|buon don|ban don|ho lak|buon jun|chu yang sin|ea kao|khai doan|weather|flight|airport|bus|hotel|restaurant|cafe|festival|history|culture)/i.test(
    folded
  );
  if (!needsExternalCheck) {
    return { snippets: [], citations: [], status: "disabled" };
  }
  const res = await searchGeneralQaWithTavily(trimmed, {
    enableTavily: options?.enableTavily,
    tavilyClient: options?.tavilyClient,
    timeoutMs: options?.timeoutMs
  });
  return {
    ...res.answer ? { answer: res.answer } : {},
    snippets: res.snippets,
    citations: res.citations,
    ...res.status ? { status: res.status } : {},
    ...res.error ? { error: res.error } : {}
  };
}
var AMENITY_MATCHERS = [
  {
    key: "pool",
    labelVi: "h\u1ED3 b\u01A1i",
    labelEn: "swimming pool",
    patterns: ["ho boi", "be boi", "swimming pool", "pool"]
  },
  {
    key: "breakfast",
    labelVi: "b\u1EEFa s\xE1ng / buffet s\xE1ng",
    labelEn: "breakfast",
    patterns: ["an sang", "buffet", "breakfast"]
  },
  {
    key: "wifi",
    labelVi: "Wi-Fi",
    labelEn: "Wi-Fi",
    patterns: ["wifi", "wi-fi", "internet"]
  },
  {
    key: "spa",
    labelVi: "spa",
    labelEn: "spa",
    patterns: ["spa", "massage", "thao moc"]
  },
  {
    key: "shuttle",
    labelVi: "\u0111\u01B0a \u0111\xF3n s\xE2n bay",
    labelEn: "airport shuttle",
    patterns: ["dua don", "san bay", "shuttle", "airport"]
  },
  {
    key: "boat",
    labelVi: "ch\xE8o kayak / thuy\u1EC1n",
    labelEn: "kayak / boat",
    patterns: ["kayak", "thuyen", "doc moc"]
  },
  {
    key: "kitchen",
    labelVi: "b\u1EBFp chung",
    labelEn: "shared kitchen",
    patterns: ["bep", "nau an", "kitchen"]
  },
  {
    key: "motorbike",
    labelVi: "h\u1ED7 tr\u1EE3 thu\xEA xe m\xE1y",
    labelEn: "motorbike rental",
    patterns: ["thue xe may"]
  }
];
var STAY_STOPWORDS = /* @__PURE__ */ new Set([
  "homestay",
  "hotel",
  "khach",
  "san",
  "resort",
  "villa",
  "bungalow",
  "buon",
  "ma",
  "thuot",
  "bmt",
  "tai",
  "o",
  "va",
  "&"
]);
function findMatchedStaysInText(foldedMsg, stays) {
  const exact = stays.filter((s) => foldedMsg.includes(foldVietnamese(s.name)));
  if (exact.length > 0) return exact;
  const scored = stays.map((s) => {
    const foldedName = foldVietnamese(s.name);
    const tokens = foldedName.split(/[\s\-&,/]+/).filter((t) => t.length >= 3 && !STAY_STOPWORDS.has(t));
    const matchedTokens = tokens.filter((t) => foldedMsg.includes(t));
    let score = matchedTokens.length;
    if (foldedMsg.includes("ako dhong") && foldedName.includes("ako dhong")) score += 3;
    if (foldedMsg.includes("lak tented") && foldedName.includes("lak tented")) score += 3;
    if (foldedMsg.includes("elephants") && foldedName.includes("elephants")) score += 3;
    if (foldedMsg.includes("muong thanh") && foldedName.includes("muong thanh")) score += 3;
    if (foldedMsg.includes("zan") && foldedName.includes("zan")) score += 3;
    if (foldedMsg.includes("eco-resort") && foldedName.includes("eco-resort")) score += 3;
    return { stay: s, score };
  }).filter((item) => item.score >= 2).sort((a, b) => b.score - a.score);
  return scored.map((x) => x.stay);
}
function findMatchedPlaceInText(foldedMsg, places) {
  for (const p of places) {
    if (foldedMsg.includes(foldVietnamese(p.title))) return p;
  }
  const aliasKeywords = [
    { kw: "bao tang the gioi ca phe", title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA" },
    { kw: "the gioi ca phe", title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA" },
    { kw: "lang ca phe trung nguyen", title: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn" },
    { kw: "trung nguyen", title: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn" },
    { kw: "ako dhong", title: "Bu\xF4n c\u1ED5 Ako Dh\xF4ng" },
    { kw: "bao tang dak lak", title: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk" },
    { kw: "ea tan", title: "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n" },
    { kw: "da voi me", title: "\u0110\xE1 Voi M\u1EB9 Yang Tao" },
    { kw: "yang tao", title: "\u0110\xE1 Voi M\u1EB9 Yang Tao" },
    { kw: "ho lak", title: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun" },
    { kw: "buon jun", title: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun" },
    { kw: "biet dien bao dai", title: "\u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i" },
    { kw: "dray nur", title: "Th\xE1c Dray Nur H\xF9ng V\u0129" },
    { kw: "yok don", title: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n" },
    { kw: "tong ju", title: "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m T\u01A1ng J\xFA" },
    { kw: "phan dinh giot", title: "Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t" },
    { kw: "ban don", title: "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n" },
    { kw: "serepok", title: "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n" }
  ];
  for (const alias of aliasKeywords) {
    if (foldedMsg.includes(alias.kw)) {
      const found = places.find((p) => p.title === alias.title);
      if (found) return found;
    }
  }
  return null;
}
function isLikelyEnglishText(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) return false;
  const hasVietnameseDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
    cleaned
  );
  const englishSignals = cleaned.match(
    /\b(the|and|that|with|from|which|they|does|have|indicate|available|including|however|specific|whether|therefore|sources|information|according|based|there|about|provide|around)\b/gi
  ) || [];
  if (englishSignals.length >= 3) return true;
  if (!hasVietnameseDiacritics && englishSignals.length >= 1) return true;
  return false;
}
function resolveEffectiveQaLanguage(message, uiLang) {
  const cleaned = String(message || "").trim();
  if (!cleaned) return uiLang;
  const hasVietnameseDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
    cleaned
  );
  if (hasVietnameseDiacritics) return "vi";
  const folded = foldVietnamese(cleaned);
  if (/\b(khong|bao nhieu|o dau|khi nao|nhu the nao|co nen|giay to|le hoi|cong chieng|buon|thac|homestay|khach san|gia ve|thue thuyen|thue xe)\b/i.test(
    folded
  )) {
    return "vi";
  }
  return uiLang;
}
function buildTavilyReferenceText(isEn, tavilyAnswer, tavilySnippets) {
  const cleanAnswer = typeof tavilyAnswer === "string" && tavilyAnswer.trim() ? tavilyAnswer.trim() : "";
  const validSnippets = (tavilySnippets || []).filter(
    (s) => typeof s?.content === "string" && s.content.trim().length > 0
  );
  if (isEn) {
    if (cleanAnswer) {
      return `

**Live web summary:**
- ${cleanAnswer}`;
    }
    if (validSnippets.length > 0) {
      const bullets = validSnippets.slice(0, 2).map((s) => `- **${s.title}**: ${s.content}`).join("\n");
      return `

**Live web references:**
${bullets}`;
    }
    return "";
  }
  if (cleanAnswer && !isLikelyEnglishText(cleanAnswer)) {
    return `

**Th\xF4ng tin c\u1EADp nh\u1EADt tr\u1EF1c tuy\u1EBFn:**
- ${cleanAnswer}`;
  }
  const vietnameseSnippets = validSnippets.filter((s) => !isLikelyEnglishText(s.content));
  if (vietnameseSnippets.length > 0) {
    const bullets = vietnameseSnippets.slice(0, 2).map((s) => `- **${s.title}**: ${s.content}`).join("\n");
    return `

**Th\xF4ng tin tham kh\u1EA3o tr\u1EF1c tuy\u1EBFn:**
${bullets}`;
  }
  return "";
}
async function buildGroundedQaReplyDeterministic(req, options) {
  const ctx = await loadGroundedQaContext(options);
  const lower = req.message.toLowerCase();
  const folded = foldVietnamese(req.message);
  const days = req.currentState.days;
  const effectiveLang = resolveEffectiveQaLanguage(req.message, req.lang);
  const isEn = effectiveLang === "en";
  const tavilyRef = buildTavilyReferenceText(isEn, options?.tavilyAnswer, options?.tavilySnippets);
  const hasExplicitStayIntent = /(homestay|khach san|hotel|resort|bungalow|villa|luu tru|cho o|noi o|phong o|dat phong|gia phong|1 dem|moi dem|ho boi|be boi|pool|tien ich|amenities|check-in|check-out)/i.test(
    folded
  );
  const rawMatchedStays = findMatchedStaysInText(folded, ctx.stays);
  const matchedStays = hasExplicitStayIntent ? rawMatchedStays : rawMatchedStays.filter((s) => folded.includes(foldVietnamese(s.name)));
  const requestedAmenity = AMENITY_MATCHERS.find(
    (m) => m.patterns.some((pat) => folded.includes(pat))
  );
  const isStayQuery = matchedStays.length > 0 || hasExplicitStayIntent;
  if (isStayQuery && ctx.stays.length > 0) {
    if (matchedStays.length > 0) {
      const stay = matchedStays[0];
      const rateStr = isEn ? `~${stay.nightlyRateVnd.toLocaleString("en-US")} VND/night` : `~${stay.nightlyRateVnd.toLocaleString("vi-VN")}\u0111/\u0111\xEAm`;
      const amenitiesStr = stay.amenities.join(", ");
      if (requestedAmenity) {
        const hasAmenity = stay.amenities.some(
          (a) => requestedAmenity.patterns.some((pat) => foldVietnamese(a).includes(pat))
        );
        const matchingAlternatives = ctx.stays.filter(
          (other) => other.name !== stay.name && other.amenities.some(
            (a) => requestedAmenity.patterns.some((pat) => foldVietnamese(a).includes(pat))
          )
        );
        const wantsHomestay = /\bhomestay\b/i.test(folded);
        if (hasAmenity) {
          return isEn ? `Yes \u2014 in our dataset, **${stay.name}** (${stay.area}, ${stay.tier} tier, ${rateStr}, capacity ${stay.capacityMin}\u2013${stay.capacityMax} guests) lists **${requestedAmenity.labelEn}**. Listed amenities: ${amenitiesStr}.${stay.sourceNote ? ` (${stay.sourceNote})` : ""}${tavilyRef ? ` ${tavilyRef}` : ""}` : `C\xF3 b\u1EA1n nh\xE9 \u2014 trong d\u1EEF li\u1EC7u hi\u1EC7n c\xF3, **${stay.name}** (khu v\u1EF1c ${stay.area}, h\u1EA1ng ${stay.tier}, gi\xE1 tham kh\u1EA3o ${rateStr}, s\u1EE9c ch\u1EE9a ${stay.capacityMin}\u2013${stay.capacityMax} kh\xE1ch) c\xF3 li\u1EC7t k\xEA ti\u1EC7n \xEDch li\xEAn quan \u0111\u1EBFn **${requestedAmenity.labelVi}**. Danh s\xE1ch ti\u1EC7n \xEDch ghi nh\u1EADn: ${amenitiesStr}.${stay.sourceNote ? ` (${stay.sourceNote})` : ""}${tavilyRef ? ` ${tavilyRef}` : ""}`;
        }
        const altText = matchingAlternatives.length > 0 ? isEn ? ` If you need a ${requestedAmenity.labelEn}, stays in our dataset that explicitly list it are: ${matchingAlternatives.map(
          (a) => `${a.name} (${a.area}, ~${a.nightlyRateVnd.toLocaleString("en-US")} VND/night \u2014 ${a.amenities.join(", ")})`
        ).join("; ")}.${wantsHomestay ? " Note that the homestays in our current dataset do not list a swimming pool." : ""}` : ` N\u1EBFu b\u1EA1n \u01B0u ti\xEAn c\xF3 **${requestedAmenity.labelVi}**, trong d\u1EEF li\u1EC7u hi\u1EC7n c\xF3 c\xE1c c\u01A1 s\u1EDF l\u01B0u tr\xFA li\u1EC7t k\xEA r\xF5 ti\u1EC7n \xEDch n\xE0y l\xE0: ${matchingAlternatives.map(
          (a) => `**${a.name}** (${a.area}, ~${a.nightlyRateVnd.toLocaleString("vi-VN")}\u0111/\u0111\xEAm \u2014 ${a.amenities.join(", ")})`
        ).join("; ")}.${wantsHomestay ? " L\u01B0u \xFD: c\xE1c homestay trong d\u1EEF li\u1EC7u hi\u1EC7n t\u1EA1i c\u1EE7a h\u1EC7 th\u1ED1ng \u0111\u1EC1u ch\u01B0a ghi nh\u1EADn c\xF3 h\u1ED3 b\u01A1i." : ""}` : "";
        const tavilyNote = tavilyRef ? ` ${tavilyRef}` : "";
        const noMutationHint = days.length > 0 ? isEn ? ' (Your current itinerary was not modified \u2014 tell me e.g. "\u0110\u1ED5i sang Elephants Hotel" if you want to update your stay.)' : ' (L\u1ECBch tr\xECnh hi\u1EC7n t\u1EA1i c\u1EE7a b\u1EA1n v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF nguy\xEAn \u2014 n\u1EBFu mu\u1ED1n \u0111\u1ED5i n\u01A1i \u1EDF, b\u1EA1n h\xE3y nh\u1EAFn c\u1EE5 th\u1EC3 v\xED d\u1EE5 "\u0110\u1ED5i sang Elephants Hotel" nh\xE9.)' : "";
        return isEn ? `In our current dataset, **${stay.name}** (${stay.area}, ${stay.tier} tier, ${rateStr}) does **not** list or confirm **${requestedAmenity.labelEn}**. Its listed amenities are: ${amenitiesStr}.${altText}${tavilyNote}${noMutationHint}` : `Trong d\u1EEF li\u1EC7u hi\u1EC7n c\xF3 c\u1EE7a h\u1EC7 th\u1ED1ng, **${stay.name}** (khu v\u1EF1c ${stay.area}, h\u1EA1ng ${stay.tier}, gi\xE1 tham kh\u1EA3o ${rateStr}${stay.sourceNote ? ` \u2014 ${stay.sourceNote}` : ""}) **ch\u01B0a ghi nh\u1EADn / kh\xF4ng li\u1EC7t k\xEA ti\u1EC7n \xEDch ${requestedAmenity.labelVi}**. C\xE1c ti\u1EC7n \xEDch hi\u1EC7n c\xF3 c\u1EE7a n\u01A1i n\xE0y g\u1ED3m: ${amenitiesStr}.${altText}${tavilyNote}${noMutationHint}`;
      }
      return isEn ? `**${stay.name}** (${stay.area}, ${stay.tier} tier)
- **Reference rate:** ${rateStr} (${stay.capacityMin}\u2013${stay.capacityMax} guests)
- **Listed amenities:** ${amenitiesStr}${stay.sourceNote ? `
- **Note:** ${stay.sourceNote}` : ""}${tavilyRef}` : `**${stay.name}** (khu v\u1EF1c ${stay.area}, h\u1EA1ng ${stay.tier})
- **Gi\xE1 tham kh\u1EA3o:** ${rateStr} (ph\xF9 h\u1EE3p ${stay.capacityMin}\u2013${stay.capacityMax} kh\xE1ch)
- **Ti\u1EC7n \xEDch ghi nh\u1EADn:** ${amenitiesStr}${stay.sourceNote ? `
- **Ghi ch\xFA:** ${stay.sourceNote}` : ""}${tavilyRef}`;
    }
    if (requestedAmenity) {
      const matchingStays = ctx.stays.filter(
        (s) => s.amenities.some(
          (a) => requestedAmenity.patterns.some((pat) => foldVietnamese(a).includes(pat))
        )
      );
      const wantsHomestay = /\bhomestay\b/i.test(folded);
      if (matchingStays.length > 0) {
        const listStr = matchingStays.map(
          (s) => isEn ? `${s.name} (${s.area}, ~${s.nightlyRateVnd.toLocaleString("en-US")} VND/night \u2014 ${s.amenities.join(", ")})` : `**${s.name}** (${s.area}, ~${s.nightlyRateVnd.toLocaleString("vi-VN")}\u0111/\u0111\xEAm \u2014 ${s.amenities.join(", ")})`
        ).join("; ");
        const homestayCaveat = wantsHomestay && !matchingStays.some((s) => /homestay/i.test(s.name)) ? isEn ? "Our current dataset does not list any homestay with a swimming pool; however, the following local hotels list one: " : "Trong d\u1EEF li\u1EC7u hi\u1EC7n t\u1EA1i ch\u01B0a c\xF3 homestay n\xE0o ghi nh\u1EADn ti\u1EC7n \xEDch h\u1ED3 b\u01A1i; tuy nhi\xEAn b\u1EA1n c\xF3 th\u1EC3 tham kh\u1EA3o c\xE1c kh\xE1ch s\u1EA1n t\u1EA1i BMT c\xF3 ghi nh\u1EADn h\u1ED3 b\u01A1i: " : isEn ? `Stays in our dataset listing ${requestedAmenity.labelEn}: ` : `C\xE1c c\u01A1 s\u1EDF l\u01B0u tr\xFA trong d\u1EEF li\u1EC7u c\xF3 ghi nh\u1EADn **${requestedAmenity.labelVi}**: `;
        return `${homestayCaveat}${listStr}.${tavilyRef ? ` ${tavilyRef}` : ""}`;
      }
    }
    const staysSummary = ctx.stays.map(
      (s) => isEn ? `${s.name} (${s.area}, ${s.tier}, ~${s.nightlyRateVnd.toLocaleString("en-US")} VND/night: ${s.amenities.join(", ")})` : `**${s.name}** (${s.area}, ~${s.nightlyRateVnd.toLocaleString("vi-VN")}\u0111/\u0111\xEAm: ${s.amenities.join(", ")})`
    ).join("; ");
    if (tavilyRef) {
      return isEn ? `${tavilyRef} In our local \u0110\u1EAFk L\u1EAFk accommodation catalog, you can also compare: ${staysSummary}.` : `${tavilyRef} Ngo\xE0i ra, c\xE1c l\u1EF1a ch\u1ECDn l\u01B0u tr\xFA tham kh\u1EA3o t\u1EA1i \u0110\u1EAFk L\u1EAFk trong h\u1EC7 th\u1ED1ng g\u1ED3m: ${staysSummary}.`;
    }
    return isEn ? `Here are the accommodations in our \u0110\u1EAFk L\u1EAFk dataset: ${staysSummary}.` : `C\xE1c l\u1EF1a ch\u1ECDn l\u01B0u tr\xFA tham kh\u1EA3o t\u1EA1i \u0110\u1EAFk L\u1EAFk trong d\u1EEF li\u1EC7u hi\u1EC7n c\xF3 g\u1ED3m: ${staysSummary}.`;
  }
  const isAirportOrIntercityQuery = /(san bay|may bay|ve may bay|xe khach|limousine|ben xe|tu sai gon|tu tphcm|tu ha noi|airport|flight|sleeper bus)/i.test(
    folded
  );
  if (isAirportOrIntercityQuery) {
    const baseAirportInfo = isEn ? "Bu\xF4n Ma Thu\u1ED9t Airport (BMV) is located in H\xF2a Th\u1EAFng commune, ~8\u201310 km east of the city center along National Highway 27 (~15\u201320 minutes by taxi or Grab, costing ~120,000\u2013180,000 VND). Direct flights operate daily from Ho Chi Minh City (SGN) and Hanoi (HAN). By road, sleeper buses and limousines from Ho Chi Minh City take ~7\u20138 hours via National Highway 14." : "S\xE2n bay Bu\xF4n Ma Thu\u1ED9t (BMV) n\u1EB1m t\u1EA1i x\xE3 H\xF2a Th\u1EAFng, c\xE1ch trung t\xE2m th\xE0nh ph\u1ED1 kho\u1EA3ng 8\u201310 km theo tr\u1EE5c Qu\u1ED1c l\u1ED9 27 (di chuy\u1EC3n b\u1EB1ng taxi ho\u1EB7c Grab m\u1EA5t 15\u201320 ph\xFAt, chi ph\xED kho\u1EA3ng 120.000\u0111\u2013180.000\u0111). Hi\u1EC7n c\xF3 c\xE1c \u0111\u01B0\u1EDDng bay th\u1EB3ng h\xE0ng ng\xE0y t\u1EEB TP.HCM v\xE0 H\xE0 N\u1ED9i. N\u1EBFu \u0111i \u0111\u01B0\u1EDDng b\u1ED9 t\u1EEB TP.HCM, xe gi\u01B0\u1EDDng n\u1EB1m ho\u1EB7c limousine theo Qu\u1ED1c l\u1ED9 14 m\u1EA5t kho\u1EA3ng 7\u20138 ti\u1EBFng (gi\xE1 v\xE9 tham kh\u1EA3o 280.000\u0111\u2013450.000\u0111/chi\u1EC1u).";
    return tavilyRef ? `${baseAirportInfo} ${tavilyRef}` : baseAirportInfo;
  }
  const isLogisticsQuery = /(xe may|mo to|o to|tu lai|xe rieng|xe buyt|shuttle|thue xe|phuong tien|giay to|bang lai|motorbike|scooter|car rental|transport)/i.test(
    folded
  );
  if (isLogisticsQuery && ctx.logistics.length > 0) {
    const matchedTransport = ctx.logistics.find(
      (l) => /xe may|mo to|motorbike|scooter/i.test(folded) && l.mode === "motorbike" || /tu lai|self/i.test(folded) && l.mode === "self_drive_car" || /xe rieng|tai xe|7 cho|private/i.test(folded) && l.mode === "private_car_driver" || /xe buyt|shuttle|bus/i.test(folded) && l.mode === "local_bus_shuttle"
    );
    const asksDocuments = /(giay to|thu tuc|bang lai|cccd|cmnd|ho chieu|dat coc|document|license|deposit|id card)/i.test(
      folded
    );
    if (matchedTransport && asksDocuments) {
      const rate = isEn ? `${matchedTransport.dailyRateVnd.toLocaleString("en-US")} VND/day` : `${matchedTransport.dailyRateVnd.toLocaleString("vi-VN")}\u0111/ng\xE0y`;
      return isEn ? `For **${matchedTransport.label}** (reference rate ~${rate} \u2014 ${matchedTransport.notes}), our dataset does not store per-shop rental paperwork policies, so please confirm directly with the provider. Typically in Bu\xF4n Ma Thu\u1ED9t you will need a valid ID/passport (CCCD/Passport), an appropriate driver's license (A1/A for motorbikes or B1/B2 for self-drive cars), and a refundable deposit depending on the shop.${tavilyRef ? ` ${tavilyRef}` : ""}` : `V\u1EDBi d\u1ECBch v\u1EE5 **${matchedTransport.label}** (m\u1EE9c gi\xE1 tham kh\u1EA3o ~${rate} \u2014 ${matchedTransport.notes}), d\u1EEF li\u1EC7u h\u1EC7 th\u1ED1ng hi\u1EC7n kh\xF4ng l\u01B0u quy \u0111\u1ECBnh gi\u1EA5y t\u1EDD ri\xEAng c\u1EE7a t\u1EEBng c\u1EEDa h\xE0ng n\xEAn b\u1EA1n n\xEAn x\xE1c nh\u1EADn tr\u1EF1c ti\u1EBFp khi \u0111\u1EB7t. Th\xF4ng th\u01B0\u1EDDng t\u1EA1i Bu\xF4n Ma Thu\u1ED9t, b\u1EA1n c\u1EA7n chu\u1EA9n b\u1ECB **CCCD/CMND ho\u1EB7c h\u1ED9 chi\u1EBFu**, **gi\u1EA5y ph\xE9p l\xE1i xe h\u1EE3p l\u1EC7** (h\u1EA1ng A1/A v\u1EDBi xe m\xE1y ho\u1EB7c B1/B2 v\u1EDBi \xF4 t\xF4 t\u1EF1 l\xE1i) v\xE0 **ti\u1EC1n c\u1ECDc** t\xF9y ch\xEDnh s\xE1ch t\u1EEBng \u0111i\u1EC3m thu\xEA.${tavilyRef ? ` ${tavilyRef}` : ""}`;
    }
    if (matchedTransport) {
      const rate = isEn ? `${matchedTransport.dailyRateVnd.toLocaleString("en-US")} VND/day` : `${matchedTransport.dailyRateVnd.toLocaleString("vi-VN")}\u0111/ng\xE0y`;
      return isEn ? `**${matchedTransport.label}** (${matchedTransport.tier} tier, ${matchedTransport.capacityMin}\u2013${matchedTransport.capacityMax} guests): reference rate **${rate}**. Notes: ${matchedTransport.notes}${tavilyRef ? ` ${tavilyRef}` : ""}` : `**${matchedTransport.label}** (h\u1EA1ng ${matchedTransport.tier}, ph\xF9 h\u1EE3p ${matchedTransport.capacityMin}\u2013${matchedTransport.capacityMax} kh\xE1ch): gi\xE1 tham kh\u1EA3o **${rate}**. Ghi ch\xFA: ${matchedTransport.notes}${tavilyRef ? ` ${tavilyRef}` : ""}`;
    }
    const summary = ctx.logistics.map(
      (l) => isEn ? `${l.label} (~${l.dailyRateVnd.toLocaleString("en-US")} VND/day)` : `**${l.label}** (~${l.dailyRateVnd.toLocaleString("vi-VN")}\u0111/ng\xE0y: ${l.notes})`
    ).join("; ");
    return isEn ? `Transport options in our \u0110\u1EAFk L\u1EAFk dataset: ${summary}.${tavilyRef ? ` ${tavilyRef}` : ""}` : `C\xE1c ph\u01B0\u01A1ng \xE1n di chuy\u1EC3n tham kh\u1EA3o t\u1EA1i \u0110\u1EAFk L\u1EAFk: ${summary}.${tavilyRef ? ` ${tavilyRef}` : ""}`;
  }
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const season = resolveSeasonFromDates(
    req.message,
    req.history?.map((h) => h.user).join(" ")
  );
  const asksSeasonOrWeather = /(mùa|thời tiết|khí hậu|dự báo|mưa|nắng|mặc gì|hoa cà phê|dã quỳ|tháng\s*\d+|season|weather|forecast|wear|pack|blossom)/i.test(
    lower
  );
  if (dayMatch && days.length > 0) {
    const idx = Math.max(0, Math.min(days.length - 1, Number(dayMatch[1]) - 1));
    const targetDay = days[idx];
    if (targetDay) {
      const dirMap = new Map(ctx.places.map((p) => [p.title.toLowerCase(), p]));
      const slotList = targetDay.slots.map((s) => {
        const meta = dirMap.get(s.title.toLowerCase());
        return `${s.time}: ${s.title}${meta ? ` (${meta.duration})` : ""}`;
      }).join("; ");
      const dayText = isEn ? `${targetDay.day} (${targetDay.title}) has ${targetDay.slots.length} stops: ${slotList}.` : `${targetDay.day} (${targetDay.title}) hi\u1EC7n c\xF3 ${targetDay.slots.length} \u0111i\u1EC3m: ${slotList}.`;
      if (asksSeasonOrWeather) {
        const seasonText = isEn ? ` Seasonal context (${season.milestone} \u2014 ${season.headline}): ${season.description}` : ` B\u1ED1i c\u1EA3nh m\xF9a (${season.milestone} \u2014 ${season.headline}): ${season.description}`;
        return `${dayText}${seasonText}${tavilyRef ? ` ${tavilyRef}` : ""}`;
      }
      return dayText;
    }
  }
  const asksFestivalOrEvent = /(le hoi|festival|su kien|bieu dien|chuong trinh|lich to chuc)/i.test(
    folded
  );
  const matchedPlace = findMatchedPlaceInText(folded, ctx.places);
  if (matchedPlace && !asksSeasonOrWeather && !asksFestivalOrEvent) {
    const ticketStr = matchedPlace.ticketVnd === 0 ? isEn ? "Free admission" : "Mi\u1EC5n ph\xED v\xE9 v\xE0o c\u1ED5ng" : isEn ? `${matchedPlace.ticketVnd.toLocaleString("en-US")} VND` : `${matchedPlace.ticketVnd.toLocaleString("vi-VN")}\u0111`;
    const spendStr = isEn ? `${matchedPlace.estimatedSpendVnd.toLocaleString("en-US")} VND` : `${matchedPlace.estimatedSpendVnd.toLocaleString("vi-VN")}\u0111`;
    return isEn ? `**${matchedPlace.title}** (${matchedPlace.category} \u2022 ${matchedPlace.location})
- **Suggested window:** ${matchedPlace.time} (${matchedPlace.duration})
- **Estimated cost:** ${ticketStr}, total spend ~${spendStr}${matchedPlace.priceNote ? ` (${matchedPlace.priceNote})` : ""}
- **Highlights:** ${matchedPlace.desc}${tavilyRef}` : `**${matchedPlace.title}** (${matchedPlace.category} \u2022 ${matchedPlace.location})
- **Khung gi\u1EDD g\u1EE3i \xFD:** ${matchedPlace.time} (th\u1EDDi l\u01B0\u1EE3ng ${matchedPlace.duration})
- **Chi ph\xED tham kh\u1EA3o:** ${ticketStr}, t\u1ED5ng chi ti\xEAu \u01B0\u1EDBc t\xEDnh ~${spendStr}${matchedPlace.priceNote ? ` (${matchedPlace.priceNote})` : ""}
- **\u0110i\u1EC3m n\u1ED5i b\u1EADt:** ${matchedPlace.desc}${tavilyRef}`;
  }
  if (asksSeasonOrWeather) {
    const coffeeBlossomNote = /hoa ca phe|coffee blossom/i.test(folded) ? isEn ? " Best spots to see coffee blossoms: N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n, L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn, and Bu\xF4n c\u1ED5 Ako Dh\xF4ng." : " C\xE1c \u0111i\u1EC3m g\u1EE3i \xFD ng\u1EAFm hoa c\xE0 ph\xEA v\xE0 th\u01B0\u1EDFng th\u1EE9c c\xE0 ph\xEA: N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n, L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn, B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA v\xE0 Bu\xF4n c\u1ED5 Ako Dh\xF4ng." : "";
    if (days.length > 0) {
      const totalStops = days.reduce((s, d) => s + d.slots.length, 0);
      return isEn ? `For ${season.milestone} (${season.headline} \u2014 ${season.subheadline}): ${season.description} Your current ${days.length}-day itinerary includes ${totalStops} stops across ${days.map((d) => d.title).join(" \u2192 ")}.${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ""}` : `Theo d\u1EEF li\u1EC7u m\xF9a ${season.milestone} (${season.headline} \u2014 ${season.subheadline}): ${season.description} L\u1ECBch tr\xECnh ${days.length} ng\xE0y hi\u1EC7n t\u1EA1i c\u1EE7a b\u1EA1n c\xF3 ${totalStops} \u0111i\u1EC3m d\u1EEBng, ph\xF9 h\u1EE3p chu\u1EA9n b\u1ECB gi\xE0y \u0111i b\u1ED9 tho\u1EA3i m\xE1i v\xE0 \xE1o kho\xE1c nh\u1EB9 cho bu\u1ED5i t\u1ED1i cao nguy\xEAn.${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ""}`;
    }
    return isEn ? `**${season.milestone} (${season.headline})**: ${season.subheadline}. ${season.description}${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ""}` : `**${season.milestone} (${season.headline})**: ${season.subheadline}. ${season.description}${coffeeBlossomNote}${tavilyRef ? ` ${tavilyRef}` : ""}`;
  }
  if (/(an gi|mon gi|am thuc|dac san|bun|com lam|ga nuong|ca lang|banh uot|mua qua|qua gi|quan an|nha hang|food|eat|cuisine|souvenir|specialty)/i.test(
    folded
  )) {
    const foodBase = isEn ? "Must-try \u0110\u1EAFk L\u1EAFk specialties include Bu\xF4n Ma Thu\u1ED9t red noodle soup (b\xFAn \u0111\u1ECF), stacked wet rice pancakes with grilled pork (b\xE1nh \u01B0\u1EDBt th\u1ECBt n\u01B0\u1EDBng), grilled chicken with bamboo rice (g\xE0 n\u01B0\u1EDBng c\u01A1m lam), S\xEAr\xEAp\u1ED1k l\u0103ng fish, and hand-brewed Fine Robusta around Phan \u0110\xECnh Gi\xF3t street. For gifts/souvenirs, look for specialty roasted coffee, \u0110\u1EAFk L\u1EAFk cocoa powder, macadamia nuts, and coffee-blossom honey." : "\u0110\u1EBFn \u0110\u1EAFk L\u1EAFk b\u1EA1n nh\u1EA5t \u0111\u1ECBnh n\xEAn th\u1EED b\xFAn \u0111\u1ECF Ban M\xEA, b\xE1nh \u01B0\u1EDBt th\u1ECBt n\u01B0\u1EDBng ch\u1ED3ng \u0111\u0129a, g\xE0 n\u01B0\u1EDBng c\u01A1m lam B\u1EA3n \u0110\xF4n/H\u1ED3 L\u1EAFk, c\xE1 l\u0103ng s\xF4ng S\xEAr\xEAp\u1ED1k v\xE0 th\u01B0\u1EDFng th\u1EE9c Fine Robusta \u1EDF Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t ho\u1EB7c B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA. N\u1EBFu mua qu\xE0 mang v\u1EC1, b\u1EA1n c\xF3 th\u1EC3 ch\u1ECDn c\xE0 ph\xEA h\u1EA1t/rang m\u1ED9c \u0111\u1EB7c s\u1EA3n, b\u1ED9t ca cao \u0110\u1EAFk L\u1EAFk, h\u1EA1t m\u1EAFc ca v\xE0 m\u1EADt ong hoa c\xE0 ph\xEA.";
    return tavilyRef ? `${foodBase} ${tavilyRef}` : foodBase;
  }
  if (/(le hoi cong chieng|cong chieng.*le hoi|le hoi.*cong chieng|le hoi.*ako dhong)/i.test(folded)) {
    const gongFestBase = isEn ? `**Gong Culture & Community Performances in \u0110\u1EAFk L\u1EAFk**
- **Status:** Our local dataset does not have a confirmed public schedule for a one-off Gong Festival on a specific date unless verified by official provincial announcements.
- **Regular experiences:** Cultural gong performances (UNESCO Intangible Cultural Heritage) are periodically hosted at community tourism villages like **Bu\xF4n c\u1ED5 Ako Dh\xF4ng** (Bu\xF4n Ma Thu\u1ED9t) and cultural centers by local artisans or tour groups.` : `**L\u1EC5 h\u1ED9i & Bi\u1EC3u di\u1EC5n V\u0103n h\xF3a C\u1ED3ng chi\xEAng t\u1EA1i Bu\xF4n c\u1ED5 Ako Dh\xF4ng**
- **V\u1EC1 l\u1ECBch t\u1ED5 ch\u1EE9c c\u1EE5 th\u1EC3:** D\u1EEF li\u1EC7u hi\u1EC7n t\u1EA1i ch\u01B0a ghi nh\u1EADn th\xF4ng b\xE1o l\u1ECBch ch\xEDnh th\u1EE9c c\u1EE7a m\u1ED9t s\u1EF1 ki\u1EC7n L\u1EC5 h\u1ED9i C\u1ED3ng chi\xEAng c\u1EA5p t\u1EC9nh di\u1EC5n ra \u0111\xFAng v\xE0o ng\xE0y c\u1EE5 th\u1EC3 b\u1EA1n h\u1ECFi; b\u1EA1n n\xEAn ki\u1EC3m tra th\xEAm th\xF4ng b\xE1o t\u1EEB S\u1EDF V\u0103n h\xF3a, Th\u1EC3 thao & Du l\u1ECBch \u0110\u1EAFk L\u1EAFk.
- **Tr\u1EA3i nghi\u1EC7m th\u01B0\u1EDDng k\u1EF3:** T\u1EA1i **Bu\xF4n c\u1ED5 Ako Dh\xF4ng** (c\xE1ch trung t\xE2m Bu\xF4n Ma Thu\u1ED9t ~2 km), c\xE1c ch\u01B0\u01A1ng tr\xECnh giao l\u01B0u v\u0103n h\xF3a c\u1ED3ng chi\xEAng T\xE2y Nguy\xEAn, tham quan nh\xE0 d\xE0i \xCA \u0110\xEA v\xE0 th\u01B0\u1EDFng th\u1EE9c \u1EA9m th\u1EF1c b\u1EA3n \u0111\u1ECBa v\u1EABn \u0111\u01B0\u1EE3c t\u1ED5 ch\u1EE9c theo l\u1ECBch bi\u1EC3u di\u1EC5n \u0111\u1ECBnh k\u1EF3 ho\u1EB7c \u0111\u1EB7t tr\u01B0\u1EDBc theo \u0111o\xE0n.`;
    return tavilyRef ? `${gongFestBase}${tavilyRef}` : gongFestBase;
  }
  if (/(le hoi ca phe|coffee festival|le hoi)/i.test(folded)) {
    const festBase = isEn ? "**Bu\xF4n Ma Thu\u1ED9t Coffee Festival & Local Events**\n- Held biennially in March as Vietnam\u2019s largest coffee cultural event featuring street parades, free coffee tasting, specialty brewing competitions, and Central Highlands gong performances." : "**L\u1EC5 h\u1ED9i C\xE0 ph\xEA Bu\xF4n Ma Thu\u1ED9t & S\u1EF1 ki\u1EC7n V\u0103n h\xF3a**\n- **Th\u1EDDi gian th\u01B0\u1EDDng l\u1EC7:** T\u1ED5 ch\u1EE9c \u0111\u1ECBnh k\u1EF3 2 n\u0103m m\u1ED9t l\u1EA7n v\xE0o th\xE1ng 3 t\u1EA1i TP. Bu\xF4n Ma Thu\u1ED9t.\n- **Ho\u1EA1t \u0111\u1ED9ng n\u1ED5i b\u1EADt:** L\u1EC5 h\u1ED9i \u0111\u01B0\u1EDDng ph\u1ED1, th\u01B0\u1EDFng th\u1EE9c c\xE0 ph\xEA mi\u1EC5n ph\xED, h\u1ED9i thi pha ch\u1EBF Fine Robusta v\xE0 kh\xF4ng gian bi\u1EC3u di\u1EC5n c\u1ED3ng chi\xEAng T\xE2y Nguy\xEAn.";
    return tavilyRef ? `${festBase}${tavilyRef}` : festBase;
  }
  if (/(kotam|ko tam|khai doan|sac tu khai doan|chu yang sin|ho ea kao)/i.test(folded)) {
    const extLandmarkBase = isEn ? "Notable destinations around Bu\xF4n Ma Thu\u1ED9t include S\u1EAFc T\u1EE9 Kh\u1EA3i \u0110oan Pagoda (the largest historic royal-titled pagoda in \u0110\u1EAFk L\u1EAFk on Phan B\u1ED9i Ch\xE2u Street), KoTam Community Eco-Tourism Area (on National Highway 26, ~8 km from BMT center with gardens, bamboo architecture, and local cuisine), Ea Kao Lake (~12 km south of BMT center), and Ch\u01B0 Yang Sin National Park (renowned for cloud-forest trekking and biodiversity)." : "C\xE1c \u0111i\u1EC3m tham quan n\u1ED5i ti\u1EBFng quanh Bu\xF4n Ma Thu\u1ED9t g\u1ED3m Ch\xF9a S\u1EAFc T\u1EE9 Kh\u1EA3i \u0110oan (ng\xF4i ch\xF9a l\u1EDBn v\xE0 c\u1ED5 k\xEDnh nh\u1EA5t \u0110\u1EAFk L\u1EAFk tr\xEAn \u0111\u01B0\u1EDDng Phan B\u1ED9i Ch\xE2u), Khu du l\u1ECBch sinh th\xE1i c\u1ED9ng \u0111\u1ED3ng KoTam (tr\xEAn Qu\u1ED1c l\u1ED9 26, c\xE1ch trung t\xE2m ~8 km v\u1EDBi v\u01B0\u1EDDn hoa, b\u1EBFn n\u01B0\u1EDBc v\xE0 \u1EA9m th\u1EF1c T\xE2y Nguy\xEAn), H\u1ED3 Ea Kao (c\xE1ch trung t\xE2m ~12 km v\u1EC1 ph\xEDa Nam) v\xE0 V\u01B0\u1EDDn Qu\u1ED1c gia Ch\u01B0 Yang Sin (\u0111i\u1EC3m trekking r\u1EEBng nguy\xEAn sinh n\u1ED5i ti\u1EBFng).";
    return tavilyRef ? `${extLandmarkBase} ${tavilyRef}` : extLandmarkBase;
  }
  if (/(van hoa|cong chieng|dan toc|e de|m'nong|mnong|nha dai|mau he|lich su|history|culture|gong)/i.test(folded)) {
    const cultureBase = isEn ? "\u0110\u1EAFk L\u1EAFk is home to 49 ethnic groups, notably the indigenous \xCA \u0110\xEA (known for matriarchal longhouses, Kpan benches, and epic Khan storytelling in villages like Ako Dh\xF4ng) and M\u2019n\xF4ng communities around L\u1EAFk Lake and Bu\xF4n \u0110\xF4n. The Space of Gong Culture in the Central Highlands is recognized by UNESCO as an Intangible Cultural Heritage of Humanity." : "\u0110\u1EAFk L\u1EAFk l\xE0 n\u01A1i h\u1ED9i t\u1EE5 c\u1EE7a 49 d\xE2n t\u1ED9c anh em, ti\xEAu bi\u1EC3u l\xE0 ng\u01B0\u1EDDi \xCA \u0110\xEA (v\u1EDBi truy\u1EC1n th\u1ED1ng m\u1EABu h\u1EC7, ki\u1EBFn tr\xFAc nh\xE0 d\xE0i, gh\u1EBF Kpan v\xE0 s\u1EED thi \u0110am San t\u1EA1i c\xE1c bu\xF4n c\u1ED5 nh\u01B0 Ako Dh\xF4ng) c\xF9ng ng\u01B0\u1EDDi M\u2019n\xF4ng v\xF9ng H\u1ED3 L\u1EAFk \u2013 Bu\xF4n \u0110\xF4n. Kh\xF4ng gian v\u0103n h\xF3a C\u1ED3ng chi\xEAng T\xE2y Nguy\xEAn \u0111\xE3 \u0111\u01B0\u1EE3c UNESCO c\xF4ng nh\u1EADn l\xE0 Di s\u1EA3n V\u0103n h\xF3a Phi v\u1EADt th\u1EC3 \u0110\u1EA1i di\u1EC7n c\u1EE7a Nh\xE2n lo\u1EA1i.";
    return tavilyRef ? `${cultureBase} ${tavilyRef}` : cultureBase;
  }
  if (tavilyRef) {
    return tavilyRef.trim();
  }
  const validSnippets = (options?.tavilySnippets || []).filter(
    (s) => typeof s?.content === "string" && s.content.trim().length > 0
  );
  if (validSnippets.length > 0) {
    const matchingLangSnippets = isEn ? validSnippets : validSnippets.filter((s) => !isLikelyEnglishText(s.content));
    const chosen = matchingLangSnippets.length > 0 ? matchingLangSnippets : validSnippets;
    if (isEn) {
      return chosen.slice(0, 2).map((s) => `- **${s.title}**: ${s.content}`).join("\n");
    }
    if (matchingLangSnippets.length > 0) {
      return `**Th\xF4ng tin tham kh\u1EA3o tr\u1EF1c tuy\u1EBFn:**
${matchingLangSnippets.slice(0, 2).map((s) => `- **${s.title}**: ${s.content}`).join("\n")}`;
    }
    return "H\u1EC7 th\u1ED1ng \u0111\xE3 t\xECm th\u1EA5y m\u1ED9t s\u1ED1 b\xE0i vi\u1EBFt tham kh\u1EA3o tr\u1EF1c tuy\u1EBFn (chi ti\u1EBFt ngu\u1ED3n \u0111\xEDnh k\xE8m b\xEAn d\u01B0\u1EDBi). B\u1EA1n c\xF3 th\u1EC3 m\u1EDF li\xEAn k\u1EBFt ngu\u1ED3n ho\u1EB7c h\u1ECFi c\u1EE5 th\u1EC3 h\u01A1n \u0111\u1EC3 m\xECnh t\u1ED5ng h\u1EE3p gi\xFAp b\u1EA1n nh\xE9!";
  }
  if (days.length > 0) {
    const totalStops = days.reduce((s, d) => s + d.slots.length, 0);
    const itinerarySummary = days.map(
      (d, i) => `${isEn ? `Day ${i + 1}` : `Ng\xE0y ${i + 1}`}: ${d.slots.map((s) => `${s.title} (${s.time})`).join(", ")}`
    ).join(" | ");
    return isEn ? `Your current ${req.currentState.duration} itinerary (${totalStops} stops total): ${itinerarySummary}. Seasonal context (${season.milestone}): ${season.subheadline}.` : `L\u1ECBch tr\xECnh ${req.currentState.duration} hi\u1EC7n t\u1EA1i c\u1EE7a b\u1EA1n g\u1ED3m ${totalStops} \u0111i\u1EC3m d\u1EEBng: ${itinerarySummary}. B\u1ED1i c\u1EA3nh m\xF9a (${season.milestone}): ${season.subheadline}.`;
  }
  return isEn ? "\u0110\u1EAFk L\u1EAFk highlights include B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA, Bu\xF4n c\u1ED5 Ako Dh\xF4ng, H\u1ED3 L\u1EAFk & Bu\xF4n Jun, Th\xE1c Dray Nur H\xF9ng V\u0129, and ethical elephant walks in V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n. Tell me your trip duration and style if you want a tailored itinerary!" : "C\xE1c \u0111i\u1EC3m n\u1ED5i b\u1EADt nh\u1EA5t t\u1EA1i \u0110\u1EAFk L\u1EAFk g\u1ED3m B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA, Bu\xF4n c\u1ED5 Ako Dh\xF4ng, H\u1ED3 L\u1EAFk & Bu\xF4n Jun, Th\xE1c Dray Nur H\xF9ng V\u0129 v\xE0 tr\u1EA3i nghi\u1EC7m \u0111i b\u1ED9 ng\u1EAFm voi t\u1EF1 nhi\xEAn \u1EDF V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n. B\u1EA1n c\xF3 th\u1EC3 cho m\xECnh bi\u1EBFt s\u1ED1 ng\xE0y & s\u1EDF th\xEDch \u0111\u1EC3 m\xECnh thi\u1EBFt k\u1EBF l\u1ECBch tr\xECnh ri\xEAng nh\xE9!";
}
function detectIntentDeterministic(req) {
  const lower = req.message.toLowerCase();
  const hasModifyVerb = /(thêm|bỏ|xóa|bớt|đổi điểm|thay điểm|add|remove|drop|swap|replace)/i.test(lower);
  const hasFullPlanVerb = /(lên lịch|lịch trình mới|thiết kế|tạo tour|lập kế hoạch|kế hoạch chuyến|plan a trip|create itinerary|new itinerary|build.*itinerary)/i.test(
    lower
  );
  const looksLikeTripPlanGoal = !isPrimaryAmenityOrInfoQuestion(lower) && (/(lên lịch|lịch trình|kế hoạch|plan.*trip|itinerary|muốn đi.*chơi|tư vấn.*lịch)/i.test(lower) || /(muốn đi|tư vấn.*đi)/i.test(lower) && !isQuestionOrInfoRequest(lower));
  if (req.isFollowUp && req.currentState.days.length > 0 && hasModifyVerb && !hasFullPlanVerb && !isPrimaryAmenityOrInfoQuestion(lower)) {
    return "modify_stops";
  }
  const looksLikeGeneralQa = !hasFullPlanVerb && (!hasModifyVerb || isPrimaryAmenityOrInfoQuestion(lower)) && !looksLikeTripPlanGoal && (isPrimaryAmenityOrInfoQuestion(lower) || isQuestionOrInfoRequest(lower) || /(mùa nào|thời tiết|bao giờ|tháng mấy|ở đâu|ăn gì|món gì|đặc sản|giá vé|bao xa|di chuyển|cách đi|có nên|lễ hội|văn hóa|lịch sử|sân bay|xe khách|what|when|where|which|how|weather|season|best time|tell me about)/i.test(
    lower
  ));
  if (looksLikeGeneralQa) {
    return "general_qa";
  }
  return "plan_trip";
}
function runPhase1IntakeDeterministic(req) {
  const draft = req.draftIntake;
  const recentUserHistory = Array.isArray(req.history) ? req.history.slice(-2).map((h) => h.user).join(" ") : "";
  const hasDraft = Boolean(draft && Object.keys(draft).length > 0);
  const parseSourceText = hasDraft ? normalizeText(req.message) : [recentUserHistory, req.message].filter(Boolean).join(" ").trim();
  const msgTravelers = extractTravelersFromText(parseSourceText);
  const hasExplicitCompanionKeyword = /(độc hành|một mình|1 mình|đi riêng|solo|gia đình|bố mẹ|trẻ nhỏ|con nhỏ|ông bà|family|kids|children|nhóm bạn|bạn bè|hội bạn|team|friends|group|cặp đôi|người yêu|vợ chồng|lãng mạn|honeymoon|couple)/i.test(
    parseSourceText
  );
  const draftCompanion = draft?.companionType && VALID_COMPANIONS.includes(draft.companionType) ? draft.companionType : null;
  const companionType = hasExplicitCompanionKeyword ? msgTravelers.companionType : draftCompanion ?? msgTravelers.companionType;
  const draftCount = typeof draft?.travelersCount === "number" && Number.isFinite(draft.travelersCount) && draft.travelersCount >= 1 ? Math.round(draft.travelersCount) : null;
  const travelersCount = msgTravelers.travelersCount ?? draftCount ?? inferTravelersCountFromCompanion(companionType);
  const msgBudget = extractBudgetVndFromText(parseSourceText, travelersCount);
  const msgDates = extractDatesAndDurationFromText(parseSourceText);
  const draftMainPurpose = draft?.mainPurpose && VALID_THEMES.includes(draft.mainPurpose) ? draft.mainPurpose : null;
  const msgPurpose = extractPurposeFromText(
    parseSourceText,
    draftMainPurpose || req.currentState.theme
  );
  const draftMissing = Array.isArray(draft?.missingFields) ? draft.missingFields : null;
  const draftHasBudget = Boolean(
    draft && (typeof draft.totalBudgetVnd === "number" && Number.isFinite(draft.totalBudgetVnd) && draft.totalBudgetVnd >= 3e5 || (draftMissing ? !draftMissing.includes("budget") : Boolean(draft.budgetTier && VALID_BUDGETS.includes(draft.budgetTier))))
  );
  const draftHasDates = Boolean(
    draft && (draftMissing ? !draftMissing.includes("dates") : Boolean(
      typeof draft.travelDates === "string" && draft.travelDates.trim() || draft.duration && VALID_DURATIONS.includes(draft.duration)
    ))
  );
  const draftHasTravelers = Boolean(
    draft && ((draftMissing ? !draftMissing.includes("travelers") : false) || draftCount !== null || draftCompanion !== null)
  );
  const hasBudgetInfo = msgBudget.explicitMention || draftHasBudget;
  const hasDatesInfo = msgDates.explicitMention || draftHasDates;
  const hasTravelersInfo = msgTravelers.explicitMention || draftHasTravelers || travelersCount !== null || companionType !== null;
  let intent = detectIntentDeterministic(req);
  const isDirectQuestionWhileClarifying = Boolean(draft?.needsClarification) && isPrimaryAmenityOrInfoQuestion(req.message) && !/(lên lịch|lập kế hoạch|thiết kế lịch|tạo lịch|tạo tour|plan.*trip|create itinerary|build.*itinerary)/i.test(
    req.message
  );
  if (draft?.needsClarification && !isDirectQuestionWhileClarifying && (msgBudget.explicitMention || msgDates.explicitMention || msgTravelers.explicitMention)) {
    intent = "plan_trip";
  }
  const isKnownPreset = sampleSchedulePresets.some(
    (p) => p.prompt.trim().toLowerCase() === req.message.trim().toLowerCase()
  );
  const missingFields = [];
  if (intent === "plan_trip" && !isKnownPreset) {
    const hasActivePlanner = req.isFollowUp && req.currentState.days.length > 0;
    if (!hasActivePlanner) {
      if (!hasBudgetInfo) missingFields.push("budget");
      if (!hasDatesInfo) missingFields.push("dates");
      if (!hasTravelersInfo) missingFields.push("travelers");
    }
  }
  const needsClarification = intent === "plan_trip" && missingFields.length > 0;
  const draftDuration = draft?.duration && VALID_DURATIONS.includes(draft.duration) ? draft.duration : null;
  const duration = msgDates.duration || draftDuration || req.currentState.duration || "3N2D";
  const draftBudgetVnd = typeof draft?.totalBudgetVnd === "number" && Number.isFinite(draft.totalBudgetVnd) && draft.totalBudgetVnd >= 3e5 ? Math.round(draft.totalBudgetVnd) : null;
  const totalBudgetVnd = msgBudget.totalBudgetVnd ?? draftBudgetVnd;
  const draftBudgetTier = draft?.budgetTier && VALID_BUDGETS.includes(draft.budgetTier) && draftHasBudget ? draft.budgetTier : null;
  const budgetTier = msgBudget.budgetTier || draftBudgetTier || req.currentState.budget || "standard";
  const draftTravelDates = draftHasDates && typeof draft?.travelDates === "string" && draft.travelDates.trim() ? draft.travelDates.trim() : null;
  let travelDates = null;
  if (draftTravelDates && msgDates.travelDates) {
    const mergedHints = Array.from(
      /* @__PURE__ */ new Set([
        ...draftTravelDates.split("\u2022").map((s) => s.trim()).filter(Boolean),
        ...msgDates.travelDates.split("\u2022").map((s) => s.trim()).filter(Boolean)
      ])
    );
    travelDates = mergedHints.join(" \u2022 ");
  } else {
    travelDates = msgDates.travelDates || draftTravelDates || duration;
  }
  const draftInterests = Array.isArray(draft?.secondaryInterests) ? draft.secondaryInterests.map((s) => String(s).trim()).filter(Boolean) : [];
  const secondaryInterests = Array.from(
    /* @__PURE__ */ new Set([...draftInterests, ...msgPurpose.secondaryInterests])
  );
  const rawUserGoal = draft?.rawUserGoal && draft.rawUserGoal.trim() && draft.rawUserGoal.trim() !== normalizeText(req.message) ? `${draft.rawUserGoal.trim()} \u2014 ${normalizeText(req.message)}` : normalizeText(req.message);
  const intake = {
    intent,
    travelersCount,
    companionType,
    travelDates,
    duration,
    totalBudgetVnd,
    budgetTier,
    mainPurpose: msgPurpose.mainPurpose,
    secondaryInterests,
    missingFields,
    needsClarification,
    clarificationQuestion: needsClarification ? buildClarificationQuestion(req.lang, missingFields) : void 0,
    rawUserGoal
  };
  return {
    intake,
    stopOperations: [],
    provider: "local-fallback"
  };
}
var PHASE1_INTAKE_SCHEMA = {
  type: "OBJECT",
  properties: {
    intent: { type: "STRING", enum: ["general_qa", "plan_trip", "modify_stops"] },
    travelersCount: { type: "INTEGER", nullable: true },
    companionType: {
      type: "STRING",
      enum: ["solo", "couple", "family", "friends"],
      nullable: true
    },
    travelDates: { type: "STRING", nullable: true },
    duration: { type: "STRING", enum: ["2N1D", "3N2D", "4N3D+"] },
    totalBudgetVnd: { type: "INTEGER", nullable: true },
    budgetTier: { type: "STRING", enum: ["budget", "standard", "luxury"] },
    mainPurpose: { type: "STRING", enum: ["coffee", "culture", "nature", "cuisine"] },
    secondaryInterests: { type: "ARRAY", items: { type: "STRING" } },
    hasBudgetInfo: { type: "BOOLEAN" },
    hasDatesInfo: { type: "BOOLEAN" },
    hasTravelersInfo: { type: "BOOLEAN" },
    clarificationQuestion: { type: "STRING", nullable: true },
    generalQaReply: { type: "STRING", nullable: true },
    stopOperations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          action: { type: "STRING", enum: ["add", "remove"] },
          placeTitle: { type: "STRING" },
          dayNumber: { type: "INTEGER" },
          time: { type: "STRING" },
          period: { type: "STRING" }
        },
        required: ["action", "placeTitle"]
      }
    }
  },
  required: [
    "intent",
    "duration",
    "budgetTier",
    "mainPurpose",
    "secondaryInterests",
    "hasBudgetInfo",
    "hasDatesInfo",
    "hasTravelersInfo"
  ]
};
async function runPhase1Intake(req, options) {
  return withOpenInferenceSpan(
    "phase1_intake",
    {
      kind: OpenInferenceSpanKind3.CHAIN,
      input: {
        message: req.message,
        lang: req.lang,
        isFollowUp: req.isFollowUp,
        currentState: req.currentState
      },
      formatOutput: (out) => ({
        intent: out.intake.intent,
        needsClarification: out.intake.needsClarification,
        missingFields: out.intake.missingFields,
        provider: out.provider
      })
    },
    async () => {
      const deterministic = runPhase1IntakeDeterministic(req);
      const apiKey = GEMINI_API_KEY.trim();
      if (!apiKey) {
        return deterministic;
      }
      const model = GEMINI_MODEL.trim() || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const shouldInjectQaContext = deterministic.intake.intent === "general_qa" || isQuestionOrInfoRequest(req.message) || isPrimaryAmenityOrInfoQuestion(req.message);
      const groundedQaCtx = shouldInjectQaContext ? await loadGroundedQaContext() : null;
      const tavilyQaCtx = shouldInjectQaContext ? await maybeFetchTavilyQaContext(req.message, {
        enableTavily: options?.enableTavily,
        tavilyClient: options?.tavilyClient
      }) : { snippets: [], citations: [] };
      const effectiveQaLang = resolveEffectiveQaLanguage(req.message, req.lang);
      const systemText = [
        'You are Phase 1 Intake Classifier & Extractor for "\u0110\u1EAFk L\u1EAFk AI Travel Concierge".',
        `UI language: "${req.lang}". Target Q&A reply language: "${effectiveQaLang}".`,
        "Classify intent into:",
        '- "general_qa": user asks a question (?, "c\xF3 ... kh\xF4ng", "bao nhi\xEAu", "\u1EDF \u0111\xE2u", "c\u1EA7n gi\u1EA5y t\u1EDD g\xEC", "review", "t\u01B0 v\u1EA5n", "gi\u1EDBi thi\u1EC7u") about stays/homestays/resorts & amenities/prices, transport/flights/buses/rental requirements, places, external landmarks, seasons, weather, culture, festivals, dishes, or travel tips without requesting a full trip plan or explicit itinerary edit.',
        '- "modify_stops": user wants to add/remove/swap specific stops in an existing itinerary (only when currentItinerary has days and the message is an explicit stop edit command, NOT primarily an info/amenity question).',
        '- "plan_trip": user wants a trip itinerary planned, advised for a multi-day trip ("mu\u1ED1n \u0111i ... ch\u01A1i v\xE0i ng\xE0y", "l\xEAn l\u1ECBch tr\xECnh"), or regenerated.',
        "Extract travelersCount, companionType, travelDates, duration (2N1D/3N2D/4N3D+), totalBudgetVnd (numeric VND if stated), budgetTier, mainPurpose (coffee/culture/nature/cuisine), secondaryInterests.",
        "When draftIntake is provided, preserve all previously collected slots (companionType, travelersCount, travelDates, duration, totalBudgetVnd, budgetTier, mainPurpose, secondaryInterests) unless userMessage explicitly changes them.",
        "CRITICAL Honesty check rules (NEVER copy currentState defaults to mark these true!):",
        "- hasBudgetInfo = true ONLY if userMessage, draftIntake, or recentHistory explicitly states a budget amount or tier (budget/standard/luxury/ti\u1EBFt ki\u1EC7m/cao c\u1EA5p/tri\u1EC7u).",
        '- hasDatesInfo = true ONLY if userMessage, draftIntake, or recentHistory explicitly states trip length (e.g. 2N1D, 3 ng\xE0y \u2014 NOT vague "v\xE0i ng\xE0y") or month/dates/season.',
        '- hasTravelersInfo = true ONLY if userMessage, draftIntake, or recentHistory explicitly states traveler count or companion type (solo/couple/family/friends). First-person pronouns like "m\xECnh" or "t\xF4i" alone do NOT imply solo travel \u2014 return null for companionType and travelersCount if unstated.',
        'If intent is "general_qa", write a helpful, factual, ethical (no elephant riding) answer in "generalQaReply":',
        `- CRITICAL LANGUAGE RULE: Write 100% of "generalQaReply" in ${effectiveQaLang === "vi" ? "natural, fluent Vietnamese" : "natural, fluent English"} matching the user's message. If "tavilyLiveWebAnswer" or "tavilyLiveWebSnippets" are in English and target language is "vi", ALWAYS translate and synthesize those facts into natural Vietnamese \u2014 NEVER paste English sentences or phrases into a Vietnamese reply.`,
        '- FORMATTING RULE: Structure "generalQaReply" for easy reading using clean Markdown: start with a 1\u20132 sentence direct summary, followed by bullet points ("- **Label**: detail") for prices, schedules, amenities, or practical tips, separated by blank lines (never one dense wall of text).',
        "- Synthesize grounded local data (stays, logistics, dakLakPlaceDirectory, seasonsData) AND live web search context (tavilyLiveWebAnswer, tavilyLiveWebSnippets) when provided, supplemented by accurate \u0110\u1EAFk L\u1EAFk travel knowledge for external landmarks, transport, festivals, or general questions.",
        "- CRITICAL HONESTY FOR INTERNAL CATALOG STAYS: If asked whether a specific stay in `stays` has an amenity (e.g. swimming pool / h\u1ED3 b\u01A1i), price, or rental requirement that is NOT listed/confirmed in `stays` or `tavilyLiveWebSnippets`, honestly state that it is not listed/confirmed in our data, list its actual recorded amenities, and suggest relevant alternatives from `stays` if appropriate.",
        'If intent is "plan_trip" and any of hasBudgetInfo/hasDatesInfo/hasTravelersInfo is false, write a concise targeted question in "clarificationQuestion" asking for ALL missing details.'
      ].join("\n");
      const historySnippet = (req.history || []).slice(-4).map((h) => `User: ${h.user}
Assistant: ${h.reply}`).join("\n");
      const prompt = [
        `isFollowUp: ${req.isFollowUp}`,
        `hasExistingDays: ${req.currentState.days.length > 0}`,
        `currentState: theme=${req.currentState.theme}, duration=${req.currentState.duration}, companion=${req.currentState.companion}, budget=${req.currentState.budget}`,
        req.draftIntake ? `draftIntake: ${JSON.stringify(req.draftIntake)}` : "",
        groundedQaCtx ? `stays:
${JSON.stringify(groundedQaCtx.stays)}` : "",
        groundedQaCtx ? `logistics:
${JSON.stringify(groundedQaCtx.logistics)}` : "",
        groundedQaCtx ? `dakLakPlaceDirectory:
${JSON.stringify(groundedQaCtx.places)}` : "",
        groundedQaCtx ? `seasonsData:
${JSON.stringify(groundedQaCtx.seasons)}` : "",
        tavilyQaCtx.answer ? `tavilyLiveWebAnswer:
${tavilyQaCtx.answer}` : "",
        tavilyQaCtx.snippets.length > 0 ? `tavilyLiveWebSnippets:
${JSON.stringify(tavilyQaCtx.snippets)}` : "",
        historySnippet ? `recentHistory:
${historySnippet}` : "",
        `userMessage: ${req.message}`
      ].filter(Boolean).join("\n\n");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(15e3, AI_CHAT_TIMEOUT_MS));
      try {
        const llmCall = await withOpenInferenceSpan(
          "gemini_phase1_intake",
          {
            kind: OpenInferenceSpanKind3.LLM,
            input: prompt,
            attributes: {
              [LLM_MODEL_NAME]: model,
              [LLM_PROVIDER]: "google",
              [LLM_SYSTEM]: "gemini",
              [`${SemanticConventions2.LLM_INPUT_MESSAGES}.0.${SemanticConventions2.MESSAGE_ROLE}`]: "system",
              [`${SemanticConventions2.LLM_INPUT_MESSAGES}.0.${SemanticConventions2.MESSAGE_CONTENT}`]: systemText,
              [`${SemanticConventions2.LLM_INPUT_MESSAGES}.1.${SemanticConventions2.MESSAGE_ROLE}`]: "user",
              [`${SemanticConventions2.LLM_INPUT_MESSAGES}.1.${SemanticConventions2.MESSAGE_CONTENT}`]: prompt
            },
            formatOutput: (res) => res.rawText,
            onSuccess: (span, res) => {
              span.setAttribute(
                `${SemanticConventions2.LLM_OUTPUT_MESSAGES}.0.${SemanticConventions2.MESSAGE_ROLE}`,
                "assistant"
              );
              span.setAttribute(
                `${SemanticConventions2.LLM_OUTPUT_MESSAGES}.0.${SemanticConventions2.MESSAGE_CONTENT}`,
                res.rawText
              );
              if (res.usage?.promptTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_PROMPT, res.usage.promptTokenCount);
              }
              if (res.usage?.candidatesTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_COMPLETION, res.usage.candidatesTokenCount);
              }
              if (res.usage?.totalTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_TOTAL, res.usage.totalTokenCount);
              }
            }
          },
          async () => {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.15,
                  maxOutputTokens: 1024,
                  responseMimeType: "application/json",
                  responseSchema: PHASE1_INTAKE_SCHEMA
                }
              })
            });
            if (!response.ok) {
              const errBody = await response.text().catch(() => "");
              throw new Error(`Gemini Phase 1 HTTP ${response.status}: ${errBody.slice(0, 200)}`);
            }
            const data = await response.json();
            const rawText2 = (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("").trim();
            return { rawText: rawText2, usage: data.usageMetadata };
          }
        );
        const { rawText } = llmCall;
        if (!rawText) return deterministic;
        const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(jsonText);
        const looksLikeTripPlanGoal = !isPrimaryAmenityOrInfoQuestion(req.message) && /(muốn đi.*chơi|lên lịch|lịch trình|tư vấn.*đi|chơi.*ngày|kế hoạch|plan.*trip|itinerary)/i.test(
          req.message
        );
        const isLockedGeneralQa = deterministic.intake.intent === "general_qa" && !looksLikeTripPlanGoal && (isPrimaryAmenityOrInfoQuestion(req.message) || isQuestionOrInfoRequest(req.message));
        const intent = isLockedGeneralQa ? "general_qa" : (req.draftIntake?.needsClarification || looksLikeTripPlanGoal) && deterministic.intake.intent === "plan_trip" ? "plan_trip" : parsed.intent === "general_qa" || parsed.intent === "modify_stops" || parsed.intent === "plan_trip" ? parsed.intent : deterministic.intake.intent;
        const duration = extractDatesAndDurationFromText(req.message).duration || (VALID_DURATIONS.includes(parsed.duration) ? parsed.duration : deterministic.intake.duration);
        const msgBudgetCheck = extractBudgetVndFromText(
          req.message,
          deterministic.intake.travelersCount
        );
        const budgetTier = msgBudgetCheck.budgetTier ? msgBudgetCheck.budgetTier : VALID_BUDGETS.includes(parsed.budgetTier) && (msgBudgetCheck.explicitMention || !req.draftIntake) ? parsed.budgetTier : deterministic.intake.budgetTier;
        const msgHasPurpose = /(cà phê|coffee|robusta|cupping|văn hóa|cồng chiêng|bảo tàng|culture|thác|yok đôn|rừng|hồ lắk|nature|ẩm thực|ăn uống|món ăn|food|cuisine)/i.test(
          req.message
        );
        const mainPurpose = !msgHasPurpose && req.draftIntake?.mainPurpose ? deterministic.intake.mainPurpose : VALID_THEMES.includes(parsed.mainPurpose) ? parsed.mainPurpose : deterministic.intake.mainPurpose;
        const hasDeterministicTravelers = !deterministic.intake.missingFields.includes("travelers");
        const msgHasCompanion = /(độc hành|một mình|1 mình|đi riêng|solo|gia đình|bố mẹ|trẻ nhỏ|con nhỏ|ông bà|family|kids|children|nhóm bạn|bạn bè|hội bạn|team|friends|group|cặp đôi|người yêu|vợ chồng|lãng mạn|honeymoon|couple)/i.test(
          req.message
        );
        const companionType = !hasDeterministicTravelers ? null : !msgHasCompanion && req.draftIntake?.companionType ? deterministic.intake.companionType : VALID_COMPANIONS.includes(parsed.companionType) ? parsed.companionType : deterministic.intake.companionType;
        const rawParsedTravelers = hasDeterministicTravelers && typeof parsed.travelersCount === "number" && Number.isFinite(parsed.travelersCount) && parsed.travelersCount >= 1 ? Math.round(parsed.travelersCount) : null;
        const travelersCount = !hasDeterministicTravelers ? null : rawParsedTravelers ?? deterministic.intake.travelersCount ?? inferTravelersCountFromCompanion(companionType);
        const hasDeterministicBudget = !deterministic.intake.missingFields.includes("budget");
        const totalBudgetVnd = typeof parsed.totalBudgetVnd === "number" && Number.isFinite(parsed.totalBudgetVnd) && parsed.totalBudgetVnd >= 3e5 ? Math.round(parsed.totalBudgetVnd) : deterministic.intake.totalBudgetVnd;
        const hasDeterministicDates = !deterministic.intake.missingFields.includes("dates");
        const travelDates = !hasDeterministicDates ? deterministic.intake.travelDates : typeof parsed.travelDates === "string" && parsed.travelDates.trim() ? parsed.travelDates.trim() : deterministic.intake.travelDates;
        const parsedInterests = Array.isArray(parsed.secondaryInterests) ? parsed.secondaryInterests.map((s) => String(s).trim()).filter(Boolean) : [];
        const secondaryInterests = Array.from(
          /* @__PURE__ */ new Set([...deterministic.intake.secondaryInterests, ...parsedInterests])
        );
        const isKnownPreset = sampleSchedulePresets.some(
          (p) => p.prompt.trim().toLowerCase() === req.message.trim().toLowerCase()
        );
        const hasActivePlanner = req.isFollowUp && req.currentState.days.length > 0;
        const hasBudgetInfo = hasDeterministicBudget || totalBudgetVnd !== null;
        const hasDatesInfo = hasDeterministicDates;
        const hasTravelersInfo = hasDeterministicTravelers || travelersCount !== null || companionType !== null;
        const missingFields = [];
        if (intent === "plan_trip" && !isKnownPreset && !hasActivePlanner) {
          if (!hasBudgetInfo) missingFields.push("budget");
          if (!hasDatesInfo) missingFields.push("dates");
          if (!hasTravelersInfo) missingFields.push("travelers");
        }
        const needsClarification = intent === "plan_trip" && missingFields.length > 0;
        const clarificationQuestion = needsClarification ? typeof parsed.clarificationQuestion === "string" && parsed.clarificationQuestion.trim() ? parsed.clarificationQuestion.trim() : buildClarificationQuestion(req.lang, missingFields) : void 0;
        const stopOperations = Array.isArray(parsed.stopOperations) ? parsed.stopOperations.slice(0, 6).filter((op) => Boolean(op && typeof op === "object")).map((op) => ({
          action: op.action === "remove" ? "remove" : "add",
          placeTitle: String(op.placeTitle || "").trim(),
          dayNumber: typeof op.dayNumber === "number" && Number.isFinite(op.dayNumber) ? Math.max(1, Math.min(4, Math.round(op.dayNumber))) : void 0,
          time: typeof op.time === "string" && op.time.trim() ? op.time.trim() : void 0,
          period: typeof op.period === "string" && op.period.trim() ? op.period.trim() : void 0
        })).filter((op) => op.placeTitle.length > 0) : [];
        return {
          intake: {
            intent,
            travelersCount,
            companionType,
            travelDates,
            duration,
            totalBudgetVnd,
            budgetTier,
            mainPurpose,
            secondaryInterests,
            missingFields,
            needsClarification,
            clarificationQuestion,
            rawUserGoal: deterministic.intake.rawUserGoal
          },
          stopOperations,
          generalQaReply: typeof parsed.generalQaReply === "string" && parsed.generalQaReply.trim() ? parsed.generalQaReply.trim() : void 0,
          ...tavilyQaCtx.citations.length > 0 ? { citations: tavilyQaCtx.citations } : {},
          ...tavilyQaCtx.snippets.length > 0 ? { tavilySnippets: tavilyQaCtx.snippets } : {},
          ...tavilyQaCtx.answer ? { tavilyAnswer: tavilyQaCtx.answer } : {},
          provider: `gemini-ai:${model}`
        };
      } catch {
        return deterministic;
      } finally {
        clearTimeout(timer);
      }
    }
  );
}

// server/services/ai/workflow/followUpRouter.ts
var VALID_ACTIONS = [
  "modify_stops",
  "adjust_budget",
  "swap_logistics",
  "reorder_or_pace",
  "current_trip_qa",
  "full_replan"
];
var AREA_ADJACENCY = {
  BMT: ["BMT", "Ea Kao", "Dray Nur", "H\u1ED3 L\u1EAFk", "Bu\xF4n \u0110\xF4n", "Kr\xF4ng N\u0103ng"],
  "H\u1ED3 L\u1EAFk": ["H\u1ED3 L\u1EAFk", "Ea Kao", "BMT", "Dray Nur", "Ch\u01B0 Yang Sin"],
  "Ea Kao": ["Ea Kao", "BMT", "H\u1ED3 L\u1EAFk", "Dray Nur"],
  "Dray Nur": ["Dray Nur", "BMT", "Ea Kao", "H\u1ED3 L\u1EAFk", "Bu\xF4n \u0110\xF4n"],
  "Bu\xF4n \u0110\xF4n": ["Bu\xF4n \u0110\xF4n", "BMT", "Dray Nur"],
  "Kr\xF4ng N\u0103ng": ["Kr\xF4ng N\u0103ng", "BMT", "Ea Kao"],
  "Ch\u01B0 Yang Sin": ["Ch\u01B0 Yang Sin", "H\u1ED3 L\u1EAFk", "BMT"]
};
var PLACE_SHORT_ALIASES = [
  { keywords: ["b\u1EA3o t\xE0ng th\u1EBF gi\u1EDBi c\xE0 ph\xEA", "th\u1EBF gi\u1EDBi c\xE0 ph\xEA"], title: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA" },
  { keywords: ["trung nguy\xEAn", "l\xE0ng c\xE0 ph\xEA"], title: "L\xE0ng C\xE0 ph\xEA Trung Nguy\xEAn" },
  { keywords: ["ako dh\xF4ng", "ako dhong", "ak\xF4 \u0111h\xF4ng"], title: "Bu\xF4n c\u1ED5 Ako Dh\xF4ng" },
  { keywords: ["b\u1EA3o t\xE0ng \u0111\u1EAFk l\u1EAFk", "b\u1EA3o t\xE0ng dak lak"], title: "B\u1EA3o t\xE0ng \u0110\u1EAFk L\u1EAFk" },
  { keywords: ["ea t\xE2n", "ea tan", "n\xF4ng tr\u1EA1i"], title: "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n" },
  { keywords: ["\u0111\xE1 voi", "da voi", "yang tao"], title: "\u0110\xE1 Voi M\u1EB9 Yang Tao" },
  { keywords: ["h\u1ED3 l\u1EAFk", "ho lak", "bu\xF4n jun", "buon jun"], title: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun" },
  { keywords: ["bi\u1EC7t \u0111i\u1EC7n", "biet dien", "b\u1EA3o \u0111\u1EA1i"], title: "\u0110\u1ED3i Bi\u1EC7t \u0111i\u1EC7n B\u1EA3o \u0110\u1EA1i" },
  { keywords: ["dray nur", "th\xE1c dray", "dray s\xE1p"], title: "Th\xE1c Dray Nur H\xF9ng V\u0129" },
  { keywords: ["yok \u0111\xF4n", "yok don", "v\u01B0\u1EDDn qu\u1ED1c gia"], title: "V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n" },
  { keywords: ["t\u01A1ng j\xFA", "tong ju", "d\u1EC7t th\u1ED5 c\u1EA9m", "th\u1ED5 c\u1EA9m"], title: "L\xE0ng D\u1EC7t Th\u1ED5 C\u1EA9m T\u01A1ng J\xFA" },
  { keywords: ["phan \u0111\xECnh gi\xF3t", "phan dinh giot", "ph\u1ED1 \u1EA9m th\u1EF1c"], title: "Ph\u1ED1 \u1EA8m th\u1EF1c Phan \u0110\xECnh Gi\xF3t" },
  { keywords: ["b\u1EA3n \u0111\xF4n", "ban don", "c\u1EA7u treo", "s\xEAr\xEAp\u1ED1k"], title: "C\u1EA7u Treo S\xEAr\xEAp\u1ED1k B\u1EA3n \u0110\xF4n" }
];
function getCompactDirectory() {
  return dakLakPlaceDirectory.map((meta) => {
    const inferred = inferPlaceMetadata(meta);
    return {
      title: meta.title,
      category: meta.category,
      areaCluster: inferred.areaCluster,
      themeTags: inferred.themeTags,
      time: meta.time,
      period: meta.period,
      location: meta.location,
      meta
    };
  });
}
function getDayCountFromState(req) {
  if (req.currentState.days.length > 0) return req.currentState.days.length;
  if (req.currentState.duration === "2N1D") return 2;
  if (req.currentState.duration === "4N3D+") return 4;
  return 3;
}
function getTravelersHintFromState(req) {
  const comp = req.currentState.companion;
  if (comp === "solo") return 1;
  if (comp === "couple") return 2;
  return 4;
}
function buildBasePreferences(req) {
  return {
    theme: req.currentState.theme,
    duration: req.currentState.duration,
    companion: req.currentState.companion,
    budget: req.currentState.budget
  };
}
function classifyFollowUpActionDeterministic(req) {
  const lower = req.message.toLowerCase().trim();
  const isQuestion = isQuestionOrInfoRequest(lower);
  const isPrimaryInfoQ = isPrimaryAmenityOrInfoQuestion(lower);
  const hasExplicitFullReplanVerb = !isPrimaryInfoQ && !isQuestion && /(lên lại|tạo lại|làm lại|thiết kế lại|xây lại|đổi toàn bộ|lịch trình mới|kế hoạch mới|làm mới lịch|replan|rebuild|start over|new itinerary|from scratch)/i.test(
    lower
  );
  const durationChangeMatch = lower.match(/(2n1[đd]|2\s*ngày|2d1n|3n2[đd]|3\s*ngày|3d2n|4n3[đd]|4\s*ngày|5\s*ngày|4d3n)/i);
  const mentionsDifferentDuration = Boolean(
    durationChangeMatch && (/(2n1[đd]|2\s*ngày|2d1n)/i.test(durationChangeMatch[1]) && req.currentState.duration !== "2N1D" || /(3n2[đd]|3\s*ngày|3d2n)/i.test(durationChangeMatch[1]) && req.currentState.duration !== "3N2D" || /(4n3[đd]|4\s*ngày|5\s*ngày|4d3n)/i.test(durationChangeMatch[1]) && req.currentState.duration !== "4N3D+") && /(đổi|chuyển|thành|sang|lên|tạo|muốn|change|switch|plan|make)/i.test(lower) && !/(ngày\s*[1-4]|day\s*[1-4])/i.test(lower) && !isPrimaryInfoQ && !isQuestion
  );
  const mentionsFullThemeChange = /(chủ đề|phong cách|theme|style)/i.test(lower) && /(đổi|chuyển|sang|thành|change|switch)/i.test(lower) && !isPrimaryInfoQ && !isQuestion;
  if (hasExplicitFullReplanVerb || mentionsDifferentDuration || mentionsFullThemeChange) {
    return "full_replan";
  }
  const isReorderOrPace = !isPrimaryInfoQ && !isQuestion && /(tối ưu tuyến|tối ưu đường|đỡ vòng vèo|sắp xếp lại|xếp lại thứ tự|đảo ngược|đổi chỗ|hoán đổi|đổi thứ tự|giảm nhịp|đi chậm hơn|thư giãn hơn|reorder|optimize.*route|reverse|swap slots|pace)/i.test(
    lower
  );
  if (isReorderOrPace) {
    return "reorder_or_pace";
  }
  const mentionsStayOrTransport = /(xe máy|mô tô|ô tô|tự lái|xe riêng|tài xế|xe buýt|shuttle|phương tiện|di chuyển bằng|khách sạn|homestay|resort|bungalow|villa|chỗ ở|nơi ở|lưu trú|nghỉ đêm|ngủ ở|tented camp|mường thanh|elephants|ako dhông|stay|hotel|accommodation|motorbike|scooter|car|transport|driver)/i.test(
    lower
  );
  const hasExplicitLogisticsSwapCmd = /(đổi\s*(?:sang|qua|thành|về|chỗ ở|khách sạn|homestay|lưu trú|xe|phương tiện)|chuyển\s*(?:sang|qua|thành|về|chỗ ở|khách sạn|homestay|lưu trú|xe)|thay\s*(?:bằng|sang|đổi)|cập nhật\s*(?:lưu trú|chỗ ở|khách sạn|homestay|phương tiện|di chuyển)|switch\s+(?:stay|hotel|accommodation|transport|to)|change\s+(?:stay|hotel|accommodation|transport|to)|replace\s+.*\s+with)/i.test(
    lower
  );
  const hasLogisticsActionVerb = hasExplicitLogisticsSwapCmd || !isQuestion && !isPrimaryInfoQ && /(?:ngủ ở|nghỉ ở|lưu trú ở|đi bằng|\bthuê\b|\bdùng\b|\bsang\b|\bđổi\b|\bchuyển\b|\bthay\b|\bswitch\b|\bchange\b|\buse\b|\brent\b|\bmove\b)/iu.test(
    lower
  );
  const isPureAllocationPct = /(\d+\s*%|phần trăm|tỷ lệ|tỉ lệ|phân bổ)/i.test(lower) || /(tăng|giảm)/i.test(lower) && /(ăn uống|tiền phòng|hoạt động|di chuyển)/i.test(lower) && !/(xe máy|ô tô|xe riêng|xe buýt|homestay|resort|bungalow|hồ lắk|ea kao)/i.test(lower);
  const isExplicitExpenseLineOp = /(khoản chi|khoản|mục chi|chi phí)/i.test(lower);
  const blockedLogisticsBecauseQuestion = isQuestion && (!hasExplicitLogisticsSwapCmd || isPrimaryInfoQ) || isPrimaryInfoQ && !hasExplicitLogisticsSwapCmd;
  if (mentionsStayOrTransport && hasLogisticsActionVerb && !blockedLogisticsBecauseQuestion && !isPureAllocationPct && !isExplicitExpenseLineOp) {
    return "swap_logistics";
  }
  const mentionsBudgetOrExpense = /(ngân sách|chi phí|khoản chi|tiền phòng|lưu trú|ăn uống|hoạt động|phân bổ|tỉ lệ|tỷ lệ|budget|expense|cost|allocation|spend|%)/i.test(
    lower
  );
  const hasExplicitBudgetEditCmd = /(tăng|giảm|cắt|bớt|thêm\s*(?:chi phí|khoản)|xóa\s*(?:chi phí|khoản)|bỏ\s*(?:chi phí|khoản)|đổi\s*(?:ngân sách|tỷ lệ|tỉ lệ|phân bổ)|chuyển|chỉnh|cập nhật|xuống|lên|increase|decrease|reduce|adjust|set\s+budget|add\s+expense|remove\s+expense)/i.test(
    lower
  );
  const hasBudgetEditSignal = hasExplicitBudgetEditCmd || !isQuestion && !isPrimaryInfoQ && /(còn|\d+\s*%|\d+\s*(?:triệu|tr\b|k\b|m\b))/i.test(lower);
  const blockedBudgetBecauseQuestion = isQuestion && (!hasExplicitBudgetEditCmd || isPrimaryInfoQ);
  if (mentionsBudgetOrExpense && hasBudgetEditSignal && !blockedBudgetBecauseQuestion) {
    return "adjust_budget";
  }
  const hasStopModifyVerb = /(đổi|thay|thay thế|bỏ|xóa|bớt|gỡ|thêm|ghé|bổ sung|swap|replace|remove|drop|delete|add|include)/i.test(
    lower
  );
  const hasExplicitStopEditCmd = /(?:đổi|thay\s*thế|thay|swap|replace)\s+.+?\s+(?:sang|thành|bằng|qua|với|for|with|to)\s+/i.test(
    lower
  ) || /(?:^|[,.;]\s*)(?:thêm|bổ sung|bỏ|xóa|bớt|gỡ|add|remove|drop|delete)\s+/i.test(lower);
  const mentionsActiveSlot = req.currentState.days.some(
    (d) => d.slots.some((s) => {
      const titleLower = s.title.toLowerCase();
      const tokens = titleLower.split(/\s+/).filter((t) => t.length >= 3);
      return lower.includes(titleLower) || tokens.filter((t) => lower.includes(t)).length >= 2;
    })
  );
  const mentionsDirectoryOrCategory = PLACE_SHORT_ALIASES.some((a) => a.keywords.some((kw) => lower.includes(kw))) || /(địa điểm|điểm dừng|điểm đến|quán cà phê|cà phê|thác|bảo tàng|buôn|nhà hàng|quán ăn|place|stop|coffee|cafe|waterfall|museum|spot)/i.test(
    lower
  );
  const blockedStopsBecauseQuestion = isQuestion && (!hasExplicitStopEditCmd || isPrimaryInfoQ);
  if (hasStopModifyVerb && (mentionsActiveSlot || mentionsDirectoryOrCategory) && !blockedStopsBecauseQuestion) {
    return "modify_stops";
  }
  if (isQuestion || !hasStopModifyVerb) {
    return "current_trip_qa";
  }
  return "modify_stops";
}
async function classifyWithGeminiDecisions(req, fetchFn) {
  const decisionModel = GEMINI_DECISION_MODEL.trim();
  const apiKey = GEMINI_API_KEY.trim();
  if (!decisionModel || !apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4e3);
  try {
    const daysSummary = req.currentState.days.map((d, idx) => `Day ${idx + 1} (${d.day}): ${d.slots.map((s) => s.title).join(", ")}`).join("\n");
    const historySnippet = (req.history || []).slice(-4).map((h) => `User: ${h.user}
Assistant: ${h.reply}`).join("\n");
    const inputText = [
      `Current plan: theme=${req.currentState.theme}, duration=${req.currentState.duration}, companion=${req.currentState.companion}, budget=${req.currentState.budget}`,
      `Current days:
${daysSummary}`,
      historySnippet ? `Recent conversation:
${historySnippet}` : "",
      `Follow-up message: ${req.message}`
    ].filter(Boolean).join("\n\n");
    const response = await fetchFn("https://generativelanguage.googleapis.com/v1beta/decisions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: decisionModel,
        input: inputText,
        questions: {
          followup_action: {
            type: "choice",
            instructions: 'Choose the single best follow-up routing action. IMPORTANT: Any amenity, price, hours, rental requirement, or factual question (?, "c\xF3 ... kh\xF4ng", "bao nhi\xEAu", "c\u1EA7n g\xEC", "review", "t\u01B0 v\u1EA5n") MUST be classified as current_trip_qa unless there is an unambiguous edit/swap command without being primarily an info question.',
            choices: [
              "modify_stops: explicit command to add, remove, or swap a stop or attraction in the existing itinerary",
              "adjust_budget: explicit command to adjust total budget, expense percentages (food/stay/transit/activity), or add/remove an expense item",
              'swap_logistics: explicit command to switch/change accommodation or transport mode (e.g. "\u0111\u1ED5i sang...", "chuy\u1EC3n sang...") \u2014 NOT amenity/price/rental questions',
              "reorder_or_pace: explicit command to optimize route, reverse day order, swap two slots, or adjust pace",
              "current_trip_qa: answer any question about the current itinerary, stays/homestays/resorts & amenities/prices, transport/rental requirements, places, weather, season, or travel tips without modifying the plan",
              "full_replan: explicitly rebuild the entire itinerary or change overall trip duration/theme"
            ]
          }
        }
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    const ans = data.answers?.followup_action;
    const rawChoice = ans?.choice || ans?.selectedChoice || ans?.answer || ans?.value || "";
    const prefix = rawChoice.split(":")[0].trim();
    return VALID_ACTIONS.includes(prefix) ? prefix : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function classifyFollowUpAction(req, options) {
  return withOpenInferenceSpan(
    "follow_up_classify",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: {
        message: req.message,
        duration: req.currentState.duration,
        daysCount: req.currentState.days.length
      },
      formatOutput: (out) => out
    },
    async () => {
      const fetchFn = options?.fetchFn ?? fetch;
      const deterministicAction = classifyFollowUpActionDeterministic(req);
      const decisionAction = await classifyWithGeminiDecisions(req, fetchFn);
      if (decisionAction) {
        if (deterministicAction === "current_trip_qa" && isQuestionOrInfoRequest(req.message) && (decisionAction === "swap_logistics" || decisionAction === "adjust_budget" || decisionAction === "modify_stops")) {
          return { action: "current_trip_qa", method: "deterministic-qa-guardrail" };
        }
        return { action: decisionAction, method: "gemini_decisions" };
      }
      return {
        action: deterministicAction,
        method: "deterministic"
      };
    }
  );
}
function matchActiveSlotInText(text, days, preferredDayNumber) {
  const lower = text.toLowerCase();
  const candidates = days.map((d, idx) => ({ day: d, dayNumber: idx + 1 }));
  const orderedDays = preferredDayNumber ? [
    ...candidates.filter((c) => c.dayNumber === preferredDayNumber),
    ...candidates.filter((c) => c.dayNumber !== preferredDayNumber)
  ] : candidates;
  for (const { day, dayNumber } of orderedDays) {
    for (const slot of day.slots) {
      const slotLower = slot.title.toLowerCase();
      if (lower.includes(slotLower)) {
        return { title: slot.title, dayNumber, time: slot.time };
      }
      const alias = PLACE_SHORT_ALIASES.find(
        (a) => (slotLower.includes(a.title.toLowerCase()) || a.title.toLowerCase().includes(slotLower)) && a.keywords.some((kw) => lower.includes(kw))
      );
      if (alias) {
        return { title: slot.title, dayNumber, time: slot.time };
      }
    }
  }
  let bestMatch = null;
  for (const { day, dayNumber } of orderedDays) {
    for (const slot of day.slots) {
      const tokens = slot.title.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
      const score = tokens.reduce((acc, tok) => lower.includes(tok) ? acc + 1 : acc, 0);
      if (score >= 2 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { title: slot.title, dayNumber, time: slot.time, score };
      }
    }
  }
  if (bestMatch) {
    return { title: bestMatch.title, dayNumber: bestMatch.dayNumber, time: bestMatch.time };
  }
  if (preferredDayNumber && orderedDays[0]?.day.slots.length) {
    const targetDay = orderedDays[0];
    if (/(sáng|morning)/i.test(lower)) {
      const first = targetDay.day.slots[0];
      return { title: first.title, dayNumber: targetDay.dayNumber, time: first.time };
    }
    if (/(chiều|tối|afternoon|evening)/i.test(lower)) {
      const last = targetDay.day.slots[targetDay.day.slots.length - 1];
      return { title: last.title, dayNumber: targetDay.dayNumber, time: last.time };
    }
  }
  return null;
}
function matchDirectoryPlaceByName(text, directory) {
  const lower = text.toLowerCase();
  for (const entry of directory) {
    if (lower.includes(entry.title.toLowerCase())) {
      return entry;
    }
  }
  for (const alias of PLACE_SHORT_ALIASES) {
    if (alias.keywords.some((kw) => lower.includes(kw))) {
      const found = directory.find((d) => d.title === alias.title);
      if (found) return found;
    }
  }
  return null;
}
function detectTargetThemeFromText(text) {
  const lower = text.toLowerCase();
  if (/(cà phê|cafe|coffee|robusta|cupping|espresso|thưởng thức cà phê)/i.test(lower)) {
    return "coffee";
  }
  if (/(ẩm thực|ăn uống|món ăn|đặc sản|bún|cơm lam|gà nướng|food|eat|cuisine|restaurant)/i.test(lower)) {
    return "cuisine";
  }
  if (/(thác|rừng|hồ|thiên nhiên|sinh thái|voi|trekking|waterfall|nature|lake|park)/i.test(lower)) {
    return "nature";
  }
  if (/(văn hóa|bảo tàng|buôn|làng|thổ cẩm|cồng chiêng|di tích|lịch sử|culture|museum|heritage|village)/i.test(lower)) {
    return "culture";
  }
  return null;
}
function pickDirectoryReplacementPlace(targetText, directory, existingTitlesLower, anchorAreaCluster) {
  const unused = directory.filter((d) => !existingTitlesLower.has(d.title.toLowerCase()));
  const pool = unused.length > 0 ? unused : directory;
  const explicitMatch = matchDirectoryPlaceByName(targetText, pool);
  if (explicitMatch) return explicitMatch;
  const desiredTheme = detectTargetThemeFromText(targetText);
  const adjacencyOrder = AREA_ADJACENCY[anchorAreaCluster] || [anchorAreaCluster, "BMT"];
  const scored = pool.map((entry) => {
    let score = 0;
    if (desiredTheme) {
      if (entry.themeTags[0] === desiredTheme) score += 45;
      else if (entry.themeTags.includes(desiredTheme)) score += 18;
      if (desiredTheme === "coffee" && /cà phê/i.test(`${entry.title} ${entry.category}`)) {
        score += 30;
      } else if (desiredTheme === "cuisine" && /ẩm thực/i.test(`${entry.title} ${entry.category}`)) {
        score += 30;
      } else if (desiredTheme === "nature" && /(thác|hồ|vườn quốc gia|đá voi)/i.test(`${entry.title} ${entry.category}`)) {
        score += 30;
      } else if (desiredTheme === "culture" && /(bảo tàng|buôn|làng|di tích|di sản)/i.test(`${entry.title} ${entry.category}`)) {
        score += 30;
      }
    }
    const clusterIdx = adjacencyOrder.indexOf(entry.areaCluster);
    if (clusterIdx === 0) score += 16;
    else if (clusterIdx > 0) score += Math.max(4, 14 - clusterIdx * 2);
    return { entry, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.entry || null;
}
function resolveModifyStopsDeterministic(req, directory) {
  const lower = req.message.toLowerCase();
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const explicitDay = dayMatch ? Math.min(req.currentState.days.length, Number(dayMatch[1])) : void 0;
  const existingTitlesLower = new Set(
    req.currentState.days.flatMap((d) => d.slots.map((s) => s.title.trim().toLowerCase()))
  );
  const swapMatch = req.message.match(
    /(?:đổi|thay\s*thế|thay|swap|replace)\s+(.+?)\s+(?:sang|thành|bằng|qua|với|for|with|to)\s+(.+)/i
  );
  if (swapMatch) {
    const sourcePart = swapMatch[1];
    const targetPart = swapMatch[2];
    const removedSlot = matchActiveSlotInText(sourcePart, req.currentState.days, explicitDay) || matchActiveSlotInText(req.message, req.currentState.days, explicitDay);
    if (removedSlot) {
      const removedDir = directory.find(
        (d) => d.title.toLowerCase() === removedSlot.title.toLowerCase()
      );
      const anchorCluster = removedDir?.areaCluster || "BMT";
      const replacement = pickDirectoryReplacementPlace(
        targetPart,
        directory,
        existingTitlesLower,
        anchorCluster
      );
      if (replacement) {
        const stopOperations = [
          {
            action: "remove",
            placeTitle: removedSlot.title,
            dayNumber: removedSlot.dayNumber
          },
          {
            action: "add",
            placeTitle: replacement.title,
            dayNumber: removedSlot.dayNumber,
            time: removedSlot.time || replacement.time,
            period: replacement.period
          }
        ];
        const reply2 = req.lang === "en" ? `Replaced "${removedSlot.title}" on Day ${removedSlot.dayNumber} with "${replacement.title}" (${replacement.category} \u2022 ${replacement.areaCluster}) while keeping the rest of your itinerary intact.` : `\u0110\xE3 \u0111\u1ED5i "${removedSlot.title}" \u1EDF Ng\xE0y ${removedSlot.dayNumber} sang "${replacement.title}" (${replacement.category} \u2022 khu v\u1EF1c ${replacement.areaCluster}) v\xE0 gi\u1EEF nguy\xEAn c\xE1c \u0111i\u1EC3m c\xF2n l\u1EA1i.`;
        return { stopOperations, reply: reply2 };
      }
    }
  }
  const isRemove = /(bỏ|xóa|bớt|gỡ|remove|drop|delete)/i.test(lower);
  const isAdd = /(thêm|ghé|bổ sung|add|include|visit)/i.test(lower);
  const ops = [];
  if (isRemove) {
    const removedSlot = matchActiveSlotInText(req.message, req.currentState.days, explicitDay);
    if (removedSlot) {
      ops.push({
        action: "remove",
        placeTitle: removedSlot.title,
        dayNumber: removedSlot.dayNumber
      });
    }
  }
  if (isAdd || ops.length === 0) {
    const anchorCluster = req.currentState.days[(explicitDay || 1) - 1]?.title.includes("H\u1ED3 L\u1EAFk") ? "H\u1ED3 L\u1EAFk" : "BMT";
    const picked = pickDirectoryReplacementPlace(
      req.message,
      directory,
      existingTitlesLower,
      anchorCluster
    );
    if (picked) {
      const targetDay = explicitDay || Math.max(1, req.currentState.days.length);
      ops.push({
        action: "add",
        placeTitle: picked.title,
        dayNumber: targetDay,
        time: picked.time,
        period: picked.period
      });
    }
  }
  const summaryList = ops.map(
    (op) => `${op.action === "remove" ? "-" : "+"} ${op.placeTitle} (${req.lang === "en" ? `Day ${op.dayNumber || 1}` : `Ng\xE0y ${op.dayNumber || 1}`})`
  ).join(", ");
  const reply = ops.length > 0 ? req.lang === "en" ? `Updated your itinerary stops (${summaryList}) while preserving the rest of your trip.` : `\u0110\xE3 c\u1EADp nh\u1EADt \u0111i\u1EC3m d\u1EEBng trong l\u1ECBch tr\xECnh (${summaryList}) v\xE0 gi\u1EEF nguy\xEAn c\u1EA5u tr\xFAc c\xE1c ng\xE0y c\xF2n l\u1EA1i.` : req.lang === "en" ? "Could you share which stop in your itinerary you want to add, remove, or replace?" : "B\u1EA1n cho m\xECnh bi\u1EBFt r\xF5 \u0111i\u1EC3m d\u1EEBng mu\u1ED1n th\xEAm, b\u1EDBt ho\u1EB7c \u0111\u1ED5i sang tr\u1EA3i nghi\u1EC7m n\xE0o trong l\u1ECBch tr\xECnh nh\xE9!";
  return { stopOperations: ops, reply };
}
var MODIFY_STOPS_SCHEMA = {
  type: "OBJECT",
  properties: {
    stopOperations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          action: { type: "STRING", enum: ["add", "remove"] },
          placeTitle: { type: "STRING" },
          dayNumber: { type: "INTEGER" },
          time: { type: "STRING" },
          period: { type: "STRING" }
        },
        required: ["action", "placeTitle", "dayNumber"]
      }
    },
    reply: { type: "STRING" }
  },
  required: ["stopOperations", "reply"]
};
async function handleModifyStopsFollowUp(req, fetchFn) {
  return withOpenInferenceSpan(
    "follow_up_modify_stops",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: { message: req.message, daysCount: req.currentState.days.length },
      formatOutput: (res) => ({
        stopOperations: res.stopOperations,
        provider: res.provider
      })
    },
    async () => {
      const directory = getCompactDirectory();
      const deterministic = resolveModifyStopsDeterministic(req, directory);
      const apiKey = GEMINI_API_KEY.trim();
      if (!apiKey) {
        return {
          intent: "modify_stops",
          followUpAction: "modify_stops",
          reply: deterministic.reply,
          shouldOpenPlanner: true,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: deterministic.stopOperations,
          suggestedTab: "schedule",
          status: "completed",
          provider: "local-fallback"
        };
      }
      const model = GEMINI_MODEL.trim() || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const compactDirPayload = directory.map((d) => ({
        title: d.title,
        category: d.category,
        areaCluster: d.areaCluster,
        time: d.time,
        period: d.period
      }));
      const compactDaysPayload = req.currentState.days.map((d, idx) => ({
        dayNumber: idx + 1,
        day: d.day,
        title: d.title,
        slots: d.slots.map((s) => ({ title: s.title, location: s.location, time: s.time }))
      }));
      const historySnippet = (req.history || []).slice(-4).map((h) => `User: ${h.user}
Assistant: ${h.reply}`).join("\n");
      const systemText = [
        "You are the Stop-Swap Micro-Router for \u0110\u1EAFk L\u1EAFk AI Travel Concierge.",
        `UI language: "${req.lang}".`,
        "Resolve the user follow-up edit into exact `stopOperations` grounded in `dakLakPlaceDirectory` and `currentDays`.",
        "Rules:",
        "- Every `remove` placeTitle MUST match an existing slot title in `currentDays`.",
        "- Every `add` placeTitle MUST be an exact `title` from `dakLakPlaceDirectory` that is NOT already in `currentDays`.",
        '- When the user swaps/replaces a stop (even by category like "1 n\u01A1i \u0111\u1EC3 th\u01B0\u1EDFng th\u1EE9c c\xE0 ph\xEA"), emit BOTH `remove` and `add` with the SAME `dayNumber` in the same or adjacent `areaCluster`.',
        "- Never suggest elephant riding.",
        "- Write a concise, tailored `reply` confirming the exact change."
      ].join("\n");
      const prompt = [
        `dakLakPlaceDirectory:
${JSON.stringify(compactDirPayload)}`,
        `currentDays:
${JSON.stringify(compactDaysPayload)}`,
        historySnippet ? `recentHistory:
${historySnippet}` : "",
        `userMessage: ${req.message}`
      ].filter(Boolean).join("\n\n");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(12e3, AI_CHAT_TIMEOUT_MS));
      try {
        const llmOut = await withOpenInferenceSpan(
          "gemini_follow_up_modify_stops",
          {
            kind: OpenInferenceSpanKind4.LLM,
            input: prompt,
            attributes: {
              [LLM_MODEL_NAME2]: model,
              [LLM_PROVIDER2]: "google",
              [LLM_SYSTEM2]: "gemini",
              [`${SemanticConventions3.LLM_INPUT_MESSAGES}.0.${SemanticConventions3.MESSAGE_ROLE}`]: "system",
              [`${SemanticConventions3.LLM_INPUT_MESSAGES}.0.${SemanticConventions3.MESSAGE_CONTENT}`]: systemText,
              [`${SemanticConventions3.LLM_INPUT_MESSAGES}.1.${SemanticConventions3.MESSAGE_ROLE}`]: "user",
              [`${SemanticConventions3.LLM_INPUT_MESSAGES}.1.${SemanticConventions3.MESSAGE_CONTENT}`]: prompt
            },
            formatOutput: (res) => res.rawText,
            onSuccess: (span, res) => {
              if (res.usage?.promptTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_PROMPT2, res.usage.promptTokenCount);
              }
              if (res.usage?.candidatesTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_COMPLETION2, res.usage.candidatesTokenCount);
              }
              if (res.usage?.totalTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_TOTAL2, res.usage.totalTokenCount);
              }
            }
          },
          async () => {
            const response = await fetchFn(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.15,
                  maxOutputTokens: 768,
                  responseMimeType: "application/json",
                  responseSchema: MODIFY_STOPS_SCHEMA
                }
              })
            });
            if (!response.ok) {
              throw new Error(`Gemini modify_stops HTTP ${response.status}`);
            }
            const data = await response.json();
            const rawText = (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("").trim();
            return { rawText, usage: data.usageMetadata };
          }
        );
        const jsonText = llmOut.rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(jsonText);
        const existingLower = new Set(
          req.currentState.days.flatMap((d) => d.slots.map((s) => s.title.toLowerCase()))
        );
        const dirTitlesMap = new Map(directory.map((d) => [d.title.toLowerCase(), d]));
        const validatedOps = (parsed.stopOperations || []).filter((op) => op && typeof op === "object").map((op) => {
          const action = op.action === "remove" ? "remove" : "add";
          const rawTitle = String(op.placeTitle || "").trim();
          const dayNumber = Math.max(
            1,
            Math.min(req.currentState.days.length, Math.round(Number(op.dayNumber) || 1))
          );
          if (action === "remove") {
            const matchedSlot = matchActiveSlotInText(rawTitle, req.currentState.days, dayNumber);
            if (!matchedSlot) return null;
            return {
              action: "remove",
              placeTitle: matchedSlot.title,
              dayNumber: matchedSlot.dayNumber
            };
          }
          const dirMatch = dirTitlesMap.get(rawTitle.toLowerCase()) || matchDirectoryPlaceByName(rawTitle, directory);
          if (!dirMatch || existingLower.has(dirMatch.title.toLowerCase())) {
            return null;
          }
          return {
            action: "add",
            placeTitle: dirMatch.title,
            dayNumber,
            time: typeof op.time === "string" && op.time.trim() ? op.time.trim() : dirMatch.time,
            period: typeof op.period === "string" && op.period.trim() ? op.period.trim() : dirMatch.period
          };
        }).filter((op) => op !== null);
        const hasSwapIntent = /(đổi|thay|swap|replace)/i.test(req.message);
        const hasRemove = validatedOps.some((o) => o.action === "remove");
        const hasAdd = validatedOps.some((o) => o.action === "add");
        const useDeterministic = validatedOps.length === 0 || hasSwapIntent && (!hasRemove || !hasAdd);
        const finalOps = useDeterministic ? deterministic.stopOperations : validatedOps;
        const rawReply = !useDeterministic && typeof parsed.reply === "string" && parsed.reply.trim() && !hasElephantRidingViolation(parsed.reply) ? parsed.reply.trim() : deterministic.reply;
        return {
          intent: "modify_stops",
          followUpAction: "modify_stops",
          reply: rawReply,
          shouldOpenPlanner: true,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: finalOps,
          suggestedTab: "schedule",
          status: "completed",
          provider: useDeterministic ? "local-fallback" : `gemini-ai:${model}`
        };
      } catch {
        return {
          intent: "modify_stops",
          followUpAction: "modify_stops",
          reply: deterministic.reply,
          shouldOpenPlanner: true,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: deterministic.stopOperations,
          suggestedTab: "schedule",
          status: "completed",
          provider: "local-fallback"
        };
      } finally {
        clearTimeout(timer);
      }
    }
  );
}
var EXPENSE_CATS = ["stay", "transit", "food", "activity"];
function computeBaseAllocationPcts(currentExpenses) {
  if (!currentExpenses || currentExpenses.length === 0) {
    return { stay: 35, transit: 20, food: 25, activity: 20 };
  }
  const sums = { stay: 0, transit: 0, food: 0, activity: 0 };
  let total = 0;
  for (const item of currentExpenses) {
    const amt = Math.max(0, Number(item.amount) || 0);
    if (EXPENSE_CATS.includes(item.cat)) {
      sums[item.cat] += amt;
      total += amt;
    }
  }
  if (total <= 0) {
    return { stay: 35, transit: 20, food: 25, activity: 20 };
  }
  const pcts = {
    stay: Math.max(5, Math.round(sums.stay / total * 100)),
    transit: Math.max(5, Math.round(sums.transit / total * 100)),
    food: Math.max(5, Math.round(sums.food / total * 100)),
    activity: Math.max(5, Math.round(sums.activity / total * 100))
  };
  return normalizeAllocationPctsTo100(pcts);
}
function normalizeAllocationPctsTo100(raw, locked, decreaseHints, increaseHints) {
  const pcts = {
    stay: Math.max(5, Math.min(80, Math.round(raw.stay ?? 35))),
    transit: Math.max(5, Math.min(80, Math.round(raw.transit ?? 20))),
    food: Math.max(5, Math.min(80, Math.round(raw.food ?? 25))),
    activity: Math.max(5, Math.min(80, Math.round(raw.activity ?? 20)))
  };
  let diff = pcts.stay + pcts.transit + pcts.food + pcts.activity - 100;
  if (diff > 0) {
    const order = [
      ...decreaseHints ? Array.from(decreaseHints) : [],
      ...EXPENSE_CATS.filter((c) => !locked?.has(c) && !decreaseHints?.has(c)),
      ...EXPENSE_CATS.filter((c) => locked?.has(c))
    ];
    for (const cat of order) {
      if (diff <= 0) break;
      const reducible = Math.max(0, pcts[cat] - 5);
      const take = Math.min(reducible, diff);
      pcts[cat] -= take;
      diff -= take;
    }
  } else if (diff < 0) {
    let needed = -diff;
    const order = [
      ...increaseHints ? Array.from(increaseHints) : [],
      ...EXPENSE_CATS.filter((c) => !locked?.has(c) && !increaseHints?.has(c)),
      ...EXPENSE_CATS.filter((c) => locked?.has(c))
    ];
    for (const cat of order) {
      if (needed <= 0) break;
      const addable = Math.max(0, 80 - pcts[cat]);
      const add = Math.min(addable, needed);
      pcts[cat] += add;
      needed -= add;
    }
  }
  return pcts;
}
function extractAmountVnd(text) {
  const millionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr\b|million|m\b)/i);
  if (millionMatch) {
    const val = Math.round(Number(millionMatch[1].replace(",", ".")) * 1e6);
    if (Number.isFinite(val) && val >= 5e4) return val;
  }
  const kMatch = text.match(/(\d{2,4})\s*k\b/i);
  if (kMatch) {
    const val = Math.round(Number(kMatch[1]) * 1e3);
    if (Number.isFinite(val) && val >= 1e4) return val;
  }
  const fullMatch = text.match(/(\d{1,3}(?:[.,]\d{3})+|\d{5,9})\s*(?:đồng|vnđ|vnd|đ)?/i);
  if (fullMatch) {
    const val = Number(fullMatch[1].replace(/[.,]/g, ""));
    if (Number.isFinite(val) && val >= 1e4) return val;
  }
  return null;
}
function resolveAdjustBudgetDeterministic(req) {
  const lower = req.message.toLowerCase();
  const basePcts = computeBaseAllocationPcts(req.currentExpenses);
  const travelers = getTravelersHintFromState(req);
  const catMatchers = [
    {
      cat: "stay",
      regex: /(tiền phòng|lưu trú|khách sạn|homestay|chỗ ở|phòng ở|stay|hotel|lodging)/i,
      labelVi: "l\u01B0u tr\xFA"
    },
    {
      cat: "transit",
      regex: /(di chuyển|đi lại|vận chuyển|thuê xe|xe cộ|transit|transport)/i,
      labelVi: "di chuy\u1EC3n"
    },
    {
      cat: "food",
      regex: /(ăn uống|ẩm thực|đồ ăn|bữa ăn|cà phê|food|dining|meal)/i,
      labelVi: "\u0103n u\u1ED1ng"
    },
    {
      cat: "activity",
      regex: /(hoạt động|tham quan|vé|vui chơi|trải nghiệm|activity|tickets?)/i,
      labelVi: "tham quan & ho\u1EA1t \u0111\u1ED9ng"
    }
  ];
  const isCustomExpenseOp = /(khoản|mục chi|chi phí mua|mua quà|phát sinh|add expense|remove expense)/i.test(lower) || /(thêm|bỏ|xóa)\s+(?:chi phí|khoản)/i.test(lower) && !/%/.test(lower);
  if (isCustomExpenseOp) {
    const isRemove = /(bỏ|xóa|gỡ|remove|drop|delete)/i.test(lower);
    const amount = extractAmountVnd(req.message) ?? 3e5;
    const matchedCat = catMatchers.find((c) => c.regex.test(lower))?.cat || "activity";
    const cleanedTitle = req.message.replace(/^(?:thêm|bổ sung|bỏ|xóa|add|remove)\s+(?:chi phí|khoản chi|khoản|mục)?\s*/i, "").replace(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr\b|k\b|vnđ|vnd|đồng|đ)/gi, "").trim();
    const title = cleanedTitle || (matchedCat === "food" ? "Chi ph\xED \u0103n u\u1ED1ng b\u1ED5 sung" : "Chi ph\xED ph\xE1t sinh");
    const expensePatch2 = {
      customExpenseOps: [
        isRemove ? { action: "remove", title, cat: matchedCat } : { action: "add", title, cat: matchedCat, amount }
      ]
    };
    const reply2 = req.lang === "en" ? `${isRemove ? "Removed" : "Added"} expense item "${title}" (${amount.toLocaleString("en-US")} VND) without changing your map stops.` : `\u0110\xE3 ${isRemove ? "b\u1ECF" : "th\xEAm"} kho\u1EA3n chi "${title}" (${amount.toLocaleString("vi-VN")}\u0111) trong b\u1EA3ng ng\xE2n s\xE1ch, gi\u1EEF nguy\xEAn to\xE0n b\u1ED9 \u0111i\u1EC3m d\u1EEBng.`;
    return { expensePatch: expensePatch2, reply: reply2 };
  }
  let totalBudgetVnd;
  if (/(tổng ngân sách|ngân sách|total budget|chỉ còn|giảm xuống|tăng lên)/i.test(lower) && !/%/.test(lower)) {
    const budgetParsed = extractBudgetVndFromText(req.message, travelers);
    if (budgetParsed.totalBudgetVnd) {
      totalBudgetVnd = budgetParsed.totalBudgetVnd;
    }
  } else if (/(tổng ngân sách|ngân sách).*\d+\s*(?:triệu|tr\b|m\b)/i.test(lower)) {
    const budgetParsed = extractBudgetVndFromText(req.message, travelers);
    if (budgetParsed.totalBudgetVnd) {
      totalBudgetVnd = budgetParsed.totalBudgetVnd;
    }
  }
  const clauses = lower.split(/[,;.]|\bvà\b|\bnhưng\b|\band\b/i).map((c) => c.trim()).filter(Boolean);
  const nextPcts = { ...basePcts };
  const locked = /* @__PURE__ */ new Set();
  const decreaseHints = /* @__PURE__ */ new Set();
  const increaseHints = /* @__PURE__ */ new Set();
  for (const clause of clauses) {
    const pctMatch = clause.match(/(\d{1,2})\s*%/);
    const pctVal = pctMatch ? Number(pctMatch[1]) : null;
    const isInc = /(tăng|lên|ưu tiên|nhiều hơn|increase|raise|more)/i.test(clause);
    const isDec = /(giảm|xuống|cắt|bớt|ít hơn|tiết kiệm|decrease|reduce|cut|less)/i.test(clause);
    for (const matcher of catMatchers) {
      if (matcher.regex.test(clause)) {
        if (pctVal !== null && pctVal >= 5 && pctVal <= 80) {
          nextPcts[matcher.cat] = pctVal;
          locked.add(matcher.cat);
        } else if (isInc) {
          increaseHints.add(matcher.cat);
        } else if (isDec) {
          decreaseHints.add(matcher.cat);
        }
      }
    }
  }
  if (locked.size === 0 && (increaseHints.size > 0 || decreaseHints.size > 0)) {
    for (const cat of increaseHints) {
      nextPcts[cat] = Math.min(75, (nextPcts[cat] ?? 25) + 10);
      locked.add(cat);
    }
    for (const cat of decreaseHints) {
      nextPcts[cat] = Math.max(5, (nextPcts[cat] ?? 25) - 10);
      if (increaseHints.size === 0) locked.add(cat);
    }
  }
  const hasAllocationChange = locked.size > 0 || increaseHints.size > 0 || decreaseHints.size > 0;
  const normalizedPcts = hasAllocationChange ? normalizeAllocationPctsTo100(nextPcts, locked, decreaseHints, increaseHints) : void 0;
  const expensePatch = {};
  if (totalBudgetVnd !== void 0) {
    expensePatch.totalBudgetVnd = totalBudgetVnd;
  }
  if (normalizedPcts) {
    expensePatch.allocationPcts = normalizedPcts;
  }
  if (!expensePatch.totalBudgetVnd && !expensePatch.allocationPcts) {
    const currentTotal = (req.currentExpenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    if (/(giảm|tiết kiệm|cắt)/i.test(lower)) {
      expensePatch.totalBudgetVnd = Math.max(
        15e5,
        Math.round((currentTotal || 6e6) * 0.85 / 1e5) * 1e5
      );
    } else {
      expensePatch.allocationPcts = basePcts;
    }
  }
  const parts = [];
  if (expensePatch.totalBudgetVnd) {
    parts.push(
      req.lang === "en" ? `target budget ${expensePatch.totalBudgetVnd.toLocaleString("en-US")} VND` : `t\u1ED5ng ng\xE2n s\xE1ch ${expensePatch.totalBudgetVnd.toLocaleString("vi-VN")}\u0111`
    );
  }
  if (expensePatch.allocationPcts) {
    const p = expensePatch.allocationPcts;
    parts.push(
      req.lang === "en" ? `allocation (Stay ${p.stay}%, Transit ${p.transit}%, Food ${p.food}%, Activities ${p.activity}%)` : `t\u1EF7 l\u1EC7 m\u1EDBi (L\u01B0u tr\xFA ${p.stay}%, Di chuy\u1EC3n ${p.transit}%, \u0102n u\u1ED1ng ${p.food}%, Ho\u1EA1t \u0111\u1ED9ng ${p.activity}%)`
    );
  }
  const reply = req.lang === "en" ? `Updated your budget breakdown (${parts.join(" \u2022 ")}) while keeping all itinerary stops unchanged.` : `\u0110\xE3 \u0111i\u1EC1u ch\u1EC9nh c\u01A1 c\u1EA5u chi ph\xED theo ${parts.join(" \u2022 ")}, gi\u1EEF nguy\xEAn to\xE0n b\u1ED9 c\xE1c \u0111i\u1EC3m tham quan tr\xEAn b\u1EA3n \u0111\u1ED3.`;
  return { expensePatch, reply };
}
async function handleAdjustBudgetFollowUp(req) {
  return withOpenInferenceSpan(
    "follow_up_adjust_budget",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: { message: req.message, currentExpenses: req.currentExpenses || [] },
      formatOutput: (res) => ({
        expensePatch: res.expensePatch,
        provider: res.provider
      })
    },
    async () => {
      const { expensePatch, reply } = resolveAdjustBudgetDeterministic(req);
      return {
        intent: "update_itinerary",
        followUpAction: "adjust_budget",
        reply,
        shouldOpenPlanner: true,
        preferences: buildBasePreferences(req),
        resetItineraryToTheme: false,
        stopOperations: [],
        expensePatch,
        suggestedTab: "schedule",
        status: "completed",
        provider: "local-fallback"
      };
    }
  );
}
function matchRequestedStay(lower, stays, fallbackTier) {
  if (stays.length === 0) return null;
  const folded = foldVietnamese(lower);
  const directMatch = stays.find(
    (s) => folded.includes(foldVietnamese(s.name)) || folded.includes("elephants") && foldVietnamese(s.name).includes("elephants") || folded.includes("muong thanh") && foldVietnamese(s.name).includes("muong thanh") || folded.includes("lak tented") && foldVietnamese(s.name).includes("lak tented") || folded.includes("ako dhong") && foldVietnamese(s.name).includes("ako dhong") || folded.includes("zan") && foldVietnamese(s.name).includes("zan")
  );
  if (directMatch) return directMatch;
  const wantsHoLak = /(hồ lắk|ho lak|liên sơn|buôn jun)/i.test(lower);
  const wantsEaKao = /(ea kao|tơng jú)/i.test(lower);
  const wantsBmt = /(bmt|buôn ma thuột|trung tâm|ako dhông|mường thanh|elephants)/i.test(lower);
  let pool = stays;
  if (wantsHoLak) {
    const areaMatches = stays.filter((s) => s.area.toLowerCase().includes("h\u1ED3 l\u1EAFk"));
    if (areaMatches.length > 0) pool = areaMatches;
  } else if (wantsEaKao) {
    const areaMatches = stays.filter((s) => s.area.toLowerCase().includes("ea kao"));
    if (areaMatches.length > 0) pool = areaMatches;
  } else if (wantsBmt) {
    const areaMatches = stays.filter((s) => s.area.toLowerCase().includes("bmt"));
    if (areaMatches.length > 0) pool = areaMatches;
  }
  let targetTier = null;
  if (/(homestay|nhà dài|tiết kiệm|bình dân|rẻ|budget)/i.test(lower)) targetTier = "budget";
  else if (/(resort|villa|5 sao|cao cấp|sang trọng|luxury)/i.test(lower)) targetTier = "luxury";
  else if (/(khách sạn|bungalow|tented|4 sao|tiêu chuẩn|standard)/i.test(lower)) targetTier = "standard";
  return (targetTier ? pool.find((s) => s.tier === targetTier) : void 0) || pool.find((s) => s.tier === fallbackTier) || pool[0] || null;
}
function matchRequestedLogistics(lower, logistics, fallbackTier) {
  if (logistics.length === 0) return null;
  if (/(xe máy|mô tô|tay ga|xe số|motorbike|scooter)/i.test(lower)) {
    return logistics.find((l) => l.mode === "motorbike") || logistics[0];
  }
  if (/(xe buýt|shuttle|xe khách|bus)/i.test(lower)) {
    return logistics.find((l) => l.mode === "local_bus_shuttle") || logistics[0];
  }
  if (/(tự lái|ô tô 4|ô tô 5|self[- ]?drive|self drive)/i.test(lower)) {
    return logistics.find((l) => l.mode === "self_drive_car") || logistics[0];
  }
  if (/(xe riêng|tài xế|7 chỗ|private car|driver)/i.test(lower)) {
    return logistics.find((l) => l.mode === "private_car_driver") || logistics[0];
  }
  return logistics.find((l) => l.tier === fallbackTier) || logistics[0] || null;
}
async function handleSwapLogisticsFollowUp(req, options) {
  return withOpenInferenceSpan(
    "follow_up_swap_logistics",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: { message: req.message, companion: req.currentState.companion },
      formatOutput: (res) => ({
        stayMovePatch: res.stayMovePatch,
        expensePatch: res.expensePatch,
        provider: res.provider
      })
    },
    async () => {
      const lower = req.message.toLowerCase();
      const dayCount = getDayCountFromState(req);
      const nights = Math.max(1, dayCount - 1);
      const travelersCount = getTravelersHintFromState(req);
      const stays = options?.stays ?? await listActiveStays({ travelersCount, companionType: req.currentState.companion });
      const logistics = options?.logistics ?? await listActiveLogistics({ travelersCount, companionType: req.currentState.companion });
      const mentionsStay = /(khách sạn|homestay|resort|bungalow|chỗ ở|nơi ở|lưu trú|nghỉ đêm|ngủ ở|hồ lắk|ea kao|ako dhông|mường thanh|stay|hotel|accommodation)/i.test(
        lower
      );
      const mentionsTransport = /(xe máy|mô tô|ô tô|tự lái|xe riêng|tài xế|xe buýt|shuttle|phương tiện|di chuyển|motorbike|car|bus|transport|driver)/i.test(
        lower
      );
      const selectedStay = matchRequestedStay(lower, stays, req.currentState.budget);
      const selectedLogistics = matchRequestedLogistics(lower, logistics, req.currentState.budget);
      const roomsNeeded = selectedStay ? Math.max(1, Math.ceil(travelersCount / Math.max(1, selectedStay.capacityMax))) : 1;
      const newStayVnd = selectedStay ? selectedStay.nightlyRateVnd * nights * roomsNeeded : 0;
      const newTransitVnd = selectedLogistics ? selectedLogistics.dailyRateVnd * dayCount : 0;
      const isEn = req.lang === "en";
      const stayLabel = selectedStay ? isEn ? `${selectedStay.name} (${selectedStay.area} \u2022 ~${selectedStay.nightlyRateVnd.toLocaleString("en-US")} VND/night)` : `${selectedStay.name} (${selectedStay.area} \u2022 ~${selectedStay.nightlyRateVnd.toLocaleString("vi-VN")}\u0111/\u0111\xEAm)` : budgetMultipliers[req.currentState.budget].stayMove;
      const transitLabel = selectedLogistics ? isEn ? `${selectedLogistics.label} (~${selectedLogistics.dailyRateVnd.toLocaleString("en-US")} VND/day)` : `${selectedLogistics.label} (~${selectedLogistics.dailyRateVnd.toLocaleString("vi-VN")}\u0111/ng\xE0y)` : "";
      const stayMovePatch = {
        stayMove: [stayLabel, transitLabel].filter(Boolean).join(" \u2022 "),
        selectedStayId: selectedStay ? String(selectedStay.id) : void 0,
        selectedLogisticsId: selectedLogistics ? String(selectedLogistics.id) : void 0
      };
      const customExpenseOps = [];
      const existingStayItem = (req.currentExpenses || []).find((e) => e.cat === "stay");
      const existingTransitItem = (req.currentExpenses || []).find((e) => e.cat === "transit");
      if ((mentionsStay || !mentionsTransport) && selectedStay) {
        customExpenseOps.push({
          action: "remove",
          title: existingStayItem?.title || (isEn ? "Stay" : "L\u01B0u tr\xFA"),
          cat: "stay"
        });
        customExpenseOps.push({
          action: "add",
          title: isEn ? `Stay ${nights} nights (${selectedStay.name})` : `L\u01B0u tr\xFA ${nights} \u0111\xEAm (${selectedStay.name})`,
          cat: "stay",
          amount: newStayVnd
        });
      }
      if ((mentionsTransport || !mentionsStay) && selectedLogistics) {
        customExpenseOps.push({
          action: "remove",
          title: existingTransitItem?.title || (isEn ? "Transport" : "Di chuy\u1EC3n"),
          cat: "transit"
        });
        customExpenseOps.push({
          action: "add",
          title: isEn ? `${selectedLogistics.label} (${dayCount} days)` : `${selectedLogistics.label} (${dayCount} ng\xE0y)`,
          cat: "transit",
          amount: newTransitVnd
        });
      }
      const expensePatch = { customExpenseOps };
      const reply = req.lang === "en" ? `Updated your stay & transport to: ${stayMovePatch.stayMove} and recalculated stay/transit expenses without modifying map stops.` : `\u0110\xE3 c\u1EADp nh\u1EADt l\u01B0u tr\xFA & di chuy\u1EC3n sang: ${stayMovePatch.stayMove}, \u0111\u1ED3ng th\u1EDDi c\u1EADp nh\u1EADt l\u1EA1i kho\u1EA3n chi l\u01B0u tr\xFA/di chuy\u1EC3n v\xE0 gi\u1EEF nguy\xEAn c\xE1c \u0111i\u1EC3m tham quan.`;
      return {
        intent: "update_itinerary",
        followUpAction: "swap_logistics",
        reply,
        shouldOpenPlanner: true,
        preferences: buildBasePreferences(req),
        resetItineraryToTheme: false,
        stopOperations: [],
        stayMovePatch,
        expensePatch,
        suggestedTab: "schedule",
        status: "completed",
        provider: "local-fallback"
      };
    }
  );
}
function resolveReorderOpsDeterministic(req) {
  const lower = req.message.toLowerCase();
  const days = req.currentState.days;
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const explicitDay = dayMatch ? Math.max(1, Math.min(days.length, Number(dayMatch[1]))) : null;
  const isSwapSlots = /(đổi chỗ|hoán đổi|đổi thứ tự|swap\s*slots?|swap\s*\d)/i.test(lower);
  const isReverse = /(đảo ngược|ngược lại|reverse)/i.test(lower);
  const reorderOps = [];
  if (isSwapSlots) {
    const targetDay = explicitDay || 1;
    const daySlots = days[targetDay - 1]?.slots || [];
    const twoNumMatch = lower.match(/(\d+)\s*(?:và|với|&|and)\s*(?:điểm|slot|mục|chỗ)?\s*(\d+)/i);
    let slotIndexA = 0;
    let slotIndexB = Math.max(0, Math.min(1, daySlots.length - 1));
    if (twoNumMatch) {
      const a = Math.max(1, Number(twoNumMatch[1])) - 1;
      const b = Math.max(1, Number(twoNumMatch[2])) - 1;
      if (daySlots.length > 0) {
        slotIndexA = Math.min(daySlots.length - 1, a);
        slotIndexB = Math.min(daySlots.length - 1, b);
      } else {
        slotIndexA = a;
        slotIndexB = b;
      }
    } else if (/(sáng|morning)/i.test(lower) && /(chiều|tối|afternoon|evening)/i.test(lower)) {
      slotIndexA = 0;
      slotIndexB = Math.max(1, daySlots.length - 1);
    }
    reorderOps.push({
      dayNumber: targetDay,
      action: "swap_slots",
      slotIndexA,
      slotIndexB
    });
  } else if (isReverse) {
    if (explicitDay) {
      reorderOps.push({ dayNumber: explicitDay, action: "reverse" });
    } else {
      days.forEach((d, idx) => {
        if (d.slots.length >= 2) {
          reorderOps.push({ dayNumber: idx + 1, action: "reverse" });
        }
      });
    }
  } else {
    if (explicitDay) {
      reorderOps.push({ dayNumber: explicitDay, action: "optimize_route" });
    } else {
      days.forEach((d, idx) => {
        if (d.slots.length >= 2) {
          reorderOps.push({ dayNumber: idx + 1, action: "optimize_route" });
        }
      });
      if (reorderOps.length === 0 && days.length > 0) {
        reorderOps.push({ dayNumber: 1, action: "optimize_route" });
      }
    }
  }
  const descList = reorderOps.map((op) => {
    if (op.action === "swap_slots") {
      return `\u0111\u1ED5i v\u1ECB tr\xED \u0111i\u1EC3m ${(op.slotIndexA ?? 0) + 1} \u2194 ${(op.slotIndexB ?? 1) + 1} (Ng\xE0y ${op.dayNumber})`;
    }
    if (op.action === "reverse") {
      return `\u0111\u1EA3o ng\u01B0\u1EE3c th\u1EE9 t\u1EF1 Ng\xE0y ${op.dayNumber}`;
    }
    return `t\u1ED1i \u01B0u tuy\u1EBFn \u0111\u01B0\u1EDDng Ng\xE0y ${op.dayNumber}`;
  }).join(", ");
  const reply = req.lang === "en" ? `Reordered your active schedule (${reorderOps.map((o) => `Day ${o.dayNumber}: ${o.action}`).join(", ")}) without changing your stops or budget.` : `\u0110\xE3 s\u1EAFp x\u1EBFp l\u1EA1i l\u1ED9 tr\xECnh (${descList}) \u0111\u1EC3 di chuy\u1EC3n thu\u1EADn ti\u1EC7n h\u01A1n, gi\u1EEF nguy\xEAn c\xE1c \u0111i\u1EC3m d\u1EEBng v\xE0 ng\xE2n s\xE1ch.`;
  return { reorderOps, reply };
}
async function handleReorderOrPaceFollowUp(req) {
  return withOpenInferenceSpan(
    "follow_up_reorder_or_pace",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: { message: req.message, daysCount: req.currentState.days.length },
      formatOutput: (res) => ({
        reorderOps: res.reorderOps,
        provider: res.provider
      })
    },
    async () => {
      const { reorderOps, reply } = resolveReorderOpsDeterministic(req);
      return {
        intent: "update_itinerary",
        followUpAction: "reorder_or_pace",
        reply,
        shouldOpenPlanner: true,
        preferences: buildBasePreferences(req),
        resetItineraryToTheme: false,
        stopOperations: [],
        reorderOps,
        suggestedTab: "map",
        status: "completed",
        provider: "local-fallback"
      };
    }
  );
}
async function handleCurrentTripQaFollowUp(req, fetchFn, options) {
  return withOpenInferenceSpan(
    "follow_up_current_trip_qa",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: { message: req.message, daysCount: req.currentState.days.length },
      formatOutput: (res) => ({ reply: res.reply, provider: res.provider })
    },
    async () => {
      const groundedCtx = await loadGroundedQaContext({
        stays: options?.stays,
        logistics: options?.logistics
      });
      const tavilyCtx = await maybeFetchTavilyQaContext(req.message);
      const deterministicReply = await buildGroundedQaReplyDeterministic(req, {
        stays: options?.stays,
        logistics: options?.logistics,
        tavilySnippets: tavilyCtx.snippets,
        tavilyAnswer: tavilyCtx.answer
      });
      const apiKey = GEMINI_API_KEY.trim();
      if (!apiKey) {
        return {
          intent: "general_qa",
          followUpAction: "current_trip_qa",
          reply: deterministicReply,
          shouldOpenPlanner: false,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: [],
          ...tavilyCtx.citations.length > 0 ? { citations: tavilyCtx.citations } : {},
          status: "completed",
          provider: "local-fallback"
        };
      }
      const model = GEMINI_MODEL.trim() || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const historySnippet = (req.history || []).slice(-4).map((h) => `User: ${h.user}
Assistant: ${h.reply}`).join("\n");
      const effectiveQaLang = resolveEffectiveQaLanguage(req.message, req.lang);
      const systemText = [
        "You are the Active-Itinerary & Local Knowledge Q&A assistant for \u0110\u1EAFk L\u1EAFk AI Travel Concierge.",
        `UI language: "${req.lang}". Target reply language: "${effectiveQaLang}".`,
        "Answer the user question directly, accurately, and cleanly by synthesizing the grounded local data (`currentDays`, `stays`, `logistics`, `dakLakPlaceDirectory`, `seasonsData`), live web search context (`tavilyLiveWebAnswer`, `tavilySnippets`), and verified \u0110\u1EAFk L\u1EAFk travel knowledge.",
        `CRITICAL LANGUAGE RULE: Write 100% of your reply in ${effectiveQaLang === "vi" ? "natural, fluent Vietnamese" : "natural, fluent English"} matching the user's question. If \`tavilyLiveWebAnswer\` or \`tavilySnippets\` are in English and target language is "vi", ALWAYS translate and synthesize them into natural Vietnamese \u2014 NEVER paste English sentences into a Vietnamese reply.`,
        "READABILITY & FORMATTING RULE: Format your response with clean Markdown for easy scanning: start with a concise 1\u20132 sentence direct answer, then organize key details (prices, schedules, highlights, practical notes) into bullet points (`- **Nh\xE3n**: n\u1ED9i dung`) separated by blank lines.",
        "CRITICAL HONESTY RULES:",
        "- For questions about internal catalog stays/accommodations (amenities like swimming pool/h\u1ED3 b\u01A1i, wifi, breakfast, prices), check `stays` (`name`, `area`, `tier`, `nightlyRateVnd`, `amenities`, `sourceNote`) and any `tavilySnippets`.",
        "- If an asked amenity (e.g. a swimming pool / h\u1ED3 b\u01A1i), opening hour, or policy is NOT listed or confirmed for that stay/place in our dataset or live snippets, state clearly and honestly that it is NOT listed/confirmed in our data, list the actual amenities that ARE recorded, and suggest relevant alternative stays from `stays` that DO list it (e.g. Elephants Hotel Bu\xF4n Ma Thu\u1ED9t or M\u01B0\u1EDDng Thanh Luxury Bu\xF4n Ma Thu\u1ED9t for a pool).",
        "- For general or external questions (e.g. airport transfers, flights/buses, festivals, external attractions, restaurants, cafes, history, culture, weather), provide a helpful, accurate answer using `tavilyLiveWebAnswer`, `tavilySnippets`, and \u0110\u1EAFk L\u1EAFk domain knowledge.",
        "- Do NOT mutate or claim to have modified the active itinerary.",
        "- Never invent nonexistent stops or amenities, and never suggest elephant riding."
      ].join("\n");
      const prompt = [
        `currentState: duration=${req.currentState.duration}, companion=${req.currentState.companion}, budget=${req.currentState.budget}, theme=${req.currentState.theme}`,
        `currentDays:
${JSON.stringify(req.currentState.days)}`,
        `stays:
${JSON.stringify(groundedCtx.stays)}`,
        `logistics:
${JSON.stringify(groundedCtx.logistics)}`,
        `dakLakPlaceDirectory:
${JSON.stringify(groundedCtx.places)}`,
        `seasonsData:
${JSON.stringify(groundedCtx.seasons)}`,
        tavilyCtx.answer ? `tavilyLiveWebAnswer:
${tavilyCtx.answer}` : "",
        tavilyCtx.snippets.length > 0 ? `tavilySnippets:
${JSON.stringify(tavilyCtx.snippets)}` : "",
        historySnippet ? `recentHistory:
${historySnippet}` : "",
        `question: ${req.message}`
      ].filter(Boolean).join("\n\n");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(1e4, AI_CHAT_TIMEOUT_MS));
      try {
        const llmOut = await withOpenInferenceSpan(
          "gemini_follow_up_trip_qa",
          {
            kind: OpenInferenceSpanKind4.LLM,
            input: prompt,
            attributes: {
              [LLM_MODEL_NAME2]: model,
              [LLM_PROVIDER2]: "google",
              [LLM_SYSTEM2]: "gemini"
            },
            formatOutput: (res) => res.rawText
          },
          async () => {
            const response = await fetchFn(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 1200
                }
              })
            });
            if (!response.ok) {
              throw new Error(`Gemini trip_qa HTTP ${response.status}`);
            }
            const data = await response.json();
            const rawText = (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("").trim();
            return { rawText };
          }
        );
        const reply = llmOut.rawText && !hasElephantRidingViolation(llmOut.rawText) ? llmOut.rawText : deterministicReply;
        return {
          intent: "general_qa",
          followUpAction: "current_trip_qa",
          reply,
          shouldOpenPlanner: false,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: [],
          ...tavilyCtx.citations.length > 0 ? { citations: tavilyCtx.citations } : {},
          status: "completed",
          provider: llmOut.rawText ? `gemini-ai:${model}` : "local-fallback"
        };
      } catch {
        return {
          intent: "general_qa",
          followUpAction: "current_trip_qa",
          reply: deterministicReply,
          shouldOpenPlanner: false,
          preferences: buildBasePreferences(req),
          resetItineraryToTheme: false,
          stopOperations: [],
          ...tavilyCtx.citations.length > 0 ? { citations: tavilyCtx.citations } : {},
          status: "completed",
          provider: "local-fallback"
        };
      } finally {
        clearTimeout(timer);
      }
    }
  );
}
async function routeFollowUp(req, options) {
  return withOpenInferenceSpan(
    "follow_up_router",
    {
      kind: OpenInferenceSpanKind4.CHAIN,
      input: {
        message: req.message,
        daysCount: req.currentState.days.length,
        duration: req.currentState.duration
      },
      formatOutput: (out) => ({
        followUpAction: out.followUpAction,
        handled: out.handled,
        classifierMethod: out.classifierMethod
      })
    },
    async () => {
      const fetchFn = options?.fetchFn ?? fetch;
      const { action, method } = await classifyFollowUpAction(req, options);
      if (action === "full_replan") {
        return {
          followUpAction: "full_replan",
          handled: false,
          classifierMethod: method
        };
      }
      let response;
      switch (action) {
        case "modify_stops":
          response = await handleModifyStopsFollowUp(req, fetchFn);
          break;
        case "adjust_budget":
          response = await handleAdjustBudgetFollowUp(req);
          break;
        case "swap_logistics":
          response = await handleSwapLogisticsFollowUp(req, options);
          break;
        case "reorder_or_pace":
          response = await handleReorderOrPaceFollowUp(req);
          break;
        case "current_trip_qa":
        default:
          response = await handleCurrentTripQaFollowUp(req, fetchFn, options);
          break;
      }
      return {
        followUpAction: action,
        handled: true,
        response,
        classifierMethod: method
      };
    }
  );
}

// server/services/ai/workflow/phase3Budget.ts
import { OpenInferenceSpanKind as OpenInferenceSpanKind5 } from "@arizeai/openinference-semantic-conventions";
var DAILY_FOOD_PER_PERSON_VND = {
  budget: 2e5,
  standard: 34e4,
  luxury: 58e4
};
async function runPhase3Budget(intake, capacityPlan, options) {
  return withOpenInferenceSpan(
    "phase3_budget",
    {
      kind: OpenInferenceSpanKind5.CHAIN,
      input: {
        totalBudgetVnd: intake.totalBudgetVnd,
        budgetTier: intake.budgetTier,
        dayCount: capacityPlan.dayCount,
        travelersCount: capacityPlan.travelersCount
      },
      formatOutput: (res) => ({
        totalBudgetVnd: res.totalBudgetVnd,
        availableActivityBudgetVnd: res.availableActivityBudgetVnd,
        estimatedTotalVnd: res.estimatedTotalVnd,
        feasibleCount: res.feasiblePlaces.length,
        excludedCount: res.excludedOverBudget.length
      })
    },
    () => runPhase3BudgetImpl(intake, capacityPlan, options)
  );
}
async function runPhase3BudgetImpl(intake, capacityPlan, options) {
  const nowMs = options?.nowMs ?? Date.now();
  const totalBudgetVnd = intake.totalBudgetVnd && intake.totalBudgetVnd > 0 ? Math.round(intake.totalBudgetVnd) : Math.round(
    budgetMultipliers[intake.budgetTier].perDay * capacityPlan.dayCount * capacityPlan.travelersCount
  );
  const nights = Math.max(1, capacityPlan.dayCount - 1);
  const roomsNeeded = capacityPlan.selectedStay ? Math.max(
    1,
    Math.ceil(
      capacityPlan.travelersCount / Math.max(1, capacityPlan.selectedStay.capacityMax)
    )
  ) : 1;
  const rawStayVnd = capacityPlan.selectedStay ? capacityPlan.selectedStay.nightlyRateVnd * nights * roomsNeeded : Math.round(totalBudgetVnd * AI_PRICE_POLICY.lodgingShareCapPct / 100);
  const rawTransitVnd = capacityPlan.selectedLogistics ? capacityPlan.selectedLogistics.dailyRateVnd * capacityPlan.dayCount : Math.round(totalBudgetVnd * AI_PRICE_POLICY.transitShareCapPct / 100);
  const contingencyVnd = Math.round(
    totalBudgetVnd * AI_PRICE_POLICY.contingencyBufferPct / 100
  );
  const reservedStayVnd = Math.min(rawStayVnd, Math.round(totalBudgetVnd * 0.55));
  const remainingAfterStay = Math.max(0, totalBudgetVnd - reservedStayVnd - contingencyVnd);
  const reservedTransitVnd = Math.min(rawTransitVnd, Math.round(remainingAfterStay * 0.5));
  const targetFoodVnd = DAILY_FOOD_PER_PERSON_VND[intake.budgetTier] * capacityPlan.travelersCount * capacityPlan.dayCount;
  const remainingAfterTransit = Math.max(
    0,
    totalBudgetVnd - reservedStayVnd - reservedTransitVnd - contingencyVnd
  );
  const reservedFoodVnd = Math.min(targetFoodVnd, Math.round(remainingAfterTransit * 0.6));
  const availableActivityBudgetVnd = Math.max(
    0,
    totalBudgetVnd - reservedStayVnd - reservedTransitVnd - reservedFoodVnd - contingencyVnd
  );
  const enrichedPlaces = options?.places ? options.places.map((p) => ({ ...p })) : await listEnrichedPlaces(AI_PRICE_TTL_HOURS, nowMs);
  const citations = [];
  const disclaimers = [];
  const tavilyLookup = options?.tavilyLookupFn ?? searchPlacePriceWithTavily;
  const canRunTavily = !options?.forceSkipTavily && (Boolean(TAVILY_API_KEY.trim()) || Boolean(options?.tavilyLookupFn));
  const stalePlaces = enrichedPlaces.filter((p) => p.isStale).sort((a, b) => {
    const aMatch = a.themeTags.includes(intake.mainPurpose) ? 1 : 0;
    const bMatch = b.themeTags.includes(intake.mainPurpose) ? 1 : 0;
    return bMatch - aMatch;
  }).slice(0, 4);
  let usedEstimateFallback = false;
  const isEn = options?.lang === "en";
  if (!canRunTavily) {
    if (stalePlaces.length > 0) {
      usedEstimateFallback = true;
    }
  } else if (stalePlaces.length > 0) {
    const refreshResults = await Promise.all(
      stalePlaces.map(async (stale) => {
        try {
          const refreshed = await tavilyLookup(stale.title, stale.areaCluster, {
            fallbackTicketVnd: stale.ticketVnd,
            fallbackEstimatedSpendVnd: stale.estimatedSpendVnd
          });
          return { stale, refreshed };
        } catch {
          return { stale, refreshed: null };
        }
      })
    );
    for (const { stale, refreshed } of refreshResults) {
      if (refreshed) {
        stale.ticketVnd = refreshed.ticketVnd;
        stale.estimatedSpendVnd = refreshed.estimatedSpendVnd;
        stale.priceSource = "tavily";
        stale.priceNote = refreshed.priceNote;
        stale.sourceUrl = refreshed.sourceUrl;
        stale.fetchedAt = new Date(nowMs).toISOString();
        stale.isStale = false;
        if (!options?.skipSqliteUpsert) {
          await upsertPlacePrice({
            placeTitle: stale.title,
            areaCluster: stale.areaCluster,
            ticketVnd: refreshed.ticketVnd,
            estimatedSpendVnd: refreshed.estimatedSpendVnd,
            priceSource: "tavily",
            priceNote: refreshed.priceNote,
            sourceUrl: refreshed.sourceUrl,
            fetchedAt: stale.fetchedAt
          });
        }
        for (const c of refreshed.citations) {
          if (!citations.some((existing) => existing.url === c.url)) {
            citations.push(c);
          }
        }
      } else {
        usedEstimateFallback = true;
      }
    }
  }
  if (usedEstimateFallback || enrichedPlaces.some((p) => p.priceSource === "estimated")) {
    disclaimers.push(
      isEn ? "Some attraction ticket/activity costs use internal reference estimates while live online data is unavailable." : "M\u1ED9t s\u1ED1 gi\xE1 v\xE9/chi ph\xED tham quan d\xF9ng m\u1EE9c \u01B0\u1EDBc t\xEDnh tham chi\u1EBFu n\u1ED9i b\u1ED9 do d\u1EEF li\u1EC7u tr\u1EF1c tuy\u1EBFn ch\u01B0a kh\u1EA3 d\u1EE5ng."
    );
  }
  const feasiblePlaces = [];
  const excludedOverBudget = [];
  for (const place of enrichedPlaces) {
    const groupCostVnd = place.estimatedSpendVnd * capacityPlan.travelersCount;
    const item = {
      title: place.title,
      location: place.location,
      areaCluster: place.areaCluster,
      themeTags: place.themeTags,
      ticketVnd: place.ticketVnd,
      estimatedSpendVnd: place.estimatedSpendVnd,
      priceSource: place.priceSource,
      priceNote: place.priceNote,
      sourceUrl: place.sourceUrl,
      fetchedAt: place.fetchedAt,
      isStale: place.isStale
    };
    if (groupCostVnd > availableActivityBudgetVnd && groupCostVnd > 0) {
      excludedOverBudget.push({
        ...item,
        reason: isEn ? `Estimated cost for ${capacityPlan.travelersCount} guests (${groupCostVnd.toLocaleString("en-US")} VND) exceeds remaining activity budget (${availableActivityBudgetVnd.toLocaleString("en-US")} VND).` : `Chi ph\xED \u01B0\u1EDBc t\xEDnh cho ${capacityPlan.travelersCount} kh\xE1ch (${groupCostVnd.toLocaleString(
          "vi-VN"
        )}\u0111) v\u01B0\u1EE3t ng\xE2n s\xE1ch ho\u1EA1t \u0111\u1ED9ng c\xF2n l\u1EA1i (${availableActivityBudgetVnd.toLocaleString("vi-VN")}\u0111).`
      });
    } else if (availableActivityBudgetVnd > 0 && capacityPlan.maxStopsTotal >= 3 && groupCostVnd > availableActivityBudgetVnd * 0.75 && place.estimatedSpendVnd >= 4e5) {
      excludedOverBudget.push({
        ...item,
        reason: isEn ? `High activity cost (${groupCostVnd.toLocaleString("en-US")} VND) would consume >75% of the activity budget, leaving insufficient room for other stops.` : `Chi ph\xED ho\u1EA1t \u0111\u1ED9ng cao (${groupCostVnd.toLocaleString(
          "vi-VN"
        )}\u0111) s\u1EBD chi\u1EBFm >75% qu\u1EF9 tham quan, c\u1EA7n gi\u1EEF c\xE2n \u0111\u1ED1i cho c\xE1c \u0111i\u1EC3m kh\xE1c.`
      });
    } else {
      feasiblePlaces.push(item);
    }
  }
  const lowestStopsCost = [...feasiblePlaces].sort((a, b) => a.estimatedSpendVnd - b.estimatedSpendVnd).slice(0, Math.min(capacityPlan.maxStopsTotal, feasiblePlaces.length)).reduce((sum, p) => sum + p.estimatedSpendVnd * capacityPlan.travelersCount, 0);
  const estimatedTotalVnd = reservedStayVnd + reservedTransitVnd + reservedFoodVnd + contingencyVnd + Math.min(lowestStopsCost, availableActivityBudgetVnd);
  const isWithinBudget = estimatedTotalVnd <= totalBudgetVnd;
  if (!isWithinBudget) {
    disclaimers.push(
      isEn ? `Minimum estimated total (${estimatedTotalVnd.toLocaleString("en-US")} VND) slightly exceeds target budget (${totalBudgetVnd.toLocaleString("en-US")} VND).` : `T\u1ED5ng d\u1EF1 to\xE1n t\u1ED1i thi\u1EC3u (${estimatedTotalVnd.toLocaleString(
        "vi-VN"
      )}\u0111) \u0111ang nh\u1EC9nh h\u01A1n ng\xE2n s\xE1ch m\u1EE5c ti\xEAu (${totalBudgetVnd.toLocaleString("vi-VN")}\u0111).`
    );
  }
  return {
    totalBudgetVnd,
    budgetTier: intake.budgetTier,
    reservedStayVnd,
    reservedTransitVnd,
    reservedFoodVnd,
    contingencyVnd,
    availableActivityBudgetVnd,
    estimatedTotalVnd,
    isWithinBudget,
    feasiblePlaces,
    excludedOverBudget,
    citations,
    disclaimers
  };
}

// server/services/ai/workflow/phase4Purpose.ts
import { OpenInferenceSpanKind as OpenInferenceSpanKind6, SemanticConventions as SemanticConventions4 } from "@arizeai/openinference-semantic-conventions";
var SEASONAL_PLACE_BOOSTS = [
  {
    keyword: "th\xE1ng 7",
    placeTitle: "Th\xE1c Dray Nur H\xF9ng V\u0129",
    boost: 26,
    reason: "M\xF9a m\u01B0a r\u1EEBng (T7\u2013T9) gi\xFAp th\xE1c Dray Nur \u0111\u1EA1t l\u01B0u l\u01B0\u1EE3ng n\u01B0\u1EDBc h\xF9ng v\u0129 nh\u1EA5t."
  },
  {
    keyword: "m\xF9a thu",
    placeTitle: "Th\xE1c Dray Nur H\xF9ng V\u0129",
    boost: 26,
    reason: "Cao \u0111i\u1EC3m m\xF9a th\xE1c n\u01B0\u1EDBc T\xE2y Nguy\xEAn (T7\u2013T9)."
  },
  {
    keyword: "th\xE1ng 10",
    placeTitle: "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n",
    boost: 26,
    reason: "M\xF9a thu ho\u1EA1ch tr\xE1i c\xE0 ph\xEA ch\xEDn \u0111\u1ECF (T10\u2013T12) r\u1EA5t h\u1EE3p tr\u1EA3i nghi\u1EC7m h\xE1i & cupping."
  },
  {
    keyword: "m\xF9a \u0111\xF4ng",
    placeTitle: "N\xF4ng tr\u1EA1i C\xE0 ph\xEA Ea T\xE2n",
    boost: 26,
    reason: "M\xF9a d\xE3 qu\u1EF3 & thu ho\u1EA1ch c\xE0 ph\xEA ch\xEDn \u0111\u1ECF (T10\u2013T12)."
  },
  {
    keyword: "m\xF9a \u0111\xF4ng",
    placeTitle: "B\u1EA3o t\xE0ng Th\u1EBF gi\u1EDBi C\xE0 ph\xEA",
    boost: 16,
    reason: "Ph\xF9 h\u1EE3p h\xE0nh tr\xECnh ch\u1EE7 \u0111\u1EC1 thu ho\u1EA1ch c\xE0 ph\xEA cu\u1ED1i n\u0103m."
  },
  {
    keyword: "m\xF9a xu\xE2n",
    placeTitle: "Bu\xF4n c\u1ED5 Ako Dh\xF4ng",
    boost: 18,
    reason: "M\xF9a xu\xE2n hoa c\xE0 ph\xEA tr\u1EAFng & kh\xF4ng kh\xED l\u1EC5 h\u1ED9i c\u1ED3ng chi\xEAng \u0111\u1EA7u n\u0103m."
  },
  {
    keyword: "m\xF9a h\u1EA1",
    placeTitle: "H\u1ED3 L\u1EAFk & Bu\xF4n Jun",
    boost: 22,
    reason: "N\u1EAFng cao nguy\xEAn r\u1EF1c r\u1EE1 (T4\u2013T6), l\xFD t\u01B0\u1EDFng ch\xE8o thuy\u1EC1n \u0111\u1ED9c m\u1ED9c H\u1ED3 L\u1EAFk."
  }
];
function scorePlaceDeterministically(place, intake, capacityPlan, lang = "vi") {
  let score = 20;
  const matchReasons = [];
  const isEn = lang === "en";
  if (place.themeTags[0] === intake.mainPurpose) {
    score += 40;
    matchReasons.push(
      isEn ? `Primary ${intake.mainPurpose} theme highlight` : `Tr\u1ECDng t\xE2m ch\u1EE7 \u0111\u1EC1 ${intake.mainPurpose}`
    );
  } else if (place.themeTags.includes(intake.mainPurpose)) {
    score += 24;
    matchReasons.push(
      isEn ? `Fits ${intake.mainPurpose} theme` : `Ph\xF9 h\u1EE3p ch\u1EE7 \u0111\u1EC1 ${intake.mainPurpose}`
    );
  }
  if (place.themeTags.includes(capacityPlan.seasonTheme)) {
    score += 14;
    matchReasons.push(
      isEn ? `Matches ${capacityPlan.seasonHeadline} season` : `H\u1EE3p m\xF9a ${capacityPlan.seasonHeadline}`
    );
  }
  const seasonHay = `${capacityPlan.seasonMilestone} ${capacityPlan.seasonHeadline}`.toLowerCase();
  for (const rule of SEASONAL_PLACE_BOOSTS) {
    if (seasonHay.includes(rule.keyword) && place.title === rule.placeTitle) {
      score += rule.boost;
      matchReasons.push(rule.reason);
    }
  }
  const placeHay = `${place.title} ${place.location} ${place.areaCluster}`.toLowerCase();
  for (const interest of intake.secondaryInterests) {
    const clean = interest.toLowerCase().trim();
    if (clean.length >= 2 && placeHay.includes(clean)) {
      score += 12;
      matchReasons.push(
        isEn ? `Matches secondary interest "${interest}"` : `Kh\u1EDBp s\u1EDF th\xEDch ph\u1EE5 "${interest}"`
      );
    }
  }
  if (intake.budgetTier === "budget" && place.estimatedSpendVnd <= 15e4) {
    score += 8;
    matchReasons.push(
      isEn ? "Budget-friendly cost, easy to balance overall budget" : "Chi ph\xED ti\u1EBFt ki\u1EC7m, d\u1EC5 c\xE2n \u0111\u1ED1i ng\xE2n s\xE1ch"
    );
  }
  if (place.areaCluster === "BMT") {
    score += 5;
  }
  return {
    ...place,
    score,
    matchReasons
  };
}
async function applyGeminiDecisionsBatchScoring(ranked, intake, capacityPlan, fetchFn = fetch) {
  const decisionModel = GEMINI_DECISION_MODEL.trim();
  const apiKey = GEMINI_API_KEY.trim();
  if (!decisionModel || !apiKey || ranked.length === 0) {
    return { scored: ranked, usedDecisionsApi: false };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5e3);
  try {
    const questions = {};
    ranked.forEach((place, idx) => {
      questions[`place_${idx}`] = {
        type: "score",
        instructions: `Rate how well "${place.title}" (${place.areaCluster}, tags=${place.themeTags.join(
          ","
        )}, spend=${place.estimatedSpendVnd} VND) fits this trip.`,
        legend: [
          "Weak fit for user goal or season",
          "Moderate supporting stop",
          "Strong thematic & seasonal fit",
          "Top must-visit highlight for this traveler"
        ]
      };
    });
    const inputText = [
      `Goal: ${intake.rawUserGoal || intake.mainPurpose}`,
      `Main purpose: ${intake.mainPurpose}`,
      `Secondary interests: ${intake.secondaryInterests.join(", ") || "none"}`,
      `Companion: ${capacityPlan.companionType} (${capacityPlan.travelersCount} pax)`,
      `Duration: ${capacityPlan.dayCount} days`,
      `Season: ${capacityPlan.seasonHeadline}`
    ].join("\n");
    const response = await fetchFn("https://generativelanguage.googleapis.com/v1beta/decisions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: decisionModel,
        input: inputText,
        questions
      })
    });
    if (!response.ok) {
      return { scored: ranked, usedDecisionsApi: false };
    }
    const data = await response.json();
    if (!data.answers) {
      return { scored: ranked, usedDecisionsApi: false };
    }
    const updated = ranked.map((place, idx) => {
      const ans = data.answers?.[`place_${idx}`];
      const rawScore = typeof ans?.score === "number" ? ans.score : typeof ans?.expectedScore === "number" ? ans.expectedScore : null;
      if (rawScore === null) return place;
      const bonus = Math.round(Math.max(0, Math.min(3, rawScore)) * 10);
      return {
        ...place,
        score: place.score + bonus,
        matchReasons: [...place.matchReasons, `Gemini Decisions score +${bonus}`]
      };
    });
    return { scored: updated, usedDecisionsApi: true };
  } catch {
    return { scored: ranked, usedDecisionsApi: false };
  } finally {
    clearTimeout(timer);
  }
}
async function runPhase4Purpose(intake, capacityPlan, budgetResult, options) {
  return withOpenInferenceSpan(
    "phase4_purpose",
    {
      kind: OpenInferenceSpanKind6.CHAIN,
      input: {
        mainPurpose: intake.mainPurpose,
        secondaryInterests: intake.secondaryInterests,
        feasiblePlacesCount: budgetResult.feasiblePlaces.length,
        maxStopsTotal: capacityPlan.maxStopsTotal
      },
      formatOutput: (res) => ({
        scoringMethod: res.scoringMethod,
        selectedPlaces: res.selectedPlaces.map((p) => p.title),
        areaClustersUsed: res.areaClustersUsed,
        storySlugs: res.relevantPosts.map((p) => p.slug)
      })
    },
    async () => {
      const initialRanked = budgetResult.feasiblePlaces.map(
        (place) => scorePlaceDeterministically(place, intake, capacityPlan, options?.lang || "vi")
      );
      const { scored, usedDecisionsApi } = await applyGeminiDecisionsBatchScoring(
        initialRanked,
        intake,
        capacityPlan,
        options?.fetchFn
      );
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.estimatedSpendVnd - b.estimatedSpendVnd;
      });
      const outerClusterScores = /* @__PURE__ */ new Map();
      for (const item of scored) {
        if (item.areaCluster !== "BMT" && item.areaCluster !== "Ea Kao") {
          const prev = outerClusterScores.get(item.areaCluster) || 0;
          if (item.score > prev) outerClusterScores.set(item.areaCluster, item.score);
        }
      }
      const rankedOuterClusters = Array.from(outerClusterScores.entries()).sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);
      const maxOuterClusters = capacityPlan.dayCount <= 2 ? 1 : capacityPlan.dayCount === 3 ? 2 : 3;
      const allowedClusters = /* @__PURE__ */ new Set([
        "BMT",
        "Ea Kao",
        ...rankedOuterClusters.slice(0, maxOuterClusters)
      ]);
      const selectedPlaces = [];
      const backupPlaces = [];
      let remainingActivityBudget = budgetResult.availableActivityBudgetVnd;
      for (const item of scored) {
        const groupCost = item.estimatedSpendVnd * capacityPlan.travelersCount;
        if (selectedPlaces.length < capacityPlan.maxStopsTotal && allowedClusters.has(item.areaCluster) && groupCost <= remainingActivityBudget) {
          selectedPlaces.push(item);
          remainingActivityBudget -= groupCost;
        } else {
          backupPlaces.push(item);
        }
      }
      if (selectedPlaces.length < Math.min(capacityPlan.maxStopsTotal, scored.length)) {
        const stillRemaining = [];
        for (const item of backupPlaces) {
          const groupCost = item.estimatedSpendVnd * capacityPlan.travelersCount;
          if (selectedPlaces.length < capacityPlan.maxStopsTotal && groupCost <= remainingActivityBudget) {
            selectedPlaces.push(item);
            remainingActivityBudget -= groupCost;
          } else {
            stillRemaining.push(item);
          }
        }
        backupPlaces.length = 0;
        backupPlaces.push(...stillRemaining);
      }
      const areaClustersUsed = Array.from(new Set(selectedPlaces.map((p) => p.areaCluster)));
      const queryPosts = options?.queryPostsFn ?? queryRelevantPublishedPosts;
      const queryParams = {
        lang: options?.lang || "vi",
        themeKey: intake.mainPurpose,
        locations: areaClustersUsed,
        limit: 4
      };
      const posts = await withOpenInferenceSpan(
        "cms_editorial_retriever",
        {
          kind: OpenInferenceSpanKind6.RETRIEVER,
          input: queryParams,
          formatOutput: (docs) => docs.map((d) => ({ slug: d.slug, title: d.title })),
          onSuccess: (span, docs) => {
            docs.forEach((doc, idx) => {
              span.setAttribute(
                `${SemanticConventions4.RETRIEVAL_DOCUMENTS}.${idx}.${SemanticConventions4.DOCUMENT_ID}`,
                doc.slug
              );
              span.setAttribute(
                `${SemanticConventions4.RETRIEVAL_DOCUMENTS}.${idx}.${SemanticConventions4.DOCUMENT_CONTENT}`,
                `${doc.title}: ${doc.excerpt}`
              );
              span.setAttribute(
                `${SemanticConventions4.RETRIEVAL_DOCUMENTS}.${idx}.${SemanticConventions4.DOCUMENT_METADATA}`,
                JSON.stringify({ category: doc.category, location: doc.location, themeKey: doc.themeKey })
              );
            });
          }
        },
        async () => await queryPosts(queryParams)
      );
      const relevantPosts = posts.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        category: p.category,
        location: p.location,
        excerpt: p.excerpt,
        themeKey: p.themeKey
      }));
      return {
        mainPurpose: intake.mainPurpose,
        selectedPlaces,
        backupPlaces,
        areaClustersUsed,
        relevantPosts,
        scoringMethod: usedDecisionsApi ? "gemini_decisions" : "deterministic"
      };
    }
  );
}

// server/services/ai/workflow/phase5Synthesis.ts
import {
  LLM_MODEL_NAME as LLM_MODEL_NAME3,
  LLM_PROVIDER as LLM_PROVIDER3,
  LLM_SYSTEM as LLM_SYSTEM3,
  LLM_TOKEN_COUNT_COMPLETION as LLM_TOKEN_COUNT_COMPLETION3,
  LLM_TOKEN_COUNT_PROMPT as LLM_TOKEN_COUNT_PROMPT3,
  LLM_TOKEN_COUNT_TOTAL as LLM_TOKEN_COUNT_TOTAL3,
  OpenInferenceSpanKind as OpenInferenceSpanKind7,
  SemanticConventions as SemanticConventions5
} from "@arizeai/openinference-semantic-conventions";
function buildGroundedCitations(budgetResult, purposeSelection) {
  const citations = [];
  for (const c of budgetResult.citations) {
    if (!citations.some((x) => x.url === c.url)) {
      citations.push(c);
    }
  }
  for (const post of purposeSelection.relevantPosts) {
    const url = `/blog/${post.slug}`;
    if (!citations.some((x) => x.url === url)) {
      citations.push({
        title: post.title,
        url,
        snippet: post.excerpt,
        source: "cms"
      });
    }
  }
  return citations;
}
function formatStayMoveText(capacityPlan, lang) {
  const isEn = lang === "en";
  const stayText = capacityPlan.selectedStay ? isEn ? `${capacityPlan.selectedStay.name} (${capacityPlan.selectedStay.area} \u2022 ~${capacityPlan.selectedStay.nightlyRateVnd.toLocaleString(
    "en-US"
  )} VND/night)` : `${capacityPlan.selectedStay.name} (${capacityPlan.selectedStay.area} \u2022 ~${capacityPlan.selectedStay.nightlyRateVnd.toLocaleString(
    "vi-VN"
  )}\u0111/\u0111\xEAm)` : budgetMultipliers[capacityPlan.recommendedStays[0]?.tier || "standard"].stayMove;
  const transitText = capacityPlan.selectedLogistics ? isEn ? `${capacityPlan.selectedLogistics.label} (~${capacityPlan.selectedLogistics.dailyRateVnd.toLocaleString(
    "en-US"
  )} VND/day)` : `${capacityPlan.selectedLogistics.label} (~${capacityPlan.selectedLogistics.dailyRateVnd.toLocaleString(
    "vi-VN"
  )}\u0111/ng\xE0y)` : "";
  return [stayText, transitText].filter(Boolean).join(" \u2022 ");
}
function distributePlacesAcrossDays(selectedPlaces, dayCount) {
  const buckets = Array.from({ length: dayCount }, () => []);
  if (selectedPlaces.length === 0) return buckets;
  const bmtPlaces = selectedPlaces.filter(
    (p) => p.areaCluster === "BMT" || p.areaCluster === "Ea Kao"
  );
  const outerByCluster = /* @__PURE__ */ new Map();
  for (const p of selectedPlaces) {
    if (p.areaCluster !== "BMT" && p.areaCluster !== "Ea Kao") {
      const list = outerByCluster.get(p.areaCluster) || [];
      list.push(p);
      outerByCluster.set(p.areaCluster, list);
    }
  }
  const ordered = [
    ...bmtPlaces,
    ...Array.from(outerByCluster.values()).flat()
  ];
  let idx = 0;
  for (let d = 0; d < dayCount; d++) {
    const remainingDays = dayCount - d;
    const remainingItems = ordered.length - idx;
    const take = Math.max(0, Math.ceil(remainingItems / remainingDays));
    buckets[d] = ordered.slice(idx, idx + take);
    idx += take;
  }
  return buckets;
}
function toSlotPlan(place, slotIndex, lang = "vi") {
  const meta = dakLakPlaceDirectory.find(
    (d) => d.title.toLowerCase() === place.title.toLowerCase()
  );
  const isEn = lang === "en";
  const timeDefaults = [
    { time: "08:00 \u2013 10:00", period: isEn ? "Morning" : "Bu\u1ED5i s\xE1ng" },
    { time: "10:30 \u2013 12:00", period: isEn ? "Late morning" : "Gi\u1EEFa s\xE1ng" },
    { time: "14:30 \u2013 16:45", period: isEn ? "Afternoon" : "Bu\u1ED5i chi\u1EC1u" },
    { time: "18:30 \u2013 20:30", period: isEn ? "Evening" : "Bu\u1ED5i t\u1ED1i" }
  ];
  const fallbackTiming = timeDefaults[Math.min(slotIndex, timeDefaults.length - 1)];
  return {
    time: meta?.time || fallbackTiming.time,
    period: meta?.period || fallbackTiming.period,
    title: place.title,
    location: place.location,
    desc: meta?.desc || place.matchReasons.join(". ") || (isEn ? `Explore ${place.title}.` : `Kh\xE1m ph\xE1 ${place.title}.`),
    isCustom: false,
    areaCluster: place.areaCluster,
    x: meta?.x,
    y: meta?.y,
    lat: meta?.lat,
    lng: meta?.lng,
    googleMapsQuery: meta?.googleMapsQuery,
    category: meta?.category,
    duration: meta?.duration,
    estimatedCostVnd: place.estimatedSpendVnd
  };
}
function computeTotalEstimatedKm(days) {
  const allSlots = days.flatMap((d) => d.slots);
  if (allSlots.length < 2) return 15;
  let total = 0;
  for (let i = 1; i < allSlots.length; i++) {
    total += computeLegMetrics(
      {
        title: allSlots[i - 1].title,
        location: allSlots[i - 1].location,
        x: allSlots[i - 1].x ?? 378,
        y: allSlots[i - 1].y ?? 196,
        lat: allSlots[i - 1].lat,
        lng: allSlots[i - 1].lng
      },
      {
        title: allSlots[i].title,
        location: allSlots[i].location,
        x: allSlots[i].x ?? 378,
        y: allSlots[i].y ?? 196,
        lat: allSlots[i].lat,
        lng: allSlots[i].lng
      }
    ).dist;
  }
  return Math.round(total);
}
function synthesizeDeterministicPlan(req, intake, capacityPlan, budgetResult, purposeSelection, provider = "local-fallback") {
  const cat = plannerCatalog[intake.mainPurpose];
  const dayBuckets = distributePlacesAcrossDays(
    purposeSelection.selectedPlaces,
    capacityPlan.dayCount
  );
  const isEn = req.lang === "en";
  const generatedDays = dayBuckets.map((places, dIdx) => {
    const clusters = Array.from(new Set(places.map((p) => p.areaCluster)));
    const slots = places.map((place, sIdx) => toSlotPlan(place, sIdx, req.lang));
    let dayKm = 0;
    for (let i = 1; i < slots.length; i++) {
      dayKm += computeLegMetrics(
        {
          title: slots[i - 1].title,
          location: slots[i - 1].location,
          x: slots[i - 1].x ?? 378,
          y: slots[i - 1].y ?? 196,
          lat: slots[i - 1].lat,
          lng: slots[i - 1].lng
        },
        {
          title: slots[i].title,
          location: slots[i].location,
          x: slots[i].x ?? 378,
          y: slots[i].y ?? 196,
          lat: slots[i].lat,
          lng: slots[i].lng
        }
      ).dist;
    }
    const dayLabel = req.lang === "en" ? `Day ${dIdx + 1}` : `Ng\xE0y ${dIdx + 1}`;
    const clusterSummary = clusters.length > 0 ? clusters.join(" \u2192 ") : "Bu\xF4n Ma Thu\u1ED9t";
    const dayTitle = cat.days[dIdx]?.title || (req.lang === "en" ? `Exploring ${clusterSummary}` : `Kh\xE1m ph\xE1 c\u1EE5m \u0111i\u1EC3m ${clusterSummary}`);
    return {
      day: dayLabel,
      title: dayTitle,
      area: `${clusterSummary} \u2022 ~${Math.round(Math.max(8, dayKm))} km`,
      slots
    };
  });
  const activitySum = purposeSelection.selectedPlaces.reduce(
    (sum, p) => sum + p.estimatedSpendVnd * capacityPlan.travelersCount,
    0
  );
  const nights = Math.max(1, capacityPlan.dayCount - 1);
  const generatedExpenses = [
    {
      id: "exp-stay",
      title: capacityPlan.selectedStay ? isEn ? `Stay (${nights} nights) \u2022 ${capacityPlan.selectedStay.name}` : `L\u01B0u tr\xFA ${nights} \u0111\xEAm \u2022 ${capacityPlan.selectedStay.name}` : isEn ? `Stay (${nights} nights)` : `L\u01B0u tr\xFA ${nights} \u0111\xEAm`,
      cat: "stay",
      amount: budgetResult.reservedStayVnd
    },
    {
      id: "exp-transit",
      title: capacityPlan.selectedLogistics ? isEn ? `Transport (${capacityPlan.dayCount} days) \u2022 ${capacityPlan.selectedLogistics.label}` : `Di chuy\u1EC3n ${capacityPlan.dayCount} ng\xE0y \u2022 ${capacityPlan.selectedLogistics.label}` : isEn ? `Transport (${capacityPlan.dayCount} days)` : `Di chuy\u1EC3n ${capacityPlan.dayCount} ng\xE0y`,
      cat: "transit",
      amount: budgetResult.reservedTransitVnd
    },
    {
      id: "exp-food",
      title: isEn ? `Local cuisine & specialty coffee (${capacityPlan.travelersCount} guests)` : `\u1EA8m th\u1EF1c b\u1EA3n \u0111\u1ECBa & c\xE0 ph\xEA (${capacityPlan.travelersCount} kh\xE1ch)`,
      cat: "food",
      amount: budgetResult.reservedFoodVnd
    },
    {
      id: "exp-act",
      title: isEn ? "Admission tickets, experiences & contingency" : "V\xE9 tham quan, tr\u1EA3i nghi\u1EC7m & d\u1EF1 ph\xF2ng",
      cat: "activity",
      amount: Math.min(
        budgetResult.availableActivityBudgetVnd + budgetResult.contingencyVnd,
        activitySum + budgetResult.contingencyVnd
      )
    }
  ];
  const citations = buildGroundedCitations(budgetResult, purposeSelection);
  const totalEstimatedKm = computeTotalEstimatedKm(generatedDays);
  const tips = [
    ...capacityPlan.notes,
    ...budgetResult.disclaimers,
    req.lang === "en" ? "Always choose ethical, non-riding elephant observation tours in Yok \u0110\xF4n National Park." : "\u01AFu ti\xEAn tr\u1EA3i nghi\u1EC7m \u0111i b\u1ED9 ng\u1EAFm voi t\u1EF1 nhi\xEAn kh\xF4ng c\u01B0\u1EE1i voi t\u1EA1i V\u01B0\u1EDDn Qu\u1ED1c gia Yok \u0110\xF4n."
  ].filter(Boolean);
  const itineraryMeta = {
    title: cat.title,
    stayMove: formatStayMoveText(capacityPlan, req.lang),
    routeTip: req.lang === "en" ? `Clustered route across ${purposeSelection.areaClustersUsed.join(", ") || "BMT"} (~${totalEstimatedKm} km total) to avoid backtracking.` : `Tuy\u1EBFn gom c\u1EE5m ${purposeSelection.areaClustersUsed.join(" \u2192 ") || "BMT"} (~${totalEstimatedKm} km t\u1ED5ng tuy\u1EBFn), h\u1EA1n ch\u1EBF quay \u0111\u1EA7u.`,
    tips: tips.slice(0, 4),
    hiddenGem: cat.hiddenGem,
    totalEstimatedKm
  };
  const companionText = companionLabels[capacityPlan.companionType];
  const themeText = themeLabels[intake.mainPurpose];
  const excludedCount = budgetResult.excludedOverBudget.length;
  const reply = req.lang === "en" ? `Created your ${intake.duration} ${themeText} itinerary for ${capacityPlan.travelersCount} traveler(s) (${companionText}) during ${capacityPlan.seasonHeadline}, keeping within ~${budgetResult.totalBudgetVnd.toLocaleString("en-US")} VND across ${purposeSelection.selectedPlaces.length} curated stops.${excludedCount > 0 ? ` Filtered out ${excludedCount} over-budget option(s) to stay within your limit.` : ""}` : `M\xECnh \u0111\xE3 thi\u1EBFt k\u1EBF l\u1ECBch tr\xECnh ${intake.duration} (${themeText}) cho ${capacityPlan.travelersCount} kh\xE1ch (${companionText}) v\xE0o ${capacityPlan.seasonHeadline}, t\u1ED1i \u01B0u trong ng\xE2n s\xE1ch ~${budgetResult.totalBudgetVnd.toLocaleString("vi-VN")}\u0111 v\u1EDBi ${purposeSelection.selectedPlaces.length} \u0111i\u1EC3m d\u1EEBng ch\u1ECDn l\u1ECDc.${excludedCount > 0 ? ` \u0110\xE3 l\u1ECDc b\u1EDBt ${excludedCount} \u0111i\u1EC3m v\u01B0\u1EE3t qu\u1EF9 ho\u1EA1t \u0111\u1ED9ng \u0111\u1EC3 gi\u1EEF t\u1ED5ng chi ph\xED an to\xE0n.` : ""}`;
  return {
    intent: "update_itinerary",
    reply,
    shouldOpenPlanner: true,
    preferences: {
      theme: intake.mainPurpose,
      duration: intake.duration,
      companion: capacityPlan.companionType,
      budget: intake.budgetTier
    },
    resetItineraryToTheme: true,
    stopOperations: [],
    suggestedTab: "map",
    provider,
    status: "completed",
    itineraryMeta,
    generatedDays,
    generatedExpenses,
    citations
  };
}
var PHASE5_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    itineraryMeta: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        stayMove: { type: "STRING" },
        routeTip: { type: "STRING" },
        tips: { type: "ARRAY", items: { type: "STRING" } },
        hiddenGem: { type: "STRING" }
      },
      required: ["title", "stayMove", "routeTip", "tips"]
    },
    generatedDays: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          day: { type: "STRING" },
          title: { type: "STRING" },
          area: { type: "STRING" },
          slots: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                time: { type: "STRING" },
                period: { type: "STRING" },
                title: { type: "STRING" },
                location: { type: "STRING" },
                desc: { type: "STRING" },
                areaCluster: { type: "STRING" },
                estimatedCostVnd: { type: "INTEGER" }
              },
              required: ["time", "period", "title", "location", "desc"]
            }
          }
        },
        required: ["day", "title", "area", "slots"]
      }
    },
    generatedExpenses: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          cat: { type: "STRING", enum: ["stay", "transit", "food", "activity"] },
          amount: { type: "INTEGER" },
          note: { type: "STRING" }
        },
        required: ["title", "cat", "amount"]
      }
    },
    suggestedTab: { type: "STRING", enum: ["map", "schedule", "tips"] }
  },
  required: ["reply", "itineraryMeta", "generatedDays", "generatedExpenses"]
};
async function runPhase5Synthesis(req, intake, capacityPlan, budgetResult, purposeSelection, retryFeedback) {
  return withOpenInferenceSpan(
    "phase5_synthesis",
    {
      kind: OpenInferenceSpanKind7.CHAIN,
      input: {
        mainPurpose: intake.mainPurpose,
        dayCount: capacityPlan.dayCount,
        selectedPlacesCount: purposeSelection.selectedPlaces.length,
        totalBudgetVnd: budgetResult.totalBudgetVnd,
        retryFeedback: retryFeedback || []
      },
      formatOutput: (res) => ({
        reply: res.reply,
        daysCount: res.generatedDays?.length || 0,
        expensesCount: res.generatedExpenses?.length || 0,
        provider: res.provider
      })
    },
    async () => {
      const deterministic = synthesizeDeterministicPlan(
        req,
        intake,
        capacityPlan,
        budgetResult,
        purposeSelection
      );
      const apiKey = GEMINI_API_KEY.trim();
      if (!apiKey) {
        return deterministic;
      }
      const model = GEMINI_MODEL.trim() || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const allowedPlacesJson = purposeSelection.selectedPlaces.map((p) => ({
        title: p.title,
        location: p.location,
        areaCluster: p.areaCluster,
        estimatedSpendVndPerPerson: p.estimatedSpendVnd,
        reasons: p.matchReasons
      }));
      const systemText = [
        'You are Phase 5 Synthesis for "\u0110\u1EAFk L\u1EAFk AI Travel Concierge".',
        `Language: "${req.lang}". Write all user-facing strings in ${req.lang === "en" ? "English" : "Vietnamese"}.`,
        "STRICT GROUNDING RULES:",
        `1. Create exactly ${capacityPlan.dayCount} days in generatedDays.`,
        '2. Every slot.title in generatedDays MUST use an EXACT "title" from ALLOWED_SELECTED_PLACES below. Do NOT invent new stop names.',
        `3. Total stops across all days MUST NOT exceed ${capacityPlan.maxStopsTotal}.`,
        `4. Keep each day within ${capacityPlan.maxDailyDistanceKm} km by grouping same/adjacent areaCluster stops on the same day.`,
        `5. Sum of generatedExpenses.amount MUST NOT exceed ${budgetResult.totalBudgetVnd} VND.`,
        "6. ETHICAL POLICY: NEVER recommend elephant riding; if Yok \u0110\xF4n is included, describe ethical non-riding walking observation only.",
        "7. Keep reply concise, warm, plain text (no markdown tables/HTML).",
        '8. If userGoal includes any specific question or concern alongside the trip request, directly address it in "reply" while summarizing the tailored itinerary.',
        retryFeedback && retryFeedback.length > 0 ? `
FIX THESE PREVIOUS EVALUATOR VIOLATIONS:
- ${retryFeedback.join("\n- ")}` : ""
      ].filter(Boolean).join("\n");
      const payloadContext = {
        userGoal: intake.rawUserGoal || req.message,
        duration: intake.duration,
        travelersCount: capacityPlan.travelersCount,
        companionType: capacityPlan.companionType,
        season: capacityPlan.seasonHeadline,
        stay: capacityPlan.selectedStay ? {
          name: capacityPlan.selectedStay.name,
          area: capacityPlan.selectedStay.area,
          totalStayVnd: budgetResult.reservedStayVnd
        } : null,
        logistics: capacityPlan.selectedLogistics ? {
          label: capacityPlan.selectedLogistics.label,
          totalTransitVnd: budgetResult.reservedTransitVnd
        } : null,
        budgetBreakdown: {
          totalBudgetVnd: budgetResult.totalBudgetVnd,
          reservedStayVnd: budgetResult.reservedStayVnd,
          reservedTransitVnd: budgetResult.reservedTransitVnd,
          reservedFoodVnd: budgetResult.reservedFoodVnd,
          contingencyVnd: budgetResult.contingencyVnd,
          availableActivityBudgetVnd: budgetResult.availableActivityBudgetVnd
        },
        ALLOWED_SELECTED_PLACES: allowedPlacesJson,
        disclaimers: budgetResult.disclaimers
      };
      const userPayloadStr = JSON.stringify(payloadContext);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AI_CHAT_TIMEOUT_MS);
      try {
        const llmCall = await withOpenInferenceSpan(
          "gemini_phase5_synthesis",
          {
            kind: OpenInferenceSpanKind7.LLM,
            input: userPayloadStr,
            attributes: {
              [LLM_MODEL_NAME3]: model,
              [LLM_PROVIDER3]: "google",
              [LLM_SYSTEM3]: "gemini",
              [`${SemanticConventions5.LLM_INPUT_MESSAGES}.0.${SemanticConventions5.MESSAGE_ROLE}`]: "system",
              [`${SemanticConventions5.LLM_INPUT_MESSAGES}.0.${SemanticConventions5.MESSAGE_CONTENT}`]: systemText,
              [`${SemanticConventions5.LLM_INPUT_MESSAGES}.1.${SemanticConventions5.MESSAGE_ROLE}`]: "user",
              [`${SemanticConventions5.LLM_INPUT_MESSAGES}.1.${SemanticConventions5.MESSAGE_CONTENT}`]: userPayloadStr
            },
            formatOutput: (res) => res.rawText,
            onSuccess: (span, res) => {
              span.setAttribute(
                `${SemanticConventions5.LLM_OUTPUT_MESSAGES}.0.${SemanticConventions5.MESSAGE_ROLE}`,
                "assistant"
              );
              span.setAttribute(
                `${SemanticConventions5.LLM_OUTPUT_MESSAGES}.0.${SemanticConventions5.MESSAGE_CONTENT}`,
                res.rawText
              );
              if (res.usage?.promptTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_PROMPT3, res.usage.promptTokenCount);
              }
              if (res.usage?.candidatesTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_COMPLETION3, res.usage.candidatesTokenCount);
              }
              if (res.usage?.totalTokenCount !== void 0) {
                span.setAttribute(LLM_TOKEN_COUNT_TOTAL3, res.usage.totalTokenCount);
              }
            }
          },
          async () => {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemText }] },
                contents: [{ role: "user", parts: [{ text: userPayloadStr }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: AI_RESPONSE_MAX_TOKENS,
                  responseMimeType: "application/json",
                  responseSchema: PHASE5_RESPONSE_SCHEMA
                }
              })
            });
            if (!response.ok) {
              const errBody = await response.text().catch(() => "");
              throw new Error(`Gemini Phase 5 HTTP ${response.status}: ${errBody.slice(0, 200)}`);
            }
            const data = await response.json();
            const rawText2 = (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("").trim();
            return { rawText: rawText2, usage: data.usageMetadata };
          }
        );
        const { rawText } = llmCall;
        if (!rawText) return deterministic;
        const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(jsonText);
        const rawDays = Array.isArray(parsed.generatedDays) && parsed.generatedDays.length > 0 ? parsed.generatedDays : deterministic.generatedDays;
        const hydratedDays = rawDays.map((day, dIdx) => ({
          day: String(day.day || `Ng\xE0y ${dIdx + 1}`),
          title: String(day.title || deterministic.generatedDays?.[dIdx]?.title || ""),
          area: String(day.area || ""),
          slots: (Array.isArray(day.slots) ? day.slots : []).map((slot) => {
            const dirMatch = dakLakPlaceDirectory.find(
              (p) => p.title.toLowerCase() === String(slot.title || "").trim().toLowerCase()
            );
            const selectedMatch = purposeSelection.selectedPlaces.find(
              (p) => p.title.toLowerCase() === String(slot.title || "").trim().toLowerCase()
            );
            return {
              time: String(slot.time || dirMatch?.time || "08:30 \u2013 10:30"),
              period: String(slot.period || dirMatch?.period || "Bu\u1ED5i s\xE1ng"),
              title: dirMatch?.title || String(slot.title || "").trim(),
              location: dirMatch?.location || String(slot.location || "\u0110\u1EAFk L\u1EAFk"),
              desc: String(slot.desc || dirMatch?.desc || ""),
              isCustom: !dirMatch,
              areaCluster: selectedMatch?.areaCluster || slot.areaCluster,
              x: dirMatch?.x,
              y: dirMatch?.y,
              lat: dirMatch?.lat,
              lng: dirMatch?.lng,
              googleMapsQuery: dirMatch?.googleMapsQuery,
              category: dirMatch?.category,
              duration: dirMatch?.duration,
              estimatedCostVnd: typeof slot.estimatedCostVnd === "number" ? slot.estimatedCostVnd : selectedMatch?.estimatedSpendVnd
            };
          })
        }));
        const generatedExpenses = Array.isArray(parsed.generatedExpenses) && parsed.generatedExpenses.length > 0 ? parsed.generatedExpenses.map((e, idx) => ({
          id: `exp-${idx + 1}`,
          title: String(e.title || "Chi ph\xED chuy\u1EBFn \u0111i"),
          cat: e.cat === "stay" || e.cat === "transit" || e.cat === "food" || e.cat === "activity" ? e.cat : "activity",
          amount: Math.max(0, Math.round(Number(e.amount) || 0)),
          note: typeof e.note === "string" ? e.note : void 0
        })) : deterministic.generatedExpenses;
        const itineraryMeta = {
          title: String(parsed.itineraryMeta?.title || deterministic.itineraryMeta.title),
          stayMove: String(parsed.itineraryMeta?.stayMove || deterministic.itineraryMeta.stayMove),
          routeTip: String(parsed.itineraryMeta?.routeTip || deterministic.itineraryMeta.routeTip),
          tips: Array.isArray(parsed.itineraryMeta?.tips) && parsed.itineraryMeta.tips.length > 0 ? parsed.itineraryMeta.tips.map((t) => String(t)) : deterministic.itineraryMeta.tips,
          hiddenGem: parsed.itineraryMeta?.hiddenGem || deterministic.itineraryMeta.hiddenGem,
          totalEstimatedKm: computeTotalEstimatedKm(hydratedDays)
        };
        return {
          ...deterministic,
          reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : deterministic.reply,
          itineraryMeta,
          generatedDays: hydratedDays,
          generatedExpenses,
          citations: deterministic.citations,
          suggestedTab: parsed.suggestedTab || "map",
          provider: `gemini-ai:${model}`
        };
      } catch {
        return deterministic;
      } finally {
        clearTimeout(timer);
      }
    }
  );
}

// server/services/ai/workflow/langGraphAgent.ts
var LANGGRAPH_TOOL_NAMES = [
  "search_local_daklak_catalog",
  "search_live_web_tavily",
  "update_trip_intake",
  "plan_or_modify_itinerary"
];
var VALID_THEMES2 = ["coffee", "culture", "nature", "cuisine"];
var VALID_DURATIONS2 = ["2N1D", "3N2D", "4N3D+"];
var VALID_COMPANIONS2 = ["solo", "couple", "family", "friends"];
var VALID_BUDGETS2 = ["budget", "standard", "luxury"];
var VALID_INTENTS = ["general_qa", "update_itinerary", "modify_stops"];
function sanitizeTheme(val, fallback) {
  return VALID_THEMES2.includes(val) ? val : fallback;
}
function sanitizeDuration(val, fallback) {
  return VALID_DURATIONS2.includes(val) ? val : fallback;
}
function sanitizeCompanion(val, fallback) {
  return VALID_COMPANIONS2.includes(val) ? val : fallback;
}
function sanitizeBudget(val, fallback) {
  return VALID_BUDGETS2.includes(val) ? val : fallback;
}
function sanitizeIntent(val, fallback) {
  return VALID_INTENTS.includes(val) ? val : fallback;
}
function dedupeCitations(citations) {
  const seen = /* @__PURE__ */ new Set();
  const unique = [];
  for (const c of citations) {
    if (!c || !c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    unique.push(c);
  }
  return unique;
}
function detectStopOperationsFallback(message, currentDays) {
  const lower = message.toLowerCase();
  const swapMatch = message.match(
    /(?:đổi|thay\s*thế|thay|swap|replace)\s+(.+?)\s+(?:sang|thành|bằng|qua|với|for|with|to)\s+(.+)/i
  );
  const isRemove = Boolean(swapMatch) || /(bỏ|xóa|bớt|gỡ|remove|drop|delete)/i.test(lower);
  const isAdd = Boolean(swapMatch) || /(thêm|ghé|bổ sung|add|include|visit)/i.test(lower);
  const removeSourceText = swapMatch ? swapMatch[1].toLowerCase() : lower;
  const addTargetText = swapMatch ? swapMatch[2].toLowerCase() : lower;
  const ops = [];
  const dayMatch = lower.match(/(?:ngày|day)\s*([1-4])/i);
  const dayNumber = dayMatch ? Number(dayMatch[1]) : void 0;
  if (isRemove) {
    for (const day of currentDays) {
      for (const slot of day.slots) {
        const titleLower = slot.title.toLowerCase();
        const keyWords = titleLower.split(/\s+/).filter((w) => w.length >= 3);
        if (removeSourceText.includes(titleLower) || keyWords.filter((w) => removeSourceText.includes(w)).length >= 2) {
          ops.push({ action: "remove", placeTitle: slot.title, dayNumber });
          break;
        }
      }
    }
  }
  if (isAdd || !isRemove) {
    const removedTitles = new Set(
      ops.filter((o) => o.action === "remove").map((o) => o.placeTitle.toLowerCase())
    );
    for (const place of dakLakPlaceDirectory) {
      const titleLower = place.title.toLowerCase();
      if (removedTitles.has(titleLower)) continue;
      const shortMatch = titleLower.includes("dray nur") && addTargetText.includes("dray nur") || titleLower.includes("h\u1ED3 l\u1EAFk") && addTargetText.includes("h\u1ED3 l\u1EAFk") || titleLower.includes("yok \u0111\xF4n") && addTargetText.includes("yok \u0111\xF4n") || titleLower.includes("ako dh\xF4ng") && addTargetText.includes("ako dh\xF4ng") || titleLower.includes("t\u01A1ng j\xFA") && addTargetText.includes("t\u01A1ng j\xFA") || titleLower.includes("ea t\xE2n") && addTargetText.includes("ea t\xE2n") || titleLower.includes("\u0111\xE1 voi") && addTargetText.includes("\u0111\xE1 voi") || titleLower.includes("b\u1EA3o t\xE0ng \u0111\u1EAFk l\u1EAFk") && addTargetText.includes("b\u1EA3o t\xE0ng \u0111\u1EAFk l\u1EAFk") || titleLower.includes("th\u1EBF gi\u1EDBi c\xE0 ph\xEA") && addTargetText.includes("th\u1EBF gi\u1EDBi c\xE0 ph\xEA") || titleLower.includes("trung nguy\xEAn") && addTargetText.includes("trung nguy\xEAn") || titleLower.includes("phan \u0111\xECnh gi\xF3t") && addTargetText.includes("phan \u0111\xECnh gi\xF3t") || titleLower.includes("b\u1EA3n \u0111\xF4n") && addTargetText.includes("b\u1EA3n \u0111\xF4n");
      if (addTargetText.includes(titleLower) || shortMatch) {
        ops.push({
          action: isRemove && !isAdd ? "remove" : "add",
          placeTitle: place.title,
          dayNumber,
          time: place.time,
          period: place.period
        });
      }
    }
  }
  return ops.slice(0, 4);
}
function buildModifyStopsReply(req, ops, preferences, provider) {
  const effectiveOps = ops.length > 0 ? ops : detectStopOperationsFallback(req.message, req.currentState.days);
  const summaryList = effectiveOps.map((op) => `${op.action === "remove" ? "-" : "+"} ${op.placeTitle}`).join(", ");
  const reply = effectiveOps.length > 0 ? req.lang === "en" ? `Updated your itinerary stops (${summaryList}) while keeping your current schedule intact.` : `\u0110\xE3 c\u1EADp nh\u1EADt \u0111i\u1EC3m d\u1EEBng trong l\u1ECBch tr\xECnh (${summaryList}) v\xE0 gi\u1EEF nguy\xEAn c\u1EA5u tr\xFAc c\xE1c ng\xE0y c\xF2n l\u1EA1i.` : req.lang === "en" ? "Could you specify the exact \u0110\u1EAFk L\u1EAFk place name you want to add or remove from your itinerary?" : "B\u1EA1n cho m\xECnh bi\u1EBFt t\xEAn \u0111i\u1EC3m d\u1EEBng c\u1EE5 th\u1EC3 mu\u1ED1n th\xEAm ho\u1EB7c b\u1EDBt trong l\u1ECBch tr\xECnh hi\u1EC7n t\u1EA1i nh\xE9!";
  return {
    intent: "modify_stops",
    reply,
    shouldOpenPlanner: true,
    preferences,
    resetItineraryToTheme: false,
    stopOperations: effectiveOps,
    suggestedTab: "schedule",
    status: "completed",
    provider
  };
}
var DakLakGraphStateAnnotation = Annotation.Root({
  req: Annotation({
    reducer: (_left, right) => right
  }),
  sessionId: Annotation({
    reducer: (_left, right) => right,
    default: () => "default_session"
  }),
  traceId: Annotation({
    reducer: (_left, right) => right,
    default: () => ""
  }),
  messages: Annotation({
    reducer: (left, right) => (Array.isArray(left) ? left : []).concat(Array.isArray(right) ? right : [right]),
    default: () => []
  }),
  intent: Annotation({
    reducer: (_left, right) => right,
    default: () => "general_qa"
  }),
  followUpAction: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  plannedTools: Annotation({
    reducer: (_left, right) => right,
    default: () => []
  }),
  intake: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  phase1Output: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  clarificationOptions: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  localContext: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  tavilyContext: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  plannerResults: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  response: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  toolsUsed: Annotation({
    reducer: (_left, right) => right,
    default: () => []
  }),
  graphNodesVisited: Annotation({
    reducer: (_left, right) => right,
    default: () => []
  }),
  evalAttempts: Annotation({
    reducer: (_left, right) => right,
    default: () => 0
  }),
  evalResult: Annotation({
    reducer: (_left, right) => right,
    default: () => void 0
  }),
  needsEvalRetry: Annotation({
    reducer: (_left, right) => right,
    default: () => false
  }),
  retryFeedback: Annotation({
    reducer: (_left, right) => right,
    default: () => []
  })
});
var sharedCheckpointer = new MemorySaver();
var traceMetadataStore = /* @__PURE__ */ new Map();
function getLangGraphTraceMetadata(traceId) {
  return traceMetadataStore.get(traceId);
}
function createDakLakLangGraphTools(context2) {
  const defaultReq = context2?.req || {
    message: "",
    lang: "vi",
    isFollowUp: false,
    currentState: {
      theme: "coffee",
      duration: "3N2D",
      companion: "couple",
      budget: "standard",
      days: []
    }
  };
  const opts = context2?.options;
  const searchLocalDakLakCatalogTool = tool(
    async (input) => {
      return withOpenInferenceSpan(
        "search_local_daklak_catalog",
        {
          kind: OpenInferenceSpanKind8.TOOL,
          input,
          attributes: {
            [TOOL_NAME2]: "search_local_daklak_catalog",
            [TOOL_DESCRIPTION2]: "Queries local SQLite stays, logistics, enriched places directory, seasons, and published CMS posts.",
            [TOOL_PARAMETERS2]: JSON.stringify(input)
          },
          formatOutput: (out) => ({
            staysCount: out.stays.length,
            logisticsCount: out.logistics.length,
            placesCount: out.places.length,
            seasonsCount: out.seasons.length,
            postsCount: out.relevantPosts.length
          })
        },
        async () => {
          const grounded = await loadGroundedQaContext({
            stays: opts?.stays,
            logistics: opts?.logistics
          });
          const lang = input.lang || defaultReq.lang || "vi";
          const themeKey = input.themeKey || defaultReq.currentState.theme || "coffee";
          let relevantPosts = [];
          try {
            relevantPosts = await queryRelevantPublishedPosts({
              lang,
              themeKey,
              limit: 3
            });
          } catch {
            relevantPosts = [];
          }
          const citations = relevantPosts.map((p) => ({
            title: p.title,
            url: `/blog/${p.slug}`,
            snippet: p.excerpt,
            source: "cms"
          }));
          return {
            ...grounded,
            relevantPosts,
            citations
          };
        }
      );
    },
    {
      name: "search_local_daklak_catalog",
      description: "Queries local \u0110\u1EAFk L\u1EAFk SQLite catalog for stays/accommodations & amenities, transport/logistics rates, curated attraction directory, seasonal guides, and published CMS stories.",
      schema: z.object({
        query: z.string().describe("User question or search topic for local \u0110\u1EAFk L\u1EAFk catalog"),
        lang: z.enum(["vi", "en"]).optional().describe("UI language (vi or en)"),
        themeKey: z.enum(["coffee", "culture", "nature", "cuisine"]).optional().describe("Primary travel theme for relevant CMS stories")
      })
    }
  );
  const searchLiveWebTavilyTool = tool(
    async (input) => {
      return withOpenInferenceSpan(
        "search_live_web_tavily",
        {
          kind: OpenInferenceSpanKind8.TOOL,
          input,
          attributes: {
            [TOOL_NAME2]: "search_live_web_tavily",
            [TOOL_DESCRIPTION2]: "Searches live external web via Tavily for up-to-date prices, opening hours, weather, festivals, transport, or external \u0110\u1EAFk L\u1EAFk landmarks.",
            [TOOL_PARAMETERS2]: JSON.stringify(input)
          },
          formatOutput: (out) => ({
            query: out.query,
            status: out.status || "ok",
            ...out.error ? { error: out.error } : {},
            hasAnswer: Boolean(out.answer),
            snippetsCount: out.snippets.length,
            citationsCount: out.citations.length
          })
        },
        async () => {
          if (opts?.forceSkipTavily || opts?.enableTavily === false) {
            return {
              query: input.query,
              snippets: [],
              citations: [],
              status: "disabled"
            };
          }
          return searchGeneralQaWithTavily(input.query, {
            enableTavily: opts?.enableTavily,
            tavilyClient: opts?.tavilyClient
          });
        }
      );
    },
    {
      name: "search_live_web_tavily",
      description: "Invokes Tavily live web search for external information, real-time attraction/hotel prices, weather, events, flights/buses, or unseeded \u0110\u1EAFk L\u1EAFk landmarks, returning grounded citations.",
      schema: z.object({
        query: z.string().describe("Live web search query for \u0110\u1EAFk L\u1EAFk / Bu\xF4n Ma Thu\u1ED9t")
      })
    }
  );
  const updateTripIntakeTool = tool(
    async (input) => {
      return withOpenInferenceSpan(
        "update_trip_intake",
        {
          kind: OpenInferenceSpanKind8.TOOL,
          input,
          attributes: {
            [TOOL_NAME2]: "update_trip_intake",
            [TOOL_DESCRIPTION2]: "Extracts and merges user trip constraints into IntakeState and builds clarification options.",
            [TOOL_PARAMETERS2]: JSON.stringify(input)
          },
          formatOutput: (out) => ({
            intent: out.intake.intent,
            needsClarification: out.intake.needsClarification,
            missingFields: out.intake.missingFields,
            provider: out.provider
          })
        },
        async () => {
          const effectiveReq = {
            ...defaultReq,
            message: input.message ?? defaultReq.message,
            lang: input.lang ?? defaultReq.lang,
            isFollowUp: input.isFollowUp ?? defaultReq.isFollowUp
          };
          const phase1 = await runPhase1Intake(effectiveReq, {
            enableTavily: opts?.forceSkipTavily ? false : opts?.enableTavily,
            tavilyClient: opts?.tavilyClient
          });
          const clarificationOptions = phase1.intake.needsClarification ? buildClarificationOptions(effectiveReq.lang, phase1.intake.missingFields) : [];
          return {
            intake: phase1.intake,
            stopOperations: phase1.stopOperations,
            clarificationOptions,
            generalQaReply: phase1.generalQaReply,
            citations: phase1.citations,
            tavilySnippets: phase1.tavilySnippets,
            tavilyAnswer: phase1.tavilyAnswer,
            provider: phase1.provider
          };
        }
      );
    },
    {
      name: "update_trip_intake",
      description: "Extracts and merges traveler count, companion type, dates/duration, budget tier/amount, and purpose into IntakeState with non-blocking Q&A support.",
      schema: z.object({
        message: z.string().optional().describe("User message to extract trip slots from"),
        lang: z.enum(["vi", "en"]).optional().describe("UI language"),
        isFollowUp: z.boolean().optional().describe("Whether this is a follow-up turn")
      })
    }
  );
  const planOrModifyItineraryTool = tool(
    async (input) => {
      return withOpenInferenceSpan(
        "plan_or_modify_itinerary",
        {
          kind: OpenInferenceSpanKind8.TOOL,
          input,
          attributes: {
            [TOOL_NAME2]: "plan_or_modify_itinerary",
            [TOOL_DESCRIPTION2]: "Executes Phases 2-5 itinerary synthesis or targeted follow-up mutations via followUpRouter.",
            [TOOL_PARAMETERS2]: JSON.stringify(input)
          },
          formatOutput: (out) => ({
            mode: out.mode,
            followUpAction: out.followUpAction,
            handled: out.handled,
            daysCount: out.response?.generatedDays?.length || 0
          })
        },
        async () => {
          const effectiveReq = {
            ...defaultReq,
            message: input.message ?? defaultReq.message
          };
          const requestedMode = input.mode || "full_plan";
          if (requestedMode === "follow_up") {
            const followUpResult = await routeFollowUp(effectiveReq, {
              fetchFn: opts?.fetchFn,
              stays: opts?.stays,
              logistics: opts?.logistics
            });
            if (followUpResult.handled && followUpResult.response) {
              return {
                mode: "follow_up",
                followUpAction: followUpResult.followUpAction,
                handled: true,
                response: followUpResult.response
              };
            }
          }
          const effectiveIntake = context2?.intake || runPhase1IntakeDeterministic(effectiveReq).intake;
          const resolvedPreferences = {
            theme: sanitizeTheme(effectiveIntake.mainPurpose, effectiveReq.currentState.theme),
            duration: sanitizeDuration(effectiveIntake.duration, effectiveReq.currentState.duration),
            companion: sanitizeCompanion(
              effectiveIntake.companionType,
              effectiveReq.currentState.companion
            ),
            budget: sanitizeBudget(effectiveIntake.budgetTier, effectiveReq.currentState.budget)
          };
          if (requestedMode === "modify_stops" || effectiveIntake.intent === "modify_stops") {
            const hasGemini2 = Boolean(GEMINI_API_KEY.trim());
            const modRes = buildModifyStopsReply(
              effectiveReq,
              [],
              resolvedPreferences,
              hasGemini2 ? `gemini-ai:${GEMINI_MODEL.trim() || "gemini-2.5-flash"}` : "local-fallback"
            );
            return {
              mode: "modify_stops",
              followUpAction: "modify_stops",
              handled: true,
              response: modRes
            };
          }
          const capacityPlan = await runPhase2Capacity(effectiveIntake, {
            stays: opts?.stays,
            logistics: opts?.logistics,
            lang: effectiveReq.lang
          });
          const budgetResult = await runPhase3Budget(effectiveIntake, capacityPlan, {
            forceSkipTavily: opts?.forceSkipTavily,
            skipSqliteUpsert: opts?.skipSqliteUpsert,
            tavilyLookupFn: opts?.tavilyLookupFn,
            lang: effectiveReq.lang
          });
          const purposeSelection = await runPhase4Purpose(
            effectiveIntake,
            capacityPlan,
            budgetResult,
            {
              lang: effectiveReq.lang,
              fetchFn: opts?.fetchFn
            }
          );
          const hasGemini = Boolean(GEMINI_API_KEY.trim());
          const synthesized = hasGemini ? await runPhase5Synthesis(
            effectiveReq,
            effectiveIntake,
            capacityPlan,
            budgetResult,
            purposeSelection
          ) : synthesizeDeterministicPlan(
            effectiveReq,
            effectiveIntake,
            capacityPlan,
            budgetResult,
            purposeSelection,
            "local-fallback"
          );
          return {
            mode: "full_plan",
            handled: true,
            capacityPlan,
            budgetResult,
            purposeSelection,
            response: synthesized
          };
        }
      );
    },
    {
      name: "plan_or_modify_itinerary",
      description: "Executes full 5-phase \u0110\u1EAFk L\u1EAFk itinerary synthesis (capacity, budget feasibility, purpose selection, schedule & expense synthesis) or targeted follow-up itinerary edits.",
      schema: z.object({
        mode: z.enum(["full_plan", "follow_up", "modify_stops"]).optional().describe("Execution mode: full_plan, follow_up, or modify_stops"),
        message: z.string().optional().describe("User request message")
      })
    }
  );
  return {
    search_local_daklak_catalog: searchLocalDakLakCatalogTool,
    search_live_web_tavily: searchLiveWebTavilyTool,
    update_trip_intake: updateTripIntakeTool,
    plan_or_modify_itinerary: planOrModifyItineraryTool,
    all: [
      searchLocalDakLakCatalogTool,
      searchLiveWebTavilyTool,
      updateTripIntakeTool,
      planOrModifyItineraryTool
    ]
  };
}
function buildDakLakLangGraph(options) {
  const supervisorRouterNode = async (state) => {
    const visited = [...state.graphNodesVisited || [], "supervisor_router"];
    const baseReq = state.req;
    const checkpointDraftIntake = !baseReq.draftIntake && state.intake?.needsClarification ? state.intake : baseReq.draftIntake;
    const req = checkpointDraftIntake ? { ...baseReq, draftIntake: checkpointDraftIntake } : baseReq;
    const plannedTools = [];
    let followUpAction;
    let intent = "general_qa";
    const isActiveFollowUp = req.isFollowUp && req.currentState.days.length > 0 && !req.draftIntake?.needsClarification;
    const apiKey = GEMINI_API_KEY.trim();
    const modelName = GEMINI_MODEL.trim() || "gemini-2.5-flash";
    let aiSupervisorMessage = null;
    if (apiKey) {
      try {
        const tools = createDakLakLangGraphTools({ req, options }).all;
        const llm = new ChatGoogleGenerativeAI({
          apiKey,
          model: modelName,
          temperature: 0.1,
          maxOutputTokens: 256
        }).bindTools(tools);
        const sysMsg = new SystemMessage(
          [
            "You are the LangGraph Supervisor Router for \u0110\u1EAFk L\u1EAFk AI Travel Concierge.",
            "Select the appropriate tools to handle the user message:",
            "- For general questions, stay/amenity inquiries, transport/price/weather/festival/external landmark questions: call `search_local_daklak_catalog` and `search_live_web_tavily`.",
            "- For new trip planning or slot clarification replies: call `update_trip_intake` (and `plan_or_modify_itinerary` when slots are complete).",
            "- For follow-up edits on an active itinerary: call `plan_or_modify_itinerary`."
          ].join("\n")
        );
        aiSupervisorMessage = await withOpenInferenceSpan(
          "langgraph_supervisor_llm",
          {
            kind: OpenInferenceSpanKind8.LLM,
            input: req.message,
            attributes: {
              [LLM_MODEL_NAME4]: modelName,
              [LLM_PROVIDER4]: "google",
              [LLM_SYSTEM4]: "gemini"
            },
            formatOutput: (msg) => ({
              content: typeof msg.content === "string" ? msg.content : "",
              toolCalls: (msg.tool_calls || []).map((tc) => tc.name)
            })
          },
          async () => {
            const timeoutPromise = new Promise(
              (resolve) => setTimeout(() => resolve(null), 3500)
            );
            const res = await Promise.race([
              llm.invoke([sysMsg, new HumanMessage(req.message)]),
              timeoutPromise
            ]);
            return res ? res : new AIMessage("");
          }
        );
      } catch {
        aiSupervisorMessage = null;
      }
    }
    if (isActiveFollowUp) {
      const classified = await classifyFollowUpAction(req, {
        fetchFn: options?.fetchFn,
        stays: options?.stays,
        logistics: options?.logistics
      });
      followUpAction = classified.action;
      if (followUpAction === "current_trip_qa") {
        intent = "general_qa";
        plannedTools.push("search_local_daklak_catalog", "search_live_web_tavily");
      } else if (followUpAction === "full_replan") {
        intent = "plan_trip";
        plannedTools.push("update_trip_intake", "plan_or_modify_itinerary");
      } else {
        intent = followUpAction === "modify_stops" ? "modify_stops" : "plan_trip";
        plannedTools.push("plan_or_modify_itinerary");
      }
    } else {
      const detPhase1 = runPhase1IntakeDeterministic(req);
      intent = detPhase1.intake.intent;
      if (intent === "general_qa") {
        plannedTools.push("update_trip_intake", "search_local_daklak_catalog", "search_live_web_tavily");
      } else if (intent === "modify_stops") {
        plannedTools.push("update_trip_intake", "plan_or_modify_itinerary");
      } else {
        plannedTools.push("update_trip_intake");
        if (!detPhase1.intake.needsClarification) {
          plannedTools.push("plan_or_modify_itinerary");
        }
      }
    }
    if (aiSupervisorMessage?.tool_calls && aiSupervisorMessage.tool_calls.length > 0) {
      for (const tc of aiSupervisorMessage.tool_calls) {
        const toolName = tc.name;
        if (LANGGRAPH_TOOL_NAMES.includes(toolName) && !plannedTools.includes(toolName)) {
          if (intent === "general_qa" && toolName === "plan_or_modify_itinerary") {
            continue;
          }
          plannedTools.push(toolName);
        }
      }
    }
    const newMessages = [new HumanMessage(req.message)];
    if (aiSupervisorMessage) {
      newMessages.push(aiSupervisorMessage);
    }
    return {
      req,
      intent,
      followUpAction,
      plannedTools,
      graphNodesVisited: visited,
      messages: newMessages
    };
  };
  const toolExecutionNode = async (state) => {
    const visited = [...state.graphNodesVisited || [], "tool_execution_node"];
    const req = state.req;
    let currentIntake = state.intake;
    let phase1Output = state.phase1Output;
    let clarificationOptions = state.clarificationOptions;
    let localContext = state.localContext;
    let tavilyContext = state.tavilyContext;
    let plannerResults = state.plannerResults;
    let intent = state.intent;
    let followUpAction = state.followUpAction;
    const toolsUsed = [...state.toolsUsed || []];
    const toolMessages = [];
    const planned = [...state.plannedTools || []];
    const recordToolUse = (name, summaryObj) => {
      if (!toolsUsed.includes(name)) {
        toolsUsed.push(name);
      }
      toolMessages.push(
        new ToolMessage({
          tool_call_id: `call_${name}_${toolsUsed.length}`,
          name,
          content: JSON.stringify(summaryObj)
        })
      );
    };
    if (planned.includes("update_trip_intake")) {
      const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
      const intakeOut = await toolset.update_trip_intake.invoke({
        message: req.message,
        lang: req.lang,
        isFollowUp: req.isFollowUp
      });
      currentIntake = intakeOut.intake;
      phase1Output = {
        intake: intakeOut.intake,
        stopOperations: intakeOut.stopOperations,
        generalQaReply: intakeOut.generalQaReply,
        citations: intakeOut.citations,
        tavilySnippets: intakeOut.tavilySnippets,
        tavilyAnswer: intakeOut.tavilyAnswer,
        provider: intakeOut.provider
      };
      clarificationOptions = intakeOut.clarificationOptions;
      intent = intakeOut.intake.intent;
      recordToolUse("update_trip_intake", {
        intent: currentIntake.intent,
        needsClarification: currentIntake.needsClarification,
        missingFields: currentIntake.missingFields
      });
      if (intent === "general_qa") {
        if (!planned.includes("search_local_daklak_catalog")) {
          planned.push("search_local_daklak_catalog");
        }
        if (!planned.includes("search_live_web_tavily")) {
          planned.push("search_live_web_tavily");
        }
      } else if (intent === "plan_trip" && !currentIntake.needsClarification) {
        if (!planned.includes("plan_or_modify_itinerary")) {
          planned.push("plan_or_modify_itinerary");
        }
      } else if (intent === "modify_stops" && !planned.includes("plan_or_modify_itinerary")) {
        planned.push("plan_or_modify_itinerary");
      }
    }
    if (planned.includes("search_local_daklak_catalog")) {
      const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
      const themeKey = sanitizeTheme(
        currentIntake?.mainPurpose || req.currentState.theme,
        req.currentState.theme
      );
      localContext = await toolset.search_local_daklak_catalog.invoke({
        query: req.message,
        lang: req.lang,
        themeKey
      });
      recordToolUse("search_local_daklak_catalog", {
        staysCount: localContext.stays.length,
        placesCount: localContext.places.length,
        postsCount: localContext.relevantPosts.length
      });
    }
    if (planned.includes("search_live_web_tavily")) {
      if (phase1Output && (phase1Output.tavilySnippets && phase1Output.tavilySnippets.length > 0 || phase1Output.tavilyAnswer)) {
        tavilyContext = {
          query: req.message,
          ...phase1Output.tavilyAnswer ? { answer: phase1Output.tavilyAnswer } : {},
          snippets: phase1Output.tavilySnippets || [],
          citations: phase1Output.citations || []
        };
      } else {
        const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
        tavilyContext = await toolset.search_live_web_tavily.invoke({
          query: req.message
        });
      }
      recordToolUse("search_live_web_tavily", {
        status: tavilyContext.status || "ok",
        ...tavilyContext.error ? { error: tavilyContext.error } : {},
        hasAnswer: Boolean(tavilyContext.answer),
        snippetsCount: tavilyContext.snippets.length,
        citationsCount: tavilyContext.citations.length
      });
    }
    const shouldRunPlanner = planned.includes("plan_or_modify_itinerary") && intent !== "general_qa" && !(intent === "plan_trip" && currentIntake?.needsClarification);
    if (shouldRunPlanner) {
      const isFollowUpEdit = req.isFollowUp && req.currentState.days.length > 0 && !req.draftIntake?.needsClarification && followUpAction !== void 0 && followUpAction !== "full_replan" && followUpAction !== "current_trip_qa";
      const mode = isFollowUpEdit ? "follow_up" : intent === "modify_stops" ? "modify_stops" : "full_plan";
      if (mode === "modify_stops" && phase1Output && phase1Output.stopOperations.length > 0) {
        const resolvedPreferences = {
          theme: sanitizeTheme(currentIntake?.mainPurpose, req.currentState.theme),
          duration: sanitizeDuration(currentIntake?.duration, req.currentState.duration),
          companion: sanitizeCompanion(currentIntake?.companionType, req.currentState.companion),
          budget: sanitizeBudget(currentIntake?.budgetTier, req.currentState.budget)
        };
        const hasGemini = Boolean(GEMINI_API_KEY.trim());
        plannerResults = {
          mode: "modify_stops",
          followUpAction: "modify_stops",
          handled: true,
          response: buildModifyStopsReply(
            req,
            phase1Output.stopOperations,
            resolvedPreferences,
            hasGemini ? phase1Output.provider : "local-fallback"
          )
        };
      } else {
        const toolset = createDakLakLangGraphTools({ req, intake: currentIntake, options });
        plannerResults = await toolset.plan_or_modify_itinerary.invoke({
          mode,
          message: req.message
        });
      }
      if (plannerResults.followUpAction) {
        followUpAction = plannerResults.followUpAction;
      }
      recordToolUse("plan_or_modify_itinerary", {
        mode: plannerResults.mode,
        followUpAction: plannerResults.followUpAction,
        daysCount: plannerResults.response?.generatedDays?.length || 0
      });
    }
    return {
      intent,
      followUpAction,
      intake: currentIntake,
      phase1Output,
      clarificationOptions,
      localContext,
      tavilyContext,
      plannerResults,
      toolsUsed,
      graphNodesVisited: visited,
      messages: toolMessages
    };
  };
  const synthesisNode = async (state) => {
    const visited = [...state.graphNodesVisited || [], "synthesis_node"];
    const req = state.req;
    const intake = state.intake;
    const phase1Output = state.phase1Output;
    const localContext = state.localContext;
    const tavilyContext = state.tavilyContext;
    let plannerResults = state.plannerResults;
    const hasGemini = Boolean(getGeminiApiKey() || GEMINI_API_KEY.trim());
    const model = GEMINI_MODEL.trim() || "gemini-2.5-flash";
    const resolvedPreferences = {
      theme: sanitizeTheme(intake?.mainPurpose, req.currentState.theme),
      duration: sanitizeDuration(intake?.duration, req.currentState.duration),
      companion: sanitizeCompanion(intake?.companionType, req.currentState.companion),
      budget: sanitizeBudget(intake?.budgetTier, req.currentState.budget)
    };
    let response;
    if (state.evalAttempts > 0 && state.retryFeedback.length > 0 && plannerResults?.mode === "full_plan" && plannerResults.capacityPlan && plannerResults.budgetResult && plannerResults.purposeSelection && intake && hasGemini) {
      const retriedResponse = await runPhase5Synthesis(
        req,
        intake,
        plannerResults.capacityPlan,
        plannerResults.budgetResult,
        plannerResults.purposeSelection,
        state.retryFeedback
      );
      plannerResults = {
        ...plannerResults,
        response: retriedResponse
      };
      response = retriedResponse;
    } else if (plannerResults?.handled && plannerResults.response) {
      response = {
        ...plannerResults.response,
        ...state.followUpAction ? { followUpAction: state.followUpAction } : {}
      };
    } else if (state.intent === "general_qa") {
      const effectiveLang = resolveEffectiveQaLanguage(req.message, req.lang);
      const effectiveSnippets = tavilyContext?.snippets || phase1Output?.tavilySnippets || [];
      const effectiveAnswer = tavilyContext?.answer || phase1Output?.tavilyAnswer;
      const effectiveTavilyCitations = tavilyContext?.citations || phase1Output?.citations || [];
      const cmsCitations = localContext?.citations || [];
      const deterministicReply = await buildGroundedQaReplyDeterministic(req, {
        stays: options?.stays,
        logistics: options?.logistics,
        tavilySnippets: effectiveSnippets,
        ...effectiveAnswer ? { tavilyAnswer: effectiveAnswer } : {}
      });
      const needsGeminiQaSynthesis = hasGemini && (!phase1Output?.generalQaReply || hasElephantRidingViolation(phase1Output.generalQaReply) || (phase1Output.citations || []).length === 0 && (Boolean(effectiveAnswer) || effectiveSnippets.length > 0) || effectiveLang === "vi" && isLikelyEnglishText(phase1Output.generalQaReply));
      let rawReply = hasGemini && phase1Output?.generalQaReply && !hasElephantRidingViolation(phase1Output.generalQaReply) ? phase1Output.generalQaReply : deterministicReply;
      let provider = hasGemini && phase1Output?.generalQaReply ? phase1Output.provider : "local-fallback";
      if (needsGeminiQaSynthesis) {
        const apiKey = getGeminiApiKey() || GEMINI_API_KEY.trim();
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const sysPrompt = [
          "You are the \u0110\u1EAFk L\u1EAFk AI Travel Concierge Q&A Synthesizer.",
          `Target reply language: "${effectiveLang}".`,
          `CRITICAL LANGUAGE RULE: Write 100% of your reply in ${effectiveLang === "vi" ? "natural, fluent Vietnamese" : "natural, fluent English"}. Even if the Tavily web summary or snippets are in English, translate and synthesize every fact into natural ${effectiveLang === "vi" ? "Vietnamese" : "English"} \u2014 NEVER output English sentences when target language is "vi".`,
          "FORMATTING RULE: Format your answer for clear readability using clean Markdown:",
          "- Start with a 1\u20132 sentence direct answer to the user\u2019s question.",
          '- Use concise bullet points ("- **Label**: detail") for schedules, prices, highlights, or practical tips, with blank lines between sections.',
          "- Never suggest elephant riding; promote ethical elephant observation instead."
        ].join("\n");
        const qaPrompt = [
          `userQuestion: ${req.message}`,
          phase1Output?.generalQaReply ? `draftReply:
${phase1Output.generalQaReply}` : "",
          localContext ? `localCatalogSummary:
${JSON.stringify({
            stays: localContext.stays.slice(0, 6).map((s) => ({
              name: s.name,
              area: s.area,
              tier: s.tier,
              nightlyRateVnd: s.nightlyRateVnd,
              amenities: s.amenities
            })),
            places: localContext.places.slice(0, 8).map((p) => ({
              title: p.title,
              location: p.location,
              ticketVnd: p.ticketVnd,
              desc: p.desc
            }))
          })}` : "",
          effectiveAnswer ? `tavilyLiveWebAnswer:
${effectiveAnswer}` : "",
          effectiveSnippets.length > 0 ? `tavilyLiveWebSnippets:
${JSON.stringify(effectiveSnippets)}` : ""
        ].filter(Boolean).join("\n\n");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9e3);
        try {
          const fetchFn = options?.fetchFn || fetch;
          const synthOut = await withOpenInferenceSpan(
            "gemini_langgraph_qa_synthesis",
            {
              kind: OpenInferenceSpanKind8.LLM,
              input: qaPrompt,
              attributes: {
                [LLM_MODEL_NAME4]: model,
                [LLM_PROVIDER4]: "google",
                [LLM_SYSTEM4]: "gemini"
              },
              formatOutput: (text) => text
            },
            async () => {
              const resp = await fetchFn(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: sysPrompt }] },
                  contents: [{ role: "user", parts: [{ text: qaPrompt }] }],
                  generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 1200
                  }
                })
              });
              if (!resp.ok) {
                throw new Error(`Gemini Q&A synthesis HTTP ${resp.status}`);
              }
              const data = await resp.json();
              return (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("").trim();
            }
          );
          if (synthOut && !hasElephantRidingViolation(synthOut) && !(effectiveLang === "vi" && isLikelyEnglishText(synthOut))) {
            rawReply = synthOut;
            provider = `gemini-ai:${model}`;
          }
        } catch {
        } finally {
          clearTimeout(timer);
        }
      }
      if (effectiveLang === "vi" && isLikelyEnglishText(rawReply)) {
        rawReply = deterministicReply;
      }
      const citations = dedupeCitations([...effectiveTavilyCitations, ...cmsCitations]);
      response = {
        intent: "general_qa",
        ...state.followUpAction ? { followUpAction: state.followUpAction } : {},
        reply: rawReply,
        shouldOpenPlanner: false,
        preferences: resolvedPreferences,
        resetItineraryToTheme: false,
        stopOperations: [],
        provider,
        status: "completed",
        citations,
        ...req.draftIntake ? {
          draftIntake: req.draftIntake,
          ...req.draftIntake.missingFields?.length ? {
            clarificationOptions: buildClarificationOptions(
              req.lang,
              req.draftIntake.missingFields
            )
          } : {}
        } : {}
      };
    } else if (intake?.needsClarification) {
      response = {
        intent: "update_itinerary",
        reply: intake.clarificationQuestion || (req.lang === "en" ? "Please share your traveler count, travel dates, and budget tier so I can build an accurate \u0110\u1EAFk L\u1EAFk plan." : "B\u1EA1n cho m\xECnh bi\u1EBFt th\xEAm s\u1ED1 l\u01B0\u1EE3ng ng\u01B0\u1EDDi \u0111i, th\u1EDDi gian d\u1EF1 ki\u1EBFn v\xE0 m\u1EE9c ng\xE2n s\xE1ch \u0111\u1EC3 m\xECnh l\xEAn l\u1ECBch tr\xECnh \u0110\u1EAFk L\u1EAFk ch\xEDnh x\xE1c nh\xE9!"),
        shouldOpenPlanner: false,
        preferences: resolvedPreferences,
        resetItineraryToTheme: false,
        stopOperations: [],
        provider: hasGemini && phase1Output ? phase1Output.provider : "local-fallback",
        status: "needs_clarification",
        suggestedPresets: sampleSchedulePresets,
        draftIntake: intake,
        clarificationOptions: state.clarificationOptions || buildClarificationOptions(req.lang, intake.missingFields)
      };
    } else {
      response = buildModifyStopsReply(
        req,
        phase1Output?.stopOperations || [],
        resolvedPreferences,
        hasGemini && phase1Output ? phase1Output.provider : "local-fallback"
      );
    }
    const enrichedResponse = {
      ...response,
      traceId: state.traceId || response.traceId,
      engine: "langgraph",
      toolsUsed: state.toolsUsed,
      graphNodesVisited: [...visited, "evaluator_guardrail_node"]
    };
    return {
      plannerResults,
      response: enrichedResponse,
      graphNodesVisited: visited,
      messages: [new AIMessage(enrichedResponse.reply)]
    };
  };
  const evaluatorGuardrailNode = async (state) => {
    const visited = [...state.graphNodesVisited || [], "evaluator_guardrail_node"];
    const attempts = (state.evalAttempts || 0) + 1;
    const currentResponse = state.response;
    if (!currentResponse) {
      return {
        graphNodesVisited: visited,
        evalAttempts: attempts,
        needsEvalRetry: false
      };
    }
    const plannerResults = state.plannerResults;
    const intake = state.intake;
    if (plannerResults?.mode === "full_plan" && plannerResults.capacityPlan && plannerResults.budgetResult && plannerResults.purposeSelection && intake) {
      const spanName = attempts > 1 ? "phase5_runtime_evaluator_retry" : "phase5_runtime_evaluator";
      const evalName = attempts > 1 ? "phase5_hard_constraints_retry" : "phase5_hard_constraints";
      const evalCheck = await withOpenInferenceSpan(
        spanName,
        {
          kind: OpenInferenceSpanKind8.EVALUATOR,
          input: {
            attempt: attempts,
            daysCount: currentResponse.generatedDays?.length || 0,
            expensesCount: currentResponse.generatedExpenses?.length || 0,
            totalBudgetVnd: plannerResults.budgetResult.totalBudgetVnd
          },
          formatOutput: (res) => res.evalResult,
          onSuccess: (span, res) => {
            span.setAttribute(EVALUATION_NAME, evalName);
            span.setAttribute(EVALUATION_ANNOTATOR_KIND, "CODE");
            span.setAttribute(EVALUATION_SCORE, res.evalResult.score);
            span.setAttribute(EVALUATION_LABEL, res.evalResult.passed ? "pass" : "fail");
            span.setAttribute(
              EVALUATION_EXPLANATION,
              res.evalResult.violations.join("; ") || "All deterministic checks passed."
            );
          }
        },
        () => evaluatePhase5Output({
          response: currentResponse,
          intake,
          capacityPlan: plannerResults.capacityPlan,
          budgetResult: plannerResults.budgetResult,
          purposeSelection: plannerResults.purposeSelection
        })
      );
      const hasGemini = Boolean(GEMINI_API_KEY.trim());
      const shouldRetry = !evalCheck.evalResult.passed && evalCheck.needsRetry && attempts < 2 && hasGemini;
      const repaired = {
        ...evalCheck.repairedResponse,
        intent: sanitizeIntent(evalCheck.repairedResponse.intent, "update_itinerary"),
        traceId: state.traceId || currentResponse.traceId,
        status: currentResponse.status || "completed",
        ...state.followUpAction ? { followUpAction: state.followUpAction } : {},
        engine: "langgraph",
        toolsUsed: state.toolsUsed,
        graphNodesVisited: visited
      };
      return {
        response: repaired,
        evalResult: evalCheck.evalResult,
        evalAttempts: attempts,
        needsEvalRetry: shouldRetry,
        retryFeedback: evalCheck.evalResult.violations,
        graphNodesVisited: visited
      };
    }
    if (currentResponse.intent === "general_qa") {
      const validPostSlugs = (state.localContext?.relevantPosts || []).map((p) => p.slug);
      const qaEval = await withOpenInferenceSpan(
        "qa_runtime_evaluator",
        {
          kind: OpenInferenceSpanKind8.EVALUATOR,
          input: {
            userMessage: state.req.message,
            replyLength: currentResponse.reply.length,
            citationsCount: currentResponse.citations?.length || 0
          },
          formatOutput: (res) => res.evalResult,
          onSuccess: (span, res) => {
            span.setAttribute(EVALUATION_NAME, "qa_grounding_and_ethics");
            span.setAttribute(EVALUATION_ANNOTATOR_KIND, "CODE");
            span.setAttribute(EVALUATION_SCORE, res.evalResult.score);
            span.setAttribute(EVALUATION_LABEL, res.evalResult.passed ? "pass" : "fail");
            span.setAttribute(
              EVALUATION_EXPLANATION,
              res.evalResult.violations.join("; ") || "All Q&A checks passed."
            );
          }
        },
        () => evaluateQaOutput({
          response: currentResponse,
          userMessage: state.req.message,
          tavilySnippets: state.tavilyContext?.snippets,
          tavilyCitations: state.tavilyContext?.citations,
          validPostSlugs
        })
      );
      const repaired = {
        ...qaEval.repairedResponse,
        traceId: state.traceId || currentResponse.traceId,
        engine: "langgraph",
        toolsUsed: state.toolsUsed,
        graphNodesVisited: visited
      };
      return {
        response: repaired,
        evalResult: qaEval.evalResult,
        evalAttempts: attempts,
        needsEvalRetry: false,
        graphNodesVisited: visited
      };
    }
    let safeReply = currentResponse.reply;
    if (hasElephantRidingViolation(safeReply)) {
      const qaEval = evaluateQaOutput({
        response: currentResponse,
        userMessage: state.req.message
      });
      safeReply = qaEval.repairedResponse.reply;
    }
    return {
      response: {
        ...currentResponse,
        reply: safeReply,
        traceId: state.traceId || currentResponse.traceId,
        engine: "langgraph",
        toolsUsed: state.toolsUsed,
        graphNodesVisited: visited
      },
      evalAttempts: attempts,
      needsEvalRetry: false,
      graphNodesVisited: visited
    };
  };
  const shouldRetryOrFinish = (state) => {
    if (state.needsEvalRetry && state.evalAttempts < 2) {
      return "synthesis_node";
    }
    return END;
  };
  const workflow = new StateGraph(DakLakGraphStateAnnotation).addNode("supervisor_router", supervisorRouterNode).addNode("tool_execution_node", toolExecutionNode).addNode("synthesis_node", synthesisNode).addNode("evaluator_guardrail_node", evaluatorGuardrailNode).addEdge(START, "supervisor_router").addEdge("supervisor_router", "tool_execution_node").addEdge("tool_execution_node", "synthesis_node").addEdge("synthesis_node", "evaluator_guardrail_node").addConditionalEdges("evaluator_guardrail_node", shouldRetryOrFinish, {
    synthesis_node: "synthesis_node",
    [END]: END
  });
  return workflow.compile({ checkpointer: sharedCheckpointer });
}
async function runLangGraphChat(req, opts) {
  const traceId = opts?.traceId || crypto2.randomUUID();
  const sessionId = opts?.sessionId || req.sessionId || `sess_${crypto2.createHash("sha1").update(`${req.lang}:${req.message}`).digest("hex").slice(0, 16)}`;
  return withOpenInferenceSpan(
    "daklak_langgraph_agent",
    {
      kind: OpenInferenceSpanKind8.AGENT,
      input: {
        message: req.message,
        lang: req.lang,
        isFollowUp: req.isFollowUp,
        sessionId,
        traceId
      },
      attributes: {
        "daklak.engine": "langgraph",
        "daklak.session_id": sessionId,
        "daklak.trace_id": traceId
      },
      formatOutput: (res) => ({
        intent: res.intent,
        status: res.status,
        followUpAction: res.followUpAction,
        toolsUsed: res.toolsUsed,
        graphNodesVisited: res.graphNodesVisited
      }),
      onSuccess: (span, res) => {
        span.setAttribute("daklak.intent", res.intent);
        span.setAttribute("daklak.provider", res.provider);
        if (res.toolsUsed) {
          span.setAttribute("daklak.tools_used", JSON.stringify(res.toolsUsed));
        }
        if (res.graphNodesVisited) {
          span.setAttribute("daklak.graph_nodes_visited", JSON.stringify(res.graphNodesVisited));
        }
      }
    },
    async () => {
      const app2 = buildDakLakLangGraph(opts);
      const finalState = await app2.invoke(
        {
          req,
          sessionId,
          traceId,
          plannedTools: [],
          clarificationOptions: void 0,
          localContext: void 0,
          tavilyContext: void 0,
          plannerResults: void 0,
          response: void 0,
          toolsUsed: [],
          graphNodesVisited: [],
          evalAttempts: 0,
          evalResult: void 0,
          needsEvalRetry: false,
          retryFeedback: []
        },
        {
          configurable: {
            thread_id: sessionId
          }
        }
      );
      const response = finalState.response;
      if (!response) {
        throw new Error("LangGraph execution completed without producing a response");
      }
      const finalResponse = {
        ...response,
        traceId,
        engine: "langgraph",
        toolsUsed: finalState.toolsUsed || [],
        graphNodesVisited: finalState.graphNodesVisited || []
      };
      traceMetadataStore.set(traceId, {
        traceId,
        sessionId,
        intake: finalState.intake,
        capacityPlan: finalState.plannerResults?.capacityPlan,
        budgetResult: finalState.plannerResults?.budgetResult,
        purposeSelection: finalState.plannerResults?.purposeSelection,
        evalResult: finalState.evalResult,
        toolsUsed: finalState.toolsUsed || [],
        graphNodesVisited: finalState.graphNodesVisited || [],
        retryCount: Math.max(0, (finalState.evalAttempts || 1) - 1)
      });
      return finalResponse;
    }
  );
}

// server/services/ai/aiChatbot.ts
var VALID_THEMES3 = ["coffee", "culture", "nature", "cuisine"];
var VALID_DURATIONS3 = ["2N1D", "3N2D", "4N3D+"];
var VALID_COMPANIONS3 = ["solo", "couple", "family", "friends"];
var VALID_BUDGETS3 = ["budget", "standard", "luxury"];
function sanitizeTheme2(val, fallback) {
  return VALID_THEMES3.includes(val) ? val : fallback;
}
function sanitizeDuration2(val, fallback) {
  return VALID_DURATIONS3.includes(val) ? val : fallback;
}
function sanitizeCompanion2(val, fallback) {
  return VALID_COMPANIONS3.includes(val) ? val : fallback;
}
function sanitizeBudget2(val, fallback) {
  return VALID_BUDGETS3.includes(val) ? val : fallback;
}
function detectPreferencesFallback(rawText, current) {
  const det = runPhase1IntakeDeterministic({
    message: rawText,
    lang: "vi",
    isFollowUp: true,
    currentState: current
  });
  return {
    duration: sanitizeDuration2(det.intake.duration, current.duration),
    companion: sanitizeCompanion2(det.intake.companionType, current.companion),
    budget: sanitizeBudget2(det.intake.budgetTier, current.budget),
    theme: sanitizeTheme2(det.intake.mainPurpose, current.theme)
  };
}
async function buildCmsCitationsForQa(lang, themeKey) {
  try {
    const posts = await queryRelevantPublishedPosts({ lang, themeKey, limit: 3 });
    return posts.map((p) => ({
      title: p.title,
      url: `/blog/${p.slug}`,
      snippet: p.excerpt,
      source: "cms"
    }));
  } catch {
    return [];
  }
}
async function persistTraceSafely(record) {
  try {
    await saveAiTrace(record);
  } catch (err) {
    console.warn(
      "[AI Trace] Failed to persist trace:",
      err instanceof Error ? err.message : err
    );
  }
}
async function runLocalFallbackChat(req, reason) {
  const lower = req.message.toLowerCase();
  const provider = reason ? `local-fallback (${reason})` : "local-fallback";
  const hasExplicitPlannerVerb = /(lên lịch|lịch trình mới|thiết kế|tạo tour|đổi sang|chuyển sang|cập nhật lịch|thêm điểm|bỏ điểm|xóa điểm|plan.*trip|create itinerary|new itinerary|muốn đi.*chơi)/i.test(
    lower
  );
  const looksLikeGeneralQuestion = isPrimaryAmenityOrInfoQuestion(lower) || !hasExplicitPlannerVerb || isQuestionOrInfoRequest(lower) || /(mùa nào|thời tiết|bao giờ|tháng mấy|ở đâu|ăn gì|món gì|đặc sản|giá vé|bao xa|di chuyển|cách đi|what|when|where|which|how|weather|season|best time)/i.test(
    lower
  );
  if (looksLikeGeneralQuestion) {
    const reply2 = await buildGroundedQaReplyDeterministic(req);
    const citations = await buildCmsCitationsForQa(req.lang, req.currentState.theme);
    return {
      intent: "general_qa",
      reply: reply2,
      shouldOpenPlanner: false,
      preferences: {
        theme: req.currentState.theme,
        duration: req.currentState.duration,
        companion: req.currentState.companion,
        budget: req.currentState.budget
      },
      resetItineraryToTheme: false,
      stopOperations: [],
      status: "completed",
      citations,
      provider,
      engine: "langgraph",
      ...req.draftIntake ? {
        draftIntake: req.draftIntake,
        ...req.draftIntake.missingFields?.length ? {
          clarificationOptions: buildClarificationOptions(
            req.lang,
            req.draftIntake.missingFields
          )
        } : {}
      } : {}
    };
  }
  const prefs = detectPreferencesFallback(req.message, req.currentState);
  const cat = plannerCatalog[prefs.theme];
  const bud = budgetMultipliers[prefs.budget];
  const reply = req.lang === "en" ? `Tailored "${cat.title}" (${prefs.duration} \u2022 ${companionLabels[prefs.companion]} \u2022 ${bud.label} budget). Route tip: ${cat.routeTip}` : `\u0110\xE3 thi\u1EBFt k\u1EBF h\xE0nh tr\xECnh "${cat.title}" (${prefs.duration} \u2022 ${companionLabels[prefs.companion]} \u2022 Ng\xE2n s\xE1ch ${bud.label}). M\u1EB9o tuy\u1EBFn \u0111\u01B0\u1EDDng: ${cat.routeTip}`;
  return {
    intent: "update_itinerary",
    reply,
    shouldOpenPlanner: true,
    preferences: prefs,
    resetItineraryToTheme: true,
    stopOperations: [],
    suggestedTab: "map",
    status: "completed",
    provider,
    engine: "langgraph"
  };
}
function deriveSessionId(req, fallbackTraceId) {
  if (typeof req.sessionId === "string" && req.sessionId.trim()) {
    return req.sessionId.trim();
  }
  const seedText = req.history?.[0]?.user?.trim() || req.draftIntake?.rawUserGoal?.split(" \u2014 ")[0]?.trim() || req.message?.trim();
  if (!seedText) return fallbackTraceId;
  const hash = crypto3.createHash("sha1").update(`${req.lang}:${seedText}`).digest("hex").slice(0, 16);
  return `sess_${hash}`;
}
async function handleAiChat(req) {
  const traceId = crypto3.randomUUID();
  const sessionId = deriveSessionId(req, traceId);
  const startedAt = Date.now();
  return withSessionScope(
    sessionId,
    () => withOpenInferenceSpan(
      "daklak_ai_concierge",
      {
        kind: OpenInferenceSpanKind9.AGENT,
        input: req.message,
        attributes: {
          "daklak.trace_id": traceId,
          "daklak.session_id": sessionId,
          "daklak.lang": req.lang,
          "daklak.is_follow_up": req.isFollowUp,
          "daklak.engine": "langgraph"
        },
        formatOutput: (res) => res.reply,
        onSuccess: (span, res) => {
          span.setAttribute("daklak.intent", res.intent);
          span.setAttribute("daklak.status", res.status || "completed");
          span.setAttribute("daklak.provider", res.provider);
          span.setAttribute("daklak.engine", res.engine || "langgraph");
          if (res.followUpAction) {
            span.setAttribute("daklak.follow_up_action", res.followUpAction);
          }
          if (res.toolsUsed) {
            span.setAttribute("daklak.tools_used", JSON.stringify(res.toolsUsed));
          }
          if (res.graphNodesVisited) {
            span.setAttribute("daklak.graph_nodes_visited", JSON.stringify(res.graphNodesVisited));
          }
        }
      },
      async () => {
        try {
          const finalResponse = await runLangGraphChat(req, { traceId, sessionId });
          const meta = getLangGraphTraceMetadata(traceId);
          await persistTraceSafely({
            traceId,
            lang: req.lang,
            userMessage: req.message,
            intent: finalResponse.intent,
            status: finalResponse.status || "completed",
            provider: finalResponse.provider,
            intake: meta?.intake || finalResponse.draftIntake,
            capacityPlan: meta?.capacityPlan,
            budgetResult: meta?.budgetResult,
            purposeSelection: meta?.purposeSelection,
            evalResult: meta?.evalResult,
            latencyMs: Date.now() - startedAt,
            retryCount: meta?.retryCount ?? 0,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            engine: finalResponse.engine || "langgraph",
            toolsUsed: finalResponse.toolsUsed,
            graphNodesVisited: finalResponse.graphNodesVisited
          });
          return finalResponse;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown AI workflow error";
          console.warn("[AI Chatbot] LangGraph pipeline failed, using local fallback:", message);
          const fallback = await runLocalFallbackChat(req, "fallback");
          fallback.traceId = traceId;
          fallback.status = "completed";
          fallback.engine = "langgraph";
          fallback.toolsUsed = fallback.toolsUsed || [];
          fallback.graphNodesVisited = fallback.graphNodesVisited || ["fallback"];
          await persistTraceSafely({
            traceId,
            lang: req.lang,
            userMessage: req.message,
            intent: fallback.intent,
            status: "completed",
            provider: fallback.provider,
            latencyMs: Date.now() - startedAt,
            retryCount: 0,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            engine: "langgraph",
            toolsUsed: fallback.toolsUsed,
            graphNodesVisited: fallback.graphNodesVisited
          });
          return fallback;
        }
      }
    )
  );
}

// server/routes/aiRoutes.ts
var aiRouter = Router3();
var rateBuckets = /* @__PURE__ */ new Map();
function isRateLimited(clientKey) {
  const now = Date.now();
  if (rateBuckets.size > 500) {
    for (const [key, entry] of rateBuckets.entries()) {
      if (now > entry.resetAt) {
        rateBuckets.delete(key);
      }
    }
  }
  const existing = rateBuckets.get(clientKey);
  if (!existing || now > existing.resetAt) {
    rateBuckets.set(clientKey, { count: 1, resetAt: now + AI_CHAT_RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (existing.count >= AI_CHAT_RATE_LIMIT_MAX) {
    return true;
  }
  existing.count += 1;
  return false;
}
function asTheme(val) {
  return val === "culture" || val === "nature" || val === "cuisine" ? val : "coffee";
}
function asDuration(val) {
  return val === "2N1D" || val === "4N3D+" ? val : "3N2D";
}
function asCompanion(val) {
  return val === "solo" || val === "family" || val === "friends" ? val : "couple";
}
function asBudget(val) {
  return val === "budget" || val === "luxury" ? val : "standard";
}
function asAgenticIntent(val) {
  return val === "general_qa" || val === "plan_trip" || val === "modify_stops" ? val : void 0;
}
function asExpenseCategory(val) {
  return val === "stay" || val === "transit" || val === "food" || val === "activity" ? val : null;
}
function sanitizeDraftIntake(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return void 0;
  }
  const r = raw;
  const sanitized = {};
  const intent = asAgenticIntent(r.intent);
  if (intent) sanitized.intent = intent;
  if (r.travelersCount === null) {
    sanitized.travelersCount = null;
  } else if (typeof r.travelersCount === "number" && Number.isFinite(r.travelersCount) && r.travelersCount >= 1) {
    sanitized.travelersCount = Math.min(50, Math.round(r.travelersCount));
  }
  if (r.companionType === null) {
    sanitized.companionType = null;
  } else if (r.companionType === "solo" || r.companionType === "couple" || r.companionType === "family" || r.companionType === "friends") {
    sanitized.companionType = r.companionType;
  }
  if (r.travelDates === null) {
    sanitized.travelDates = null;
  } else if (typeof r.travelDates === "string") {
    const trimmed = r.travelDates.trim().slice(0, 120);
    if (trimmed) sanitized.travelDates = trimmed;
  }
  if (r.duration === "2N1D" || r.duration === "3N2D" || r.duration === "4N3D+") {
    sanitized.duration = r.duration;
  }
  if (r.totalBudgetVnd === null) {
    sanitized.totalBudgetVnd = null;
  } else if (typeof r.totalBudgetVnd === "number" && Number.isFinite(r.totalBudgetVnd) && r.totalBudgetVnd >= 0) {
    sanitized.totalBudgetVnd = Math.min(1e9, Math.round(r.totalBudgetVnd));
  }
  if (r.budgetTier === "budget" || r.budgetTier === "standard" || r.budgetTier === "luxury") {
    sanitized.budgetTier = r.budgetTier;
  }
  if (r.mainPurpose === "coffee" || r.mainPurpose === "culture" || r.mainPurpose === "nature" || r.mainPurpose === "cuisine") {
    sanitized.mainPurpose = r.mainPurpose;
  }
  if (Array.isArray(r.secondaryInterests)) {
    sanitized.secondaryInterests = r.secondaryInterests.filter((item) => typeof item === "string").map((item) => item.trim().slice(0, 60)).filter(Boolean).slice(0, 8);
  }
  if (Array.isArray(r.missingFields)) {
    const validMissing = r.missingFields.filter(
      (f) => f === "budget" || f === "dates" || f === "travelers"
    );
    sanitized.missingFields = Array.from(new Set(validMissing)).slice(0, 3);
  }
  if (typeof r.needsClarification === "boolean") {
    sanitized.needsClarification = r.needsClarification;
  }
  if (typeof r.clarificationQuestion === "string") {
    const q = r.clarificationQuestion.trim().slice(0, 400);
    if (q) sanitized.clarificationQuestion = q;
  }
  if (typeof r.rawUserGoal === "string") {
    const goal = r.rawUserGoal.trim().slice(0, 500);
    if (goal) sanitized.rawUserGoal = goal;
  }
  return Object.keys(sanitized).length > 0 ? sanitized : void 0;
}
function sanitizeCurrentExpenses(raw) {
  if (!Array.isArray(raw)) {
    return void 0;
  }
  const items = [];
  for (const entry of raw.slice(0, 12)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const item = entry;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 120) : "";
    const cat = asExpenseCategory(item.cat);
    const amount = typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount >= 0 ? Math.min(1e9, Math.round(item.amount)) : null;
    if (!title || !cat || amount === null) continue;
    items.push({ title, cat, amount });
  }
  return items.length > 0 ? items : void 0;
}
aiRouter.get("/status", (_req, res) => {
  res.json({
    configured: Boolean(getGeminiApiKey()),
    model: GEMINI_MODEL,
    decisionModel: GEMINI_DECISION_MODEL || void 0,
    tavilyConfigured: Boolean(getTavilyApiKey()),
    tavilySettings: {
      timeoutMs: TAVILY_TIMEOUT_MS,
      searchDepth: TAVILY_SEARCH_DEPTH,
      includeAnswer: TAVILY_INCLUDE_ANSWER,
      maxResults: TAVILY_MAX_RESULTS,
      country: TAVILY_COUNTRY || void 0
    },
    engine: "langgraph",
    tools: [...LANGGRAPH_TOOL_NAMES]
  });
});
aiRouter.post("/chat", async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (isRateLimited(clientIp)) {
      res.status(429).json({
        error: "B\u1EA1n \u0111ang g\u1EEDi y\xEAu c\u1EA7u h\u01A1i nhanh. Vui l\xF2ng th\u1EED l\u1EA1i sau \xEDt ph\xFAt."
      });
      return;
    }
    const body = req.body || {};
    const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
    if (!rawMessage) {
      res.status(400).json({ error: "N\u1ED9i dung tin nh\u1EAFn kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng." });
      return;
    }
    const message = rawMessage.slice(0, AI_CHAT_MAX_MESSAGE_LENGTH);
    const lang = body.lang === "en" ? "en" : "vi";
    const isFollowUp = Boolean(body.isFollowUp);
    const sessionId = typeof body.sessionId === "string" && body.sessionId.trim() ? body.sessionId.trim().slice(0, 80) : void 0;
    const rawState = body.currentState || {};
    const days = Array.isArray(rawState.days) ? rawState.days.slice(0, 6).map((d) => ({
      day: typeof d?.day === "string" ? d.day.slice(0, 40) : "",
      title: typeof d?.title === "string" ? d.title.slice(0, 120) : "",
      slots: Array.isArray(d?.slots) ? d.slots.slice(0, 10).map((s) => ({
        title: typeof s?.title === "string" ? s.title.slice(0, 120) : "",
        location: typeof s?.location === "string" ? s.location.slice(0, 120) : "",
        time: typeof s?.time === "string" ? s.time.slice(0, 40) : ""
      })) : []
    })) : [];
    const history = Array.isArray(body.history) ? body.history.slice(-10).filter((h) => h && typeof h.user === "string" && typeof h.reply === "string").map((h) => ({
      user: h.user.slice(0, 800),
      reply: h.reply.slice(0, 1200)
    })) : [];
    const draftIntake = sanitizeDraftIntake(body.draftIntake);
    const currentExpenses = sanitizeCurrentExpenses(body.currentExpenses);
    const chatRequest = {
      message,
      lang,
      isFollowUp,
      currentState: {
        theme: asTheme(rawState.theme),
        duration: asDuration(rawState.duration),
        companion: asCompanion(rawState.companion),
        budget: asBudget(rawState.budget),
        days
      },
      history,
      ...sessionId ? { sessionId } : {},
      ...draftIntake ? { draftIntake } : {},
      ...currentExpenses ? { currentExpenses } : {}
    };
    const result = await handleAiChat(chatRequest);
    res.json(result);
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: "\u0110\xE3 x\u1EA3y ra l\u1ED7i khi x\u1EED l\xFD y\xEAu c\u1EA7u tr\u1EE3 l\xFD AI." });
  }
});
aiRouter.post("/feedback", async (req, res) => {
  try {
    const body = req.body || {};
    const trace2 = await submitAiTraceFeedback({
      traceId: typeof body.traceId === "string" ? body.traceId : "",
      rating: body.rating,
      comment: typeof body.comment === "string" ? body.comment : void 0
    });
    res.json({ ok: true, trace: trace2 });
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: "Kh\xF4ng th\u1EC3 l\u01B0u ph\u1EA3n h\u1ED3i \u0111\xE1nh gi\xE1." });
  }
});
aiRouter.get("/traces", requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const status = typeof req.query.status === "string" ? req.query.status : void 0;
    const intent = typeof req.query.intent === "string" ? req.query.intent : void 0;
    const result = await listAiTraces({ limit, offset, status, intent });
    res.json(result);
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    res.status(500).json({ error: "Kh\xF4ng th\u1EC3 t\u1EA3i danh s\xE1ch AI traces." });
  }
});

// server/routes/authRoutes.ts
import { Router as Router4 } from "express";
var authRouter = Router4();
authRouter.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      res.status(400).json({ error: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 email v\xE0 m\u1EADt kh\u1EA9u." });
      return;
    }
    const user = await findUserForLoginByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: "Email ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c." });
      return;
    }
    const isActive = user.is_active === true || user.is_active === 1;
    if (!isActive) {
      res.status(403).json({ error: "T\xE0i kho\u1EA3n n\xE0y \u0111\xE3 b\u1ECB t\u1EA1m kh\xF3a." });
      return;
    }
    const { token } = await createSession(Number(user.id));
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" || IS_VERCEL,
      path: "/",
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1e3
    });
    res.json({
      token,
      user: {
        id: Number(user.id),
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});
authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = extractSessionTokenFromRequest(req);
    if (token) await deleteSession(token);
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
authRouter.get("/me", async (req, res, next) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp." });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// server/routes/publicPostsRoutes.ts
import { Router as Router5 } from "express";
var publicPostsRouter = Router5();
publicPostsRouter.get("/", async (req, res, next) => {
  try {
    const lang = req.query.lang === "en" ? "en" : "vi";
    const section = typeof req.query.section === "string" ? req.query.section : void 0;
    res.json({
      posts: await listPublicPosts(lang, section)
    });
  } catch (err) {
    next(err);
  }
});
publicPostsRouter.get("/:slug", attachOptionalAuth, async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "").trim();
    const lang = req.query.lang === "en" ? "en" : "vi";
    const isPreview = req.query.preview === "1";
    const result = await getPublicPostBySlug(slug, lang, isPreview, req.authUser);
    res.json(result);
  } catch (err) {
    if (isServiceError(err)) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});

// server/routes/uploadRoutes.ts
import crypto4 from "node:crypto";
import fs3 from "node:fs";
import path3 from "node:path";
import { Router as Router6 } from "express";
import multer from "multer";
var allowedMimeToExt = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  // 4MB (safe within Vercel 4.5MB body limit)
  fileFilter: (_req, file, cb) => {
    if (allowedMimeToExt[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error("Ch\u1EC9 h\u1ED7 tr\u1EE3 \u0111\u1ECBnh d\u1EA1ng \u1EA3nh JPG, PNG, WebP ho\u1EB7c GIF (t\u1ED1i \u0111a 4MB)."));
    }
  }
});
var uploadRouter = Router6();
uploadRouter.post("/", requireAuth, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Upload th\u1EA5t b\u1EA1i." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Kh\xF4ng c\xF3 t\u1EC7p \u1EA3nh n\xE0o \u0111\u01B0\u1EE3c t\u1EA3i l\xEAn." });
      return;
    }
    const ext = allowedMimeToExt[req.file.mimetype] || ".jpg";
    const filename = `${Date.now()}-${crypto4.randomBytes(6).toString("hex")}${ext}`;
    try {
      if (isUsingSupabase()) {
        const supabase = getSupabaseAdmin();
        const storagePath = `cms/${filename}`;
        const { error: uploadErr } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: "31536000",
          upsert: false
        });
        if (uploadErr) {
          res.status(500).json({ error: `Kh\xF4ng th\u1EC3 t\u1EA3i \u1EA3nh l\xEAn Supabase Storage: ${uploadErr.message}` });
          return;
        }
        const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(storagePath);
        res.json({
          url: data.publicUrl,
          filename
        });
        return;
      }
      fs3.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs3.writeFileSync(path3.join(UPLOADS_DIR, filename), req.file.buffer);
      res.json({
        url: `/uploads/${path3.basename(filename)}`,
        filename
      });
    } catch (uploadError) {
      res.status(500).json({
        error: uploadError instanceof Error ? uploadError.message : "Upload \u1EA3nh th\u1EA5t b\u1EA1i."
      });
    }
  });
});

// server/app.ts
try {
  initArizeTelemetry();
} catch (err) {
  console.warn("[Arize AX] Telemetry initialization skipped:", err instanceof Error ? err.message : err);
}
var seedPromise = null;
function ensureSeedReady() {
  if (!seedPromise) {
    seedPromise = ensureSeedData().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
var app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "4mb" }));
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: isUsingSupabase() ? "supabase" : "sqlite"
  });
});
app.use("/api", async (_req, _res, next) => {
  try {
    await ensureSeedReady();
    next();
  } catch (err) {
    next(err);
  }
});
if (!isUsingSupabase()) {
  try {
    fs4.mkdirSync(UPLOADS_DIR, { recursive: true });
    app.use("/uploads", express.static(UPLOADS_DIR));
  } catch {
  }
}
app.use("/api/auth", authRouter);
app.use("/api/ai", aiRouter);
app.use("/api/posts", publicPostsRouter);
app.use("/api/admin/posts", adminPostsRouter);
app.use("/api/admin/uploads", uploadRouter);
app.use("/api/admin/users", adminUsersRouter);
if (!IS_VERCEL && process.env.NODE_ENV === "production" && fs4.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path4.join(DIST_DIR, "index.html"));
  });
}
app.use((err, req, res, _next) => {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return;
  const message = err instanceof Error && process.env.NODE_ENV !== "production" ? err.message : "\u0110\xE3 x\u1EA3y ra l\u1ED7i m\xE1y ch\u1EE7 n\u1ED9i b\u1ED9.";
  res.status(500).json({ error: message });
});
var app_default = app;
export {
  app,
  app_default as default,
  ensureSeedReady
};
