import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PricePolicy } from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '..');

const preExistingEnvKeys = new Set(Object.keys(process.env));

function readEnvFileIntoProcess(onlyKeys?: Set<string>): void {
  const candidates = ['.env', '.env.local'];
  for (const fileName of candidates) {
    const filePath = path.join(ROOT_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (onlyKeys && !onlyKeys.has(key)) continue;
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Respect pre-existing process.env vars (including test overrides like GEMINI_API_KEY=''),
      // while allowing .env.local to override .env values.
      if (!preExistingEnvKeys.has(key)) {
        if (
          fileName === '.env.local'
            ? value !== '' || process.env[key] === undefined
            : process.env[key] === undefined || (onlyKeys && process.env[key] === '')
        ) {
          process.env[key] = value;
        }
      }
    }
  }
}

readEnvFileIntoProcess();

export function getGeminiApiKey(): string {
  if (!process.env.GEMINI_API_KEY?.trim() && !preExistingEnvKeys.has('GEMINI_API_KEY')) {
    readEnvFileIntoProcess(new Set(['GEMINI_API_KEY']));
  }
  return (process.env.GEMINI_API_KEY || '').trim();
}

export function getTavilyApiKey(): string {
  if (!process.env.TAVILY_API_KEY?.trim() && !preExistingEnvKeys.has('TAVILY_API_KEY')) {
    readEnvFileIntoProcess(new Set(['TAVILY_API_KEY']));
  }
  return (process.env.TAVILY_API_KEY || '').trim();
}

function parseTavilySearchDepth(raw: string | undefined): 'basic' | 'advanced' | 'fast' | 'ultra-fast' {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'advanced' || val === 'fast' || val === 'ultra-fast' || val === 'basic') {
    return val;
  }
  return 'basic';
}

function parseTavilyIncludeAnswer(raw: string | undefined): boolean | 'basic' | 'advanced' {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'false' || val === '0' || val === 'no') return false;
  if (val === 'advanced') return 'advanced';
  if (val === 'basic') return 'basic';
  return true;
}

export const SERVER_DIR = __dirname;
export const DATA_DIR = path.join(SERVER_DIR, 'data');
export const DB_PATH = process.env.CMS_DB_PATH || path.join(DATA_DIR, 'daklak.db');
export const UPLOADS_DIR = process.env.CMS_UPLOADS_DIR || path.join(SERVER_DIR, 'uploads');
export const DIST_DIR = path.join(ROOT_DIR, 'dist');

export const PORT = Number(process.env.CMS_PORT || process.env.PORT || 4000);
export const SESSION_COOKIE_NAME = 'daklak_session';
export const SESSION_TTL_DAYS = 7;

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';
export const GEMINI_DECISION_MODEL = process.env.GEMINI_DECISION_MODEL || '';
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
export const TAVILY_TIMEOUT_MS = Math.max(2000, Number(process.env.TAVILY_TIMEOUT_MS || 10000));
export const TAVILY_SEARCH_DEPTH = parseTavilySearchDepth(process.env.TAVILY_SEARCH_DEPTH);
export const TAVILY_INCLUDE_ANSWER = parseTavilyIncludeAnswer(process.env.TAVILY_INCLUDE_ANSWER);
export const TAVILY_MAX_RESULTS = Math.min(10, Math.max(1, Number(process.env.TAVILY_MAX_RESULTS || 5)));
export const TAVILY_COUNTRY = (process.env.TAVILY_COUNTRY ?? 'vietnam').trim();
export const AI_PRICE_TTL_HOURS = Number(process.env.AI_PRICE_TTL_HOURS || 168);
export const AI_CHAT_TIMEOUT_MS = Number(process.env.AI_CHAT_TIMEOUT_MS || 30000);
export const AI_RESPONSE_MAX_TOKENS = Number(process.env.AI_RESPONSE_MAX_TOKENS || 4096);
export const AI_PRICE_POLICY: PricePolicy = {
  currency: 'VND',
  priceTtlHours: AI_PRICE_TTL_HOURS,
  lodgingShareCapPct: 40,
  transitShareCapPct: 25,
  contingencyBufferPct: 10,
  fallbackStrategy: 'tavily_then_estimate_with_disclaimer',
};
export const AI_CHAT_MAX_MESSAGE_LENGTH = 1500;
export const AI_CHAT_RATE_LIMIT_MAX = Number(process.env.AI_CHAT_RATE_LIMIT_MAX || 30);
export const AI_CHAT_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

export const ARIZE_API_KEY = process.env.ARIZE_API_KEY || '';
export const ARIZE_SPACE_ID = process.env.ARIZE_SPACE_ID || '';
export const ARIZE_PROJECT_NAME = process.env.ARIZE_PROJECT_NAME || 'dak-lak-travel-concierge';
export const ARIZE_COLLECTOR_ENDPOINT =
  process.env.ARIZE_COLLECTOR_ENDPOINT || 'https://otlp.arize.com';

export const DEFAULT_ADMIN_EMAIL = process.env.CMS_ADMIN_EMAIL || 'admin@daklak.travel';
export const DEFAULT_ADMIN_PASSWORD = process.env.CMS_ADMIN_PASSWORD || 'Admin@123';
export const DEFAULT_WRITER_EMAIL = process.env.CMS_WRITER_EMAIL || 'writer@daklak.travel';
export const DEFAULT_WRITER_PASSWORD = process.env.CMS_WRITER_PASSWORD || 'Writer@123';
