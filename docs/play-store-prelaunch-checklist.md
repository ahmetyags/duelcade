# Google Play Öncesi Son Hazırlık Kontrol Listesi

Bu kontrol listesi, kapalı test sonrası Play Console hazırlığı için gerekli tüm ekipman ve onay adımlarını özetler.

## 1. Gerekli mağaza bileşenleri

- [ ] Gizlilik politikası yayında ve uygulama içi erişilebilir durumda
- [ ] Veri güvenliği formu dolduruldu ve Play Console’a bağlandı
- [ ] Uygulama açıklaması, kısa açıklama ve ana metin hazır
- [ ] Uygulama için ekran görüntüleri (telefon portre/landscape dahil)
- [ ] Uygulama ikonu ve adaptive icon assetleri hazır
- [ ] İçerik derecelendirmesi tamamlandı
- [ ] Uygulama erişilebilirlik ve güvenlik ilkeleri doğrulandı

## 2. Dağıtım ve sürüm hazırlığı

- [ ] EAS preview build başarıyla üretildi
- [ ] EAS production build için imza/keystore ve Play Console erişimi doğrulandı
- [ ] `com.duelcade.game` package identifier doğrulandı
- [ ] Sentry ve analytics ortam değişkenleri build ortamına bağlandı
- [ ] `usesCleartextTraffic` üretim profilinde güvenli çalışma temsil edildi

## 3. Kapalı test raporu

- [ ] 30–100 katılımcı için dağıtım listesi hazır
- [ ] Uygulama ilk açılış, öğretici, solo, online, rövanş ve ilerleme akışları için her katılımcı sonuçları toplanacak
- [ ] Crash-free session oranı ve retention verisi günlük toplandı
- [ ] Kritik geri bildirimler sınıflandırıldı ve nedenleri kayıt altına alındı

## 4. Play Console onayı öncesi kontrol

- [ ] Google Play Developer hesabı erişimi hazır
- [ ] Uygulama lisans ve soru seti (Content rating) tamamlandı
- [ ] Uygulama içi veri paylaşımı ve gizlilik metni açıklandı
- [ ] Kapalı test sürümünün yalnızca ek onay verildiğinde üretime geçecek şekilde kısıtlanması planlandı
