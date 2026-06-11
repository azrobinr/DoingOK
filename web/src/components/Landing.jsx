export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="mb-6">Wellness Check-In. Peace of Mind.</h1>
        <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          DoingOK is a daily wellness monitoring app that connects vulnerable individuals with
          trusted contacts through automated, compassionate check-ins.
        </p>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
          Get Started
        </button>
      </section>

      {/* Team & Mission Section */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-center mb-12">Our Mission</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">👥</div>
              <h3>Who We Serve</h3>
              <p className="text-slate-600 mt-4">
                Seniors, disabled individuals, and those with mental health concerns deserve
                compassionate monitoring and support.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">❤️</div>
              <h3>Our Promise</h3>
              <p className="text-slate-600 mt-4">
                Protect well-being through proactive daily wellness check-ins and automated alert
                escalation to trusted contacts.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔐</div>
              <h3>Privacy First</h3>
              <p className="text-slate-600 mt-4">
                Your data is secure, your autonomy respected. You control who sees your wellness status.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Benefits Section */}
      <section className="bg-gradient-to-br from-primary-50 to-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="text-3xl mb-4">📱</div>
              <h3>Simple Daily Check-In</h3>
              <p className="text-slate-600 mt-4">
                Each day, you receive a gentle notification. Just tap "OK" to confirm you're doing well.
                Takes less than 5 seconds.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="text-3xl mb-4">👨‍👩‍👧</div>
              <h3>Trusted Contact Network</h3>
              <p className="text-slate-600 mt-4">
                You choose who to notify: family, friends, neighbors, or volunteers. They're contacted
                in the order you select.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="text-3xl mb-4">⚠️</div>
              <h3>Smart Escalation</h3>
              <p className="text-slate-600 mt-4">
                Miss a check-in? The system automatically escalates alerts to your trusted contacts,
                starting with your closest connections.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="text-3xl mb-4">🛡️</div>
              <h3>Peace of Mind</h3>
              <p className="text-slate-600 mt-4">
                For users and caregivers alike. Know that help is on the way if needed, without
                invasive monitoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Subsection */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-center mb-12">Frequently Asked Questions</h2>

          <div className="space-y-8">
            {/* Technical Flow */}
            <div>
              <h3 className="text-primary-600 mb-4">🔧 How Does It Work Technically?</h3>
              <div className="space-y-6 text-slate-700">
                <div>
                  <h4 className="font-semibold mb-2">Daily Check-In Prompts</h4>
                  <p>
                    Every morning (or at your chosen time), DoingOK sends a push notification to your phone.
                    You tap "OK" to confirm you're doing well. If you don't respond within your configured window
                    (e.g., 2 hours), the system triggers an alert.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Missed Check-In Detection</h4>
                  <p>
                    Our background job system monitors all pending check-ins every 5 minutes. When it detects a missed
                    check-in, it creates an alert record and sends it to GoAlert, our on-call management platform.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Smart Escalation</h4>
                  <p>
                    GoAlert contacts your trusted contacts in the priority order you've set. It starts with SMS, email,
                    or phone calls (your choice). Each step has a configurable wait time before moving to the next contact.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Late Check-Ins & Resolution</h4>
                  <p>
                    If you respond after the window closes, the system automatically closes the alert in GoAlert. Your
                    contacts are notified that you've checked in and no further escalation is needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Safety & Compliance */}
            <div className="border-t pt-8">
              <h3 className="text-primary-600 mb-4">🔐 Safety & Compliance</h3>
              <div className="space-y-6 text-slate-700">
                <div>
                  <h4 className="font-semibold mb-2">Data Privacy</h4>
                  <p>
                    DoingOK treats your wellness data with the utmost care. We use industry-standard encryption, secure
                    databases, and strict access controls. Your check-in history is only visible to you and your chosen
                    trusted contacts.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Your Control</h4>
                  <p>
                    You set the rules. Choose your check-in schedule, response window, and trusted contacts. You can
                    update your preferences at any time. You're in control, always.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Legal Compliance</h4>
                  <p>
                    DoingOK is designed with HIPAA and accessibility compliance in mind. We're working with legal experts
                    to ensure our Terms of Service and data handling practices meet the highest standards.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Audit Trail</h4>
                  <p>
                    All check-ins, alerts, and contact escalations are recorded with timestamps for transparency and
                    accountability.
                  </p>
                </div>
              </div>
            </div>

            {/* Common Questions */}
            <div className="border-t pt-8">
              <h3 className="text-primary-600 mb-4">❓ Common Questions</h3>
              <div className="space-y-4">
                <details className="group">
                  <summary className="font-semibold cursor-pointer text-primary-600 hover:text-primary-700">
                    What if I forget to check in?
                  </summary>
                  <p className="mt-2 text-slate-600">
                    That's exactly what DoingOK is designed for. You have a configurable grace period (default 2 hours)
                    to respond. If you don't, your trusted contacts are notified automatically.
                  </p>
                </details>

                <details className="group">
                  <summary className="font-semibold cursor-pointer text-primary-600 hover:text-primary-700">
                    How often do I need to check in?
                  </summary>
                  <p className="mt-2 text-slate-600">
                    You decide. Most users choose daily check-ins, but you can set it to twice daily, weekly, or any
                    schedule that works for you.
                  </p>
                </details>

                <details className="group">
                  <summary className="font-semibold cursor-pointer text-primary-600 hover:text-primary-700">
                    Is DoingOK a replacement for emergency services?
                  </summary>
                  <p className="mt-2 text-slate-600">
                    No. DoingOK is a wellness monitoring tool, not an emergency alert system. For life-threatening
                    emergencies, always call 911 (or your local emergency number).
                  </p>
                </details>

                <details className="group">
                  <summary className="font-semibold cursor-pointer text-primary-600 hover:text-primary-700">
                    What if I'm traveling or away from my phone?
                  </summary>
                  <p className="mt-2 text-slate-600">
                    You can mark yourself as temporarily unavailable before travel. This pauses check-in prompts for a
                    period you specify, and prevents alerts from being triggered.
                  </p>
                </details>

                <details className="group">
                  <summary className="font-semibold cursor-pointer text-primary-600 hover:text-primary-700">
                    How much does DoingOK cost?
                  </summary>
                  <p className="mt-2 text-slate-600">
                    DoingOK is free during the pilot phase. As a nonprofit, our goal is to serve vulnerable populations
                    affordably. We're committed to keeping the core service low-cost or free.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
