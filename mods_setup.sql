-- Bảng lưu trữ các bản Mod Game
CREATE TABLE IF NOT EXISTS mods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  download_url TEXT NOT NULL,
  category TEXT DEFAULT 'Action',
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- RLS cho bảng mods
ALTER TABLE mods ENABLE ROW LEVEL SECURITY;

-- Mọi người đều có thể xem mods
CREATE POLICY "Mods are viewable by everyone" ON mods
  FOR SELECT USING (true);

-- Chỉ admin mới có quyền thêm/sửa/xóa mods
-- Lưu ý: Cần thay thế '22072009' bằng ADMIN_ID thực tế nếu khác
CREATE POLICY "Admins can manage mods" ON mods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
