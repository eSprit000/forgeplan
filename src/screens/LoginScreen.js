import { Ionicons } from '@expo/vector-icons';
import { ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { auth } from '../config/firebaseConfig';
import { COLORS, FONT, RADIUS, SHADOW } from '../constants/theme';
import { useLanguage } from '../i18n/LanguageContext';

WebBrowser.maybeCompleteAuthSession();

const firebaseErrorToTurkish = (code) => {
  switch (code) {
    case 'auth/invalid-email':          return 'Geçersiz e-posta adresi.';
    case 'auth/user-not-found':         return 'Bu e-posta ile kayıtlı hesap bulunamadı.';
    case 'auth/wrong-password':         return 'Şifre hatalı. Lütfen tekrar deneyin.';
    case 'auth/invalid-credential':     return 'E-posta veya şifre hatalı.';
    case 'auth/email-already-in-use':   return 'Bu e-posta zaten kullanılıyor.';
    case 'auth/weak-password':          return 'Şifre en az 6 karakter olmalıdır.';
    case 'auth/too-many-requests':      return 'Çok fazla başarısız deneme. Lütfen bekleyin.';
    case 'auth/network-request-failed': return 'İnternet bağlantısı yok.';
    default:                            return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
};

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState('login'); // 'login' | 'register'

  const { t } = useLanguage();

  // ── Entrance animations ──
  const logoAnim  = useRef(new Animated.Value(0)).current;
  const cardAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const logoScale   = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const logoOpacity = logoAnim;
  const cardTransY  = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const cardOpacity = cardAnim;

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId:  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    responseType: ResponseType.IdToken,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (!idToken) {
        Alert.alert(t('error'), 'ID token alınamadı. Lütfen tekrar deneyin.');
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      setLoading(true);
      signInWithCredential(auth, credential)
        .catch((e) => Alert.alert(t('error'), firebaseErrorToTurkish(e.code)))
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      Alert.alert(t('error'), 'Google ile giriş iptal edildi veya hata oluştu.');
    }
  }, [response]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('error'), t('emailRequired'));
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!cred.user.emailVerified) {
          await auth.signOut();
          Alert.alert(
            t('verifyEmail'),
            t('verifyEmailDesc'),
            [
              { text: t('resendMail'), onPress: async () => {
                  const tmp = await signInWithEmailAndPassword(auth, email.trim(), password);
                  await sendEmailVerification(tmp.user);
                  await auth.signOut();
                  Alert.alert(t('done'), t('resendSuccess'));
                }
              },
              { text: t('done'), style: 'cancel' },
            ]
          );
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(cred.user);
        await auth.signOut();
        Alert.alert(
          t('registerBtn') + ' 🎉',
          'E-postanıza bir doğrulama linki gönderdik. Lütfen e-postanızı kontrol edip linke tıklayın, ardından giriş yapın.'
        );
        setMode('login');
      }
    } catch (e) {
      const msg = firebaseErrorToTurkish(e.code);
      Alert.alert(t('error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t('email'), t('emailNeeded'));
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(t('done'), t('resetSent'));
    } catch (e) {
      Alert.alert(t('error'), e.message);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ── */}
        <Animated.View style={[s.logoSection, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <View style={s.logoWrap}>
            <Ionicons name="barbell" size={38} color={COLORS.accent} />
          </View>
          <Text style={s.appName}>ForgePlan</Text>
          <Text style={s.tagline}>{t('appTagline')}</Text>
        </Animated.View>

        {/* ── Form card ── */}
        <Animated.View style={[s.card, { opacity: cardOpacity, transform: [{ translateY: cardTransY }] }]}>
          <Text style={s.cardTitle}>
            {mode === 'login' ? t('loginTitle') : t('registerTitle')}
          </Text>

          {/* Email */}
          <View style={s.inputRow}>
            <Ionicons name="mail-outline" size={18}
              color={COLORS.textSecondary}
              style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder={t('email')}
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <View style={s.inputRow}>
            <Ionicons name="lock-closed-outline" size={18}
              color={COLORS.textSecondary}
              style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder={t('password')}
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPwd}
              autoCorrect={false}
              spellCheck={false}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={s.eyeBtn}>
              <Ionicons
                name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Primary button */}
          <TouchableOpacity
            style={[s.primaryBtn, loading && s.disabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={s.primaryBtnText}>
                  {mode === 'login' ? t('loginBtn') : t('registerBtn')}
                </Text>}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>{t('orDivider')}</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Apple */}
          <TouchableOpacity
            style={s.socialBtn}
            activeOpacity={0.8}
            onPress={() => Alert.alert(
              'Apple ile Giriş',
              'Bu özellik yakında eklenecek. Şimdilik e-posta ile giriş yapabilirsiniz.'
            )}
          >
            <Ionicons name="logo-apple" size={20} color={COLORS.textMuted} />
            <Text style={[s.socialBtnText, { color: COLORS.textMuted }]}>Apple</Text>
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity
            style={[s.socialBtn, { marginTop: 10 }, (!request || loading) && s.disabled]}
            activeOpacity={0.8}
            disabled={!request || loading}
            onPress={() => promptAsync()}
          >
            {loading
              ? <ActivityIndicator size="small" color={COLORS.text} />
              : <>
                  <Ionicons name="logo-google" size={18} color={COLORS.text} />
                  <Text style={s.socialBtnText}>{t('googleLogin')}</Text>
                </>
            }
          </TouchableOpacity>
        </Animated.View>

        {/* ── Footer links ── */}
        {mode === 'login' && (
          <TouchableOpacity onPress={handleForgotPassword} style={s.footerLink}>
            <Text style={s.footerLinkText}>{t('forgotPassword')}</Text>
          </TouchableOpacity>
        )}

        <View style={s.switchRow}>
          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={s.switchLabel}>
              {mode === 'login' ? t('switchToRegister') : t('switchToLogin')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 120 },

  logoSection: { alignItems: 'center', paddingTop: 72, paddingBottom: 36 },
  logoWrap: {
    width: 76, height: 76, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5, borderColor: COLORS.accent + '55',
    ...SHADOW.accentGlow,
  },
  appName: { fontSize: FONT.xxxl, fontWeight: '800', color: COLORS.text, letterSpacing: 1 },
  tagline: { fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 6, letterSpacing: 0.5 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 24, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.medium,
  },
  cardTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.text, marginBottom: 20 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 52, marginBottom: 14,
  },
  inputRowFocused: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '08',
    ...SHADOW.accentGlow,
  },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, color: COLORS.text, fontSize: FONT.md },
  eyeBtn:    { padding: 4 },

  primaryBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
    ...SHADOW.accentGlow,
  },
  disabled:       { opacity: 0.6 },
  primaryBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700', letterSpacing: 0.5 },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: FONT.sm, marginHorizontal: 12 },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md, height: 52,
    borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  socialBtnText: { color: COLORS.text, fontSize: FONT.md, fontWeight: '600' },

  footerLink:     { alignSelf: 'center', marginTop: 20 },
  footerLinkText: { color: COLORS.textSecondary, fontSize: FONT.sm },
  switchRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  switchLabel:{ color: COLORS.textSecondary, fontSize: FONT.sm },
  switchLink: { color: COLORS.accent, fontSize: FONT.sm, fontWeight: '700' },
});
