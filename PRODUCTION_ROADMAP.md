# Duelcade — Google Play Üretim Yol Haritası

Duelcade'in ürün vaadi:

> Tek başına veya bir arkadaşla, 2–5 dakikalık hızlı zekâ düelloları.

Bu yol haritası yeni oyun modu sayısını artırmaktan önce ilk oturumu, tekrar
oynama isteğini, güvenilir multiplayer'ı ve ölçülebilir kaliteyi tamamlamayı
önceliklendirir.

## Mevcut temel

- Expo SDK 57, React Native 0.86 ve Android/iOS/web istemcisi
- Aynı kuralları kullanan solo DuelBot ve iki oyunculu Colyseus maçları
- 10 deterministik sıra tabanlı oyun modu
- Sunucu otoriteli hamle, sıra, süre, skor ve maç sonucu
- Özel oda kodu, reconnect, rematch, chat ve reaksiyonlar
- Türkçe/İngilizce arayüz ve temel erişilebilirlik seçenekleri
- Docker sunucu dağıtımı ve EAS development/preview/production profilleri
- TypeScript, lint ve unit/multiplayer entegrasyon testleri

## Aşama 0 — Güvenilir oyun temeli

- [x] Kayıt olmayan socket bağlantılarını zaman aşımıyla odadan çıkar
- [x] Aynı oyuncu kimliğiyle ikinci kez oda koltuğu alınmasını engelle
- [x] Terminal sunucu kapatmalarında otomatik reconnect başlatma
- [x] Başarısız connect/reconnect sonrasında istemciyi `error` durumuna geçir
- [x] Otoriter oyun sunucusunu bağımsız `duelcade-backend` projesine ayır
- [ ] Reconnect token'ını native cihazlarda SecureStore'a taşı
- [x] Production Android derlemesinde cleartext trafiği kapat
- [ ] Oda kodu rezervasyonunu Redis üzerinde atomik hale getir
- [ ] Join işlemini kısa ömürlü, sunucu imzalı ticket modeline taşı
- [ ] Uçak modu, host ayrılması ve 60 saniye reconnect senaryolarını iki gerçek
  Android cihazda doğrula

## Aşama 1 — İlk oturum ve ana oyun döngüsü

- [ ] Ana ekran mesajlarını tek ürün kimliğinde birleştir; eski
  Operator/Explorer/kaçış anlatısını ana akıştan kaldır
- [ ] Oyuncuyu ilk hamlesine yönlendiren etkileşimli solo öğretici oluştur
- [ ] İlk kez açılışta 30 saniye içinde oynanabilir maça ulaş
- [ ] En güçlü dört modu başlangıç havuzu olarak belirle ve cilala
- [ ] Maç sonu kutlaması, rövanş ve yeni maç geçişlerini kesintisiz hale getir
- [ ] Bot zorluğunu oyuncunun ilk maç deneyimine göre dengele
- [ ] TalkBack, büyük metin, renk körlüğü ve azaltılmış hareket kontrollerini
  gerçek cihazda doğrula

## Aşama 2 — Oyuncu kimliği ve kalıcı ilerleme

- [ ] Mobil ve bağımsız backend arasında sürümlenmiş `protocol` ve
  `game-engine` paket sınırlarını oluştur
- [ ] PostgreSQL üzerinde oyuncu, maç, mod ustalığı ve envanter modellerini kur
- [ ] Sunucu üretimli misafir hesap ve daha sonra hesap yükseltme akışı ekle
- [ ] XP, oyuncu seviyesi ve her mod için ustalık ilerlemesi ekle
- [ ] Yalnızca kozmetik avatar, çerçeve ve masa teması envanteri ekle
- [ ] Oyuncu verisini dışa aktarma ve silme akışını backend üzerinden sağla

## Aşama 3 — Geri dönüş ve sosyal sistemler

- [ ] Günlük ortak seed mücadelesi
- [ ] Baskıcı olmayan günlük/haftalık görevler ve telafi edilebilir seri
- [ ] Google Play Games başarımları
- [ ] Günlük, haftalık ve tüm zamanlar liderlik tabloları
- [ ] Hızlı eşleşme ve benzer beceri seviyesinde rakip bulma
- [ ] Rakip bulunamazsa aynı kurallarla DuelBot'a geçiş
- [ ] Hazır mesajlar, oyuncu susturma, engelleme ve raporlama

## Aşama 4 — Ölçüm ve canlı operasyon

- [ ] Gizlilik dostu analitik olay sözleşmesi oluştur
- [ ] Öğretici başlama/tamamlama ve ilk hamle süresini ölç
- [ ] Maç başlama/tamamlama/terk, mod, süre ve sonuç olaylarını ölç
- [ ] Rövanş, günlük geri dönüş ve eşleşme terk oranlarını ölç
- [ ] Crash, ANR, JS/native hata ve sunucu hata izleme ekle
- [ ] Remote config ile mod havuzu ve etkinlik takvimi yönet
- [ ] En az 30 dış testçiyle iki haftalık kapalı test yap
- [ ] Veriye göre öğretici, bot ve maç sürelerini düzelt

## Aşama 5 — Google Play yayını

- [ ] Kalıcı package ID, sürümleme ve imzalama kimliklerini doğrula
- [ ] Android App Bundle üret ve kapalı test kanalına yükle
- [ ] Telefon ve tablet mağaza ekran görüntüleri ile tanıtım görseli hazırla
- [ ] Kısa/uzun açıklama, kategori, etiket ve içerik derecelendirmesini tamamla
- [ ] Gizlilik politikası, kullanım koşulları, destek ve veri silme sayfalarını yayınla
- [ ] Data Safety beyanını kullanılan SDK ve backend verileriyle eşleştir
- [ ] Düşük/orta segment Android cihaz performans ve pil profilini çıkar
- [ ] Play pre-launch report, Android vitals ve kapalı test geri bildirimlerini temizle
- [ ] Önce sınırlı ülke/yüzde ile kademeli production rollout yap

## Gelir ilkeleri

- Rekabet gücü satılmaz; ücretli içerik kozmetik veya içerik paketi olur.
- Oynanışın başında ya da maç sırasında beklenmedik tam ekran reklam gösterilmez.
- Ödüllü reklam varsa yalnızca oyuncunun açıkça seçtiği, rekabet avantajı
  vermeyen bir ödül sunar.
- Satın alma makbuzu ve envanter teslimi güvenilir backend üzerinde doğrulanır.

## Yayın kapıları

Production adayı ancak aşağıdaki koşullar birlikte sağlandığında çıkar:

1. Yeni oyuncular yardım almadan öğreticiyi ve ilk maçı tamamlayabilir.
2. Solo ve iki oyunculu maçlar düşük/orta segment gerçek Android cihazlarda
   stabil ve duyarlıdır.
3. Kimlik, reconnect ve maç sonucu sunucu otoritesindedir; koltuk işgali ve
   kimlik çakışması testleri geçer.
4. Kritik crash, ANR, veri kaybı veya sonuç ayrışması yoktur.
5. Analytics, hata izleme, destek, gizlilik ve veri silme süreçleri çalışır.
6. Kapalı test verileri kabul edilebilir ilk maç tamamlama ve rövanş davranışı
   gösterir; ciddi kullanıcı geri bildirimi açık kalmaz.
