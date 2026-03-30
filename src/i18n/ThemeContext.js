/**
 * ThemeContext — Karanlık / Aydınlık tema tercihi
 * AsyncStorage'a kaydeder. Uygulama yeniden başlayınca
 * App.js'deki initTheme() ile StyleSheet oluşmadan önce uygulanır.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { applyTheme } from '../constants/theme';

const STORAGE_KEY = 'appTheme';

const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  // Başlangıçta kaydedilmiş tercihi yükle
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      const dark = val !== 'light';
      setIsDark(dark);
      applyTheme(dark);
    });
  }, []);

  const toggleTheme = useCallback((forceDark) => {
    setIsDark((prev) => {
      const next = forceDark !== undefined ? forceDark : !prev;
      applyTheme(next);
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);

/**
 * App başlangıcında SplashScreen gösterilirken çağrılır.
 * AsyncStorage'dan tercihi okur ve applyTheme() uygular.
 * Returns: isDark boolean
 */
export async function initTheme() {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    const dark = val !== 'light';
    applyTheme(dark);
    return dark;
  } catch {
    return true;
  }
}
