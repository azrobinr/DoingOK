import { useState } from 'react';

export default function Navigation({ currentSection, onNavigate, fontSize, onFontSizeChange }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'landing', label: 'Home', icon: '🏠' },
    { id: 'signup', label: 'Sign Up', icon: '✍️' },
    { id: 'donor', label: 'Donate', icon: '❤️' },
    { id: 'faq', label: 'FAQ', icon: '❓' },
  ];

  const fontSizes = [
    { value: 'normal', label: 'Normal', abbr: 'A' },
    { value: 'large', label: 'Large', abbr: 'A+' },
    { value: 'extra-large', label: 'Extra Large', abbr: 'A++' },
  ];

  const handleNavigate = (sectionId) => {
    onNavigate(sectionId);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button
              onClick={() => handleNavigate('landing')}
              className="text-2xl font-bold text-primary-600 hover:text-primary-700"
            >
              DoingOK
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentSection === item.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-700 hover:text-primary-600'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Font Size Control */}
          <div className="hidden md:flex items-center gap-2">
            {fontSizes.map((size) => (
              <button
                key={size.value}
                onClick={() => onFontSizeChange(size.value)}
                title={size.label}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  fontSize === size.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-700 hover:text-primary-600'
                }`}
              >
                {size.abbr}
              </button>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            {/* Mobile Font Size Control */}
            <div className="flex gap-1">
              {fontSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => onFontSizeChange(size.value)}
                  title={size.label}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    fontSize === size.value
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-700 hover:text-primary-600'
                  }`}
                >
                  {size.abbr}
                </button>
              ))}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-700 hover:text-primary-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`block w-full text-left px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentSection === item.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
