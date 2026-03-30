import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Animated, Easing,
  Modal,
  ScrollView,
    StatusBar,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from 'react-native';
import AnimatedPressable from '../components/AnimatedPressable';
import { COLORS, FONT, RADIUS, SHADOW } from '../constants/theme';
import { useAppTheme } from '../i18n/ThemeContext';
import { LANGUAGES, useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../navigation/AuthProvider';

const ROLES_STATIC = [
  { id: 'koc',    icon: 'trophy',  color: COLORS.accent },
  { id: 'sporcu', icon: 'fitness', color: '#58A6FF' },
];

export default function RoleSelectionScreen() {
  const { setRole, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { isDark } = useAppTheme();
  const s = useMemo(makeS, [isDark]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [languageModal, setLanguageModal] = useState(false);

  // Entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const card0Anim  = useRef(new Animated.Value(0)).current;
  const card1Anim  = useRef(new Animated.Value(0)).current;
  const btnAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1, duration: 420,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.stagger(110, [
        Animated.timing(card0Anim, {
          toValue: 1, duration: 360,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(card1Anim, {
          toValue: 1, duration: 360,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
      Animated.timing(btnAnim, {
        toValue: 1, duration: 280,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const cardAnims = [card0Anim, card1Anim];

  const ROLES = [
    {
      ...ROLES_STATIC[0],
      label: t('roleCoach') || 'Koç',
      subtitle: t('roleCoachDesc') || 'Sporcularına program hazırla ve takip et',
    },
    {
      ...ROLES_STATIC[1],
      label: t('roleAthlete') || 'Sporcu',
      subtitle: t('roleAthleteDesc') || 'Koçunun programıyla antrenman yap',
    },
  ];

  const handleConfirm = async () => {
    if (!selected) {
      Alert.alert(t('error'), t('roleRequired'));
      return;
    }
    setLoading(true);
    try {
      await setRole(selected);
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
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

      {/* Header */}
      <Animated.View style={[s.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-16, 0] }) }],
      }]}>
        <View style={s.logoWrap}>
          <Ionicons name="barbell" size={28} color={COLORS.accent} />
        </View>
        <Text style={s.title}>{t('roleSelectTitle')}</Text>
        <Text style={s.subtitle}>{t('roleSelectDesc')}</Text>
      </Animated.View>

      {/* Role cards */}
      <View style={s.cardsArea}>
        {ROLES.map((role, idx) => {
          const active = selected === role.id;
          const anim   = cardAnims[idx];
          return (
            <Animated.View
              key={role.id}
              style={{
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [24, 0] }) }],
              }}
            >
              <AnimatedPressable
                style={[s.card, active && { borderColor: role.color, borderWidth: 2, ...SHADOW.accentGlow }]}
                onPress={() => setSelected(role.id)}
                haptic="light"
                scale={0.975}
              >
                <View style={[s.iconWrap, { backgroundColor: active ? role.color : COLORS.elevated }]}>
                  <Ionicons name={role.icon} size={30} color={active ? COLORS.white : role.color} />
                </View>
                <View style={s.cardText}>
                  <Text style={[s.roleLabel, active && { color: role.color }]}>{role.label}</Text>
                  <Text style={s.roleDesc}>{role.subtitle}</Text>
                </View>
                <View style={[s.radio, active && { borderColor: role.color }]}>
                  {active && <View style={[s.radioDot, { backgroundColor: role.color }]} />}
                </View>
              </AnimatedPressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Confirm button */}
      <Animated.View style={{ opacity: btnAnim, marginTop: 32 }}>
        <AnimatedPressable
          style={[s.confirmBtn, (!selected || loading) && s.btnDisabled]}
          onPress={handleConfirm}
          haptic="medium"
          disabled={!selected || loading}
          scale={0.97}
        >
          {loading
            ? <ActivityIndicator color={COLORS.white} size="small" />
            : <Text style={s.confirmBtnText}>{t('continueBtn')}</Text>}
        </AnimatedPressable>
      </Animated.View>

      {/* Sign out link */}
      <TouchableOpacity onPress={signOut} style={s.signOutBtn}>
        <Text style={s.signOutText}>{t('switchAccount')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeS = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 24 },

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

  header: { alignItems: 'center', paddingTop: 72, paddingBottom: 40 },
  logoWrap: {
    width: 64, height: 64, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.accent + '55',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    ...SHADOW.accentGlow,
  },
  title:    { fontSize: FONT.xxl, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: FONT.md, color: COLORS.textSecondary, textAlign: 'center' },

  cardsArea: { gap: 14 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 20,
    borderWidth: 1, borderColor: COLORS.border, gap: 16,
    ...SHADOW.small,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cardText:  { flex: 1 },
  roleLabel: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  roleDesc:  { fontSize: FONT.sm, color: COLORS.textSecondary, lineHeight: 18 },

  radio: {
    width: 22, height: 22, borderRadius: RADIUS.full,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: RADIUS.full },

  confirmBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md, height: 54,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.accentGlow,
  },
  btnDisabled:    { opacity: 0.4 },
  confirmBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },

  signOutBtn:  { alignSelf: 'center', marginTop: 16, padding: 8 },
  signOutText: { color: COLORS.textSecondary, fontSize: FONT.sm },
});
