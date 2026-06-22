import { useState } from 'react';
import { register, acceptTos } from '../lib/api';

// Bump when the Terms of Service text changes; recorded in tos_acceptances.
const TOS_VERSION = '2026-06';

export default function SignUp({ onNavigate, onAuthSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    timezone: 'UTC',
  });

  const [tosAccepted, setTosAccepted] = useState(false);
  const [tosScrolled, setTosScrolled] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTosScroll = (e) => {
    const element = e.target;
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 10) {
      setTosScrolled(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tosAccepted || isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      const { user } = await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        timezone: formData.timezone,
      });
      // Record the user's acceptance of this TOS version (best-effort).
      try {
        await acceptTos(TOS_VERSION);
      } catch {
        // Non-fatal: the account exists; acceptance can be re-recorded later.
      }
      onAuthSuccess?.(user);
      setFormSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (formSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="mb-4">Welcome to DoingOK!</h2>
          <p className="text-slate-600 mb-8">
            Your account has been created successfully. Check your email for next steps and app setup instructions.
          </p>
          <p className="text-sm text-slate-500">
            A verification link has been sent to <strong>{formData.email}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="mb-4">Create Your DoingOK Account</h1>
          <p className="text-slate-600">
            Join our community and start your daily wellness journey.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          {/* Contact Information */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-6 text-slate-900">Your Information</h3>

            <div className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-500 mt-1">
                  At least 8 characters, including an uppercase letter, a number, and a special character (!@#$%^&amp;*).
                </p>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="+1 (602) 555-0101"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Used for SMS alerts and contacting you. Format: +1 (555) 555-5555
                </p>
              </div>

              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-slate-700 mb-2">
                  Timezone *
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Anchorage">Alaska Time (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Terms of Service */}
          <div className="mb-8 border-t pt-8">
            <h3 className="text-lg font-semibold mb-6 text-slate-900">Terms of Service</h3>

            <div className="border border-slate-300 rounded-lg bg-slate-50 mb-4">
              <div
                onScroll={handleTosScroll}
                className="h-64 overflow-y-auto p-6 text-sm text-slate-700"
              >
                <h4 className="font-semibold mb-4">DoingOK Terms of Service</h4>

                <p className="mb-4">
                  <strong>Last Updated: June 2026</strong>
                </p>

                <section className="mb-6">
                  <h5 className="font-semibold mb-2">1. Acceptance of Terms</h5>
                  <p>
                    By creating an account and using DoingOK, you accept and agree to be bound by these Terms of Service.
                    If you do not agree to abide by the above, please do not use this service.
                  </p>
                </section>

                <section className="mb-6">
                  <h5 className="font-semibold mb-2">2. Use License</h5>
                  <p>
                    DoingOK grants you a limited, non-exclusive, non-transferable license to use this service for personal
                    wellness monitoring purposes only.
                  </p>
                </section>

                <section className="mb-6">
                  <h5 className="font-semibold mb-2">3. Disclaimer</h5>
                  <p>
                    DoingOK is a wellness monitoring tool, not a medical device or emergency alert system. In case of
                    emergency, always call 911 (or your local emergency number). DoingOK is provided "as is" without
                    warranty.
                  </p>
                </section>

                <section className="mb-6">
                  <h5 className="font-semibold mb-2">4. Limitations of Liability</h5>
                  <p>
                    In no event shall DoingOK, its owners, or contributors be liable for any damages (including, without
                    limitation, damages for loss of data or profit) arising out of the use or inability to use the service.
                  </p>
                </section>

                <section className="mb-6">
                  <h5 className="font-semibold mb-2">5. Privacy</h5>
                  <p>
                    Your use of DoingOK is also governed by our Privacy Policy. Please review it to understand our practices.
                  </p>
                </section>

                <section className="mb-6">
                  <h5 className="font-semibold mb-2">6. User Responsibilities</h5>
                  <p>
                    You are responsible for maintaining the security of your account. You agree not to use DoingOK to
                    harass, abuse, or harm others.
                  </p>
                </section>

                <section className="mb-6">
                  <h5 className="font-semibold mb-2">7. Termination</h5>
                  <p>
                    DoingOK may terminate your account if you violate these terms or engage in prohibited conduct.
                  </p>
                </section>

                <section>
                  <h5 className="font-semibold mb-2">8. Changes to Terms</h5>
                  <p>
                    DoingOK reserves the right to change these terms at any time. Continued use of the service constitutes
                    acceptance of updated terms.
                  </p>
                </section>
              </div>

              {!tosScrolled && (
                <div className="px-6 py-2 bg-slate-100 text-xs text-slate-600 border-t border-slate-300 text-center">
                  Please scroll to the bottom to enable acceptance
                </div>
              )}
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                disabled={!tosScrolled}
                className="mt-1"
              />
              <span className="text-sm text-slate-700">
                I have read and accept the Terms of Service above {tosScrolled ? '✓' : ''}
              </span>
            </label>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!tosAccepted || isSubmitting}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              tosAccepted && !isSubmitting
                ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-slate-600 text-sm mt-8">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate?.('login')}
            className="text-primary-600 hover:underline"
          >
            Log in here
          </button>
        </p>
      </div>
    </div>
  );
}
