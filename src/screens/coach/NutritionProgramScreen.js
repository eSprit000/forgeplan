import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    KeyboardAvoidingView,
    Modal,
    Platform, ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONT, RADIUS, SHADOW } from '../../constants/theme';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../navigation/AuthProvider';
import firestoreService from '../../services/firestoreService';

/* ─── helpers ──────────────────────────────────────────────── */
const newBesin  = () => ({ isim: '', miktar: '', kalori: '' });
const newOgun   = (n) => ({ ogunAdi: `${n}. Öğün`, besinler: [newBesin()], not: '' });

/* ─── SectionDivider ───────────────────────────────────────── */
const SectionDivider = ({ label }) => (
  <View style={sd.row}>
    <View style={sd.line} />
    <Text style={sd.label}>{label}</Text>
    <View style={sd.line} />
  </View>
);
const sd = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  line:  { flex: 1, height: 1, backgroundColor: COLORS.border },
  label: { fontSize: FONT.xs, color: COLORS.textMuted, marginHorizontal: 10, fontWeight: '600' },
});

/* ─── BesinRow ─────────────────────────────────────────────── */
const BesinRow = ({ index, data, onChange, onDelete, canDelete }) => {
  const { t } = useLanguage();
  return (
  <View style={br.row}>
    <View style={br.badge}>
      <Text style={br.badgeText}>{index + 1}</Text>
    </View>
    <TextInput
      style={br.nameInput}
      value={data.isim}
      onChangeText={(v) => onChange('isim', v)}
      placeholder={t('foodPlaceholder')}
      placeholderTextColor={COLORS.textMuted}
    />
    <View style={br.numWrap}>
      <Text style={br.numLabel}>{t('amountLabel')}</Text>
      <View style={br.numBox}>
        <TextInput
          style={br.numInput}
          value={data.miktar}
          onChangeText={(v) => onChange('miktar', v)}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={COLORS.textMuted}
        />
        <Text style={br.unit}>g</Text>
      </View>
    </View>
    <View style={br.numWrap}>
      <Text style={br.numLabel}>Kcal</Text>
      <View style={br.numBox}>
        <TextInput
          style={br.numInput}
          value={data.kalori}
          onChangeText={(v) => onChange('kalori', v)}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>
    </View>
    {canDelete && (
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="trash-outline" size={15} color={COLORS.textMuted} />
      </TouchableOpacity>
    )}
  </View>
);
};
const br = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  badge:     {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.elevated, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: FONT.xs, color: COLORS.textSecondary, fontWeight: '700' },
  nameInput: {
    flex: 1, color: COLORS.text, fontSize: FONT.sm,
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 10, height: 44,
  },
  numWrap:  { width: 64 },
  numLabel: { fontSize: 10, color: COLORS.textMuted, marginBottom: 3, fontWeight: '600' },
  numBox:   {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 6, height: 44,
  },
  numInput: { flex: 1, color: COLORS.text, fontSize: FONT.sm, padding: 0 },
  unit:     { fontSize: 10, color: COLORS.textMuted },
});

/* ─── Main Screen ──────────────────────────────────────────── */
export default function NutritionProgramScreen({ navigation, route }) {
  const { sporcu }      = route.params;
  const { user }        = useAuth();
  const { t }           = useLanguage();
  const [ogunler, setOgunler] = useState([newOgun(1)]);
  const [loading, setLoading] = useState(false);
  const [codeModal, setCodeModal] = useState(false);
  const [generatedCode, setCode]  = useState('');
  const [openNot, setOpenNot]     = useState({});

  const toggleNot = (idx) =>
    setOpenNot((prev) => ({ ...prev, [idx]: !prev[idx] }));

  // Mevcut beslenme programı varsa yükle
  useEffect(() => {
    if (sporcu.beslenmeProgramId) {
      firestoreService.sporcuBeslenmePrograminiGetir(sporcu.id)
        .then((prog) => { if (prog?.ogunler?.length) setOgunler(prog.ogunler); })
        .catch(() => {});
    }
  }, []);

  /* ── state helpers ── */
  const updateOgun = (oIdx, key, val) =>
    setOgunler((prev) => prev.map((o, i) => (i === oIdx ? { ...o, [key]: val } : o)));

  const updateBesin = (oIdx, bIdx, key, val) =>
    setOgunler((prev) =>
      prev.map((o, i) => {
        if (i !== oIdx) return o;
        return { ...o, besinler: o.besinler.map((b, j) => (j === bIdx ? { ...b, [key]: val } : b)) };
      })
    );

  const addOgun  = () => setOgunler((prev) => [...prev, newOgun(prev.length + 1)]);

  const addBesin = (oIdx) =>
    setOgunler((prev) =>
      prev.map((o, i) => (i === oIdx ? { ...o, besinler: [...o.besinler, newBesin()] } : o))
    );

  const deleteBesin = (oIdx, bIdx) =>
    setOgunler((prev) =>
      prev.map((o, i) => {
        if (i !== oIdx) return o;
        const next = o.besinler.filter((_, j) => j !== bIdx);
        return { ...o, besinler: next.length > 0 ? next : [newBesin()] };
      })
    );

  /* ── toplam kalori hesapla ── */
  const toplamKalori = (ogun) =>
    ogun.besinler.reduce((acc, b) => acc + (parseInt(b.kalori) || 0), 0);

  /* ── save ── */
  const handleSave = async () => {
    const hasEmpty = ogunler.some((o) => !o.ogunAdi.trim());
    if (hasEmpty) {
      Alert.alert(t('warning'), t('emptyMealName'));
      return;
    }
    setLoading(true);
    try {
      await firestoreService.beslenmeProgramiOlustur(user.uid, sporcu.id, {
        programAdi: sporcu.programAdi,
        ogunler,
      });
      setCode(sporcu.kod);
      setCodeModal(true);
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const shareCode = async () => {
    await Share.share({
      message:
        `Merhaba! 🥗 ForcePlan uygulamasındaki ${sporcu.programAdi} beslenme programına katılmak için bu kodu kullan:\n\n🔑 ${generatedCode}\n\nUygulamayı indir, "Sporcu" olarak giriş yap ve kodu gir.`,
    });
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.athleteTitle}>{sporcu.isim} {sporcu.soyisim}</Text>
          <Text style={s.coachLabel}>🥗 {sporcu.programAdi}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {ogunler.map((ogun, oIdx) => {
          const totalKcal = toplamKalori(ogun);
          return (
            <View key={oIdx} style={s.ogunCard}>
              {/* Öğün header */}
              <View style={s.ogunHeader}>
                <View style={s.ogunBadge}>
                  <Ionicons name="restaurant-outline" size={14} color={COLORS.white} />
                </View>
                <TextInput
                  style={s.ogunNameInput}
                  value={ogun.ogunAdi}
                  onChangeText={(v) => updateOgun(oIdx, 'ogunAdi', v)}
                  placeholder={t('mealNamePlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                />
                {totalKcal > 0 && (
                  <View style={s.kcalChip}>
                    <Text style={s.kcalText}>{totalKcal} kcal</Text>
                  </View>
                )}
              </View>

              <SectionDivider label={t('foodLabel').toUpperCase()} />

              {/* Besin header */}
              <View style={s.besinHeader}>
                <View style={{ width: 24 }} />
                <Text style={[s.besinHead, { flex: 1, paddingLeft: 6 }]}>{t('foodLabel')}</Text>
                <Text style={[s.besinHead, { width: 64, textAlign: 'center' }]}>{t('amountLabel')}</Text>
                <Text style={[s.besinHead, { width: 64, textAlign: 'center' }]}>Kcal</Text>
                <View style={{ width: 20 }} />
              </View>

              {ogun.besinler.map((besin, bIdx) => (
                <BesinRow
                  key={bIdx}
                  index={bIdx}
                  data={besin}
                  onChange={(key, val) => updateBesin(oIdx, bIdx, key, val)}
                  onDelete={() => deleteBesin(oIdx, bIdx)}
                  canDelete={ogun.besinler.length > 1}
                />
              ))}

              {/* Besin ekle + Not ekle */}
              <View style={s.addRow}>
                <TouchableOpacity style={s.addBesinBtn} onPress={() => addBesin(oIdx)}>
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.accent} />
                  <Text style={s.addBesinBtnText}>{t('addFood')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.addNoteBtn} onPress={() => toggleNot(oIdx)}>
                  <Ionicons
                    name={openNot[oIdx] ? 'chatbubble' : 'chatbubble-outline'}
                    size={15}
                    color={openNot[oIdx] ? COLORS.accent : COLORS.textSecondary}
                  />
                  <Text style={[s.addNoteBtnText, openNot[oIdx] && { color: COLORS.accent }]}>
                    {openNot[oIdx] ? 'Notu Kapat' : 'Not Ekle'}
                  </Text>
                </TouchableOpacity>
              </View>

              {openNot[oIdx] && (
                <TextInput
                  style={s.noteInput}
                  value={ogun.not ?? ''}
                  onChangeText={(v) => updateOgun(oIdx, 'not', v)}
                  placeholder="Bu öğün için not... (örn: yemekten 1 saat önce hazırla, porsiyon 2 tabak)"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}
            </View>
          );
        })}

        {/* Öğün Ekle */}
        <TouchableOpacity style={s.addOgunBtn} onPress={addOgun}>
          <Ionicons name="add" size={18} color={COLORS.accent} />
          <Text style={s.addOgunBtnText}>{t('addMeal')}</Text>
        </TouchableOpacity>

        {/* Kaydet */}
        <TouchableOpacity
          style={[s.saveBtn, loading && s.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.white} size="small" />
            : <>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                <Text style={s.saveBtnText}>{t('saveNutrProgram')}</Text>
              </>}
        </TouchableOpacity>
      </ScrollView>

      {/* ── Code Modal ── */}
      <Modal visible={codeModal} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.iconWrap}>
              <Ionicons name="checkmark-circle" size={52} color={COLORS.success} />
            </View>
            <Text style={m.title}>{t('nutritionCreated')}</Text>
            <Text style={m.desc}>
              {t('programCreatedDesc')}
            </Text>
            <View style={m.codeBox}>
              <Text style={m.code}>{generatedCode}</Text>
            </View>
            <TouchableOpacity style={m.shareBtn} onPress={shareCode} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
              <Text style={m.shareBtnText}>{t('shareViaMsg')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={m.doneBtn}
              onPress={() => { setCodeModal(false); navigation.navigate('CoachDashboard'); }}
            >
              <Text style={m.doneBtnText}>{t('goBack')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerMid:   { alignItems: 'center', flex: 1 },
  athleteTitle:{ fontSize: FONT.lg, fontWeight: '800', color: COLORS.text },
  coachLabel:  { fontSize: FONT.sm, color: COLORS.accent, fontWeight: '600', marginTop: 2 },

  ogunCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.small,
  },
  ogunHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ogunBadge:  {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.success,
    alignItems: 'center', justifyContent: 'center',
  },
  ogunNameInput: {
    flex: 1, color: COLORS.text, fontSize: FONT.md, fontWeight: '600',
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, height: 40,
  },
  kcalChip: {
    backgroundColor: COLORS.success + '22', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.success + '66',
  },
  kcalText: { fontSize: FONT.xs, color: COLORS.success, fontWeight: '700' },

  besinHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  besinHead:   { fontSize: 10, color: COLORS.textMuted, fontWeight: '700' },

  addRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  addBesinBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addBesinBtnText: { color: COLORS.accent, fontSize: FONT.sm, fontWeight: '600' },
  addNoteBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 2 },
  addNoteBtnText:{ color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: '600' },
  noteInput: {
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.success + '55',
    padding: 12, color: COLORS.text, fontSize: FONT.sm,
    minHeight: 72, marginTop: 8,
  },

  addOgunBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  addOgunBtnText: { color: COLORS.accent, fontSize: FONT.md, fontWeight: '700' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.success, borderRadius: RADIUS.lg,
    height: 50, marginHorizontal: 4, ...SHADOW.small,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet:   {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 44, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  iconWrap: { marginBottom: 12 },
  title:    { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  desc:     { fontSize: FONT.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  codeBox:  {
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.lg, borderWidth: 2,
    borderColor: COLORS.success, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 24,
  },
  code:        { fontSize: 32, fontWeight: '800', color: COLORS.success, letterSpacing: 6 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.success, borderRadius: RADIUS.md,
    paddingVertical: 14, paddingHorizontal: 28, width: '100%', justifyContent: 'center',
    marginBottom: 12, ...SHADOW.small,
  },
  shareBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },
  doneBtn:      { paddingVertical: 12 },
  doneBtnText:  { color: COLORS.textSecondary, fontSize: FONT.md },
});
