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
import RPECalculatorModal from '../../components/RPECalculatorModal';
import { COLORS, FONT, RADIUS, SHADOW } from '../../constants/theme';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../navigation/AuthProvider';
import firestoreService from '../../services/firestoreService';

/* ─── helpers ─────────────────────────────────────────────── */
const newSet    = () => ({ tekrar: '', hedefKilo: '', hedefRPE: '', rir: '' });
const newExc    = () => ({ isim: '', not: '', setler: [newSet()] });
const newDay    = (n) => ({ gunAdi: `Gün ${n}`, egzersizler: [newExc()] });
const newWeek   = (wNo) => ({ haftaNo: wNo, gunler: [newDay(1)] });

const WEEK_OPTIONS = [1, 4, 6, 8, 12];

/* ─── tiny sub-components ──────────────────────────────────── */
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

/* ─── SetRow ───────────────────────────────────────────────── */
const SetRow = ({ setIndex, setData, onChange, onDelete, canDelete }) => (
  <View style={sr.row}>
    <View style={sr.badge}>
      <Text style={sr.badgeText}>{setIndex + 1}</Text>
    </View>
    <MiniInput label="Tekrar" value={setData.tekrar} onChangeText={(v) => onChange('tekrar', v)} unit="tk" />
    <MiniInput label="Kilo"   value={setData.hedefKilo} onChangeText={(v) => onChange('hedefKilo', v)} unit="kg" />
    <MiniInput label="RPE"   value={setData.hedefRPE} onChangeText={(v) => onChange('hedefRPE', v)} unit="/10" />
    <MiniInput label="RIR"   value={setData.rir ?? ''} onChangeText={(v) => onChange('rir', v)} unit="tk" />
    {canDelete && (
      <TouchableOpacity onPress={onDelete} style={sr.delBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="trash-outline" size={15} color={COLORS.textMuted} />
      </TouchableOpacity>
    )}
  </View>
);
const sr = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  badge:   {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.elevated, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: FONT.xs, color: COLORS.textSecondary, fontWeight: '700' },
  delBtn:  { paddingHorizontal: 2 },
});

const MiniInput = ({ label, value, onChangeText, unit }) => (
  <View style={mi.wrap}>
    <Text style={mi.label}>{label}</Text>
    <View style={mi.inputRow}>
      <TextInput
        style={mi.input}
        value={String(value ?? '')}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder="—"
        placeholderTextColor={COLORS.textMuted}
      />
      <Text style={mi.unit}>{unit}</Text>
    </View>
  </View>
);
const mi = StyleSheet.create({
  wrap:     { flex: 1, minWidth: 52 },
  label:    { fontSize: 10, color: COLORS.textMuted, marginBottom: 3, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 6, height: 52,
  },
  input:    { flex: 1, color: COLORS.text, fontSize: FONT.sm, padding: 4 },
  unit:     { fontSize: 10, color: COLORS.textMuted, marginLeft: 2 },
});

/* ─── Main Screen ──────────────────────────────────────────── */
export default function CreateProgramScreen({ navigation, route }) {
  const { sporcu }                        = route.params;
  const { user }                          = useAuth();
  const { t }                             = useLanguage();

  /* Multi-week state */
  const [haftaSayisi, setHaftaSayisi]     = useState(0);
  const [haftalar, setHaftalar]           = useState([]);
  const [expandedWeeks, setExpandedWeeks] = useState(new Set([0]));
  const [expandedDays, setExpandedDays]   = useState({});

  /* Other */
  const [loading, setLoading]             = useState(false);
  const [codeModal, setCodeModal]         = useState(false);
  const [generatedCode, setCode]          = useState('');
  const [openNot, setOpenNot]             = useState({});
  const [rpeCalcModal, setRpeCalcModal]   = useState(false);

  /* ── Week selection ── */
  const selectWeeks = (n) => {
    setHaftaSayisi(n);
    setHaftalar(Array.from({ length: n }, (_, i) => newWeek(i + 1)));
    setExpandedWeeks(new Set([0]));
    setExpandedDays({});
  };

  const toggleWeek = (wIdx) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      next.has(wIdx) ? next.delete(wIdx) : next.add(wIdx);
      return next;
    });
  };

  const toggleDay = (wIdx, dIdx) => {
    const key = `${wIdx}-${dIdx}`;
    setExpandedDays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleNot = (wIdx, dIdx, eIdx) => {
    const key = `${wIdx}-${dIdx}-${eIdx}`;
    setOpenNot((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ── Load existing program ── */
  useEffect(() => {
    if (!sporcu.programId) return;
    firestoreService.programGetir(sporcu.programId)
      .then((prog) => {
        if (!prog) return;
        if (prog.haftalar?.length) {
          const n = prog.haftaSayisi ?? prog.haftalar.length;
          setHaftaSayisi(n);
          setHaftalar(prog.haftalar);
          setExpandedWeeks(new Set([0]));
        } else if (prog.gunler?.length) {
          setHaftaSayisi(1);
          setHaftalar([{ haftaNo: 1, gunler: prog.gunler }]);
          setExpandedWeeks(new Set([0]));
        }
      })
      .catch(() => {});
  }, []);

  /* ── State helpers ── */
  const updateDay = (wIdx, dIdx, key, val) =>
    setHaftalar((prev) =>
      prev.map((h, wi) =>
        wi !== wIdx ? h : {
          ...h, gunler: h.gunler.map((d, di) => di === dIdx ? { ...d, [key]: val } : d),
        }
      )
    );

  const updateExc = (wIdx, dIdx, eIdx, key, val) =>
    setHaftalar((prev) =>
      prev.map((h, wi) =>
        wi !== wIdx ? h : {
          ...h,
          gunler: h.gunler.map((d, di) =>
            di !== dIdx ? d : {
              ...d,
              egzersizler: d.egzersizler.map((e, ei) => ei === eIdx ? { ...e, [key]: val } : e),
            }
          ),
        }
      )
    );

  const updateSet = (wIdx, dIdx, eIdx, sIdx, key, val) =>
    setHaftalar((prev) =>
      prev.map((h, wi) =>
        wi !== wIdx ? h : {
          ...h,
          gunler: h.gunler.map((d, di) =>
            di !== dIdx ? d : {
              ...d,
              egzersizler: d.egzersizler.map((e, ei) =>
                ei !== eIdx ? e : {
                  ...e,
                  setler: e.setler.map((s, si) => si === sIdx ? { ...s, [key]: val } : s),
                }
              ),
            }
          ),
        }
      )
    );

  const addDay = (wIdx) =>
    setHaftalar((prev) =>
      prev.map((h, wi) =>
        wi !== wIdx ? h : { ...h, gunler: [...h.gunler, newDay(h.gunler.length + 1)] }
      )
    );

  const addExercise = (wIdx, dIdx) =>
    setHaftalar((prev) =>
      prev.map((h, wi) =>
        wi !== wIdx ? h : {
          ...h,
          gunler: h.gunler.map((d, di) =>
            di !== dIdx ? d : { ...d, egzersizler: [...d.egzersizler, newExc()] }
          ),
        }
      )
    );

  const addSet = (wIdx, dIdx, eIdx) =>
    setHaftalar((prev) =>
      prev.map((h, wi) =>
        wi !== wIdx ? h : {
          ...h,
          gunler: h.gunler.map((d, di) =>
            di !== dIdx ? d : {
              ...d,
              egzersizler: d.egzersizler.map((e, ei) =>
                ei !== eIdx ? e : { ...e, setler: [...e.setler, newSet()] }
              ),
            }
          ),
        }
      )
    );

  const deleteSet = (wIdx, dIdx, eIdx, sIdx) =>
    setHaftalar((prev) =>
      prev.map((h, wi) =>
        wi !== wIdx ? h : {
          ...h,
          gunler: h.gunler.map((d, di) =>
            di !== dIdx ? d : {
              ...d,
              egzersizler: d.egzersizler.map((e, ei) => {
                if (ei !== eIdx) return e;
                const ns = e.setler.filter((_, k) => k !== sIdx);
                return { ...e, setler: ns.length > 0 ? ns : [newSet()] };
              }),
            }
          ),
        }
      )
    );

  /* ── Save ── */
  const handleSave = async () => {
    if (haftaSayisi === 0) {
      Alert.alert(t('warning'), t('selectWeekFirst'));
      return;
    }
    const allGunler = haftalar.flatMap((h) => h.gunler);
    if (allGunler.some((d) => !d.gunAdi.trim())) {
      Alert.alert(t('warning'), t('emptyDayName'));
      return;
    }
    setLoading(true);
    try {
      await firestoreService.programOlustur(user.uid, sporcu.id, {
        programAdi: sporcu.programAdi,
        gunler: allGunler,
        haftaSayisi,
        haftalar,
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
        `Merhaba! 💪 ForcePlan uygulamasındaki ${sporcu.programAdi} programına katılmak için bu kodu kullan:\n\n🔑 ${generatedCode}\n\nUygulamayı indir, "Sporcu" olarak giriş yap ve kodu gir.`,
    });
  };

  /* ─────────────────────── RENDER ──────────────────────────── */
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.athleteTitle}>{sporcu.isim} {sporcu.soyisim}</Text>
          <Text style={s.coachLabel}>{sporcu.programAdi}</Text>
        </View>
        <TouchableOpacity style={s.rpeCalcBtn} onPress={() => setRpeCalcModal(true)} activeOpacity={0.8}>
          <Ionicons name="calculator-outline" size={15} color={COLORS.warning} />
          <Text style={s.rpeCalcBtnText}>RPE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hafta Seçici ── */}
        {haftaSayisi === 0 ? (
          <View style={s.weekPickerCard}>
            <Ionicons name="calendar-outline" size={36} color={COLORS.accent} style={{ marginBottom: 12 }} />
            <Text style={s.weekPickerTitle}>{t('weekCount')}</Text>
            <Text style={s.weekPickerDesc}>
              Program süresini seç, ardından her haftayı ayrı ayrı düzenleyebilirsin.
            </Text>
            <View style={s.weekChips}>
              {WEEK_OPTIONS.map((n) => (
                <TouchableOpacity key={n} style={s.weekChip} onPress={() => selectWeeks(n)} activeOpacity={0.8}>
                  <Text style={s.weekChipText}>{t('weekN').replace('{n}', n)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* Banner */}
            <View style={s.weekBanner}>
              <Ionicons name="calendar" size={16} color={COLORS.accent} />
              <Text style={s.weekBannerText}>{t('weeklyProgram').replace('{n}', haftaSayisi)}</Text>
              <TouchableOpacity onPress={() => setHaftaSayisi(0)} style={s.weekResetBtn}>
                <Text style={s.weekResetText}>{t('changeWeek')}</Text>
              </TouchableOpacity>
            </View>

            {/* Week accordion cards */}
            {haftalar.map((hafta, wIdx) => (
              <View key={wIdx} style={s.weekCard}>
                <TouchableOpacity style={s.weekCardHeader} onPress={() => toggleWeek(wIdx)} activeOpacity={0.8}>
                  <View style={s.weekBadge}><Text style={s.weekBadgeText}>{hafta.haftaNo}</Text></View>
                  <Text style={s.weekCardTitle}>{t('weekTitle').replace('{n}', hafta.haftaNo)}</Text>
                  <Text style={s.weekDayCount}>{hafta.gunler.length} gün</Text>
                  <Ionicons name={expandedWeeks.has(wIdx) ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>

                {expandedWeeks.has(wIdx) && (
                  <View style={s.weekBody}>
                    {hafta.gunler.map((day, dIdx) => {
                      const dayKey = `${wIdx}-${dIdx}`;
                      const isDayOpen = !!expandedDays[dayKey];
                      return (
                        <View key={dIdx} style={s.dayCard}>
                          <TouchableOpacity style={s.dayHeader} onPress={() => toggleDay(wIdx, dIdx)} activeOpacity={0.8}>
                            <View style={s.dayBadge}><Text style={s.dayBadgeText}>{dIdx + 1}</Text></View>
                            <Text style={s.dayNameDisplay} numberOfLines={1}>{day.gunAdi || t('dayN').replace('{n}', dIdx + 1)}</Text>
                            <Text style={s.dayExcCount}>{day.egzersizler.length} hareket</Text>
                            <Ionicons name={isDayOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
                          </TouchableOpacity>

                          {isDayOpen && (
                            <>
                              <TextInput
                                style={s.dayNameInput}
                                value={day.gunAdi}
                                onChangeText={(v) => updateDay(wIdx, dIdx, 'gunAdi', v)}
                                placeholder="Gün adı (örn: Göğüs & Triceps)"
                                placeholderTextColor={COLORS.textMuted}
                              />
                              <SectionDivider label="EGZERSİZLER" />

                              {day.egzersizler.map((exc, eIdx) => {
                                const notKey = `${wIdx}-${dIdx}-${eIdx}`;
                                return (
                                  <View key={eIdx} style={s.excCard}>
                                    <View style={s.excHeader}>
                                      <View style={s.excNum}><Text style={s.excNumText}>{eIdx + 1}</Text></View>
                                      <TextInput
                                        style={s.excInput}
                                        value={exc.isim}
                                        onChangeText={(v) => updateExc(wIdx, dIdx, eIdx, 'isim', v)}
                                        placeholder={t('exercisePlaceholder')}
                                        placeholderTextColor={COLORS.textMuted}
                                      />
                                    </View>
                                    <View style={s.setHeaderRow}>
                                      <Text style={s.setHeaderText}>Set</Text>
                                      <Text style={[s.setHeaderText, { flex: 1, textAlign: 'center' }]}>Tekrar</Text>
                                      <Text style={[s.setHeaderText, { flex: 1, textAlign: 'center' }]}>Kilo</Text>
                                      <Text style={[s.setHeaderText, { flex: 1, textAlign: 'center' }]}>RPE</Text>
                                      <Text style={[s.setHeaderText, { flex: 1, textAlign: 'center' }]}>RIR</Text>
                                    </View>
                                    {exc.setler.map((set, sIdx) => (
                                      <SetRow
                                        key={sIdx}
                                        setIndex={sIdx}
                                        setData={set}
                                        onChange={(key, val) => updateSet(wIdx, dIdx, eIdx, sIdx, key, val)}
                                        onDelete={() => deleteSet(wIdx, dIdx, eIdx, sIdx)}
                                        canDelete={exc.setler.length > 1}
                                      />
                                    ))}
                                    <View style={s.addSetRow}>
                                      <TouchableOpacity style={s.addSetBtn} onPress={() => addSet(wIdx, dIdx, eIdx)}>
                                        <Ionicons name="add-circle-outline" size={16} color={COLORS.accent} />
                                        <Text style={s.addSetBtnText}>{t('addSet')}</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity style={s.addNoteBtn} onPress={() => toggleNot(wIdx, dIdx, eIdx)}>
                                        <Ionicons
                                          name={openNot[notKey] ? 'chatbubble' : 'chatbubble-outline'}
                                          size={15}
                                          color={openNot[notKey] ? COLORS.accent : COLORS.textSecondary}
                                        />
                                        <Text style={[s.addNoteBtnText, openNot[notKey] && { color: COLORS.accent }]}>
                                          {openNot[notKey] ? 'Notu Kapat' : 'Not Ekle'}
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                    {openNot[notKey] && (
                                      <TextInput
                                        style={s.noteInput}
                                        value={exc.not ?? ''}
                                        onChangeText={(v) => updateExc(wIdx, dIdx, eIdx, 'not', v)}
                                        placeholder="Koçluk notu..."
                                        placeholderTextColor={COLORS.textMuted}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                      />
                                    )}
                                  </View>
                                );
                              })}
                              <TouchableOpacity style={s.addExcBtn} onPress={() => addExercise(wIdx, dIdx)}>
                                <Ionicons name="add" size={18} color={COLORS.accent} />
                                <Text style={s.addExcBtnText}>{t('addExercise')}</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      );
                    })}
                    <TouchableOpacity style={s.addDayBtn} onPress={() => addDay(wIdx)}>
                      <Ionicons name="calendar-outline" size={18} color={COLORS.accent} />
                      <Text style={s.addDayBtnText}>{t('addDay')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={[s.saveBtn, loading && s.saveBtnDisabled]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                    <Text style={s.saveBtnText}>{t('save')}</Text>
                  </>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── Code Modal ── */}
      <Modal visible={codeModal} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.iconWrap}>
              <Ionicons name="checkmark-circle" size={52} color={COLORS.success} />
            </View>
            <Text style={m.title}>{t('programCreated')}</Text>
            <Text style={m.desc}>
              {t('programCreatedDesc')}
            </Text>
            <View style={m.codeBox}><Text style={m.code}>{generatedCode}</Text></View>
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

      {/* ── RPE Hesaplayıcı ── */}
      <RPECalculatorModal visible={rpeCalcModal} onClose={() => setRpeCalcModal(false)} />
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
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerMid:    { alignItems: 'center', flex: 1 },
  athleteTitle: { fontSize: FONT.lg, fontWeight: '800', color: COLORS.text },
  coachLabel:   { fontSize: FONT.sm, color: COLORS.accent, fontWeight: '600', marginTop: 2 },
  rpeCalcBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.warning,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6,
  },
  rpeCalcBtnText: { fontSize: FONT.xs, color: COLORS.warning, fontWeight: '700' },

  /* Week picker */
  weekPickerCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginTop: 12, ...SHADOW.small,
  },
  weekPickerTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  weekPickerDesc:  { fontSize: FONT.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  weekChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  weekChip: {
    backgroundColor: COLORS.accent + '22', borderWidth: 1.5, borderColor: COLORS.accent,
    borderRadius: RADIUS.full, paddingHorizontal: 20, paddingVertical: 12,
  },
  weekChipText: { color: COLORS.accent, fontWeight: '700', fontSize: FONT.md },

  /* Week banner */
  weekBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.accent + '18', borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.accent + '44',
  },
  weekBannerText: { flex: 1, fontSize: FONT.sm, color: COLORS.accent, fontWeight: '700' },
  weekResetBtn:   { paddingHorizontal: 8, paddingVertical: 4 },
  weekResetText:  { fontSize: FONT.xs, color: COLORS.textMuted, fontWeight: '600' },

  /* Week card */
  weekCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.small, overflow: 'hidden',
  },
  weekCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  weekBadge: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  weekBadgeText: { fontSize: FONT.sm, color: COLORS.white, fontWeight: '800' },
  weekCardTitle: { flex: 1, fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  weekDayCount:  { fontSize: FONT.xs, color: COLORS.textMuted, marginRight: 6 },
  weekBody:      { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.border },

  /* Day card (collapsible inside week) */
  dayCard: {
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md, padding: 12,
    marginTop: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  dayHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayBadge:       {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.accent + '33',
    borderWidth: 1, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  dayBadgeText:   { fontSize: FONT.xs, color: COLORS.accent, fontWeight: '800' },
  dayNameDisplay: { flex: 1, fontSize: FONT.sm, fontWeight: '600', color: COLORS.text },
  dayExcCount:    { fontSize: FONT.xs, color: COLORS.textMuted, marginRight: 4 },
  dayNameInput:   {
    color: COLORS.text, fontSize: FONT.md, fontWeight: '600',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, height: 40, marginTop: 10,
  },

  excCard:    {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  excHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  excNum:     {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  excNumText: { fontSize: 11, color: COLORS.white, fontWeight: '800' },
  excInput:   {
    flex: 1, color: COLORS.text, fontSize: FONT.md, fontWeight: '600',
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, height: 36,
  },

  setHeaderRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  setHeaderText: { width: 24, fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textAlign: 'center' },

  addSetRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  addSetBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addSetBtnText: { color: COLORS.accent, fontSize: FONT.sm, fontWeight: '600' },
  addNoteBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 2 },
  addNoteBtnText:{ color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: '600' },
  noteInput: {
    backgroundColor: COLORS.bg, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.accent + '55',
    padding: 12, color: COLORS.text, fontSize: FONT.sm, minHeight: 72, marginTop: 8,
  },

  addExcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderColor: COLORS.accent, borderStyle: 'dashed',
    borderRadius: RADIUS.md, paddingVertical: 10, marginTop: 6,
  },
  addExcBtnText: { color: COLORS.accent, fontSize: FONT.sm, fontWeight: '700' },

  addDayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 10,
  },
  addDayBtnText: { color: COLORS.accent, fontSize: FONT.sm, fontWeight: '700' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    height: 50, marginHorizontal: 4, marginTop: 8, ...SHADOW.small,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },
});

const m = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 44, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  iconWrap: { marginBottom: 12 },
  title:    { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  desc:     { fontSize: FONT.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  codeBox:  {
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.lg, borderWidth: 2,
    borderColor: COLORS.accent, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 24,
  },
  code:     { fontSize: 32, fontWeight: '800', color: COLORS.accent, letterSpacing: 6 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    paddingVertical: 14, paddingHorizontal: 28, width: '100%', justifyContent: 'center',
    marginBottom: 12, ...SHADOW.small,
  },
  shareBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },
  doneBtn:      { paddingVertical: 12 },
  doneBtnText:  { color: COLORS.textSecondary, fontSize: FONT.md },
});


