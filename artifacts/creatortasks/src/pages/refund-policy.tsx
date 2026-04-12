import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "April 12, 2026";

export function RefundPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors group">
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Home
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Refund & Cancellation Policy</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Overview</h2>
          <p>
            CreatorTasks uses an escrow-based payment system to protect both Clients and Creators. This policy explains how payments, cancellations, and refunds work on the Platform.
          </p>
          <p className="mt-3">
            All payments are processed in Indian Rupees (INR) through Razorpay.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">1. How Escrow Works</h2>
          <p>When a Client selects a Creator for a task:</p>
          <ol className="list-decimal list-inside space-y-2 mt-2">
            <li>The task amount is charged from the Client's wallet and held in escrow by CreatorTasks.</li>
            <li>The Creator completes and submits the work.</li>
            <li>The Client reviews the submission and either approves, requests revision, or rejects it.</li>
            <li>On approval, the escrowed funds (minus the 10% platform commission) are released to the Creator's wallet.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">2. Wallet Top-Up (Deposits)</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Wallet top-ups are used to fund tasks on the Platform.</li>
            <li>Deposits are <strong className="text-foreground">non-refundable</strong> once credited to your CreatorTasks wallet.</li>
            <li>If a deposit fails to process, the amount will be refunded to the original payment method within 5–7 business days.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">3. Task Cancellation — Before Work Begins</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>If a Client cancels a task <strong className="text-foreground">before a Creator has been selected</strong>, the full amount is returned to the Client's wallet.</li>
            <li>If a Client cancels <strong className="text-foreground">after selecting a Creator but before work is submitted</strong>, the funds are returned to the Client's wallet, and the Creator is notified.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">4. Task Cancellation — After Work is Submitted</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Once a Creator submits work, the Client may <strong className="text-foreground">request a revision</strong> (up to the number of revisions agreed upon in the task).</li>
            <li>If the Client <strong className="text-foreground">rejects</strong> the work after the allowed revisions, the dispute process is triggered.</li>
            <li>CreatorTasks will review the submitted work and communication, and determine whether a refund to the Client or payment to the Creator is appropriate.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">5. Dispute Resolution</h2>
          <p>
            Either party may raise a dispute through the Platform dashboard. CreatorTasks will act as a neutral mediator and review:
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>The original task description and requirements</li>
            <li>The submitted deliverables</li>
            <li>Any communications between Client and Creator</li>
          </ul>
          <p className="mt-3">
            Our decision on dispute resolution is final and binding on both parties. Outcomes may include:
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>Full payment to the Creator (if work meets requirements)</li>
            <li>Partial payment to the Creator</li>
            <li>Full refund to the Client's wallet (if work is deemed unsatisfactory)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">6. Platform Commission</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>CreatorTasks charges a <strong className="text-foreground">10% platform commission</strong> on the task value, deducted from the payment released to the Creator.</li>
            <li>The platform commission is <strong className="text-foreground">non-refundable</strong> once work has been approved.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">7. Wallet Withdrawals</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Creators can withdraw their wallet balance to their registered UPI ID.</li>
            <li>Withdrawals are typically processed within 2–5 business days.</li>
            <li>Wallet balances cannot be transferred back to original payment methods — only to a registered UPI ID.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">8. Exceptions</h2>
          <p>Refunds may be issued at CreatorTasks' sole discretion in exceptional circumstances, such as:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>Technical errors causing duplicate charges</li>
            <li>Verified fraudulent activity</li>
            <li>Platform-side errors preventing task completion</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">9. No Physical Goods</h2>
          <p>
            CreatorTasks is a digital services marketplace. No physical goods are sold or shipped through the Platform. All deliverables are digital content files.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">10. Contact for Refund Requests</h2>
          <p>
            To raise a refund or cancellation request, please contact us at{" "}
            <a href="mailto:support@creatortasks.vercel.app" className="text-purple-400 hover:text-purple-300 underline">
              support@creatortasks.vercel.app
            </a>{" "}
            with your registered email address and transaction details, or use our{" "}
            <Link href="/contact" className="text-purple-400 hover:text-purple-300 underline">Contact page</Link>.
            We aim to respond to all refund requests within 2 business days.
          </p>
        </section>

      </div>
    </div>
  );
}
