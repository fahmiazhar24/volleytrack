-- ============================================================================
-- VOLLEYTRACK - FASE 1: SEED DATA DEFAULT (4 KATEGORI, 19 ASPEK, RUBRIK 1-5)
-- ============================================================================

-- 1. Default Pengaturan Klub
INSERT INTO public.club_settings (club_name, primary_color, secondary_color, score_scale, head_coach_name)
SELECT 'VolleyTrack Academy', '#0f172a', '#f97316', '1-5', 'Head Coach'
WHERE NOT EXISTS (SELECT 1 FROM public.club_settings);

-- 2. Default Periode Evaluasi Awal
INSERT INTO public.periods (name, start_date, end_date, status)
SELECT 'Q4 2026 (Okt–Des)', '2026-10-01', '2026-12-31', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.periods);

-- 3. Seed Kategori, 19 Aspek, dan Rubrik Skala 1-5
DO $$
DECLARE
  v_cat_teknik UUID;
  v_cat_taktik UUID;
  v_cat_fisik UUID;
  v_cat_sikap UUID;
  v_skill_id UUID;
  rec RECORD;
BEGIN
  INSERT INTO public.skill_categories (name, sort_order) VALUES ('Teknik Dasar', 1)
    ON CONFLICT (name) DO UPDATE SET sort_order = 1 RETURNING id INTO v_cat_teknik;
  INSERT INTO public.skill_categories (name, sort_order) VALUES ('Taktik', 2)
    ON CONFLICT (name) DO UPDATE SET sort_order = 2 RETURNING id INTO v_cat_taktik;
  INSERT INTO public.skill_categories (name, sort_order) VALUES ('Fisik', 3)
    ON CONFLICT (name) DO UPDATE SET sort_order = 3 RETURNING id INTO v_cat_fisik;
  INSERT INTO public.skill_categories (name, sort_order) VALUES ('Sikap', 4)
    ON CONFLICT (name) DO UPDATE SET sort_order = 4 RETURNING id INTO v_cat_sikap;

  -- Hanya isi skills jika tabel masih kosong agar aman dijalankan ulang
  IF NOT EXISTS (SELECT 1 FROM public.skills) THEN
    -- Teknik Dasar (7 Aspek)
    INSERT INTO public.skills (category_id, name, description, has_raw_metric, raw_metric_unit, sort_order) VALUES
      (v_cat_teknik, 'Passing Bawah', 'Kontrol platform lengan, sudut pantulan, dan akurasi arah bola', TRUE, 'sukses/10 bola', 1),
      (v_cat_teknik, 'Passing Atas', 'Sentuhan jari, dorongan siku-lutut, dan kontrol arah bola tinggi', TRUE, 'sukses/10 bola', 2),
      (v_cat_teknik, 'Servis', 'Konsistensi menyeberangkan bola dan penempatan ke area target', TRUE, 'masuk/10 servis', 3),
      (v_cat_teknik, 'Set-Up / Umpan', 'Ketepatan tinggi dan jarak umpan untuk mempermudah serangan', FALSE, NULL, 4),
      (v_cat_teknik, 'Spike / Smash', 'Langkah awalan (approach), timing lompatan, dan ayunan pukulan', FALSE, NULL, 5),
      (v_cat_teknik, 'Block', 'Timing lompatan di depan net, posisi tangan, dan penutupan sudut', FALSE, NULL, 6),
      (v_cat_teknik, 'Defense / Dig', 'Kesiapan kuda-kuda rendah dan refleks menyelamatkan bola serangan', FALSE, NULL, 7);

    -- Taktik (4 Aspek)
    INSERT INTO public.skills (category_id, name, description, sort_order) VALUES
      (v_cat_taktik, 'Game Sense', 'Membaca arah permainan lawan dan mengambil keputusan cepat', 1),
      (v_cat_taktik, 'Penempatan Posisi', 'Berada di titik cover dan pertahanan yang tepat sesuai situasi', 2),
      (v_cat_taktik, 'Komunikasi di Lapangan', 'Aktif memanggil bola dan memberi instruksi positif ke rekan tim', 3),
      (v_cat_taktik, 'Pemahaman Rotasi', 'Memahami urutan rotasi servis dan perpindahan posisi tanpa bingung', 4);

    -- Fisik (4 Aspek)
    INSERT INTO public.skills (category_id, name, description, has_raw_metric, raw_metric_unit, sort_order) VALUES
      (v_cat_fisik, 'Kekuatan', 'Kekuatan otot inti, lengan, dan tungkai saat melakukan teknik', FALSE, NULL, 1),
      (v_cat_fisik, 'Kelincahan', 'Kecepatan perubahan arah gerak dan footwork di lapangan', FALSE, NULL, 2),
      (v_cat_fisik, 'Daya Ledak (Lompatan)', 'Tinggi lompatan vertikal saat smash dan block', TRUE, 'cm', 3),
      (v_cat_fisik, 'Daya Tahan', 'Stamina menjaga kualitas gerak dari awal hingga akhir sesi', FALSE, NULL, 4);

    -- Sikap (4 Aspek)
    INSERT INTO public.skills (category_id, name, description, sort_order) VALUES
      (v_cat_sikap, 'Disiplin', 'Ketepatan waktu hadir, mengikuti instruksi, dan fokus saat drill', 1),
      (v_cat_sikap, 'Kerja Sama Tim', 'Saling mendukung rekan dan tidak menyalahkan saat terjadi error', 2),
      (v_cat_sikap, 'Semangat Belajar', 'Antusias menerima koreksi coach dan mau mencoba hal baru', 3),
      (v_cat_sikap, 'Sportivitas', 'Menghargai lawan, wasit, coach, dan aturan permainan', 4);

    -- Generate Rubrik Standar 1-5 + Template Saran untuk setiap aspek
    FOR rec IN SELECT id, name FROM public.skills LOOP
      INSERT INTO public.skill_rubrics (skill_id, level, label, description, suggestion_template) VALUES
        (rec.id, 1, 'Perlu Bimbingan',
         'Belum menguasai dasar ' || rec.name || ' dan masih membutuhkan arahan langsung di setiap repetisi.',
         'Fokus melatih gerakan dasar ' || rec.name || ' secara perlahan dan berulang (10–15 menit di rumah atau sebelum sesi).'),
        (rec.id, 2, 'Mulai Berkembang',
         'Kadang sudah tepat pada ' || rec.name || ', namun masih belum stabil saat tempo latihan meningkat.',
         'Tingkatkan konsistensi ' || rec.name || ' dengan latihan drill berpasangan dan perhatikan postur dasar.'),
        (rec.id, 3, 'Cukup Konsisten',
         'Mampu melakukan ' || rec.name || ' dengan cukup baik dan terkontrol dalam situasi drill standar.',
         'Pertahankan konsistensi ' || rec.name || ' dan mulai biasakan menerapkannya dalam simulasi game.'),
        (rec.id, 4, 'Baik & Konsisten',
         'Konsisten dan akurat dalam ' || rec.name || ' baik saat drill maupun permainan antar tim.',
         'Asah variasi dan akurasi ' || rec.name || ' di bawah tekanan tempo permainan yang lebih cepat.'),
        (rec.id, 5, 'Sangat Baik',
         'Sangat konsisten, percaya diri, dan mampu menjadi contoh pada aspek ' || rec.name || ' dalam tekanan pertandingan.',
         'Pertahankan keunggulan pada ' || rec.name || ' dan bantu rekan satu tim mengangkat ritme permainan.');
    END LOOP;

    -- Khusus Passing Bawah, sesuaikan persis dengan contoh rubrik dokumen rancangan
    SELECT id INTO v_skill_id FROM public.skills WHERE name = 'Passing Bawah' LIMIT 1;
    IF v_skill_id IS NOT NULL THEN
      UPDATE public.skill_rubrics SET description = 'Belum bisa mengontrol arah bola.' WHERE skill_id = v_skill_id AND level = 1;
      UPDATE public.skill_rubrics SET description = 'Kadang terkontrol, arah pantulan masih sering melebar.' WHERE skill_id = v_skill_id AND level = 2;
      UPDATE public.skill_rubrics SET description = 'Cukup konsisten mengarahkan bola ke target dalam drill.' WHERE skill_id = v_skill_id AND level = 3;
      UPDATE public.skill_rubrics SET description = 'Konsisten dan akurat mengarahkan bola ke pengumpan.' WHERE skill_id = v_skill_id AND level = 4;
      UPDATE public.skill_rubrics SET description = 'Sangat konsisten dan tenang di bawah tekanan permainan.' WHERE skill_id = v_skill_id AND level = 5;
    END IF;
  END IF;
END $$;