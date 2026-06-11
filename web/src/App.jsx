import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Landing from './components/Landing';
import SignUp from './components/SignUp';
import Donor from './components/Donor';
import FAQ from './components/FAQ';

export default function App() {
  const [currentSection, setCurrentSection] = useState('landing');
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('fontSize') || 'normal';
  });

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  const renderSection = () => {
    switch (currentSection) {
      case 'landing':
        return <Landing />;
      case 'signup':
        return <SignUp />;
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
      />
      <main className="flex-1">
        {renderSection()}
      </main>
    </div>
  );
}
