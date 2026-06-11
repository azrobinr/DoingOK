export default function Donor() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="mb-6">Support DoingOK's Mission</h1>
          <p className="text-lg text-slate-600 mb-8">
            Help us protect vulnerable populations through compassionate, automated wellness monitoring.
            Every donation makes a direct impact on the lives of seniors, disabled individuals, and those with mental health concerns.
          </p>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-12">Your Impact</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-primary-50 p-8 rounded-lg text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">TBD</div>
              <p className="text-slate-600 font-semibold">Users Monitored</p>
              <p className="text-sm text-slate-500 mt-2">
                Vulnerable individuals receiving daily wellness support
              </p>
            </div>
            <div className="bg-primary-50 p-8 rounded-lg text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">TBD</div>
              <p className="text-slate-600 font-semibold">Trusted Contacts</p>
              <p className="text-sm text-slate-500 mt-2">
                Family and community members notified for timely help
              </p>
            </div>
            <div className="bg-primary-50 p-8 rounded-lg text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">TBD</div>
              <p className="text-slate-600 font-semibold">Wellness Check-Ins</p>
              <p className="text-sm text-slate-500 mt-2">
                Daily confirmations of safety and well-being
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How Donations Help */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-12">How Your Donation Helps</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="text-2xl">🔧</div>
              <div>
                <h3 className="font-semibold text-slate-900">Product Development</h3>
                <p className="text-slate-600 mt-2">
                  Donations fund engineering, design, and testing to build a user-friendly, accessible platform for all users.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-2xl">🔒</div>
              <div>
                <h3 className="font-semibold text-slate-900">Infrastructure & Security</h3>
                <p className="text-slate-600 mt-2">
                  Secure hosting, encryption, and compliance (HIPAA, accessibility standards) to protect user data.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-2xl">📢</div>
              <div>
                <h3 className="font-semibold text-slate-900">Community Outreach</h3>
                <p className="text-slate-600 mt-2">
                  Educational materials and partnerships with nonprofits serving seniors and disabled communities.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-2xl">⚖️</div>
              <div>
                <h3 className="font-semibold text-slate-900">Legal & Compliance</h3>
                <p className="text-slate-600 mt-2">
                  Legal counsel to ensure HIPAA compliance, privacy protection, and responsible data handling.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-2xl">🎓</div>
              <div>
                <h3 className="font-semibold text-slate-900">Research & Evaluation</h3>
                <p className="text-slate-600 mt-2">
                  Funding for studies measuring the impact of DoingOK on health outcomes and quality of life.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Donation Methods */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center mb-12">Ways to Give</h2>

          {/* Online Donation Placeholder */}
          <div className="bg-primary-50 p-8 rounded-lg mb-8 text-center border-2 border-primary-200">
            <h3 className="text-lg font-semibold text-primary-700 mb-4">💳 Online Donation</h3>
            <p className="text-slate-600 mb-6">
              Secure online donations coming soon. We'll accept credit cards, PayPal, and other digital payment methods.
            </p>
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Donate Online (Coming Soon)
            </button>
          </div>

          {/* Zelle Placeholder */}
          <div className="bg-slate-50 p-8 rounded-lg mb-8 border-2 border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">💰 Zelle Transfer</h3>
            <p className="text-slate-600 mb-4">
              You can send donations via Zelle to our nonprofit account. For details, please email us.
            </p>
            <div className="bg-white p-4 rounded border border-slate-300">
              <p className="text-sm text-slate-600">
                <strong>Email for Zelle details:</strong> donations@doingok.org
              </p>
            </div>
          </div>

          {/* Mailing Address */}
          <div className="bg-blue-50 p-8 rounded-lg border-2 border-blue-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">🏪 Mail a Check</h3>
            <p className="text-slate-600 mb-6">
              If you prefer to mail a check or other donation, please send it to:
            </p>
            <div className="bg-white p-6 rounded border border-slate-300 text-slate-700 font-mono text-sm whitespace-pre-line">
{`DoingOK
12720 W Hilltop Rd.
Tucson, AZ 85736`}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Please make checks payable to "DoingOK"
            </p>
          </div>
        </div>
      </section>

      {/* Nonprofit Status */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-8">Nonprofit Status</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Tax-Deductible</h3>
              <p className="text-slate-600">
                DoingOK is a registered 501(c)(3) nonprofit organization. Your donation is tax-deductible.
                EIN: [TBD]
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Transparency</h3>
              <p className="text-slate-600">
                We're committed to transparency in how we use donations. Financial reports and impact metrics
                are available upon request.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 text-center bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-semibold mb-4">Questions About Giving?</h3>
          <p className="text-slate-600 mb-6">
            We'd love to hear from you. If you have questions about donations, sponsorships, or partnerships, please reach out.
          </p>
          <a
            href="mailto:donations@doingok.org"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  );
}
