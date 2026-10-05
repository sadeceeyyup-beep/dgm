# 5 Ekim 2026 — X/Y alan, gezegen column, metin safe-zone, hafif streak, dış CTA

En güncel tur bu bölümdür. Önceki kayıtların davranış açıklamaları tarihçedir.

## Yapılanlar / dosyalar

- `src/experience/store.js`: `persistentTravelY` eklendi. `composition.columns`
  gezegen başına yatay tarafı tutar; story state/reducer değişmedi. Projected
  planet merkezi, yarıçapı ve hedef column aynı küçük kompozisyon deposunda.
- `src/interaction/useInteraction.js`: X/Y base gesture başlangıcında yakalanır,
  iki eksen birlikte birikir. Up/cancel resetlemez. Mevcut dominant vertical
  navigation eşikleri korunur. Horizontal swipe sola → column +1 (sağ),
  sağa → -1 (sol); aynı gezegenin sonraki segmentinde taraf korunur.
- `src/scenes/Starfield.jsx`: ayrı manuel Y uniform'u; story Y ve local parallax
  bağımsızdır. X/Y travel ortak Points buffer'ında iki eksenli toroidal modulo
  ile çevrilir; bu 3×3 komşuluk davranışını dokuz mesh üretmeden sağlar.
- `src/shaders/materials.js`: world Y = story Y - ekran yönündeki manuel Y +
  drift; X/Y wrap sınırları görünür alanın dışındadır. Mevcut varyasyon/recycling
  sürer. Streak yönü artık warp strength ile döndürülmez. Aynı point sprite maskesi
  nokta → kısa ince iz → nokta olur. Açılışın burst shader yolu korunur.
- `src/scenes/sceneMotion.js`, `src/scenes/Cosmos.jsx`: stage-only warp süresi
  1.05 saniye, sinüs eğrisinin tepe gücü 0.4. Segmentler büyük warp tetiklemez.
- `src/scenes/Planet.jsx`: column GSAP ile 0.85 saniyede karşı kenara gider;
  küçük depth yayı eklenir, story Y aynı kalır. Mesh ve raycast aynı parent
  group'la hareket eder. Screen projection reuse edilen Vector3 üzerinden
  yayınlanır; sürekli yeni vektör oluşturulmaz.
- `src/components/textLayout.js` (yeni küçük yardımcı): altı geniş aday yerleşim
  arasından projected gezegen diskiyle en az çakışanı seçer. Karşı taraf/karşı
  yükseklik tercih edilir; hysteresis idle hareketinde yerleşim titremesini önler.
- `src/components/StoryText.jsx`: gerçek DOM boyutu, safe-area, CTA ve ses
  kontrollerini hesaba katar. Yeni mesaj reveal'ı .55 saniye; safe-zone değişimi
  fade/move/reveal ile .6 saniye. Uzun metin dar sütuna zorlanmaz; gerektiğinde
  portrait en az 23px, landscape en az 18px ile mevcut alan içine fit denenir.
- `src/app/styles.css`: geniş safe-zone container boyutları; mevcut premium
  müzik CTA stili linke uygulanır. Giriş stilleri değiştirilmedi.
- `src/audio/MusicPlayer.jsx`: final CTA daima erişilebilir gerçek `<a>`.
  Tam URL: `https://www.youtube.com/watch?v=YP7ghF9pwys&list=RDYP7ghF9pwys&index=1`
  `target="_blank" rel="noopener noreferrer"`; timeout/internal play çağrısı yok.
  Visible label sadece “Müziğin tadını çıkar”. Global autoplay 93s ve mute/replay
  korunur; link loading/error/playing durumundan bağımsızdır. Geri gezinmede
  iframe korunur, final CTA sadece finalde görünür.
- `tests/experience.test.js`, `tests/scene-motion.test.js`: çift eksenli gesture,
  karşı column/sabit Y, safe-zone sınırları/overlap ve 0.4 warp testleri.
- `tests/iphone12.flow.js`: çift eksenli touch reset, diagonal travel, column
  transfer/koruma, yeni konumda raycast, opposite text/overlap, warp screenshot,
  yeni sekmede tam CTA URL'si testleri. Popup hedefi testte route stub kullanır;
  gerçek stream kanıtı değildir.
- `VERIFICATION.md`: bu kayıt. `dist/` yeniden üretildi.

## Kontrol sonucu

- `npm test`: **15/15 başarılı**.
- `npm run build`: **başarılı**. JS 1151.78 kB / gzip 328.41 kB,
  CSS 18.62 kB / gzip 5.03 kB. Mevcut chunk uyarısına dokunulmadı.
- 8 GLSL shader çifti doğrudan `glslangValidator -l` ile compile/link geçti.
  Node runner child-process EPERM verdi; ürettiği aynı dosyalar terminalden
  doğrulandı.
- `App.jsx`, `Portal.jsx`, `storyData.js` önceki kopyayla byte düzeyinde aynı.
  19 mesaj, izin/navigation modeli, DPR cap, point sayıları ve dependency'ler
  korundu. Normal kalite 2030 point; düşük kalite sistemi değişmedi.
- Browser testi `listen EPERM 0.0.0.0:5173` ile başlayamadı. Güncellenen browser
  testlerinin sözdizimi kontrol edildi, fakat akışları çalıştırılamadı.
  Gerçek cihazda seamless görünüm, text overlap, hareket kalitesi, URL açılması,
  autoplay ve FPS hâlâ görsel/runtime doğrulama bekler. Önceki 59.8 FPS sonucu
  bu turun performans sonucu olarak sunulamaz.

Dış terminal:

```bash
BROWSER_PATH="/opt/brave-origin-bin/brave" node tests/run-browser.mjs
```

---

# 5 Ekim 2026 — kalıcı yıldız yolculuğu / son davranış düzeltmeleri

Bu bölüm en güncel durumu belirtir. Aşağıdaki önceki tur kayıtları tarihçedir.

## Kaynak ve düzeltme

`useInteraction.js` içindeki eski `input.x = (clientX / innerWidth - .5) * 2`
mutlak pointer koordinatını `Starfield` konum hedefi yapıyordu. Kalıcı yatay
travel yoktu; ikinci gesture'ın ilk pointermove'u alanı yeni parmak konumuna
çekiyordu. Pointerdown doğrudan yıldızı sıfırlamasa da reset hissinin kaynağı buydu.

- `src/experience/store.js`: `input.persistentTravelX`, `lateralImpulse` ve
  `warpStrength`; React/state machine dışında mevcut input deposu genişletildi.
- `src/interaction/motion.js`: yalnızca `gestureTravel` hesaplama yardımcısı
  eklendi. İzin/sensör fonksiyonları değişmedi.
- `src/interaction/useInteraction.js`: pointerdown mevcut travel'ı base olarak
  yakalar; move `base + delta / width` değerini yazar. Up/cancel travel'ı silmez.
  Sensör/hover parallax ayrı kalır; dikey story swipe yatay offset biriktirmez.
- `src/scenes/Starfield.jsx`: yatay/dikey travel, local parallax, drift/time ve
  warp ayrıldı. Stage rengine hafif, yumuşak geçiş eklendi; yıldızlar yeniden
  seed edilmez. Mevcut yıldız sayıları ve Points katmanları korunur.
- `src/scenes/sceneMotion.js`: her stage için 4.8 birimlik bölge, gerçek segment
  sayısına göre ilerleme; stage aralarında 1.2 birim geçiş mesafesi. Geri gezinme
  aynı koordinatlara döner. Warp süresi 0.95 saniye, sıfırdan yükselip sıfıra iner.
- `src/shaders/materials.js`: yalnızca star shader değişti. World-space xyz
  koordinatları projection öncesi taşınır. X/Y modulo wrap sınırları viewport
  dışındadır; yıldız başına farklı periyot ve yalnızca recycle anında parlaklık
  varyasyonu tekrarı azaltır. Stage warp mevcut point sprite'ları perspektif
  doğrultusunda uzatır. UV kaydırma veya yeni mesh sistemi yoktur.
- `src/scenes/Cosmos.jsx`: warp yalnızca stage.planet değişiminde tetiklenir.
  Aynı eğriyle çok küçük dolly/FOV tepkisi ve kontrollü yatay kamera parallax'ı.
- `src/scenes/Planet.jsx`: bounded persistent offset + sönümlü swipe impulse
  ile yönlü lateral tepki. Vertical pose ve idle/momentum hesabı korunur.
- `src/audio/MusicPlayer.jsx`: görünür tek CTA “Müziğin tadını çıkar”. İlk
  autoplay 93'ten; engellenirse aynı player'da gesture ile play. Önceden çalan
  parça resume edilir; ended/replay 0'dan. API ağ hatasında aynı CTA yüklemeyi
  yeniden dener; video hatasında mevcut player'da tekrar deneme yapılır.
  Global player ve mute/replay state'i remount edilmez. Harici servis linki yok.
- `src/app/styles.css`: yalnızca final CTA için düşük parlaklık, yavaş shimmer,
  solar glass ve touch response; reduced-motion desteği.
- `tests/experience.test.js`, `tests/scene-motion.test.js`: kalıcı gesture
  birikimi, değişken segment sayılarıyla yıldız bölgeleri, warp eğrisi testleri.
- `tests/iphone12.flow.js`: tekrar touchstart/up'ta target/rendered offset,
  6 sağ + 6 sol swipe, lateral gezegen tepkisi, segmentte warp olmaması,
  stage'te warp, otomatik müzik girişimi ve görünür teknik metin olmaması.
- `VERIFICATION.md`: bu kayıt; `dist/` yeniden üretildi.

## Korunanlar

`App.jsx`, `Portal.jsx`, `storyData.js` önceki turla byte düzeyinde aynı.
Giriş tasarımı, izin akışı, story metinleri, stage/segment reducer,
PlanetPassage ve GitHub Pages base değiştirilmedi. Yeni dependency yok.

## Sonuç ve sınırlar

- `npm test`: **12/12 başarılı**.
- `npm run build`: **başarılı**; JS 1148.51 kB / gzip 326.95 kB,
  CSS 17.96 kB / gzip 4.90 kB. Mevcut chunk uyarısı korunur.
- 8 GLSL shader çifti doğrudan `glslangValidator -l` ile compile/link geçti.
  Node shader runner child-process EPERM verdi; aynı dosyalar terminalden
  doğrulandı.
- Browser testi `listen EPERM 0.0.0.0:5173` nedeniyle başlayamadı.
  Güncellenen browser testleri çalıştırılmış sayılmaz. Görsel wrap sürekliliği,
  gerçek iPhone/Redmi sensörleri, gerçek stream/autoplay ve yaklaşık 60 FPS
  cihazda doğrulama bekliyor. Eski `artifacts/browser-report.json` korunmuştur;
  bu turu doğrulamaz. Tarayıcı test double'ı gerçek müzik stream'ini kanıtlamaz.

Dış terminalde:

```bash
BROWSER_PATH="/opt/brave-origin-bin/brave" node tests/run-browser.mjs
```

---

# 5 Ekim 2026 — son rötuş turu

Bu bölüm en güncel değişiklikleri kaydeder. `artifacts/browser-report.json`
önceki sürümün PASSED raporudur; bu rötuş turunu doğrulamaz ve değiştirilmedi.

## Uygulanan değişiklikler

- `src/app/App.jsx`: sade karanlık açılış, “Sen Doğmadan Önce”, gecikmeli
  başlık/orb sıralaması; izin aksiyonu geçişten sonra tutorial'a taşındı.
  iOS izin isteği butonun doğrudan kullanıcı jestinde başlar. İzin API'si olmayan
  tarayıcılarda mevcut gerçek sensör örneği kontrolü kullanılır. Güvensiz
  context'te dokunmatik mod korunur. Gereksiz süs yazıları kaldırıldı.
- `src/app/styles.css`: karanlık giriş, sakin tipografi, tutorial izin butonu,
  görünmeyen video host'u ve sade final müzik butonu; mobil/dar ekran düzeni.
- `src/scenes/Portal.jsx`: partikül kümesi kaldırıldı; kademeli orb görünümü,
  merkezde sıkışma ve kontrollü açılma zamanlaması.
- `src/scenes/Cosmos.jsx`: açılışta dekoratif gökcisimlerini çizmez; ortak
  yıldız alanına mevcut deneyim state'ini iletir.
- `src/scenes/CelestialDetails.jsx`: giriş/tutorial sabit kümeleri kaldırıldı.
- `src/scenes/Starfield.jsx`: hikâye ilerlemesiyle ileri/geri hareket, katmanlı
  parallax, stage geçişinde kısa iz; yıldız sayısı ve draw-call sayısı artırılmadı.
- `src/shaders/materials.js`: perspektifli yıldız akışı ve kontrollü streak;
  Neptune ripple, Saturn halkası, Jupiter storm, Earth parlaması, Sun corona polish.
- `src/scenes/Planet.jsx`: yumuşatılmış sınırlı yatay/derinlik tepkisi; mevcut
  dikey passage, segment hesabı ve idle/scroll angularVelocity korunur.
- `src/audio/MusicPlayer.jsx`: video kartı gizlendi, fallback “Müziğin tadını çıkar”;
  global player lifecycle, ilk 93. saniye, replay 0 ve mute mantığı korunur.
- `tests/iphone12.flow.js`: yeni başlık, kümelerin yokluğu, ileri/geri yıldız
  akışı, stage streak ve sade final sunumuna göre browser assertions güncellendi.
- `tests/motion.flow.js`: tutorial sonrası iOS izin jesti ve Android tarzı
  sensör var/yok senaryoları eklendi.
- `VERIFICATION.md`: bu kayıt. `dist/` build çıktıları yeniden üretildi.

## Doğrulama

- `npm test`: 9/9 başarılı.
- `npm run build`: başarılı. JS 1146.19 kB / gzip 326.10 kB;
  CSS 17.14 kB / gzip 4.69 kB. Önceden mevcut >500 kB chunk uyarısı sürüyor.
- 8 shader çifti `glslangValidator -l` ile compile/link başarılı.
  Node runner'ın child-process çağrısı EPERM verdiğinden, aynı üretilmiş shader
  dosyaları doğrudan terminalden validator ile doğrulandı.
- Story dosyası önceki kopyayla byte düzeyinde aynı:
  SHA-256 `bec0bf3af09affb21380308712509ccfff122f7a8fffaf5d6c6a072b27116563`.
- İki güncellenen browser flow dosyasının JavaScript sözdizimi kontrolü başarılı.
- Yeni dependency eklenmedi; model/store, motion/touch altyapısı, storyData,
  PlanetPassage, sceneMotion, Vite base ve deploy ayarları değiştirilmedi.

## Açık kalan doğrulamalar

`node tests/run-browser.mjs` Vite portunu açarken `listen EPERM 0.0.0.0:5173`
ile durdu. Chrome DevTools, X server olmadığı için tarayıcıyı açamadı.
Yeni browser flow'ları çalıştırılamadı; yeni screenshot, görsel kalite onayı,
runtime WebGL kontrolü veya FPS ölçümü yok. Gerçek iPhone 12 / Redmi sensörleri
ve gizlenmiş YouTube iframe üzerinden gerçek playback ayrıca cihazda kontrol
edilmeli. Test double gerçek stream veya autoplay başarısını kanıtlamaz.

Normal terminalde: `node tests/run-browser.mjs`.
Bu komut yeni browser raporu ve screenshot'lar üretir.

---

# Refactor verification — 2026-10-04

## Backup

Before source changes, a complete backup was created under /tmp and verified
using SHA-256 contents, file sizes, symlink targets and directory entries. The
user copied it to
`/home/birdost/Desktop/Doğum Günü - Backup 2026-10-04 15-31-46`, verified it and
explicitly authorized the refactor. No project source changes preceded that
confirmation.

## Completed checks

- Baseline production build passed before refactoring.
- Refactor production build passes using the existing installed dependencies.
- Nine Node tests pass: original six experience tests plus full passage for
  actual segment counts, positive idle rotation with decaying scroll momentum,
  and finite single-segment / lateral-clearance behavior.
- Eight GLSL vertex/fragment pairs compiled and linked with glslangValidator.
  This is static shader validation, not proof of runtime WebGL rendering.
- `storyData.js` is byte-for-byte identical to the verified backup. All 19
  messages, final wording and the single flower emoji remain intact.
- JSX/JS/CSS formatting and parsing pass.

## Build size

Production JavaScript: approximately 1,144 kB minified / 325 kB gzip. CSS:
approximately 16 kB / 4.4 kB gzip. No large textures or models added. Vite still
reports the >500 kB JavaScript chunk warning. DPR capped at 1.4, reduced to 1.0
on sustained slow frames. Stars: 2,030 balanced / 950 low quality, in three
Points draws. No postprocessing passes were added. Measured phone FPS and final
draw-call counts are still pending.

## Browser execution currently blocked

- Dev server in this execution sandbox: `listen EPERM 0.0.0.0:5173`.
- Chrome DevTools MCP: missing X server for its configured headful browser.
- Playwright MCP: configured Brave launcher times out after 180 seconds.
- The local verification runner was attempted and hit the same port restriction.

`tests/run-browser.mjs` is ready to run from the user's normal terminal. It uses
the already installed Playwright package and Brave binary, without modifying MCP
configuration. It writes screenshots and `artifacts/browser-report.json`.

## Pending acceptance checks

Real browser visual review; portal residual geometry; trusted object-specific
taps; full forward/backward touch flow; planet travel/idle/acceleration
measurements; constellation isolation; Sun composition; iPhone 12 text bounds;
landscape; runtime console/WebGL/network; production browser preview; real
mobile YouTube playback.

The browser flow includes deterministic YouTube API tests for blocked autoplay,
93-second first play, 0-second replay, mute/unmute and player persistence. It
does not claim that a real YouTube stream has played. Physical iOS/Android audio
and motion still need a phone check. On local HTTP, motion may be unavailable
because a secure context is required; touch navigation remains the fallback by
design.

This refactor is not marked complete until real browser checks and visual review
pass.
