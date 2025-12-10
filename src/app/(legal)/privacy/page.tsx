import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - ScrubBuddy',
  description: 'Privacy Policy for ScrubBuddy',
}

export default function PrivacyPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <Link
        href="/"
        className="text-blue-400 hover:text-blue-300 no-underline mb-8 inline-block"
      >
        ← Back to ScrubBuddy
      </Link>

      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-slate-400 mb-8">Last updated: December 9, 2024</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
        <p className="text-slate-300">
          ScrubBuddy (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy
          explains how we collect, use, and safeguard your information when you use our service at
          scrubbuddy.app.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>

        <h3 className="text-lg font-medium text-white mt-4 mb-2">Account Information</h3>
        <p className="text-slate-300">
          When you create an account, we collect:
        </p>
        <ul className="text-slate-300 list-disc pl-6 mt-2">
          <li>Email address</li>
          <li>Name</li>
          <li>Password (encrypted)</li>
        </ul>

        <h3 className="text-lg font-medium text-white mt-4 mb-2">Usage Data</h3>
        <p className="text-slate-300">
          We collect data you enter into the Service, including:
        </p>
        <ul className="text-slate-300 list-disc pl-6 mt-2">
          <li>Patient encounter logs (de-identified)</li>
          <li>Study progress and statistics</li>
          <li>Calendar events and schedules</li>
          <li>Clinical notes and pearls</li>
          <li>Rotation information</li>
        </ul>

        <h3 className="text-lg font-medium text-white mt-4 mb-2">Third-Party Integration Data</h3>
        <p className="text-slate-300">
          When you connect third-party services, we may receive:
        </p>
        <ul className="text-slate-300 list-disc pl-6 mt-2">
          <li><strong>Google Calendar:</strong> Calendar events, event titles, dates, and times</li>
          <li><strong>Anki:</strong> Study statistics, card counts, and review data</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
        <p className="text-slate-300">We use your information to:</p>
        <ul className="text-slate-300 list-disc pl-6 mt-2">
          <li>Provide and maintain the Service</li>
          <li>Sync your data across devices</li>
          <li>Display your progress and analytics</li>
          <li>Improve the Service based on usage patterns</li>
          <li>Send important notifications about the Service</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">4. Google Calendar Integration</h2>
        <p className="text-slate-300">
          When you connect Google Calendar to ScrubBuddy, we request access to:
        </p>
        <ul className="text-slate-300 list-disc pl-6 mt-2">
          <li>View and edit events on calendars you select</li>
          <li>View your calendar list</li>
        </ul>
        <p className="text-slate-300 mt-2">
          We use this access solely to sync calendar events between ScrubBuddy and Google Calendar.
          We do not share your Google Calendar data with any third parties. You can disconnect
          Google Calendar at any time from the Calendar settings.
        </p>
        <p className="text-slate-300 mt-2">
          <strong>Data Storage:</strong> Google Calendar tokens are encrypted and stored securely.
          Your calendar events are stored in our database to provide sync functionality.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">5. Data Storage and Security</h2>
        <p className="text-slate-300">
          Your data is stored on secure servers hosted by Railway. We implement appropriate security
          measures including:
        </p>
        <ul className="text-slate-300 list-disc pl-6 mt-2">
          <li>Encrypted data transmission (HTTPS)</li>
          <li>Encrypted password storage</li>
          <li>Secure OAuth token storage</li>
          <li>Regular security updates</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">6. Data Sharing</h2>
        <p className="text-slate-300">
          We do not sell, trade, or rent your personal information to third parties. We may share
          data only in the following circumstances:
        </p>
        <ul className="text-slate-300 list-disc pl-6 mt-2">
          <li>With your explicit consent</li>
          <li>To comply with legal obligations</li>
          <li>To protect our rights or safety</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">7. Data Retention</h2>
        <p className="text-slate-300">
          We retain your data for as long as your account is active. You can request deletion of
          your account and all associated data at any time by contacting us. Upon account deletion,
          your data will be permanently removed within 30 days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">8. Your Rights</h2>
        <p className="text-slate-300">You have the right to:</p>
        <ul className="text-slate-300 list-disc pl-6 mt-2">
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data</li>
          <li>Disconnect third-party integrations</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">9. Cookies</h2>
        <p className="text-slate-300">
          We use essential cookies for authentication and session management. We do not use
          tracking cookies or third-party analytics cookies.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">10. Changes to This Policy</h2>
        <p className="text-slate-300">
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by posting a notice on the Service. Your continued use of the Service after
          changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">11. Contact Us</h2>
        <p className="text-slate-300">
          For questions about this Privacy Policy or to exercise your rights, please contact us at{' '}
          <a href="mailto:support@scrubbuddy.app" className="text-blue-400 hover:text-blue-300">
            support@scrubbuddy.app
          </a>
        </p>
      </section>
    </div>
  )
}
