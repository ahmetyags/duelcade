# Duelcade

Duelcade, tek başına veya bir arkadaşla oynanabilen 2–5 dakikalık hızlı zekâ
oyunları koleksiyonudur. Expo, React Native ve TypeScript ile iOS, Android ve
web için geliştirilir.

Başlangıç sürümündeki dört oyun modu Rün Düellosu, Hafıza Eşleri, Devre Alanı
ve Neon İz'dir. Çevrimiçi maçlar sunucu otoritelidir; sonuçlar ve ilerleme
backend üzerinden yönetilir. Oyuncular maç geçmişini, seviye ve mod ustalığını
görebilir; kozmetik ödüller rekabet avantajı sağlamaz.

## Teknoloji

- Expo SDK 57, Expo Router ve React Native 0.86
- React 19 ve TypeScript 6
- Zustand ile istemci durumu
- Colyseus ile çevrimiçi maçlar
- Firebase Authentication ve Expo SecureStore ile kimlik doğrulama

Expo SDK 57'nin sürümlenmiş başvuru belgesi:
[docs.expo.dev/versions/v57.0.0](https://docs.expo.dev/versions/v57.0.0/)

## Gereksinimler

- Node.js 22.13.1 (`.nvmrc` ile)
- npm 10 veya üzeri
- iOS/Android cihazı veya simülatörü, ya da web tarayıcısı
- Çevrimiçi özellikleri yerelde kullanmak için `duelcade-backend`

`nvm` kullanıyorsanız proje kökünde `nvm use` komutuyla Node sürümünü seçin.

## Hızlı başlangıç

Proje bağımlılıklarını yükleyin ve ortam dosyasını oluşturun:

```bash
npm ci
cp .env.example .env
```

`.env` içindeki `EXPO_PUBLIC_GAME_SERVER_URL` değerini backend adresinize
ayarlayın. Bilgisayardaki simulator ve web için varsayılan adres
`http://localhost:2567`'dir. Backend'i ayrı terminalde başlatın:

```bash
cd ../duelcade-backend
npm install
npm run dev
```

Ardından bu projeye dönüp Expo'yu başlatın:

```bash
cd ../duelcade
npm start
```

Expo menüsünden Android için `a`, iOS Simulator için `i`, web için `w`
tuşlarına basabilirsiniz. Platformu doğrudan başlatmak için
`npm run android`, `npm run ios` veya `npm run web` komutlarını kullanın.

Fiziksel cihazda `localhost` telefonun kendisini gösterir. `.env` içinde
bilgisayarınızın yerel ağ IP adresini kullanın:

```dotenv
EXPO_PUBLIC_GAME_SERVER_URL=http://192.168.1.50:2567
```

## Geliştirme komutları

| Komut | Açıklama |
| --- | --- |
| `npm start` | Expo geliştirme sunucusu |
| `npm run android` / `npm run ios` / `npm run web` | Belirtilen platformda başlatır |
| `npm run typecheck` | İstemci TypeScript denetimi |
| `npm run server:typecheck` | Depodaki sunucu kodunun TypeScript denetimi |
| `npm run lint` | Expo ESLint denetimi |
| `npm test` | Testleri çalıştırır |
| `npm run verify` | İstemci ve sunucu tip denetimi, lint ve testleri çalıştırır |
| `npm run doctor` | Expo proje yapılandırmasını denetler |
| `npx expo export --platform all` | iOS, Android ve web çıktısını üretir |

Linux'ta Metro `ENOSPC: System limit for number of file watchers reached`
hatası verirse dosya izleyici sınırını artırın:

```bash
sudo sysctl -w fs.inotify.max_user_watches=524288
sudo sysctl -w fs.inotify.max_user_instances=1024
```

## Proje yapısı

```text
src/app/          Expo Router ekranları ve gezinme
src/components/   Arayüz ve oyun bileşenleri
engine/           Bulmaca üretimi ve oyun kuralları
services/         Kimlik, ağ, ses ve haptics servisleri
store/            Zustand durum yönetimi
types/            Paylaşılan oyun ve ağ tipleri
server/           Geriye dönük uyumluluk için tutulan sunucu kodu
assets/           Görsel, ses, font ve oyun varlıkları
```

## Backend ve çevre değişkenleri

Uygulama çevrimiçi maçlar için `services/ColyseusTransport.ts` üzerinden
bağımsız [`duelcade-backend`](../duelcade-backend/README.md) projesine bağlanır.
Oda, süre, roller, bulmaca çözümleri ve hamle doğrulaması sunucu tarafından
yönetilir. Bu depodaki `server/` dizini istemci geçişi tamamlanana kadar test
uyumluluğu için korunmaktadır.

Backend geliştirme sunucusu:

```bash
cd ../duelcade-backend
npm run dev
```

Docker ile başlatmak için:

```bash
cd ../duelcade-backend
docker compose up --build
```

Backend sağlık kontrolü `GET /health` adresindedir. Yerel backend için
PostgreSQL bağlantısı ve en az 32 baytlık bir token sırrı gerekir:

```dotenv
DATABASE_URL=postgresql://duelcade:duelcade@localhost:5432/duelcade
AUTH_TOKEN_SECRET=replace-with-at-least-32-random-bytes
ALLOW_LEGACY_PLAYER_IDS=true
```

`.env.example` uygulamanın çevre değişkenlerini ve örnek değerleri içerir.
Üretim sunucusu HTTPS kullanmalıdır; istemci bağlantıyı güvenli WebSocket'e
yükseltir.

## Kimlik doğrulama ve gizlilik

E-posta/şifre ve Google, Facebook, GitHub girişleri Firebase Authentication
üzerinden yapılandırılır. Firebase Console'daki web uygulamasının herkese açık
değerlerini `.env` içindeki `EXPO_PUBLIC_FIREBASE_*` alanlarına ekleyin. GitHub
web girişi Firebase popup akışını, yerel uygulamalar ise OAuth sırrını istemciye
koymamak için backend akışını kullanır.

GitHub'ın tek OAuth App için tek callback host kısıtı nedeniyle iki ayrı
GitHub OAuth App gerekir:

- Web/Firebase: `https://FIREBASE_PROJECT_ID.firebaseapp.com/__/auth/handler`
- Android/iOS/backend: `https://duelcade-game-server.onrender.com/v1/auth/oauth/github/callback`

İkinci uygulamanın `GITHUB_CLIENT_ID` ve `GITHUB_CLIENT_SECRET` değerlerini
yalnızca backend ortamında tutun. Firebase ID token backend'e gönderilir;
oyuncu UUID'si, oyun oturumu, ilerleme ve liderlik tablosu backend tarafından
yönetilir. Firebase değişkenleri ayarlanana kadar eski Duelcade giriş akışı
çalışmaya devam eder.

Anonim oyuncu kimliği backend'de oluşturulur. Android ve iOS'ta yenileme tokenı
Expo SecureStore'da, kısa ömürlü erişim tokenı bellekte saklanır. Analitik,
Ayarlar ekranından açık rıza verilince etkinleşir ve yalnızca Duelcade
backend'ine gönderilir. Çökme raporlaması varsayılan olarak kapalıdır; DSN
tanımlanması ve oyuncunun Ayarlar'dan izin vermesi gerekir. Kapalı test geri
bildirimleri kategori, puan, açıklama ve teknik bağlamı içerir; katılımcılardan
kişisel bilgi paylaşmamaları istenir.

## Web ve mağaza dağıtımı

Web üretim çıktısı ve dağıtımı:

```bash
npm run export:web:production
npx eas-cli deploy --prod --export-dir dist
```

`eas.json` development, preview ve production profillerini tanımlar. Android
paket adı ve iOS bundle identifier `com.duelcade.game`'dir.

```bash
npx eas-cli build --profile production --platform android
npx eas-cli build --profile production --platform ios
```

Sentry entegrasyonu için `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`,
`SENTRY_PROJECT` ve `SENTRY_AUTH_TOKEN` kullanılır. `SENTRY_AUTH_TOKEN` yalnızca
EAS Build ortamında gizli değişken olarak tutulmalı, uygulamaya veya git'e
eklenmemelidir.

## Ek belgeler

- [Üretim yol haritası](./PRODUCTION_ROADMAP.md)
- [Kapalı test planı](./CLOSED_TESTING.md)
- [Mağaza ön kontrol listesi](./docs/play-store-prelaunch-checklist.md)
- [Üçüncü taraf varlık lisansları](./THIRD_PARTY_ASSETS.md)
