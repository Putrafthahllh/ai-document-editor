-- TEMPORARILY disable RLS to test if that's the issue
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- Try to insert
INSERT INTO documents (user_id, title, content) 
VALUES (auth.uid(), 'Test Without RLS', 'This should work')
RETURNING id, user_id, title;

-- Re-enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
