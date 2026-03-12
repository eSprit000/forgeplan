import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform, ScrollView,
    StatusBar,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONT, RADIUS, SHADOW } from '../../constants/theme';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../navigation/AuthProvider';
import firestoreService from '../../services/firestoreService';

export default function AddAthleteScreen({ navigation }) {
  const { user }          = useAuth();
  const { t }             = useLanguage();
  const [isim, setIsim]   = useState('');
  const [soyisim, setSoy] = useState('');
  const [prog, setProg]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [programTuru, setProgramTuru] = useState(null); // 'antrenman' | 'beslenme'

  const basicReady = isim.trim() && soyisim.trim() && prog.trim();
  const ready = basicReady && programTuru;

  const handleCreate = async () => {
    if (!ready) return;
    setLoading(true);
    try {
      const { id, kod } = await firestoreService.sporcuEkle(user.uid, {
        isim: isim.trim(),
        soyisim: soyisim.trim(),
        programAdi: prog.trim(),
        programTuru,
      });
      const sporcuData = { id, isim: isim.trim(), soyisim: soyisim.trim(), programAdi: prog.trim(), kod, programTuru };
      if (programTuru === 'beslenme') {
        navigation.replace('CreateNutrition', { sporcu: sporcuData });
      } else {
        navigation.replace('CreateProgram', { sporcu: sporcuData });
      }
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('addAthleteTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Form card ── */}
        <View style={s.card}>
          <Field
            icon="person-outline"
            label={t('firstName')}
            placeholder="Çağdaş"
            value={isim}
            onChangeText={setIsim}
          />
          <Field
            icon="person-outline"
            label={t('lastName')}
            placeholder="Çetinkaya"
            value={soyisim}
            onChangeText={setSoy}
          />
          <Field
            icon="barbell-outline"
            label={t('programName')}
            placeholder={t('exercisePlaceholder')}
            value={prog}
            onChangeText={setProg}
          />
        </View>

        {/* ── Program türü seçimi ── */}
        {basicReady && (
          <View style={s.typeSection}>
            <Text style={s.typeLabel}>{t('programTypeSelect')}</Text>
            <View style={s.typeRow}>
              <TouchableOpacity
                style={[s.typeBtn, programTuru === 'antrenman' && s.typeBtnActive]}
                onPress={() => setProgramTuru('antrenman')}
                activeOpacity={0.8}
              >
                <Ionicons name="barbell-outline" size={26}
                  color={programTuru === 'antrenman' ? COLORS.white : COLORS.accent} />
                <Text style={[s.typeBtnText, programTuru === 'antrenman' && s.typeBtnTextActive]}>
                  {t('workoutProgram').replace(' ', `\n`)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeBtn, programTuru === 'beslenme' && s.typeBtnActive]}
                onPress={() => setProgramTuru('beslenme')}
                activeOpacity={0.8}
              >
                <Ionicons name="nutrition-outline" size={26}
                  color={programTuru === 'beslenme' ? COLORS.white : COLORS.accent} />
                <Text style={[s.typeBtnText, programTuru === 'beslenme' && s.typeBtnTextActive]}>
                  {t('nutritionProgram').replace(' ', `\n`)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Oluştur butonu ── */}
        {ready && (
          <View style={s.createSection}>
            <Text style={s.createLabel}>{t('createProgram')}</Text>
            <TouchableOpacity
              style={[s.fab, loading && s.fabDisabled]}
              onPress={handleCreate}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Ionicons name="add" size={32} color={COLORS.white} />}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, label, placeholder, value, onChangeText }) {
  return (
    <View style={f.wrapper}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.inputRow, value && f.inputRowActive]}>
        <Ionicons name={icon} size={18} color={value ? COLORS.accent : COLORS.textSecondary} style={f.icon} />
        <TextInput
          style={f.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}
const f = StyleSheet.create({
  wrapper:       { marginBottom: 16 },
  label:         { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '600' },
  inputRow:      {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 52,
  },
  inputRowActive:{ borderColor: COLORS.accent },
  icon:          { marginRight: 10 },
  input:         { flex: 1, color: COLORS.text, fontSize: FONT.md },
});

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.text },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 20, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.small,
  },

  createSection: { alignItems: 'center', marginTop: 32, gap: 16 },
  createLabel: {
    fontSize: FONT.xl, fontWeight: '700', color: COLORS.text,
    letterSpacing: 0.5,
  },
  fab: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.medium,
  },
  fabDisabled: { opacity: 0.5 },

  typeSection: { marginTop: 28 },
  typeLabel:   { fontSize: FONT.md, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  typeRow:     { flexDirection: 'row', gap: 14 },
  typeBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    paddingVertical: 22, borderWidth: 2, borderColor: COLORS.accent + '55',
    ...SHADOW.small,
  },
  typeBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  typeBtnText:   { fontSize: FONT.sm, color: COLORS.accent, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
  typeBtnTextActive: { color: COLORS.white },
});
