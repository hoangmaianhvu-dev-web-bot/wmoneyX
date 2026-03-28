-- Thêm các cột cần thiết cho đua top và vòng quay
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS monthly_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_earnings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_month TEXT, -- Định dạng 'YYYY-MM'
ADD COLUMN IF NOT EXISTS last_spin_month TEXT; -- Định dạng 'YYYY-MM'

-- Cập nhật RLS cho bảng transactions nếu cần
-- (Đã có từ các bước trước)
