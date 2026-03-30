import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Animated, Easing,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import PremiumGateModal from '../../components/PremiumGateModal';
import { COLORS, FONT, RADIUS, SHADOW } from '../../constants/theme';
import { useAppTheme } from '../../i18n/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../navigation/AuthProvider';
import firestoreService from '../../services/firestoreService';

const Initials = ({ name, surname, size = 44 }) => {
  const letters = `${name?.[0] ?? ''}${surname?.[0] ?? ''}`.toUpperCase();
  return (
    <View style={[ia.avatar, { width: size, height: size, borderRadius: size / 2,
      backgroundColor: COLORS.accentDark, ...SHADOW.accentGlow }]}>
      <Text style={[ia.letters, { fontSize: size * 0.36 }]}>{letters}</Text>
    </View>
  );
};
const ia = StyleSheet.create({
  avatar:  { alignItems: 'center', justifyContent: 'center' },
  letters: { color: COLORS.white, fontWeight: '700' },
});

export default function CoachDashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { isDark } = useAppTheme();
  const s = useMemo(makeS, [isDark]);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [gateVisible, setGateVisible] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1, duration: 480,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await firestoreService.kocSporculariniGetir(user.uid);
      setAthletes(list);
    } catch (e) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const copyCode = async (kod) => {
    await Clipboard.setStringAsync(kod);
    setCopiedCode(kod);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const renderItem = ({ item, index }) => {
    const hasAntrenman = !!item.programId;
    const hasBeslenme  = !!item.beslenmeProgramId;
    const isCopied = copiedCode === item.kod;
    return (
      <AnimatedPressable
        style={s.athleteCard}
        haptic="light"
        scale={0.975}
        onPress={() => navigation.navigate('AthleteDetail', { sporcu: item })}
      >
        <Initials name={item.isim} surname={item.soyisim} />
        <View style={s.athleteInfo}>
          <Text style={s.athleteName}>{item.isim} {item.soyisim}</Text>
          <View style={s.progRow}>
            {hasAntrenman && (
              <View style={s.turBadge}>
                <Ionicons name="barbell-outline" size={10} color={COLORS.accent} />
                <Text style={s.turBadgeText}>{t('tabWorkout')}</Text>
              </View>
            )}
            {hasBeslenme && (
              <View style={[s.turBadge, s.turBadgeBeslenme]}>
                <Ionicons name="nutrition-outline" size={10} color={COLORS.success} />
                <Text style={[s.turBadgeText, s.turBadgeTextBeslenme]}>{t('tabNutrition')}</Text>
              </View>
            )}
            {!hasAntrenman && !hasBeslenme && (
              <Text style={s.athleteProg}>{t('noData')}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[s.codeChip, isCopied && s.codeChipCopied]}
          onPress={() => copyCode(item.kod)}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isCopied ? 'checkmark' : 'copy-outline'}
            size={11}
            color={isCopied ? COLORS.success : COLORS.accent}
            style={{ marginRight: 4 }}
          />
          <Text style={[s.codeText, isCopied && { color: COLORS.success }]}>{item.kod}</Text>
        </TouchableOpacity>
      </AnimatedPressable>
    );
  };

  const workoutAssigned = athletes.filter((a) => !!a.programId).length;
  const nutritionAssigned = athletes.filter((a) => !!a.beslenmeProgramId).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.bg} />

      {/* ── Header ── */}
      <Animated.View style={[s.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-12, 0] }) }],
      }]}>
        <View style={s.headerLeft}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarLetter}>{(user.isim?.[0] ?? 'K').toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.greeting}>{t('hello')} 👋</Text>
            <Text style={s.coachName}>{user.isim ?? t('roleCoach')}</Text>
            <Text style={s.dateLabel}>
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={s.signOutBtn}>
          <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Section title ── */}
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>{t('myAthletes')}</Text>
        <Text style={s.sectionCount}>{athletes.length}</Text>
      </View>

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Ionicons name="barbell-outline" size={14} color={COLORS.accent} />
          <Text style={s.statValue}>{workoutAssigned}</Text>
          <Text style={s.statLabel}>{t('tabWorkout')}</Text>
        </View>
        <View style={s.statCard}>
          <Ionicons name="nutrition-outline" size={14} color={COLORS.success} />
          <Text style={s.statValue}>{nutritionAssigned}</Text>
          <Text style={s.statLabel}>{t('tabNutrition')}</Text>
        </View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : athletes.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="people-outline" size={56} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>{t('noAthletes')}</Text>
          <Text style={s.emptyDesc}>
            {t('noAthletesDesc')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={athletes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── FAB ── */}
      <AnimatedPressable
        style={s.fab}
        onPress={() => {
          if (athletes.length >= 1) {
            setGateVisible(true);
          } else {
            navigation.navigate('AddAthlete');
          }
        }}
        haptic="medium"
        scale={0.92}
      >
        <Ionicons name="add" size={30} color={COLORS.white} />
      </AnimatedPressable>

      {/* ── Premium Gate ── */}
      <PremiumGateModal
        visible={gateVisible}
        onClose={() => setGateVisible(false)}
        onUpgrade={() => { setGateVisible(false); navigation.navigate('Premium'); }}
        feature={{
          icon: 'people-outline',
          title: 'Sporcu Limiti',
          desc: 'Ücretsiz planda en fazla 1 sporcu ekleyebilirsin. Sınırsız sporcu yönetimi için Coach paketine geçebilirsin.',
          tier: 'Coach',
        }}
      />
    </View>
  );
}

const makeS = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.accentGlow,
  },
  avatarLetter: { color: COLORS.white, fontSize: FONT.xl, fontWeight: '900' },
  greeting:  { fontSize: FONT.sm, color: COLORS.accent, fontWeight: '700', letterSpacing: 0.3 },
  coachName: { fontSize: FONT.xxl, fontWeight: '900', color: COLORS.text, lineHeight: 28 },
  dateLabel: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2, textTransform: 'capitalize' },
  signOutBtn: { padding: 8 },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  sectionTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.text },
  sectionCount: {
    backgroundColor: COLORS.accent, color: COLORS.white,
    fontSize: FONT.xs, fontWeight: '700',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  statValue: { fontSize: FONT.md, color: COLORS.text, fontWeight: '800' },
  statLabel: { fontSize: FONT.xs, color: COLORS.textSecondary, fontWeight: '600' },

  athleteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.medium,
  },
  athleteInfo: { flex: 1 },
  athleteName: { fontSize: FONT.md, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  progRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  turBadge:    {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.accent + '18', borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.accent + '44',
  },
  turBadgeBeslenme:     { backgroundColor: COLORS.success + '18', borderColor: COLORS.success + '44' },
  turBadgeText:         { fontSize: 10, color: COLORS.accent, fontWeight: '700' },
  turBadgeTextBeslenme: { color: COLORS.success },
  athleteProg: { fontSize: FONT.sm, color: COLORS.textSecondary, flex: 1 },
  codeChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: COLORS.border,
  },
  codeChipCopied: {
    borderColor: COLORS.success + '66', backgroundColor: COLORS.success + '11',
  },
  codeText: { fontSize: FONT.xs, color: COLORS.accent, fontWeight: '700', letterSpacing: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textSecondary },
  emptyDesc:  { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  fab: {
    position: 'absolute', right: 24, bottom: 36,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.accentGlow,
  },
});
