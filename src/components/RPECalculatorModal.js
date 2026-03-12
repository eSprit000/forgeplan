/**
 * RPECalculatorModal
 * Kullanıcı Kilo + Tekrar + RPE girer → Tahmini 1RM ve %'li hedef ağırlıklar görür.
 *
 * Formül (RPE tabanlı):
 *   pct1RM = 100 - (10 - rpe) * 5 - (reps - 1) * 3.333
 *   est1RM = weight / (pct1RM / 100)
 *
 * Kullanım:
 *   <RPECalculatorModal
 *     visible={rpeCalcModal}
 *     onClose={() => setRpeCalcModal(false)}
 *   />
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS, FONT, RADIUS, SHADOW } from '../constants/theme';
import { useLanguage } from '../i18n/LanguageContext';

/* ── RPE picker options ──────────────────────────────────────── */
const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const PCT_TARGETS = [
  { label: '90%', pct: 90 },
  { label: '85%', pct: 85 },
  { label: '80%', pct: 80 },
  { label: '75%', pct: 75 },
  { label: '70%', pct: 70 },
  { label: '65%', pct: 65 },
];

/* ── Hesaplama fonksiyonu ─────────────────────────────────────── */
const calc1RM = (kilo, tekrar, rpe) => {
  const k = parseFloat(kilo);
  const t = parseFloat(tekrar);
  const r = parseFloat(rpe);
  if (!k || !t || !r || k <= 0 || t <= 0 || r <= 0) return null;
  // Limit reps to 1-12 for accuracy
  const repsClamp = Math.min(Math.max(t, 1), 12);
  const pct = 100 - (10 - r) * 5 - (repsClamp - 1) * 3.333;
  if (pct <= 0) return null;
  return k / (pct / 100);
};

const round2half = (val) => Math.round(val * 2) / 2; // 2.5'in katına yuvarla

/* ── Component ───────────────────────────────────────────────── */
export default function RPECalculatorModal({ visible, onClose }) {
  const { t } = useLanguage();
  const [kilo, setKilo]   = useState('');
  const [tekrar, setTekrar] = useState('');
  const [rpe, setRpe]     = useState('');

  const est1RM = calc1RM(kilo, tekrar, rpe);
  const hasResult = est1RM !== null;

  const handleClose = () => {
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={s.sheet}>
                {/* Header */}
                <View style={s.header}>
                  <View style={s.headerLeft}>
                    <View style={s.iconBadge}>
                      <Ionicons name="calculator-outline" size={18} color={COLORS.white} />
                    </View>
                    <Text style={s.title}>{t('rpeCalcTitle')}</Text>
                  </View>
                  <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
                    <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={s.subtitle}>{t('rpeCalcSubtitle')}</Text>

                {/* Inputs */}
                <View style={s.inputRow}>
                  <View style={s.inputWrap}>
                    <Text style={s.inputLabel}>{t('prWeight')}</Text>
                    <TextInput
                      style={s.input}
                      value={kilo}
                      onChangeText={setKilo}
                      keyboardType="decimal-pad"
                      placeholder="120"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={s.inputWrap}>
                    <Text style={s.inputLabel}>{t('reps')}</Text>
                    <TextInput
                      style={s.input}
                      value={tekrar}
                      onChangeText={setTekrar}
                      keyboardType="numeric"
                      placeholder="5"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                  <View style={s.inputWrap}>
                    <Text style={s.inputLabel}>RPE</Text>
                    <TextInput
                      style={s.input}
                      value={rpe}
                      onChangeText={setRpe}
                      keyboardType="decimal-pad"
                      placeholder="8"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                {/* RPE quick-pick */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                  contentContainerStyle={s.rpePickRow}
                >
                  {RPE_OPTIONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[s.rpeChip, rpe === String(r) && s.rpeChipActive]}
                      onPress={() => setRpe(String(r))}
                    >
                      <Text style={[s.rpeChipText, rpe === String(r) && s.rpeChipTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Result */}
                {hasResult ? (
                  <View style={s.resultCard}>
                    <View style={s.resultMain}>
                      <Text style={s.resultLabel}>{t('est1RM')}</Text>
                      <Text style={s.resultValue}>{round2half(est1RM)} kg</Text>
                      <Text style={s.resultNote}>
                        {t('rpeResultNote').replace('{w}', kilo).replace('{r}', tekrar).replace('{rpe}', rpe)}
                      </Text>
                    </View>
                    <View style={s.divider} />
                    <Text style={s.targetsTitle}>{t('targetWeights')}</Text>
                    <Text style={s.targetsDesc}>{t('rpeTargetsDesc')}</Text>
                    <View style={s.targetsGrid}>
                      {PCT_TARGETS.map(({ label, pct }) => {
                        const w = round2half(est1RM * (pct / 100));
                        return (
                          <View key={label} style={s.targetCell}>
                            <Text style={s.targetPct}>{label}</Text>
                            <Text style={s.targetKg}>{w} kg</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <View style={s.emptyResult}>
                    <Ionicons name="barbell-outline" size={36} color={COLORS.textMuted} />
                    <Text style={s.emptyResultText}>{t('rpeEnterPrompt')}</Text>
                  </View>
                )}

                {/* Info box */}
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
                  <Text style={s.infoText}>{t('rpeInfo')}</Text>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
    borderWidth: 1, borderColor: COLORS.border,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: FONT.lg, fontWeight: '800', color: COLORS.text },
  closeBtn: { padding: 4 },
  subtitle: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: 20, lineHeight: 18 },

  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  inputWrap:{ flex: 1 },
  inputLabel:{ fontSize: 11, color: COLORS.textMuted, fontWeight: '700', marginBottom: 5 },
  input: {
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.text, fontSize: FONT.lg, fontWeight: '700',
    textAlign: 'center', paddingVertical: 12,
  },

  rpePickRow: { gap: 6, paddingVertical: 2 },
  rpeChip: {
    borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: COLORS.elevated, borderWidth: 1, borderColor: COLORS.border,
  },
  rpeChipActive:     { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  rpeChipText:       { fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: '700' },
  rpeChipTextActive: { color: COLORS.white },

  resultCard: {
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.lg,
    padding: 16, borderWidth: 1, borderColor: COLORS.accent + '44',
    marginBottom: 14,
  },
  resultMain: { alignItems: 'center', marginBottom: 12 },
  resultLabel:{ fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: '600' },
  resultValue:{ fontSize: 40, fontWeight: '800', color: COLORS.accent, lineHeight: 48 },
  resultNote: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },
  divider:    { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },
  targetsTitle:{ fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 6 },
  targetsDesc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16, marginBottom: 10 },
  targetsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  targetCell: {
    flex: 1, minWidth: '28%', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  targetPct:  { fontSize: FONT.xs, color: COLORS.textMuted, fontWeight: '700' },
  targetKg:   { fontSize: FONT.md, color: COLORS.text, fontWeight: '800', marginTop: 2 },

  emptyResult: {
    alignItems: 'center', gap: 8, paddingVertical: 20,
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 14,
  },
  emptyResultText: { fontSize: FONT.sm, color: COLORS.textMuted },

  infoBox: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm,
    padding: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  infoText: { flex: 1, fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
});
