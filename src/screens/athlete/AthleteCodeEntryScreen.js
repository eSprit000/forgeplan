import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import {
    ActivityIndicator, Alert,
    StatusBar,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONT, RADIUS, SHADOW } from '../../constants/theme';
import { useAppTheme } from '../../i18n/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../navigation/AuthProvider';
import firestoreService from '../../services/firestoreService';

export default function AthleteCodeEntryScreen() {
  const { user, setSporcuLinked, signOut } = useAuth();
  const { t } = useLanguage();
  const { isDark } = useAppTheme();
  const s = useMemo(makeS, [isDark]);
  const [kod, setKod]       = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = kod.trim().toUpperCase();
    if (trimmed.length < 4) {
      Alert.alert(t('invalidCode'), t('invalidCodeDesc'));
      return;
    }
    setLoading(true);
    try {
      const result = await firestoreService.sporcuKoduDogrula(trimmed, user.uid);
      if (!result) {
        Alert.alert(t('codeNotFound'), t('codeNotFoundDesc'));
        return;
      }
      setSporcuLinked({ sporcuId: result.sporcuId ?? result.id, kocId: result.kocId });
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.logoWrap}>
          <Ionicons name="barbell" size={28} color={COLORS.accent} />
        </View>
        <Text style={s.appName}>ForcePlan</Text>
      </View>

      {/* Content */}
      <View style={s.content}>
        <View style={s.iconCircle}>
          <Ionicons name="key-outline" size={36} color={COLORS.accent} />
        </View>

        <Text style={s.title}>{t('enterCode')}</Text>
        <Text style={s.desc}>{t('enterCodeDesc')}</Text>

        {/* Code input */}
        <View style={s.inputWrap}>
          <TextInput
            style={s.codeInput}
            value={kod}
            onChangeText={(v) => setKod(v.toUpperCase())}
            placeholder="A1B2C3"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            textAlign="center"
          />
        </View>

        <TouchableOpacity
          style={[s.btn, (!kod.trim() || loading) && s.btnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={!kod.trim() || loading}
        >
          {loading
            ? <ActivityIndicator color={COLORS.white} size="small" />
            : <Text style={s.btnText}>{t('verifyCode')}</Text>}
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity onPress={signOut} style={s.signOutBtn}>
        <Text style={s.signOutText}>{t('switchAccount')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeS = () => StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 28 },

  header:  { alignItems: 'center', paddingTop: 60, paddingBottom: 16 },
  logoWrap:{
    width: 52, height: 52, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  appName: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, letterSpacing: 1 },

  content:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    ...SHADOW.medium,
  },
  title:      { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  desc:       { fontSize: FONT.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  inputWrap: { width: '100%', marginVertical: 8 },
  codeInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.accent,
    height: 68, fontSize: 28, fontWeight: '800',
    color: COLORS.accent, letterSpacing: 8,
    width: '100%', ...SHADOW.small,
  },

  btn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    height: 54, alignItems: 'center', justifyContent: 'center',
    width: '100%', ...SHADOW.small,
  },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },

  signOutBtn:  { alignSelf: 'center', marginBottom: 36, padding: 8 },
  signOutText: { color: COLORS.textMuted, fontSize: FONT.sm },
});
