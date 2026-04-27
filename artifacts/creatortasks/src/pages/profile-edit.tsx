import { useState, useRef, useEffect, useCallback } from "react";
import { useClerk } from "@clerk/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@clerk/react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useMyProfile,
  useUpdateProfile,
  useAddPortfolioItem,
  useDeletePortfolioItem,
  useReorderPortfolio,
  useMyExperience,
  useCreateExperience,
  useUpdateExperience,
  useDeleteExperience,
  useReorderExperience,
  useMyEducation,
  useCreateEducation,
  useUpdateEducation,
  useDeleteEducation,
  useReorderEducation,
} from "@/hooks/use-profile";
import type { ExperienceEntry, EducationEntry, PortfolioItem } from "@/hooks/use-profile";
import { ArrowLeft, Camera, Plus, Instagram, Youtube, Link as LinkIcon, CreditCard, Upload, Trash2, CheckCircle2, AlertCircle, Pencil, Briefcase, GraduationCap, MapPin, Calendar, GripVertical, ImageOff } from "lucide-react";
import { Link } from "wouter";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function avatarUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  if (objectPath.startsWith("data:") || objectPath.startsWith("http://") || objectPath.startsWith("https://")) {
    return objectPath;
  }
  return `${API_BASE}/api/storage${objectPath}`;
}

function portfolioImageUrl(objectPath: string): string {
  if (objectPath.startsWith("http://") || objectPath.startsWith("https://")) {
    return objectPath;
  }
  return `${API_BASE}/api/storage${objectPath}`;
}

async function uploadFileToStorage(
  file: File,
  getToken: () => Promise<string | null>,
  purpose?: "avatar" | "portfolio",
): Promise<string> {
  const token = await getToken();
  const formData = new FormData();
  formData.append("file", file);
  if (purpose) formData.append("purpose", purpose);

  const res = await fetch(`${API_BASE}/api/storage/uploads/file`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to upload file");
  }
  const { objectPath } = await res.json();
  return objectPath as string;
}

const FIXED_SKILLS = [
  "reels", "hooks", "thumbnails", "video editing",
  "graphic design", "copywriting", "other",
];

function displaySkill(skill: string): string {
  return skill
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function SortableExpItem({
  entry,
  onEdit,
  onDelete,
}: {
  entry: ExperienceEntry;
  onEdit: (e: ExperienceEntry) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-border bg-muted/20 p-3 flex items-start gap-2">
      <button type="button" {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing touch-none p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0">
        <GripVertical size={14} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{entry.jobTitle}</p>
        <p className="text-xs text-muted-foreground truncate">{entry.company}{entry.location ? ` · ${entry.location}` : ""}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          {entry.startDate} — {entry.isCurrent ? "Present" : (entry.endDate ?? "—")}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" onClick={() => onEdit(entry)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <Pencil size={12} className="text-muted-foreground" />
        </button>
        <button type="button" onClick={() => onDelete(entry.id)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 transition-colors">
          <Trash2 size={12} className="text-muted-foreground hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}

function SortableEduItem({
  entry,
  onEdit,
  onDelete,
}: {
  entry: EducationEntry;
  onEdit: (e: EducationEntry) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-border bg-muted/20 p-3 flex items-start gap-2">
      <button type="button" {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing touch-none p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0">
        <GripVertical size={14} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{entry.degree}{entry.fieldOfStudy ? `, ${entry.fieldOfStudy}` : ""}</p>
        <p className="text-xs text-muted-foreground truncate">{entry.institution}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
          {entry.startYear} — {entry.isCurrent ? "Present" : (entry.endYear ?? "—")}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" onClick={() => onEdit(entry)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <Pencil size={12} className="text-muted-foreground" />
        </button>
        <button type="button" onClick={() => onDelete(entry.id)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 transition-colors">
          <Trash2 size={12} className="text-muted-foreground hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}

function SortablePortfolioItem({
  item,
  imageUrl,
  onDelete,
}: {
  item: PortfolioItem;
  imageUrl: string;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const [loadError, setLoadError] = useState(false);
  useEffect(() => { setLoadError(false); }, [imageUrl]);
  return (
    <div ref={setNodeRef} style={style} className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
      {loadError || !imageUrl ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground p-2 text-center">
          <ImageOff size={20} className="opacity-60" />
          <span className="text-[10px] leading-tight opacity-70">Image unavailable</span>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={item.caption ?? "Portfolio"}
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setLoadError(true)}
        />
      )}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1.5 left-1.5 w-6 h-6 rounded-md bg-black/50 hover:bg-black/70 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none transition-colors z-10"
      >
        <GripVertical size={12} className="text-white/70" />
      </button>
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="w-9 h-9 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
        >
          <Trash2 size={15} className="text-white" />
        </button>
      </div>
      {item.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-2">
          <p className="text-xs text-white truncate">{item.caption}</p>
        </div>
      )}
    </div>
  );
}

export function ProfileEditPage() {
  const { userId, getToken } = useAuth();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const nextParam = new URLSearchParams(search).get("next");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeletingAccount(true);
    try {
      await apiFetch("/api/users/me", { method: "DELETE" }, getToken);
      toast.success("Account deleted. Goodbye!");
      setDeleteDialogOpen(false);
      await signOut();
      setLocation("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      toast.error(msg);
    } finally {
      setDeletingAccount(false);
    }
  };

  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const addPortfolioItem = useAddPortfolioItem();
  const deletePortfolioItem = useDeletePortfolioItem();
  const reorderPortfolio = useReorderPortfolio();

  const { data: expItems = [] } = useMyExperience();
  const createExperience = useCreateExperience();
  const updateExperience = useUpdateExperience();
  const deleteExperience = useDeleteExperience();
  const reorderExperience = useReorderExperience();

  const { data: eduItems = [] } = useMyEducation();
  const createEducation = useCreateEducation();
  const updateEducation = useUpdateEducation();
  const deleteEducation = useDeleteEducation();
  const reorderEducation = useReorderEducation();

  const [orderedPortfolioItems, setOrderedPortfolioItems] = useState<PortfolioItem[]>([]);
  const [orderedExpItems, setOrderedExpItems] = useState<ExperienceEntry[]>([]);
  const [orderedEduItems, setOrderedEduItems] = useState<EducationEntry[]>([]);

  useEffect(() => { setOrderedPortfolioItems(profile?.portfolioItems ?? []); }, [profile?.portfolioItems]);
  useEffect(() => { setOrderedExpItems(expItems); }, [expItems]);
  useEffect(() => { setOrderedEduItems(eduItems); }, [eduItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleExpDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedExpItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        reorderExperience.mutate(reordered.map((i) => i.id));
        return reordered;
      });
    }
  }, [reorderExperience]);

  const handleEduDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedEduItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        reorderEducation.mutate(reordered.map((i) => i.id));
        return reordered;
      });
    }
  }, [reorderEducation]);

  const handlePortfolioDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedPortfolioItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        reorderPortfolio.mutate(reordered.map((i) => i.id));
        return reordered;
      });
    }
  }, [reorderPortfolio]);

  const defaultExpForm = { jobTitle: "", company: "", location: "", startDate: "", endDate: "", isCurrent: false, description: "" };
  const defaultEduForm = { institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "", isCurrent: false, grade: "", activities: "", description: "" };

  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<ExperienceEntry | null>(null);
  const [expForm, setExpForm] = useState(defaultExpForm);

  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<EducationEntry | null>(null);
  const [eduForm, setEduForm] = useState(defaultEduForm);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [upiId, setUpiId] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [pendingPortfolioFile, setPendingPortfolioFile] = useState<File | null>(null);
  const [pendingPortfolioCaption, setPendingPortfolioCaption] = useState("");
  const [portfolioUrlInput, setPortfolioUrlInput] = useState("");
  const [portfolioCaptionInput, setPortfolioCaptionInput] = useState("");
  const [addingByUrl, setAddingByUrl] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setName(profile.name ?? "");
      setBio(profile.bio ?? "");
      setSkills(profile.skills ?? []);
      setPortfolioUrl(profile.portfolioUrl ?? "");
      setInstagramHandle(profile.instagramHandle ?? "");
      setYoutubeHandle(profile.youtubeHandle ?? "");
      setUpiId(profile.upiId ?? "");
      setAvatarPath(profile.avatarUrl ?? null);
      setIsAvailable(profile.isAvailable ?? true);
      setInitialized(true);
    }
  }, [profile, initialized]);

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploadingAvatar(true);
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    try {
      const objectPath = await uploadFileToStorage(file, getToken, "avatar");
      setAvatarPath(objectPath);
    } catch {
      toast.error("Failed to upload avatar");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePortfolioFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    if ((profile?.portfolioItems?.length ?? 0) >= 12) {
      toast.error("Portfolio limit reached (max 12 items)");
      return;
    }
    setPendingPortfolioFile(file);
    setPendingPortfolioCaption("");
  };

  const handlePortfolioUpload = async () => {
    if (!pendingPortfolioFile) return;
    setUploadingPortfolio(true);
    try {
      const objectPath = await uploadFileToStorage(pendingPortfolioFile, getToken, "portfolio");
      await addPortfolioItem.mutateAsync({ url: objectPath, caption: pendingPortfolioCaption.trim() || undefined });
      setPendingPortfolioFile(null);
      setPendingPortfolioCaption("");
      toast.success("Portfolio item added!");
    } catch {
      toast.error("Failed to upload portfolio item");
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const handleAddPortfolioByUrl = async () => {
    const url = portfolioUrlInput.trim();
    if (!url) return;
    try { new URL(url); } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    if ((profile?.portfolioItems?.length ?? 0) >= 12) {
      toast.error("Portfolio limit reached (max 12 items)");
      return;
    }
    setAddingByUrl(true);
    try {
      await addPortfolioItem.mutateAsync({
        url: url,
        caption: portfolioCaptionInput.trim() || undefined,
      });
      setPortfolioUrlInput("");
      setPortfolioCaptionInput("");
      toast.success("Portfolio item added!");
    } catch {
      toast.error("Failed to add portfolio item");
    } finally {
      setAddingByUrl(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const trimmed = customSkillInput.trim().toLowerCase();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      setCustomSkillInput("");
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setCustomSkillInput("");
  };

  const openAddExp = () => {
    setEditingExp(null);
    setExpForm(defaultExpForm);
    setExpModalOpen(true);
  };

  const openEditExp = (entry: ExperienceEntry) => {
    setEditingExp(entry);
    setExpForm({
      jobTitle: entry.jobTitle,
      company: entry.company,
      location: entry.location ?? "",
      startDate: entry.startDate,
      endDate: entry.endDate ?? "",
      isCurrent: entry.isCurrent,
      description: entry.description ?? "",
    });
    setExpModalOpen(true);
  };

  const handleSaveExp = () => {
    if (!expForm.jobTitle.trim() || !expForm.company.trim() || !expForm.startDate.trim()) {
      toast.error("Job title, company, and start date are required");
      return;
    }
    const data = {
      jobTitle: expForm.jobTitle,
      company: expForm.company,
      location: expForm.location || null,
      startDate: expForm.startDate,
      endDate: expForm.isCurrent ? null : (expForm.endDate || null),
      isCurrent: expForm.isCurrent,
      description: expForm.description || null,
    };
    if (editingExp) {
      updateExperience.mutate({ id: editingExp.id, ...data }, {
        onSuccess: () => { toast.success("Experience updated"); setExpModalOpen(false); },
        onError: () => toast.error("Failed to update experience"),
      });
    } else {
      createExperience.mutate(data, {
        onSuccess: () => { toast.success("Experience added"); setExpModalOpen(false); },
        onError: () => toast.error("Failed to add experience"),
      });
    }
  };

  const openAddEdu = () => {
    setEditingEdu(null);
    setEduForm(defaultEduForm);
    setEduModalOpen(true);
  };

  const openEditEdu = (entry: EducationEntry) => {
    setEditingEdu(entry);
    setEduForm({
      institution: entry.institution,
      degree: entry.degree,
      fieldOfStudy: entry.fieldOfStudy ?? "",
      startYear: String(entry.startYear),
      endYear: entry.endYear ? String(entry.endYear) : "",
      isCurrent: entry.isCurrent,
      grade: entry.grade ?? "",
      activities: entry.activities ?? "",
      description: entry.description ?? "",
    });
    setEduModalOpen(true);
  };

  const handleSaveEdu = () => {
    if (!eduForm.institution.trim() || !eduForm.degree.trim() || !eduForm.startYear.trim()) {
      toast.error("Institution, degree, and start year are required");
      return;
    }
    const data = {
      institution: eduForm.institution,
      degree: eduForm.degree,
      fieldOfStudy: eduForm.fieldOfStudy || null,
      startYear: Number(eduForm.startYear),
      endYear: eduForm.isCurrent ? null : (eduForm.endYear ? Number(eduForm.endYear) : null),
      isCurrent: eduForm.isCurrent,
      grade: eduForm.grade || null,
      activities: eduForm.activities || null,
      description: eduForm.description || null,
    };
    if (editingEdu) {
      updateEducation.mutate({ id: editingEdu.id, ...data }, {
        onSuccess: () => { toast.success("Education updated"); setEduModalOpen(false); },
        onError: () => toast.error("Failed to update education"),
      });
    } else {
      createEducation.mutate(data, {
        onSuccess: () => { toast.success("Education added"); setEduModalOpen(false); },
        onError: () => toast.error("Failed to add education"),
      });
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    updateProfile.mutate(
      {
        name: name.trim(),
        bio: bio.trim(),
        skills,
        portfolioUrl: portfolioUrl.trim(),
        instagramHandle: instagramHandle.trim(),
        youtubeHandle: youtubeHandle.trim(),
        upiId: upiId.trim(),
        avatarUrl: avatarPath ?? undefined,
        isAvailable,
      },
      {
        onSuccess: () => {
          toast.success("Profile saved!");
          if (nextParam) {
            setLocation(nextParam);
          } else {
            setLocation(`/profile/${userId}`);
          }
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save profile"),
      }
    );
  };

  const isComplete = !!(name.trim() && bio.trim());
  const currentAvatarSrc = avatarPreview ?? avatarUrl(avatarPath);
  const initials = name ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : (profile?.name?.charAt(0)?.toUpperCase() ?? "?");

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-24 rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
      <Link href={userId ? `/profile/${userId}` : "/"} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors group">
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Profile
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Edit Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete your profile to post tasks and apply for work.</p>
      </div>

      {/* Profile completeness banner */}
      {!isComplete && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">Profile incomplete</p>
            <p className="text-xs text-amber-400/70 mt-0.5">Add your name and bio to post tasks and apply for work.</p>
          </div>
        </div>
      )}
      {isComplete && (
        <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-start gap-3">
          <CheckCircle2 size={16} className="text-green-400 mt-0.5 shrink-0" />
          <p className="text-sm text-green-300 font-medium">Profile complete — you can post tasks and apply for work!</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Avatar */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Camera size={15} className="text-muted-foreground" />
            Profile Photo
          </h2>
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-border bg-muted">
                {currentAvatarSrc ? (
                  <img src={currentAvatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold">
                    {initials}
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Upload size={13} className="mr-2" />
                {uploadingAvatar ? "Uploading..." : "Upload Photo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG, WebP — max 5MB</p>
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Basic Info */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Basic Info</h2>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Display Name <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="focus-visible:ring-ring rounded-xl h-11"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Bio <span className="text-red-400">*</span>
            </label>
            <Textarea
              placeholder="Tell creators what you do — your skills, experience, style..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              className="min-h-[100px] resize-none focus-visible:ring-ring rounded-xl text-sm"
            />
            <div className="text-right text-xs text-muted-foreground mt-1">{bio.length}/500</div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Skills</h2>
          <p className="text-xs text-muted-foreground -mt-2">Select from the list or add your own custom skills.</p>
          <div className="flex flex-wrap gap-2">
            {FIXED_SKILLS.map((skill) => {
              const selected = skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-4 py-2 rounded-full border text-xs font-medium transition-all ${
                    selected
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                      : "border-border text-muted-foreground hover:border-purple-500/30 hover:text-purple-300 hover:bg-purple-500/5"
                  }`}
                >
                  {selected && <span className="mr-1">✓</span>}
                  {displaySkill(skill)}
                </button>
              );
            })}
            {skills.filter((s) => !FIXED_SKILLS.includes(s)).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border bg-purple-500/20 border-purple-500/40 text-purple-300 text-xs font-medium"
              >
                {displaySkill(skill)}
                <button
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className="text-purple-300/60 hover:text-purple-300 transition-colors leading-none"
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Add a custom skill..."
              value={customSkillInput}
              onChange={(e) => setCustomSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
              className="flex-1 focus-visible:ring-ring rounded-xl h-9 text-sm"
              maxLength={60}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl shrink-0"
              onClick={addCustomSkill}
              disabled={!customSkillInput.trim()}
            >
              <Plus size={14} className="mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Links */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Social & Portfolio Links</h2>

          <div className="flex items-center gap-3">
            <Instagram size={16} className="text-pink-400 shrink-0" />
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Instagram Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  placeholder="yourhandle"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ""))}
                  className="pl-7 focus-visible:ring-ring rounded-xl h-10 text-sm"
                  maxLength={60}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Youtube size={16} className="text-red-400 shrink-0" />
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">YouTube Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  placeholder="yourchannel"
                  value={youtubeHandle}
                  onChange={(e) => setYoutubeHandle(e.target.value.replace(/^@/, ""))}
                  className="pl-7 focus-visible:ring-ring rounded-xl h-10 text-sm"
                  maxLength={60}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LinkIcon size={16} className="text-blue-400 shrink-0" />
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Portfolio URL</label>
              <Input
                placeholder="https://yourportfolio.com"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="focus-visible:ring-ring rounded-xl h-10 text-sm"
                type="url"
              />
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Available for work</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Let brands know you're open to new tasks. Shows a badge on your profile in the creator directory.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              onClick={() => setIsAvailable((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isAvailable ? "bg-green-500" : "bg-muted"}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${isAvailable ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>

        {/* UPI ID */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CreditCard size={15} className="text-muted-foreground" />
            Payment Details
          </h2>
          <p className="text-xs text-muted-foreground">Your UPI ID is private and only used for withdrawals.</p>
          <Input
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="focus-visible:ring-ring rounded-xl h-10 text-sm"
          />
        </div>

        {/* Portfolio Gallery */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Portfolio Gallery</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Showcase your best work — up to 12 items.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs shrink-0"
              onClick={() => portfolioInputRef.current?.click()}
              disabled={uploadingPortfolio || (profile?.portfolioItems?.length ?? 0) >= 12}
            >
              <Upload size={13} className="mr-1.5" />
              {uploadingPortfolio ? "Uploading..." : "Upload Image"}
            </Button>
          </div>

          {/* Pending file confirmation (caption + upload) */}
          {pendingPortfolioFile && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
              <p className="text-xs font-medium text-purple-300">Selected: {pendingPortfolioFile.name}</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Caption (optional)"
                  value={pendingPortfolioCaption}
                  onChange={(e) => setPendingPortfolioCaption(e.target.value)}
                  className="flex-1 focus-visible:ring-ring rounded-xl h-9 text-sm"
                  maxLength={200}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handlePortfolioUpload(); } }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="btn-gradient border-0 text-white rounded-xl shrink-0"
                  onClick={handlePortfolioUpload}
                  disabled={uploadingPortfolio}
                >
                  {uploadingPortfolio ? "Uploading..." : "Add"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl shrink-0"
                  onClick={() => { setPendingPortfolioFile(null); setPendingPortfolioCaption(""); }}
                  disabled={uploadingPortfolio}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Add by URL */}
          {(profile?.portfolioItems?.length ?? 0) < 12 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Or paste an image URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/my-work.jpg"
                  value={portfolioUrlInput}
                  onChange={(e) => setPortfolioUrlInput(e.target.value)}
                  className="flex-1 focus-visible:ring-ring rounded-xl h-9 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddPortfolioByUrl(); } }}
                />
                <Input
                  placeholder="Caption (optional)"
                  value={portfolioCaptionInput}
                  onChange={(e) => setPortfolioCaptionInput(e.target.value)}
                  className="w-36 focus-visible:ring-ring rounded-xl h-9 text-sm"
                  maxLength={200}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl shrink-0"
                  onClick={handleAddPortfolioByUrl}
                  disabled={addingByUrl || !portfolioUrlInput.trim()}
                >
                  {addingByUrl ? "Adding..." : <Plus size={14} />}
                </Button>
              </div>
            </div>
          )}

          {(profile?.portfolioItems?.length ?? 0) === 0 ? (
            <button
              type="button"
              onClick={() => portfolioInputRef.current?.click()}
              disabled={uploadingPortfolio}
              className="w-full border-2 border-dashed border-border hover:border-purple-500/30 rounded-xl p-8 text-center transition-colors group"
            >
              <Upload size={24} className="mx-auto text-muted-foreground/40 group-hover:text-purple-400 mb-2 transition-colors" />
              <p className="text-sm text-muted-foreground">Upload your first portfolio image</p>
              <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WebP — max 10MB</p>
            </button>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePortfolioDragEnd}>
              <SortableContext items={orderedPortfolioItems.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {orderedPortfolioItems.map((item) => (
                    <SortablePortfolioItem
                      key={item.id}
                      item={item}
                      imageUrl={portfolioImageUrl(item.url) ?? ""}
                      onDelete={(id) =>
                        deletePortfolioItem.mutate(id, {
                          onSuccess: () => toast.success("Removed"),
                          onError: () => toast.error("Failed to remove"),
                        })
                      }
                    />
                  ))}
                  {orderedPortfolioItems.length < 12 && (
                    <button
                      type="button"
                      onClick={() => portfolioInputRef.current?.click()}
                      disabled={uploadingPortfolio}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-purple-500/30 flex flex-col items-center justify-center gap-2 transition-colors group"
                    >
                      <Plus size={20} className="text-muted-foreground/40 group-hover:text-purple-400 transition-colors" />
                      <span className="text-xs text-muted-foreground/60">Add more</span>
                    </button>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <input
            ref={portfolioInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePortfolioFileSelect(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Experience Section */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Experience</h2>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs" onClick={openAddExp}>
              <Plus size={13} className="mr-1.5" />
              Add Experience
            </Button>
          </div>
          {orderedExpItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No experience entries yet. Add your work history to stand out.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExpDragEnd}>
              <SortableContext items={orderedExpItems.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {orderedExpItems.map((entry) => (
                    <SortableExpItem
                      key={entry.id}
                      entry={entry}
                      onEdit={openEditExp}
                      onDelete={(id) => deleteExperience.mutate(id, { onSuccess: () => toast.success("Removed"), onError: () => toast.error("Failed to remove") })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Education Section */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Education</h2>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs" onClick={openAddEdu}>
              <Plus size={13} className="mr-1.5" />
              Add Education
            </Button>
          </div>
          {orderedEduItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No education entries yet. Add your academic background to build credibility.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEduDragEnd}>
              <SortableContext items={orderedEduItems.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {orderedEduItems.map((entry) => (
                    <SortableEduItem
                      key={entry.id}
                      entry={entry}
                      onEdit={openEditEdu}
                      onDelete={(id) => deleteEducation.mutate(id, { onSuccess: () => toast.success("Removed"), onError: () => toast.error("Failed to remove") })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Save button */}
        <div className="flex gap-3 pb-4">
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending || !name.trim()}
            className="flex-1 btn-gradient text-white rounded-xl border-0 font-semibold"
          >
            {updateProfile.isPending ? "Saving..." : "Save Profile"}
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-xl"
          >
            <Link href={userId ? `/profile/${userId}` : "/"}>Cancel</Link>
          </Button>
        </div>

        {/* ── Danger zone ── */}
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
              <Trash2 size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Delete account</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Permanently remove your profile, applications, messages and history.
                This cannot be undone. You'll need to cancel any active tasks and
                withdraw your wallet balance first.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDeleteConfirmText(""); setDeleteDialogOpen(true); }}
                className="mt-4 rounded-xl border-red-500/40 text-red-500 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/60"
              >
                Delete my account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete confirmation dialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!deletingAccount) setDeleteDialogOpen(open); }}>
        <AlertDialogContent className="bg-card border-border rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <Trash2 size={18} className="text-red-500" />
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              This will permanently remove your profile, portfolio, messages and applications.
              Completed tasks stay in the other party's history but your name will no longer appear.
              <span className="block mt-2 text-foreground">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-muted-foreground block">
              Type <span className="font-mono font-semibold text-red-500">DELETE</span> to confirm
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="rounded-xl h-10"
              disabled={deletingAccount}
              autoFocus
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl" disabled={deletingAccount}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              disabled={deleteConfirmText !== "DELETE" || deletingAccount}
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
            >
              {deletingAccount ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Experience Modal ── */}
      <Dialog open={expModalOpen} onOpenChange={setExpModalOpen}>
        <DialogContent className="bg-card text-card-foreground border-border rounded-2xl max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingExp ? "Edit Experience" : "Add Experience"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Title <span className="text-red-400">*</span></label>
                <Input placeholder="e.g. Content Creator" value={expForm.jobTitle} onChange={(e) => setExpForm((f) => ({ ...f, jobTitle: e.target.value }))} className="rounded-xl h-10 text-sm" maxLength={120} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Company <span className="text-red-400">*</span></label>
                <Input placeholder="e.g. Freelance" value={expForm.company} onChange={(e) => setExpForm((f) => ({ ...f, company: e.target.value }))} className="rounded-xl h-10 text-sm" maxLength={120} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><MapPin size={11} /> Location (optional)</label>
              <Input placeholder="e.g. Mumbai, India" value={expForm.location} onChange={(e) => setExpForm((f) => ({ ...f, location: e.target.value }))} className="rounded-xl h-10 text-sm" maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={11} /> Start Date <span className="text-red-400">*</span></label>
                <Input type="month" value={expForm.startDate} onChange={(e) => setExpForm((f) => ({ ...f, startDate: e.target.value }))} className="rounded-xl h-10 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={11} /> End Date</label>
                <Input type="month" value={expForm.endDate} onChange={(e) => setExpForm((f) => ({ ...f, endDate: e.target.value }))} disabled={expForm.isCurrent} className="rounded-xl h-10 text-sm disabled:opacity-40" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                role="switch"
                aria-checked={expForm.isCurrent}
                onClick={() => setExpForm((f) => ({ ...f, isCurrent: !f.isCurrent, endDate: !f.isCurrent ? "" : f.endDate }))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${expForm.isCurrent ? "bg-purple-500" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${expForm.isCurrent ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-xs text-muted-foreground">I am currently working in this role</span>
            </label>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description (optional)</label>
              <Textarea placeholder="What did you work on? Key achievements, tools used..." value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} className="rounded-xl text-sm min-h-[80px] resize-none" maxLength={1000} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setExpModalOpen(false)}>Cancel</Button>
            <Button
              className="btn-gradient border-0 text-white rounded-xl"
              onClick={handleSaveExp}
              disabled={createExperience.isPending || updateExperience.isPending}
            >
              {createExperience.isPending || updateExperience.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Education Modal ── */}
      <Dialog open={eduModalOpen} onOpenChange={setEduModalOpen}>
        <DialogContent className="bg-card text-card-foreground border-border rounded-2xl max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingEdu ? "Edit Education" : "Add Education"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Institution <span className="text-red-400">*</span></label>
              <Input placeholder="e.g. Mumbai University" value={eduForm.institution} onChange={(e) => setEduForm((f) => ({ ...f, institution: e.target.value }))} className="rounded-xl h-10 text-sm" maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Degree <span className="text-red-400">*</span></label>
                <Input placeholder="e.g. Bachelor of Arts" value={eduForm.degree} onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))} className="rounded-xl h-10 text-sm" maxLength={200} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Field of Study</label>
                <Input placeholder="e.g. Mass Communication" value={eduForm.fieldOfStudy} onChange={(e) => setEduForm((f) => ({ ...f, fieldOfStudy: e.target.value }))} className="rounded-xl h-10 text-sm" maxLength={120} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Year <span className="text-red-400">*</span></label>
                <Input type="number" min={1950} max={2099} placeholder="2020" value={eduForm.startYear} onChange={(e) => setEduForm((f) => ({ ...f, startYear: e.target.value }))} className="rounded-xl h-10 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">End Year</label>
                <Input type="number" min={1950} max={2099} placeholder="2024" value={eduForm.endYear} onChange={(e) => setEduForm((f) => ({ ...f, endYear: e.target.value }))} disabled={eduForm.isCurrent} className="rounded-xl h-10 text-sm disabled:opacity-40" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                role="switch"
                aria-checked={eduForm.isCurrent}
                onClick={() => setEduForm((f) => ({ ...f, isCurrent: !f.isCurrent, endYear: !f.isCurrent ? "" : f.endYear }))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${eduForm.isCurrent ? "bg-purple-500" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${eduForm.isCurrent ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-xs text-muted-foreground">I am currently studying here</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Grade (optional)</label>
                <Input placeholder="e.g. 8.5 CGPA / First Class" value={eduForm.grade} onChange={(e) => setEduForm((f) => ({ ...f, grade: e.target.value }))} className="rounded-xl h-10 text-sm" maxLength={60} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Activities (optional)</label>
                <Input placeholder="e.g. Drama Club, Photography" value={eduForm.activities} onChange={(e) => setEduForm((f) => ({ ...f, activities: e.target.value }))} className="rounded-xl h-10 text-sm" maxLength={500} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description (optional)</label>
              <Textarea placeholder="What did you study? Notable projects, clubs..." value={eduForm.description} onChange={(e) => setEduForm((f) => ({ ...f, description: e.target.value }))} className="rounded-xl text-sm min-h-[80px] resize-none" maxLength={1000} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEduModalOpen(false)}>Cancel</Button>
            <Button
              className="btn-gradient border-0 text-white rounded-xl"
              onClick={handleSaveEdu}
              disabled={createEducation.isPending || updateEducation.isPending}
            >
              {createEducation.isPending || updateEducation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
