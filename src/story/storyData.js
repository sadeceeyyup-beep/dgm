export const stages = [
  {
    planet: "gate",
    name: "Yıldız geçidi",
    eyebrow: "YOLCULUĞUN BAŞLANGICI",
    color: "#8c96ff",
    camera: [0, 0, 8],
    interaction: "cluster",
    segments: [],
  },
  {
    planet: "neptune",
    name: "Neptün",
    eyebrow: "01 / BİRLİKTE GEÇEN ZAMAN",
    color: "#6a9bff",
    camera: [.16, .08, 7.6],
    interaction: "ripple",
    segments: [
      "Vay be kos koca 14 yılı aştık sayılır desene eee aslına bakarsan galiba aştıkta göz kararı bakınca.",
      "Epeyce yaşlandık değilmi az da değil buradan 0 ile çarpılasıca matematiksel becerimi konuşturarak şu analize vardım.",
      "Sen baya baya hayatımın yüzdeee 65 70 inde varsın be kuzen.",
    ],
  },
  {
    planet: "saturn",
    name: "Satürn",
    eyebrow: "02 / İYİ Kİ DOĞDUN",
    color: "#d9c6ac",
    camera: [-.18, .12, 8],
    interaction: "constellation",
    segments: [
      "bu yüzden doğduğun için seni tebrik etmek ile beraber senin benim azucuk otistiklerime gösterdiğin üstün sabırdan ötürü.",
      "tebirk etmek ile beraber en derin içtenliklerim ile teşekkür ederim he birde kızma amaaaa.",
      "Ben senin yaşını unuttum be yaa çekndim şimdi yaşını sormaya fln tamamı seni instegramdan gost mu yaptım most mu her ne ıvır zıvır ise bakındım profile de yaşa dair birşey bulamadım.",
    ],
  },
  {
    planet: "jupiter",
    name: "Jüpiter",
    eyebrow: "03 / GECENİN BİR VAKTİ",
    color: "#c9967b",
    camera: [.22, -.08, 7.8],
    interaction: "asteroid",
    segments: [
      "Pardon bunun telafisi olarak al bir çiçek. :D 🌸",
      "normalde bu çiçeği daha afalı göstermek isterdim ama baya meşekatli geriye kalan aq seviyemi bu yazılara harcamak istiyorum. :D",
      "şuan sonda dinleyeceğin müzik eşliğinde saat 4 5 civarı hazırlıyorum bu yazı tarafını ama buna değecek bir insan için yaptığımında rahatlığı var tabi.",
    ],
  },
  {
    planet: "earth",
    name: "Dünya",
    eyebrow: "04 / NEDEN BU YOLCULUK?",
    color: "#64bfb9",
    camera: [-.12, .08, 8.3],
    interaction: "ripple",
    segments: [
      "Şimdi daha çok uzatmadan konuya girelim neden düz bir E-Posta veyahut ınstegram da yazılmış anlık düz iyiki doğrun mesajları yerine niye bu.",
      "O bana biraz samimiyetsiz geliyor diyebilirim yalan yok sanki hadi kurtuliğimde geçsin gibisinden.",
      "eeee buda bende yok ne değer verdiğim kocaaa haytımın pekte büyük bir hayatım yok çaktırma.",
      "hayatımın yarısından çoğunda varsın e sezarın hakkı sezara şimdi değer verdiğim insana değerli hissetirmeyi severim ee sende ziyadesiyle değerli bir insansın benim için ee yanisi şuki.",
    ],
  },
  {
    planet: "sun",
    name: "Güneş",
    eyebrow: "05 / BÜTÜN YILDIZLARDAN DAHA DEĞERLİ",
    color: "#eac28b",
    camera: [0, .06, 8],
    interaction: "corona",
    segments: [
      "Burada okadar yıldız gezegen vb. birçok şey gördün hepsi güzel parlak ve özenilerek yaratılmış.",
      "şuan gördüğün güneş gibi insanlar hayran kalır güzeliğine, parlaklığına  güneşin.",
      "Tıpkı senin gibi sende gerek ailemizin özerlikle varlığın ile benim çocukluktan bu yana sahip olduğum paha biçilemez 2 arkadaştan biri oldun bu hayatta hağlen sahip olduğum 2 arkadaştan biri.",
      "Çoğu adam böyle bir arkadaş bir dost bir kuzen için adam vurur :D hağlen yaşamam şans eseri tabi.",
      "Baya zamanını aldım sadece şunu bil ki çok değerlisin bu gördüğün galaksilerden yıldızlardan ve evrenden dahi daha değerli hem benim hemde Allah içinde.",
      "Doğum Günün Kutlu Olsun Elif Benim Küçççük Kuzenim iyiki varsın şimdi müziğin tadını çıkar.",
    ],
  },
];
export const storyLength = stages.slice(1).reduce(
  (sum, s) => sum + s.segments.length,
  0,
);
export function locate(index) {
  let rest = Math.max(0, Math.min(storyLength - 1, index));
  for (let stage = 1; stage < stages.length; stage++) {
    if (rest < stages[stage].segments.length) return { stage, segment: rest };
    rest -= stages[stage].segments.length;
  }
}
