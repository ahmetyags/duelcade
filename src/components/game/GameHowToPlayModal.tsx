import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ArrowRight,
  Check,
  HelpCircle,
  RotateCw,
  X,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ui/ThemedText';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import type { TurnGameMode } from '@/types/turnGame';

interface HelpContent {
  title: string;
  goal: string;
  turn: string;
  win: string;
  difficulty: string;
  tip: string;
}

const HELP_CONTENT: Record<TurnGameMode, HelpContent> = {
  rune_grid: {
    title: 'Rün Düellosu',
    goal: 'Kendi işaretlerinden kesintisiz bir çizgi oluştur.',
    turn: 'Sıran geldiğinde boş karelerden yalnızca birine dokun. Yatay, dikey ve çapraz çizgiler geçerlidir.',
    win: 'Ekranda belirtilen uzunluktaki çizgiyi rakibinden önce tamamlayan turu kazanır.',
    difficulty: 'Zorluk yükseldikçe tahta büyür ve tamamlaman gereken çizgi uzar.',
    tip: 'Kendi çizgini büyütürken rakibin bir sonraki hamlede kazanabileceği kareyi kapat.',
  },
  connect_four: {
    title: 'Dört Hat',
    goal: 'Taşlarını aynı doğrultuda kesintisiz bir hatta birleştir.',
    turn: 'Bir sütuna dokunduğunda taşın o sütundaki en alttaki boş yere düşer.',
    win: 'Gerekli sayıda taşı yatay, dikey veya çapraz bağlayan oyuncu turu kazanır.',
    difficulty: 'Zorluk arttığında sütun ve satır sayısı büyür; zor seviyede daha uzun hat gerekir.',
    tip: 'İki farklı yönden tamamlanabilecek açık uçlu hatlar kurmaya çalış.',
  },
  memory_pairs: {
    title: 'Hafıza Eşleri',
    goal: 'Kapalı kartların altındaki aynı sembolleri eşleştir.',
    turn: 'Sıranda iki kart aç. Semboller aynıysa çift senin rengin olur ve tekrar oynarsın; değilse kartlar kapanır.',
    win: 'Bütün kartlar açıldığında en fazla çifti bulan oyuncu turu kazanır.',
    difficulty: 'Zorluk yükseldikçe kart sayısı ve hatırlaman gereken sembol çeşitliliği artar.',
    tip: 'Rakibin açtığı kartların konumlarını da takip et; bilgi iki oyuncu için ortaktır.',
  },
  pipe_circuit: {
    title: 'Devre Döndürme',
    goal: 'Bütün devre parçalarını köşede gösterilen hedef yönlerine getir.',
    turn: 'Bir parçaya dokunarak onu saat yönünde 90 derece çevir. Doğru yöne gelen parça kilitlenir.',
    win: 'Son yanlış parçayı hedef yönüne çeviren oyuncu turu kazanır.',
    difficulty: 'Tahta büyüdükçe düzeltilmesi gereken parça sayısı yaklaşık 30 kareye kadar çıkar.',
    tip: 'Parçanın sol üstündeki küçük şekil hedefi, ortadaki büyük şekil mevcut yönü gösterir.',
  },
  resonance_dials: {
    title: 'Rezonans Kilidi',
    goal: 'Her kanalı üstteki hedef frekansına ayarla.',
    turn: 'Kanalın yanındaki eksi veya artı düğmesiyle frekansı bir kademe değiştir. Eşleşen kanal kilitlenir.',
    win: 'Son frekansı doğru değere getiren oyuncu turu kazanır.',
    difficulty: 'Zorluk arttıkça aynı anda yönetilen kanal sayısı üçten altıya çıkar.',
    tip: 'Mevcut değer ile hedef arasındaki en kısa yönü seç; frekanslar döngüsel ilerler.',
  },
  cipher_clash: {
    title: 'Şifre Çatışması',
    goal: 'Sana özel gizli rün dizisini rakibinden önce çöz.',
    turn: 'Alttaki renklerden sırayla seçim yapıp tahminini gönder. “Tam” doğru rün ve doğru yeri, “Yer” doğru rün fakat yanlış yeri gösterir.',
    win: 'Dizideki bütün konumları tam eşleştiren ilk oyuncu turu kazanır.',
    difficulty: 'Zorluk arttığında dizi ve rün havuzu büyür; zor seviyede aynı rün birden fazla kullanılabilir.',
    tip: 'Sıfır geri bildirim aldığın renkleri sonraki tahminlerinden çıkar.',
  },
  circuit_claim: {
    title: 'Devre Alanı',
    goal: 'Enerji düğümleri arasına hat çekerek hücreleri kendi renginle kapat.',
    turn: 'İki komşu düğüm arasındaki boş hatta dokun. Bir hücrenin dördüncü kenarını kapatırsan hücreyi alır ve tekrar oynarsın.',
    win: 'Bütün hatlar tamamlandığında en fazla enerji hücresine sahip oyuncu turu kazanır.',
    difficulty: 'Zorluk yükseldikçe hücre sayısı 6’dan 30’a kadar büyür ve uzun zincirler oluşur.',
    tip: 'Üç kenarı kapanmış hücreyi rakibe bırakma; tek hamlede uzun bir alan zinciri kazanabilir.',
  },
  neon_trail: {
    title: 'Neon İz',
    goal: 'Hareket alanını korurken rakibinin bütün çıkışlarını kapat.',
    turn: 'Kürenin yanındaki üst, alt, sağ veya sol boş karelerden birine ilerle. Geçtiğin kare neon izin olur ve tekrar kullanılamaz.',
    win: 'Sırası geldiğinde hareket edebileceği boş komşu kare kalmayan oyuncu turu kaybeder.',
    difficulty: 'Zorluk yükseldikçe tahta büyür ve daha uzun süreli alan planlaması gerekir.',
    tip: 'Sadece önündeki boşluğa değil, iki hamle sonra ulaşabileceğin çıkış sayısına da bak.',
  },
  gateway_race: {
    title: 'Geçit Savaşı',
    goal: 'Kendi rengindeki başlangıç kenarından karşı enerji kapısına ulaş.',
    turn: '“İlerle” ile komşu kareye hareket et veya “Bariyer” ile rakibin yoluna engel koy. Hiçbir bariyer bütün yolları kapatamaz.',
    win: 'Karşı kenardaki kapı satırına ilk ulaşan oyuncu turu kazanır.',
    difficulty: 'Zorluk yükseldikçe tahta büyür ve kullanılabilecek bariyer sayısı artar.',
    tip: 'Bariyeri yalnızca rakibi yavaşlatmak için değil, onu senin yolundan uzaklaştırmak için kullan.',
  },
  polarity_war: {
    title: 'Polarite Savaşı',
    goal: 'Rakip kürelerini iki taraftan kuşatıp kendi rengine dönüştür.',
    turn: 'Yalnızca en az bir rakip küreyi çevirebilen parlak kareye oynayabilirsin. Arada kalan bütün küreler senin polaritene geçer.',
    win: 'İki oyuncunun da geçerli hamlesi kalmadığında en fazla küreye sahip olan turu kazanır.',
    difficulty: 'Zorluk arttıkça tahta 4×4’ten 8×8’e büyür ve kenar kontrolü önem kazanır.',
    tip: 'Köşeler çevrilemez; mümkün olduğunda köşeyi al, rakibine kolayca köşe verme.',
  },
};

const MINI_COLORS = [colors.cyan, colors.amber] as const;

function MiniGrid({
  values,
  arrow = 'right',
}: {
  values: readonly (0 | 1 | 2 | null)[];
  arrow?: 'right' | 'rotate';
}) {
  return (
    <View style={styles.miniGrid}>
      {values.map((value, index) => (
        <View
          key={index}
          style={[
            styles.miniCell,
            value === 2 && styles.miniBarrier,
            value !== null && value !== 2 && {
              backgroundColor: `${MINI_COLORS[value]}38`,
              borderColor: MINI_COLORS[value],
            },
          ]}
        >
          {value !== null && value !== 2 && (
            <ThemedText style={{ color: MINI_COLORS[value], fontWeight: '700' }}>
              {value === 0 ? '○' : '×'}
            </ThemedText>
          )}
        </View>
      ))}
      <View style={styles.diagramArrow}>
        {arrow === 'rotate'
          ? <RotateCw size={22} color={colors.primaryDark} />
          : <ArrowRight size={24} color={colors.primaryDark} />}
      </View>
    </View>
  );
}

function HowToDiagram({ mode }: { mode: TurnGameMode }) {
  if (mode === 'cipher_clash') {
    return (
      <View style={styles.sequenceDiagram}>
        <View style={styles.sequenceRow}>
          {['#E85D75', '#6C4EF6', '#F5C542', '#29C98B'].map((color, index) => (
            <View key={color} style={[styles.colorOrb, { backgroundColor: color }]}>
              <ThemedText style={styles.orbText}>{index + 1}</ThemedText>
            </View>
          ))}
        </View>
        <ArrowRight size={25} color={colors.primaryDark} />
        <View style={styles.feedbackPreview}>
          <ThemedText variant="label" style={{ color: colors.primaryDark }}>2 TAM</ThemedText>
          <ThemedText variant="caption" color="muted">1 YER</ThemedText>
        </View>
      </View>
    );
  }

  if (mode === 'resonance_dials') {
    return (
      <View style={styles.frequencyDiagram}>
        <View style={styles.frequencyBox}>
          <ThemedText variant="caption" color="muted">MEVCUT</ThemedText>
          <ThemedText variant="mono">180 Hz</ThemedText>
        </View>
        <ArrowRight size={25} color={colors.primaryDark} />
        <View style={[styles.frequencyBox, styles.frequencyTarget]}>
          <ThemedText variant="caption" color="muted">HEDEF</ThemedText>
          <ThemedText variant="mono" style={{ color: colors.amberMuted }}>220 Hz</ThemedText>
        </View>
      </View>
    );
  }

  if (mode === 'memory_pairs') {
    return (
      <View style={styles.cardDiagram}>
        {['?', '◆', '?', '◆'].map((symbol, index) => (
          <View key={index} style={[styles.previewCard, symbol !== '?' && styles.previewCardOpen]}>
            <ThemedText style={{ color: symbol === '?' ? colors.textMuted : colors.primaryDark }}>
              {symbol}
            </ThemedText>
          </View>
        ))}
        <ArrowRight size={24} color={colors.primaryDark} />
        <View style={styles.checkCircle}><Check size={20} color={colors.success} /></View>
      </View>
    );
  }

  if (mode === 'circuit_claim') {
    return (
      <View style={styles.circuitDiagram}>
        <View style={styles.previewCircuitBox}>
          <View style={[styles.previewLine, styles.previewTop]} />
          <View style={[styles.previewLine, styles.previewBottom]} />
          <View style={[styles.previewLine, styles.previewLeft]} />
          <View style={[styles.previewLine, styles.previewRight, { backgroundColor: colors.primary }]} />
          <ThemedText style={{ color: colors.primaryDark }}>○</ThemedText>
        </View>
        <ArrowRight size={26} color={colors.primaryDark} />
        <ThemedText variant="label" style={{ color: colors.primaryDark }}>+1 ALAN</ThemedText>
      </View>
    );
  }

  if (mode === 'pipe_circuit') {
    return (
      <View style={styles.pipeDiagram}>
        <ThemedText style={styles.pipeGlyph}>┗</ThemedText>
        <RotateCw size={27} color={colors.primaryDark} />
        <ThemedText style={[styles.pipeGlyph, { transform: [{ rotate: '90deg' }] }]}>┗</ThemedText>
        <View style={styles.checkCircle}><Check size={20} color={colors.success} /></View>
      </View>
    );
  }

  const values: Record<string, readonly (0 | 1 | 2 | null)[]> = {
    rune_grid: [null, null, null, null, 0, 0, 0, null, null, 1, null, null, null, 1, null, null],
    connect_four: [null, null, null, null, null, 1, null, null, 0, 1, 0, null, 0, 0, 1, 1],
    neon_trail: [0, 0, null, null, null, 0, null, 1, null, 0, null, 1, null, null, 1, 1],
    gateway_race: [null, null, 1, null, null, 2, null, null, null, 2, null, null, 0, null, null, null],
    polarity_war: [null, null, null, null, null, 0, 1, null, null, 1, 1, 0, null, null, null, null],
  };
  return <MiniGrid values={values[mode]} />;
}

export function GameHowToPlayModal({
  mode,
  visible,
  onClose,
}: {
  mode: TurnGameMode;
  visible: boolean;
  onClose: () => void;
}) {
  const content = HELP_CONTENT[mode];
  const steps = [
    ['AMAÇ', content.goal],
    ['SIRANDA NE YAPACAKSIN?', content.turn],
    ['NASIL KAZANIRSIN?', content.win],
    ['ZORLUK NASIL DEĞİŞİR?', content.difficulty],
  ] as const;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.helpMark}>
              <HelpCircle size={24} color={colors.primaryDark} />
            </View>
            <View style={styles.headerCopy}>
              <ThemedText variant="caption" color="accent">NASIL OYNANIR?</ThemedText>
              <ThemedText variant="subtitle">{content.title}</ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nasıl oynanır penceresini kapat"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={21} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.diagram}>
              <HowToDiagram mode={mode} />
              <ThemedText variant="caption" color="muted" style={styles.diagramCaption}>
                Oklar, bir hamlenin tahtadaki etkisini gösterir.
              </ThemedText>
            </View>

            <View style={styles.steps}>
              {steps.map(([title, description], index) => (
                <View key={title} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <ThemedText variant="label" style={{ color: colors.primaryDark }}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <View style={styles.stepCopy}>
                    <ThemedText variant="label">{title}</ThemedText>
                    <ThemedText color="secondary">{description}</ThemedText>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.tip}>
              <ThemedText variant="label" style={{ color: colors.amberMuted }}>İPUCU</ThemedText>
              <ThemedText color="secondary">{content.tip}</ThemedText>
            </View>
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Anladım"
            onPress={onClose}
            style={styles.understoodButton}
          >
            <Check size={19} color={colors.textOnPrimary} />
            <ThemedText variant="label" color="onPrimary">ANLADIM, OYUNA DÖN</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: 'rgba(23,35,31,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
    ...shadows.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  helpMark: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: { gap: spacing.lg },
  diagram: {
    minHeight: 190,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  diagramCaption: { textAlign: 'center' },
  miniGrid: {
    width: 184,
    height: 136,
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'relative',
  },
  miniCell: {
    width: '25%',
    height: '25%',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBarrier: { backgroundColor: colors.textSecondary },
  diagramArrow: {
    position: 'absolute',
    right: -18,
    top: 54,
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sequenceDiagram: {
    minHeight: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  sequenceRow: { flexDirection: 'row', gap: spacing.xs },
  colorOrb: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbText: { color: '#FFFFFF', fontWeight: '700' },
  feedbackPreview: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  frequencyDiagram: {
    minHeight: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  frequencyBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  frequencyTarget: { borderColor: colors.amber, backgroundColor: colors.secondaryContainer },
  cardDiagram: { minHeight: 130, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewCard: {
    width: 40,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCardOpen: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: '#E7F8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuitDiagram: { minHeight: 130, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  previewCircuitBox: {
    width: 80,
    height: 80,
    position: 'relative',
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLine: { position: 'absolute', backgroundColor: colors.textSecondary, borderRadius: radius.pill },
  previewTop: { top: -4, left: 4, right: 4, height: 8 },
  previewBottom: { bottom: -4, left: 4, right: 4, height: 8 },
  previewLeft: { left: -4, top: 4, bottom: 4, width: 8 },
  previewRight: { right: -4, top: 4, bottom: 4, width: 8 },
  pipeDiagram: { minHeight: 130, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  pipeGlyph: { fontSize: 54, lineHeight: 62, color: colors.primaryDark },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepNumber: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  tip: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.amber,
    backgroundColor: colors.secondaryContainer,
    gap: spacing.xs,
  },
  understoodButton: {
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
