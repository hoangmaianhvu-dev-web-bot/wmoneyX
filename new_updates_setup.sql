-- 1. Cập nhật bảng profiles với các cột mới
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS exp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- 2. Bảng lưu trữ các giao dịch (Transactions)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'TASK', 'WITHDRAW', 'REFUND', 'DAILY', 'REFERRAL', 'GAME'
  amount INTEGER NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'REJECTED'
  withdrawal_id UUID, -- Liên kết với bảng withdrawals nếu là lệnh rút tiền
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Bảng lưu trữ các lệnh rút tiền (Withdrawals)
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL, -- 'bank', 'e-wallet', 'card'
  details JSONB NOT NULL, -- Lưu thông tin STK, Ngân hàng, SĐT...
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'REJECTED'
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawals" ON withdrawals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawals" ON withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Bảng lưu trữ thông báo hệ thống (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications are viewable by everyone" ON notifications
  FOR SELECT USING (true);

-- 5. Bảng lưu trữ báo cáo lỗi (Reports)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Bảng lưu trữ chứng minh thanh toán (Payment Proofs)
CREATE TABLE IF NOT EXISTS payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment proofs are viewable by everyone" ON payment_proofs
  FOR SELECT USING (true);

-- 7. Quyền Admin cho tất cả các bảng (Ví dụ)
-- Thay thế 'is_admin = true' bằng logic kiểm tra admin của bạn
CREATE POLICY "Admins can manage everything" ON transactions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can manage withdrawals" ON withdrawals FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can manage notifications" ON notifications FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can manage reports" ON reports FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can manage payment_proofs" ON payment_proofs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
