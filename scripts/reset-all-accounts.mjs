import { initializeApp } from 'firebase/app';
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId || !firebaseConfig.apiKey || !firebaseConfig.appId) {
  console.error('❌ Firebase env eksik. Önce .env yüklenmeli.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TARGET_COLLECTIONS = [
  'kullanicilar',
  'sporcular',
  'programlar',
  'beslenmeProgramlari',
  'tamamlananGunler',
  'tamamlananOgunler',
  'prKayitlari',
  'setKayitlari',
  'setLoglar',
  'sporcuOlcumleri',
  'antrenmanlar',
  'rpeKayitlari',
  'ilerlemeKayitlari',
  'davetKodlari',
];

const PAGE_SIZE = 200;

async function deleteCollection(colName) {
  let deleted = 0;
  let last = null;

  while (true) {
    const base = [
      collection(db, colName),
      orderBy(documentId()),
      limit(PAGE_SIZE),
    ];
    const q = last ? query(...base, startAfter(last)) : query(...base);
    const snap = await getDocs(q);
    if (snap.empty) break;

    for (const d of snap.docs) {
      await deleteDoc(doc(db, colName, d.id));
      deleted += 1;
    }

    last = snap.docs[snap.docs.length - 1];
    process.stdout.write(`\r🧹 ${colName}: ${deleted} silindi`);
  }

  process.stdout.write('\n');
  return deleted;
}

async function run() {
  console.log('⚠️  Firestore sıfırlama başlıyor...');
  console.log(`📦 Proje: ${firebaseConfig.projectId}`);

  let total = 0;
  for (const col of TARGET_COLLECTIONS) {
    try {
      const count = await deleteCollection(col);
      total += count;
      console.log(`✅ ${col}: ${count} kayıt silindi`);
    } catch (error) {
      console.error(`❌ ${col} silinemedi:`, error.message);
    }
  }

  await setDoc(doc(db, '_meta', 'lastReset'), {
    at: new Date().toISOString(),
    totalDeleted: total,
    by: 'scripts/reset-all-accounts.mjs',
  });

  console.log(`\n🎯 Tamamlandı. Toplam silinen kayıt: ${total}`);
  console.log('ℹ️  Not: Firebase Authentication kullanıcıları bu script ile silinmez.');
}

run().catch((e) => {
  console.error('❌ Sıfırlama hatası:', e);
  process.exit(1);
});
