-- Thêm cột approved_at_1 vào bảng special_task_submissions
ALTER TABLE public.special_task_submissions ADD COLUMN IF NOT EXISTS approved_at_1 TIMESTAMP WITH TIME ZONE;

-- Đảm bảo các cột trạng thái cũng tồn tại (phòng hờ)
ALTER TABLE public.special_task_submissions ADD COLUMN IF NOT EXISTS status_1 TEXT DEFAULT 'PENDING';
ALTER TABLE public.special_task_submissions ADD COLUMN IF NOT EXISTS status_2 TEXT DEFAULT 'PENDING';
ALTER TABLE public.special_task_submissions ADD COLUMN IF NOT EXISTS total_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.special_task_submissions ADD COLUMN IF NOT EXISTS reward_amount INTEGER DEFAULT 1000;
ALTER TABLE public.special_task_submissions ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE public.special_task_submissions ADD COLUMN IF NOT EXISTS review_link TEXT;
