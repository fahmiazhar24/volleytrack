"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";

export type AttendanceStatus = "hadir" | "izin" | "sakit" | "alpa";

export interface AttendanceItemInput {
  student_id: string;
  status: AttendanceStatus;
  notes?: string;
}

export async function loadSessionAttendanceAction(
  classId: string,
  sessionDate: string
) {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, topic, start_time, session_date")
    .eq("class_id", classId)
    .eq("session_date", sessionDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return { sessionId: null, topic: "", startTime: "16:00", records: [] };
  }

  const { data: records } = await supabase
    .from("attendance")
    .select("student_id, status, notes")
    .eq("session_id", session.id);

  return {
    sessionId: session.id as string,
    topic: (session.topic as string) ?? "",
    startTime: session.start_time ? String(session.start_time).slice(0, 5) : "16:00",
    records: (records ?? []).map((r) => ({
      student_id: r.student_id,
      status: r.status as AttendanceStatus,
      notes: r.notes ?? "",
    })),
  };
}

export async function saveAttendanceBatchAction(input: {
  classId: string;
  sessionDate: string;
  startTime?: string;
  topic?: string;
  records: AttendanceItemInput[];
}) {
  const profile = await getCurrentUserProfile();
  if (!profile || !["admin", "coach"].includes(profile.role)) {
    return { error: "Hanya Coach atau Admin yang dapat menyimpan absensi." };
  }

  if (!input.classId || !input.sessionDate) {
    return { error: "Kelas dan tanggal sesi wajib dipilih." };
  }

  const supabase = await createClient();
  const formattedStart = input.startTime?.trim() || "16:00";

  // 1. Cari atau buat sesi latihan di public.sessions
  let { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("class_id", input.classId)
    .eq("session_date", input.sessionDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    const { data: newSession, error: sessionErr } = await supabase
      .from("sessions")
      .insert({
        class_id: input.classId,
        session_date: input.sessionDate,
        start_time: formattedStart,
        status: "completed",
        topic: input.topic?.trim() || "Latihan Rutin",
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (sessionErr || !newSession) {
      return { error: sessionErr?.message ?? "Gagal membuat sesi latihan." };
    }
    session = newSession;
  } else {
    await supabase
      .from("sessions")
      .update({
        start_time: formattedStart,
        status: "completed",
        topic: input.topic?.trim() || "Latihan Rutin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
  }

  // 2. Simpan seluruh baris absensi ke public.attendance
  const payload = input.records.map((r) => ({
    session_id: session!.id,
    student_id: r.student_id,
    status: r.status,
    notes: r.notes?.trim() || null,
    recorded_by: profile.id,
    updated_at: new Date().toISOString(),
  }));

  if (payload.length > 0) {
    const { error: attErr } = await supabase
      .from("attendance")
      .upsert(payload, { onConflict: "session_id,student_id" });

    if (attErr) return { error: attErr.message };
  }

  revalidatePath("/attendance");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return { success: true, sessionId: session.id };
}