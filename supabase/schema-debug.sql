-- First, let's see what the current user ID is
SELECT auth.uid() as current_user_id;

-- Check if documents table exists and its structure
SELECT table_name FROM information_schema.tables WHERE table_name = 'documents';

-- Check all policies on documents
SELECT 
    schemaname,
    tablename, 
    policyname, 
    permissive, 
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY policyname;

-- Test: Try to insert a document directly (this will show the exact error)
-- Note: Replace 'YOUR_USER_ID_HERE' with actual UUID from auth.users
INSERT INTO documents (user_id, title, content) 
VALUES (auth.uid(), 'Test Document', 'Test Content')
RETURNING id, user_id, title;

-- Check if row was inserted
SELECT id, user_id, title, created_at FROM documents ORDER BY created_at DESC LIMIT 5;
