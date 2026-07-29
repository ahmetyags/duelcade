# Duelcade — Arşivlenmiş Görsel Tasarım Notları

Bu doküman uygulamanın güncel görsel yönünü tanımlar. Stitch ile üretilen ana sayfa,
Spirit Guide, Adventurer ve sonuç ekranları referans alınmıştır. Eski koyu bilimkurgu
teması yerine sıcak, masalsı ve dokunsal bir co-op macera dili kullanılır.

## Tasarım karakteri

- Ana his: samimi, güvenli, merak uyandıran, çocuk dostu macera.
- Görsel yaklaşım: soft minimalism + tactile neomorphism.
- Formlar: keskin köşe yok; organik, yuvarlak ve “sıkılabilir” yüzeyler.
- Derinlik: hafif yaygın gölge ve daha koyu alt kenar, fiziksel oyuncak hissi verir.
- Arka plan: sıcak krem; düşük opaklıklı mint, sarı, şeftali ve lavanta lekeleri.
- İkonlar: ince ama okunaklı çizgi ikonlar; dekoratif ikonlar sınırlı tutulur.
- Bu belgedeki eski rol tabanlı oyun mantığı arşiv niteliğindedir; güncel marka Duelcade'dir.

## Renk sistemi

| Kullanım | Değer | Açıklama |
|---|---:|---|
| Background | `#FFFDF5` | Ana sıcak krem zemin |
| Background Deep | `#F2F6ED` | İkincil açık yeşil zemin |
| Surface | `#FFFEFA` | Kart ve giriş yüzeyi |
| Surface Elevated | `#FFFFFF` | Öne çıkan kart |
| Surface Muted | `#F0F6F1` | Pasif ve yardımcı alan |
| Primary | `#296956` | Orman yeşili ana aksiyon |
| Primary Dark | `#174A3D` | Yeşil butonun alt kenarı |
| Primary Container | `#A7E8D0` | Mint vurgulu yüzey |
| Secondary | `#77592F` | Ahşap kahvesi |
| Secondary Dark | `#523B20` | Ahşap butonun alt kenarı |
| Secondary Container | `#FDD39F` | Bal/şeftali yüzey |
| Text Primary | `#26332F` | Ana metin |
| Text Secondary | `#53605B` | Açıklama metni |
| Text Muted | `#747E79` | Yardımcı metin |
| Border | `#D6DED8` | Nötr kart kenarı |
| Success | `#2F9367` | Başarı |
| Error | `#C7535C` | Hata ve alarm |
| Rare | `#68618D` | Özel/lavanta bilgi |

### Rol ve mücevher renkleri

| Rol / nesne | Ana | Açık yüzey |
|---|---:|---:|
| Spirit Guide (Operator) | `#347B82` | `#DDF4F1` |
| Adventurer (Explorer) | `#9A6732` | `#FFF0BA` |
| Ruby | `#FF8F8F` | açık pembe ton |
| Sapphire | `#BEE7F5` | açık mavi ton |
| Emerald | `#74E892` | açık yeşil ton |
| Sunlight | `#FFEC99` | sarı vurgu |
| Peach | `#FFB894` | şeftali vurgu |
| Lavender | `#DCD6FF` | özel bilgi vurgu |

Renk hiçbir zaman tek durum göstergesi değildir. İkon, etiket veya şekil ile birlikte
kullanılır; böylece renk körlüğü moduyla uyum korunur.

## Tipografi

Ana yazı tipi `Quicksand`’dir ve uygulama içine yerel olarak gömülüdür. Ağ bağlantısı
olmadan APK ve web paketinde çalışır.

| Stil | Boyut / satır | Ağırlık | Kullanım |
|---|---:|---:|---|
| Title | 30 / 38 | 700 | Ekran ve marka başlığı |
| Subtitle | 22 / 30 | 600 | Bölüm başlığı |
| Body | 16 / 24 | 500 | Ana içerik |
| Caption | 14 / 20 | 500 | Açıklama |
| Label | 12 / 16 | 700 | Kısa üst etiket |
| Data | 24 / 32 | 600 | Kod, sayaç, skor |
| Data Large | 32 / 40 | 700 | Oda kodu ve büyük skor |

- Tamamı büyük harf metin yalnızca kısa etiketlerde kullanılır.
- Uzun açıklamalar sentence case kalır.
- Mobil ana başlık 40–42 px’e kadar büyüyebilir.
- Büyük metin ayarı mevcut tipografi ölçeğini `%15` büyütür.

## Ölçü ve şekil

- Temel grid: `8px`.
- Mobil yatay boşluk: `24px`; dar yardımcı alanlarda `16px`.
- Kart yarıçapı: `24px`.
- Küçük kontrol yarıçapı: `10–16px`.
- Buton yarıçapı: tam pill.
- Ana buton minimum yüksekliği: `64px`.
- Kart kenarı: `2px`.
- Tactile buton alt kenarı: `6px`.
- Dokunma alanı minimum `44 × 44px`.

## Ortak bileşenler

### Primary button

- Orman yeşili dolgu, açık yeşil üst kenar ve koyu yeşil alt kenar.
- Quicksand Bold, krem metin.
- Basıldığında `3px` aşağı iner ve `0.985` ölçeklenir.
- Oluşturma, onaylama ve tekrar oynama aksiyonları için kullanılır.

### Wood button

- Ahşap kahvesi dolgu ve koyu kahve alt kenar.
- Ana sayfadaki “Join a Friend” gibi sosyal/ikincil ana aksiyon içindir.

### Secondary button

- Krem/beyaz yüzey, nötr kenar ve yumuşak alt gölge.
- Eve dönme, temizleme ve alternatif aksiyonlar için kullanılır.

### Role buttons

- Spirit Guide: açık mint/mavi yüzey, koyu teal içerik.
- Adventurer: açık sarı yüzey, sıcak kahve içerik.
- Rol rengi metin, ikon ve kenarda birlikte görünür.

### Panel

- Açık yüzey, `24px` köşe, `2px` kenar ve düşük opaklıklı aşağı gölge.
- İç boşluk varsayılan `16px`.
- Bilgi yoğun alanlar bile karanlık terminal kartına dönüşmez.

### Magic backdrop

- Etkileşimi engellemeyen, absolute pastel dekorasyon katmanı.
- Mint büyük daire, sarı alt daire ve küçük şeftali/lavanta noktalarından oluşur.
- Metin altında yeterli kontrast kalacak şekilde düşük opaklıktadır.

## Ekran yönleri

### Ana sayfa

- Üstte “CO-OP ADVENTURE” chip’i ve ayarlar kontrolü.
- Ortada iki rolü ve ortak yıldızı temsil eden üçlü amblem.
- “Duelcade” marka adı ve “Two players. One shared table!” mesajı.
- Yeşil “Create an Adventure” ve ahşap “Join a Friend” butonları.
- Altta Spirit Guide ve Adventurer rol önizlemeleri.

### Oda oluşturma / katılma

- Aynı krem zemin ve pastel dekorasyon.
- Quicksand giriş metinleri; büyük ve yüksek kontrastlı oda kodu.
- Rol adları kullanıcıya “Spirit Guide” ve “Adventurer” olarak gösterilir.
- Seçim kartları `2px` kenarlı ve geniş dokunma alanlıdır.

### Adventure Camp (Lobby)

- Oda kodu yükseltilmiş açık kartta gösterilir.
- Oyuncular ayrı yumuşak kartlardadır.
- Hazır, host ve bağlantı durumları hem metin hem ikon/renkle belirtilir.

### Spirit Guide ekranı

- Üst HUD açık, pill biçimli ve mavi/mint kenarlıdır.
- Ana özel bilgi kartı koyu CRT yerine açık “Magic Map” kartıdır.
- Başlık: “Clues for your friend”.
- Kodlar, semboller ve rotalar yüksek kontrastlı pastel öğelerle gösterilir.

### Adventurer ekranı

- Üst HUD açık sarı/kremsi rol yüzeyidir.
- Başlık: “Little Adventurer”.
- Etkileşim, envanter ve seçim öğeleri oyuncak düğmeler gibi davranır.
- Rol içeriği diğer oyuncunun özel bilgisini göstermemeye devam eder.

### Sonuç ekranı

- Başarıda “Mission Accomplished” ve “You Found the Way Out!” dili.
- Büyük kutlama simgesi ve pastel skor kartı.
- İstatistikler iki sütunlu yumuşak kartlarda.
- Yeşil “Play Again”, açık “Return Home” aksiyonları.
- Başarısızlık cezalandırıcı değil: “Adventure Paused / The Mystery Continues”.

## Erişilebilirlik ve responsive kurallar

- Metin kontrastı WCAG AA hedefler; pastel renkler uzun metinde doğrudan kullanılmaz.
- Küçük ekranlarda içerik ScrollView ile kayar, aksiyonlar kesilmez.
- Web’de content-box taşmasını engellemek için ana içerik `border-box` kullanır.
- Sistem fontu yerine yerel Quicksand dosyaları yüklenmeden içerik gösterilmez.
- Reduce Motion açıkken mevcut hareket azaltma ayarı korunur.
- High Contrast ve Large Text ayarları ortak bileşenlerden uygulanır.

## Dil sistemi

- Ayarlar ekranında `DİL / LANGUAGE` kartı bulunur.
- Desteklenen diller Türkçe (`tr`) ve İngilizce (`en`) olarak tanımlıdır.
- Seçim anında tüm bağlı ekranlar yeniden render olur ve tercih AsyncStorage’da saklanır.
- Arayüz metinleri, hata anahtarları ve sunucudan gelen oyun terimleri aynı çeviri katmanından geçer.
- Yeni kullanıcılar için varsayılan dil Türkçedir; English seçeneği aynı karttan etkinleştirilir.
- Çeviri sözlüğü ve oyun terimi eşlemeleri `src/i18n/index.ts` içindedir.

## Kod karşılığı

- Tokenlar: `theme/tokens.ts`
- Font aileleri: `theme/typography.ts`
- Font yükleme: `src/app/_layout.tsx`
- Arka plan: `src/components/ui/MagicBackdrop.tsx`
- Buton: `src/components/ui/ThemedButton.tsx`
- Kart: `src/components/ui/Panel.tsx`
- Metin: `src/components/ui/ThemedText.tsx`

Bu dokümandaki renk ve ölçüler değiştirilecekse önce tokenlar güncellenmeli; ekranlarda
dağınık hex değerleri çoğaltılmamalıdır.
