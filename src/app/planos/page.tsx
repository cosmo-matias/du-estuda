"use client";

import { useState, useEffect } from "react";
import { Plus, BookOpen, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubjectCard } from "@/components/planos/SubjectCard";
import { getSubjects, addSubject, updateSubject, deleteSubject } from "@/services/planService";
import type { Subject } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ID provisório até implementarmos a seleção de múltiplos planos */
const PLAN_ID = "plano-padrao-123";

/** Paleta de cores pré-definidas para seleção de disciplina */
const COLOR_OPTIONS = [
  { label: "Esmeralda",  value: "#10b981" },
  { label: "Azul",       value: "#3b82f6" },
  { label: "Âmbar",      value: "#f59e0b" },
  { label: "Rosa",       value: "#ec4899" },
  { label: "Violeta",    value: "#8b5cf6" },
  { label: "Vermelho",   value: "#ef4444" },
  { label: "Ciano",      value: "#06b6d4" },
  { label: "Laranja",    value: "#f97316" },
] as const;

const DEFAULT_COLOR = COLOR_OPTIONS[0].value;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PlanosPage() {
  const [subjects, setSubjects]       = useState<Subject[]>([]);
  const [loading, setLoading]         = useState(true);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const { user }                      = useAuth();

  // Form state
  const [newTitle, setNewTitle]       = useState("");
  const [newColor, setNewColor]       = useState<string>(DEFAULT_COLOR);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState("");

  // Edit / Delete state
  const [editDialogOpen, setEditDialogOpen]     = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject]   = useState<Subject | null>(null);
  
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState<string>(DEFAULT_COLOR);
  const [isDeleting, setIsDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch subjects on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchSubjects() {
      if (!user) return;
      try {
        setLoading(true);
        const data = await getSubjects(user.uid, PLAN_ID);
        if (!cancelled) setSubjects(data);
      } catch (err) {
        console.error("Erro ao buscar disciplinas:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSubjects();
    return () => { cancelled = true; };
  }, [user]);

  // -------------------------------------------------------------------------
  // Open / close dialog helpers
  // -------------------------------------------------------------------------
  function openDialog() {
    setNewTitle("");
    setNewColor(DEFAULT_COLOR);
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  // -------------------------------------------------------------------------
  // Save new subject
  // -------------------------------------------------------------------------
  async function handleSave() {
    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle) {
      setFormError("O nome da disciplina é obrigatório.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const created = await addSubject({
        planId: PLAN_ID,
        userId: user!.uid,
        title:  trimmedTitle,
        color:  newColor,
      });

      // Optimistic update — append to local state immediately
      setSubjects((prev) => [...prev, created]);
      closeDialog();
    } catch (err) {
      console.error("Erro ao salvar disciplina:", err);
      setFormError("Ocorreu um erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Handlers for Edit and Delete
  // -------------------------------------------------------------------------
  function openEditDialog(subject: Subject) {
    setSelectedSubject(subject);
    setEditTitle(subject.title);
    setEditColor(subject.color || DEFAULT_COLOR);
    setFormError("");
    setEditDialogOpen(true);
  }

  async function handleEdit() {
    if (!selectedSubject) return;
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setFormError("O nome da disciplina é obrigatório.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      await updateSubject(selectedSubject.id, { title: trimmedTitle, color: editColor });
      
      setSubjects((prev) =>
        prev.map((s) => (s.id === selectedSubject.id ? { ...s, title: trimmedTitle, color: editColor } : s))
      );
      setEditDialogOpen(false);
    } catch (err) {
      console.error("Erro ao editar disciplina:", err);
      setFormError("Ocorreu um erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(subject: Subject) {
    setSelectedSubject(subject);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!selectedSubject) return;
    try {
      setIsDeleting(true);
      await deleteSubject(selectedSubject.id);
      setSubjects((prev) => prev.filter((s) => s.id !== selectedSubject.id));
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error("Erro ao excluir disciplina:", err);
    } finally {
      setIsDeleting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <BookOpen className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Projeto Interdisciplinar
            </h1>
            <p className="text-sm text-slate-500">
              {loading
                ? "Carregando..."
                : `${subjects.length} disciplina${subjects.length !== 1 ? "s" : ""} cadastrada${subjects.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <Button
          id="btn-nova-disciplina"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={openDialog}
        >
          <Plus className="h-4 w-4" />
          Nova Disciplina
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Loading state                                                       */}
      {/* ------------------------------------------------------------------ */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Empty state                                                         */}
      {/* ------------------------------------------------------------------ */}
      {!loading && subjects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            Nenhuma disciplina cadastrada ainda.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Clique em &quot;Nova Disciplina&quot; para começar.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Subjects grid                                                       */}
      {/* ------------------------------------------------------------------ */}
      {!loading && subjects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="relative group">
              <SubjectCard subject={subject} />
              
              {/* Floating action buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 focus-within:opacity-100">
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm border" 
                  onClick={() => openEditDialog(subject)}
                  title="Editar Disciplina"
                >
                  <Pencil className="w-4 h-4 text-slate-600" />
                </Button>
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-8 w-8 shadow-sm" 
                  onClick={() => openDeleteDialog(subject)}
                  title="Excluir Disciplina"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* "Nova Disciplina" Dialog                                            */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Disciplina</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title input */}
            <div className="space-y-1.5">
              <label
                htmlFor="input-subject-title"
                className="text-sm font-medium text-slate-700"
              >
                Nome da Disciplina
              </label>
              <Input
                id="input-subject-title"
                placeholder="Ex: Direito Constitucional"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (formError) setFormError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              {formError && (
                <p className="text-xs text-red-500">{formError}</p>
              )}
            </div>

            {/* Color select */}
            <div className="space-y-1.5">
              <label
                htmlFor="select-subject-color"
                className="text-sm font-medium text-slate-700"
              >
                Cor de Identificação
              </label>
              <Select
                value={newColor}
                onValueChange={(val) => val && setNewColor(val as string)}
              >
                <SelectTrigger id="select-subject-color" className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: newColor }}
                      />
                      <span>
                        {COLOR_OPTIONS.find((c) => c.value === newColor)?.label}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: option.value }}
                        />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Color preview strip */}
              <div
                className="h-2 w-full rounded-full transition-colors"
                style={{ backgroundColor: newColor }}
                aria-hidden="true"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button
              id="btn-save-subject"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Disciplina"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Edit Subject Dialog                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Disciplina</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="input-edit-title" className="text-sm font-medium text-slate-700">
                Nome da Disciplina
              </label>
              <Input
                id="input-edit-title"
                placeholder="Ex: Direito Constitucional"
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  if (formError) setFormError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                autoFocus
              />
              {formError && <p className="text-xs text-red-500">{formError}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="select-edit-color" className="text-sm font-medium text-slate-700">
                Cor de Identificação
              </label>
              <Select value={editColor} onValueChange={(val) => val && setEditColor(val as string)}>
                <SelectTrigger id="select-edit-color" className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: editColor }} />
                      <span>{COLOR_OPTIONS.find((c) => c.value === editColor)?.label || "Personalizada"}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: option.value }} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="h-2 w-full rounded-full transition-colors" style={{ backgroundColor: editColor }} aria-hidden="true" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleEdit} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Delete Confirmation Dialog                                          */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Disciplina</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir a disciplina <strong>{selectedSubject?.title}</strong>? Esta ação não pode ser desfeita e removerá os tópicos associados.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</> : "Sim, Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
