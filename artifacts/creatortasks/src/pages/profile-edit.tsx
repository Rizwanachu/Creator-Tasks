import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile, useUpdateProfile, useAddPortfolioItem, useDeletePortfolioItem } from "@/hooks/use-profile";
import { ArrowLeft, Camera, Plus, Instagram, Youtube, Link as LinkIcon, CreditCard, Upload, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function avatarUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
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
  const metaRes = await fetch(`${API_BASE}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type, purpose }),
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

const FIXED_SKILLS = [
  "Reels", "Hooks", "Thumbnails", "Video Editing",
  "Graphic Design", "Copywriting", "Other",
];

export function ProfileEditPage() {
  const { userId, getToken } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const nextParam = new URLSearchParams(search).get("next");

  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const addPortfolioItem = useAddPortfolioItem();
  const deletePortfolioItem = useDeletePortfolioItem();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [upiId, setUpiId] = useState("");

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
        avatarUrl: avatarPath ?? undefined,
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
          <p className="text-xs text-muted-foreground -mt-2">Select the skills that best describe your work.</p>
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
                  {skill}
                </button>
              );
            })}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile?.portfolioItems?.map((item) => (
                <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                  <img
                    src={portfolioImageUrl(item.url)}
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
              if (file) handlePortfolioFileSelect(file);
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
