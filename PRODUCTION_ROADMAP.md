# Duelcade — Üretim Yol Haritası

Bu dosya, prototipten gelir üretebilecek mağaza sürümüne geçişte teknik sırayı
korumak için kullanılır. Yeni özellikler aşağıdaki kapılar tamamlanmadan
production sürümüne alınmamalıdır.

## Tamamlanan temel

- Expo SDK 57 uyumlu Android, iOS ve web istemcisi
- Ayrı Colyseus oyun sunucusu ve 6 karakterli özel odalar
- Sunucu otoriteli rol, puzzle, timer, hareket ve etkileşim doğrulaması
- 60 saniyelik bağlantı kurtarma ve timer dondurma
- Rol bazlı özel puzzle payload'ları; çözüm istemciye gönderilmiyor
- Explorer haritası, yakınlık etkileşimleri ve dört slot envanter
- Operator kamera, güç ve kapı kontrolleri
- 5 puzzle modülü; zorluğa göre 3/4/5 puzzle
- Deep link daveti ve çalışan pano kopyalama
- Unit/multiplayer entegrasyon testleri, Docker ve EAS profilleri

## P0 — Kapalı alfa öncesi

- Sunucuyu HTTPS/WSS destekli staging ortamına dağıt
- İki farklı fiziksel cihazla Android/iOS çapraz test matrisi oluştur
- Oda kapatma, host ayrılması, uçak modu ve 60 saniye reconnect testlerini yap
- PostgreSQL ile kullanıcı, maç sonucu ve kişisel rekor kalıcılığı ekle
- Misafir kimliğini güvenli cihaz kimliğiyle kalıcılaştır; hesap yükseltme akışı ekle
- Sentry benzeri crash/error izleme ve anonim performans telemetrisi ekle
- Gerçek ses efektleri, ambiyans ve müzik varlıklarını lisans kayıtlarıyla ekle

## P1 — Oynanış ve içerik

- Toplam 10 puzzle modülüne ulaş: zamanlama, kamera, basınç plakası, ses ve anahtar-kilit
- Geçiş görevini ve oyuncu seçimine dayalı ayrı final puzzle'ını ekle
- En az iki tam bölüm; her bölüm için farklı oda düzeni ve görsel tema
- Operator eylemlerini puzzle sonucuna mekanik olarak bağla
- Envanter inceleme ekranı, eşya kullanma hedefi ve erişilebilir açıklamalar
- Eğitim bölümü ve ilk maç yönlendirmesi
- Türkçe/İngilizce yerelleştirme altyapısı

## P1 — Kalite kapıları

- Kritik oyun motoru için yüksek unit test kapsamı
- Gerçek cihaz E2E testleri ve zayıf ağ simülasyonu
- Düşük/orta segment Android cihaz performans profili
- VoiceOver/TalkBack, büyük metin, renk körlüğü ve sol el kullanılabilirlik testi
- En az 20–30 dış testçiyle kapalı beta; puzzle tamamlama ve terk oranlarını ölç

## P2 — Mağaza ve gelir

- `app.json` içindeki geçici Rork bundle/package kimliklerini kalıcı kimliklerle değiştir
- Apple/Google geliştirici hesapları, imzalama ve EAS credentials kurulumu
- Gizlilik politikası, kullanım koşulları, destek ve hesap/veri silme sayfaları
- Mağaza ekran görüntüleri, açıklamalar, yaş derecelendirmesi ve veri beyanları
- Önce tek seferlik premium veya kozmetik modelini A/B test et
- Reklam kullanılacaksa co-op akışını kesmeyen yalnızca isteğe bağlı ödüllü formatı değerlendir
- Satın alma doğrulamasını istemcide değil güvenilir backend üzerinde yap

## Yayın kararı

Production adayı ancak şu koşullarda çıkar:

1. İki gerçek cihaz 30 dakikalık oturumu veri ayrışması olmadan tamamlar.
2. Reconnect, host ayrılması ve sürüm uyuşmazlığı anlaşılır hata verir.
3. Kritik crash ve veri kaybı hatası yoktur.
4. Store kimlikleri, yasal sayfalar ve destek kanalı hazırdır.
5. Sunucu izleme, yedekleme ve geri alma planı doğrulanmıştır.
