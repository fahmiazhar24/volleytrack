"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";

export type AttendanceStatus = "present" | "late" | "excused" | "sick" | "absent";

export interface AttendanceItemInput {
  student_id: string;
  status: AttendanceStatus;
  note?: string;
}

export async function loadSessionAttendanceAction(
  classId: string,
  sessionDate: string
) {
  const supabase = await createClient();

  // Cari apakah sesi untuk kelas + tanggal ini sudah ada
  const { data: session } = await supabase
    .from("training_sessions")
    .select("id, topic, session_date")
    .eq("class_id", classId)
    .eq("session_date", sessionDate)
    .maybeSingle();

  if (!session) {
    return { sessionId: null, topic: "", records: [] };
  }

  const { data: records } = await supabase
    .from("attendances")
    .select("student_id, status, note")
    .eq("session_id", session.id);

  return {
    sessionId: session.id as string,
    topic: (session.topic as string) ?? "",
    records: (records ?? []) as AttendanceItemInput[],
  };
}

export async function saveAttendanceBatchAction(input: {
  classId: string;
  sessionDate: string;
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

  // 1. Cari atau buat sesi latihan
  let { data: session } = await supabase
    .from("training_sessions")
    .select("id")
    .eq("class_id", input.classId)
    .eq("session_date", input.sessionDate)
    .maybeSingle();

  if (!session) {
    const { data: newSession, error: sessionErr } = await supabase
      .from("training_sessions")
      .insert({
        class_id: input.classId,
        session_date: input.sessionDate,
        topic: input.topic?.trim() || "Latihan Rutin",
        coach_id: profile.id,
      })
      .select("id")
      .single();

    if (sessionErr || !newSession) {
      return { error: sessionErr?.message ?? "Gagal membuat sesi latihan." };
    }
    session = newSession;
  } else if (input.topic !== undefined) {
    await supabase
      .from("training_sessions")
      .update({ topic: input.topic.trim() || "Latihan Rutin" })
      .eq("id", session.id);
  }

  // 2. Simpan seluruh baris absensi sekaligus (upsert)
  const payload = input.records.map((r) => ({
    session_id: session!.id,
    student_id: r.student_id,
    status: r.status,
    note: r.note?.trim() || null,
    recorded_by: profile.id,
  }));

  if (payload.length > 0) {
    const { error: attErr } = await supabase
      .from("attendances")
      .upsert(payload, { onConflict: "session_id,student_id" });

    if (attErr) return { error: attErr.message };
  }

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { success: true, sessionId: session.id };
}