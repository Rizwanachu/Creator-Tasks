import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSubscription, useCreateSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Check, X, Sparkles, Zap, Shield, TrendingUp,
  Star, ChevronRight,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) { resolve(true); return; }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const FEATURES = [
  {
    label: "Platform fee",
    free: "10%",
    pro: "7%",
    proNote: "Save more on every task",
    icon: TrendingUp,
  },
  {
    label: "Daily task posting",
    free: "2 tasks/day",
    pro: "Unlimited",
    proNote: "Post as many as you need",
    icon: Zap,
  },
  {
    label: "Search priority",
    free: "Standard ranking",
    pro: "Pinned to top",
    proNote: "Shown first when brands search",
    icon: Star,
  },
  {
    label: "Pro badge on profile",
    free: false,
    pro: true,
    proNote: "Stand out to brands instantly",
    icon: Sparkles,
  },
  {
    label: "Escrow protection",
    free: true,
    pro: true,
    icon: Shield,
  },
  {
    label: "Razorpay payouts",
    free: true,
    pro: true,
    icon: Shield,
  },
];

export function ProPage() {
  const [, navigate] = useLocation();
  const { data: sub, isLoading } = useSubscription();
  const createSub = useCreateSubscription();
  const [subscribing, setSubscribing] = useState(false);

  const isPro = sub?.isPro ?? false;

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load payment system. Please try again.");
        setSubscribing(false);
        return;
      }

      const data = await createSub.mutateAsync();

      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "CreatorTasks Pro",
        description: "₹299/month — Pro subscription",
        handler: () => {
          toast.success("Welcome to Pro! Your badge is active.");
          navigate("/dashboard?tab=subscription");
        },
        theme: { color: "#7C5CFF" },
        modal: { escape: true },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start subscription");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-border bg-gradient-to-b from-purple-500/5 to-transparent">
        <div className="container mx-auto px-4 py-16 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-semibold mb-6">
            <Sparkles size={12} />
            CreatorTasks Pro
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
            Unlock your full potential
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Lower fees, unlimited posting, and priority placement — everything you need to grow faster on CreatorTasks.
          </p>

          {/* Pricing card */}
          <div className="inline-flex flex-col items-center gap-1 bg-card border border-purple-500/30 rounded-2xl px-10 py-6 shadow-lg shadow-purple-500/5 mb-8">
            <div className="flex items-end gap-1">
              <span className="text-5xl font-black text-foreground">₹299</span>
              <span className="text-muted-foreground text-lg mb-2">/month</span>
            </div>
            <span className="text-xs text-muted-foreground">Billed monthly · Cancel anytime</span>
          </div>

          {isLoading ? null : isPro ? (
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold text-sm">
                <Sparkles size={14} className="fill-purple-400" />
                You're already a Pro member!
              </div>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/dashboard?tab=subscription">Manage Subscription</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Button
                className="btn-gradient text-white rounded-xl px-8 py-3 h-auto text-base font-bold border-0 shadow-lg shadow-purple-500/20"
                onClick={handleSubscribe}
                disabled={subscribing}
              >
                {subscribing ? "Opening payment…" : "Subscribe for ₹299/month"}
                <ChevronRight size={16} className="ml-1" />
              </Button>
              <p className="text-xs text-muted-foreground">No lock-in. Cancel before your next billing date to stop charges.</p>
            </div>
          )}
        </div>
      </div>

      {/* Feature comparison */}
      <div className="container mx-auto px-4 py-14 max-w-3xl">
        <h2 className="text-xl font-bold text-foreground text-center mb-8">What's included</h2>

        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 bg-muted/50 border-b border-border">
            <div className="p-4 text-sm font-semibold text-foreground">Feature</div>
            <div className="p-4 text-sm font-semibold text-muted-foreground text-center border-l border-border">Free</div>
            <div className="p-4 text-sm font-bold text-purple-400 text-center border-l border-border flex items-center justify-center gap-1.5">
              <Sparkles size={13} className="fill-purple-400" />
              Pro
            </div>
          </div>

          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className={`grid grid-cols-3 ${i < FEATURES.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="p-4 flex items-center gap-2.5">
                  <Icon size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground font-medium">{feat.label}</span>
                </div>
                <div className="p-4 text-center border-l border-border flex items-center justify-center">
                  {typeof feat.free === "boolean" ? (
                    feat.free
                      ? <Check size={16} className="text-green-500" />
                      : <X size={16} className="text-muted-foreground/40" />
                  ) : (
                    <span className="text-sm text-muted-foreground">{feat.free}</span>
                  )}
                </div>
                <div className="p-4 text-center border-l border-border bg-purple-500/[0.03] flex flex-col items-center justify-center gap-0.5">
                  {typeof feat.pro === "boolean" ? (
                    feat.pro
                      ? <Check size={16} className="text-purple-400" />
                      : <X size={16} className="text-muted-foreground/40" />
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-purple-400">{feat.pro}</span>
                      {feat.proNote && <span className="text-[10px] text-muted-foreground leading-tight">{feat.proNote}</span>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA again */}
        {!isPro && !isLoading && (
          <div className="mt-10 text-center">
            <Button
              className="btn-gradient text-white rounded-xl px-10 py-3 h-auto text-sm font-bold border-0"
              onClick={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing ? "Opening payment…" : "Get Pro — ₹299/month"}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Secure payments via Razorpay · Cancel anytime</p>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-14 space-y-6">
          <h2 className="text-lg font-bold text-foreground text-center">Frequently asked questions</h2>
          {[
            {
              q: "When does my Pro access start?",
              a: "Immediately after your first payment is processed. Your badge appears on your profile within seconds.",
            },
            {
              q: "What happens when I cancel?",
              a: "Your Pro access continues until the end of your current billing period. No pro-rated refunds.",
            },
            {
              q: "Does the 7% fee apply to existing tasks?",
              a: "The reduced fee applies to tasks approved after you become Pro. Already-in-progress tasks keep the original 10% rate.",
            },
            {
              q: "Can I switch back to free?",
              a: "Yes, cancel anytime from your Dashboard → Subscription tab. There are no penalties.",
            },
          ].map((item, i) => (
            <div key={i} className="border-b border-border pb-5">
              <p className="font-semibold text-foreground text-sm mb-1.5">{item.q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
