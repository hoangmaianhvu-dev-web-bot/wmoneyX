-- 1. Đảm bảo bảng system_settings có cấu trúc đúng với PRIMARY KEY là cột 'key'
-- Nếu bảng đã tồn tại, chúng ta sẽ đảm bảo cột 'key' là khóa chính để lệnh upsert hoạt động chính xác.

DO $$ 
BEGIN
    -- Kiểm tra xem bảng có khóa chính chưa
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'system_settings' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        -- Nếu chưa có, thử đặt 'key' làm khóa chính
        -- Trước tiên xóa các ràng buộc unique cũ nếu có để tránh xung đột
        ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS system_settings_key_key;
        ALTER TABLE system_settings ADD PRIMARY KEY (key);
    END IF;
END $$;

-- 2. Đảm bảo RLS được cấu hình đúng
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON system_settings;
CREATE POLICY "Allow public read access" ON system_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin write access" ON system_settings;
CREATE POLICY "Allow admin write access" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- 3. Khởi tạo dữ liệu mẫu nếu cần
INSERT INTO system_settings (key, value)
VALUES ('maintenance_tasks', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;
