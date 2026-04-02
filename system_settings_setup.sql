-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access" ON system_settings
    FOR SELECT USING (true);

-- Create policy for admin write access
CREATE POLICY "Allow admin write access" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insert initial maintenance_tasks if not exists
INSERT INTO system_settings (key, value)
VALUES ('maintenance_tasks', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;
