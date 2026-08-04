# Kapalı Test Yürütme Planı

Bu doküman, Android preview/production hazırlığı sonrası 30–100 kişilik kapalı test için uygulama sırasını ve verim takibini tarif eder.

## 1. Hedef ve kapsam

- Hedef kitle: 30–100 Android testçi
- Minimum gözlem süresi: 14 gün
- Minimum cihaz çeşitliliği: düşük/orta segment Android cihaz en az 3 model, farklı Android sürümü
- Ana akışlar: öğretici, ilk oturum, solo, arkadaşla oyun, rövanş, ilerleme ekranı
- Ölçülecek metrikler: tutorial_started → tutorial_completed oranı, first_move oranı, match_completed / match_abandoned, ortalama match duration, zorluk bazlı kazanma, solo / online dağılımı, rematch oranı, D1/D7 return, crash-free session oranı

## 2. Testçi ataması

Katılımcılar aşağıdaki çerçevede dağıtılır:

- 20% yeni oyuncu: oyunu ilk kez deniyor
- 40% orta seviye: en az 2–3 kez oynamış
- 20% deneyimli: düzenli rekabet/turn tabanlı oyun deneyimi
- 20% mobil test uzmanı: cihaz ve performans bakışı

## 3. Gündelik test akışı

Her testçi için günlük minimum senaryo:

1. Uygulamayı kur ve aç.
2. İlk düelloyu yalnızca talimat olmadan tamamla.
3. En az bir solo maç oyna.
4. Bir arkadaşla veya eşleştirme akışıyla oyun başlat.
5. Rövanş isteğinde bulun ve yeni maçın temiz başladığını doğrula.
6. Sonuç ekranından geri bildirim gönder.
7. İsteğe bağlı analytics ve crash reporting tercihini kontrol et.

## 4. Ölçüm iskeleti

### Gözlenmesi gereken olaylar

- `app_session_started`
- `tutorial_started`
- `tutorial_completed`
- `match_started`
- `first_move`
- `match_completed`
- `match_abandoned`
- `rematch_requested`

### Analitik örnek bakış

- `tutorial_started` içinde `tutorial_completed` dönüşümü oranı
- `match_started` içinde `first_move` dönüşümü oranı
- `match_completed` vs `match_abandoned` oranı
- `durationBucket` dağılımı (`under_2m`, `2_to_5m`, `over_5m`)
- `playMode` bazlı solo / online oranı
- `isReturningSession` ile D1/D7 geri dönüş eğilimi

## 5. Günlük rapor kısa şablonu

- Tarih:
- Testçi sayısı:
- Yeni kullanıcı sayısı:
- Tutunamayan noktalar:
- Kritik crash / ANR:
- En sık tekrar eden geri bildirim:
- Düzeltilecek ekran / akış:

## 6. Çıkış kapıları

Kapalı testin başarılı sayılabilmesi için aşağıdaki eşikler hedef alınır:

- crash-free session ≥ %99,5
- ilk maç tamamlama ≥ %65
- normal bağlantıda maç terk ≤ %15
- en az bir rövanş başlatma ≥ %25
- hiçbir çekirdek modda pas geçme oranı %30’u aşmaz
- kritik P0/P1 hata açık kalmaz

## 7. Sonraki devre planı

- İlk 3 gün: kanarya kullanıcılar ve kritik akışlar
- 4–7 gün: cihaz çeşitliliği ve mod denge kontrolü
- 8–14 gün: retention, rematch ve performans veri toplanması
