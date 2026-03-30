import { useEffect, useState } from 'react';
import { initTheme } from './src/i18n/ThemeContext';
import { ThemeProvider } from './src/i18n/ThemeContext';

export default function App() {
  const [themeReady, setThemeReady] = useState(false);
  const [NavigatorComponent, setNavigatorComponent] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await initTheme();
      const mod = await import('./src/navigation/AppNavigator');
      if (mounted) {
        setNavigatorComponent(() => mod.default);
        setThemeReady(true);
      }
    })();

    return () => { mounted = false; };
  }, []);

  if (!themeReady || !NavigatorComponent) return null; // Splash Screen görünür hâldedir

  return (
    <ThemeProvider>
      <NavigatorComponent />
    </ThemeProvider>
  );
}