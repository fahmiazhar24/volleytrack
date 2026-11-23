-- ============================================================================
-- VOLLEYTRACK - FASE 1: SKEMA DATABASE & ROW LEVEL SECURITY (RLS)
-- Author: Fahmi Azhar Iskandar
-- ============================================================================

-- 1. FUNGSI UTILITAS UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. TABEL PENGATURAN KLUB & PROFIL PENGGUNA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.club_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name TEXT NOT NULL DEFAULT 'Klub Voli VolleyTrack',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#0f172a',
  secondary_color TEXT NOT NULL DEFAULT '#f97316',
  score_scale TEXT NOT NULL DEFAULT '1-5' CHECK (score_scale IN ('1-5', '1-100')),
  count_izin_as_present BOOLEAN NOT NULL DEFAULT FALSE,
  count_sakit_as_present BOOLEAN NOT NULL DEFAULT FALSE,
  head_coach_name TEXT NOT NULL DEFAULT 'Head Coach',
  head_coach_signature_url TEXT,
  report_language TEXT NOT NULL DEFAULT 'id' CHECK (report_language IN ('id', 'en', 'both')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'coach', 'parent')),
  phone_wa TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger otomatis buat profil saat user baru dibuat di Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'parent');
  IF v_role NOT IN ('admin', 'coach', 'parent') THEN
    v_role := 'parent';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, phone_wa)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'User'), '@', 1)),
    v_role,
    NEW.raw_user_meta_data->>'phone_wa'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. TABEL MASTER: SISWA, ORANGTUA, KELAS & JADWAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  photo_path TEXT, -- path di private bucket 'student-photos'
  position TEXT DEFAULT 'All-Round', -- Setter, Outside Hitter, Opposite, Middle Blocker, Libero
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- soft delete
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone_wa TEXT NOT NULL,
  email TEXT,
  relationship TEXT DEFAULT 'Orangtua',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_guardians (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT NOT NULL, -- Pemula, Menengah, Lanjutan, U-12, U-15, dll
  description TEXT,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Format JSON jadwal rutin: [{"day": 2, "start": "16:00", "end": "18:00"}] (0=Min..6=Sab)
  routine_schedules JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabel tambahan jika 1 kelas memiliki lebih dari 1 asisten coach
CREATE TABLE IF NOT EXISTS public.class_assistants (
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, coach_id)
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. TABEL OPERASIONAL: SESI LATIHAN & ABSENSI
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  topic TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir', 'izin', 'sakit', 'alpa')),
  notes TEXT, -- contoh: cedera engkel ringan
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);

-- ============================================================================
-- 5. TABEL PENILAIAN, RUBRIK, EVALUASI & RAPOR DIGITAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- contoh: Q1 2026 (Jan-Mar)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  applicable_levels TEXT[], -- NULL berarti berlaku untuk semua level
  has_raw_metric BOOLEAN NOT NULL DEFAULT FALSE,
  raw_metric_unit TEXT, -- contoh: "sukses/10 bola" atau "cm"
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.skill_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  level INT NOT NULL CHECK (level BETWEEN 1 AND 5),
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  suggestion_template TEXT, -- untuk fitur Auto-Draft saran latihan
  UNIQUE (skill_id, level)
);

CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  assessor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, period_id)
);

CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  raw_value NUMERIC(8,2),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  strengths TEXT, -- Ringkasan perkembangan / kekuatan
  areas_to_improve TEXT, -- Area yang perlu ditingkatkan
  training_advice TEXT, -- Saran latihan di klub & rumah
  next_target TEXT, -- Target periode berikutnya
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, period_id)
);

CREATE TABLE IF NOT EXISTS public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  access_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  snapshot_data JSONB NOT NULL, -- Kunci seluruh data rapor saat publikasi (immutable)
  pdf_path TEXT, -- path di private bucket 'report-pdfs'
  is_latest BOOLEAN NOT NULL DEFAULT TRUE,
  revision_note TEXT,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (evaluation_id, version)
);

-- ============================================================================
-- 6. INDEKS PERFORMA
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.enrollments(class_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_class_date ON public.sessions(class_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_period ON public.assessments(period_id, student_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_period_status ON public.evaluations(period_id, status);
CREATE INDEX IF NOT EXISTS idx_report_cards_student ON public.report_cards(student_id, period_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_token ON public.report_cards(access_token);

-- ============================================================================
-- 7. FUNGSI HELPER RLS (SECURITY DEFINER - ANTI RECURSION)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_my_role() = 'admin', FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_coach_of_class(p_class_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = p_class_id AND c.coach_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.class_assistants ca
      WHERE ca.class_id = p_class_id AND ca.coach_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_coach_of_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = p_student_id
        AND e.is_active = TRUE
        AND public.is_coach_of_class(e.class_id)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_guardian_of_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_guardians sg
    JOIN public.guardians g ON g.id = sg.guardian_id
    WHERE sg.student_id = p_student_id
      AND g.user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 8. AKTIFKAN RLS & KEBIJAKAN AKSES PER BARIS DATA
-- ============================================================================

ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

-- club_settings: semua user login bisa baca, hanya admin bisa ubah
CREATE POLICY "club_settings_read" ON public.club_settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "club_settings_admin" ON public.club_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- profiles: lihat profil sendiri atau admin/coach melihat daftar
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.get_my_role() IN ('admin', 'coach'));
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

-- students: admin semua, coach hanya siswa di kelasnya, orangtua hanya anaknya sendiri
CREATE POLICY "students_select" ON public.students FOR SELECT TO authenticated
  USING (public.is_coach_of_student(id) OR public.is_guardian_of_student(id));
CREATE POLICY "students_admin_write" ON public.students FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- guardians & student_guardians
CREATE POLICY "guardians_select" ON public.guardians FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid() OR public.get_my_role() = 'coach');
CREATE POLICY "guardians_admin_write" ON public.guardians FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "student_guardians_select" ON public.student_guardians FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_coach_of_student(student_id) OR public.is_guardian_of_student(student_id));
CREATE POLICY "student_guardians_admin_write" ON public.student_guardians FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- classes & class_assistants & enrollments
CREATE POLICY "classes_select" ON public.classes FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_coach_of_class(id) OR EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.class_id = classes.id AND public.is_guardian_of_student(e.student_id)
  ));
CREATE POLICY "classes_admin_write" ON public.classes FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "class_assistants_select" ON public.class_assistants FOR SELECT TO authenticated
  USING (public.is_admin() OR coach_id = auth.uid());
CREATE POLICY "class_assistants_admin_write" ON public.class_assistants FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "enrollments_select" ON public.enrollments FOR SELECT TO authenticated
  USING (public.is_coach_of_class(class_id) OR public.is_guardian_of_student(student_id));
CREATE POLICY "enrollments_admin_write" ON public.enrollments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- sessions: coach bisa kelola sesi untuk kelas yang ditugaskan
CREATE POLICY "sessions_select" ON public.sessions FOR SELECT TO authenticated
  USING (public.is_coach_of_class(class_id) OR EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.class_id = sessions.class_id AND public.is_guardian_of_student(e.student_id)
  ));
CREATE POLICY "sessions_coach_write" ON public.sessions FOR ALL TO authenticated
  USING (public.is_coach_of_class(class_id)) WITH CHECK (public.is_coach_of_class(class_id));

-- attendance: coach kelas terkait boleh baca/tulis, orangtua baca milik anaknya
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT TO authenticated
  USING (public.is_coach_of_student(student_id) OR public.is_guardian_of_student(student_id));
CREATE POLICY "attendance_coach_write" ON public.attendance FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND public.is_coach_of_class(s.class_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND public.is_coach_of_class(s.class_id)));

-- periods, skill_categories, skills, skill_rubrics: baca semua login, tulis hanya admin
CREATE POLICY "periods_read" ON public.periods FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "periods_admin" ON public.periods FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "skill_categories_read" ON public.skill_categories FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "skill_categories_admin" ON public.skill_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "skills_read" ON public.skills FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "skills_admin" ON public.skills FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "skill_rubrics_read" ON public.skill_rubrics FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "skill_rubrics_admin" ON public.skill_rubrics FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- assessments & assessment_scores
CREATE POLICY "assessments_coach_all" ON public.assessments FOR ALL TO authenticated
  USING (public.is_coach_of_student(student_id)) WITH CHECK (public.is_coach_of_student(student_id));
CREATE POLICY "assessments_parent_read" ON public.assessments FOR SELECT TO authenticated
  USING (public.is_guardian_of_student(student_id) AND EXISTS (
    SELECT 1 FROM public.evaluations ev WHERE ev.student_id = assessments.student_id AND ev.period_id = assessments.period_id AND ev.status = 'published'
  ));

CREATE POLICY "assessment_scores_coach_all" ON public.assessment_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.is_coach_of_student(a.student_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.is_coach_of_student(a.student_id)));
CREATE POLICY "assessment_scores_parent_read" ON public.assessment_scores FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.evaluations ev ON ev.student_id = a.student_id AND ev.period_id = a.period_id
    WHERE a.id = assessment_id AND public.is_guardian_of_student(a.student_id) AND ev.status = 'published'
  ));

-- evaluations: orangtua HANYA lihat yang status = 'published'; coach tidak bisa ubah jika sudah 'published'
CREATE POLICY "evaluations_select" ON public.evaluations FOR SELECT TO authenticated
  USING (public.is_coach_of_student(student_id) OR (public.is_guardian_of_student(student_id) AND status = 'published'));
CREATE POLICY "evaluations_coach_insert" ON public.evaluations FOR INSERT TO authenticated
  WITH CHECK (public.is_coach_of_student(student_id) AND (public.is_admin() OR status IN ('draft', 'review')));
CREATE POLICY "evaluations_coach_update" ON public.evaluations FOR UPDATE TO authenticated
  USING (public.is_admin() OR (public.is_coach_of_student(student_id) AND status <> 'published'))
  WITH CHECK (public.is_admin() OR (public.is_coach_of_student(student_id) AND status IN ('draft', 'review')));
CREATE POLICY "evaluations_admin_delete" ON public.evaluations FOR DELETE TO authenticated
  USING (public.is_admin());

-- report_cards: hanya admin yang menerbitkan; coach & orangtua hanya baca sesuai haknya
CREATE POLICY "report_cards_select" ON public.report_cards FOR SELECT TO authenticated
  USING (public.is_coach_of_student(student_id) OR public.is_guardian_of_student(student_id));
CREATE POLICY "report_cards_admin_write" ON public.report_cards FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 9. STORAGE BUCKETS (PRIVASI FOTO ANAK & PDF)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('club-assets', 'club-assets', TRUE),
  ('student-photos', 'student-photos', FALSE),
  ('report-pdfs', 'report-pdfs', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "club_assets_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'club-assets');
CREATE POLICY "club_assets_admin_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'club-assets' AND public.is_admin()) WITH CHECK (bucket_id = 'club-assets' AND public.is_admin());

CREATE POLICY "student_photos_staff_access" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'student-photos' AND public.get_my_role() IN ('admin', 'coach'))
  WITH CHECK (bucket_id = 'student-photos' AND public.get_my_role() IN ('admin', 'coach'));

CREATE POLICY "report_pdfs_admin_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'report-pdfs' AND public.is_admin()) WITH CHECK (bucket_id = 'report-pdfs' AND public.is_admin());