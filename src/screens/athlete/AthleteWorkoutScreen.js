import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Animated, Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal, Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import RPECalculatorModal from '../../components/RPECalculatorModal';
import { COLORS, FONT, RADIUS, SHADOW } from '../../constants/theme';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../navigation/AuthProvider';
import firestoreService from '../../services/firestoreService';

/* ── helpers ──────────────────────────────────────────────── */
const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

/* ── ExerciseRow ──────────────────────────────────────────── */
const ExerciseRow = ({ exc, index, ticked, onTick }) => {
  const { t } = useLanguage();
  return (
  <View style={[er.wrap, ticked && er.wrapDone]}>
    <View style={er.nameRow}>
      <View style={[er.num, ticked && er.numDone]}>
        {ticked
          ? <Ionicons name="checkmark" size={13} color={COLORS.white} />
          : <Text style={er.numTxt}>{index + 1}</Text>}
      </View>
      <Text style={[er.name, ticked && er.nameDone]}>{exc.isim || '—'}</Text>
      <TouchableOpacity
        style={[er.tickBtn, ticked && er.tickBtnDone]}
        onPress={onTick}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={ticked ? 'checkmark-circle' : 'checkmark-circle-outline'}
          size={22}
          color={ticked ? COLORS.success : COLORS.textMuted}
        />
      </TouchableOpacity>
    </View>
    {!ticked && (
      <>
        <View style={er.setHeader}>
          {['Set', t('reps'), 'kg', 'RPE'].map((h, i) => (
            <Text key={i} style={er.setHead}>{h}</Text>
          ))}
        </View>
        {exc.setler?.map((set, si) => (
          <View key={si} style={er.setRow}>
            <Text style={er.setCell}>{si + 1}</Text>
            <Text style={er.setCell}>{set.tekrar || '—'}</Text>
            <Text style={er.setCell}>{set.hedefKilo ? `${set.hedefKilo} kg` : '—'}</Text>
            <Text style={[er.setCell, er.rpe]}>{set.hedefRPE ? `${set.hedefRPE}/10` : '—'}</Text>
          </View>
        ))}
        {exc.not ? (
          <View style={er.notRow}>
            <Ionicons name="chatbubble-outline" size={12} color={COLORS.accent} />
            <Text style={er.notText}>{exc.not}</Text>
          </View>
        ) : null}
      </>
    )}
  </View>
  );
};
const er = StyleSheet.create({
  wrap:      { marginBottom: 12 },
  wrapDone:  { opacity: 0.6 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  num:       {
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  numDone:   { backgroundColor: COLORS.success },
  numTxt:    { fontSize: 11, color: COLORS.white, fontWeight: '800' },
  name:      { fontSize: FONT.md, fontWeight: '700', color: COLORS.text, flex: 1 },
  nameDone:  { textDecorationLine: 'line-through', color: COLORS.success },
  tickBtn:   { padding: 2 },
  tickBtnDone: {},
  setHeader: { flexDirection: 'row', marginBottom: 4 },
  setHead:   { flex: 1, fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textAlign: 'center' },
  setRow:    { flexDirection: 'row', paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  setCell:   { flex: 1, fontSize: FONT.sm, color: COLORS.text, textAlign: 'center' },
  rpe:       { color: COLORS.accent, fontWeight: '700' },
  notRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6,
               backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm, padding: 8 },
  notText:   { flex: 1, fontSize: FONT.xs, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 16 },
});

/* ── Main Screen ──────────────────────────────────────────── */
export default function AthleteWorkoutScreen({ navigation }) {
  const { user, signOut, setBeslenmeLinked }  = useAuth();
  const { t } = useLanguage();
  const [program, setProgram]     = useState(null);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Complete modal state
  const [modal, setModal]       = useState(false);
  const [selDay, setSelDay]     = useState(null);
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  // Set log inputs in complete modal
  const [setLoglar, setSetLoglar] = useState([]);
  // Program overview modal
  const [progModal, setProgModal] = useState(false);
  // Tamamlanan günleri açıp kapamak için
  const [expandedDays, setExpandedDays] = useState(new Set());

  const toggleExpand = (idx) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Beslenme tab
  const [activeTab, setActiveTab]           = useState('antrenman');
  const [beslenmeProgram, setBeslenmeProgram] = useState(null);
  const [beslenmeLoading, setBeslenmeLoading] = useState(false);
  const [beslenmeKodModal, setBeslenmeKodModal] = useState(false);
  const [beslenmeKod, setBeslenmeKod]           = useState('');
  const [beslenmeKodSaving, setBeslenmeKodSaving] = useState(false);
  // Beslenme tamamlama
  const [tamamlananOgunler, setTamamlananOgunler] = useState([]);
  const [ogunModal, setOgunModal]   = useState(false);
  const [selOgun, setSelOgun]       = useState(null);
  const [ogunNote, setOgunNote]     = useState('');
  const [ogunSaving, setOgunSaving] = useState(false);

  // PR tab
  const [prler, setPrler]         = useState([]);
  const [prLoading, setPrLoading] = useState(false);
  const [prModal, setPrModal]     = useState(false);
  const [prHareket, setPrHareket] = useState('');
  const [prKg, setPrKg]           = useState('');
  const [prSaving, setPrSaving]   = useState(false);

  // Egzersiz tikleri: { [dayIndex]: Set<excIndex> }
  const [tickedExcs, setTickedExcs] = useState({});
  const toggleExcTick = (dIdx, eIdx) => {
    setTickedExcs((prev) => {
      const set = new Set(prev[dIdx] || []);
      if (set.has(eIdx)) set.delete(eIdx); else set.add(eIdx);
      return { ...prev, [dIdx]: set };
    });
  };
  const isExcTicked = (dIdx, eIdx) => !!(tickedExcs[dIdx]?.has(eIdx));

  // RPE Hesaplayıcı
  const [rpeCalcModal, setRpeCalcModal] = useState(false);

  const load = useCallback(async () => {
    if (!user.sporcuId) return;
    try {
      const prog = await firestoreService.sporcuPrograminiGetir(user.sporcuId);
      setProgram(prog);
      if (prog) {
        const done = await firestoreService.tamamlananGunleriGetir(user.sporcuId, prog.id);
        setCompleted(done);
      }
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  }, [user.sporcuId]);

  useEffect(() => { load(); }, [load]);

  const loadBeslenme = useCallback(async (overrideId) => {
    const bId = overrideId ?? user.beslenmeSporcuId;
    if (!bId) return;
    try {
      setBeslenmeLoading(true);
      const prog = await firestoreService.sporcuBeslenmePrograminiGetir(bId);
      setBeslenmeProgram(prog);
      if (prog) {
        const done = await firestoreService.tamamlananOgunleriGetir(user.sporcuId, prog.id);
        setTamamlananOgunler(done);
      }
    } catch (e) {
      // silent
    } finally {
      setBeslenmeLoading(false);
    }
  }, [user.beslenmeSporcuId, user.sporcuId]);

  useEffect(() => { loadBeslenme(); }, [loadBeslenme]);

  const loadPrler = useCallback(async () => {
    if (!user.sporcuId) return;
    try {
      setPrLoading(true);
      const prs = await firestoreService.prKayitlariniGetir(user.sporcuId);
      setPrler(prs.sort((a, b) => (b.tarih?.seconds || 0) - (a.tarih?.seconds || 0)));
    } catch (e) {
      // silent
    } finally {
      setPrLoading(false);
    }
  }, [user.sporcuId]);

  useEffect(() => {
    if (activeTab === 'pr') loadPrler();
  }, [activeTab, loadPrler]);

  const handleBeslenmeKod = async () => {
    const trimmed = beslenmeKod.trim().toUpperCase();
    if (trimmed.length < 4) {
      Alert.alert('Geçersiz Kod', 'Lütfen koçunuzun size verdiği beslenme kodunu girin.');
      return;
    }
    setBeslenmeKodSaving(true);
    try {
      const result = await firestoreService.beslenmeKoduDogrula(trimmed, user.uid);
      if (!result) {
        Alert.alert(t('nutritionNotFound'), t('nutritionNotFoundDesc'));
        return;
      }
      setBeslenmeLinked({ beslenmeSporcuId: result.beslenmeSporcuId });
      setBeslenmeKodModal(false);
      setBeslenmeKod('');
      loadBeslenme(result.beslenmeSporcuId);
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setBeslenmeKodSaving(false);
    }
  };

  const isDone = (gunIndex) =>
    completed.some((c) => c.gunIndex === gunIndex);

  const getNote = (gunIndex) =>
    completed.find((c) => c.gunIndex === gunIndex)?.sporcuNotu ?? '';

  const isOgunDone = (ogunIndex) =>
    tamamlananOgunler.some((o) => o.ogunIndex === ogunIndex);

  const getOgunNote = (ogunIndex) =>
    tamamlananOgunler.find((o) => o.ogunIndex === ogunIndex)?.not ?? '';

  const openModal = (dayIndex) => {
    setSelDay(dayIndex);
    setNote('');
    // Initialize set log inputs from day's exercises
    const gun = program?.gunler?.[dayIndex];
    setSetLoglar(
      gun?.egzersizler?.map((exc) => ({
        egzersizIsim: exc.isim || '',
        kilo: '',
        tekrar: '',
        rpe: '',
      })) || []
    );
    setModal(true);
  };

  const updateSetLog = (idx, field, value) => {
    setSetLoglar((prev) =>
      prev.map((entry, i) => (i === idx ? { ...entry, [field]: value } : entry))
    );
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await firestoreService.gunTamamla(user.sporcuId, program.id, selDay, note);
      // Save set logs if any data was entered
      const hasData = setLoglar.some((sl) => sl.kilo || sl.tekrar || sl.rpe);
      if (hasData) {
        const gun = program?.gunler?.[selDay];
        await firestoreService.setLogEkle(
          user.sporcuId,
          program.id,
          selDay,
          gun?.gunAdi || `Gün ${selDay + 1}`,
          setLoglar.filter((sl) => sl.kilo || sl.tekrar || sl.rpe)
        );
      }
      setModal(false);
      await load();
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOgunComplete = async () => {
    setOgunSaving(true);
    try {
      await firestoreService.ogunTamamla(
        user.sporcuId,
        beslenmeProgram.id,
        selOgun,
        ogunNote
      );
      setOgunModal(false);
      await loadBeslenme();
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setOgunSaving(false);
    }
  };

  const handleSavePr = async () => {
    if (!prHareket.trim()) {
      Alert.alert(t('error'), t('prMovementRequired'));
      return;
    }
    if (!prKg.trim() || isNaN(parseFloat(prKg))) {
      Alert.alert(t('error'), t('prWeightRequired'));
      return;
    }
    setPrSaving(true);
    try {
      await firestoreService.prEkleVeyaGuncelle(null, user.sporcuId, {
        hareket: prHareket.trim(),
        kg: parseFloat(prKg),
      });
      setPrModal(false);
      setPrHareket('');
      setPrKg('');
      loadPrler();
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setPrSaving(false);
    }
  };

  /* ── PDF / Paylaş ──────────────────────────────────── */
  const handleShareProgram = async () => {
    if (!program) {
      Alert.alert(t('shareNoProgram'), t('shareNoProgramDesc'));
      return;
    }
    try {
      const doneSet = new Set(completed.map((c) => c.gunIndex));
      const gunlerHtml = (program.gunler || []).map((gun, dIdx) => {
        const done = doneSet.has(dIdx);
        const excRows = (gun.egzersizler || []).map((exc, eIdx) => {
          const setRows = (exc.setler || []).map((set, sIdx) => `
            <tr>
              <td>${sIdx + 1}</td>
              <td>${set.tekrar || '—'}</td>
              <td>${set.hedefKilo ? set.hedefKilo + ' kg' : '—'}</td>
              <td>${set.hedefRPE ? set.hedefRPE + '/10' : '—'}</td>
            </tr>`).join('');
          return `
          <div class="exc">
            <p class="exc-name">${eIdx + 1}. ${exc.isim || '—'}</p>
            <table>
              <thead><tr><th>Set</th><th>Tekrar</th><th>Hedef Kilo</th><th>Hedef RPE</th></tr></thead>
              <tbody>${setRows}</tbody>
            </table>
          </div>`;
        }).join('');
        return `
        <div class="day-card ${done ? 'done' : ''}">
          <div class="day-header">
            <span class="day-num">${dIdx + 1}</span>
            <span class="day-name">${gun.gunAdi || 'Gün ' + (dIdx + 1)}</span>
            ${done ? '<span class="done-badge">✓ Tamamlandı</span>' : ''}
          </div>
          ${excRows}
        </div>`;
      }).join('');

      const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${program.programAdi || 'Antrenman Programı'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #0D1117; color: #E6EDF3; padding: 24px; }
    .header { text-align: center; margin-bottom: 28px; }
    .logo { font-size: 13px; color: #FF6B35; letter-spacing: 2px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
    h1 { font-size: 22px; font-weight: 800; color: #E6EDF3; margin-bottom: 6px; }
    .meta { font-size: 12px; color: #8B949E; }
    .progress { display: flex; align-items: center; gap: 10px; background: #161B22; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px; border: 1px solid #30363D; }
    .prog-label { font-size: 13px; color: #8B949E; flex: 1; }
    .prog-val { font-size: 13px; font-weight: 700; color: #FF6B35; }
    .prog-bar-bg { width: 100%; height: 6px; background: #30363D; border-radius: 3px; margin-top: 6px; }
    .prog-bar-fill { height: 6px; background: #FF6B35; border-radius: 3px; }
    .day-card { background: #161B22; border-radius: 12px; border: 1px solid #30363D; margin-bottom: 14px; overflow: hidden; }
    .day-card.done { border-color: #3FB95044; }
    .day-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #1C2128; }
    .day-num { width: 26px; height: 26px; border-radius: 13px; background: #FF6B35; color: #fff; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 26px; }
    .day-name { font-size: 14px; font-weight: 700; color: #E6EDF3; flex: 1; }
    .done-badge { font-size: 11px; color: #3FB950; font-weight: 600; }
    .exc { padding: 10px 16px; border-top: 1px solid #30363D; }
    .exc-name { font-size: 13px; font-weight: 700; color: #E6EDF3; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 10px; color: #8B949E; text-transform: uppercase; text-align: left; padding: 4px 0; border-bottom: 1px solid #30363D; }
    td { font-size: 12px; color: #C9D1D9; padding: 5px 0; border-bottom: 1px solid #21262D; }
    .footer { text-align: center; margin-top: 28px; font-size: 11px; color: #8B949E; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">ForgePlan</div>
    <h1>${program.programAdi || 'Antrenman Programı'}</h1>
    <p class="meta">${user?.isim ? user.isim + ' ' + (user.soyisim || '') + ' · ' : ''}${new Date().toLocaleDateString('tr-TR')}</p>
  </div>
  <div class="progress">
    <div style="flex:1">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="prog-label">${doneCount} / ${totalDays} gün tamamlandı</span>
        <span class="prog-val">${Math.round(progressPct * 100)}%</span>
      </div>
      <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${Math.round(progressPct * 100)}%"></div></div>
    </div>
  </div>
  ${gunlerHtml}
  <div class="footer">ForgePlan — Bu program mobil uygulama aracılığıyla oluşturulmuştur.</div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: program.programAdi || t('myWorkout'),
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(t('shareUnavailable'), t('shareUnavailableDesc'));
      }
    } catch (e) {
      Alert.alert(t('error'), 'PDF: ' + e.message);
    }
  };

  // Animated progress bar — must be declared before any conditional return
  const progressAnim = useRef(new Animated.Value(0)).current;
  const doneCount = completed.length;
  const totalDays = program?.gunler?.length ?? 0;
  const progressPct = totalDays > 0 ? doneCount / totalDays : 0;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPct,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressPct]);
  const animWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  if (loading) {
    return (
      <View style={s.centerWrap}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Text style={s.hello} numberOfLines={1}>{t('hello')} 💪</Text>
          <Text style={s.progName} numberOfLines={1} ellipsizeMode="tail">
            {activeTab === 'beslenme'
              ? (beslenmeProgram?.programAdi ?? t('myNutrition'))
              : activeTab === 'pr'
              ? t('myPRs')
              : (program?.programAdi ?? t('myWorkout'))}
          </Text>
        </View>
        {activeTab === 'antrenman' && program && (
          <TouchableOpacity
            style={s.viewProgBtn}
            onPress={() => setProgModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={15} color={COLORS.accent} />
            <Text style={s.viewProgBtnText}>{t('viewProgram')}</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'pr' && (
          <TouchableOpacity
            style={s.viewProgBtn}
            onPress={() => { setPrHareket(''); setPrKg(''); setPrModal(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color={COLORS.accent} />
            <Text style={s.viewProgBtnText}>{t('addPR')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={s.rpeCalcBtn}
          onPress={() => setRpeCalcModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="calculator-outline" size={15} color={COLORS.warning} />
          <Text style={s.rpeCalcBtnText}>RPE</Text>
        </TouchableOpacity>
        {activeTab === 'antrenman' && program && (
          <TouchableOpacity
            style={s.shareBtn}
            onPress={handleShareProgram}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={18} color={COLORS.success} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={s.signOutIconBtn}>
          <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Progress bar (antrenman tabında gözüksün) ── */}
      {activeTab === 'antrenman' && (
        <View style={s.progressWrap}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>{t('daysCompleted').replace('{done}', String(doneCount)).replace('{total}', String(totalDays))}</Text>
            <Text style={s.progressPct}>{Math.round(progressPct * 100)}%</Text>
          </View>
          <View style={s.progressBg}>
            <Animated.View style={[s.progressFill, { width: animWidth }]} />
          </View>
        </View>
      )}

      {/* ── Tab bar ── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'antrenman' && s.tabBtnActive]}
          onPress={() => setActiveTab('antrenman')}
          activeOpacity={0.8}
        >
          <Ionicons name="barbell-outline" size={14}
            color={activeTab === 'antrenman' ? COLORS.accent : COLORS.textMuted} />
          <Text style={[s.tabBtnText, activeTab === 'antrenman' && s.tabBtnTextActive]}>
            {t('tabWorkout')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'beslenme' && s.tabBtnActiveBeslenme]}
          onPress={() => setActiveTab('beslenme')}
          activeOpacity={0.8}
        >
          <Ionicons name="nutrition-outline" size={14}
            color={activeTab === 'beslenme' ? COLORS.success : COLORS.textMuted} />
          <Text style={[s.tabBtnText, activeTab === 'beslenme' && s.tabBtnTextBeslenme]}>
            {t('tabNutrition')}
          </Text>
          {user.beslenmeSporcuId && <View style={s.tabDot} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'pr' && s.tabBtnActivePr]}
          onPress={() => setActiveTab('pr')}
          activeOpacity={0.8}
        >
          <Ionicons name="trophy-outline" size={14}
            color={activeTab === 'pr' ? COLORS.warning : COLORS.textMuted} />
          <Text style={[s.tabBtnText, activeTab === 'pr' && s.tabBtnTextPr]}>
            {t('tabPR')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Days list ── */}
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ─ Antrenman Tab ─ */}
        {activeTab === 'antrenman' && !program && (
          <View style={s.emptyTabWrap}>
            <Ionicons name="hourglass-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>{t('noProgram')}</Text>
            <Text style={s.emptyDesc}>{t('noProgramDesc')}</Text>
          </View>
        )}
        {activeTab === 'antrenman' && program && program.gunler?.map((gun, dIdx) => {
          const done = isDone(dIdx);
          return (
            <View key={dIdx} style={[s.dayCard, done && s.dayCardDone]}>
              {/* Day header */}
              {done ? (
                <TouchableOpacity
                  style={s.dayHeader}
                  onPress={() => toggleExpand(dIdx)}
                  activeOpacity={0.7}
                >
                  <View style={[s.dayBadge, s.dayBadgeDone]}>
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  </View>
                  <View style={s.dayTitleWrap}>
                    <Text style={[s.dayTitle, s.dayTitleDone]}>{gun.gunAdi}</Text>
                    <Text style={s.doneDate}>{t('doneExpandHint')}</Text>
                  </View>
                  <Ionicons
                    name={expandedDays.has(dIdx) ? 'chevron-up' : 'chevron-down'}
                    size={16} color={COLORS.success}
                  />
                </TouchableOpacity>
              ) : (
                <View style={s.dayHeader}>
                  <View style={s.dayBadge}>
                    <Text style={s.dayBadgeText}>{dIdx + 1}</Text>
                  </View>
                  <View style={s.dayTitleWrap}>
                    <Text style={s.dayTitle}>{gun.gunAdi}</Text>
                  </View>
                </View>
              )}

              {/* Exercises - active or expanded completed */}
              {(!done || expandedDays.has(dIdx)) && gun.egzersizler?.length > 0 && (
                <View style={s.excList}>
                  {gun.egzersizler.map((exc, eIdx) => (
                    <ExerciseRow key={eIdx} exc={exc} index={eIdx}
                      ticked={isExcTicked(dIdx, eIdx)}
                      onTick={() => toggleExcTick(dIdx, eIdx)} />
                  ))}
                </View>
              )}

              {/* Done note */}
              {done && getNote(dIdx) && (
                <View style={s.noteRow}>
                  <Ionicons name="chatbubble-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={s.noteText}>{getNote(dIdx)}</Text>
                </View>
              )}

              {/* Complete button */}
              {!done && (
                <TouchableOpacity
                  style={s.completeBtn}
                  onPress={() => openModal(dIdx)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                  <Text style={s.completeBtnText}>{t('completeDay')}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* ─ Beslenme Tab ─ */}
        {activeTab === 'beslenme' && !user.beslenmeSporcuId && (
          <View style={s.beslenmeCodeCard}>
            <Ionicons name="nutrition-outline" size={44} color={COLORS.success} />
            <Text style={s.beslenmeCodeTitle}>{t('nutritionTabTitle')}</Text>
            <Text style={s.beslenmeCodeDesc}>{t('beslenmeCodeTabDesc')}</Text>
            <TouchableOpacity
              style={s.beslenmeCodeBtn}
              onPress={() => setBeslenmeKodModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="key-outline" size={18} color={COLORS.white} />
              <Text style={s.beslenmeCodeBtnText}>{t('enterNutritionCode')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {activeTab === 'beslenme' && user.beslenmeSporcuId && beslenmeLoading && (
          <ActivityIndicator color={COLORS.success} style={{ marginTop: 40 }} />
        )}
        {activeTab === 'beslenme' && user.beslenmeSporcuId && !beslenmeLoading && !beslenmeProgram && (
          <View style={s.emptyTabWrap}>
            <Ionicons name="hourglass-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>{t('noNutrition')}</Text>
            <Text style={s.emptyDesc}>{t('noNutritionDesc')}</Text>
          </View>
        )}
        {activeTab === 'beslenme' && beslenmeProgram && beslenmeProgram.ogunler?.map((ogun, oIdx) => {
          const toplamKcal = ogun.besinler?.reduce((acc, b) => acc + (parseInt(b.kalori) || 0), 0) ?? 0;
          return (
            <View key={oIdx} style={[s.ogunCard, isOgunDone(oIdx) && s.ogunCardDone]}>
              <View style={s.ogunHeader}>
                <View style={[s.ogunBadge, isOgunDone(oIdx) && { backgroundColor: COLORS.success }]}>
                  <Ionicons
                    name={isOgunDone(oIdx) ? 'checkmark' : 'restaurant-outline'}
                    size={14} color={COLORS.white}
                  />
                </View>
                <Text style={[s.ogunAdi, isOgunDone(oIdx) && { color: COLORS.success }]}>
                  {ogun.ogunAdi || `${oIdx + 1}. Öğün`}
                </Text>
                {toplamKcal > 0 && (
                  <View style={s.kcalChip}>
                    <Text style={s.kcalText}>{toplamKcal} kcal</Text>
                  </View>
                )}
              </View>
              {ogun.besinler?.map((besin, bIdx) => (
                <View key={bIdx} style={s.besinRow}>
                  <Text style={s.besinIsim}>{bIdx + 1}. {besin.isim || '—'}</Text>
                  <Text style={s.besinDetay}>
                    {besin.miktar ? `${besin.miktar}g` : ''}
                    {besin.miktar && besin.kalori ? '  ·  ' : ''}
                    {besin.kalori ? `${besin.kalori} kcal` : ''}
                  </Text>
                </View>
              ))}
              {ogun.not ? (
                <View style={s.ogunNotRow}>
                  <Ionicons name="chatbubble-outline" size={12} color={COLORS.success} />
                  <Text style={s.ogunNotText}>{ogun.not}</Text>
                </View>
              ) : null}
              {/* Sporcu notu */}
              {isOgunDone(oIdx) && getOgunNote(oIdx) ? (
                <View style={[s.noteRow, { marginTop: 8 }]}>
                  <Ionicons name="chatbubble" size={13} color={COLORS.success} />
                  <Text style={[s.noteText, { color: COLORS.success }]}>{getOgunNote(oIdx)}</Text>
                </View>
              ) : null}
              {/* Tamamla butonu */}
              {!isOgunDone(oIdx) && (
                <TouchableOpacity
                  style={s.ogunCompleteBtn}
                  onPress={() => { setSelOgun(oIdx); setOgunNote(''); setOgunModal(true); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.white} />
                  <Text style={s.ogunCompleteBtnText}>{t('completeMeal')}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* ─ PR Tab ─ */}
        {activeTab === 'pr' && prLoading && (
          <ActivityIndicator color={COLORS.warning} style={{ marginTop: 40 }} />
        )}
        {activeTab === 'pr' && !prLoading && prler.length === 0 && (
          <View style={s.emptyTabWrap}>
            <Ionicons name="trophy-outline" size={52} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>{t('noPR')}</Text>
            <Text style={s.emptyDesc}>{t('noPRDesc')}</Text>
          </View>
        )}
        {activeTab === 'pr' && !prLoading && prler.map((pr) => (
          <View key={pr.id} style={s.prCard}>
            <View style={s.prLeft}>
              <Text style={s.prHareket}>{pr.hareket}</Text>
              <Text style={s.prDate}>{t('dateLabel')}: {pr.tarih?.toDate
                ? pr.tarih.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
              </Text>
              {pr.oncekiKg != null && (
                <Text style={s.prOnceki}>{t('prevRecord')}: {pr.oncekiKg} kg</Text>
              )}
            </View>
            <View style={s.prRight}>
              <Text style={s.prKg}>{pr.kg} kg</Text>
              <View style={s.prBadge}>
                <Ionicons name="trophy" size={12} color={COLORS.warning} />
                <Text style={s.prBadgeText}>PR</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Beslenme Kod Modal ── */}
      <Modal visible={beslenmeKodModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={mo.overlay}>
              <TouchableWithoutFeedback>
                <View style={mo.sheet}>
                  <Text style={mo.title}>{t('enterNutritionCode')} 🥗</Text>
                  <Text style={mo.desc}>{t('nutritionCodeModalDesc')}</Text>
                  <TextInput
                    style={[mo.noteInput, { minHeight: 52, textAlign: 'center', fontSize: 20, fontWeight: '700', letterSpacing: 4 }]}
                    value={beslenmeKod}
                    onChangeText={(v) => setBeslenmeKod(v.toUpperCase())}
                    placeholder="A1B2C3"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                  />
                  <TouchableOpacity
                    style={[mo.saveBtn, { backgroundColor: COLORS.success }, (!beslenmeKod.trim() || beslenmeKodSaving) && mo.saveBtnDisabled]}
                    onPress={handleBeslenmeKod}
                    disabled={!beslenmeKod.trim() || beslenmeKodSaving}
                    activeOpacity={0.85}
                  >
                    {beslenmeKodSaving
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={mo.saveBtnText}>{t('verifyCode')}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setBeslenmeKodModal(false); Keyboard.dismiss(); }} style={mo.cancelBtn}>
                    <Text style={mo.cancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Complete Modal ── */}
      <Modal visible={modal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={mo.overlay}>
              <TouchableWithoutFeedback>
                <View style={mo.sheet}>
                  <ScrollView contentContainerStyle={{ paddingBottom: 8 }}
                    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text style={mo.title}>{t('completeDay')} 🎉</Text>
                  <Text style={mo.desc}>
                    {selDay !== null && program?.gunler?.[selDay]?.gunAdi} — {t('yourNote')}
                  </Text>
                  <TextInput
                    style={mo.noteInput}
                    value={note}
                    onChangeText={setNote}
                    placeholder={t('notePlaceholder')}
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  {/* ─ Performans Kaydı ─ */}
                  {setLoglar.length > 0 && (
                    <>
                      <View style={mo.divider}>
                        <View style={mo.dividerLine} />
                        <Text style={mo.dividerText}>{t('perfRecord')}</Text>
                        <View style={mo.dividerLine} />
                      </View>
                      <View style={mo.setLogHeader}>
                        <Text style={[mo.setLogHeadCell, { flex: 2 }]}>{t('exercise')}</Text>
                        <Text style={mo.setLogHeadCell}>kg</Text>
                        <Text style={mo.setLogHeadCell}>{t('reps')}</Text>
                        <Text style={mo.setLogHeadCell}>RPE</Text>
                      </View>
                      {setLoglar.map((sl, idx) => (
                        <View key={idx} style={mo.setLogRow}>
                          <Text style={mo.setLogExcName} numberOfLines={1}>{sl.egzersizIsim || t('excShort').replace('{n}', String(idx + 1))}</Text>
                          <TextInput
                            style={mo.setLogInput}
                            value={sl.kilo}
                            onChangeText={(v) => updateSetLog(idx, 'kilo', v)}
                            keyboardType="decimal-pad"
                            placeholder="kg"
                            placeholderTextColor={COLORS.textMuted}
                          />
                          <TextInput
                            style={mo.setLogInput}
                            value={sl.tekrar}
                            onChangeText={(v) => updateSetLog(idx, 'tekrar', v)}
                            keyboardType="numeric"
                            placeholder="tk"
                            placeholderTextColor={COLORS.textMuted}
                          />
                          <TextInput
                            style={mo.setLogInput}
                            value={sl.rpe}
                            onChangeText={(v) => updateSetLog(idx, 'rpe', v)}
                            keyboardType="decimal-pad"
                            placeholder="—"
                            placeholderTextColor={COLORS.textMuted}
                          />
                        </View>
                      ))}
                    </>
                  )}

                  <TouchableOpacity
                    style={[mo.saveBtn, saving && mo.saveBtnDisabled]}
                    onPress={handleComplete}
                    activeOpacity={0.85}
                    disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={mo.saveBtnText}>{t('markAsDone')}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setModal(false); Keyboard.dismiss(); }} style={mo.cancelBtn}>
                    <Text style={mo.cancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Program Overview Modal ── */}
      <Modal visible={progModal} transparent animationType="slide">
        <View style={po.overlay}>
          <View style={po.sheet}>
            <View style={po.header}>
              <Text style={po.title}>{program.programAdi}</Text>
              <TouchableOpacity onPress={() => setProgModal(false)} style={po.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {program.gunler?.map((gun, dIdx) => (
                <View key={dIdx} style={po.dayCard}>
                  <View style={po.dayHeader}>
                    <View style={po.dayBadge}>
                      <Text style={po.dayBadgeText}>{dIdx + 1}</Text>
                    </View>
                    <Text style={po.dayName}>{gun.gunAdi}</Text>
                  </View>
                  {gun.egzersizler?.map((exc, eIdx) => (
                    <View key={eIdx} style={po.excRow}>
                      <Text style={po.excName}>{eIdx + 1}. {exc.isim || '—'}</Text>
                      <View style={po.setHeaderRow}>
                        {['Set', t('reps'), 'kg', 'RPE'].map((h, i) => (
                          <Text key={i} style={po.setHead}>{h}</Text>
                        ))}
                      </View>
                      {exc.setler?.map((set, sIdx) => (
                        <View key={sIdx} style={po.setRow}>
                          <Text style={po.setCell}>{sIdx + 1}</Text>
                          <Text style={po.setCell}>{set.tekrar || '—'}</Text>
                          <Text style={po.setCell}>{set.hedefKilo ? `${set.hedefKilo} kg` : '—'}</Text>
                          <Text style={[po.setCell, { color: COLORS.accent, fontWeight: '700' }]}>
                            {set.hedefRPE ? `${set.hedefRPE}/10` : '—'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Öğün Tamamla Modal ── */}
      <Modal visible={ogunModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={mo.overlay}>
              <TouchableWithoutFeedback>
                <View style={mo.sheet}>
                  <Text style={mo.title}>{t('completeMeal')} 🥗</Text>
                  <Text style={mo.desc}>
                    {selOgun !== null && beslenmeProgram?.ogunler?.[selOgun]?.ogunAdi} — {t('mealNote')}
                  </Text>
                  <TextInput
                    style={mo.noteInput}
                    value={ogunNote}
                    onChangeText={setOgunNote}
                    placeholder={t('mealNote')}
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <TouchableOpacity
                    style={[mo.saveBtn, { backgroundColor: COLORS.success }, ogunSaving && mo.saveBtnDisabled]}
                    onPress={handleOgunComplete}
                    activeOpacity={0.85}
                    disabled={ogunSaving}
                  >
                    {ogunSaving
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={mo.saveBtnText}>{t('markMealDone')}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setOgunModal(false); Keyboard.dismiss(); }} style={mo.cancelBtn}>
                    <Text style={mo.cancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── PR Ekle Modal ── */}
      <Modal visible={prModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={mo.overlay}>
              <TouchableWithoutFeedback>
                <View style={mo.sheet}>
                  <Text style={mo.title}>{t('addNewPR')} 🏆</Text>
                  <Text style={mo.desc}>{t('addPRDesc')}</Text>
                  <TextInput
                    style={mo.noteInput}
                    value={prHareket}
                    onChangeText={setPrHareket}
                    placeholder={t('prMovement')}
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <TextInput
                    style={[mo.noteInput, { minHeight: 52 }]}
                    value={prKg}
                    onChangeText={setPrKg}
                    keyboardType="decimal-pad"
                    placeholder={t('prWeight')}
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <TouchableOpacity
                    style={[mo.saveBtn, prSaving && mo.saveBtnDisabled]}
                    onPress={handleSavePr}
                    activeOpacity={0.85}
                    disabled={prSaving}
                  >
                    {prSaving
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={mo.saveBtnText}>{t('save')}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setPrModal(false); Keyboard.dismiss(); }} style={mo.cancelBtn}>
                    <Text style={mo.cancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── RPE Hesaplayıcı ── */}
      <RPECalculatorModal visible={rpeCalcModal} onClose={() => setRpeCalcModal(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.bg },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textSecondary },
  emptyDesc:  { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  signOutBtn: { marginTop: 8 },
  signOutText:{ color: COLORS.textMuted, fontSize: FONT.sm },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11,
  },
  tabBtnActive:        { backgroundColor: COLORS.accent + '22', borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabBtnActiveBeslenme:{ backgroundColor: COLORS.success + '22', borderBottomWidth: 2, borderBottomColor: COLORS.success },
  tabBtnText:          { fontSize: FONT.sm, color: COLORS.textMuted, fontWeight: '600' },
  tabBtnTextActive:    { color: COLORS.accent },
  tabBtnTextBeslenme:  { color: COLORS.success },
  tabDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success,
    position: 'absolute', top: 8, right: 12,
  },

  emptyTabWrap: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60, paddingHorizontal: 32 },

  beslenmeCodeCard: {
    alignItems: 'center', gap: 14, paddingTop: 50, paddingHorizontal: 32,
  },
  beslenmeCodeTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text },
  beslenmeCodeDesc:  { fontSize: FONT.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  beslenmeCodeBtn:   {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.success, borderRadius: RADIUS.md,
    paddingVertical: 14, paddingHorizontal: 28, ...SHADOW.small,
  },
  beslenmeCodeBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },

  ogunCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.success + '55', ...SHADOW.small,
  },
  ogunHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  ogunBadge:   {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.success,
    alignItems: 'center', justifyContent: 'center',
  },
  ogunAdi:     { flex: 1, fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  kcalChip:    {
    backgroundColor: COLORS.success + '22', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.success + '66',
  },
  kcalText:    { fontSize: FONT.xs, color: COLORS.success, fontWeight: '700' },
  besinRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 paddingVertical: 7, borderTopWidth: 1, borderTopColor: COLORS.border },
  besinIsim:   { fontSize: FONT.sm, color: COLORS.text, flex: 1 },
  besinDetay:  { fontSize: FONT.sm, color: COLORS.textSecondary },
  ogunNotRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10,
                 backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm, padding: 8 },
  ogunNotText: { flex: 1, fontSize: FONT.xs, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, gap: 8,
  },
  hello: {
    fontSize: FONT.xs,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  progName: {
    fontSize: FONT.xl,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  signOutIconBtn: { padding: 8 },
  viewProgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.accent,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6,
  },
  viewProgBtnText: { fontSize: FONT.xs, color: COLORS.accent, fontWeight: '700' },

  rpeCalcBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.warning,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6,
    marginRight: 6,
  },
  rpeCalcBtnText: { fontSize: FONT.xs, color: COLORS.warning, fontWeight: '700' },

  shareBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.success,
    alignItems: 'center', justifyContent: 'center', marginRight: 4,
  },

  progressWrap: { paddingHorizontal: 20, marginBottom: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:{ fontSize: FONT.sm, color: COLORS.textSecondary },
  progressPct:  { fontSize: FONT.sm, color: COLORS.accent, fontWeight: '700' },
  progressBg:   { height: 8, backgroundColor: COLORS.elevated, borderRadius: RADIUS.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: RADIUS.full },

  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  dayCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.small,
  },
  dayCardDone: { borderColor: COLORS.success, opacity: 0.85 },

  dayHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  dayBadge:      {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  dayBadgeDone:  { backgroundColor: COLORS.success },
  dayBadgeText:  { fontSize: FONT.sm, color: COLORS.white, fontWeight: '800' },
  dayTitleWrap:  { flex: 1 },
  dayTitle:      { fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  dayTitleDone:  { color: COLORS.success },
  doneDate:      { fontSize: FONT.xs, color: COLORS.success, marginTop: 2 },

  excList:    { marginBottom: 12 },

  noteRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  noteText:   { flex: 1, fontSize: FONT.sm, color: COLORS.textSecondary, lineHeight: 18, fontStyle: 'italic' },

  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.accent, borderRadius: RADIUS.md, height: 46,
  },
  completeBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },

  // Beslenme tab additions
  ogunCardDone: { borderColor: COLORS.success, opacity: 0.85 },
  ogunCompleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.success, borderRadius: RADIUS.md, height: 42, marginTop: 10,
  },
  ogunCompleteBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },

  // PR tab
  tabBtnActivePr:  { backgroundColor: COLORS.warning + '22', borderBottomWidth: 2, borderBottomColor: COLORS.warning },
  tabBtnTextPr:    { color: COLORS.warning },
  prCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.warning + '44', ...SHADOW.small,
  },
  prLeft:    { flex: 1 },
  prRight:   { alignItems: 'flex-end', minWidth: 80 },
  prHareket: { fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  prDate:    { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2 },
  prOnceki:  { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },
  prKg:      { fontSize: 26, fontWeight: '800', color: COLORS.warning },
  prBadge:   {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4,
    backgroundColor: COLORS.warning + '22', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  prBadgeText: { fontSize: 10, color: COLORS.warning, fontWeight: '700' },
});

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet:   {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '90%', padding: 28, borderWidth: 1, borderColor: COLORS.border,
  },
  title:    { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  desc:     { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: 16 },
  noteInput:{
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: FONT.md,
    minHeight: 80, marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: COLORS.success, borderRadius: RADIUS.md, height: 52,
    alignItems: 'center', justifyContent: 'center', ...SHADOW.small,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:     { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },
  cancelBtn:       { alignSelf: 'center', marginTop: 14, padding: 8 },
  cancelText:      { color: COLORS.textSecondary, fontSize: FONT.sm },
  // Set log styles
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  setLogHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 4, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  setLogHeadCell: { flex: 1, fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textAlign: 'center' },
  setLogRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  setLogExcName: {
    flex: 2, fontSize: FONT.xs, color: COLORS.text, fontWeight: '600',
  },
  setLogInput: {
    flex: 1, backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.text, fontSize: FONT.xs, textAlign: 'center',
    paddingVertical: 7, paddingHorizontal: 4,
  },
});

/* ── Program Overview Modal styles ── */
const po = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet:   {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '90%', padding: 24, borderWidth: 1, borderColor: COLORS.border,
  },
  header:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title:   { flex: 1, fontSize: FONT.xl, fontWeight: '800', color: COLORS.text },
  closeBtn:{ padding: 4 },
  dayCard: {
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  dayHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dayBadge:     {
    width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  dayBadgeText: { fontSize: FONT.xs, color: COLORS.white, fontWeight: '800' },
  dayName:      { fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  excRow:       { marginBottom: 10 },
  excName:      { fontSize: FONT.sm, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  setHeaderRow: { flexDirection: 'row', marginBottom: 3 },
  setHead:      { flex: 1, fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textAlign: 'center' },
  setRow:       { flexDirection: 'row', paddingVertical: 4, borderTopWidth: 1, borderTopColor: COLORS.border },
  setCell:      { flex: 1, fontSize: FONT.sm, color: COLORS.text, textAlign: 'center' },
});
