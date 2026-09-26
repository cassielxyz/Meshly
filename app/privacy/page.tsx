import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Meshly handles account, storage, file metadata, and Google-authorized data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="Your storage stays yours."
      intro="This policy explains what information Meshly needs to operate a connected-cloud workspace, how that information is used, and the boundaries of the current encryption design."
    >
      <section>
        <h2>1. What Meshly processes</h2>
        <p className="mt-4">Meshly processes only the information needed to authenticate you, connect storage that you authorize, operate the logical filesystem, and provide features such as integrity checks, recovery and sharing.</p>
        <ul className="mt-4">
          <li><strong>Account identity:</strong> information returned by your sign-in provider, such as name, email address and profile image.</li>
          <li><strong>Storage authorization:</strong> OAuth credentials and related connection metadata needed to access storage you explicitly connect. Refresh tokens are encrypted at rest.</li>
          <li><strong>Storage health and quota:</strong> provider-reported capacity, usage and connection health.</li>
          <li><strong>Meshly file metadata:</strong> logical names, folders, MIME types, sizes, integrity hashes, provider references, encrypted-object metadata, timestamps and status information required to manage files.</li>
          <li><strong>Settings and feature data:</strong> preferences, activity needed for product operation, recovery metadata and share configuration you create.</li>
        </ul>
      </section>

      <section>
        <h2>2. Managed file content and encryption</h2>
        <p className="mt-4">Every new Meshly-managed file is encrypted before its bytes are stored by the cloud provider. Providers receive the encrypted managed object rather than the original managed-file bytes.</p>
        <p className="mt-4">The current design is <strong>not zero-knowledge</strong>. Meshly&apos;s authenticated backend participates in file-key handling for upload planning and download/decryption. Plaintext file keys are not intended to be persisted in PostgreSQL or recovery manifests.</p>
        <p className="mt-4">Legacy files created before the encrypted managed-file format, and content indexed from an external provider, can follow different compatibility paths.</p>
      </section>

      <section>
        <h2>3. Google-authorized data</h2>
        <p className="mt-4">Meshly uses Google account and Drive access only to provide user-requested Meshly functionality: authentication, connected-account management, quota/health display, managed uploads/downloads, supported indexing, integrity and recovery operations.</p>
        <p className="mt-4">Meshly does not sell Google user data or use it for advertising. Managed mode is designed around narrower Drive permissions for Meshly-created or app-authorized content; optional Full Drive functionality uses broader access and should only be enabled when the deployment satisfies applicable Google requirements.</p>
      </section>

      <section>
        <h2>4. How information is used</h2>
        <ul className="mt-4">
          <li>authenticate sessions and protect account access;</li>
          <li>connect, display and operate storage that you authorize;</li>
          <li>plan encrypted uploads and retrieve managed files;</li>
          <li>verify integrity, detect failures and support recovery;</li>
          <li>apply sharing controls that you configure;</li>
          <li>maintain security, diagnose failures and prevent abuse.</li>
        </ul>
      </section>

      <section>
        <h2>5. Sharing and third-party providers</h2>
        <p className="mt-4">When you connect a cloud provider, that provider also processes data under its own terms and privacy policy. Meshly does not control a provider&apos;s independent practices.</p>
        <p className="mt-4">If you intentionally create a Meshly public share, the selected content can become accessible to recipients of that share subject to the password, expiry, download-cap and revocation controls you configure.</p>
      </section>

      <section>
        <h2>6. Retention and controls</h2>
        <p className="mt-4">Meshly retains account, connection and logical-file metadata for as long as it is needed to operate the workspace or preserve managed-file dependencies. A storage connection cannot be safely removed while managed objects still depend on it unless those dependencies are resolved.</p>
        <p className="mt-4">You can remove content through Meshly&apos;s file controls, disconnect eligible storage connections, revoke provider authorization through the provider, and stop using the service. Some operational or backup records may remain for a limited period where required for security, recovery or system integrity.</p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p className="mt-4">Meshly uses controls including encrypted OAuth refresh tokens, authenticated encryption for new managed files, scoped authorization, PKCE/state for OAuth, secure session cookies, integrity verification and restrictive web security headers. No internet service can guarantee absolute security.</p>
        <p className="mt-4">Please do not publish secrets, private file contents or sensitive security reports in public issues. See the project&apos;s <Link href="https://github.com/cassielxyz/Meshly/blob/main/SECURITY.md">security policy</Link> for reporting guidance.</p>
      </section>

      <section>
        <h2>8. Changes and questions</h2>
        <p className="mt-4">This policy may change as Meshly adds providers or features. Material product changes should be reflected here before they are described as production-ready.</p>
        <p className="mt-4">For general privacy questions, use the project&apos;s <Link href="https://github.com/cassielxyz/Meshly">repository contact channels</Link> without posting credentials, private files or other sensitive information publicly.</p>
      </section>
    </LegalPage>
  );
}
