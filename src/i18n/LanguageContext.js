import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LANGUAGES, TRANSLATIONS } from './translations';

export { LANGUAGES };

const STORAGE_KEY = '@forgeplan_language';
const DEFAULT_LANG = 'tr';
const SECONDARY_LANG = 'en';

const LanguageContext = createContext({
  language: DEFAULT_LANG,
  t: (key) => key,
  setLanguage: () => {},
});

export const LanguageProvider = ({ children }) => {
  const [language, setLangState] = useState(DEFAULT_LANG);

  /* Load saved language on mount */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => { if (saved && TRANSLATIONS[saved]) setLangState(saved); })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((code) => {
    if (!TRANSLATIONS[code]) return;
    setLangState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  const t = useCallback(
    (key) =>
      TRANSLATIONS[language]?.[key]
      ?? TRANSLATIONS[SECONDARY_LANG]?.[key]
      ?? TRANSLATIONS[DEFAULT_LANG]?.[key]
      ?? key,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
