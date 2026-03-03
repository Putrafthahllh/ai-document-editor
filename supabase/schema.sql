-- Create documents table safely (only if not exists)
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (safe to run multiple times)
alter table documents enable row level security;

-- Drop all existing policies first (both old and new names)
drop policy if exists "Users can manipulate their own documents" on documents;
drop policy if exists "Users can view their own documents" on documents;
drop policy if exists "Users can insert their own documents" on documents;
drop policy if exists "Users can update their own documents" on documents;
drop policy if exists "Users can delete their own documents" on documents;
drop policy if exists "Enable insert for authenticated users" on documents;
drop policy if exists "Enable select for users based on user_id" on documents;
drop policy if exists "Enable update for users based on user_id" on documents;
drop policy if exists "Enable delete for users based on user_id" on documents;

-- Disable RLS temporarily to allow creation
alter table documents disable row level security;

-- Re-enable RLS
alter table documents enable row level security;

-- Create simple, explicit policies
create policy "Enable insert for authenticated users"
  on documents for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Enable select for users based on user_id"
  on documents for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Enable update for users based on user_id"
  on documents for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Enable delete for users based on user_id"
  on documents for delete
  to authenticated
  using (auth.uid() = user_id);

-- Enable Realtime safely
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'documents') then
    alter publication supabase_realtime add table documents;
  end if;
end $$;


-- ==================== ASSIGNMENT 4: VERSION HISTORY ====================

-- Tabel untuk menyimpan semua versi dokumen
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  label TEXT,                          -- nama opsional, contoh: "Sebelum revisi besar"
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Pastikan version_number unik per dokumen
  UNIQUE(document_id, version_number)
);

-- Index untuk query yang sering dipakai
CREATE INDEX IF NOT EXISTS document_versions_document_id_idx
  ON document_versions(document_id, version_number DESC);

-- RLS
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama dulu (agar idempotent / bisa dijalankan berulang)
DROP POLICY IF EXISTS "Owner can view versions" ON document_versions;
DROP POLICY IF EXISTS "Shared edit users can view versions" ON document_versions;
DROP POLICY IF EXISTS "Owner or shared-edit can insert versions" ON document_versions;

-- Pemilik dokumen bisa lihat semua versi
CREATE POLICY "Owner can view versions"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
        AND documents.user_id = auth.uid()
    )
  );

-- User dengan shared edit juga bisa lihat versi
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

-- Insert: pemilik atau shared-edit
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

