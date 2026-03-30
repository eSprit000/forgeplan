import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONT, RADIUS, SHADOW } from '../../constants/theme';
import { useAppTheme } from '../../i18n/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../navigation/AuthProvider';
import firestoreService from '../../services/firestoreService';

/* ── helpers ───────────────────────────────────────────────── */
const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const PR_SUGGESTIONS = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press',
  'Barbell Row', 'Pull-up', 'Hip Thrust', 'Romanian Deadlift',
];

/* ── Main Screen ───────────────────────────────────────────── */
export default function AthleteDetailScreen({ navigation, route }) {
  const { sporcu: initialSporcu } = route.params;
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isDark } = useAppTheme();
  const s = useMemo(makeS, [isDark]);
  const mo = useMemo(makeMo, [isDark]);
  const [sporcu] = useState(initialSporcu);

  const [kodCopied, setKodCopied] = useState(false);
  const copyKod = async (kod) => {
    await Clipboard.setStringAsync(kod);
    setKodCopied(true);
    setTimeout(() => setKodCopied(false), 2500);
  };

  // ── Sporcu sil ──
  const [siliniyor, setSiliniyor] = useState(false);

  const handleSporcuSil = () => {
    Alert.alert(
      'Sporcuyu Sil',
      `${sporcu.isim} ${sporcu.soyisim} adlı sporcuyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setSiliniyor(true);
            try {
              await firestoreService.sporcuSlotSil(sporcu.id, sporcu.sporcuUid ?? null);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Hata', e.message);
            } finally {
              setSiliniyor(false);
            }
          },
        },
      ]
    );
  };

  // PR state
  const [prler, setPrler] = useState([]);
  const [prLoading, setPrLoading] = useState(true);

  // Set log state
  const [setLogs, setSetLogs] = useState([]);
  const [setLogsLoading, setSetLogsLoading] = useState(true);

  // Tamamlanan günler sayısı
  const [doneCount, setDoneCount] = useState(0);
  const [ogunDoneCount, setOgunDoneCount] = useState(0);

  // PR modal
  const [prModal, setPrModal] = useState(false);
  const [prHareket, setPrHareket] = useState('');
  const [prKg, setPrKg] = useState('');
  const [prSaving, setPrSaving] = useState(false);
  const [editingPr, setEditingPr] = useState(null);

  // Vücut ölçümleri
  const [olcumler, setOlcumler]       = useState([]);
  // Koç yorumu
  const [yorumModal, setYorumModal]   = useState(false);
  const [yorumLogId, setYorumLogId]   = useState(null);
  const [yorumText, setYorumText]     = useState('');
  const [yorumSaving, setYorumSaving] = useState(false);

  const loadData = useCallback(async () => {
    setPrLoading(true);
    setSetLogsLoading(true);
    try {
      const [prs, logs, olcums] = await Promise.all([
        firestoreService.prKayitlariniGetir(sporcu.id),
        firestoreService.sporcuSetLoglariniGetir(sporcu.id),
        firestoreService.olcumleriGetir(sporcu.id),
      ]);

      if (sporcu.programId) {
        const done = await firestoreService.tamamlananGunleriGetir(sporcu.id, sporcu.programId);
        setDoneCount(done.length);
      }
      if (sporcu.beslenmeProgramId) {
        const done = await firestoreService.tamamlananOgunleriGetir(sporcu.id, sporcu.beslenmeProgramId);
        setOgunDoneCount(done.length);
      }

      setPrler(prs.sort((a, b) => (b.tarih?.seconds || 0) - (a.tarih?.seconds || 0)));
      setSetLogs(logs.sort((a, b) => (b.tarih?.seconds || 0) - (a.tarih?.seconds || 0)));
      setOlcumler(olcums ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setPrLoading(false);
      setSetLogsLoading(false);
    }
  }, [sporcu.id, sporcu.programId, sporcu.beslenmeProgramId]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const openAddPr = () => {
    setEditingPr(null);
    setPrHareket('');
    setPrKg('');
    setPrModal(true);
  };

  const openEditPr = (pr) => {
    setEditingPr(pr);
    setPrHareket(pr.hareket);
    setPrKg(String(pr.kg));
    setPrModal(true);
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
      await firestoreService.prEkleVeyaGuncelle(user.uid, sporcu.id, {
        hareket: prHareket.trim(),
        kg: parseFloat(prKg),
      });
      setPrModal(false);
      loadData();
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setPrSaving(false);
    }
  };

  const handleYorumKaydet = async () => {
    if (!yorumLogId) return;
    setYorumSaving(true);
    try {
      await firestoreService.logYorumuEkle(yorumLogId, yorumText.trim());
      setSetLogs((prev) =>
        prev.map((l) => l.id === yorumLogId ? { ...l, kocYorumu: yorumText.trim() } : l)
      );
      setYorumModal(false);
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setYorumSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.athleteName}>{sporcu.isim} {sporcu.soyisim}</Text>
          <TouchableOpacity
            style={[s.kodBadge, kodCopied && s.kodBadgeCopied]}
            onPress={() => copyKod(sporcu.kod)}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={kodCopied ? 'checkmark' : 'copy-outline'}
              size={11}
              color={kodCopied ? COLORS.success : COLORS.accent}
              style={{ marginRight: 4 }}
            />
            <Text style={[s.kodText, kodCopied && { color: COLORS.success }]}>
              {sporcu.kod}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={handleSporcuSil}
          disabled={siliniyor}
        >
          {siliniyor
            ? <ActivityIndicator size="small" color={COLORS.error} />
            : <Ionicons name="trash-outline" size={20} color={COLORS.error} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Programlar ── */}
        <Text style={s.sectionLabel}>{t('programs')}</Text>

        {/* Antrenman Card */}
        <View style={s.programCard}>
          <View style={[s.programIcon, { backgroundColor: COLORS.accent }]}>
            <Ionicons name="barbell-outline" size={18} color={COLORS.white} />
          </View>
          <View style={s.programInfo}>
            <Text style={s.programTitle}>{t('workoutProgram')}</Text>
            {sporcu.programId
              ? <Text style={s.programSub}>{sporcu.programAdi}  ·  {t('daysCompletedN').replace('{n}', doneCount)}</Text>
              : <Text style={s.programSubMuted}>{t('noProgram')}</Text>}
          </View>
          <TouchableOpacity
            style={[s.editBtn, { borderColor: COLORS.accent }]}
            onPress={() => navigation.navigate('CreateProgram', { sporcu })}
          >
            <Ionicons
              name={sporcu.programId ? 'create-outline' : 'add'}
              size={14} color={COLORS.accent}
            />
            <Text style={[s.editBtnText, { color: COLORS.accent }]}>
              {sporcu.programId ? t('edit') : t('createBtn')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Beslenme Card */}
        <View style={[s.programCard, { borderColor: COLORS.success + '55' }]}>
          <View style={[s.programIcon, { backgroundColor: COLORS.success }]}>
            <Ionicons name="nutrition-outline" size={18} color={COLORS.white} />
          </View>
          <View style={s.programInfo}>
            <Text style={s.programTitle}>{t('nutritionProgram')}</Text>
            {sporcu.beslenmeProgramId
              ? <Text style={[s.programSub, { color: COLORS.success }]}>
                  {sporcu.programAdi}  ·  {t('mealsCompletedN').replace('{n}', ogunDoneCount)}
                </Text>
              : <Text style={s.programSubMuted}>{t('noProgram')}</Text>}
          </View>
          <TouchableOpacity
            style={[s.editBtn, { borderColor: COLORS.success }]}
            onPress={() => navigation.navigate('CreateNutrition', { sporcu })}
          >
            <Ionicons
              name={sporcu.beslenmeProgramId ? 'create-outline' : 'add'}
              size={14} color={COLORS.success}
            />
            <Text style={[s.editBtnText, { color: COLORS.success }]}>
              {sporcu.beslenmeProgramId ? t('edit') : t('createBtn')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── PR Kayıtları ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>{t('prRecords')} 🏆</Text>
          <TouchableOpacity style={s.addBtn} onPress={openAddPr}>
            <Ionicons name="add" size={15} color={COLORS.white} />
            <Text style={s.addBtnText}>{t('addPR')}</Text>
          </TouchableOpacity>
        </View>

        {prLoading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
        ) : prler.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="trophy-outline" size={32} color={COLORS.textMuted} />
            <Text style={s.emptyText}>{t('noPR')}</Text>
            <Text style={s.emptySubText}>{t('noPRCoachDesc')}</Text>
          </View>
        ) : (
          prler.map((pr) => (
            <TouchableOpacity
              key={pr.id}
              style={s.prCard}
              onPress={() => openEditPr(pr)}
              activeOpacity={0.8}
            >
              <View style={s.prLeft}>
                <Text style={s.prHareket}>{pr.hareket}</Text>
                <Text style={s.prDate}>{t('dateLabel') ?? 'Tarih'}: {formatDate(pr.tarih)}</Text>
                {pr.oncekiKg != null && (
                  <Text style={s.prOnceki}>{t('prevRecord')}: {pr.oncekiKg} kg</Text>
                )}
              </View>
              <View style={s.prRight}>
                <Text style={s.prKg}>{pr.kg} kg</Text>
                <View style={s.editHint}>
                  <Ionicons name="create-outline" size={12} color={COLORS.textMuted} />
                  <Text style={s.editHintText}>{t('update')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* ── Antrenman Kayıtları ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>{t('workoutRecords')} 📊</Text>
        </View>

        {setLogsLoading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
        ) : setLogs.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="fitness-outline" size={32} color={COLORS.textMuted} />
            <Text style={s.emptyText}>{t('noRecords')}</Text>
            <Text style={s.emptySubText}>{t('noRecordsDesc')}</Text>
          </View>
        ) : (
          setLogs.slice(0, 10).map((log) => (
            <View key={log.id} style={s.logCard}>
              <View style={s.logHeader}>
                <View style={s.logBadge}>
                  <Ionicons name="barbell-outline" size={13} color={COLORS.white} />
                </View>
                <Text style={s.logGunAdi}>{log.gunAdi || t('dayN').replace('{n}', log.gunIndex + 1)}</Text>
                <Text style={s.logDate}>{formatDate(log.tarih)}</Text>
              </View>
              {log.performans?.filter(p => p.kilo || p.tekrar).map((p, pi) => (
                <View key={pi} style={s.logRow}>
                  <Text style={s.logExcName}>{p.egzersizIsim}</Text>
                  <Text style={s.logStats}>
                    {[
                      p.kilo ? `${p.kilo} kg` : null,
                      p.tekrar ? `${p.tekrar} tk` : null,
                      p.rpe ? `RPE ${p.rpe}` : null,
                    ].filter(Boolean).join('  ·  ')}
                  </Text>
                </View>
              ))}
              {log.kocYorumu ? (
                <TouchableOpacity
                  style={s.yorumRow}
                  onPress={() => { setYorumLogId(log.id); setYorumText(log.kocYorumu ?? ''); setYorumModal(true); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble" size={12} color={COLORS.accent} />
                  <Text style={s.yorumText} numberOfLines={2}>{log.kocYorumu}</Text>
                  <Ionicons name="pencil-outline" size={12} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={s.yorumAddBtn}
                  onPress={() => { setYorumLogId(log.id); setYorumText(''); setYorumModal(true); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-outline" size={13} color={COLORS.textMuted} />
                  <Text style={s.yorumAddText}>Yorum Ekle</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        {/* ── Vücut Ölçümleri ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>Vücut Ölçümleri 📏</Text>
        </View>
        {olcumler.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="body-outline" size={32} color={COLORS.textMuted} />
            <Text style={s.emptyText}>Henüz ölçüm yok</Text>
            <Text style={s.emptySubText}>Sporcu Ölçüm sekmesinden ekleyebilir.</Text>
          </View>
        ) : (
          <>
            {olcumler.slice(0, 1).map((olcum) => {
              const FLD = [
                { key: 'kilo',  label: 'Kilo',   unit: 'kg', color: COLORS.accent },
                { key: 'yag',   label: 'Yağ %',  unit: '%',  color: '#7C6EFA' },
                { key: 'bel',   label: 'Bel',    unit: 'cm', color: COLORS.warning },
                { key: 'gogus', label: 'Göğüs', unit: 'cm', color: COLORS.success },
                { key: 'bicep', label: 'Bicep',  unit: 'cm', color: '#FF6B35' },
              ];
              const filled = FLD.filter((f) => olcum[f.key] != null);
              const ts = olcum.tarih?.toDate
                ? olcum.tarih.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—';
              return (
                <View key={olcum.id} style={s.olcumCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <View style={[s.logBadge, { backgroundColor: '#7C6EFA' }]}>
                      <Ionicons name="body-outline" size={13} color={COLORS.white} />
                    </View>
                    <Text style={s.logGunAdi}>Son Ölçüm</Text>
                    <Text style={s.logDate}>{ts}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {filled.map((f) => (
                      <View key={f.key} style={[s.olcumChip, { borderColor: f.color + '55', backgroundColor: f.color + '18' }]}>
                        <Text style={[s.olcumChipVal, { color: f.color }]}>{olcum[f.key]}{f.unit}</Text>
                        <Text style={s.olcumChipLabel}>{f.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
            {olcumler.length > 1 && (
              <Text style={{ fontSize: FONT.xs, color: COLORS.textMuted, textAlign: 'center', marginBottom: 8, fontWeight: '600' }}>
                Toplam {olcumler.length} ölçüm kaydı var
              </Text>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Koç Yorum Modal ── */}
      <Modal visible={yorumModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={mo.overlay}>
            <View style={mo.sheet}>
              <Text style={mo.title}>Koç Yorumu 💬</Text>
              <TextInput
                style={[mo.input, { minHeight: 100, textAlignVertical: 'top' }]}
                value={yorumText}
                onChangeText={setYorumText}
                placeholder="Antrenman hakkında yorumun…"
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={300}
                autoFocus
              />
              <TouchableOpacity
                style={[mo.saveBtn, yorumSaving && mo.saveBtnDisabled]}
                onPress={handleYorumKaydet}
                disabled={yorumSaving}
                activeOpacity={0.85}
              >
                {yorumSaving
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <Text style={mo.saveBtnText}>Kaydet</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={mo.cancelBtn} onPress={() => setYorumModal(false)}>
                <Text style={mo.cancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── PR Ekle / Güncelle Modal ── */}
      <Modal visible={prModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={mo.overlay}>
            <View style={mo.sheet}>
              <Text style={mo.title}>
                {editingPr ? t('prUpdate') + ' 🔄' : t('addPR') + ' 🏆'}
              </Text>

              <Text style={mo.label}>{t('movement')}</Text>
              <TextInput
                style={mo.input}
                value={prHareket}
                onChangeText={setPrHareket}
                placeholder="Bench Press, Squat, Deadlift..."
                placeholderTextColor={COLORS.textMuted}
              />

              {/* Hızlı seçim önerileri */}
              {!editingPr && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 14 }}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {PR_SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={mo.suggestionChip}
                      onPress={() => setPrHareket(s)}
                    >
                      <Text style={mo.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={mo.label}>{t('prWeight')}</Text>
              <TextInput
                style={mo.input}
                value={prKg}
                onChangeText={setPrKg}
                keyboardType="decimal-pad"
                placeholder="120"
                placeholderTextColor={COLORS.textMuted}
              />

              {editingPr && editingPr.oncekiKg != null && (
                <View style={mo.infoRow}>
                  <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
                  <Text style={mo.infoText}>
                    {t('currentPRLabel')}: {editingPr.kg} kg  ·  {t('prevRecord')}: {editingPr.oncekiKg} kg
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[mo.saveBtn, prSaving && mo.saveBtnDisabled]}
                onPress={handleSavePr}
                disabled={prSaving}
                activeOpacity={0.85}
              >
                {prSaving
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <Text style={mo.saveBtnText}>{t('save')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPrModal(false)} style={mo.cancelBtn}>
                <Text style={mo.cancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const makeS = () => StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
  },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  athleteName: { fontSize: FONT.lg, fontWeight: '800', color: COLORS.text },
  kodBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  kodBadgeCopied: {
    borderColor: COLORS.success + '66', backgroundColor: COLORS.success + '11',
  },
  kodText: { fontSize: FONT.xs, color: COLORS.accent, fontWeight: '700', letterSpacing: 1 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, marginBottom: 10,
  },
  sectionLabel: {
    fontSize: FONT.md, fontWeight: '700', color: COLORS.text,
    marginTop: 20, marginBottom: 10,
  },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.accent, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  addBtnText: { color: COLORS.white, fontSize: FONT.xs, fontWeight: '700' },

  /* Program cards */
  programCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.small,
  },
  programIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  programInfo: { flex: 1 },
  programTitle:   { fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  programSub:     { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2 },
  programSubMuted:{ fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0,
  },
  editBtnText: { fontSize: FONT.xs, fontWeight: '700' },

  /* PR cards */
  prCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.small,
  },
  prLeft:    { flex: 1 },
  prRight:   { alignItems: 'flex-end', minWidth: 80 },
  prHareket: { fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  prDate:    { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2 },
  prOnceki:  { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },
  prKg:      { fontSize: 24, fontWeight: '800', color: COLORS.accent },
  editHint:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  editHintText: { fontSize: 10, color: COLORS.textMuted },

  /* Log cards */
  logCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.small,
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  logBadge:  {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  logGunAdi: { flex: 1, fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  logDate:   { fontSize: FONT.xs, color: COLORS.textMuted },
  logRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  logExcName: { fontSize: FONT.sm, color: COLORS.text, flex: 1 },
  logStats:   { fontSize: FONT.sm, color: COLORS.accent, fontWeight: '600' },

  /* Empty state */
  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 24,
    alignItems: 'center', gap: 6, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText:    { color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: '600' },
  emptySubText: { color: COLORS.textMuted, fontSize: FONT.xs, textAlign: 'center' },

  /* Antrenman log yorum */
  yorumRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6,
                  backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm,
                  padding: 8, marginTop: 8, borderWidth: 1, borderColor: COLORS.accent + '33' },
  yorumText:    { flex: 1, fontSize: FONT.xs, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 16 },
  yorumAddBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, paddingVertical: 4 },
  yorumAddText: { fontSize: FONT.xs, color: COLORS.textMuted, fontWeight: '600' },

  /* Vücut ölçüm cards */
  olcumCard:     { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
                   marginBottom: 8, borderWidth: 1, borderColor: '#7C6EFA33', ...SHADOW.soft },
  olcumChip:     { borderRadius: RADIUS.md, borderWidth: 1,
                   paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 72 },
  olcumChipVal:  { fontSize: FONT.md, fontWeight: '800' },
  olcumChipLabel:{ fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
});

const makeMo = () => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet:   {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 44, borderWidth: 1, borderColor: COLORS.border,
  },
  title:    { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  label:    { fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 },
  input:    {
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, color: COLORS.text, fontSize: FONT.md,
    marginBottom: 16,
  },
  suggestionChip: {
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: COLORS.border,
  },
  suggestionText: { fontSize: FONT.xs, color: COLORS.textSecondary, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm, padding: 10, marginBottom: 16,
  },
  infoText: { fontSize: FONT.xs, color: COLORS.textMuted },
  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md, height: 52,
    alignItems: 'center', justifyContent: 'center', ...SHADOW.small,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },
  cancelBtn:   { alignSelf: 'center', marginTop: 14, padding: 8 },
  cancelText:  { color: COLORS.textSecondary, fontSize: FONT.sm },
});
