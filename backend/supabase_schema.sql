-- KeepSqueak Supabase Database Schema
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- PROFILES (auto-created on signup via trigger)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',        -- free | credits | monthly_pro | annual_pro
  credits INTEGER DEFAULT 1,      -- 1 free credit on signup
  books_created INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "update own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================
-- PURCHASES
-- ============================================
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,              -- credits_pack | per_book | subscription
  plan_id TEXT NOT NULL,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  paypal_order_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  credits_granted INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',   -- pending | completed | failed | refunded
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own" ON purchases FOR SELECT USING (auth.uid() = user_id);


-- ============================================
-- CREDIT LEDGER
-- ============================================
CREATE TABLE credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own" ON credit_ledger FOR SELECT USING (auth.uid() = user_id);


-- ============================================
-- MARKETPLACE DESIGNS
-- ============================================
CREATE TABLE marketplace_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,              -- theme | cover | layout_pack
  subcategory TEXT,                    -- romantic, minimalist, seasonal, etc.
  preview_image_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  config_json JSONB NOT NULL,          -- Same shape as TEMPLATE_STYLES entries
  is_free BOOLEAN DEFAULT FALSE,
  price_cents INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketplace_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON marketplace_designs FOR SELECT USING (true);


-- ============================================
-- USER OWNED DESIGNS
-- ============================================
CREATE TABLE user_owned_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  design_id UUID REFERENCES marketplace_designs(id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, design_id)
);

ALTER TABLE user_owned_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own" ON user_owned_designs FOR SELECT USING (auth.uid() = user_id);


-- ============================================
-- DESIGN SUBMISSIONS (designer marketplace submissions)
-- ============================================
CREATE TABLE design_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,         -- theme | cover | layout_pack
  subcategory TEXT,
  preview_image_url TEXT,
  config_json JSONB NOT NULL,     -- theme config (same shape as TEMPLATE_STYLES)
  status TEXT DEFAULT 'pending',  -- pending | approved | rejected
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE design_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own" ON design_submissions FOR SELECT USING (auth.uid() = designer_id);
CREATE POLICY "insert own" ON design_submissions FOR INSERT WITH CHECK (auth.uid() = designer_id);


-- ============================================
-- ATOMIC RPC FUNCTIONS
-- ============================================

-- Atomic credit increment (for purchases)
CREATE OR REPLACE FUNCTION increment_credits(user_id_input UUID, amount_input INT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET credits = credits + amount_input,
      updated_at = NOW()
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic credit use (returns TRUE if successful, FALSE if insufficient)
CREATE OR REPLACE FUNCTION use_credit(user_id_input UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  UPDATE profiles
  SET credits = credits - 1,
      updated_at = NOW()
  WHERE id = user_id_input AND credits > 0;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic books_created increment
CREATE OR REPLACE FUNCTION increment_books_created(user_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET books_created = books_created + 1,
      updated_at = NOW()
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic credit refund (for failed generations)
CREATE OR REPLACE FUNCTION refund_credit(user_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET credits = credits + 1,
      updated_at = NOW()
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- GENERATION HISTORY (debugging + analytics)
-- ============================================
CREATE TABLE generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generation_id TEXT NOT NULL,
  template_slug TEXT,
  num_photos INT,
  num_pages INT,
  duration_ms INT,
  status TEXT DEFAULT 'started',   -- started | completed | failed | cancelled
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own" ON generation_history FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_generation_history_user ON generation_history(user_id);
CREATE INDEX idx_generation_history_status ON generation_history(status);


-- ============================================
-- PAYMENT AUDIT LOG
-- ============================================
CREATE TABLE payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,   -- checkout_created | payment_completed | credits_granted | credits_used | subscription_cancelled
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own" ON payment_audit_log FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_payment_audit_user ON payment_audit_log(user_id);
CREATE INDEX idx_payment_audit_event ON payment_audit_log(event_type);


-- ============================================
-- PHASE 1: Language preference
-- ============================================
ALTER TABLE profiles ADD COLUMN language_preference TEXT DEFAULT 'en';


-- ============================================
-- PHASE 3: CONTACT SUBMISSIONS
-- ============================================
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert" ON contact_submissions FOR INSERT WITH CHECK (true);


-- ============================================
-- PHASE 4: REFERRAL SYSTEM
-- ============================================
ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE;

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending',       -- pending | completed
  credits_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own referrals" ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- Atomic RPC: process a referral (validates, inserts referral, awards credits to both)
CREATE OR REPLACE FUNCTION process_referral(
  referred_user_id_input UUID,
  referral_code_input TEXT,
  credits_per_referral INT DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_id_found UUID;
BEGIN
  -- Find the referrer by code
  SELECT id INTO referrer_id_found
  FROM profiles
  WHERE referral_code = referral_code_input;

  IF referrer_id_found IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Don't allow self-referral
  IF referrer_id_found = referred_user_id_input THEN
    RETURN FALSE;
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_user_id = referred_user_id_input) THEN
    RETURN FALSE;
  END IF;

  -- Insert the referral record
  INSERT INTO referrals (referrer_id, referred_user_id, referral_code, status, credits_awarded, completed_at)
  VALUES (referrer_id_found, referred_user_id_input, referral_code_input, 'completed', credits_per_referral, NOW());

  -- Award credits to referrer
  UPDATE profiles SET credits = credits + credits_per_referral, updated_at = NOW()
  WHERE id = referrer_id_found;

  -- Award credits to referred user
  UPDATE profiles SET credits = credits + credits_per_referral, updated_at = NOW()
  WHERE id = referred_user_id_input;

  -- Record in credit ledger for both
  INSERT INTO credit_ledger (user_id, delta, reason) VALUES
    (referrer_id_found, credits_per_referral, 'referral_bonus'),
    (referred_user_id_input, credits_per_referral, 'referred_signup_bonus');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- ADMIN: Schema Extensions
-- ============================================
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN ban_reason TEXT;

ALTER TABLE contact_submissions ADD COLUMN status TEXT DEFAULT 'open';
ALTER TABLE contact_submissions ADD COLUMN admin_response TEXT;
ALTER TABLE contact_submissions ADD COLUMN responded_at TIMESTAMPTZ;
ALTER TABLE contact_submissions ADD COLUMN responded_by UUID REFERENCES profiles(id);

ALTER TABLE purchases ADD COLUMN refunded_at TIMESTAMPTZ;
ALTER TABLE purchases ADD COLUMN refund_reason TEXT;
ALTER TABLE purchases ADD COLUMN refunded_by UUID REFERENCES profiles(id);

-- Admin Audit Log
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_action ON admin_audit_log(action);

-- Admin RPC: Dashboard Stats
CREATE OR REPLACE FUNCTION admin_get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'users_today', (SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE),
    'total_revenue_cents', (SELECT COALESCE(SUM(amount_cents), 0) FROM purchases WHERE status = 'completed'),
    'revenue_today_cents', (SELECT COALESCE(SUM(amount_cents), 0) FROM purchases WHERE status = 'completed' AND created_at >= CURRENT_DATE),
    'total_generations', (SELECT COUNT(*) FROM generation_history),
    'generations_today', (SELECT COUNT(*) FROM generation_history WHERE created_at >= CURRENT_DATE),
    'active_subscriptions', (SELECT COUNT(*) FROM profiles WHERE plan IN ('monthly_pro', 'annual_pro')),
    'pending_submissions', (SELECT COUNT(*) FROM design_submissions WHERE status = 'pending'),
    'open_contacts', (SELECT COUNT(*) FROM contact_submissions WHERE status = 'open')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin RPC: Revenue Timeseries
CREATE OR REPLACE FUNCTION admin_revenue_timeseries(days_input INT DEFAULT 30)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        d::date AS day,
        COALESCE(SUM(p.amount_cents), 0) AS revenue_cents,
        COUNT(p.id) AS purchase_count
      FROM generate_series(CURRENT_DATE - (days_input - 1), CURRENT_DATE, '1 day') d
      LEFT JOIN purchases p ON p.created_at::date = d::date AND p.status = 'completed'
      GROUP BY d::date
      ORDER BY d::date
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin RPC: User Growth Timeseries
CREATE OR REPLACE FUNCTION admin_user_growth_timeseries(days_input INT DEFAULT 30)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        d::date AS day,
        COUNT(pr.id) AS new_users,
        SUM(COUNT(pr.id)) OVER (ORDER BY d::date) +
          (SELECT COUNT(*) FROM profiles WHERE created_at < CURRENT_DATE - (days_input - 1)) AS cumulative
      FROM generate_series(CURRENT_DATE - (days_input - 1), CURRENT_DATE, '1 day') d
      LEFT JOIN profiles pr ON pr.created_at::date = d::date
      GROUP BY d::date
      ORDER BY d::date
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin RPC: Generation Timeseries
CREATE OR REPLACE FUNCTION admin_generation_timeseries(days_input INT DEFAULT 30)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        d::date AS day,
        COUNT(g.id) AS total,
        COUNT(g.id) FILTER (WHERE g.status = 'completed') AS completed,
        COUNT(g.id) FILTER (WHERE g.status = 'failed') AS failed
      FROM generate_series(CURRENT_DATE - (days_input - 1), CURRENT_DATE, '1 day') d
      LEFT JOIN generation_history g ON g.created_at::date = d::date
      GROUP BY d::date
      ORDER BY d::date
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin RPC: Template Popularity
CREATE OR REPLACE FUNCTION admin_template_popularity(limit_input INT DEFAULT 10)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT template_slug, COUNT(*) AS usage_count
      FROM generation_history
      WHERE template_slug IS NOT NULL
      GROUP BY template_slug
      ORDER BY usage_count DESC
      LIMIT limit_input
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- MIGRATION: End-to-End Database Enhancement
-- Run this block in Supabase SQL Editor.
-- All statements are idempotent (IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================


-- ── P0: Fix handle_new_user trigger ─────────────────────────────────────
-- Critical: SECURITY DEFINER + SET search_path = public
-- Without these the trigger runs as supabase_auth_admin which cannot
-- access the public schema, causing "Database error saving new user".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── P1.1: Book Drafts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  template_slug TEXT,
  structure_template TEXT,
  wizard_state JSONB,
  question_answers JSONB,
  draft_json JSONB,
  photo_analyses JSONB,
  editor_overrides JSONB,
  num_photos INT DEFAULT 0,
  num_pages INT DEFAULT 0,
  generation_id TEXT,
  status TEXT DEFAULT 'draft',
  last_auto_saved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE book_drafts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_drafts' AND policyname = 'Users read own drafts') THEN
    CREATE POLICY "Users read own drafts" ON book_drafts FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_drafts' AND policyname = 'Users insert own drafts') THEN
    CREATE POLICY "Users insert own drafts" ON book_drafts FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_drafts' AND policyname = 'Users update own drafts') THEN
    CREATE POLICY "Users update own drafts" ON book_drafts FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_drafts' AND policyname = 'Users delete own drafts') THEN
    CREATE POLICY "Users delete own drafts" ON book_drafts FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_book_drafts_user ON book_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_book_drafts_user_updated ON book_drafts(user_id, updated_at DESC);


-- ── P1.2: Book Draft Photos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_draft_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES book_drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_index INT NOT NULL,
  original_name TEXT,
  storage_path TEXT NOT NULL,
  mime_type TEXT DEFAULT 'image/jpeg',
  file_size_bytes INT,
  width INT,
  height INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draft_id, photo_index)
);

ALTER TABLE book_draft_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_draft_photos' AND policyname = 'Users read own draft photos') THEN
    CREATE POLICY "Users read own draft photos" ON book_draft_photos FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_draft_photos' AND policyname = 'Users insert own draft photos') THEN
    CREATE POLICY "Users insert own draft photos" ON book_draft_photos FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'book_draft_photos' AND policyname = 'Users delete own draft photos') THEN
    CREATE POLICY "Users delete own draft photos" ON book_draft_photos FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_draft_photos_draft ON book_draft_photos(draft_id);


-- ── P1.3: PDF Downloads ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pdf_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  draft_id UUID REFERENCES book_drafts(id) ON DELETE SET NULL,
  generation_id TEXT,
  template_slug TEXT,
  num_pages INT,
  page_size TEXT,
  file_size_bytes BIGINT,
  duration_ms INT,
  download_method TEXT DEFAULT 'stream',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pdf_downloads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pdf_downloads' AND policyname = 'Users read own pdf downloads') THEN
    CREATE POLICY "Users read own pdf downloads" ON pdf_downloads FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pdf_downloads_user ON pdf_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_downloads_created ON pdf_downloads(created_at DESC);


-- ── P2.1: Events (partitioned by month) ────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  page_path TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for 2026
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'events_2026_01') THEN
    CREATE TABLE events_2026_01 PARTITION OF events FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'events_2026_02') THEN
    CREATE TABLE events_2026_02 PARTITION OF events FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'events_2026_03') THEN
    CREATE TABLE events_2026_03 PARTITION OF events FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'events_2026_04') THEN
    CREATE TABLE events_2026_04 PARTITION OF events FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'events_2026_05') THEN
    CREATE TABLE events_2026_05 PARTITION OF events FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'events_2026_06') THEN
    CREATE TABLE events_2026_06 PARTITION OF events FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
  END IF;
END $$;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Anyone can insert events') THEN
    CREATE POLICY "Anyone can insert events" ON events FOR INSERT WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_created ON events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_category_created ON events(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);


-- ── P2.5: Enrich generation_history ────────────────────────────────────
ALTER TABLE generation_history ADD COLUMN IF NOT EXISTS wizard_inputs JSONB;
ALTER TABLE generation_history ADD COLUMN IF NOT EXISTS ai_model TEXT;


-- ── P3.0: Atomic credit deduction (race-condition-safe) ────────────────
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INT, p_reason TEXT)
RETURNS INT AS $$
DECLARE
  new_balance INT;
BEGIN
  UPDATE profiles SET credits = credits - p_amount, updated_at = NOW()
  WHERE id = p_user_id AND credits >= p_amount
  RETURNING credits INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO credit_ledger (user_id, delta, reason)
  VALUES (p_user_id, -p_amount, p_reason);

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── P3.1: Performance Indexes ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned_at) WHERE banned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_design_sub_status ON design_submissions(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_designs(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_featured ON marketplace_designs(is_featured) WHERE is_featured = TRUE;


-- ── P3.2: Admin Analytics RPC Functions ────────────────────────────────

-- Funnel stats: signup → generation → pdf → purchase
CREATE OR REPLACE FUNCTION admin_funnel_stats(days_input INT DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - (days_input || ' days')::INTERVAL;
BEGIN
  RETURN json_build_object(
    'signups', (SELECT COUNT(*) FROM profiles WHERE created_at >= cutoff),
    'started_generation', (SELECT COUNT(DISTINCT user_id) FROM generation_history WHERE created_at >= cutoff AND status IN ('started','completed','failed')),
    'completed_generation', (SELECT COUNT(DISTINCT user_id) FROM generation_history WHERE created_at >= cutoff AND status = 'completed'),
    'downloaded_pdf', (SELECT COUNT(DISTINCT user_id) FROM pdf_downloads WHERE created_at >= cutoff),
    'made_purchase', (SELECT COUNT(DISTINCT user_id) FROM purchases WHERE created_at >= cutoff AND status = 'completed')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Top events by count
CREATE OR REPLACE FUNCTION admin_event_stats(days_input INT DEFAULT 30)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT event_type, event_category, COUNT(*) AS total, COUNT(DISTINCT user_id) AS unique_users
      FROM events
      WHERE created_at >= NOW() - (days_input || ' days')::INTERVAL
      GROUP BY event_type, event_category
      ORDER BY total DESC
      LIMIT 50
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wizard funnel (per-step abandonment)
CREATE OR REPLACE FUNCTION admin_wizard_funnel(days_input INT DEFAULT 30)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        payload->>'step' AS step_name,
        COUNT(*) FILTER (WHERE event_type = 'step_entered') AS entered,
        COUNT(*) FILTER (WHERE event_type = 'step_completed') AS completed
      FROM events
      WHERE event_category = 'wizard'
        AND event_type IN ('step_entered', 'step_completed')
        AND created_at >= NOW() - (days_input || ' days')::INTERVAL
      GROUP BY payload->>'step'
      ORDER BY entered DESC
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PDF download stats
CREATE OR REPLACE FUNCTION admin_pdf_stats(days_input INT DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - (days_input || ' days')::INTERVAL;
BEGIN
  RETURN json_build_object(
    'total_downloads', (SELECT COUNT(*) FROM pdf_downloads WHERE created_at >= cutoff),
    'unique_users', (SELECT COUNT(DISTINCT user_id) FROM pdf_downloads WHERE created_at >= cutoff),
    'avg_pages', (SELECT COALESCE(AVG(num_pages), 0) FROM pdf_downloads WHERE created_at >= cutoff),
    'avg_duration_ms', (SELECT COALESCE(AVG(duration_ms), 0) FROM pdf_downloads WHERE created_at >= cutoff),
    'by_template', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT template_slug, COUNT(*) AS downloads, COUNT(DISTINCT user_id) AS unique_users
        FROM pdf_downloads
        WHERE created_at >= cutoff AND template_slug IS NOT NULL
        GROUP BY template_slug
        ORDER BY downloads DESC
        LIMIT 20
      ) t
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── Storage bucket for book photos ─────────────────────────────────────
-- Run manually in Supabase Dashboard > Storage if not auto-created:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('book-photos', 'book-photos', false);
-- Storage RLS policies (run in SQL Editor):
-- CREATE POLICY "Users upload own photos" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'book-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users read own photos" ON storage.objects FOR SELECT
--   USING (bucket_id = 'book-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users delete own photos" ON storage.objects FOR DELETE
--   USING (bucket_id = 'book-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
