-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE tyrant_category AS ENUM ('federal', 'state', 'local', 'law_enforcement');

CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================
-- TABLES
-- ============================================

-- Admin Users Table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tyrants Table
CREATE TABLE tyrants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    position TEXT NOT NULL,
    category tyrant_category NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    evidence_urls TEXT[] DEFAULT '{}',
    shame_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT tyrants_name_check CHECK (char_length(name) >= 2),
    CONSTRAINT tyrants_description_check CHECK (char_length(description) >= 10)
);

-- Submissions Table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tyrant_name TEXT NOT NULL,
    tyrant_title TEXT NOT NULL,
    category tyrant_category NOT NULL,
    description TEXT NOT NULL,
    evidence_files JSONB DEFAULT '[]'::jsonb,
    reporter_contact TEXT,
    status submission_status DEFAULT 'pending',
    admin_notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES admin_users(id),
    
    CONSTRAINT submissions_description_check CHECK (char_length(description) >= 20)
);

-- Votes Table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tyrant_id UUID NOT NULL REFERENCES tyrants(id) ON DELETE CASCADE,
    ip_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT votes_ip_hash_check CHECK (char_length(ip_hash) = 64)
);

-- ============================================
-- INDEXES
-- ============================================

-- Tyrants indexes
CREATE INDEX idx_tyrants_category ON tyrants(category);
CREATE INDEX idx_tyrants_is_published ON tyrants(is_published);
CREATE INDEX idx_tyrants_shame_count ON tyrants(shame_count DESC);
CREATE INDEX idx_tyrants_created_at ON tyrants(created_at DESC);

-- Submissions indexes
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_category ON submissions(category);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX idx_submissions_reviewed_by ON submissions(reviewed_by);

-- Votes indexes
CREATE INDEX idx_votes_tyrant_id ON votes(tyrant_id);
CREATE INDEX idx_votes_ip_hash ON votes(ip_hash);
CREATE INDEX idx_votes_created_at ON votes(created_at);
CREATE UNIQUE INDEX idx_votes_tyrant_ip_unique ON votes(tyrant_id, ip_hash);

-- Admin users indexes
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE tyrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Tyrants RLS Policies
CREATE POLICY "tyrants_public_read" ON tyrants
    FOR SELECT USING (is_published = true);

CREATE POLICY "tyrants_admin_all" ON tyrants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.jwt_claims 
            WHERE auth.jwt_claims.claims ->> 'role' = 'admin'
        )
    );

-- Submissions RLS Policies
CREATE POLICY "submissions_public_insert" ON submissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "submissions_admin_all" ON submissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.jwt_claims 
            WHERE auth.jwt_claims.claims ->> 'role' = 'admin'
        )
    );

-- Votes RLS Policies
CREATE POLICY "votes_public_insert" ON votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "votes_public_read" ON votes
    FOR SELECT USING (true);

-- Admin Users RLS Policies
CREATE POLICY "admin_users_admin_only" ON admin_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.jwt_claims 
            WHERE auth.jwt_claims.claims ->> 'role' = 'admin'
        )
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tyrants_updated_at
    BEFORE UPDATE ON tyrants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Increment shame_count on vote
CREATE OR REPLACE FUNCTION increment_shame_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tyrants 
    SET shame_count = shame_count + 1 
    WHERE id = NEW.tyrant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_vote_insert
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION increment_shame_count();

-- Decrement shame_count on vote deletion
CREATE OR REPLACE FUNCTION decrement_shame_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tyrants 
    SET shame_count = GREATEST(shame_count - 1, 0) 
    WHERE id = OLD.tyrant_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_vote_delete
    AFTER DELETE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION decrement_shame_count();

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Check if IP has already voted for a tyrant (within rate limit period)
CREATE OR REPLACE FUNCTION has_voted(
    p_tyrant_id UUID,
    p_ip_hash TEXT,
    p_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM votes 
        WHERE tyrant_id = p_tyrant_id 
        AND ip_hash = p_ip_hash 
        AND created_at > NOW() - (p_hours || ' hours')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get published tyrants with vote counts
CREATE OR REPLACE FUNCTION get_published_tyrants(
    p_category tyrant_category DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    title TEXT,
    position TEXT,
    category tyrant_category,
    description TEXT,
    image_url TEXT,
    evidence_urls TEXT[],
    shame_count INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.title,
        t.position,
        t.category,
        t.description,
        t.image_url,
        t.evidence_urls,
        t.shame_count,
        t.created_at
    FROM tyrants t
    WHERE t.is_published = true
    AND (p_category IS NULL OR t.category = p_category)
    ORDER BY t.shame_count DESC, t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Get pending submissions count
CREATE OR REPLACE FUNCTION get_pending_submissions_count()
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count
    FROM submissions
    WHERE status = 'pending';
    RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INITIAL ADMIN USER (change password after first login)
-- ============================================

-- Insert default admin (password: 'changeme' - bcrypt hash)
-- Replace with proper bcrypt hash in production
INSERT INTO admin_users (email, password_hash)
VALUES (
    'admin@tyrantcam.local',
    '$2a$10$YourBcryptHashHereReplaceInProduction'
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- GRANTS FOR SUPABASE AUTH
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON tyrants TO anon, authenticated;
GRANT INSERT ON submissions TO anon, authenticated;
GRANT SELECT, INSERT ON votes TO anon, authenticated;
