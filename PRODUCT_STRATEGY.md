# Duelcade Ürün Stratejisi

## Sabit ürün kimliği

**Kategori:** hızlı zekâ düelloları  
**Vaat:** Tek başına veya bir arkadaşla, 2–5 dakikada anlaşılır ve rövanş
isteği uyandıran kısa maçlar.  
**Oyuncu hissi:** “Bir hamle daha düşünmeliydim; hemen tekrar deneyebilirim.”

Duelcade ana akışında kaçış odası, Operator/Explorer rolleri veya uzun macera
anlatısı satmaz. Bu içerikler ileride ayrı etkinlik formatı olabilir; ilk
sürümün edinme, öğretici, ana ekran ve mağaza dili yalnızca hızlı zekâ
düellolarını anlatır.

## Dört çekirdek mod kararı

Her mod 1–5 arası; ilk bakışta anlaşılma, kısa tur uygunluğu, dokunmatik
kontrol, stratejik derinlik, görsel/işitsel geri bildirim, bot dengesi ve
Duelcade'e özgü his ölçütleriyle değerlendirildi.

| Mod | Anlaşılma | Hız | Dokunma | Derinlik | Geri bildirim | Bot | Özgünlük | Toplam |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Neon İz | 4 | 5 | 5 | 5 | 5 | 4 | 5 | 33 |
| Hafıza Eşleri | 5 | 4 | 5 | 3 | 5 | 4 | 4 | 30 |
| Devre Alanı | 4 | 4 | 4 | 5 | 5 | 4 | 4 | 30 |
| Rün Düellosu | 5 | 5 | 5 | 3 | 4 | 4 | 3 | 29 |
| Dört Hat | 5 | 4 | 5 | 4 | 4 | 5 | 2 | 29 |
| Şifre Çatışması | 3 | 3 | 4 | 5 | 3 | 4 | 5 | 27 |
| Polarite Savaşı | 2 | 3 | 4 | 5 | 4 | 4 | 3 | 25 |
| Geçit Savaşı | 2 | 2 | 3 | 5 | 4 | 3 | 5 | 24 |
| Rezonans Kilidi | 4 | 4 | 4 | 2 | 4 | 3 | 3 | 24 |
| Devre Döndürme | 3 | 3 | 4 | 2 | 4 | 3 | 3 | 22 |

Başlangıç havuzu:

1. **Rün Düellosu:** İlk oturum ve temel sıra öğreticisi.
2. **Hafıza Eşleri:** Geniş kitleye uygun, güçlü kart animasyonu ve tekrar
   hamlesi anları.
3. **Devre Alanı:** Zincir kapma, geri dönüş ve ustalık hissi.
4. **Neon İz:** Oyunun imza modu; kısa, okunaklı ve yüksek stratejik gerilim.

Diğer altı mod silinmez. Analytics verisi ve kapalı test sonrasında sezonluk
havuz, günlük mücadele veya sınırlı etkinlik olarak yeniden değerlendirilir.

## Çekirdek mod kalite standardı

Her çekirdek mod yayın adayı sayılmadan önce:

- İlk hamle, modal okumadan en fazla 10 saniye içinde yapılabilmeli.
- Kurallar tek hedef, tek sıra eylemi ve tek kazanma koşuluyla anlatılmalı.
- Geçerli hamleler görünür; geçersiz hamle yalnızca renkle belirtilmemeli.
- Hamle, skor, tur kazanma ve maç kazanma için ayrı animasyon/ses/haptik olmalı.
- Reduce Motion açıkken anlam kaybı olmadan sade geri bildirim kullanılmalı.
- Easy DuelBot ilk maçta öğretici hata payı bırakmalı; medium cezalandırıcı
  olmadan tutarlı, hard ise kurallara uygun güçlü rakip olmalı.
- Telefon portre, telefon yatay ve dar Android genişliklerinde tahta taşmamalı.
- Sunucu ve iki istemci aynı hamle numarası, aktif oyuncu, skor ve sonucu görmeli.

## İlk oturum

Hedef: yeni oyuncu uygulamayı açtıktan sonra 30 saniye içinde ilk anlamlı
hamlesini yapar.

1. Ana ekranda birincil aksiyon **Hemen Dene** olur.
2. İsim/avatar seçimi ilk maçın önüne zorunlu engel olarak konmaz; geçici profil
   otomatik üretilir.
3. İlk maç, kolay DuelBot'a karşı 3×3 Rün Düellosu ile başlar.
4. Öğretici canlı tahta üzerinde üç kısa adım gösterir: kendi hamlen, rakibin
   tehdidi, kazanma karesi.
5. Oyuncu hamleyi kendisi yapar; otomatik oynatılan demo tamamlanma sayılmaz.
6. İlk turdan sonra diğer üç mod kartlarla tanıtılır ve normal kısa maça geçilir.

Başarı ölçümleri:

- `first_playable_ms` medyanı ≤ 30.000 ms
- öğretici başlatanların ≥ %80'i ilk hamleyi yapar
- öğretici başlatanların ≥ %65'i ilk maçı tamamlar
- ilk maçta kural yardımını ikinci kez açma oranı < %25

## Maç sonu ve rövanş

Sonuç ekranı sırası:

1. 800–1200 ms kazanan geri bildirimi
2. skor ve en iyi tek maç içgörüsü
3. kazanılan XP/görev ilerlemesi
4. birincil **Rövanş**, ikincil **Yeni Rakip/Yeni Maç**, üçüncül **Ana Sayfa**

İki oyunculu rövanşta her iki oy görünür. Rakip ayrılırsa bekleme sonsuza kadar
sürmez; kullanıcı yeni oda veya DuelBot seçeneğine yönlendirilir. Rövanş aynı
zorluk ve süreyle yeni seed üretir, önceki tahta durumunu taşımaz.

## Backend ve oyuncu kimliği

Hedef mimari:

- PostgreSQL: oyuncu, kimlik sağlayıcı, maç, maç katılımcısı, mod ustalığı,
  görev ilerlemesi, kozmetik ve envanter.
- Redis: atomik oda kodu, kısa ömürlü join ticket, rate limit, matchmaking
  kuyruğu ve geçici presence.
- Colyseus: yalnızca canlı maç otoritesi.
- HTTP API: misafir hesap, token yenileme, profil, geçmiş, ilerleme ve veri
  silme/dışa aktarma.

Kimlik akışı:

1. İlk açılışta backend sunucu üretimli oyuncu kimliği ve yenileme token'ı verir.
2. Yenileme token'ı native'de SecureStore'da, web'de güvenli cookie yaklaşımıyla
   tutulur.
3. Odaya giriş için 30–60 saniyelik, oda ve oyuncuya bağlı imzalı ticket alınır.
4. Colyseus `onAuth` ticket imzasını, süresini, oda kimliğini ve tek kullanımını
   doğrular.
5. Google Play Games veya başka hesap bağlantısı misafir verisini aynı oyuncuya
   yükseltir; yeni profil açmaz.

Temel tablolar:

- `players`
- `player_identities`
- `refresh_sessions`
- `matches`
- `match_participants`
- `mode_mastery`
- `missions`
- `player_missions`
- `cosmetics`
- `player_inventory`
- `analytics_outbox`

## İlerleme ekonomisi

- XP yalnızca tamamlanan maç, ilk günlük galibiyet, görev ve sportmenlik
  davranışından gelir.
- Kazanmak XP'yi artırabilir fakat kaybeden oyuncu ilerlemesiz bırakılmaz.
- Mod ustalığı genel seviyeden ayrıdır.
- Kozmetikler avatar, çerçeve, iz efekti ve masa temasıyla sınırlıdır.
- Oyun gücü, ek süre, daha iyi hamle veya rank avantajı satılmaz.

İlk ekonomi için hedefler:

- Seviye 1–5: ilk gün içinde görünür ilerleme
- Seviye 10: yaklaşık 7 aktif gün
- Her maç sonunda en az bir ilerleme çubuğunda anlamlı hareket
- Günlük görevler 2–4 maç içinde tamamlanabilir

## Analytics sözleşmesi

Toplanacak olaylar:

- `app_opened`
- `tutorial_started`, `tutorial_step_completed`, `tutorial_completed`
- `first_move_made`
- `match_created`, `match_joined`, `match_started`
- `round_started`, `round_completed`, `round_skipped`
- `match_completed`, `match_abandoned`
- `rematch_requested`, `rematch_started`
- `bot_difficulty_selected`
- `mission_progressed`, `level_up`, `cosmetic_equipped`
- `matchmaking_started`, `matchmaking_completed`, `matchmaking_cancelled`

Olaylarda e-posta, görünen ad, sohbet metni veya oda davet kodu tutulmaz.
Oyuncu kimliği analitik için döndürülemez takma kimliğe çevrilir.

Ana ürün metrikleri:

- ilk hamle süresi
- öğretici ve ilk maç tamamlama oranı
- maç terk oranı
- mod bazlı tur süresi ve pas geçme oranı
- rövanş isteme/başlama oranı
- D1 ve D7 geri dönüş
- crash-free session ve ANR oranı

## Kapalı test planı

Üç dalga:

1. 10 kişi, 3 gün: kritik akış ve anlaşılabilirlik
2. 30 kişi, 7 gün: mod dengesi, cihaz çeşitliliği ve ilk geri dönüş
3. 60–100 kişi, 14 gün: retention, rövanş, matchmaking hazırlığı

Testçi karması yalnızca geliştirici çevresinden oluşmaz. Farklı Android
sürümleri, düşük/orta segment cihazlar, oyuna aşina ve aşina olmayan kişiler,
Türkçe ve İngilizce kullanıcılar dahil edilir.

İlk kapalı test çıkış kapısı:

- crash-free session ≥ %99,5
- ilk maç tamamlama ≥ %65
- normal bağlantıda maç terk ≤ %15
- en az bir rövanş başlatma ≥ %25
- hiçbir çekirdek modda pas geçme oranı %30'u aşmaz
- kritik P0/P1 hata açık kalmaz

## Sıralı teslimat

1. Ürün kimliği, dört mod ve 2–5 dakika sınırı
2. Etkileşimli ilk maç öğreticisi
3. Sonuç/rövanş durum makinesi
4. Güvenli misafir kimliği ve PostgreSQL maç geçmişi
5. XP, seviye, görev, mod ustalığı ve kozmetik
6. Analytics, crash ve backend gözlemlenebilirliği
7. Kapalı test dalgaları ve veri temelli denge
8. Matchmaking, leaderboard ve canlı etkinlik
9. Google Play yayın kalite kapısı
