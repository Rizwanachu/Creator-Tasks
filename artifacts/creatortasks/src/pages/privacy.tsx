import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "April 12, 2026";

export function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors group">
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Home
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">1. Introduction</h2>
          <p>
            CreatorTasks ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform at{" "}
            <a href="https://creatortasks.vercel.app" className="text-purple-400 hover:text-purple-300 underline">creatortasks.vercel.app</a>.
          </p>
          <p className="mt-3">
            By using the Platform, you consent to the data practices described in this policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">2. Information We Collect</h2>
          <h3 className="text-base font-medium text-foreground/80 mt-4 mb-2">2.1 Information You Provide</h3>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Name and email address (via account registration through Clerk)</li>
            <li>Profile information: bio, skills, portfolio links, social handles</li>
            <li>UPI ID (for payment withdrawals — stored securely, never shared publicly)</li>
            <li>Task descriptions, submissions, and messages</li>
          </ul>
          <h3 className="text-base font-medium text-foreground/80 mt-4 mb-2">2.2 Information Collected Automatically</h3>
          <ul className="list-disc list-inside space-y-1.5">
            <li>IP address and browser type</li>
            <li>Pages visited and actions taken on the Platform</li>
            <li>Device information and operating system</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
          <h3 className="text-base font-medium text-foreground/80 mt-4 mb-2">2.3 Payment Information</h3>
          <p>
            Payments are processed by Razorpay. We do not store your card details or full banking credentials. Razorpay's privacy policy governs the handling of payment data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>To create and manage your account</li>
            <li>To facilitate transactions between Clients and Creators</li>
            <li>To process payments and withdrawals</li>
            <li>To send transactional notifications (task updates, payment alerts)</li>
            <li>To provide customer support</li>
            <li>To improve the Platform and develop new features</li>
            <li>To comply with legal obligations</li>
            <li>To detect and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">4. Sharing of Information</h2>
          <p>We do not sell your personal information. We may share your information with:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li><strong className="text-foreground">Other Users:</strong> Your public profile (name, bio, skills, portfolio) is visible to other Users. Your UPI ID is never shared publicly.</li>
            <li><strong className="text-foreground">Service Providers:</strong> We share data with trusted third-party providers including Clerk (authentication), Razorpay (payments), and cloud infrastructure providers.</li>
            <li><strong className="text-foreground">Legal Requirements:</strong> We may disclose information if required by law, court order, or government authority.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">5. Cookies</h2>
          <p>
            We use cookies and similar technologies to maintain your session, remember preferences, and analyse Platform usage. You can control cookies through your browser settings, but disabling them may affect Platform functionality.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">6. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting us at{" "}
            <a href="mailto:support@creatortasks.vercel.app" className="text-purple-400 hover:text-purple-300 underline">support@creatortasks.vercel.app</a>.
            Transaction records may be retained for up to 7 years for legal and accounting purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">7. Security</h2>
          <p>
            We implement industry-standard security measures to protect your data, including encrypted connections (HTTPS), secure authentication via Clerk, and access controls. However, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">8. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate personal data</li>
            <li>Request deletion of your personal data</li>
            <li>Withdraw consent where processing is based on consent</li>
          </ul>
          <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:support@creatortasks.vercel.app" className="text-purple-400 hover:text-purple-300 underline">support@creatortasks.vercel.app</a>.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">9. Third-Party Links</h2>
          <p>
            The Platform may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">10. Children's Privacy</h2>
          <p>
            The Platform is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal information, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify you of significant changes by updating the "Last updated" date. Continued use of the Platform constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">12. Contact Us</h2>
          <p>
            For privacy-related inquiries, contact us at{" "}
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
