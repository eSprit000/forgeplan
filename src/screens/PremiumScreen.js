import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONT, RADIUS, SHADOW } from '../constants/theme';
import { useAppTheme } from '../i18n/ThemeContext';

/* ─── Veriler ─────────────────────────────────────── */
const PLANS = [
  { key: '1m',  label: '1 Ay',  months: 1,  saving: null },
  { key: '6m',  label: '6 Ay',  months: 6,  saving: '%20 tasarruf' },
  { key: '12m', label: '12 Ay', months: 12, saving: '%35 tasarruf' },
];

const PRICES = {
  pro:   { '1m': 149, '6m': 699,  '12m': 1099 },
  coach: { '1m': 249, '6m': 1199, '12m': 1899 },
};

// status: 'active' = şu an çalışıyor | 'soon' = yakında gelecek
const PRO_FEATURES = [
  { icon: 'infinite-outline',    label: 'Sınırsız program oluşturma',    status: 'active' },
  { icon: 'speedometer-outline', label: 'RPE tabanlı antrenman takibi',  status: 'active' },
  { icon: 'calculator-outline',  label: '1RM tahmin hesaplayıcı',        status: 'active' },
  { icon: 'trophy-outline',      label: 'PR (Kişisel Rekor) takibi',     status: 'soon'   },
  { icon: 'stats-chart-outline', label: 'İlerleme grafikleri',           status: 'soon'   },
  { icon: 'analytics-outline',   label: 'Hacim & gelişim analizi',       status: 'soon'   },
  { icon: 'library-outline',     label: 'Hazır program kütüphanesi',  status: 'soon'   },
];

const COACH_FEATURES = [
  { icon: 'people-outline',        label: 'Sınırsız sporcu ekleme',       status: 'active' },
  { icon: 'clipboard-outline',     label: 'Sporcuya özel program yazma',  status: 'active' },
  { icon: 'nutrition-outline',     label: 'Haftalık beslenme programı',   status: 'active' },
  { icon: 'person-circle-outline', label: 'Sporcu detay & takip paneli',  status: 'active' },
  { icon: 'grid-outline',          label: 'Profesyonel koç paneli',       status: 'active' },
  { icon: 'notifications-outline', label: 'Sporcuya anlık bildirim',      status: 'soon'   },
  { icon: 'trending-up-outline',   label: 'Sporcu gelişim grafikleri',    status: 'soon'   },
];

const SOCIAL_PROOF = [
  { icon: 'people',  value: '1.200+', label: 'Aktif Koç' },
  { icon: 'barbell', value: '8.500+', label: 'Program' },
  { icon: 'star',    value: '4.9',    label: 'Puan' },
];

const monthlyPrice = (pkg, planKey) => {
  const total  = PRICES[pkg][planKey];
  const months = PLANS.find((p) => p.key === planKey).months;
  return Math.round(total / months);
};

/* ─── FeatureRow ─────────────────────────────────────────── */
const FeatureRow = ({ icon, label, status }) => {
  const isActive = status === 'active';
  return (
    <View style={fr.row}>
      <View style={[fr.iconWrap, isActive ? fr.iconActive : fr.iconSoon]}>
        <Ionicons name={icon} size={13} color={isActive ? COLORS.success : COLORS.warning} />
      </View>
      <Text style={fr.label}>{label}</Text>
      {isActive ? (
        <View style={fr.activePill}>
          <Text style={fr.activePillText}>Aktif</Text>
        </View>
      ) : (
        <View style={fr.soonPill}>
          <Text style={fr.soonPillText}>Yakında</Text>
        </View>
      )}
    </View>
  );
};
const fr = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconWrap:   { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: '#3FB95020' },
  iconSoon:   { backgroundColor: '#D2992220' },
  label:      { fontSize: 13, color: COLORS.text, flex: 1 },
  activePill: {
    backgroundColor: '#3FB95018', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: '#3FB95044',
  },
  activePillText: { fontSize: 10, color: COLORS.success, fontWeight: '800' },
  soonPill: {
    backgroundColor: '#D2992218', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: '#D2992244',
  },
  soonPillText: { fontSize: 10, color: COLORS.warning, fontWeight: '800' },
});

/* ─── Ana Ekran ──────────────────────────────────────────── */
export default function PremiumScreen({ navigation }) {
  const { isDark }      = useAppTheme();
  const [plan, setPlan] = useState('12m');
  const [pkg,  setPkg]  = useState('coach');

  const heroAnim  = useRef(new Animated.Value(0)).current;
  const priceAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handlePlanChange = (key) => {
    setPlan(key);
    Animated.sequence([
      Animated.timing(priceAnim, { toValue: 0.78, duration: 90,  useNativeDriver: true }),
      Animated.timing(priceAnim, { toValue: 1.00, duration: 140, useNativeDriver: true }),
    ]).start();
  };

  const handlePurchase = () => {
    const name      = pkg === 'pro' ? 'Pro' : 'Coach';
    const price     = PRICES[pkg][plan];
    const planLabel = PLANS.find((p) => p.key === plan).label;
    Alert.alert(
      name + ' Paketi',
      planLabel + 'lık ' + name + ': ₺' + price + '\n\nSatın alma işlemi yakında aktif olacak. Beta sürecinde tüm özellikler ücretsiz kullanılabilir!',
      [{ text: 'Harika!', style: 'default' }]
    );
  };

  const s            = makeS();
  const currentPlan  = PLANS.find((p) => p.key === plan);
  const features     = pkg === 'pro' ? PRO_FEATURES : COACH_FEATURES;
  const activeCount  = features.filter((f) => f.status === 'active').length;
  const soonCount    = features.filter((f) => f.status === 'soon').length;
  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.bg} />

      {navigation && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.floatingBack}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* HERO */}
        <Animated.View style={[s.hero, { opacity: heroAnim, transform: [{ translateY: heroTranslate }] }]}>
          <Animated.View style={[s.diamondOuter, { transform: [{ scale: pulseAnim }] }]}>
            <View style={s.diamondMid}>
              <View style={s.diamondInner}>
                <Ionicons name="diamond" size={32} color={COLORS.accent} />
              </View>
            </View>
          </Animated.View>
          <Text style={s.heroTitle}>ForgePlan Premium</Text>
          <Text style={s.heroSub}>
            Antrenmanını veriye dönüştür.{'\n'}Sporcularını profesyonelce yönet.
          </Text>
          <View style={s.socialRow}>
            {SOCIAL_PROOF.map((item) => (
              <View key={item.label} style={s.socialCard}>
                <Ionicons name={item.icon} size={14} color={COLORS.accent} />
                <Text style={s.socialValue}>{item.value}</Text>
                <Text style={s.socialLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* PLAN SEÇİCİ */}
        <View style={s.planSection}>
          <Text style={s.sectionLabel}>ABONELIK SÜRESİ</Text>
          <View style={s.planRow}>
            {PLANS.map((p) => {
              const active = plan === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[s.planBtn, active && s.planBtnActive]}
                  onPress={() => handlePlanChange(p.key)}
                  activeOpacity={0.75}
                >
                  {p.saving && (
                    <View style={s.savingBadge}>
                      <Text style={s.savingText}>{p.saving}</Text>
                    </View>
                  )}
                  <Text style={[s.planBtnLabel, active && s.planBtnLabelActive]}>{p.label}</Text>
                  {p.key !== '1m' && (
                    <Text style={[s.planBtnSub, active && { color: COLORS.accent }]}>{p.saving}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {plan === '12m' && (
            <View style={s.bestDealBanner}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={s.bestDealText}>
                En avantajlı seçenek — yıllık ₺{PRICES[pkg]['1m'] * 12 - PRICES[pkg]['12m']} tasarruf edersin
              </Text>
            </View>
          )}
        </View>

        {/* PAKET TAB */}
        <View style={s.pkgTabRow}>
          <TouchableOpacity
            style={[s.pkgTab, pkg === 'pro' && s.pkgTabActive]}
            onPress={() => setPkg('pro')}
            activeOpacity={0.8}
          >
            <Text style={[s.pkgTabLabel, pkg === 'pro' && s.pkgTabLabelActive]}>Pro</Text>
            <Text style={s.pkgTabSub}>Bireysel sporcu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.pkgTab, pkg === 'coach' && s.pkgTabActive]}
            onPress={() => setPkg('coach')}
            activeOpacity={0.8}
          >
            <Text style={[s.pkgTabLabel, pkg === 'coach' && s.pkgTabLabelActive]}>Coach</Text>
            <Text style={s.pkgTabSub}>Koçlar için</Text>
          </TouchableOpacity>
        </View>

        {/* ANA KART */}
        <View style={[s.mainCard, pkg === 'coach' && s.mainCardCoach]}>
          <View style={s.mainCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.mainCardTier}>{pkg === 'pro' ? 'Pro' : 'Coach'}</Text>
              <Text style={s.mainCardDesc}>
                {pkg === 'pro' ? 'Gelişmiş sporcu özellikleri' : 'Koçlar ve profesyonel kullanım'}
              </Text>
            </View>
            <View style={s.priceBlock}>
              <Animated.Text style={[s.priceMain, { transform: [{ scale: priceAnim }] }]}>
                ₺{PRICES[pkg][plan]}
              </Animated.Text>
              <Text style={s.pricePeriod}>{currentPlan.label}</Text>
              {plan === '12m' && (
                <Text style={s.priceMonthly}>≈ aylık ₺{monthlyPrice(pkg, plan)}</Text>
              )}
            </View>
          </View>

          <View style={s.statusSummary}>
            <View style={s.statusItem}>
              <View style={[s.statusDot, { backgroundColor: COLORS.success }]} />
              <Text style={s.statusText}>{activeCount} özellik şu an aktif</Text>
            </View>
            <View style={s.statusItem}>
              <View style={[s.statusDot, { backgroundColor: COLORS.warning }]} />
              <Text style={s.statusText}>{soonCount} özellik yakında</Text>
            </View>
          </View>

          <View style={s.divider} />

          {features.map((f) => (
            <FeatureRow key={f.label} icon={f.icon} label={f.label} status={f.status} />
          ))}

          <TouchableOpacity
            style={[s.ctaBtn, pkg === 'coach' && s.ctaBtnCoach]}
            onPress={handlePurchase}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={s.ctaBtnText}>
              {pkg === 'pro' ? "Pro'ya Geç" : "Coach'a Geç"} — {currentPlan.label}lık
            </Text>
          </TouchableOpacity>
        </View>

        {/* FREE */}
        <View style={s.freeCard}>
          <Text style={s.freeTitle}>Ücretsiz Plan</Text>
          {[
            { ok: true,  label: '1 sporcu ekleme' },
            { ok: true,  label: 'Temel antrenman kaydı' },
            { ok: false, label: 'Gelişmiş analiz' },
            { ok: false, label: 'Sınırsız sporcu' },
          ].map((item) => (
            <View key={item.label} style={s.freeFeatRow}>
              <Ionicons name={item.ok ? 'checkmark' : 'close'} size={14} color={item.ok ? COLORS.success : COLORS.textMuted} />
              <Text style={[s.freeFeat, !item.ok && s.freeFeatLocked]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* DEGER */}
        <View style={s.valueBlock}>
          <Text style={s.valueLine}>Beta sürecinde erken erişim avantajı</Text>
          <Text style={s.valueLine}>Yakında gelen özellikler ücretsiz güncelleme ile gelir</Text>
          <Text style={s.valueLine}>Reklam yok, gizlilik ihlali yok</Text>
          <Text style={s.valueLine}>iOS ve Android — tek abonelik</Text>
        </View>

        {/* GARANTI */}
        <View style={s.guaranteeCard}>
          <Ionicons name="shield-checkmark" size={30} color={COLORS.success} />
          <View style={{ flex: 1 }}>
            <Text style={s.guaranteeTitle}>30 Gün İade Garantisi</Text>
            <Text style={s.guaranteeDesc}>
              Memnun kalmazsan 30 gün içinde tam iade. Soru sormadan, anında.
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={s.footer}>
          <Text style={s.footerText}>Abonelikler otomatik yenilenir. İstediğin zaman iptal edebilirsin.</Text>
          <Text style={s.footerText}>Satın alma App Store / Google Play üzerinden gerçekleşir.</Text>
          <TouchableOpacity style={s.restoreBtn}>
            <Text style={s.restoreBtnText}>Satın alımı geri yükle</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

/* ─── StyleSheet ──────────────────────────────────────────── */
const makeS = () => StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 52 },

  floatingBack: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, left: 16, zIndex: 10,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    ...SHADOW.soft,
  },

  hero: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 28, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  diamondOuter: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.accent + '12',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  diamondMid: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.accent + '20',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.accent + '30',
  },
  diamondInner: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.accent + '2A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.accent + '55',
    ...SHADOW.accentGlow,
  },
  heroTitle: {
    fontSize: FONT.xxl, fontWeight: '900', color: COLORS.text,
    textAlign: 'center', letterSpacing: 0.4, marginBottom: 10,
  },
  heroSub: {
    fontSize: FONT.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  socialRow:   { flexDirection: 'row', gap: 10, width: '100%' },
  socialCard:  {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  socialValue: { fontSize: FONT.md, fontWeight: '800', color: COLORS.text },
  socialLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  planSection:  { paddingHorizontal: 16, paddingTop: 24 },
  sectionLabel: { fontSize: FONT.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2, marginBottom: 10 },
  planRow:      { flexDirection: 'row', gap: 8, marginBottom: 8 },
  planBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, overflow: 'visible',
  },
  planBtnActive:      { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '10' },
  savingBadge: {
    position: 'absolute', top: -9,
    backgroundColor: COLORS.accent, borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  savingText:         { fontSize: 9, color: COLORS.white, fontWeight: '800', letterSpacing: 0.4 },
  planBtnLabel:       { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textSecondary },
  planBtnLabelActive: { color: COLORS.accent },
  planBtnSub:         { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  bestDealBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: COLORS.success + '12',
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.success + '33',
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4,
  },
  bestDealText: { fontSize: FONT.xs, color: COLORS.success, fontWeight: '600', flex: 1 },

  pkgTabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 20, marginBottom: 12,
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md,
    padding: 4, borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  pkgTab:            { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.sm },
  pkgTabActive:      { backgroundColor: COLORS.surface, ...SHADOW.soft },
  pkgTabLabel:       { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textMuted },
  pkgTabLabelActive: { color: COLORS.accent },
  pkgTabSub:         { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  mainCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.accent + '55',
    padding: 20, ...SHADOW.medium,
  },
  mainCardCoach:  { borderColor: COLORS.error + '55' },
  mainCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  mainCardTier:   { fontSize: FONT.xl, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  mainCardDesc:   { fontSize: FONT.sm, color: COLORS.textSecondary },

  priceBlock:   { alignItems: 'flex-end' },
  priceMain:    { fontSize: 30, fontWeight: '900', color: COLORS.text },
  pricePeriod:  { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 1 },
  priceMonthly: { fontSize: FONT.xs, color: COLORS.accent, fontWeight: '700', marginTop: 2 },

  statusSummary: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  statusItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:     { width: 8, height: 8, borderRadius: 4 },
  statusText:    { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 14 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    height: 52, marginTop: 18, ...SHADOW.accentGlow,
  },
  ctaBtnCoach: { backgroundColor: COLORS.error },
  ctaBtnText:  { fontSize: FONT.md, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },

  freeCard:       { marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  freeTitle:      { fontSize: FONT.md, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  freeFeatRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  freeFeat:       { fontSize: FONT.sm, color: COLORS.textSecondary },
  freeFeatLocked: { color: COLORS.textMuted, textDecorationLine: 'line-through' },

  valueBlock: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.accent + '0C',
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.accent + '2A',
    padding: 16, gap: 8,
  },
  valueLine: { fontSize: FONT.sm, color: COLORS.textSecondary, lineHeight: 20 },

  guaranteeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.success + '0E',
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.success + '33',
    padding: 16,
  },
  guaranteeTitle: { fontSize: FONT.md, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  guaranteeDesc:  { fontSize: FONT.sm, color: COLORS.textSecondary, lineHeight: 19 },

  footer:         { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, gap: 4 },
  footerText:     { fontSize: FONT.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  restoreBtn:     { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16 },
  restoreBtnText: { fontSize: FONT.sm, color: COLORS.accent, fontWeight: '600' },
});
