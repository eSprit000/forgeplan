import { signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebaseConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setInitializing(false);
        return;
      }
      try {
        const ref = doc(db, 'kullanicilar', fbUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setUser({ uid: fbUser.uid, email: fbUser.email, phoneNumber: fbUser.phoneNumber, ...snap.data() });
        } else {
          // No Firestore doc yet — user just registered, needs role selection
          setUser({ uid: fbUser.uid, email: fbUser.email, phoneNumber: fbUser.phoneNumber, rol: null, sporcuId: null, kocId: null });
        }
      } catch (e) {
        console.warn('[AuthProvider] Kullanıcı profili okunamadı:', e);
        setUser({ uid: fbUser.uid, email: fbUser.email, phoneNumber: fbUser.phoneNumber, rol: null, sporcuId: null, kocId: null });
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  /** Rol seçimi sonrası çağrılır — Firestore'a rol yazar ve local state'i günceller */
  const setRole = async (rol) => {
    if (!user) return;
    await setDoc(
      doc(db, 'kullanicilar', user.uid),
      { id: user.uid, email: user.email || null, phoneNumber: user.phoneNumber || null, isim: user.isim || null, rol, kocId: null, sporcuId: null },
      { merge: true }
    );
    setUser((prev) => ({ ...prev, rol }));
  };

  /** Sporcu kodu doğrulandıktan sonra çağrılır */
  const setSporcuLinked = ({ sporcuId, kocId }) => {
    setUser((prev) => ({ ...prev, sporcuId, kocId }));
  };

  /** Beslenme kodu doğrulandıktan sonra çağrılır */
  const setBeslenmeLinked = ({ beslenmeSporcuId }) => {
    setUser((prev) => ({ ...prev, beslenmeSporcuId }));
  };

  /** Ayarlar ekranında güncelleme sonrası local state'i tazeler */
  const updateUser = (data) => {
    setUser((prev) => ({ ...prev, ...data }));
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, initializing, setRole, setSporcuLinked, setBeslenmeLinked, updateUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthProvider;
