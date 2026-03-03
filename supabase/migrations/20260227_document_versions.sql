-- ============================================================
-- Migration: document_versions table for Version History
-- Assignment #4 — Version History & Document Timeline
-- ============================================================

-- Table to store all document version snapshots (append-only)
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  label TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure version_number is unique per document
  UNIQUE(document_id, version_number)
);

-- Index for frequently used queries (latest versions first)
CREATE INDEX IF NOT EXISTS document_versions_document_id_idx
  ON document_versions(document_id, version_number DESC);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Document owner can view all versions
CREATE POLICY "Owner can view versions"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
        AND documents.user_id = auth.uid()
    )
  );

-- Policy 2: Users with shared edit access can also view versions
CREATE POLICY "Shared edit users can view versions"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_shares.document_id = document_versions.document_id
        AND document_shares.permission = 'edit'
        AND (document_shares.expires_at IS NULL OR document_shares.expires_at > now())
    )
  );

-- Policy 3: Owner or shared-edit users can insert new versions
CREATE POLICY "Owner or shared-edit can insert versions"
  ON document_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
        AND documents.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_shares.document_id = document_versions.document_id
        AND document_shares.permission = 'edit'
        AND (document_shares.expires_at IS NULL OR document_shares.expires_at > now())
    )
  );
