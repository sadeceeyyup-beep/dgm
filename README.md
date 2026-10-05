# Elif · Doğum günü deneyimi

390 × 844 iPhone 12 için hazırlanmış, React + Vite + React Three Fiber +
Three.js + GSAP doğum günü deneyimi. Backend gerektirmez.

## Çalıştırma

Node.js 22.12 veya üzeri gerekir.

```sh
npm install
npm run dev
```

Yerel adres: http://localhost:5173. Telefonda motion izni için HTTPS gerekir;
yerel ağdaki düz HTTP bağlantısında touch fallback kullanılır.

```sh
npm test
npm run build
npm run preview
```

## Yapı

- `src/experience/model.js`: merkezi durum makinesi ve gezinme.
- `src/experience/store.js`: React aboneliği; kare başına girdiler React
  dışında.
- `src/interaction/`: izin, kalibrasyon, normalize girdi, swipe/drag ayrımı.
- `src/story/storyData.js`: kullanıcının 19 mesajı ve 6 sahne konfigürasyonu.
- `src/scenes/`, `src/shaders/`: yıldız katmanları, portal, gezegenler, kamera,
  korona.
- `src/audio/`: gesture ile açılan Web Audio ve kalıcı YouTube IFrame player.
- `src/components/`: metin geçişleri, progress rail, interaction ipuçları.

Yolculuk: sessiz uzay → Başla / izin → portal çöküşü → tutorial → 4 swipe →
Neptün → Satürn → Jüpiter → Dünya → Güneş → final. Geri gitmek için aşağı doğru
sürükle; ileri için yukarı doğru sürükle. Masaüstünde wheel ve ok tuşları da
desteklenir.

## Müzik

YouTube videosu `YP7ghF9pwys`, ilk oynatma 93 saniye. Finalde yalnızca bir kez
yüklenen player, story navigasyonunda korunur. Replay 0 saniye; mute yalnızca
player sesini değiştirir. Autoplay engellenirse “Müziği başlat ✨” gösterilir.
Ağ/embed hatasında 1:33 başlangıçlı YouTube bağlantısı sunulur. Video
indirilmez; görünür embed en az 200 × 200 pikseldir.

## Testler

`npm test` sensör izinleri, kalibrasyon, ilerleme sınırları, tam hikâye sırası,
geri gezinme, music state korunması ve metin bütünlüğünü test eder.

Kurulu Playwright MCP ile `tests/iphone12.flow.js` dosyası
`browser_run_code_unsafe` aracının `filename` argümanıyla çalıştırılabilir.
Gerçek CDP touch hareketleri, çapraz drag, dört intro swipe, 19 segment, güvenli
metin sınırları, progress, geri dönüş ve landscape/reduced motion kontrol
edilir. YouTube API test double kullanılır: gerçek yayın veya mobil autoplay
doğrulandığı anlamına gelmez. `tests/motion.flow.js` denied / granted / error
ile mock orientation olaylarını kontrol eder. Gerçek sensörler ve iOS ses
politikası fiziksel iPhone’da son kontrol gerektirir.

## Performans yaklaşımı

1.0–1.4 DPR; yavaş karelerde DPR 1.0 ve düşük particle sayısı. Başlangıçta
1.265, düşük kalitede 565 yıldız; üç BufferGeometry / Points katmanı. Gezegen
texture/model indirmez; procedural shader kullanır. Postprocessing veya ağır
bloom pass yok. Arka plan sekmesinde Canvas render döngüsü durur. Reduced motion
kamera, yıldızlar ve gezegenlerin hareketini azaltır.

## GitHub Pages

1. Projeyi kendi GitHub repository’ne ekle; `main` dalına push et.
2. Repository **Settings → Pages → Source → GitHub Actions** seç.
3. `.github/workflows/deploy.yml` bağımlılıkları kurar, testleri ve Vite build’i
   çalıştırır, `dist/` klasörünü yayınlar.

Repository adı `dgm`, Vite base path değeri `/dgm/` olarak ayarlanmıştır.
Yayın adresi: https://sadeceeyyup-beep.github.io/dgm/iyiki-dogdun-kiymetli-insan/

Derleme, `dist/iyiki-dogdun-kiymetli-insan/index.html` dosyasını da üretir.
GitHub Pages bu alt yolu doğrudan açar; SPA yönlendirmesi gerekmez.
JavaScript, CSS ve favicon `/dgm/` taban yolundan yüklenir.

İlk başarılı kurulumdan sonra
oluşan `package-lock.json` dosyasını commit et; CI kurulumunu `npm ci` olarak
değiştirebilirsin. Bu oturumda deploy yapılmadı.

## Başvurulan teknik kaynaklar

- [Fiber v9 / React 19](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)
- [Drei 10.7.6 peer dependencies](https://github.com/pmndrs/drei/blob/v10.7.6/package.json)
- [Vite static deployment](https://vite.dev/guide/static-deploy.html)
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)

Çalıştırma ve doğrulama durumu `VERIFICATION.md` dosyasında tutulur.

## Görsel / etkileşim refactor’ı

Masaüstü yedeği:
`/home/birdost/Desktop/Doğum Günü - Backup 2026-10-04 15-31-46`. Hikâye verisi
yedekle birebir korunur. Gezegen geçişi `PlanetPassage` üzerinden çıkış/giriş
nesnelerini kısa süre birlikte tutar. `sceneMotion` gerçek segment sayısını
kullanır; ileri ilerleyişte Y yükselir, geri gezinmede yol tersine döner. Eksen
dönüşünün taban hızı her zaman pozitiftir. `scrollImpulse` yalnızca yolculuk
hareketidir; dokunma yanıtları nesnelerin yerel durumundadır.
`useObjectInteraction` en yakın raycast hit’inde yayılımı durdurur ve swipe
hareketlerini tap saymaz.

Yerel tarayıcı test çalıştırıcısı:

```sh
node tests/run-browser.mjs
```

Bu komut kurulu Playwright MCP paketini ve Brave’in gerçek binary dosyasını
kullanır; MCP yapılandırmasını değiştirmez, paket indirmez. Gerekirse dev server
açar. `artifacts/browser-report.json` ile iPhone 12 ekran görüntüleri üretir.
YouTube testi mock API kullanır; gerçek telefondaki oynatma ayrıca
doğrulanmalıdır. Tarayıcı raporu oluşmadan görsel doğrulama tamamlanmış
sayılmaz.
