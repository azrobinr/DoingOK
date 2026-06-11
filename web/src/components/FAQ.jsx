export default function FAQ() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-slate-600">
            Get answers to common questions about DoingOK, how it works, and how to use it.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Technical Flow Section */}
          <section>
            <h2 className="text-primary-600 mb-6">🔧 How Does It Work Technically?</h2>
            <div className="space-y-6 text-slate-700">
              <div>
                <h3 className="font-semibold mb-2">Daily Check-In Prompts</h3>
                <p>
                  Every morning (or at your chosen time), DoingOK sends a push notification to your phone.
                  You tap "OK" to confirm you're doing well. If you don't respond within your configured window
                  (e.g., 2 hours), the system triggers an alert.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Missed Check-In Detection</h3>
                <p>
                  Our background job system monitors all pending check-ins every 5 minutes. When it detects a missed
                  check-in, it creates an alert record and sends it to GoAlert, our on-call management platform.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Smart Escalation</h3>
                <p>
                  GoAlert contacts your trusted contacts in the priority order you've set. It starts with SMS, email,
                  or phone calls (your choice). Each step has a configurable wait time before moving to the next contact.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Late Check-Ins & Resolution</h3>
                <p>
                  If you respond after the window closes, the system automatically closes the alert in GoAlert. Your
                  contacts are notified that you've checked in and no further escalation is needed.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Data Storage & Auditability</h3>
                <p>
                  All check-ins, alerts, and contact escalations are recorded in a secure PostgreSQL database with
                  timestamps. This provides a complete audit trail for transparency and compliance.
                </p>
              </div>
            </div>
          </section>

          {/* Safety & Compliance Section */}
          <section className="border-t pt-8">
            <h2 className="text-primary-600 mb-6">🔐 Safety & Compliance</h2>
            <div className="space-y-6 text-slate-700">
              <div>
                <h3 className="font-semibold mb-2">Data Privacy</h3>
                <p>
                  DoingOK treats your wellness data with the utmost care. We use industry-standard encryption, secure
                  databases, and strict access controls. Your check-in history is only visible to you and your chosen
                  trusted contacts. We never sell or share your data.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Your Control</h3>
                <p>
                  You set the rules. Choose your check-in schedule, response window, and trusted contacts. You can
                  update your preferences at any time. You're in control, always. You can request a copy of all your
                  data or request deletion (subject to legal retention requirements).
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Legal Compliance</h3>
                <p>
                  DoingOK is designed with HIPAA and accessibility compliance in mind. We're working with legal experts
                  to ensure our Terms of Service and data handling practices meet the highest standards. Wellness check-in
                  data is treated as protected health information (PHI).
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Audit Trail</h3>
                <p>
                  All check-ins, alerts, and contact escalations are recorded with timestamps for transparency and
                  accountability. In case of disputes or concerns, you have a complete record of system activity.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Secure Communication</h3>
                <p>
                  All communication between your phone and DoingOK is encrypted using HTTPS/TLS. Trusted contacts receive
                  alerts via encrypted channels (encrypted SMS, email, or secure voice calls through GoAlert).
                </p>
              </div>
            </div>
          </section>

          {/* Common Questions Section */}
          <section className="border-t pt-8">
            <h2 className="text-primary-600 mb-6">❓ Common Questions</h2>
            <div className="space-y-4">
              <details className="group bg-slate-50 p-4 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <summary className="font-semibold text-primary-600 hover:text-primary-700 flex justify-between items-center">
                  What if I forget to check in?
                  <span className="text-slate-400 group-open:hidden">+</span>
                  <span className="text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-slate-600">
                  That's exactly what DoingOK is designed for. You have a configurable grace period (default 2 hours)
                  to respond. If you don't, your trusted contacts are notified automatically. You won't be in trouble—
                  the system is built to help, not judge.
                </p>
              </details>

              <details className="group bg-slate-50 p-4 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <summary className="font-semibold text-primary-600 hover:text-primary-700 flex justify-between items-center">
                  How often do I need to check in?
                  <span className="text-slate-400 group-open:hidden">+</span>
                  <span className="text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-slate-600">
                  You decide. Most users choose daily check-ins, but you can set it to twice daily, weekly, or any
                  schedule that works for you. You can also change your schedule at any time.
                </p>
              </details>

              <details className="group bg-slate-50 p-4 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <summary className="font-semibold text-primary-600 hover:text-primary-700 flex justify-between items-center">
                  Is DoingOK a replacement for emergency services?
                  <span className="text-slate-400 group-open:hidden">+</span>
                  <span className="text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-slate-600">
                  No. DoingOK is a wellness monitoring tool, not an emergency alert system. For life-threatening
                  emergencies, always call 911 (or your local emergency number). DoingOK helps prevent emergencies
                  by enabling proactive check-ins, not replacing emergency response.
                </p>
              </details>

              <details className="group bg-slate-50 p-4 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <summary className="font-semibold text-primary-600 hover:text-primary-700 flex justify-between items-center">
                  What if I'm traveling or away from my phone?
                  <span className="text-slate-400 group-open:hidden">+</span>
                  <span className="text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-slate-600">
                  You can mark yourself as temporarily unavailable before travel. This pauses check-in prompts for a
                  period you specify (e.g., 1 week), and prevents alerts from being triggered. When you return, your
                  normal schedule resumes.
                </p>
              </details>

              <details className="group bg-slate-50 p-4 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <summary className="font-semibold text-primary-600 hover:text-primary-700 flex justify-between items-center">
                  How much does DoingOK cost?
                  <span className="text-slate-400 group-open:hidden">+</span>
                  <span className="text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-slate-600">
                  DoingOK is free during the pilot phase. As a nonprofit, our goal is to serve vulnerable populations
                  affordably. We're committed to keeping the core service low-cost or free, with optional premium
                  features (like advanced reporting) available at affordable prices.
                </p>
              </details>

              <details className="group bg-slate-50 p-4 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <summary className="font-semibold text-primary-600 hover:text-primary-700 flex justify-between items-center">
                  Can I invite my family to be trusted contacts?
                  <span className="text-slate-400 group-open:hidden">+</span>
                  <span className="text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-slate-600">
                  Yes! You add trusted contacts (family, friends, neighbors, volunteers) to your account. They'll be
                  notified via SMS, email, or phone when you miss a check-in. They don't need to download the app—
                  they just need to be reachable. They'll know you're OK when you check in on time.
                </p>
              </details>

              <details className="group bg-slate-50 p-4 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <summary className="font-semibold text-primary-600 hover:text-primary-700 flex justify-between items-center">
                  What if a trusted contact doesn't respond?
                  <span className="text-slate-400 group-open:hidden">+</span>
                  <span className="text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-slate-600">
                  DoingOK automatically escalates to the next trusted contact on your list. You set the order and
                  wait times between contacts. This ensures someone gets notified, even if your first contact is busy.
                </p>
              </details>

              <details className="group bg-slate-50 p-4 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <summary className="font-semibold text-primary-600 hover:text-primary-700 flex justify-between items-center">
                  Is my phone number and contact info shared with trusted contacts?
                  <span className="text-slate-400 group-open:hidden">+</span>
                  <span className="text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-slate-600">
                  Trusted contacts receive notifications about missed check-ins and are given your name and any contact
                  information you've approved. You have full control over what information is shared with whom.
                </p>
              </details>

              <details className="group bg-slate-50 p-4 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <summary className="font-semibold text-primary-600 hover:text-primary-700 flex justify-between items-center">
                  Can I see a history of my check-ins?
                  <span className="text-slate-400 group-open:hidden">+</span>
                  <span className="text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-slate-600">
                  Yes! You can view your complete check-in history in the app, including dates, times, and notes you've
                  added. You can also export this data for your own records or to share with healthcare providers.
                </p>
              </details>

              <details className="group bg-slate-50 p-4 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <summary className="font-semibold text-primary-600 hover:text-primary-700 flex justify-between items-center">
                  How is my data protected?
                  <span className="text-slate-400 group-open:hidden">+</span>
                  <span className="text-slate-400 hidden group-open:inline">−</span>
                </summary>
                <p className="mt-3 text-slate-600">
                  Your data is encrypted in transit (HTTPS) and at rest. We use industry-standard security practices,
                  regular security audits, and follow HIPAA guidelines for handling health information. We never sell
                  your data to third parties.
                </p>
              </details>
            </div>
          </section>

          {/* More Help Section */}
          <section className="border-t pt-8 text-center">
            <h3 className="text-lg font-semibold mb-4">Still have questions?</h3>
            <p className="text-slate-600 mb-6">
              Contact our support team at <a href="mailto:support@doingok.org" className="text-primary-600 hover:underline">support@doingok.org</a>
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
