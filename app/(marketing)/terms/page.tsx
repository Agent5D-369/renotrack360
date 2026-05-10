export const metadata = { title: "Terms of Service — RenoTrack360" };

const LAST_UPDATED = "May 10, 2026";
const COMPANY = "RenoTrack360";
const CONTACT_EMAIL = "legal@renotrack360.com";
const APP_URL = "https://renotrack360.com";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-sm leading-relaxed text-slate-700">
      <h1 className="mb-2 text-3xl font-black text-slate-900">{COMPANY} Terms of Service</h1>
      <p className="mb-10 text-xs text-slate-400">Last updated: {LAST_UPDATED} · Effective upon account creation</p>

      <Section title="1. Acceptance">
        <p>By creating an account or using {COMPANY} at {APP_URL}, you agree to these Terms. If you are using {COMPANY} on behalf of a business, you represent that you have authority to bind that business to these Terms.</p>
      </Section>

      <Section title="2. The service">
        <p>{COMPANY} is a renovation operations platform for contractors. It includes lead tracking, estimating, job management, invoicing, client communication, and related tools. We reserve the right to modify, add, or discontinue features with reasonable notice.</p>
      </Section>

      <Section title="3. Your account">
        <ul>
          <li>You are responsible for keeping your login credentials secure.</li>
          <li>You may not share your account with others outside your organization.</li>
          <li>You must provide accurate information when creating your account.</li>
          <li>You must be at least 18 years old to create an account.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Use {COMPANY} to send spam, harass, or defraud anyone</li>
          <li>Attempt to reverse-engineer, scrape, or attack the platform</li>
          <li>Upload malware or code that could harm others</li>
          <li>Use the platform for any purpose that violates applicable law</li>
          <li>Resell or sublicense access to the platform without written permission</li>
        </ul>
      </Section>

      <Section title="5. Your content">
        <p>You own the data you input into {COMPANY} — your client lists, job records, estimates, invoices, and photos. You grant us a limited license to store, process, and transmit your data solely to provide the service. We do not claim ownership of your business data.</p>
        <p className="mt-2">You are responsible for ensuring you have the right to upload and process any data you enter, including your clients&apos; personal information.</p>
      </Section>

      <Section title="6. Subscription and billing">
        <ul>
          <li>Paid plans are billed in advance on a monthly or annual cycle via Stripe.</li>
          <li>Annual plans are non-refundable after 30 days from purchase.</li>
          <li>Monthly plans may be cancelled at any time; cancellation takes effect at the end of the current billing period.</li>
          <li>We offer a 30-day money-back guarantee on your first payment if you are not satisfied.</li>
          <li>We reserve the right to change pricing with 30 days&apos; notice. Existing subscribers on annual plans are locked at their purchased price for the current term.</li>
          <li>Failed payments will result in a grace period before account suspension.</li>
        </ul>
      </Section>

      <Section title="7. Free trial">
        <p>New accounts receive a 14-day free trial of the Pro plan. No credit card is required to start. At the end of the trial, continued access requires a paid subscription.</p>
      </Section>

      <Section title="8. Confidentiality">
        <p>We treat your business data as confidential. Our employees access your data only to provide support or investigate technical issues, and only when necessary. We do not share your data with competitors or use it to compete with you.</p>
      </Section>

      <Section title="9. Intellectual property">
        <p>{COMPANY}&apos;s platform, design, code, and branding are owned by us and protected by intellectual property law. These Terms do not transfer any ownership rights to you. You receive a limited, non-exclusive, non-transferable license to use the platform during your subscription.</p>
      </Section>

      <Section title="10. Disclaimers">
        <p>The platform is provided &quot;as is.&quot; We do not guarantee that it will be error-free or always available. We are not a law firm and do not provide legal, tax, or financial advice. Document templates in the platform are operational tools, not legal advice — have them reviewed by qualified counsel before relying on them for contracts.</p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>To the fullest extent permitted by law, our liability for any claim arising from your use of {COMPANY} is limited to the amount you paid us in the 12 months before the claim. We are not liable for indirect, incidental, or consequential damages.</p>
      </Section>

      <Section title="12. Termination">
        <p>You may cancel your account at any time. We may suspend or terminate your account for violation of these Terms, with or without notice depending on severity. Upon termination, your data is retained for 90 days before deletion.</p>
      </Section>

      <Section title="13. Governing law">
        <p>These Terms are governed by the laws of the State of Texas, United States, without regard to conflict of law principles.</p>
      </Section>

      <Section title="14. Changes to these terms">
        <p>We may update these Terms. We will provide 14 days&apos; notice by email before material changes take effect. Continued use after the effective date constitutes acceptance.</p>
      </Section>

      <Section title="15. Contact">
        <p>Questions about these Terms: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a></p>
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
