"use client";

import { useState } from "react";
import {
  ClipboardList,
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Archive,
  RotateCcw,
  Loader2,
  X,
  Check,
  Ruler,
} from "lucide-react";
import { toast } from "sonner";
import {
  createSkillCategoryAction,
  toggleSkillCategoryAction,
  saveSkillItemAction,
  toggleSkillItemAction,
  saveSkillRubricsAction,
} from "@/app/(app)/settings/rubric-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface RubricRow {
  id: string;
  skill_id: string;
  level: number;
  label: string | null;
  description: string | null;
  suggestion_template: string | null;
}

export interface SkillRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  has_raw_metric: boolean | null;
  raw_metric_unit: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

export interface SkillCategoryRow {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
}

interface RubricsManagerProps {
  categories: SkillCategoryRow[];
  skills: SkillRow[];
  rubrics: RubricRow[];
}

const DEFAULT_LEVEL_LABELS: Record<number, string> = {
  1: "Pemula",
  2: "Berkembang",
  3: "Cakap",
  4: "Mahir",
  5: "Unggul",
};

export function RubricsManager({
  categories,
  skills,
  rubrics,
}: RubricsManagerProps) {
  const [expandedCatId, setExpandedCatId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Form tambah/edit skill
  const [skillFormCatId, setSkillFormCatId] = useState<string | null>(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skillDesc, setSkillDesc] = useState("");
  const [hasRawMetric, setHasRawMetric] = useState(false);
  const [rawMetricUnit, setRawMetricUnit] = useState("");

  // Form edit rubrik 1-5 per skill
  const [rubricSkillId, setRubricSkillId] = useState<string | null>(null);
  const [rubricDrafts, setRubricDrafts] = useState<
    Array<{
      level: number;
      label: string;
      description: string;
      suggestion_template: string;
    }>
  >([]);

  function openNewSkillForm(categoryId: string) {
    setSkillFormCatId(categoryId);
    setEditingSkillId(null);
    setSkillName("");
    setSkillDesc("");
    setHasRawMetric(false);
    setRawMetricUnit("");
    setRubricSkillId(null);
  }

  function openEditSkillForm(skill: SkillRow) {
    setSkillFormCatId(skill.category_id);
    setEditingSkillId(skill.id);
    setSkillName(skill.name);
    setSkillDesc(skill.description ?? "");
    setHasRawMetric(Boolean(skill.has_raw_metric));
    setRawMetricUnit(skill.raw_metric_unit ?? "");
    setRubricSkillId(null);
  }

  function openRubricEditor(skill: SkillRow) {
    const existing = rubrics.filter((r) => r.skill_id === skill.id);
    const rows = [1, 2, 3, 4, 5].map((lvl) => {
      const found = existing.find((r) => r.level === lvl);
      return {
        level: lvl,
        label: found?.label || DEFAULT_LEVEL_LABELS[lvl],
        description: found?.description || "",
        suggestion_template: found?.suggestion_template || "",
      };
    });
    setRubricDrafts(rows);
    setRubricSkillId(skill.id);
    setSkillFormCatId(null);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setBusyKey("add-cat");
    const res = await createSkillCategoryAction({ name: newCatName });
    setBusyKey(null);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Kategori "${newCatName}" ditambahkan.`);
    setNewCatName("");
    setShowAddCat(false);
  }

  async function handleToggleCategory(cat: SkillCategoryRow) {
    const nextActive = !cat.is_active;
    setBusyKey(`cat-${cat.id}`);
    const res = await toggleSkillCategoryAction({
      id: cat.id,
      isActive: nextActive,
    });
    setBusyKey(null);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      nextActive
        ? `Kategori "${cat.name}" diaktifkan kembali.`
        : `Kategori "${cat.name}" diarsipkan.`
    );
  }

  async function handleSaveSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!skillFormCatId) return;
    setBusyKey("save-skill");
    const res = await saveSkillItemAction({
      id: editingSkillId ?? undefined,
      categoryId: skillFormCatId,
      name: skillName,
      description: skillDesc,
      hasRawMetric,
      rawMetricUnit,
    });
    setBusyKey(null);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      editingSkillId
        ? `Item skill "${skillName}" diperbarui.`
        : `Item skill "${skillName}" ditambahkan.`
    );
    setSkillFormCatId(null);
    setEditingSkillId(null);
  }

  async function handleToggleSkill(skill: SkillRow) {
    const nextActive = !skill.is_active;
    setBusyKey(`skill-${skill.id}`);
    const res = await toggleSkillItemAction({
      id: skill.id,
      isActive: nextActive,
    });
    setBusyKey(null);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      nextActive
        ? `Skill "${skill.name}" diaktifkan kembali.`
        : `Skill "${skill.name}" diarsipkan (data nilai lama tetap aman).`
    );
  }

  async function handleSaveRubrics(e: React.FormEvent) {
    e.preventDefault();
    if (!rubricSkillId) return;
    setBusyKey(`rubric-${rubricSkillId}`);
    const res = await saveSkillRubricsAction({
      skillId: rubricSkillId,
      rubrics: rubricDrafts,
    });
    setBusyKey(null);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Deskripsi rubrik skala 1–5 berhasil disimpan.");
    setRubricSkillId(null);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ClipboardList className="h-4 w-4 text-orange-500" />
              Master Kategori & Rubrik Skill ({categories.length} Kategori •{" "}
              {skills.length} Item)
            </h2>
            <p className="text-xs text-slate-500">
              Tambah, sunting, atau arsipkan item penilaian tanpa mengubah
              riwayat rapor periode sebelumnya.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddCat((v) => !v)}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {showAddCat ? (
              <>
                <X className="mr-1.5 h-4 w-4" />
                Batal
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah Kategori
              </>
            )}
          </Button>
        </div>

        {showAddCat && (
          <form
            onSubmit={handleAddCategory}
            className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50/40 p-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Nama Kategori Baru
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Teknik Servis, Fisik & Kelincahan, Mental Bertanding"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={busyKey === "add-cat"}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {busyKey === "add-cat" && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Simpan Kategori
            </Button>
          </form>
        )}

        <div className="space-y-2.5">
          {categories.map((cat) => {
            const catSkills = skills.filter((s) => s.category_id === cat.id);
            const activeCount = catSkills.filter((s) => s.is_active).length;
            const isExpanded = expandedCatId === cat.id;

            return (
              <div
                key={cat.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCatId(isExpanded ? null : cat.id)
                    }
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    )}
                    <span className="text-sm font-semibold text-slate-900">
                      {cat.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-normal"
                    >
                      {activeCount}/{catSkills.length} aktif
                    </Badge>
                    {!cat.is_active && (
                      <Badge className="bg-slate-200 text-[11px] text-slate-600 hover:bg-slate-200">
                        Diarsipkan
                      </Badge>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setExpandedCatId(cat.id);
                        openNewSkillForm(cat.id);
                      }}
                      className="h-8 text-xs"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Item Skill
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busyKey === `cat-${cat.id}`}
                      onClick={() => handleToggleCategory(cat)}
                      className="h-8 text-xs text-slate-600"
                    >
                      {cat.is_active ? (
                        <>
                          <Archive className="mr-1 h-3.5 w-3.5" />
                          Arsipkan
                        </>
                      ) : (
                        <>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Aktifkan
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="divide-y divide-slate-100 border-t border-slate-200">
                    {skillFormCatId === cat.id && (
                      <form
                        onSubmit={handleSaveSkill}
                        className="space-y-3 bg-orange-50/40 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-orange-800">
                            {editingSkillId
                              ? "Edit Item Skill"
                              : `Tambah Item Skill ke "${cat.name}"`}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSkillFormCatId(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">
                              Nama Item Skill
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Contoh: Jump Serve / Vertical Jump"
                              value={skillName}
                              onChange={(e) => setSkillName(e.target.value)}
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">
                              Deskripsi Singkat (Opsional)
                            </label>
                            <input
                              type="text"
                              placeholder="Fokus akurasi arah bola dan konsistensi"
                              value={skillDesc}
                              onChange={(e) => setSkillDesc(e.target.value)}
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <label className="flex items-center gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={hasRawMetric}
                              onChange={(e) =>
                                setHasRawMetric(e.target.checked)
                              }
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            Catat angka pengukuran fisik/kuantitatif (Raw Metric)
                          </label>
                          {hasRawMetric && (
                            <input
                              type="text"
                              placeholder="Satuan (mis. cm, detik, kali)"
                              value={rawMetricUnit}
                              onChange={(e) =>
                                setRawMetricUnit(e.target.value)
                              }
                              className="h-8 w-44 rounded-md border border-slate-200 bg-white px-2.5 text-xs"
                            />
                          )}
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSkillFormCatId(null)}
                          >
                            Batal
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={busyKey === "save-skill"}
                            className="bg-orange-500 text-white hover:bg-orange-600"
                          >
                            {busyKey === "save-skill" && (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            )}
                            Simpan Skill
                          </Button>
                        </div>
                      </form>
                    )}

                    {catSkills.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-500">
                        Belum ada item skill di kategori ini.
                      </p>
                    ) : (
                      catSkills.map((skill) => {
                        const isEditingRubric = rubricSkillId === skill.id;
                        return (
                          <div key={skill.id} className="p-4">
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`text-sm font-medium ${
                                      skill.is_active
                                        ? "text-slate-900"
                                        : "text-slate-400 line-through"
                                    }`}
                                  >
                                    {skill.name}
                                  </span>
                                  {skill.has_raw_metric && (
                                    <Badge
                                      variant="outline"
                                      className="gap-1 text-[10px] text-blue-700"
                                    >
                                      <Ruler className="h-2.5 w-2.5" />
                                      Metrik
                                      {skill.raw_metric_unit
                                        ? `: ${skill.raw_metric_unit}`
                                        : ""}
                                    </Badge>
                                  )}
                                  {!skill.is_active && (
                                    <Badge className="bg-slate-100 text-[10px] text-slate-500 hover:bg-slate-100">
                                      Arsip
                                    </Badge>
                                  )}
                                </div>
                                {skill.description && (
                                  <p className="text-xs text-slate-500">
                                    {skill.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditSkillForm(skill)}
                                  className="h-7 px-2.5 text-xs"
                                >
                                  <Pencil className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    isEditingRubric
                                      ? setRubricSkillId(null)
                                      : openRubricEditor(skill)
                                  }
                                  className="h-7 px-2.5 text-xs"
                                >
                                  Rubrik 1–5
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={busyKey === `skill-${skill.id}`}
                                  onClick={() => handleToggleSkill(skill)}
                                  className="h-7 px-2 text-xs text-slate-500"
                                >
                                  {skill.is_active ? "Arsipkan" : "Aktifkan"}
                                </Button>
                              </div>
                            </div>

                            {isEditingRubric && (
                              <form
                                onSubmit={handleSaveRubrics}
                                className="mt-3 space-y-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3"
                              >
                                <p className="text-xs font-semibold text-slate-700">
                                  Panduan Deskripsi Rubrik Skala 1–5 untuk{" "}
                                  {skill.name}
                                </p>
                                {rubricDrafts.map((row, idx) => (
                                  <div
                                    key={row.level}
                                    className="grid grid-cols-1 gap-2 sm:grid-cols-12"
                                  >
                                    <div className="flex items-center gap-1.5 sm:col-span-3">
                                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                                        {row.level}
                                      </span>
                                      <input
                                        type="text"
                                        value={row.label}
                                        onChange={(e) => {
                                          const copy = [...rubricDrafts];
                                          copy[idx] = {
                                            ...copy[idx],
                                            label: e.target.value,
                                          };
                                          setRubricDrafts(copy);
                                        }}
                                        placeholder="Label"
                                        className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      value={row.description}
                                      onChange={(e) => {
                                        const copy = [...rubricDrafts];
                                        copy[idx] = {
                                          ...copy[idx],
                                          description: e.target.value,
                                        };
                                        setRubricDrafts(copy);
                                      }}
                                      placeholder={`Kriteria pengamatan untuk skor ${row.level}`}
                                      className="h-8 rounded border border-slate-200 bg-white px-2.5 text-xs sm:col-span-5"
                                    />
                                    <input
                                      type="text"
                                      value={row.suggestion_template}
                                      onChange={(e) => {
                                        const copy = [...rubricDrafts];
                                        copy[idx] = {
                                          ...copy[idx],
                                          suggestion_template: e.target.value,
                                        };
                                        setRubricDrafts(copy);
                                      }}
                                      placeholder="Saran latihan (opsional)"
                                      className="h-8 rounded border border-slate-200 bg-white px-2.5 text-xs sm:col-span-4"
                                    />
                                  </div>
                                ))}

                                <div className="flex justify-end gap-2 pt-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setRubricSkillId(null)}
                                  >
                                    Tutup
                                  </Button>
                                  <Button
                                    type="submit"
                                    size="sm"
                                    disabled={busyKey === `rubric-${skill.id}`}
                                    className="bg-slate-900 text-white hover:bg-slate-800"
                                  >
                                    {busyKey === `rubric-${skill.id}` ? (
                                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Check className="mr-1.5 h-3.5 w-3.5" />
                                    )}
                                    Simpan Rubrik
                                  </Button>
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}