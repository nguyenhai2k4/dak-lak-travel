-- Dak Lak Travel CMS & AI Concierge Schema (Supabase Postgres + Storage)

CREATE TABLE IF NOT EXISTS public.users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'writer')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  token text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  legacy_key text UNIQUE,
  section text NOT NULL CHECK (section IN ('bento', 'stories')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'published')),
  sort_order integer NOT NULL DEFAULT 0,
  author_id bigint REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by bigint REFERENCES public.users(id) ON DELETE SET NULL,
  review_note text NOT NULL DEFAULT '',
  cover_image text NOT NULL,
  image_alt text NOT NULL DEFAULT '',
  theme_key text NOT NULL CHECK (theme_key IN ('coffee', 'culture', 'nature', 'cuisine')),
  section_meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  title text NOT NULL,
  excerpt text NOT NULL,
  category text NOT NULL,
  location text NOT NULL,
  read_time text NOT NULL,
  cta_label text NOT NULL,
  preview_paragraphs_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_html text NOT NULL DEFAULT '',
  quote text NOT NULL DEFAULT '',
  quote_source text NOT NULL DEFAULT '',
  glossary_json jsonb NOT NULL DEFAULT '[]'::jsonb,

  title_en text NOT NULL DEFAULT '',
  excerpt_en text NOT NULL DEFAULT '',
  category_en text NOT NULL DEFAULT '',
  location_en text NOT NULL DEFAULT '',
  read_time_en text NOT NULL DEFAULT '',
  cta_label_en text NOT NULL DEFAULT '',
  preview_paragraphs_en_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_html_en text NOT NULL DEFAULT '',
  quote_en text NOT NULL DEFAULT '',
  quote_source_en text NOT NULL DEFAULT '',
  glossary_en_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  translation_status text NOT NULL DEFAULT 'none' CHECK (translation_status IN ('none', 'pending', 'translated', 'failed')),
  translation_provider text NOT NULL DEFAULT '',
  translated_at timestamptz,

  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stays (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text UNIQUE NOT NULL,
  area text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('budget', 'standard', 'luxury')),
  nightly_rate_vnd integer NOT NULL,
  capacity_min integer NOT NULL DEFAULT 1,
  capacity_max integer NOT NULL DEFAULT 4,
  suitable_for_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  amenities_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_note text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logistics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mode text UNIQUE NOT NULL,
  label text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('budget', 'standard', 'luxury')),
  daily_rate_vnd integer NOT NULL,
  capacity_min integer NOT NULL DEFAULT 1,
  capacity_max integer NOT NULL DEFAULT 4,
  suitable_for_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.place_prices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  place_title text UNIQUE NOT NULL,
  area_cluster text NOT NULL,
  ticket_vnd integer NOT NULL DEFAULT 0,
  estimated_spend_vnd integer NOT NULL DEFAULT 0,
  price_source text NOT NULL DEFAULT 'seed' CHECK (price_source IN ('seed', 'sqlite_cache', 'tavily', 'estimated')),
  price_note text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_traces (
  trace_id text PRIMARY KEY,
  lang text NOT NULL DEFAULT 'vi',
  user_message text NOT NULL,
  intent text NOT NULL,
  status text NOT NULL CHECK (status IN ('needs_clarification', 'completed')),
  provider text NOT NULL DEFAULT '',
  intake_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  capacity_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  budget_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  purpose_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  eval_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  latency_ms integer NOT NULL DEFAULT 0,
  retry_count integer NOT NULL DEFAULT 0,
  feedback_rating smallint CHECK (feedback_rating IN (-1, 1)),
  feedback_comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_section_status ON public.posts(section, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_reviewed_by ON public.posts(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_stays_tier_active ON public.stays(tier, is_active);
CREATE INDEX IF NOT EXISTS idx_stays_area ON public.stays(area);
CREATE INDEX IF NOT EXISTS idx_logistics_tier_active ON public.logistics(tier, is_active);
CREATE INDEX IF NOT EXISTS idx_place_prices_area ON public.place_prices(area_cluster);
CREATE INDEX IF NOT EXISTS idx_place_prices_fetched ON public.place_prices(fetched_at);
CREATE INDEX IF NOT EXISTS idx_ai_traces_created ON public.ai_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_traces_intent_status ON public.ai_traces(intent, status);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_traces ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.posts FROM anon, authenticated;
REVOKE ALL ON TABLE public.stays FROM anon, authenticated;
REVOKE ALL ON TABLE public.logistics FROM anon, authenticated;
REVOKE ALL ON TABLE public.place_prices FROM anon, authenticated;
REVOKE ALL ON TABLE public.ai_traces FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
