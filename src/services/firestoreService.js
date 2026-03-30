import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";

// ─── KULLANICI ────────────────────────────────────────────────

/**
 * Kullanıcı profilini getirir.
 * Koleksiyon: kullanicilar
 * Alanlar: id, isim, email, rol, kocId, premiumMu, premiumBitisTarihi, olusturmaTarihi
 */
const getKullanici = async (kullaniciId) => {
  try {
    const ref = doc(db, "kullanicilar", kullaniciId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn(`[firestoreService] Kullanıcı bulunamadı: ${kullaniciId}`);
      return null;
    }

    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error("[firestoreService] getKullanici hatası:", error);
    throw error;
  }
};

/**
 * Yeni kullanıcı profili oluşturur.
 * Koleksiyon: kullanicilar
 */
const kullaniciOlustur = async (kullaniciId, { isim, email, rol }) => {
  try {
    const ref = doc(db, "kullanicilar", kullaniciId);
    await updateDoc(ref, {
      id: kullaniciId,
      isim,
      email,
      rol, // "koc" | "sporcu"
      kocId: null,
      premiumMu: false,
      premiumBitisTarihi: null,
      olusturmaTarihi: serverTimestamp(),
    });

    console.log("[firestoreService] Kullanıcı oluşturuldu:", kullaniciId);
  } catch (error) {
    console.error("[firestoreService] kullaniciOlustur hatası:", error);
    throw error;
  }
};

/**
 * Koçun sporcularını getirir.
 * Filtre: rol == "sporcu" && kocId == kocId
 */
const getSporcular = async (kocId) => {
  try {
    const ref = collection(db, "kullanicilar");
    const q = query(
      ref,
      where("rol", "==", "sporcu"),
      where("kocId", "==", kocId)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("[firestoreService] getSporcular hatası:", error);
    throw error;
  }
};

// ─── DAVET KODLARI ───────────────────────────────────────────

/**
 * Koç için yeni davet kodu oluşturur.
 * Koleksiyon: davetKodlari
 * Alanlar: kod, kocId, aktifMi, olusturmaTarihi
 */
const davetKoduOlustur = async (kocId, kod) => {
  try {
    const ref = collection(db, "davetKodlari");
    const docRef = await addDoc(ref, {
      kod,
      kocId,
      aktifMi: true,
      olusturmaTarihi: serverTimestamp(),
    });

    console.log("[firestoreService] Davet kodu oluşturuldu:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[firestoreService] davetKoduOlustur hatası:", error);
    throw error;
  }
};

/**
 * Davet kodunu doğrular ve sporcuyu koça bağlar.
 * Koleksiyon: davetKodlari
 */
const davetKoduDogrula = async (kod, sporcuId) => {
  try {
    const ref = collection(db, "davetKodlari");
    const q = query(
      ref,
      where("kod", "==", kod),
      where("aktifMi", "==", true)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn("[firestoreService] Geçersiz veya pasif davet kodu:", kod);
      return null;
    }

    const davetDoc = snapshot.docs[0];
    const { kocId } = davetDoc.data();

    // Sporcuyu koça bağla
    const sporcuRef = doc(db, "kullanicilar", sporcuId);
    await updateDoc(sporcuRef, { kocId });

    console.log(`[firestoreService] Sporcu ${sporcuId} → Koç ${kocId} bağlandı`);
    return kocId;
  } catch (error) {
    console.error("[firestoreService] davetKoduDogrula hatası:", error);
    throw error;
  }
};

// ─── ANTRENMANLAR ─────────────────────────────────────────────

/**
 * Yeni antrenman ekler.
 * Koleksiyon: antrenmanlar
 * Alanlar: kocId, sporcuId, haftaNumarasi, gun, egzersizler[], tamamlandiMi, sporcuNotu, olusturmaTarihi
 * egzersizler[]: { isim, set, tekrar, kilo, hedefRPE }
 */
const antrenmanEkle = async (antrenman) => {
  try {
    const ref = collection(db, "antrenmanlar");
    const docRef = await addDoc(ref, {
      kocId: antrenman.kocId,
      sporcuId: antrenman.sporcuId,
      haftaNumarasi: antrenman.haftaNumarasi,
      gun: antrenman.gun,
      egzersizler: antrenman.egzersizler ?? [],
      tamamlandiMi: false,
      sporcuNotu: "",
      olusturmaTarihi: serverTimestamp(),
    });

    console.log("[firestoreService] Antrenman eklendi:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[firestoreService] antrenmanEkle hatası:", error);
    throw error;
  }
};

/**
 * Sporcunun tüm antrenmanlarını getirir.
 * Filtre: sporcuId == sporcuId
 */
const getAntrenmanlarBySporcuId = async (sporcuId) => {
  try {
    const ref = collection(db, "antrenmanlar");
    const q = query(ref, where("sporcuId", "==", sporcuId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("[firestoreService] getAntrenmanlarBySporcuId hatası:", error);
    throw error;
  }
};

/**
 * Koçun tüm antrenmanlarını getirir.
 * Filtre: kocId == kocId
 */
const getAntrenmanlarByKocId = async (kocId) => {
  try {
    const ref = collection(db, "antrenmanlar");
    const q = query(ref, where("kocId", "==", kocId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("[firestoreService] getAntrenmanlarByKocId hatası:", error);
    throw error;
  }
};

/**
 * Sporcuyu antrenmanı tamamlandı olarak işaretler ve notunu kaydeder.
 * Koleksiyon: antrenmanlar
 */
const antrenmanTamamla = async (antrenmanId, sporcuNotu = "") => {
  try {
    const ref = doc(db, "antrenmanlar", antrenmanId);
    await updateDoc(ref, {
      tamamlandiMi: true,
      sporcuNotu,
    });

    console.log("[firestoreService] Antrenman tamamlandı:", antrenmanId);
  } catch (error) {
    console.error("[firestoreService] antrenmanTamamla hatası:", error);
    throw error;
  }
};

// ─── RPE KAYITLARI ────────────────────────────────────────────

/**
 * RPE kaydı ekler.
 * Koleksiyon: rpeKayitlari
 * Alanlar: antrenmanId, sporcuId, egzersizIsmi, gerceklesenRPE, tarih
 */
const rpeKaydiEkle = async (rpeData) => {
  try {
    const ref = collection(db, "rpeKayitlari");
    const docRef = await addDoc(ref, {
      antrenmanId: rpeData.antrenmanId,
      sporcuId: rpeData.sporcuId,
      egzersizIsmi: rpeData.egzersizIsmi,
      gerceklesenRPE: rpeData.gerceklesenRPE,
      tarih: rpeData.tarih ?? serverTimestamp(),
    });

    console.log("[firestoreService] RPE kaydı eklendi:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[firestoreService] rpeKaydiEkle hatası:", error);
    throw error;
  }
};

/**
 * Belirli antrenmanın RPE kayıtlarını getirir.
 * Filtre: antrenmanId == antrenmanId
 */
const getRpeKayitlariByAntrenmanId = async (antrenmanId) => {
  try {
    const ref = collection(db, "rpeKayitlari");
    const q = query(ref, where("antrenmanId", "==", antrenmanId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("[firestoreService] getRpeKayitlariByAntrenmanId hatası:", error);
    throw error;
  }
};

// ─── İLERLEME KAYITLARI ──────────────────────────────────────

/**
 * İlerleme kaydı ekler.
 * Koleksiyon: ilerlemeKayitlari
 * Alanlar: sporcuId, kilo, yagOrani, tarih
 */
const ilerlemeKaydiEkle = async (ilerlemeData) => {
  try {
    const ref = collection(db, "ilerlemeKayitlari");
    const docRef = await addDoc(ref, {
      sporcuId: ilerlemeData.sporcuId,
      kilo: ilerlemeData.kilo ?? null,
      yagOrani: ilerlemeData.yagOrani ?? null,
      tarih: ilerlemeData.tarih ?? serverTimestamp(),
    });

    console.log("[firestoreService] İlerleme kaydı eklendi:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[firestoreService] ilerlemeKaydiEkle hatası:", error);
    throw error;
  }
};

/**
 * Sporcunun tüm ilerleme kayıtlarını getirir.
 * Filtre: sporcuId == sporcuId
 */
const getIlerlemeKayitlariBySporcuId = async (sporcuId) => {
  try {
    const ref = collection(db, "ilerlemeKayitlari");
    const q = query(ref, where("sporcuId", "==", sporcuId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("[firestoreService] getIlerlemeKayitlariBySporcuId hatası:", error);
    throw error;
  }
};

// ─── SPORCULAR (coach-created athlete slots) ─────────────────

const _kodUret = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

/**
 * Koç, uygulamaya kayıtlı olmayan bir sporcu için slot oluşturur.
 * Koleksiyon: sporcular
 * Alanlar: kocId, isim, soyisim, programAdi, kod, programId (nullable), sporcuUid (nullable)
 */
const sporcuEkle = async (kocId, { isim, soyisim, programAdi, programTuru = 'antrenman' }) => {
  try {
    const kod = _kodUret();
    const ref = await addDoc(collection(db, "sporcular"), {
      kocId,
      isim,
      soyisim,
      programAdi,
      programTuru,
      kod,
      programId: null,
      beslenmeProgramId: null,
      sporcuUid: null,
      olusturmaTarihi: serverTimestamp(),
    });
    return { id: ref.id, kod };
  } catch (error) {
    console.error("[firestoreService] sporcuEkle hatası:", error);
    throw error;
  }
};

/**
 * Koçun sporcular koleksiyonundaki sporcularını getirir.
 */
const kocSporculariniGetir = async (kocId) => {
  try {
    const q = query(
      collection(db, "sporcular"),
      where("kocId", "==", kocId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("[firestoreService] kocSporculariniGetir hatası:", error);
    throw error;
  }
};

/**
 * Beslenme kodu doğrular ve kullanıcıyı beslenme sporcu slotuna bağlar.
 * Günceller: sporcular/{id}.sporcuUid, kullanicilar/{uid}.beslenmeSporcuId
 */
const beslenmeKoduDogrula = async (kod, userUid) => {
  try {
    const q = query(
      collection(db, 'sporcular'),
      where('kod', '==', kod)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const sporcuDoc = snap.docs[0];
    const sporcuId = sporcuDoc.id;
    const sporcuData = sporcuDoc.data();

    if (sporcuData.programTuru !== 'beslenme' && !sporcuData.beslenmeProgramId) return null;

    await updateDoc(doc(db, 'sporcular', sporcuId), { sporcuUid: userUid });
    await setDoc(
      doc(db, 'kullanicilar', userUid),
      { beslenmeSporcuId: sporcuId },
      { merge: true }
    );
    return { beslenmeSporcuId: sporcuId, ...sporcuData };
  } catch (error) {
    console.error('[firestoreService] beslenmeKoduDogrula hatas\u0131:', error);
    throw error;
  }
};

/**
 * Sporcu kodu doğrular ve kullanıcıyı sporcu slotuna bağlar.
 * Günceller: sporcular/{id}.sporcuUid, kullanicilar/{uid}.sporcuId + kocId
 */
const sporcuKoduDogrula = async (kod, userUid) => {
  try {
    const q = query(
      collection(db, "sporcular"),
      where("kod", "==", kod)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const sporcuDoc = snap.docs[0];
    const sporcuId = sporcuDoc.id;
    const { kocId } = sporcuDoc.data();

    // Link sporcu slot to real Firebase user
    await updateDoc(doc(db, "sporcular", sporcuId), { sporcuUid: userUid });

    // Update user profile with sporcuId and kocId
    await setDoc(
      doc(db, "kullanicilar", userUid),
      { sporcuId, kocId },
      { merge: true }
    );

    return { sporcuId, kocId, ...sporcuDoc.data() };
  } catch (error) {
    console.error("[firestoreService] sporcuKoduDogrula hatası:", error);
    throw error;
  }
};

// ─── PROGRAMLAR ───────────────────────────────────────────────

/**
 * Program dokümanını doğrudan ID ile getirir.
 */
const programGetir = async (programId) => {
  try {
    const snap = await getDoc(doc(db, 'programlar', programId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error('[firestoreService] programGetir hatası:', error);
    throw error;
  }
};

/**
 * Koç, sporcu için beslenme programı oluşturur.
 * Koleksiyon: beslenmeProgramlari
 * ogunler: [{ ogunAdi, besinler: [{ isim, miktar, kalori }], not }]
 */
const beslenmeProgramiOlustur = async (kocId, sporcuId, { programAdi, ogunler, sure }) => {
  try {
    const ref = await addDoc(collection(db, 'beslenmeProgramlari'), {
      kocId,
      sporcuId,
      programAdi,
      ogunler,
      sure: sure ?? '1ay',
      olusturmaTarihi: serverTimestamp(),
    });
    await updateDoc(doc(db, 'sporcular', sporcuId), { beslenmeProgramId: ref.id });
    return ref.id;
  } catch (error) {
    console.error('[firestoreService] beslenmeProgramiOlustur hatası:', error);
    throw error;
  }
};

/**
 * Sporcunun aktif beslenme programını getirir.
 */
const sporcuBeslenmePrograminiGetir = async (sporcuId) => {
  try {
    const sporcuSnap = await getDoc(doc(db, 'sporcular', sporcuId));
    if (!sporcuSnap.exists()) return null;
    const { beslenmeProgramId } = sporcuSnap.data();
    if (!beslenmeProgramId) return null;
    const snap = await getDoc(doc(db, 'beslenmeProgramlari', beslenmeProgramId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error('[firestoreService] sporcuBeslenmePrograminiGetir hatası:', error);
    throw error;
  }
};

/**
 * Koç, sporcu için haftalık antrenman programı oluşturur.
 * Koleksiyon: programlar
 * gunler: [{ gunAdi, egzersizler: [{ isim, setler: [{ tekrar, hedefKilo, hedefRPE }] }] }]
 */
const programOlustur = async (kocId, sporcuId, { programAdi, gunler }) => {
  try {
    const ref = await addDoc(collection(db, "programlar"), {
      kocId,
      sporcuId,
      programAdi,
      gunler,
      olusturmaTarihi: serverTimestamp(),
    });
    // Save programId back into the sporcu slot
    await updateDoc(doc(db, "sporcular", sporcuId), { programId: ref.id });
    return ref.id;
  } catch (error) {
    console.error("[firestoreService] programOlustur hatası:", error);
    throw error;
  }
};

/**
 * Sporcunun aktif programını getirir.
 * Önce sporcular/{sporcuId} → programId, sonra programlar/{programId} yükler.
 */
const sporcuPrograminiGetir = async (sporcuId) => {
  try {
    const sporcuSnap = await getDoc(doc(db, "sporcular", sporcuId));
    if (!sporcuSnap.exists()) return null;
    const { programId } = sporcuSnap.data();
    if (!programId) return null;
    const progSnap = await getDoc(doc(db, "programlar", programId));
    if (!progSnap.exists()) return null;
    return { id: progSnap.id, ...progSnap.data() };
  } catch (error) {
    console.error("[firestoreService] sporcuPrograminiGetir hatası:", error);
    throw error;
  }
};

/**
 * Sporcu günü tamamlandı olarak işaretler ve not kaydeder.
 * Koleksiyon: tamamlananGunler
 */
const gunTamamla = async (sporcuId, programId, gunIndex, sporcuNotu) => {
  try {
    const ref = await addDoc(collection(db, "tamamlananGunler"), {
      sporcuId,
      programId,
      gunIndex,
      sporcuNotu: sporcuNotu || "",
      tarih: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error("[firestoreService] gunTamamla hatası:", error);
    throw error;
  }
};

/**
 * Sporcunun tamamladığı günleri getirir.
 */
const tamamlananGunleriGetir = async (sporcuId, programId) => {
  try {
    const q = query(
      collection(db, "tamamlananGunler"),
      where("sporcuId", "==", sporcuId),
      where("programId", "==", programId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("[firestoreService] tamamlananGunleriGetir hatası:", error);
    throw error;
  }
};

// ─── PR KAYITLARI ─────────────────────────────────────────────

/**
 * PR ekler veya günceller.
 * Koleksiyon: prKayitlari
 * Alanlar: sporcuId, kocId, hareket, kg, oncekiKg, tarih
 * Doküman ID: sporcuId_hareket (predictable, upsert için)
 */
const prEkleVeyaGuncelle = async (kocId, sporcuId, { hareket, kg }) => {
  try {
    const prId = `${sporcuId}_${hareket.trim().toLowerCase().replace(/\s+/g, '_')}`;
    const prRef = doc(db, 'prKayitlari', prId);
    const existing = await getDoc(prRef);
    const oncekiKg = existing.exists() ? existing.data().kg : null;
    await setDoc(prRef, {
      sporcuId,
      kocId: kocId || null,
      hareket: hareket.trim(),
      kg: parseFloat(kg),
      oncekiKg: oncekiKg != null ? parseFloat(oncekiKg) : null,
      tarih: serverTimestamp(),
    });
    return prId;
  } catch (error) {
    console.error('[firestoreService] prEkleVeyaGuncelle hatası:', error);
    throw error;
  }
};

/**
 * Sporcunun tüm PR kayıtlarını getirir.
 */
const prKayitlariniGetir = async (sporcuId) => {
  try {
    const q = query(collection(db, 'prKayitlari'), where('sporcuId', '==', sporcuId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[firestoreService] prKayitlariniGetir hatası:', error);
    throw error;
  }
};

// ─── SET / TEKRAR / RPE LOGLARI ───────────────────────────────

/**
 * Sporcu bir antrenman günü için set logları kaydeder.
 * Koleksiyon: setKayitlari
 * Alanlar: sporcuId, programId, gunIndex, gunAdi, performans[], tarih
 * performans[]: { egzersizIsim, kilo, tekrar, rpe }
 */
const setLogEkle = async (sporcuId, programId, gunIndex, gunAdi, performans) => {
  try {
    const ref = await addDoc(collection(db, 'setKayitlari'), {
      sporcuId,
      programId,
      gunIndex,
      gunAdi: gunAdi || '',
      performans: performans || [],
      tarih: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('[firestoreService] setLogEkle hatası:', error);
    throw error;
  }
};

/**
 * Sporcunun tüm set loglarını getirir (koç görüntülemesi için de kullanılır).
 */
const sporcuSetLoglariniGetir = async (sporcuId) => {
  try {
    const q = query(collection(db, 'setKayitlari'), where('sporcuId', '==', sporcuId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[firestoreService] sporcuSetLoglariniGetir hatası:', error);
    throw error;
  }
};

// ─── ÖĞÜN TAMAMLAMA ──────────────────────────────────────────

/**
 * Sporcu bir öğünü tamamlandı olarak işaretler ve not kaydeder.
 * Koleksiyon: tamamlananOgunler
 */
const ogunTamamla = async (sporcuId, beslenmeProgramId, ogunIndex, not) => {
  try {
    const ref = await addDoc(collection(db, 'tamamlananOgunler'), {
      sporcuId,
      beslenmeProgramId,
      ogunIndex,
      not: not || '',
      tarih: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('[firestoreService] ogunTamamla hatası:', error);
    throw error;
  }
};

/**
 * Sporcunun tamamladığı öğünleri getirir.
 */
const tamamlananOgunleriGetir = async (sporcuId, beslenmeProgramId) => {
  try {
    const q = query(
      collection(db, 'tamamlananOgunler'),
      where('sporcuId', '==', sporcuId),
      where('beslenmeProgramId', '==', beslenmeProgramId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[firestoreService] tamamlananOgunleriGetir hatası:', error);
    throw error;
  }
};
/**
 * Koççun sporcu slotını siler ve varsa bağlı kullanıcıyı koçtan ayırır.
 * - sporcular/{sporcuId} dokümanı silinir (deleteDoc)
 * - Eğer sporcu bağlı bir kullanıcı varsa (sporcuUid), o kullanıcının
 *   kocId ve sporcuId alanları null yapılır.
 */
const sporcuSlotSil = async (sporcuId, sporcuUid) => {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    // Sporcu slotını sil
    await deleteDoc(doc(db, 'sporcular', sporcuId));
    // Bağlı kullanıcı varsa bağlantıyı kopar
    if (sporcuUid) {
      await setDoc(
        doc(db, 'kullanicilar', sporcuUid),
        { kocId: null, sporcuId: null },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('[firestoreService] sporcuSlotSil hatas\u0131:', error);
    throw error;
  }
};

/**
 * Sporcu koçundan ayrılır:
 * - kullanicilar/{uid}.kocId ve sporcuId null yapılır
 * - sporcular/{sporcuId}.sporcuUid null yapılır
 */
const koctanAyril = async (uid, sporcuId) => {
  try {
    await setDoc(
      doc(db, 'kullanicilar', uid),
      { kocId: null, sporcuId: null },
      { merge: true }
    );
    if (sporcuId) {
      await setDoc(
        doc(db, 'sporcular', sporcuId),
        { sporcuUid: null },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('[firestoreService] koctanAyril hatas\u0131:', error);
    throw error;
  }
};

// ─── KULLANICI GÜNCELLEME ─────────────────────────────────────

/**
 * Kullanıcı profilini günceller.
 * Koleksiyon: kullanıcılar
 */
const kullaniciGuncelle = async (kullaniciId, data) => {
  try {
    await setDoc(doc(db, 'kullanicilar', kullaniciId), data, { merge: true });
  } catch (error) {
    console.error('[firestoreService] kullaniciGuncelle hatas\u0131:', error);
    throw error;
  }
};

/**
 * Kullan\u0131c\u0131n\u0131n t\u00fcm Firestore verilerini siler.
 * (kullanicilar, sporcular, programlar, tamamlananGunler, beslenmeProgramlari)
 */
const kullaniciVerileriniSil = async (uid, sporcuId) => {
  try {
    // kullanicilar dok\u00fcman\u0131
    await setDoc(doc(db, 'kullanicilar', uid), { silindi: true }, { merge: true });
    // Sporcu slotu
    if (sporcuId) {
      await setDoc(doc(db, 'sporcular', sporcuId), { sporcuUid: null }, { merge: true });
    }
  } catch (error) {
    console.error('[firestoreService] kullaniciVerileriniSil hatas\u0131:', error);
    throw error;
  }
};
// ─── VÜCUT ÖLÇÜMLERİ ────────────────────────────────────────

/**
 * Sporcu vücut ölçümü kaydeder.
 * Koleksiyon: sporcuOlcumleri
 */
const olcumEkle = async (sporcuId, { kilo, yag, bel, gogus, bicep }) => {
  try {
    const ref = await addDoc(collection(db, 'sporcuOlcumleri'), {
      sporcuId,
      kilo:  kilo  ?? null,
      yag:   yag   ?? null,
      bel:   bel   ?? null,
      gogus: gogus ?? null,
      bicep: bicep ?? null,
      tarih: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('[firestoreService] olcumEkle hatası:', error);
    throw error;
  }
};

/**
 * Sporcunun ölçüm geçmişini getirir (en yeni 30 kayıt).
 */
const olcumleriGetir = async (sporcuId) => {
  try {
    const q = query(
      collection(db, 'sporcuOlcumleri'),
      where('sporcuId', '==', sporcuId),
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort client-side (avoids composite index requirement)
    docs.sort((a, b) => (b.tarih?.seconds ?? 0) - (a.tarih?.seconds ?? 0));
    return docs.slice(0, 30);
  } catch (error) {
    console.error('[firestoreService] olcumleriGetir hatası:', error);
    return [];
  }
};

/**
 * Koç, sporcunun antrenman log kaydına yorum ekler.
 * Koleksiyon: setLoglar
 */
const logYorumuEkle = async (logId, yorum) => {
  try {
    await updateDoc(doc(db, 'setLoglar', logId), { kocYorumu: yorum });
  } catch (error) {
    console.error('[firestoreService] logYorumuEkle hatası:', error);
    throw error;
  }
};

// ─── EXPORT ──────────────────────────────────────────────────

export default {
  // Kullanıcı
  getKullanici,
  kullaniciOlustur,
  kullaniciGuncelle,
  kullaniciVerileriniSil,
  getSporcular,
  // Davet (legacy)
  davetKoduOlustur,
  davetKoduDogrula,
  // Sporcular (yeni)
  sporcuEkle,
  kocSporculariniGetir,
  sporcuSlotSil,
  koctanAyril,
  sporcuKoduDogrula,
  beslenmeKoduDogrula,
  // Programlar (yeni)
  programOlustur,
  programGetir,
  sporcuPrograminiGetir,
  gunTamamla,
  tamamlananGunleriGetir,
  // Beslenme
  beslenmeProgramiOlustur,
  sporcuBeslenmePrograminiGetir,
  // Antrenman
  antrenmanEkle,
  getAntrenmanlarBySporcuId,
  getAntrenmanlarByKocId,
  antrenmanTamamla,
  // RPE
  rpeKaydiEkle,
  getRpeKayitlariByAntrenmanId,
  // İlerleme
  ilerlemeKaydiEkle,
  getIlerlemeKayitlariBySporcuId,
  // PR Kayıtları
  prEkleVeyaGuncelle,
  prKayitlariniGetir,
  // Set / Tekrar / RPE Logları
  setLogEkle,
  sporcuSetLoglariniGetir,
  // Öğün Tamamlama
  ogunTamamla,
  tamamlananOgunleriGetir,
  // Vücut Ölçümleri
  olcumEkle,
  olcumleriGetir,
  // Koç Yorumu
  logYorumuEkle,
};
