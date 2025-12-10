import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service - ScrubBuddy',
  description: 'Terms of Service for ScrubBuddy',
}

export default function TermsPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <Link
        href="/"
        className="text-blue-400 hover:text-blue-300 no-underline mb-8 inline-block"
      >
        ← Back to ScrubBuddy
      </Link>

      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-slate-400 mb-8">Last updated: December 9, 2024</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
        <p className="text-slate-300">
          By accessing or using ScrubBuddy (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
          If you do not agree to these terms, please do not use the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
        <p className="text-slate-300">
          ScrubBuddy is a personal productivity application designed for medical students to track their
          clinical rotations, patient encounters, study progress, and related activities. The Service
          includes features such as:
        </p>
        <ul className="text-slate-300 list-disc pl-6 mt-2">
          <li>Patient encounter logging</li>
          <li>UWorld question bank tracking</li>
          <li>Anki study statistics sync</li>
          <li>Calendar and scheduling</li>
          <li>Integration with Google Calendar</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">3. User Accounts</h2>
        <p className="text-slate-300">
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activities that occur under your account. You agree to notify us immediately of any unauthorized
          use of your account.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">4. User Data</h2>
        <p className="text-slate-300">
          You retain ownership of all data you enter into ScrubBuddy. We do not claim ownership over your
          patient logs, study notes, or any other content you create. You are responsible for ensuring that
          any patient information you log complies with HIPAA and your institution&apos;s policies regarding
          patient privacy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">5. Third-Party Integrations</h2>
        <p className="text-slate-300">
          ScrubBuddy integrates with third-party services including Google Calendar. When you connect these
          services, you authorize ScrubBuddy to access your data from these services as described in our
          Privacy Policy. Your use of third-party services is subject to their respective terms of service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">6. Prohibited Uses</h2>
        <p className="text-slate-300">You agree not to:</p>
        <ul className="text-slate-300 list-disc pl-6 mt-2">
          <li>Use the Service for any unlawful purpose</li>
          <li>Share your account credentials with others</li>
          <li>Attempt to gain unauthorized access to the Service</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Store protected health information (PHI) that could identify specific patients</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">7. Disclaimer of Warranties</h2>
        <p className="text-slate-300">
          THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
          WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
        <p className="text-slate-300">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, SCRUBBUDDY SHALL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">9. Changes to Terms</h2>
        <p className="text-slate-300">
          We reserve the right to modify these Terms at any time. We will notify users of significant
          changes by posting a notice on the Service. Your continued use of the Service after changes
          constitutes acceptance of the new Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">10. Contact</h2>
        <p className="text-slate-300">
          For questions about these Terms, please contact us at{' '}
          <a href="mailto:support@scrubbuddy.app" className="text-blue-400 hover:text-blue-300">
            support@scrubbuddy.app
          </a>
        </p>
      </section>
    </div>
  )
}
