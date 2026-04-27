import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "April 12, 2026";

export function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors group">
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Home
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">1. Agreement to Terms</h2>
          <p>
            By accessing or using CreatorTasks ("the Platform", "we", "us", or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.
          </p>
          <p className="mt-3">
            CreatorTasks is an online marketplace that connects content creators ("Creators") with clients seeking AI-generated content such as reels, hooks, thumbnails, and related digital deliverables ("Clients"). Together, Creators and Clients are referred to as "Users".
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">2. Eligibility</h2>
          <p>You must be at least 18 years old and capable of entering into a legally binding contract to use this Platform. By using the Platform, you represent and warrant that you meet these requirements.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">3. Account Registration</h2>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>You must register for an account to post tasks, apply to tasks, or make payments.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must provide accurate, complete, and current information during registration.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">4. Platform Services</h2>
          <p>CreatorTasks provides a marketplace platform where:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>Clients post tasks describing content they need.</li>
            <li>Creators apply to tasks or are invited by Clients.</li>
            <li>Clients select a Creator and fund the task using an escrow payment.</li>
            <li>Creators complete and submit their work for review.</li>
            <li>Clients approve the work, triggering payment release to the Creator.</li>
          </ul>
          <p className="mt-3">CreatorTasks acts solely as an intermediary marketplace and is not a party to any agreement between Clients and Creators.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">5. Payments and Escrow</h2>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>All payments are processed in Indian Rupees (INR) via Razorpay.</li>
            <li>When a Client posts a task, the task amount is held in escrow by CreatorTasks.</li>
            <li>CreatorTasks charges a <strong className="text-foreground">10% platform commission</strong> on each completed task, deducted from the task payment.</li>
            <li>Payment is released to the Creator only after the Client approves the submitted work.</li>
            <li>Wallet balances can be withdrawn to the Creator's registered UPI ID.</li>
            <li>Deposits and wallet top-ups are non-refundable once a task has been funded.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibent text-foreground mb-3">6. Content and Intellectual Property</h2>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>Upon approval and full payment, the Client receives full rights to the delivered content.</li>
            <li>Creators must ensure that submitted work is original and does not infringe third-party rights.</li>
            <li>Users must not upload, share, or submit content that is illegal, defamatory, obscene, or violates any third-party intellectual property rights.</li>
            <li>CreatorTasks retains the right to display anonymised task descriptions for promotional purposes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">7. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>Use the Platform for any unlawful purpose.</li>
            <li>Circumvent the Platform to transact directly with other Users to avoid platform fees.</li>
            <li>Submit false, misleading, or fraudulent information.</li>
            <li>Harass, abuse, or harm other Users.</li>
            <li>Use automated tools to scrape, crawl, or extract data from the Platform.</li>
            <li>Impersonate any person or entity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">8. Disputes Between Users</h2>
          <p>
            If a dispute arises between a Client and Creator, either party may raise a dispute through the Platform. CreatorTasks will review the case and make a final determination on fund release or refund. Our decision in disputes is final and binding.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">9. Termination</h2>
          <p>
            CreatorTasks reserves the right to suspend or terminate your account at any time, with or without notice, for violation of these Terms or for any other reason at our sole discretion. You may also delete your account at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">10. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, CreatorTasks shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform. Our total liability to you for any claim shall not exceed the amount you paid to us in the three months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">11. Disclaimer of Warranties</h2>
          <p>
            The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">12. Governing Law</h2>
          <p>
            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">13. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of material changes by updating the "Last updated" date. Continued use of the Platform after changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">14. Contact</h2>
          <p>
            For questions about these Terms, please contact us at{" "}
            <a href="mailto:support@creatortasks.vercel.app" className="text-purple-400 hover:text-purple-300 underline">
              support@creatortasks.vercel.app
            </a>{" "}
            or visit our <Link href="/contact" className="text-purple-400 hover:text-purple-300 underline">Contact page</Link>.
          </p>
        </section>

      </div>
    </div>
  );
}
