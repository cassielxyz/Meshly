import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for using Meshly and connecting third-party cloud storage.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of Use"
      title="Use Meshly responsibly."
      intro="These terms describe the basic rules for using Meshly, connecting third-party storage, and working with encrypted managed files."
    >
      <section>
        <h2>1. Using Meshly</h2>
        <p className="mt-4">You may use Meshly only with accounts, files and cloud storage that you own or are authorized to access. You are responsible for the content you upload, organize, share or retrieve through the service.</p>
      </section>

      <section>
        <h2>2. Connected providers</h2>
        <p className="mt-4">Meshly connects to third-party cloud providers using their supported authentication and storage interfaces. Your use of those providers remains subject to their own terms, policies, quotas, rate limits and account rules.</p>
        <p className="mt-4">Meshly must not be used to bypass provider payment requirements, advertising, quotas, security controls, access restrictions or rate limits.</p>
      </section>

      <section>
        <h2>3. Google Drive behavior</h2>
        <p className="mt-4">For Meshly-managed Google storage, one managed file is stored whole in one healthy Google account selected automatically or explicitly by you. Google cross-account managed-file sharding is not part of the current product model.</p>
        <p className="mt-4">Optional broader Full Drive functionality can require additional provider review or deployment eligibility and may not be available in every hosted deployment.</p>
      </section>

      <section>
        <h2>4. Encryption and security boundaries</h2>
        <p className="mt-4">New Meshly-managed files use the project&apos;s encrypted managed-file format before provider storage. The current architecture is backend-trusted and is <strong>not zero-knowledge</strong>. Do not rely on Meshly as the sole backup of irreplaceable data or as a substitute for your own security and recovery practices.</p>
      </section>

      <section>
        <h2>5. Sharing</h2>
        <p className="mt-4">You are responsible for public share links you create and for choosing appropriate passwords, expiry times and download limits. Anyone who receives an active share link may be able to access the shared content subject to the controls you configured.</p>
      </section>

      <section>
        <h2>6. Prohibited use</h2>
        <ul className="mt-4">
          <li>accessing storage or files without authorization;</li>
          <li>using Meshly to distribute unlawful content or violate third-party rights;</li>
          <li>attempting to evade provider or Meshly security, quota, billing or rate-limit controls;</li>
          <li>interfering with service availability or other users;</li>
          <li>uploading malware or intentionally abusing sharing, recovery or transfer systems.</li>
        </ul>
      </section>

      <section>
        <h2>7. Availability and changes</h2>
        <p className="mt-4">Meshly is an evolving project. Features, provider support and hosted availability can change as APIs, provider policies and the project itself change. Experimental or planned providers are not guaranteed to be available.</p>
      </section>

      <section>
        <h2>8. No guarantee of uninterrupted service</h2>
        <p className="mt-4">Meshly is provided on an as-available basis. Cloud provider outages, API changes, authentication revocations, storage limits, software defects or deployment failures can interrupt access. Keep independent backups of important files.</p>
      </section>

      <section>
        <h2>9. Privacy and security</h2>
        <p className="mt-4">Use of Meshly is also subject to the <Link href="/privacy">Privacy Policy</Link>. Security-sensitive reports should follow the project&apos;s <Link href="https://github.com/cassielxyz/Meshly/blob/main/SECURITY.md">security policy</Link> rather than being posted with sensitive details in a public issue.</p>
      </section>

      <section>
        <h2>10. Changes to these terms</h2>
        <p className="mt-4">These terms may be updated as Meshly changes. Continued use after an updated version is published means the updated terms apply to subsequent use of the service.</p>
      </section>
    </LegalPage>
  );
}
