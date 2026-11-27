"use client";

import { useState } from "react";
import { Award, RotateCcw, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PREDICATE_RULES,
  normalizePredicateRules,
  type PredicateRule,
} from "@/lib/scoring";
import { updatePredicateRulesAction } from "@/app/(app)/settings/predicate-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface PredicateRulesManagerProps {
  settingsId: string;
  initialRules: unknown;
}

const BADGE_STYLES: Record<PredicateRule["color"], string> = {
  emerald: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  blue: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  amber: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  orange: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  slate: "bg-slate-100 text-slate-700 hover:bg-slate-100",
};

export function PredicateRulesManager({
  settingsId,
  initialRules,
}: PredicateRulesManagerProps) {
  const [rules, setRules] = useState<PredicateRule[]>(() =>
    normalizePredicateRules(initialRules)
  );
  const [saving, setSaving] = useState(false);

  function updateField(
    index: number,
    field: "label_id" | "label_en" | "min_score",
    value: string
  ) {
    setRules((prev) => {
      const next = [...prev];
      if (field === "min_score") {
        next[index] = {
          ...next[index],
          min_score: value === "" ? 0 : parseFloat(value),
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  }

  function handleResetDefault() {
    setRules(DEFAULT_PREDICATE_RULES.map((r) => ({ ...r })));
    toast.info(
      "Nilai dikembalikan ke standar bawaan. Klik Simpan Predikat untuk menerapkan."
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await updatePredicateRulesAction({ settingsId, rules });
    setSaving(false);

    if (res?.error) {
      toast.error(res.error);
      return;
    }

    toast.success("Aturan batas nilai & label predikat berhasil disimpan!");
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Award className="h-4 w-4 text-orange-500" />
              Batas Nilai & Label Predikat Rapor
            </h2>
            <p className="text-xs text-slate-500">
              Sesuaikan istilah predikat dan batas minimal skor (skala 1–5).
              Perubahan berlaku untuk penerbitan rapor baru dan tidak mengubah
              rapor yang sudah terbit.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleResetDefault}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset Standar
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="hidden grid-cols-12 gap-3 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:grid">
              <div className="col-span-2">Tingkat</div>
              <div className="col-span-3">Label (Indonesia)</div>
              <div className="col-span-3">Label (Inggris)</div>
              <div className="col-span-2">Min. Skala 1–5</div>
              <div className="col-span-2">Setara 1–100</div>
            </div>

            <div className="divide-y divide-slate-100">
              {rules.map((rule, idx) => {
                const isLowest = idx === rules.length - 1;
                const prevThreshold = idx > 0 ? rules[idx - 1].min_score : 5;
                const eq100 = Math.round((rule.min_score || 0) * 20);
                const prevEq100 = Math.round((prevThreshold || 0) * 20);

                return (
                  <div
                    key={rule.key}
                    className="grid grid-cols-1 items-center gap-3 p-3.5 sm:grid-cols-12"
                  >
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Badge className={BADGE_STYLES[rule.color]}>
                        {rule.label_id || `Level ${5 - idx}`}
                      </Badge>
                    </div>

                    <div className="space-y-1 sm:col-span-3">
                      <label className="text-[11px] font-medium text-slate-500 sm:hidden">
                        Label (Indonesia)
                      </label>
                      <input
                        type="text"
                        required
                        value={rule.label_id}
                        onChange={(e) =>
                          updateField(idx, "label_id", e.target.value)
                        }
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-3">
                      <label className="text-[11px] font-medium text-slate-500 sm:hidden">
                        Label (Inggris)
                      </label>
                      <input
                        type="text"
                        required
                        value={rule.label_en}
                        onChange={(e) =>
                          updateField(idx, "label_en", e.target.value)
                        }
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-medium text-slate-500 sm:hidden">
                        Min. Skala 1–5
                      </label>
                      {isLowest ? (
                        <div className="flex h-9 items-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-500">
                          Di bawah {prevThreshold.toFixed(2)}
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="5"
                          required
                          value={rule.min_score}
                          onChange={(e) =>
                            updateField(idx, "min_score", e.target.value)
                          }
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm font-medium"
                        />
                      )}
                    </div>

                    <div className="text-xs font-medium text-slate-600 sm:col-span-2">
                      {isLowest
                        ? `Di bawah ${prevEq100}`
                        : `Minimal ${eq100} / 100`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Simpan Pengaturan Predikat
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}