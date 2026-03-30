import { Ionicons } from '@expo/vector-icons';
import {
  deleteUser,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONT, RADIUS, SHADOW } from '../constants/theme';
import { LANGUAGES, useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../navigation/AuthProvider';
import { auth } from '../config/firebaseConfig';
import firestoreService from '../services/firestoreService';
import { useAppTheme } from '../i18n/ThemeContext';

/* ─── Küçük bileşenler ─────────────────────────────────────── */

/** Bölüm başlığı */
const SectionTitle = ({ label }) => {
  const st = makeST();
  return <Text style={st.sectionTitle}>{label}</Text>;
};

/** Satır: metin + sağ ikon/değer + onPress */
const SettingsRow = ({ icon, label, value, onPress, danger, topRadius, bottomRadius, hideBorder }) => {
  const st = makeST();
  return (
  <TouchableOpacity
    style={[
      st.row,
      topRadius && { borderTopLeftRadius: RADIUS.md, borderTopRightRadius: RADIUS.md },
      bottomRadius && { borderBottomLeftRadius: RADIUS.md, borderBottomRightRadius: RADIUS.md },
      hideBorder && { borderBottomWidth: 0 },
    ]}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    {icon && (
      <View style={[st.rowIcon, danger && { backgroundColor: COLORS.error + '22' }]}>
        <Ionicons name={icon} size={17} color={danger ? COLORS.error : COLORS.accent} />
      </View>
    )}
    <Text style={[st.rowLabel, danger && { color: COLORS.error }]}>{label}</Text>
    {value !== undefined && <Text style={st.rowValue}>{value}</Text>}
    {onPress && !danger && (
      <Ionicons name="chevron-forward" size={15} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
    )}
  </TouchableOpacity>
  );
};

/** Toggle satırı */
const ToggleRow = ({ icon, label, value, onValueChange, topRadius, bottomRadius, hideBorder }) => {
  const st = makeST();
  return (
  <View
    style={[
      st.row,
      topRadius && { borderTopLeftRadius: RADIUS.md, borderTopRightRadius: RADIUS.md },
      bottomRadius && { borderBottomLeftRadius: RADIUS.md, borderBottomRightRadius: RADIUS.md },
      hideBorder && { borderBottomWidth: 0 },
    ]}
  >
    {icon && (
      <View style={st.rowIcon}>
        <Ionicons name={icon} size={17} color={COLORS.accent} />
      </View>
    )}
    <Text style={st.rowLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: COLORS.elevated, true: COLORS.accent + '88' }}
      thumbColor={value ? COLORS.accent : COLORS.textMuted}
    />
  </View>
  );
};

/** Grup wrapper */
const Group = ({ children }) => {
  const st = makeST();
  return <View style={st.group}>{children}</View>;
};

/* ─── Profil Düzenleme Modalı ──────────────────────────────── */
const ProfileEditModal = ({ visible, user, onSave, onClose }) => {
  const { t } = useLanguage();
  const mo = makeMO();
  const [isim, setIsim]       = useState(user?.isim ?? '');
  const [soyisim, setSoyisim] = useState(user?.soyisim ?? '');
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!isim.trim()) { Alert.alert(t('warning'), t('firstNameRequired')); return; }
    setSaving(true);
    try {
      await onSave({ isim: isim.trim(), soyisim: soyisim.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={mo.overlay}>
          <View style={mo.sheet}>
            <Text style={mo.title}>{t('profileTitle')}</Text>
            <Text style={mo.label}>{t('firstName')}</Text>
            <TextInput
              style={mo.input}
              value={isim}
              onChangeText={setIsim}
              placeholder={t('firstName')}
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={mo.label}>{t('lastName')}</Text>
            <TextInput
              style={mo.input}
              value={soyisim}
              onChangeText={setSoyisim}
              placeholder={t('lastName')}
              placeholderTextColor={COLORS.textMuted}
            />
            <TouchableOpacity
              style={[mo.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Text style={mo.saveBtnText}>{t('save')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={mo.cancelBtn} onPress={onClose}>
              <Text style={mo.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ─── Sporcu Kişisel Bilgi Modalı ──────────────────────────── */
const HEDEF_OPTIONS = [
  { label: 'Bulk',          icon: 'trending-up-outline' },
  { label: 'Cut',           icon: 'trending-down-outline' },
  { label: 'Maintenance',   icon: 'reorder-two-outline' },
  { label: 'Powerlifting',  icon: 'barbell-outline' },
  { label: 'Strongman',     icon: 'fitness-outline' },
];

const SporcuBilgiModal = ({ visible, user, onSave, onClose }) => {
  const { t } = useLanguage();
  const mo = makeMO();
  const [kilo, setKilo]   = useState(String(user?.kilo ?? ''));
  const [boy, setBoy]     = useState(String(user?.boy ?? ''));
  const [hedef, setHedef] = useState(user?.hedefTuru ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ kilo: kilo ? parseFloat(kilo) : null, boy: boy ? parseFloat(boy) : null, hedefTuru: hedef });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={mo.overlay}>
          <View style={mo.sheet}>
            <Text style={mo.title}>{t('sectionAthlete')}</Text>

            <View style={mo.row2}>
              <View style={{ flex: 1 }}>
                <Text style={mo.label}>{t('weightLabel')}</Text>
                <TextInput
                  style={mo.input}
                  value={kilo}
                  onChangeText={setKilo}
                  keyboardType="decimal-pad"
                  placeholder="80"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={mo.label}>{t('heightLabel')}</Text>
                <TextInput
                  style={mo.input}
                  value={boy}
                  onChangeText={setBoy}
                  keyboardType="decimal-pad"
                  placeholder="175"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            <Text style={mo.label}>{t('goalType')}</Text>
            <View style={mo.hedefGrid}>
              {HEDEF_OPTIONS.map((h) => (
                <TouchableOpacity
                  key={h.label}
                  style={[mo.hedefChip, hedef === h.label && mo.hedefChipActive]}
                  onPress={() => setHedef(h.label)}
                >
                  <Ionicons
                    name={h.icon}
                    size={14}
                    color={hedef === h.label ? COLORS.white : COLORS.textSecondary}
                  />
                  <Text style={[mo.hedefChipText, hedef === h.label && { color: COLORS.white }]}>
                    {h.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[mo.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Text style={mo.saveBtnText}>{t('save')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={mo.cancelBtn} onPress={onClose}>
              <Text style={mo.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ─── Koç Profil Modalı ────────────────────────────────────── */
const UZMANLIK_OPTIONS = ['Powerlifting', 'Strongman', 'Bodybuilding'];

const KocProfilModal = ({ visible, user, onSave, onClose }) => {
  const { t } = useLanguage();
  const mo = makeMO();
  const [uzmanlik, setUzmanlik] = useState(user?.uzmanlik ?? '');
  const [biyografi, setBiyografi] = useState(user?.biyografi ?? '');
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ uzmanlik, biyografi: biyografi.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={mo.overlay}>
          <View style={mo.sheet}>
            <Text style={mo.title}>{t('sectionCoachProfile')}</Text>

            <Text style={mo.label}>{t('expertise')}</Text>
            <View style={mo.hedefGrid}>
              {UZMANLIK_OPTIONS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[mo.hedefChip, uzmanlik === u && mo.hedefChipActive]}
                  onPress={() => setUzmanlik(u)}
                >
                  <Text style={[mo.hedefChipText, uzmanlik === u && { color: COLORS.white }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={mo.label}>{t('bio')}</Text>
            <TextInput
              style={[mo.input, { height: 88, textAlignVertical: 'top', paddingTop: 10 }]}
              value={biyografi}
              onChangeText={setBiyografi}
              placeholder={t('bioPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              multiline
            />

            <TouchableOpacity
              style={[mo.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Text style={mo.saveBtnText}>{t('save')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={mo.cancelBtn} onPress={onClose}>
              <Text style={mo.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ─── Ana Ekran ────────────────────────────────────────────── */
export default function SettingsScreen({ navigation }) {
  const { user, signOut, updateUser } = useAuth();
  const { language, t, setLanguage }   = useLanguage();
  const { isDark, toggleTheme }        = useAppTheme();
  const s  = makeS();
  const st = makeST();
  const isKoc = user?.rol === 'koc';

  /* Modals */
  const [profileModal, setProfileModal]         = useState(false);
  const [sporcuBilgiModal, setSporcuBilgiModal] = useState(false);
  const [kocProfilModal, setKocProfilModal]     = useState(false);

  /* Bildirim durumları (UI) */
  const [notifAntrenman, setNotifAntrenman] = useState(true);
  const [notifKoc, setNotifKoc]             = useState(true);
  const [notifPR, setNotifPR]               = useState(true);
  const [notifTamamlandi, setNotifTamamlandi] = useState(true);
  const [notifSporcuPR, setNotifSporcuPR]   = useState(true);
  const [notifMesaj, setNotifMesaj]         = useState(false);

  /* Uygulama ayarları */
  const [kiloUnit, setKiloUnit] = useState('kg');
  const [langModal, setLangModal] = useState(false);

  const currentLangLabel = LANGUAGES.find((l) => l.code === language)?.label ?? 'Türkçe';

  /* ── Şifre Değiştir ── */
  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert('Uyarı', 'Hesabınıza bağlı bir e-posta adresi bulunamadı.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      Alert.alert(
        '\u2709\ufe0f E-posta G\u00f6nderildi',
        `${user.email} adresine şifre sıfırlama linki gönderildi.\n\n\ud83d\udccc Gelmediyse spam / önemsiz klasörünü kontrol et.`,
        [{ text: 'Tamam' }]
      );
    } catch (e) {
      Alert.alert('Hata', e.message);
    }
  };

  /* ── Veri Dışa Aktar ── */
  const handleExportData = async () => {
    const lines = [
      '== ForcePlan Hesap Bilgileri ==',
      `İsim: ${user?.isim ?? '—'} ${user?.soyisim ?? ''}`,
      `E-posta: ${user?.email ?? '—'}`,
      `Rol: ${user?.rol === 'koc' ? 'Koç' : 'Sporcu'}`,
      user?.kilo ? `Kilo: ${user.kilo} kg` : null,
      user?.boy  ? `Boy: ${user.boy} cm`   : null,
      user?.hedefTuru ? `Hedef: ${user.hedefTuru}` : null,
      user?.uzmanlik  ? `Uzmanlık: ${user.uzmanlik}` : null,
    ].filter(Boolean).join('\n');
    await Share.share({ message: lines, title: 'ForcePlan Verilerim' });
  };

  /* ── Hesabı Sil ── */
  const handleDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount'),
      t('deleteAccountWarn'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await firestoreService.kullaniciVerileriniSil(user.uid, user.sporcuId ?? null);
              await deleteUser(auth.currentUser);
              signOut();
            } catch (e) {
              if (e.code === 'auth/requires-recent-login') {
                Alert.alert(
                  t('reloginRequiredTitle'),
                  t('reloginRequiredDesc'),
                  [{ text: t('done') }]
                );
              } else {
                Alert.alert(t('error'), e.message);
              }
            }
          },
        },
      ]
    );
  };

  /* ── İletişim ── */
  const handleContact = () => {
    Linking.openURL('mailto:destek@forceplan.app?subject=ForcePlan%20Destek').catch(() =>
      Alert.alert('İletişim', 'destek@forceplan.app adresine e-posta gönderebilirsin.')
    );
  };

  /* ── Gizlilik Politikası ── */
  const handlePrivacy = () => {
    Alert.alert(
      'Gizlilik Politikası',
      'ForcePlan, kişisel verilerini yalnızca uygulama içi antrenman ve beslenme programı amacıyla kullanır. Veriler üçüncü taraflarla paylaşılmaz. Hesabını sildiğinde tüm veriler kalıcı olarak kaldırılır.\n\nSorular için: destek@forceplan.app',
      [{ text: 'Anladım', style: 'default' }]
    );
  };

  /* ── Yardım Merkezi ── */
  const handleHelp = () => {
    Alert.alert(
      'Yardım & Geri Bildirim',
      '\ud83d\udddd Sporcu kodu nerede?\nKoç ekranında sporcuna tıkla, kod görünür.\n\n\ud83c\udfc3 Program nasıl tamamlanır?\nSporcu ekranında güne tıkla \u2192 Günü Tamamla.\n\n\ud83e\udd55 Beslenme programı nasıl eklenir?\nYeni sporcu eklerken Beslenme Programını seç.',
      [
        { text: 'Kapat', style: 'cancel' },
        {
          text: '\ud83d\udce7 Bildirim Gönder',
          onPress: () =>
            Linking.openURL(
              'mailto:cetinkaya.cagdas123@gmail.com?subject=ForgePlan%20Geri%20Bildirim'
            ).catch(() =>
              Alert.alert('Hata', 'E-posta uygulaması açılamadı. cetinkaya.cagdas123@gmail.com adresine yazın.')
            ),
        },
      ]
    );
  };

  /* ── Koçtan Ayrıl ── */
  const handleKoctanAyril = () => {
    if (!user?.kocId) return;
    Alert.alert(
      'Koçtan Ayrıl',
      'Koçunuzla olan bağlantınız koparılacak. Antrenman programınıza erişim kaybedeceksiniz. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ayrıl',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestoreService.koctanAyril(user.uid, user.sporcuId ?? null);
              updateUser({ kocId: null, sporcuId: null });
              Alert.alert('Tamam', 'Koçunuzdan başarıyla ayrıldınız.');
            } catch (e) {
              Alert.alert('Hata', e.message);
            }
          },
        },
      ]
    );
  };

  /* ── Kaydetme fonksiyonları ── */
  const handleProfileSave = async (data) => {
    await firestoreService.kullaniciGuncelle(user.uid, data);
    updateUser(data);
    setProfileModal(false);
    Alert.alert('Kaydedildi', 'Profil bilgilerin güncellendi.');
  };

  const handleSporcuBilgiSave = async (data) => {
    await firestoreService.kullaniciGuncelle(user.uid, data);
    updateUser(data);
    setSporcuBilgiModal(false);
    Alert.alert('Kaydedildi', 'Kişisel bilgilerin güncellendi.');
  };

  const handleKocProfilSave = async (data) => {
    await firestoreService.kullaniciGuncelle(user.uid, data);
    updateUser(data);
    setKocProfilModal(false);
    Alert.alert('Kaydedildi', 'Koç profili güncellendi.');
  };

  const handleSignOut = () => {
    Alert.alert(
      t('signOut'),
      t('signOutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('signOut'), style: 'destructive', onPress: signOut },
      ]
    );
  };


  const fullName = [user?.isim, user?.soyisim].filter(Boolean).join(' ') || t('userFallback');
  const hedefLabel = user?.hedefTuru ? user.hedefTuru : t('notSelected');
  const uzmanlikLabel = user?.uzmanlik ? user.uzmanlik : t('notSelected');

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profil özeti ── */}
        <View style={s.profileCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitial}>
              {(user?.isim?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{fullName}</Text>
            <Text style={s.profileEmail}>{user?.email ?? user?.phoneNumber ?? ''}</Text>
            <View style={s.roleBadge}>
              <Text style={s.roleBadgeText}>{isKoc ? `🏋️ ${t('roleCoach')}` : `💪 ${t('roleAthlete')}`}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.editProfileBtn}
            onPress={() => setProfileModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={16} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {/* ── Profil ── */}
        <SectionTitle label={t('sectionProfile')} />
        <Group>
          <SettingsRow
            icon="person-outline"
            label={t('nameSurname')}
            value={fullName}
            onPress={() => setProfileModal(true)}
            topRadius
          />
          <SettingsRow
            icon="mail-outline"
            label={t('emailLabel')}
            value={user?.email ?? '—'}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label={t('changePassword')}
            onPress={handleChangePassword}
            bottomRadius
            hideBorder
          />
        </Group>

        {/* ── Bildirimler ── */}
        <SectionTitle label={t('sectionNotif')} />
        <Group>
          <ToggleRow
            icon="barbell-outline"
            label={t('notifWorkout')}
            value={notifAntrenman}
            onValueChange={setNotifAntrenman}
            topRadius
          />
          <ToggleRow
            icon="chatbubble-outline"
            label={t('notifCoach')}
            value={notifKoc}
            onValueChange={setNotifKoc}
          />
          <ToggleRow
            icon="trophy-outline"
            label={t('notifPR')}
            value={notifPR}
            onValueChange={setNotifPR}
            bottomRadius
            hideBorder
          />
        </Group>

        {/* ── Premium ── */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Premium')}
          activeOpacity={0.85}
          style={s.premiumBanner}
        >
          <View style={s.premiumBannerLeft}>
            <View style={s.premiumBannerIcon}>
              <Ionicons name="diamond-outline" size={20} color={COLORS.accent} />
            </View>
            <View>
              <Text style={s.premiumBannerTitle}>Premium'a Geç</Text>
              <Text style={s.premiumBannerSub}>Sınırsız program, PR takibi ve daha fazlası</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.accent} />
        </TouchableOpacity>

        {/* ── Uygulama Ayarları ── */}
        <SectionTitle label={t('sectionApp')} />
        <Group>
          <SettingsRow
            icon="language-outline"
            label={t('language')}
            value={currentLangLabel}
            onPress={() => setLangModal(true)}
            topRadius
          />
          <SettingsRow
            icon="moon-outline"
            label={t('theme')}
            value={isDark ? `🌑 ${t('themeDark')}` : `☀️ ${t('themeLight')}`}
            onPress={() =>
              Alert.alert(
                t('themeSelectTitle'),
                t('themeSelectDesc'),
                [
                  { text: `🌑 ${t('themeDark')}`, onPress: () => toggleTheme(true) },
                  { text: `☀️ ${t('themeLight')}`, onPress: () => toggleTheme(false) },
                  { text: t('cancel'), style: 'cancel' },
                ]
              )
            }
          />
          <SettingsRow
            icon="scale-outline"
            label={t('weightUnit')}
            value={kiloUnit}
            onPress={() =>
              Alert.alert(t('weightUnitTitle'), t('weightUnitDesc'), [
                { text: 'kg', onPress: () => setKiloUnit('kg') },
                { text: 'lb', onPress: () => setKiloUnit('lb') },
                { text: t('cancel'), style: 'cancel' },
              ])
            }
            bottomRadius
            hideBorder
          />
        </Group>

        {/* ──────────────────────────────────── */}
        {/* SPORCU'YA ÖZEL BÖLÜMLER */}
        {/* ──────────────────────────────────── */}
        {!isKoc && (
          <>
            <SectionTitle label={t('sectionAthlete')} />
            <Group>
              <SettingsRow
                icon="body-outline"
                label={t('weightBodyHeight')}
                value={
                  user?.kilo
                    ? `${user.kilo} kg  ·  ${user.boy ?? '—'} cm`
                    : t('notEntered')
                }
                onPress={() => setSporcuBilgiModal(true)}
                topRadius
              />
              <SettingsRow
                icon="flag-outline"
                label={t('goalType')}
                value={hedefLabel}
                onPress={() => setSporcuBilgiModal(true)}
                bottomRadius
                hideBorder
              />
            </Group>

            <SectionTitle label={t('sectionMyCoach')} />
            <Group>
              <SettingsRow
                icon="person-circle-outline"
                label={t('linkedCoach')}
                value={user?.kocId ? t('linked') : t('notLinked')}
                topRadius
                hideBorder={!user?.kocId}
                bottomRadius={!user?.kocId}
              />
              {user?.kocId && (
                <SettingsRow
                  icon="person-remove-outline"
                  label={t('leaveCoach')}
                  onPress={handleKoctanAyril}
                  danger
                  bottomRadius
                  hideBorder
                />
              )}
            </Group>
          </>
        )}

        {/* ──────────────────────────────────── */}
        {/* KOÇ'A ÖZEL BÖLÜMLER */}
        {/* ──────────────────────────────────── */}
        {isKoc && (
          <>
            <SectionTitle label={t('sectionCoachProfile')} />
            <Group>
              <SettingsRow
                icon="ribbon-outline"
                label={t('expertise')}
                value={uzmanlikLabel}
                onPress={() => setKocProfilModal(true)}
                topRadius
              />
              <SettingsRow
                icon="document-text-outline"
                label={t('bio')}
                value={user?.biyografi ? '✓ ' + t('done') : t('notEntered')}
                onPress={() => setKocProfilModal(true)}
                bottomRadius
                hideBorder
              />
            </Group>

            <SectionTitle label={t('sectionCoachNotif')} />
            <Group>
              <ToggleRow
                icon="checkmark-circle-outline"
                label={t('notifComplete')}
                value={notifTamamlandi}
                onValueChange={setNotifTamamlandi}
                topRadius
              />
              <ToggleRow
                icon="trophy-outline"
                label={t('notifAthlPR')}
                value={notifSporcuPR}
                onValueChange={setNotifSporcuPR}
              />
              <ToggleRow
                icon="chatbubble-ellipses-outline"
                label={t('notifMessage')}
                value={notifMesaj}
                onValueChange={setNotifMesaj}
                bottomRadius
                hideBorder
              />
            </Group>
          </>
        )}

        {/* ── Gizlilik ── */}
        <SectionTitle label={t('sectionPrivacy')} />
        <Group>
          <SettingsRow
            icon="eye-off-outline"
            label={t('privacyPolicy')}
            onPress={handlePrivacy}
            topRadius
          />
          <SettingsRow
            icon="download-outline"
            label={t('exportData')}
            onPress={handleExportData}
          />
          <SettingsRow
            icon="trash-outline"
            label={t('deleteAccount')}
            onPress={handleDeleteAccount}
            danger
            bottomRadius
            hideBorder
          />
        </Group>

        {/* ── Destek ── */}
        <SectionTitle label={t('sectionSupport')} />
        <Group>
          <SettingsRow
            icon="chatbox-outline"
            label={t('contact')}
            onPress={handleContact}
            topRadius
          />
          <SettingsRow
            icon="help-circle-outline"
            label={t('helpCenter')}
            onPress={handleHelp}
            bottomRadius
            hideBorder
          />
        </Group>

        {/* ── Çıkış ── */}
        <SectionTitle label="" />
        <Group>
          <SettingsRow
            icon="log-out-outline"
            label={t('signOut')}
            onPress={handleSignOut}
            danger
            topRadius
            bottomRadius
            hideBorder
          />
        </Group>

        {/* Versiyon */}
        <Text style={s.version}>{t('appVersion')}</Text>
      </ScrollView>

      {/* ── Modaller ── */}
      <ProfileEditModal
        visible={profileModal}
        user={user}
        onSave={handleProfileSave}
        onClose={() => setProfileModal(false)}
      />
      {!isKoc && (
        <SporcuBilgiModal
          visible={sporcuBilgiModal}
          user={user}
          onSave={handleSporcuBilgiSave}
          onClose={() => setSporcuBilgiModal(false)}
        />
      )}
      {isKoc && (
        <KocProfilModal
          visible={kocProfilModal}
          user={user}
          onSave={handleKocProfilSave}
          onClose={() => setKocProfilModal(false)}
        />
      )}

      {/* ── Dil Seçim Modalı ── */}
      <Modal transparent animationType="slide" visible={langModal} onRequestClose={() => setLangModal(false)}>
        <TouchableOpacity style={st.langOverlay} activeOpacity={1} onPress={() => setLangModal(false)}>
          <TouchableOpacity activeOpacity={1} style={st.langSheet}>
            <View style={st.langHandle} />
            <Text style={st.langTitle}>{t('selectLanguage')}</Text>
            {LANGUAGES.map((lng) => (
              <TouchableOpacity
                key={lng.code}
                style={[
                  st.langRow,
                  language === lng.code && st.langRowActive,
                ]}
                onPress={() => { setLanguage(lng.code); setLangModal(false); }}
                activeOpacity={0.75}
              >
                <Text style={st.langFlag}>{lng.flag}</Text>
                <Text style={[st.langLabel, language === lng.code && { color: COLORS.accent }]}>
                  {lng.label}
                </Text>
                {language === lng.code && (
                  <Ionicons name="checkmark" size={18} color={COLORS.accent} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/* ── StyleSheet ─────────────────────────────────────────────── */
const makeS = () => StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT.lg, fontWeight: '800', color: COLORS.text },

  /* Profile card */
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 18, marginTop: 20, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.small,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.white },
  profileName:   { fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  profileEmail:  { fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 1 },
  roleBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: COLORS.accent + '22', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.accent + '55',
  },
  roleBadgeText: { fontSize: 10, color: COLORS.accent, fontWeight: '700' },
  editProfileBtn:{ padding: 8 },

  /* Premium banner */
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.accent + '12',
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.accent + '55',
    paddingHorizontal: 16, paddingVertical: 14,
    marginTop: 20, marginBottom: 6,
    ...SHADOW.accentGlow,
  },
  premiumBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  premiumBannerIcon:  {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.accent + '22',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.accent + '44',
  },
  premiumBannerTitle: { fontSize: FONT.md, fontWeight: '800', color: COLORS.accent },
  premiumBannerSub:   { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 1 },

  version: {
    textAlign: 'center', fontSize: FONT.xs, color: COLORS.textMuted,
    marginTop: 28, marginBottom: 12,
  },
});

const makeST = () => StyleSheet.create({
  sectionTitle: {
    fontSize: FONT.xs, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 0.8, marginTop: 22, marginBottom: 6, marginLeft: 4,
  },
  group: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface, gap: 12,
  },
  rowIcon: {
    width: 30, height: 30, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: FONT.sm, color: COLORS.text, fontWeight: '500' },
  rowValue: { fontSize: FONT.sm, color: COLORS.textMuted, fontWeight: '500' },

  /* Language picker */
  langOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  langSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40,
    borderWidth: 1, borderColor: COLORS.border,
  },
  langHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 16,
  },
  langTitle: {
    fontSize: FONT.lg, fontWeight: '800', color: COLORS.text,
    marginBottom: 12, textAlign: 'center',
  },
  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 12,
    borderRadius: RADIUS.md, marginBottom: 4,
  },
  langRowActive: { backgroundColor: COLORS.accent + '18' },
  langFlag:  { fontSize: 22 },
  langLabel: { fontSize: FONT.md, color: COLORS.text, fontWeight: '500', flex: 1 },
});

/* ── Modal styles ───────────────────────────────────────────── */
const makeMO = () => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: FONT.lg, fontWeight: '800', color: COLORS.text, marginBottom: 18 },
  label: { fontSize: FONT.xs, fontWeight: '700', color: COLORS.textMuted, marginBottom: 5, marginTop: 8 },
  input: {
    backgroundColor: COLORS.elevated, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.text, fontSize: FONT.md,
    paddingHorizontal: 14, height: 46,
  },
  row2: { flexDirection: 'row', gap: 10 },

  hedefGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  hedefChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.full, backgroundColor: COLORS.elevated,
    borderWidth: 1, borderColor: COLORS.border,
  },
  hedefChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  hedefChipText:   { fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: '600' },

  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  saveBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },
  cancelBtn:   { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelText:  { color: COLORS.textMuted, fontSize: FONT.sm },
});
