import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Landing from './components/Landing';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Donor from './components/Donor';
import FAQ from './components/FAQ';
import { getStoredUser, logout as apiLogout } from './lib/api';

export default function App() {
  const [currentSection, setCurrentSection] = useState('landing');
  const [user, setUser] = useState(() => getStoredUser());
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('fontSize') || 'normal';
  });

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  const handleAuthSuccess = (authedUser) => {
    setUser(authedUser);
    setCurrentSection('landing');
  };

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    setCurrentSection('landing');
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'landing':
        return <Landing />;
      case 'signup':
        return <SignUp onNavigate={setCurrentSection} onAuthSuccess={handleAuthSuccess} />;
      case 'login':
        return <Login onNavigate={setCurrentSection} onAuthSuccess={handleAuthSuccess} />;
      case 'donor':
        return <Donor />;
      case 'faq':
        return <FAQ />;
      default:
        return <Landing />;
    }
  };

  return (
    <div data-font-size={fontSize} className="min-h-screen bg-white">
      <Navigation
        currentSection={currentSection}
        onNavigate={setCurrentSection}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1">
        {renderSection()}
      </main>
    </div>
  );
}
