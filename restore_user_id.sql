-- 1. Thêm lại cột user_id
ALTER TABLE public.special_task_submissions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Cập nhật user_id từ bảng profiles cho các bản ghi hiện có
UPDATE public.special_task_submissions s
SET user_id = p.id
FROM public.profiles p
WHERE s.email = p.email;

-- 3. Xóa cột email
ALTER TABLE public.special_task_submissions DROP COLUMN IF EXISTS email CASCADE;

-- 4. Tạo lại chính sách bảo mật mới dựa trên user_id
DROP POLICY IF EXISTS "Người dùng xem bài nộp của mình" ON public.special_task_submissions;
DROP POLICY IF EXISTS "Người dùng tạo bài nộp" ON public.special_task_submissions;

CREATE POLICY "Người dùng xem bài nộp của mình" ON public.special_task_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Người dùng tạo bài nộp" ON public.special_task_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
