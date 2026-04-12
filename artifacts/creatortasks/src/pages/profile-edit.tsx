import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, useUpdateProfile, useAddPortfolioItem, useDeletePortfolioItem } from "@/hooks/use-profile";
import { ArrowLeft, Camera, X, Plus, Instagram, Youtube, Link as LinkIcon, CreditCard, Upload, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function avatarUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  return `${API_BASE}/api/storage${objectPath}`;
}

function portfolioImageUrl(objectPath: string): string {
  return `${API_BASE}/api/storage${objectPath}`;
}

async function uploadFileToStorage(file: File, getToken: () => Promise<string | null>): Promise<string> {
  const token = await getToken();
  const metaRes = await fetch(`${API_BASE}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!metaRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await metaRes.json();

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("Failed to upload file");

  return objectPath as string;
}

const SKILL_SUGGESTIONS = [
  "Video Editing", "Motion Graphics", "Thumbnail Design", "Copywriting",
  "Hook Writing", "Caption Writing", "Color Grading", "After Effects",
  "Premiere Pro", "Canva", "Photoshop", "CapCut", "DaVinci Resolve",
];

export function ProfileEditPage() {
  const { userId, getToken } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const nextParam = new URLSearchParams(search).get("next");

  const { data: profile, isLoading } = useProfile(userId ?? undefined);
  const updateProfile = useUpdateProfile();
  const addPortfolioItem = useAddPortfolioItem();
  const deletePortfolioItem = useDeletePortfolioItem();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [upiId, setUpiId] = useState("");

  const [avatarObjectPath, setAvatarObjectPath] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [captionDraft, setCaptionDraft] = useState<Record<string, string>>({});

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
      setAvatarObjectPath(profile.avatarObjectPath ?? null);
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
      const objectPath = await uploadFileToStorage(file, getToken);
      setAvatarObjectPath(objectPath);
    } catch {
      toast.error("Failed to upload avatar");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePortfolioUpload = async (file: File) => {
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
    setUploadingPortfolio(true);
    try {
      const objectPath = await uploadFileToStorage(file, getToken);
      await addPortfolioItem.mutateAsync({ imageObjectPath: objectPath });
      toast.success("Portfolio item added!");
    } catch {
      toast.error("Failed to upload portfolio item");
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed || skills.includes(trimmed) || skills.length >= 10) return;
    setSkills([...skills, trimmed]);
    setSkillInput("");
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
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
        portfolioUrl: portfolioUrl.trim() || undefined,
        instagramHandle: instagramHandle.trim() || undefined,
        youtubeHandle: youtubeHandle.trim() || undefined,
        upiId: upiId.trim() || undefined,
        avatarObjectPath: avatarObjectPath ?? undefined,
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
  const currentAvatarSrc = avatarPreview ?? avatarUrl(avatarObjectPath);
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
          <p className="text-xs text-muted-foreground -mt-2">Add up to 10 skills that describe your expertise.</p>

          <div className="flex gap-2">
            <Input
              placeholder="e.g., Video Editing"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAddSkill(skillInput); }
                if (e.key === "," ) { e.preventDefault(); handleAddSkill(skillInput); }
              }}
              className="focus-visible:ring-ring rounded-xl h-10 text-sm flex-1"
              maxLength={40}
              disabled={skills.length >= 10}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl shrink-0"
              onClick={() => handleAddSkill(skillInput)}
              disabled={skills.length >= 10 || !skillInput.trim()}
            >
              <Plus size={14} />
            </Button>
          </div>

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-white transition-colors"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleAddSkill(s)}
                disabled={skills.length >= 10}
                className="px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground text-[11px] hover:border-purple-500/30 hover:text-purple-300 hover:bg-purple-500/5 transition-all disabled:opacity-40"
              >
                + {s}
              </button>
            ))}
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
              <p className="text-xs text-muted-foreground mt-0.5">Showcase your best work — up to 12 images.</p>
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
              {uploadingPortfolio ? "Uploading..." : "Add Image"}
            </Button>
          </div>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile?.portfolioItems?.map((item) => (
                <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                  <img
                    src={portfolioImageUrl(item.imageObjectPath)}
                    alt={item.caption ?? "Portfolio"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        deletePortfolioItem.mutate(item.id, {
                          onSuccess: () => toast.success("Removed"),
                          onError: () => toast.error("Failed to remove"),
                        });
                      }}
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
              ))}
              {(profile?.portfolioItems?.length ?? 0) < 12 && (
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
          )}

          <input
            ref={portfolioInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePortfolioUpload(file);
              e.target.value = "";
            }}
          />
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
      </div>
    </div>
  );
}
