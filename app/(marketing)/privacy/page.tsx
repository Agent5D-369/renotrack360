export const metadata = { title: "Privacy Policy — RenoTrack360" };

const LAST_UPDATED = "May 10, 2026";
const COMPANY = "RenoTrack360";
const CONTACT_EMAIL = "privacy@renotrack360.com";
const APP_URL = "https://www.renotrack360.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-sm leading-relaxed text-slate-700">
      <h1 className="mb-2 text-3xl font-black text-slate-900">{COMPANY} Privacy Policy</h1>
      <p className="mb-10 text-xs text-slate-400">Last updated: {LAST_UPDATED}</p>

      <Section title="1. Who we are">
        <p>{COMPANY} (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the renovation operations platform at {APP_URL}. We help renovation contractors manage leads, estimates, jobs, invoices, and client communication.</p>
      </Section>

      <Section title="2. Information we collect">
        <ul>
          <li><strong>Account data:</strong> name, email address, company name, and password (hashed — we never store plaintext passwords).</li>
          <li><strong>Business data:</strong> leads, estimates, job records, invoices, change orders, client profiles, and project photos you create inside the platform.</li>
          <li><strong>Usage data:</strong> pages visited, features used, session duration, and error logs. Collected via Sentry (error monitoring) and PostHog (product analytics).</li>
          <li><strong>Payment data:</strong> billing is handled by Stripe. We store only your Stripe customer ID — we never see or store raw card numbers.</li>
          <li><strong>Google sign-in:</strong> if you sign in with Google, we receive your name and email address from Google. We do not access your Google Drive, Gmail, or any other Google service.</li>
        </ul>
      </Section>

      <Section title="3. How we use your information">
        <ul>
          <li>Provide and improve the {COMPANY} platform</li>
          <li>Send transactional emails (estimates, invoices, approval requests, weekly reports) on your behalf to your clients</li>
          <li>Process subscription billing via Stripe</li>
          <li>Monitor application health and fix errors</li>
          <li>Understand how features are used to improve the product</li>
        </ul>
        <p className="mt-3">We do not sell your data. We do not use your business data to train AI models without your explicit consent.</p>
      </Section>

      <Section title="4. Data sharing">
        <p>We share data only with the following service providers, and only to the extent necessary to operate the platform:</p>
        <ul>
          <li><strong>Railway</strong> — cloud hosting and database infrastructure</li>
          <li><strong>Stripe</strong> — subscription billing and payment processing</li>
          <li><strong>Resend</strong> — transactional email delivery</li>
          <li><strong>Cloudinary</strong> — file and image storage</li>
          <li><strong>Sentry</strong> — error monitoring</li>
          <li><strong>PostHog</strong> — product analytics</li>
          <li><strong>Google</strong> — OAuth sign-in (if used)</li>
        </ul>
        <p className="mt-3">We do not share your data with advertisers, data brokers, or third-party marketing platforms.</p>
      </Section>

      <Section title="5. Your client data">
        <p>The names, emails, phone numbers, and project details of your clients belong to you. You are the data controller for your clients&apos; information. We process it as a data processor on your behalf. You are responsible for having appropriate permissions to store and use your clients&apos; data in {COMPANY}.</p>
      </Section>

      <Section title="6. Data retention">
        <p>We retain your account data for as long as your account is active. If you cancel, we retain data for 90 days to allow recovery, then delete it. You may request immediate deletion by contacting us.</p>
      </Section>

      <Section title="7. Security">
        <p>We use HTTPS everywhere, bcrypt password hashing, server-side session management, and role-based access controls. We regularly review our security posture. No system is perfectly secure — if you discover a vulnerability, please contact us at {CONTACT_EMAIL}.</p>
      </Section>

      <Section title="8. Cookies">
        <p>We use a single session cookie to keep you logged in. We do not use advertising cookies or third-party tracking cookies. PostHog analytics uses localStorage, not cookies.</p>
      </Section>

      <Section title="9. Children">
        <p>{COMPANY} is designed for business use. We do not knowingly collect data from anyone under 18. If you believe a minor has created an account, contact us and we will delete it.</p>
      </Section>

      <Section title="10. Your rights">
        <p>Depending on your location, you may have the right to access, correct, export, or delete your personal data. To exercise these rights, email {CONTACT_EMAIL}. We will respond within 30 days.</p>
      </Section>

      <Section title="11. Changes to this policy">
        <p>We may update this policy as the product evolves. We will notify subscribers by email for material changes. The &quot;last updated&quot; date at the top reflects the current version.</p>
      </Section>

      <Section title="12. Contact">
        <p>Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a></p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-bold text-slate-900">{title}</h2>
      <div className="grid gap-2 [&_ul]:ml-5 [&_ul]:grid [&_ul]:gap-1.5 [&_ul]:list-disc">{children}</div>
    </section>
  );
}
