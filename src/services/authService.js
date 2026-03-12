// services/authService.js
import { signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

/**
 * Kullanıcı Firestore dokümanını kontrol eder, yoksa oluşturur.
 */
const ensureUserDoc = async (user) => {
  if (!user) return null;
  const ref = doc(db, 'kullanicilar', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const data = {
      id: user.uid,
      isim: user.displayName || null,
      email: user.email || null,
      rol: null,
      kocId: null,
      sporcuId: null,
      premiumMu: false,
      olusturmaTarihi: new Date(),
    };
    await setDoc(ref, data);
    return data;
  }
  return snap.data();
};

const signOut = async () => {
  await firebaseSignOut(auth);
};

export default { ensureUserDoc, signOut };
