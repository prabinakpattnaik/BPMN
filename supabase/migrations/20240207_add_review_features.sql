-- Add status column to workflows table
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
    node_id text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    user_name text -- Optional: store name to avoid joins if simple
);

-- Policy examples (you may need to adjust based on your specific RLS setup)
-- Allow authenticated users to view comments on workflows they can see
CREATE POLICY "Enable read access for all users" ON comments FOR SELECT USING (true);
-- Allow authenticated users to insert comments
CREATE POLICY "Enable insert for authenticated users" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
