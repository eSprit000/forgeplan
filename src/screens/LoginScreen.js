import { Ionicons } from '@expo/vector-icons';
import { ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  PhoneAuthProvider,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { auth, firebaseConfig } from '../config/firebaseConfig';
import { COLORS, FONT, RADIUS, SHADOW } from '../constants/theme';
import { useAppTheme } from '../i18n/ThemeContext';
import { LANGUAGES, useLanguage } from '../i18n/LanguageContext';

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

const normalizedEmail = (value) => value.trim().toLowerCase();

const buildActionCodeSettings = () => {
  const domain = firebaseConfig?.authDomain;
  if (!domain) return undefined;
  return {
    url: `https://${domain}/__/auth/action`,
    handleCodeInApp: false,
  };
};

const sendVerificationEmailSafe = async (user) => {
  const settings = buildActionCodeSettings();
  if (settings) {
    await sendEmailVerification(user, settings);
    return;
  }
  await sendEmailVerification(user);
};

const sendResetEmailSafe = async (email) => {
  const settings = buildActionCodeSettings();
  if (settings) {
    await sendPasswordResetEmail(auth, email, settings);
    return;
  }
  await sendPasswordResetEmail(auth, email);
};

const signInMethodMessage = (methods, t) => {
  if (!methods || methods.length === 0) {
    return 'Bu e-posta için hesap bulunamadı. Önce kayıt olmayı deneyin.';
  }
  if (methods.includes('password')) {
    return null;
  }
  if (methods.includes('google.com')) {
    return 'Bu e-posta Google ile kayıtlı. Şifre sıfırlama yerine Google ile giriş yapın.';
  }
  if (methods.includes('phone')) {
    return 'Bu hesap telefon numarası ile kayıtlı. Telefon ile giriş yapın.';
  }
  return `Bu hesap farklı bir yöntemle kayıtlı (${methods.join(', ')}).`;
};

export default function LoginScreen() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [mode, setMode]               = useState('login'); // 'login' | 'register'

  const { isDark } = useAppTheme();
  const s = useMemo(makeS, [isDark]);

  // ── Telefon auth state ──
  const recaptchaVerifier              = useRef(null);
  const [phoneModal, setPhoneModal]   = useState(false);
  const [phone, setPhone]             = useState('+90');
  const [otpSent, setOtpSent]         = useState(false);
  const [otp, setOtp]                 = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const { t, language, setLanguage } = useLanguage();
  const [languageModal, setLanguageModal] = useState(false);

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
    const cleanEmail = normalizedEmail(email);
    setLoading(true);
    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        if (!cred.user.emailVerified) {
          await auth.signOut();
          Alert.alert(
            t('verifyEmail'),
            t('verifyEmailDesc'),
            [
              { text: t('resendMail'), onPress: async () => {
                  const tmp = await signInWithEmailAndPassword(auth, cleanEmail, password);
                  await sendVerificationEmailSafe(tmp.user);
                  await auth.signOut();
                  Alert.alert(t('done'), `${t('resendSuccess')} (Spam/Gereksiz klasörünü de kontrol edin)`);
                }
              },
              { text: t('done'), style: 'cancel' },
            ]
          );
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await sendVerificationEmailSafe(cred.user);
        await auth.signOut();
        Alert.alert(
          t('registerBtn') + ' 🎉',
          'E-postanıza bir doğrulama linki gönderdik. Spam/Gereksiz klasörünü de kontrol edin. Linke tıklayıp ardından giriş yapın.'
        );
        setMode('login');
      }
    } catch (e) {
      if (mode === 'register' && e.code === 'auth/email-already-in-use') {
        Alert.alert(
          t('error'),
          firebaseErrorToTurkish(e.code),
          [
            {
              text: t('switchToLogin'),
              onPress: () => setMode('login'),
            },
            {
              text: t('forgotPassword'),
              onPress: async () => {
                if (!email.trim()) return;
                try {
                  await sendResetEmailSafe(normalizedEmail(email));
                  Alert.alert(t('done'), t('resetSent'));
                } catch {
                  Alert.alert(t('error'), 'Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar deneyin.');
                }
              },
            },
            { text: t('done'), style: 'cancel' },
          ]
        );
      } else {
        const msg = firebaseErrorToTurkish(e.code);
        Alert.alert(t('error'), msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Telefon: kod gönder ──
  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 10) {
      Alert.alert(t('error'), t('phoneInvalidNumber'));
      return;
    }
    setPhoneLoading(true);
    try {
      const provider = new PhoneAuthProvider(auth);
      const vid = await provider.verifyPhoneNumber(cleaned, recaptchaVerifier.current);
      setVerificationId(vid);
      setOtpSent(true);
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── Telefon: kodu doğrula ──
  const handleVerifyOTP = async () => {
    if (otp.length < 4) { Alert.alert(t('error'), t('phoneEnterOtp')); return; }
    setPhoneLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await signInWithCredential(auth, credential);
      setPhoneModal(false);
    } catch (e) {
      Alert.alert(t('error'), t('phoneWrongCode'));
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t('email'), t('emailNeeded'));
      return;
    }
    const cleanEmail = normalizedEmail(email);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
      const methodError = signInMethodMessage(methods, t);
      if (methodError) {
        Alert.alert(t('error'), methodError);
        return;
      }

      await sendResetEmailSafe(cleanEmail);
      Alert.alert(t('done'), `${t('resetSent')} (Spam/Gereksiz klasörünü kontrol edin)`);
    } catch (e) {
      Alert.alert(t('error'), `${firebaseErrorToTurkish(e?.code)}\n(${e?.code || 'unknown'})`);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.bg} />

      <View style={s.preAuthTopBar}>
        <TouchableOpacity style={s.preAuthSettingsBtn} onPress={() => setLanguageModal(true)} activeOpacity={0.8}>
          <Ionicons name="settings-outline" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={languageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModal(false)}
      >
        <View style={s.langOverlay}>
          <View style={s.langSheet}>
            <View style={s.langHeader}>
              <Text style={s.langTitle}>{t('selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setLanguageModal(false)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((item) => {
                const active = language === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[s.langRow, active && s.langRowActive]}
                    onPress={() => {
                      setLanguage(item.code);
                      setLanguageModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={s.langFlag}>{item.flag}</Text>
                    <Text style={[s.langLabel, active && s.langLabelActive]}>{item.label}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={COLORS.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── reCAPTCHA (telefon auth için gerekli, görünmez) ── */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={true}
      />

      {/* ── Telefon Auth Modal ── */}
      <Modal visible={phoneModal} transparent animationType="slide" onRequestClose={() => { setPhoneModal(false); setOtpSent(false); setOtp(''); setPhone('+90'); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.phoneOverlay}>
            <View style={s.phoneSheet}>
              {/* Başlık */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={s.phoneIconWrap}>
                  <Ionicons name="phone-portrait-outline" size={22} color={COLORS.accent} />
                </View>
                <Text style={s.phoneTitle}>
                  {otpSent ? t('phoneOtpTitle') : t('phoneTitle')}
                </Text>
                <TouchableOpacity onPress={() => { setPhoneModal(false); setOtpSent(false); setOtp(''); setPhone('+90'); }} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {!otpSent ? (
                /* ── Numara girişi ── */
                <>
                  <Text style={s.phoneLabel}>{t('phoneNumber')}</Text>
                  <View style={s.phoneInputRow}>
                    <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={s.phoneInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+90 555 123 4567"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                      autoFocus
                    />
                  </View>
                  <Text style={{ fontSize: FONT.xs, color: COLORS.textMuted, marginBottom: 20, marginTop: 4 }}>
                    {t('phoneHint')}
                  </Text>
                  <TouchableOpacity
                    style={[s.primaryBtn, phoneLoading && s.disabled]}
                    onPress={handleSendOTP}
                    disabled={phoneLoading}
                  >
                    {phoneLoading
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={s.primaryBtnText}>{t('phoneSendCode')}</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                /* ── OTP girişi ── */
                <>
                  <Text style={s.phoneLabel}>{t('phoneOtpHint').replace('{phone}', phone)}</Text>
                  <View style={s.phoneInputRow}>
                    <Ionicons name="keypad-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={s.phoneInput}
                      value={otp}
                      onChangeText={setOtp}
                      placeholder={t('phoneOtpPlaceholder')}
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                  <TouchableOpacity style={s.resendBtn} onPress={() => setOtpSent(false)}>
                    <Text style={s.resendText}>{t('phoneResend')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.primaryBtn, { marginTop: 8 }, phoneLoading && s.disabled]}
                    onPress={handleVerifyOTP}
                    disabled={phoneLoading}
                  >
                    {phoneLoading
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={s.primaryBtnText}>{t('loginBtn')}</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

          {/* Google */}
          <TouchableOpacity
            style={[s.socialBtn, (!request || loading) && s.disabled]}
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

          {/* Telefon */}
          <TouchableOpacity
            style={[s.socialBtn, { marginTop: 10 }]}
            activeOpacity={0.8}
            onPress={() => { setPhoneModal(true); setOtpSent(false); setOtp(''); }}
          >
            <Ionicons name="phone-portrait-outline" size={18} color={COLORS.text} />
            <Text style={s.socialBtnText}>{t('phoneLogin')}</Text>
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

const makeS = () => StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 120 },

  preAuthTopBar: {
    position: 'absolute',
    top: 54,
    right: 24,
    zIndex: 10,
  },
  preAuthSettingsBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.small,
  },

  langOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  langSheet: {
    maxHeight: '70%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    ...SHADOW.medium,
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  langTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.text },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  langRowActive: {
    backgroundColor: COLORS.accent + '14',
    borderColor: COLORS.accent + '44',
  },
  langFlag: { fontSize: 18 },
  langLabel: { flex: 1, color: COLORS.text, fontSize: FONT.md },
  langLabelActive: { color: COLORS.accent, fontWeight: '700' },

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

  /* ── Telefon modal ── */
  phoneOverlay: {
    flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end',
  },
  phoneSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: COLORS.border,
  },
  phoneIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.accent + '22',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  phoneTitle: { fontSize: FONT.lg, fontWeight: '800', color: COLORS.text },
  phoneLabel: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: 10 },
  phoneInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 52, marginBottom: 4,
  },
  phoneInput: { flex: 1, color: COLORS.text, fontSize: FONT.md },
  resendBtn: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 4 },
  resendText: { color: COLORS.accent, fontSize: FONT.sm, fontWeight: '600' },
});
