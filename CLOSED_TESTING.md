# Duelcade Kapalı Test Protokolü

Bu aşamanın amacı mağaza yayınına geçmek değil, gerçek oyuncularla ilk oturumun,
dört çekirdek modun ve rövanş döngüsünün anlaşılır, eğlenceli ve kararlı
olduğunu kanıtlamaktır. Google Play hazırlığı bu protokolün çıkış kapıları
sağlandıktan ve ayrıca onay verildikten sonra başlar.

## Test kapsamı

- 30–100 dış testçi
- En az 14 takvim günü
- Android preview APK ve güncel web sürümü
- Rün Düellosu, Hafıza Eşleri, Devre Alanı ve Neon İz
- İlk düello öğreticisi, solo maç, arkadaşla çevrimiçi maç ve rövanş
- Türkçe ve İngilizce arayüz

Testçiler yalnızca rumuzla misafir oyuncu kimliği oluşturur. Analytics ve crash
reporting ayrı ayrı isteğe bağlıdır ve varsayılan olarak kapalıdır. Yazılı geri
bildirim göndermek bilinçli bir kullanıcı eylemidir; form ad, e-posta, oda kodu
ve başka kişisel bilgilerin yazılmamasını ister.

## Davet metni

> Duelcade’in kapalı testine hoş geldin. Tek başına ve bir arkadaşınla birkaç
> kısa zekâ düellosu oynamanı, özellikle kafa karıştıran, dengesiz veya bozuk
> hissettiren yerleri uygulamadaki “Geri Bildirim Gönder” alanından paylaşmanı
> istiyoruz. Lütfen forma ad, e-posta veya oda kodu yazma. Analytics ve çökme
> raporları Ayarlar’dan ayrı ayrı ve isteğe bağlı açılır.

## Her testçinin uygulayacağı senaryolar

1. Uygulamayı ilk kez açıp yardım almadan ilk düelloyu tamamla.
2. Orta zorlukta en az bir solo maç oyna.
3. Bir arkadaşınla oda oluştur, kodla katıl ve maçı tamamla.
4. Maç sonucunda rövanş iste; ikinci maçın temiz başladığını doğrula.
5. Oyundan çıkıp yeni oda oluştur; eski lobiye dönülmediğini doğrula.
6. Dört çekirdek modun her birini en az bir kez oyna.
7. Maç sonucu ekranından puan ve kısa açıklamayla geri bildirim gönder.
8. İsteğe bağlı olarak analytics/crash reporting tercihlerini değiştir ve
   seçimin uygulama yeniden açıldığında korunduğunu doğrula.

Kritik hata oluşursa cihaz modeli, Android sürümü, yapılan son eylem ve
beklenen davranış yazılır. Oda kodu veya kişisel bilgi yazılmaz.

## Ölçülecek sinyaller

Backend olay sözleşmesinden aşağıdakiler izlenir:

- `tutorial_started` → `tutorial_completed` dönüşümü
- `match_started` → `first_move` dönüşümü
- tamamlanan ve terk edilen maç oranı
- 2 dakikanın altı, 2–5 dakika ve 5 dakikanın üstü maç dağılımı
- mod ve zorluk bazında maç sonucu dağılımı
- maç tamamlama sonrası rövanş isteği
- Sentry üzerinde crash-free oturum eğilimi
- kategori, ekran, sürüm ve puan bazında yazılı geri bildirim

Ham oyuncu adı, oda kodu, serbest metin veya cihaz/reklam kimliği analitik
olaylara eklenmez. Serbest metin yalnızca ayrı geri bildirim tablosunda 180 gün
tutulur.

## Haftalık değerlendirme

Her hafta aynı sürüm için aşağıdaki görünüm alınır:

```sql
SELECT
  category,
  rating,
  screen,
  platform,
  app_version,
  build_version,
  message,
  created_at
FROM feedback_submissions
ORDER BY created_at DESC
LIMIT 200;
```

Oyuncu kimliği yalnızca tek bir kritik hatanın devamını araştırmak gerektiğinde
kullanılır. Geri bildirimler `kritik`, `yüksek`, `orta`, `düşük` olarak
sınıflandırılır; kritik veri kaybı, çökme, takılı kalan maç veya yanlış sonuç
aynı gün ele alınır.

## Çıkış kapıları

Google Play öncesi sonraki aşamaya ancak şu koşullar birlikte sağlanırsa
geçilir:

- En az 30 dış testçi ve 14 günlük gözlem tamamlanmıştır.
- Yeni oyuncuların çoğu dış yardım olmadan öğreticiyi bitirebilmektedir.
- Tamamlanan maçların çoğu hedeflenen 2–5 dakika aralığındadır.
- Eski lobi, çift oyuncu kimliği, sonuç ayrışması veya veri kaybı tekrarlanmaz.
- Açık kritik crash/ANR ve kritik geri bildirim yoktur.
- Dört çekirdek mod için belirgin tek taraflı sonuç veya sürekli düşük puan
  görülmez.
- Rövanş ve ikinci maç akışı takılmadan tamamlanır.

Eşiklerin ilk gerçek veri haftasında gereksiz sert veya gevşek olduğu görülürse
değişiklik tarih ve gerekçeyle bu dosyaya eklenir; sonuçlar geriye dönük olarak
yeniden yorumlanmaz.
