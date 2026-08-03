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

Ayrıntılı ürünleştirme sırası için
[`PRODUCTION_ROADMAP.md`](./PRODUCTION_ROADMAP.md) dosyasını izleyin.

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
