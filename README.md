# Duelcade

Tek başına veya bir arkadaşla oynanan 2–5 dakikalık hızlı zekâ düellolarıdır.
Uygulama Expo Router, React Native, TypeScript ve Zustand ile iOS, Android ve
web için hazırlanmıştır.

Başlangıç sürümünün dört çekirdek modu Rün Düellosu, Hafıza Eşleri, Devre
Alanı ve Neon İz'dir. Diğer tamamlanmış modlar ileride sezonluk içerik ve
canlı etkinlik havuzu olarak korunur.

Anonim oyuncu kimliği backend tarafından üretilir. Android ve iOS'ta yenileme
tokenı Expo SecureStore içinde, kısa ömürlü erişim tokenı yalnızca bellekte
tutulur. Çevrimiçi maç sonuçları PostgreSQL'e yazılır ve ana ekrandaki Maç
Geçmişi bölümünden görüntülenir.

Çevrimiçi maçlar sunucu tarafından tek seferlik XP ile ödüllendirilir. Seviye,
dört çekirdek mod ustalığı, isteğe bağlı günlük görevler ve rekabet avantajı
vermeyen avatar/çerçeve/masa teması koleksiyonu Seviye ve Ödüller ekranında
sunulur.

Gizlilik öncelikli ürün analitiği Ayarlar ekranından açık rıza ile etkinleşir.
İzinli olaylar yalnızca kendi backend'imize gönderilir; oda kodu, oyuncu adı,
mesaj, reklam/cihaz kimliği ve ham IP analitik tablosunda tutulmaz. Çökme
raporlaması da varsayılan olarak kapalıdır ve yalnızca
`EXPO_PUBLIC_SENTRY_DSN` tanımlıysa çalışır.

Kapalı test katılımcıları Ayarlar veya maç sonucu ekranından yapılandırılmış
geri bildirim gönderebilir. Bu kayıt kategori, 1–5 deneyim puanı, en fazla
1000 karakterlik açıklama, ekran, platform ve uygulama sürümünü içerir.
Oda kodu, reklam/cihaz kimliği ve ham IP kaydedilmez; oyunculardan ad,
e-posta veya başka kişisel bilgi yazmamaları açıkça istenir.

## Gereksinimler

- Node.js 22.13.1 veya daha yeni bir 22.x sürümü
- npm 10 veya daha yeni
- Mobil test için Expo Go ya da bir Expo development build

Projede `.nvmrc` bulunduğu için nvm kullananlar doğru sürüme şu komutla geçebilir:

```bash
nvm use
```

## Kurulum

```bash
npm install
cp .env.example .env
cd ../duelcade-backend
npm install
npm run dev
```

Başka bir terminalde mobil proje dizininden:

```bash
npm start
```

Expo terminali açıldıktan sonra:

- Android için `a`
- iOS Simulator için `i`
- Web için `w`

Linux'ta Metro `ENOSPC: System limit for number of file watchers reached`
hatası verirse işletim sistemi izleyici limitini yükseltin:

```bash
sudo sysctl -w fs.inotify.max_user_watches=524288
sudo sysctl -w fs.inotify.max_user_instances=1024
```

Bu ayarın kalıcı olması için dağıtımınızın `/etc/sysctl.d/` yapılandırmasına
aynı değerleri ekleyin.

Alternatif olarak platform komutları doğrudan çalıştırılabilir:

```bash
npm run android
npm run ios
npm run web
```

## Doğrulama

```bash
npm run typecheck
npm run lint
npm run doctor
npm test
npm run verify
```

Üç platformun üretim bundle'ını kontrol etmek için:

```bash
npx expo export --platform all
```

## Proje yapısı

```text
src/app/          Expo Router ekranları
src/components/   Arayüz, oyun ve efekt bileşenleri
engine/           Bulmaca üretimi ve oyun kuralları
services/         Ses, haptics ve ağ katmanı
store/            Zustand uygulama durumları
theme/            Renk, tipografi ve ölçü token'ları
types/            Oyun ve ağ tipleri
assets/           Uygulama ikonları ve görseller
```

## Ağ modeli

Uygulama `services/ColyseusTransport.ts` üzerinden gerçek Colyseus sunucusuna
bağlanır. Oda, süre, roller, puzzle çözümleri, hareket ve etkileşim doğrulaması
ayrı [`duelcade-backend`](../duelcade-backend/README.md) projesinde sunucu
otoritesindedir. Bu depodaki `server/` kopyası, istemci geçişi tamamlanana kadar
test uyumluluğu için geçici olarak korunmaktadır.

Yerel simulator veya web için `.env`:

```dotenv
EXPO_PUBLIC_GAME_SERVER_URL=http://localhost:2567
```

Fiziksel telefonlarda `localhost` telefonun kendisini ifade eder. Geliştirme
bilgisayarının yerel ağ IP adresini kullanın:

```dotenv
EXPO_PUBLIC_GAME_SERVER_URL=http://192.168.1.50:2567
```

Üretimde HTTPS/WSS destekli bir sunucu adresi zorunludur.

### Firebase Authentication

Uygulama e-posta/şifre ile Google, Facebook ve GitHub kimliklerini Firebase JS
SDK üzerinden doğrular. Firebase Console'daki web uygulamasının herkese açık
ayarlarını `.env.example` içinde belgelenen `EXPO_PUBLIC_FIREBASE_*`
değişkenlerine ekleyin. GitHub web girişi Firebase popup akışını kullanır;
Android/iOS GitHub girişi ise OAuth client secret uygulamaya gömülmesin diye
backend üzerinden tamamlanır.

GitHub'ın tek OAuth App için tek callback host kısıtı nedeniyle iki ayrı GitHub
OAuth App kullanılır:

- Web/Firebase: `https://FIREBASE_PROJECT_ID.firebaseapp.com/__/auth/handler`
- Android/iOS/backend: `https://duelcade-game-server.onrender.com/v1/auth/oauth/github/callback`

İkinci uygulamanın `GITHUB_CLIENT_ID` ve `GITHUB_CLIENT_SECRET` değerleri yalnızca
Render ortamında tutulur. `FIREBASE_PROJECT_ID` ile birlikte backend yeniden
deploy edildiğinde `/v1/auth/providers` yanıtında hem `firebase` hem de
`oauth.github` alanları `true` olmalıdır.

Firebase ID token backend ile değiştirilir; oyuncu UUID'si, oyun oturumu,
ilerleme ve leaderboard üzerindeki otorite mevcut Duelcade backend'inde kalır.
Firebase değişkenleri henüz yoksa geçiş süresince eski Duelcade giriş akışı
çalışmaya devam eder.

Production web dağıtımında `.env.production` içindeki sunucu adresinin eski
Metro önbelleğinden etkilenmemesi için export komutu önbelleği temizler:

```bash
npm run export:web:production
npx eas-cli deploy --prod --export-dir dist
```

Sentry projesi hazırlandıktan sonra runtime DSN'i ve source map yükleme
değişkenlerini EAS ortamına ekleyin:

```dotenv
EXPO_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=organization-slug
SENTRY_PROJECT=project-slug
SENTRY_AUTH_TOKEN=secret-build-token
```

`SENTRY_AUTH_TOKEN` uygulama içine veya git'e yazılmaz; yalnızca EAS Build
içindeki gizli ortam değişkeni olarak tutulur.

Ayrıntılı ürünleştirme sırası için
[`PRODUCTION_ROADMAP.md`](./PRODUCTION_ROADMAP.md) dosyasını izleyin.
Kapalı test daveti, senaryoları, ölçüm planı ve çıkış kapıları
[`CLOSED_TESTING.md`](./CLOSED_TESTING.md) dosyasındadır.

## Backend geliştirme ve dağıtım

Bağımsız backend, bu projeyle aynı üst dizindedir:

```bash
cd ../duelcade-backend
npm run dev
```

Docker ile:

```bash
cd ../duelcade-backend
docker compose up --build
```

Sağlık kontrolü `GET /health` adresindedir. Colyseus odaları 6 karakterli
davet kodu kullanır ve geçici bağlantı kesilmelerinde 60 saniye yeniden
bağlanma hakkı verir. Ayrıştırmanın kalan adımları backend projesindeki
[`MIGRATION.md`](../duelcade-backend/MIGRATION.md) dosyasında tutulur.

Backend geliştirmede PostgreSQL bağlantısı, en az 32 baytlık token sırrı ve
geçiş bayrağı gerekir:

```dotenv
DATABASE_URL=postgresql://duelcade:duelcade@localhost:5432/duelcade
AUTH_TOKEN_SECRET=replace-with-at-least-32-random-bytes
ALLOW_LEGACY_PLAYER_IDS=true
```

## Mağaza derlemeleri

`eas.json` development, preview ve production profillerini içerir. Android
package ve iOS bundle identifier değeri `com.duelcade.game` olarak
tanımlanmıştır. İlk mağaza derlemesinden önce bu kimliğin geliştirici
hesaplarında kullanılabilir olduğunu doğrulayın.

```bash
npx eas-cli build --profile production --platform android
npx eas-cli build --profile production --platform ios
```

## Kullanılan temel sürümler

- Expo SDK 57
- React Native 0.86
- React 19.2
- TypeScript 6

Expo SDK 57 sürüm referansı:
https://docs.expo.dev/versions/v57.0.0/
