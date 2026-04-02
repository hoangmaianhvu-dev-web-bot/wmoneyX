-- 1. Cập nhật bảng profiles để hỗ trợ Xếp Hạng (Leaderboard)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tasks_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS special_tasks_total INTEGER DEFAULT 0;

-- 2. Đảm bảo bảng system_settings tồn tại để lưu cấu hình bảo trì và trạng thái trao thưởng
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bật RLS cho system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Quyền đọc cho mọi người
DROP POLICY IF EXISTS "Allow public read access" ON system_settings;
CREATE POLICY "Allow public read access" ON system_settings
    FOR SELECT USING (true);

-- Quyền quản lý cho Admin
DROP POLICY IF EXISTS "Allow admin write access" ON system_settings;
CREATE POLICY "Allow admin write access" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- 3. Khởi tạo dữ liệu mặc định cho bảo trì nhiệm vụ
INSERT INTO system_settings (key, value)
VALUES ('maintenance_tasks', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Đảm bảo bảng transactions có đầy đủ các loại (type) cần thiết cho Xếp Hạng Tháng
-- Các loại type được sử dụng: 'TASK', 'SPECIAL_TASK', 'DAILY_REWARD', 'REFERRAL'
-- Nếu bảng transactions chưa có RLS cho Admin, hãy thêm vào:
DROP POLICY IF EXISTS "Admins can manage everything" ON transactions;
CREATE POLICY "Admins can manage everything" ON transactions 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    )
);

-- 5. Đảm bảo bảng notifications có RLS cho Admin
DROP POLICY IF EXISTS "Admins can manage notifications" ON notifications;
CREATE POLICY "Admins can manage notifications" ON notifications 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    )
);
