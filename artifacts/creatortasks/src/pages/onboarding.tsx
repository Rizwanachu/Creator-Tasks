import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCheckUsername, useUpdateProfile, useAddPortfolioItem, useMyProfile } from "@/hooks/use-profile";
import {
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Upload,
  Zap,
  Plus,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const TOTAL_STEPS = 7;

const FOCUS_CATEGORIES = [
  { label: "Editing" },
  { label: "Programming" },
  { label: "Content Creation" },
  { label: "Design" },
  { label: "Marketing" },
  { label: "Video Production" },
  { label: "Photography" },
  { label: "Sales" },
  { label: "Writing" },
  { label: "Voiceover" },
  { label: "Animation" },
  { label: "Music" },
  { label: "Copywriting" },
  { label: "3D" },
];

async function uploadFile(
  file: File,
  getToken: () => Promise<string | null>,
  purpose: "avatar" | "portfolio",
): Promise<string> {
  const token = await getToken();
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);
  const res = await fetch(`${API_BASE}/api/storage/uploads/file`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Upload failed");
  }
  const { objectPath } = await res.json();
  return objectPath as string;
}

function ProgressDashes({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current
              ? "w-8 bg-primary"
              : i === current
              ? "w-8 bg-primary/50"
              : "w-6 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function NavButtons({
  onBack,
  onContinue,
  continueLabel = "CONTINUE",
  continueDisabled = false,
  loading = false,
  showBack = true,
}: {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  loading?: boolean;
  showBack?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
      {showBack ? (
        <Button
          variant="outline"
          onClick={onBack}
          className="rounded-xl gap-1.5"
          disabled={loading}
        >
          <ChevronLeft size={15} />
          Back
        </Button>
      ) : (
        <div />
      )}
      <Button
        onClick={onContinue}
        disabled={continueDisabled || loading}
        className="rounded-xl gap-1.5 btn-gradient border-0 text-white px-6"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {continueLabel}
            {continueLabel !== "LAUNCH INTO CREATORTASKS" && <ChevronRight size={15} />}
          </>
        )}
      </Button>
    </div>
  );
}

interface PendingPortfolioItem {
  title: string;
  description: string;
  file: File;
  preview: string;
}

export function OnboardingPage() {
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const { data: existingProfile } = useMyProfile();
  const existingUsername = existingProfile?.username ?? null;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 — username (pre-fill + lock if the user already has one)
  const [username, setUsername] = useState("");

  // Step 2 — core focus
  const [focusCategories, setFocusCategories] = useState<string[]>([]);

  // Step 3 — skills
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Step 4 — story (display name, bio, avatar — avatar kept as File until launch)
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Step 5 — social links
  const [instagramHandle, setInstagramHandle] = useState("");
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [upiId, setUpiId] = useState("");

  // Step 6 — portfolio (files kept locally until launch)
  const [pendingPortfolioItems, setPendingPortfolioItems] = useState<PendingPortfolioItem[]>([]);
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioDesc, setPortfolioDesc] = useState("");
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);

  // Step 7 — first drop (separate from step 4 bio)
  const [firstDropText, setFirstDropText] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  // Refs to track latest object URLs so cleanup always revokes current values
  const avatarPreviewRef = useRef<string | null>(null);
  const pendingPortfolioItemsRef = useRef<PendingPortfolioItem[]>([]);

  const updateProfile = useUpdateProfile();
  const addPortfolioItem = useAddPortfolioItem();

  const { data: usernameCheck, isFetching: checkingUsername } = useCheckUsername(username);

  const isUsernameFormatValid = /^[a-z0-9_]{3,20}$/.test(username.trim().toLowerCase());
  const isUsernameAvailable = isUsernameFormatValid && !checkingUsername && usernameCheck?.available === true;

  function addSkill(val: string) {
    const trimmed = val.trim().toLowerCase();
    if (trimmed && !skills.includes(trimmed)) setSkills((p) => [...p, trimmed]);
    setSkillInput("");
  }

  function addHashtag(val: string) {
    const parts = val.split(/[\s#,]+/).map((s) => s.replace(/^#/, "").trim().toLowerCase()).filter(Boolean);
    setHashtags((prev) => {
      const next = [...prev];
      for (const p of parts) { if (p && !next.includes(p)) next.push(p); }
      return next;
    });
    setHashtagInput("");
  }

  function handleAvatarSelect(file: File) {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Please select an image file under 5MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  // Keep refs in sync with latest state so the unmount cleanup can revoke all current object URLs
  useEffect(() => { avatarPreviewRef.current = avatarPreview; }, [avatarPreview]);
  useEffect(() => { pendingPortfolioItemsRef.current = pendingPortfolioItems; }, [pendingPortfolioItems]);

  // Revoke all current object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
      for (const item of pendingPortfolioItemsRef.current) URL.revokeObjectURL(item.preview);
    };
  }, []);

  function handleAddPortfolioItem() {
    if (!portfolioFile) return;
    const preview = URL.createObjectURL(portfolioFile);
    setPendingPortfolioItems((p) => [...p, {
      title: portfolioTitle,
      description: portfolioDesc,
      file: portfolioFile,
      preview,
    }]);
    setPortfolioTitle("");
    setPortfolioDesc("");
    setPortfolioFile(null);
  }

  async function handleLaunch() {
    setLoading(true);
    try {
      // Upload avatar if selected
      let avatarPath: string | undefined;
      if (avatarFile) {
        avatarPath = await uploadFile(avatarFile, getToken, "avatar");
      }

      // Merge all skills sources
      const allSkills = [...new Set([
        ...focusCategories.map((c) => c.toLowerCase()),
        ...skills,
        ...hashtags,
      ])].slice(0, 15);

      // Save profile
      await updateProfile.mutateAsync({
        username: username.trim().toLowerCase() || undefined,
        name: name.trim() || username.trim() || undefined,
        bio: (firstDropText.trim() || bio.trim()) || undefined,
        skills: allSkills,
        instagramHandle: instagramHandle.trim() || undefined,
        youtubeHandle: youtubeHandle.trim() || undefined,
        upiId: upiId.trim() || undefined,
        avatarUrl: avatarPath,
      });

      // Upload and save portfolio items
      for (const item of pendingPortfolioItems) {
        const url = await uploadFile(item.file, getToken, "portfolio");
        await addPortfolioItem.mutateAsync({
          url,
          caption: [item.title, item.description].filter(Boolean).join(" — ") || undefined,
        });
      }

      toast.success("Welcome to CreatorTasks! 🎉");
      const params = new URLSearchParams(search);
      const nextPath = params.get("next");
      setLocation(nextPath && nextPath.startsWith("/") ? nextPath : "/tasks");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function next() { setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <p className="text-center text-sm text-muted-foreground mb-6 font-medium tracking-wide">
          Setting up your CreatorTasks profile
        </p>

        <div className="bg-card border border-border rounded-2xl p-7 md:p-9 shadow-xl">
          <ProgressDashes current={step} />

          {/* Step heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {[
                "Choose your username",
                "What's your core focus?",
                "Add your skills",
                "Your story",
                "Social & payment links",
                "Add your portfolio",
                "Post your first drop",
              ][step]}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {[
                "This is your handle on CreatorTasks. You can't change it later.",
                "Select all that apply.",
                "Press Enter after each skill.",
                "Tell brands what makes you unique.",
                "Optional — help brands find and pay you.",
                "Showcase your best work. You can add more later.",
                "Introduce yourself to the CreatorTasks community.",
              ][step]}
            </p>
          </div>

          {/* ── Step 1: Username ── */}
          {step === 0 && (
            <div className="space-y-4">
              {existingUsername ? (
                /* User already has a username — show it locked */
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted border border-border">
                  <span className="text-muted-foreground text-sm">@</span>
                  <span className="font-semibold text-foreground flex-1">{existingUsername}</span>
                  <Check size={16} className="text-green-400 shrink-0" />
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Input
                      placeholder="e.g. creator_raj"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      className="rounded-xl h-12 text-base pr-10"
                      maxLength={20}
                      autoFocus
                    />
                    {username.length >= 3 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername ? (
                          <span className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin block" />
                        ) : isUsernameAvailable ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          <X size={16} className="text-red-400" />
                        )}
                      </span>
                    )}
                  </div>

                  {username.length >= 3 && !checkingUsername && (
                    <p className={`text-xs font-medium ${isUsernameAvailable ? "text-green-400" : "text-red-400"}`}>
                      {isUsernameAvailable
                        ? "✓ Available!"
                        : usernameCheck?.reason ?? "Username is taken or invalid"}
                    </p>
                  )}
                </>
              )}

              {!existingUsername && isUsernameAvailable && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-11 font-semibold tracking-wide text-sm border-primary/40 text-primary hover:bg-primary/10"
                  onClick={next}
                >
                  KEEP THIS HANDLE
                </Button>
              )}

              <NavButtons
                showBack={false}
                onContinue={next}
                continueDisabled={!existingUsername && !isUsernameAvailable}
              />
            </div>
          )}

          {/* ── Step 2: Core focus ── */}
          {step === 1 && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_CATEGORIES.map((cat) => {
                  const selected = focusCategories.includes(cat.label);
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() =>
                        setFocusCategories((p) =>
                          selected ? p.filter((c) => c !== cat.label) : [...p, cat.label]
                        )
                      }
                      className={`flex items-center gap-3 px-4 py-4 rounded-xl border text-sm font-semibold text-left transition-all tracking-wide uppercase ${
                        selected
                          ? "bg-primary/15 border-primary/50 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/5"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              <NavButtons onBack={back} onContinue={next} continueDisabled={focusCategories.length === 0} />
            </div>
          )}

          {/* ── Step 3: Skills ── */}
          {step === 2 && (
            <div className="space-y-4">
              <Input
                placeholder="e.g. Figma, After Effects, React..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); }
                }}
                className="rounded-xl h-12 text-sm"
                autoFocus
              />
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-medium"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setSkills((p) => p.filter((x) => x !== s))}
                        className="text-primary/60 hover:text-primary leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <NavButtons onBack={back} onContinue={next} />
            </div>
          )}

          {/* ── Step 4: Your story ── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div
                  className="relative w-16 h-16 rounded-2xl overflow-hidden border border-border bg-muted cursor-pointer shrink-0"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                      {name ? name[0].toUpperCase() : "?"}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {avatarPreview ? "✓ Photo selected" : "Upload photo"}
                  </button>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG or PNG, max 5MB</p>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarSelect(f); e.target.value = ""; }}
                />
              </div>

              {/* Display name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Display name</label>
                <Input
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="rounded-xl h-11"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Bio</label>
                <Textarea
                  placeholder="I'm a video editor specialising in brand storytelling..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  className="min-h-[110px] resize-none rounded-xl text-sm"
                />
                <div className="text-right text-xs text-muted-foreground mt-1">{bio.length}/500</div>
              </div>

              <NavButtons onBack={back} onContinue={next} continueDisabled={!name.trim() || !bio.trim()} />
            </div>
          )}

          {/* ── Step 5: Social & payment ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Instagram handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    placeholder="yourhandle"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ""))}
                    className="pl-7 rounded-xl h-11"
                    maxLength={60}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">YouTube handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    placeholder="yourchannel"
                    value={youtubeHandle}
                    onChange={(e) => setYoutubeHandle(e.target.value.replace(/^@/, ""))}
                    className="pl-7 rounded-xl h-11"
                    maxLength={60}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">UPI ID (for withdrawals)</label>
                <Input
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="rounded-xl h-11"
                />
                <p className="text-xs text-muted-foreground mt-1">Private — only used when you withdraw earnings.</p>
              </div>
              <NavButtons onBack={back} onContinue={next} />
            </div>
          )}

          {/* ── Step 6: Portfolio ── */}
          {step === 5 && (
            <div className="space-y-4">
              <Input
                placeholder="Project title"
                value={portfolioTitle}
                onChange={(e) => setPortfolioTitle(e.target.value)}
                className="rounded-xl h-11"
                maxLength={100}
              />
              <Input
                placeholder="Short description"
                value={portfolioDesc}
                onChange={(e) => setPortfolioDesc(e.target.value)}
                className="rounded-xl h-11"
                maxLength={200}
              />

              <button
                type="button"
                onClick={() => portfolioInputRef.current?.click()}
                className="w-full h-11 flex items-center gap-2 px-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary/80 transition-colors"
              >
                <Upload size={15} />
                {portfolioFile ? portfolioFile.name : "Upload file"}
              </button>
              <input
                ref={portfolioInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPortfolioFile(f); e.target.value = ""; }}
              />

              <Button
                variant="ghost"
                className="w-full rounded-xl border border-dashed border-border h-11 text-sm text-muted-foreground hover:text-primary hover:border-primary/40"
                onClick={handleAddPortfolioItem}
                disabled={!portfolioFile}
              >
                <Plus size={14} className="mr-1.5" /> Add to Portfolio
              </Button>

              {pendingPortfolioItems.length > 0 && (
                <div className="space-y-2 pt-1">
                  {pendingPortfolioItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted border border-border"
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-border shrink-0">
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title || item.file.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingPortfolioItems((p) => p.filter((_, j) => j !== i))}
                        className="text-muted-foreground/60 hover:text-red-400 transition-colors shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <NavButtons onBack={back} onContinue={next} />
            </div>
          )}

          {/* ── Step 7: First drop (separate from bio) ── */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-2">
                <Zap size={22} className="text-amber-400" fill="currentColor" />
              </div>

              <Textarea
                placeholder="Hey CreatorTasks! I'm a video editor specialising in brand storytelling..."
                value={firstDropText}
                onChange={(e) => setFirstDropText(e.target.value)}
                maxLength={500}
                className="min-h-[120px] resize-none rounded-xl text-sm"
              />

              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">#</span>
                  <Input
                    placeholder="VideoEditing Design Available"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (hashtagInput.trim()) addHashtag(hashtagInput);
                      }
                    }}
                    onBlur={() => { if (hashtagInput.trim()) addHashtag(hashtagInput); }}
                    className="pl-6 rounded-xl h-11 text-sm"
                  />
                </div>
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-medium"
                      >
                        #{tag}
                        <button type="button" onClick={() => setHashtags((p) => p.filter((t) => t !== tag))} className="text-primary/60 hover:text-primary leading-none">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <NavButtons
                onBack={back}
                onContinue={handleLaunch}
                continueLabel="LAUNCH INTO CREATORTASKS"
                loading={loading}
              />
              <button
                type="button"
                onClick={handleLaunch}
                disabled={loading}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}
