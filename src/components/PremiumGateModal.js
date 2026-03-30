/**
 * PremiumGateModal
 * Kilitli bir özelliğe tıklandığında gösterilen popup.
 *
 * Kullanım:
 *   const [gateVisible, setGateVisible] = useState(false);
 *   const [gateFeature, setGateFeature] = useState(null);
 *
 *   const openGate = (feature) => { setGateFeature(feature); setGateVisible(true); };
 *
 *   <PremiumGateModal
 *     visible={gateVisible}
 *     onClose={() => setGateVisible(false)}
 *     onUpgrade={() => { setGateVisible(false); navigation.navigate('Premium'); }}
 *     feature={gateFeature}
 *   />
 *
 * feature prop örneği:
 *   { icon: 'trophy-outline', title: 'PR Takibi', desc: 'Kişisel rekorlarını ...' }
 *
 * feature verilmezse varsayılan içerik gösterilir.
 */
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONT, RADIUS, SHADOW } from '../constants/theme';

export default function PremiumGateModal({ visible, onClose, onUpgrade, feature }) {
  const s = makeS();
  const icon  = feature?.icon  ?? 'lock-closed-outline';
  const title = feature?.title ?? 'Premium Özellik';
  const desc  = feature?.desc  ?? 'Bu özellik Pro veya Coach üyelikte kullanılabilir. Gelişmiş analiz ve performans takibi için premiuma geçebilirsin.';
  const tier  = feature?.tier  ?? 'Pro';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.sheet} activeOpacity={1}>

          {/* Lock icon */}
          <View style={s.lockCircle}>
            <View style={s.innerLock}>
              <Ionicons name={icon} size={28} color={COLORS.accent} />
            </View>
          </View>

          {/* Tier badge */}
          <View style={s.tierBadge}>
            <Ionicons name="diamond-outline" size={11} color={COLORS.accent} />
            <Text style={s.tierBadgeText}>{tier} Özelliği</Text>
          </View>

          {/* Text */}
          <Text style={s.title}>{title}</Text>
          <Text style={s.desc}>{desc}</Text>

          {/* Buttons */}
          <TouchableOpacity style={s.upgradeBtn} onPress={onUpgrade} activeOpacity={0.85}>
            <Ionicons name="flash" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
            <Text style={s.upgradeBtnText}>Premium'a Geç</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.cancelText}>Şimdi değil</Text>
          </TouchableOpacity>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeS = () => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },

  lockCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.accent + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, ...SHADOW.accentGlow,
  },
  innerLock: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.accent + '2A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.accent + '55',
  },

  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.accent + '15', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.accent + '44',
    marginBottom: 12,
  },
  tierBadgeText: { fontSize: FONT.xs, color: COLORS.accent, fontWeight: '700' },

  title: {
    fontSize: FONT.xl, fontWeight: '800', color: COLORS.text,
    textAlign: 'center', marginBottom: 8,
  },
  desc: {
    fontSize: FONT.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 21, marginBottom: 24,
    paddingHorizontal: 8,
  },

  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    height: 50, width: '100%', marginBottom: 10,
    ...SHADOW.accentGlow,
  },
  upgradeBtnText: { fontSize: FONT.md, fontWeight: '800', color: COLORS.white },

  cancelBtn:  { paddingVertical: 10, paddingHorizontal: 24 },
  cancelText: { fontSize: FONT.sm, color: COLORS.textMuted, fontWeight: '600' },
});
