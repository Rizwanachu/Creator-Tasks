import { Link } from "wouter";
import { ArrowLeft, Mail, Clock, MessageSquare, HelpCircle } from "lucide-react";

export function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors group">
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Home
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Contact Us</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          We're here to help. Reach out for support, billing queries, or general questions.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 mb-10">
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Mail size={18} className="text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Email Support</h3>
            <p className="text-xs text-muted-foreground mt-0.5">For all queries including payments, disputes, and account issues.</p>
          </div>
          <a
            href="mailto:support@creatortasks.vercel.app"
            className="text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            support@creatortasks.vercel.app
          </a>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Clock size={18} className="text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Response Time</h3>
            <p className="text-xs text-muted-foreground mt-0.5">We aim to respond to all queries promptly.</p>
          </div>
          <p className="text-sm text-foreground/80 font-medium">Within 2 business days</p>
        </div>
      </div>

      <div className="space-y-4 mb-10">
        <h2 className="text-base font-semibold text-foreground">Common Topics</h2>

        {[
          {
            icon: MessageSquare,
            title: "Payment & Refund Issues",
            description: "For failed payments, wallet top-up issues, or refund requests, email us with your registered email and transaction ID.",
            color: "text-blue-400",
            bg: "bg-blue-500/10 border-blue-500/20",
          },
          {
            icon: HelpCircle,
            title: "Dispute Resolution",
            description: "If you have a dispute with another user, you can raise a dispute through your dashboard. For unresolved issues, contact us via email.",
            color: "text-amber-400",
            bg: "bg-amber-500/10 border-amber-500/20",
          },
          {
            icon: Mail,
            title: "Account Issues",
            description: "For account suspension, verification, or deletion requests, please email us from your registered email address.",
            color: "text-pink-400",
            bg: "bg-pink-500/10 border-pink-500/20",
          },
        ].map(({ icon: Icon, title, description, color, bg }) => (
          <div key={title} className="bg-card border border-border rounded-2xl p-5 flex gap-4">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-1">Business Information</h2>
        <p className="text-xs text-muted-foreground mb-4">For legal and compliance correspondence.</p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><span className="text-foreground/70 font-medium">Platform:</span> CreatorTasks</p>
          <p><span className="text-foreground/70 font-medium">Website:</span>{" "}
            <a href="https://creatortasks.vercel.app" className="text-purple-400 hover:text-purple-300 underline">
              creatortasks.vercel.app
            </a>
          </p>
          <p><span className="text-foreground/70 font-medium">Support Email:</span>{" "}
            <a href="mailto:support@creatortasks.vercel.app" className="text-purple-400 hover:text-purple-300 underline">
              support@creatortasks.vercel.app
            </a>
          </p>
          <p><span className="text-foreground/70 font-medium">Payment Processor:</span> Razorpay</p>
        </div>

        <div className="mt-5 pt-5 border-t border-border">
          <p className="text-xs text-muted-foreground">
            You can also review our{" "}
            <Link href="/terms" className="text-purple-400 hover:text-purple-300 underline">Terms of Service</Link>,{" "}
            <Link href="/privacy" className="text-purple-400 hover:text-purple-300 underline">Privacy Policy</Link>, and{" "}
            <Link href="/refund-policy" className="text-purple-400 hover:text-purple-300 underline">Refund & Cancellation Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
