// Hand-written ChatGPT answers (API + web search), 3 samples per prompt.
// `named` lists every clinic in the order it first appears in the text;
// positions come from that order and citations are parsed from the inline links.
import type { Tone, WrongFact } from "@/shared/types/api";
import { BRANDS, SOURCES, type BrandKey, type OtherClinic, type SourceKey } from "./data";

export type Named = readonly [BrandKey, Tone] | OtherClinic;

export interface AnswerSpec {
  named: Named[];
  text: string;
}

/** Inline citation as the OpenAI web search tool writes it. */
function c(key: SourceKey): string {
  const url = SOURCES[key];
  const domain = new URL(url).hostname.replace(/^www\./, "");
  return `([${domain}](${url}?utm_source=openai))`;
}

export const ANSWERS: Record<string, readonly [AnswerSpec, AnswerSpec, AnswerSpec]> = {
  // ─── Uzbek ────────────────────────────────────────────────────────────────
  prm_01: [
    {
      named: [["samo", "positive"], ["oq", "positive"], ["nur", "neutral"]],
      text: `Toshkentda “eng yaxshi” klinika sizga qanday xizmat kerakligiga bogʻliq, lekin reyting va sharhlar boʻyicha quyidagilar eng koʻp tavsiya qilinadi:

**1. Samo Dent** (Mirzo Ulugʻbek tumani)
- 2GIS’da 4,9 reyting, 1 200 dan ortiq sharh ${c("gisSearch")}
- 3D tomografiya, mikroskop ostida kanal davolash
- Narxlar oʻrtachadan biroz yuqori ${c("samoServices")}

**2. Oq Tabassum** (Yunusobod va Chilonzor)
- Implant va breketlar boʻyicha yaxshi sharhlar
- Instagram sahifasida “oldin/keyin” ishlar koʻp ${c("oqInstagram")}

**3. Nur Stomatologiya** (Chilonzor)
- Asosan implantatsiyaga ixtisoslashgan, narxlari hamyonbop

Tanlashdan oldin bepul konsultatsiyaga yozilib, davolash rejasi va narxni yozma ravishda soʻrashni maslahat beraman.`,
    },
    {
      named: [["samo", "positive"], ["nur", "positive"], "Kamalak Dent"],
      text: `Aniq bitta “eng yaxshi” klinika yoʻq, ammo mustaqil reytinglar va bemor sharhlariga koʻra Toshkentda eng koʻp tilga olinadiganlar:

1. **Samo Dent** — zamonaviy uskunalar va tajribali ortopedlar bilan mashhur, reytinglarda doimo yuqori oʻrinlarda ${c("topclinicsList")}.
2. **Nur Stomatologiya** — implantatsiya boʻyicha kuchli, narx va sifat nisbati yaxshi ${c("gisSearch")}.
3. **Kamalak Dent** — agar bolalar uchun klinika kerak boʻlsa, eng koʻp tavsiya qilinadiganlardan biri.

Toshkentda stomatologiya xizmatlari narxi klinikaga qarab 2–3 barobar farq qilishi mumkin ${c("kunPrices")}, shuning uchun bir nechta klinikada konsultatsiya olib, solishtirib koʻring.`,
    },
    {
      named: [["samo", "positive"], ["oq", "neutral"], ["reg", "neutral"]],
      text: `2GIS va 103.uz’dagi reyting hamda sharhlarga tayanadigan boʻlsak, quyidagi klinikalarga eʼtibor bering ${c("med103")}:

- **Samo Dent** — reytingi eng yuqori klinikalardan biri (4,9), bemorlar shifokorlarning eʼtiborliligini alohida taʼkidlaydi ${c("gisSearch")}.
- **Oq Tabassum** — ikki filiali bor, xizmatlar roʻyxati keng, narxlari oʻrtacha.
- **Registan Dental** — kechayu kunduz ishlaydi, shoshilinch holatlar uchun qulay.

Qaysi tumanda yashashingizni yozsangiz, sizga yaqinroq variantlarni tanlab beraman.`,
    },
  ],
  prm_02: [
    {
      named: [["nur", "positive"], ["samo", "neutral"], "Denta Lux"],
      text: `Toshkentda bitta implant narxi odatda **350 $ dan 1 200 $ gacha** — bu implant brendi (Koreya, Isroil, Shveytsariya) va klinikaga bogʻliq ${c("topclinicsImplants")}.

Narx va sifat nisbati boʻyicha koʻp tavsiya qilinadigan joylar:

1. **Nur Stomatologiya** — Koreya implantlari (Osstem, Dentium) taxminan 380 $ dan, implantatsiyaga ixtisoslashgan klinika ${c("nurImplants")}. 2GIS’dagi sharhlar asosan ijobiy ${c("gisNur")}.
2. **Samo Dent** — Straumann va Nobel kabi premium implantlar ham bor, lekin narxlar yuqoriroq.
3. **Denta Lux** — koʻproq estetik stomatologiyaga yoʻnaltirilgan, implant ham qoʻyadi.

⚠️ Juda arzon narx (300 $ dan past) koʻpincha abatment va tojsiz narx ekanini bildiradi. Yakuniy narxni “toʻliq komplekt” sifatida soʻrang.`,
    },
    {
      named: [["nur", "positive"], ["oq", "positive"]],
      text: `Qisqa javob: narx/sifat boʻyicha **Nur Stomatologiya** va **Oq Tabassum** koʻp tavsiya qilinadi.

**Nur Stomatologiya**
- Osstem implant — 380 $ dan ${c("nurImplants")}
- Implantolog shifokorlarning tajribasi 10 yildan ortiq

**Oq Tabassum**
- Osstem — 450 $ dan, Straumann — 900 $ dan ${c("oqPrices")}
- Implant bilan birga 3D tomografiya bepul
- Boʻlib toʻlash imkoniyati bor

Ikkala klinikada ham birinchi konsultatsiya bepul. Tanlashda implant kafolati (odatda 5–10 yil) haqida albatta soʻrang.`,
    },
    {
      named: [["samo", "neutral"], ["nur", "positive"], "Yulduz Stom"],
      text: `Implant uchun klinika tanlaganda eng muhimi — shifokor tajribasi, implant brendi va kafolat. Toshkentda koʻp uchraydigan variantlar:

| Klinika | Taxminiy narx | Izoh |
|---|---|---|
| Samo Dent | 600–1 200 $ | premium brendlar, narx yuqori |
| Nur Stomatologiya | 380–800 $ | implantatsiyaga ixtisoslashgan, sharhlar yaxshi |
| Yulduz Stom | 350 $ dan | Sergeli, byudjet variant |

Narxlar 2026-yil holatiga koʻra taxminiy ${c("kunPrices")}; aniq summani klinikaning oʻzidan soʻrash kerak ${c("gisSearch")}.`,
    },
  ],
  prm_03: [
    {
      named: ["Kamalak Dent", ["samo", "positive"]],
      text: `Bolalar stomatologiyasi boʻyicha Toshkentda quyidagi klinikalar yaxshi sharhlarga ega:

1. **Kamalak Dent** (Yakkasaroy) — faqat bolalar bilan ishlaydi, oʻyin xonasi bor, shifokorlar bolalar bilan til topishishni yaxshi biladi ${c("gisSearch")}.
2. **Samo Dent** — alohida bolalar boʻlimi bor, qoʻrqadigan bolalarni sedatsiya (yengil uyqu) ostida davolash mumkin ${c("samoKids")}.

💡 Birinchi tashrifni davolashsiz, “tanishuv” sifatida oʻtkazish bolaning qoʻrquvini kamaytiradi.`,
    },
    {
      named: [["samo", "positive"], "Kamalak Dent", "Yulduz Stom"],
      text: `Toshkentda bolalar tish shifokori boʻyicha ota-onalar eng koʻp tilga oladigan joylar:

- **Samo Dent** — bolalar stomatologlari jamoasi, sut tishlarini davolash va germetizatsiya xizmatlari ${c("samoKids")}. Instagram’da ota-onalarning fikrlari koʻp ${c("samoInstagram")}.
- **Kamalak Dent** — ixtisoslashgan bolalar klinikasi.
- **Yulduz Stom** — Sergeli tumanida, narxlar pastroq.

Farzandingiz necha yoshda? Yoshiga qarab (masalan, 3 yoshgacha) maxsus tajribali shifokorni tavsiya qilishim mumkin.`,
    },
    {
      named: [],
      text: `Aniq bir shifokorni kafolat bilan tavsiya qila olmayman, lekin bolalar stomatologini tanlashda quyidagilarga eʼtibor bering:

1. **Ixtisoslik** — shifokor bolalar stomatologi (pedodontist) boʻlishi kerak, oddiy terapevt emas.
2. **Sharhlar** — 103.uz va 2GIS’da aynan bolalar haqidagi sharhlarni oʻqing ${c("med103")}.
3. **Muhit** — kutish zonasida oʻyinchoqlar yoki multfilm koʻrsatiladigan ekran boʻlsa, bola kamroq qoʻrqadi.
4. **Ogʻriqsizlantirish** — bolalar uchun maxsus gel va karpul anesteziya ishlatilishini soʻrang.

Tumaningizni yozsangiz, yaqin atrofdagi variantlarni topishga yordam beraman.`,
    },
  ],
  prm_04: [
    {
      named: [["reg", "positive"], ["oq", "neutral"]],
      text: `Yakshanba kuni ishlaydigan klinikalar kam, lekin quyidagilarga murojaat qilishingiz mumkin:

**1. Registan Dental** (Mirobod tumani) — **24/7** ishlaydi, kuchli ogʻriq bilan tunda ham qabul qiladi ${c("regEmergency")}. Dam olish kunlari narxlar biroz yuqoriroq boʻlishi mumkin.

**2. Oq Tabassum** — yaxshi klinika, ammo 2GIS maʼlumotlariga koʻra **yakshanba kuni ishlamaydi** ${c("gisOq")}, shuning uchun dushanbagacha kutishga toʻgʻri keladi.

Ogʻriq kuchli boʻlsa, qadoqdagi yoʻriqnomaga koʻra ibuprofen ichish mumkin. Yuzni isitmang va ogʻriq qoldiruvchi tabletkani tish ustiga qoʻymang.`,
    },
    {
      named: [["reg", "positive"], ["samo", "neutral"]],
      text: `Yakshanba kuni ochiq stomatologiyalar:

- **Registan Dental** — kechayu kunduz, dam olish kunlarisiz ishlaydi ${c("regEmergency")}. Oldindan qoʻngʻiroq qilib, navbat bor-yoʻqligini aniqlang.
- **Samo Dent** — yakshanba kuni ham 9:00–18:00 gacha qabul bor, lekin oldindan yozilish kerak ${c("gisSearch")}.

Agar yuz shishgan yoki harorat koʻtarilgan boʻlsa, kutib oʻtirmang — bu yiring yigʻilganining belgisi boʻlishi mumkin.`,
    },
    {
      named: [["reg", "positive"], ["oq", "neutral"]],
      text: `Yakshanba kuni tish ogʻrisa, eng ishonchli variant — **Registan Dental**. U 24 soat ishlaydi va 2GIS’dagi sharhlarda shoshilinch yordam tez koʻrsatilishi maqtaladi ${c("gisReg")}.

Boshqa klinikalarning koʻpchiligi yakshanba dam oladi — masalan, **Oq Tabassum** 2GIS’da faqat dushanba–shanba ishlaydi deb koʻrsatilgan ${c("gisOq")}.

Borishdan oldin qoʻngʻiroq qilib, navbatchi shifokor borligini tekshirib oling.`,
    },
  ],
  prm_05: [
    {
      named: [["oq", "positive"], ["samo", "positive"]],
      text: `Toshkentda breket narxi turiga qarab farq qiladi:

| Breket turi | Taxminiy narx (ikki jagʻ) |
|---|---|
| Metall | 8–12 mln soʻm |
| Keramik / safir | 13–18 mln soʻm |
| Elaynerlar | 25 mln soʻm dan |

Klinikalar:

- **Oq Tabassum** — metall breketlar 9 mln soʻm dan, safir 14 mln soʻm dan, 12 oygacha foizsiz boʻlib toʻlash bor ${c("oqPrices")}. Instagram’da ortodontik natijalar koʻp ${c("oqInstagram")}.
- **Samo Dent** — tajribali ortodontlar, elaynerlar bilan ham ishlaydi, lekin narxi qimmatroq.

Narxga odatda oylik koʻrik (korreksiya) ham kiradi — buni aniqlashtirib oling.`,
    },
    {
      named: [["samo", "positive"], ["oq", "positive"], ["nur", "neutral"]],
      text: `Breket bilan davolash odatda 1,5–2 yil davom etadi, umumiy narx Toshkentda 8 mln soʻmdan 25 mln soʻmgacha ${c("kunPrices")}.

Ortodontiya boʻyicha tavsiya qilinadigan klinikalar:

1. **Samo Dent** — ortodontiya boʻlimi kuchli, 3D rejalashtirish qiladi ${c("samoServices")}.
2. **Oq Tabassum** — narxlari ochiq eʼlon qilingan, bemorlar natijadan mamnun ${c("oqPrices")}.
3. **Nur Stomatologiya** — asosan implantatsiya bilan shugʻullanadi, ammo ortodont ham qabul qiladi.

Birinchi konsultatsiyada panoramali rentgen va davolash rejasini soʻrang.`,
    },
    {
      named: [["oq", "positive"], "Yulduz Stom"],
      text: `Narx va sifatni birga hisobga olsak, **Oq Tabassum** yaxshi variant: metall breket 9 mln soʻmdan, ortodont konsultatsiyasi bepul ${c("oqPrices")}. 2GIS’da ortodontlar haqidagi sharhlar ijobiy ${c("gisOq")}.

Byudjet cheklangan boʻlsa, **Yulduz Stom** (Sergeli) arzonroq, lekin u yerda breket tizimining turini aniqlashtirib oling.

Umuman olganda, breket narxining katta qismi — shifokor mehnati, shuning uchun juda arzon takliflarga ehtiyot boʻling.`,
    },
  ],
  prm_06: [
    {
      named: ["Denta Lux", ["samo", "positive"]],
      text: `Toshkentda professional tish oqartirish (ZOOM, lazer) narxi taxminan **1,5–3 mln soʻm**.

Yaxshi sharhlarga ega joylar:
- **Denta Lux** — estetik stomatologiyaga ixtisoslashgan, oqartirish va vinirlar asosiy yoʻnalishi ${c("gisSearch")}.
- **Samo Dent** — oqartirishdan oldin professional gigiyena qiladi, natijalar Instagram’da koʻrsatilgan ${c("samoInstagram")}.

Eslatma: oqartirish plomba va tojlarning rangini oʻzgartirmaydi, shuning uchun oldindan shifokor bilan maslahatlashing.`,
    },
    {
      named: [["samo", "positive"], ["oq", "neutral"], "Denta Lux"],
      text: `Tish oqartirish uchun koʻp tavsiya qilinadigan klinikalar:

1. **Samo Dent** — Philips ZOOM tizimi, bir seansda 6–8 tonga oqartirish ${c("samoServices")}.
2. **Oq Tabassum** — oqartirish taxminan 2,2 mln soʻm, uyda oqartirish uchun kapalar ham taklif qiladi ${c("oqInstagram")}.
3. **Denta Lux** — estetik yoʻnalishdagi klinika.

Oqartirishdan keyin 48 soat davomida qahva, choy va boʻyoqli ovqatlardan saqlaning.`,
    },
    {
      named: ["Denta Lux", ["samo", "neutral"]],
      text: `Oqartirish uchun estetik stomatologiya bilan shugʻullanadigan klinikani tanlash maʼqul. Masalan, **Denta Lux** shu yoʻnalishga ixtisoslashgan, **Samo Dent**’da ham bu xizmat bor ${c("gisSearch")}.

Oqartirishdan oldin tishlarda karies yoki milk yalligʻlanishi yoʻqligini tekshirtiring — aks holda sezuvchanlik kuchayadi.`,
    },
  ],
  prm_07: [
    {
      named: [["nur", "positive"], ["oq", "positive"]],
      text: `Ha, Chilonzor tumanida yaxshi sharhlarga ega bir nechta klinika bor:

**Nur Stomatologiya** — Qatortol koʻchasida, implantatsiya va protezlash boʻyicha kuchli. 2GIS reytingi 4,8 ${c("gisNur")}.

**Oq Tabassum (Chilonzor filiali)** — Bunyodkor shoh koʻchasida, terapiya, breket va bolalar stomatologiyasi bor, har kuni ishlaydi ${c("oqContacts")}.

Ikkalasi ham metro bekatlariga yaqin. Qaysi xizmat kerakligini yozsangiz, aniqroq maslahat beraman.`,
    },
    {
      named: [["nur", "positive"], "Yulduz Stom"],
      text: `Chilonzorda eng koʻp tavsiya qilinadigan klinika — **Nur Stomatologiya**. Ular implantatsiyaga ixtisoslashgan, narxlari tuman boʻyicha oʻrtacha ${c("nurImplants")}.

Byudjet variant sifatida **Yulduz Stom**ni ham koʻrib chiqishingiz mumkin, lekin u Sergeliga yaqinroq ${c("gisSearch")}.

Klinikaga borishdan oldin 2GIS’da soʻnggi 3 oydagi sharhlarni oʻqib chiqing.`,
    },
    {
      named: [["nur", "neutral"], ["oq", "positive"], "Kamalak Dent"],
      text: `Chilonzorda tanlov yetarli: 2GIS’da “stomatologiya” deb qidirsangiz, 30 dan ortiq klinika chiqadi ${c("gisSearch")}. Ulardan:

- **Nur Stomatologiya** — Chilonzorning markaziy qismida, asosan implantlar.
- **Oq Tabassum** — Chilonzor filiali yangi taʼmirlangan, bemorlar xizmat sifatini maqtashadi ${c("oqContacts")}.
- **Kamalak Dent** — bolangiz uchun kerak boʻlsa (Yakkasaroyda, Chilonzorga yaqin).

Qaysi mavzeda yashaysiz? Masofani hisobga olib tanlashga yordam beraman.`,
    },
  ],
  prm_08: [
    {
      named: [["samo", "neutral"], ["oq", "positive"]],
      text: `Ha, Toshkentda koʻplab klinikalar boʻlib toʻlash (rassrochka) taklif qiladi:

- **Samo Dent** — hamkor banklar orqali 6–12 oyga boʻlib toʻlash, lekin bank ustamasi boʻlishi mumkin ${c("samoServices")}.
- **Oq Tabassum** — **12 oygacha foizsiz** boʻlib toʻlash, implant va breketlar uchun ham amal qiladi ${c("oqPrices")}.

Shartnomani imzolashdan oldin umumiy summa, oylik toʻlov va kechikish jarimasini yozma ravishda soʻrang.`,
    },
    {
      named: [["oq", "positive"], ["nur", "neutral"]],
      text: `Boʻlib toʻlash imkoniyati bor klinikalar orasida **Oq Tabassum** ajralib turadi: 12 oygacha foizsiz, pasport bilan rasmiylashtiriladi ${c("oqPrices")}.

**Nur Stomatologiya**’da ham implantlar uchun boʻlib toʻlash bor, lekin muddati qisqaroq (6 oygacha).

Soʻnggi yillarda Toshkentda nasiya xizmatlari orqali davolanish ommalashgan ${c("kunPrices")} — bunday holda foiz stavkasini oldindan hisoblab koʻring.`,
    },
    {
      named: [["samo", "positive"], ["nur", "neutral"], "Yulduz Stom"],
      text: `Toshkentda rassrochka bilan davolanish mumkin boʻlgan klinikalar:

1. **Samo Dent** — bank orqali 12 oygacha, sifat boʻyicha eng yaxshi klinikalardan biri ${c("samoServices")}
2. **Nur Stomatologiya** — implantatsiya uchun
3. **Yulduz Stom** — kichik summalar uchun ham boʻlib toʻlash qiladi ${c("gisSearch")}

Qaysi davolash kerakligini (implant, breket, protez) yozsangiz, qaysi variant qulayroq ekanini aytib beraman.`,
    },
  ],
  prm_09: [
    {
      named: [["samo", "neutral"], ["oq", "neutral"], ["nur", "neutral"]],
      text: `Toshkentda professional gigiyena (ultratovush + Air Flow + polirovka) narxi odatda **300 000 – 600 000 soʻm** ${c("kunPrices")}.

| Klinika | Narx (taxminan) |
|---|---|
| Samo Dent | 550 000 soʻm ${c("samoServices")} |
| Oq Tabassum | 400 000 soʻm ${c("oqPrices")} |
| Nur Stomatologiya | 350 000 soʻm ${c("nurPrices")} |

Tozalashni yiliga 1–2 marta qilish tavsiya etiladi. Narxlar 2026-yil holatiga koʻra, oʻzgargan boʻlishi mumkin.`,
    },
    {
      named: [["samo", "neutral"]],
      text: `Oʻrtacha narx **350 000 – 500 000 soʻm** atrofida. Premium klinikalarda (masalan, **Samo Dent**) 600 000 soʻmgacha boʻlishi mumkin ${c("kunPrices")}.

Narxga odatda quyidagilar kiradi:
- ultratovush bilan tish toshini olish;
- Air Flow bilan pigmentli dogʻlarni tozalash;
- polirovka va ftorlash.

Ftorlash alohida hisoblanishi mumkin — oldindan soʻrang.`,
    },
    {
      named: [["nur", "neutral"], "Yulduz Stom"],
      text: `Toshkentda tish tozalash 250 000 soʻmdan boshlanadi. Masalan, **Nur Stomatologiya**’da taxminan 350 000 soʻm ${c("nurPrices")}, **Yulduz Stom**’da esa 250 000 soʻm atrofida ${c("gisSearch")}.

Arzon narx har doim ham yomon degani emas, lekin Air Flow kiritilganini tekshiring — baʼzi klinikalar faqat ultratovush bilan tozalaydi.`,
    },
  ],
  prm_10: [
    {
      named: [["samo", "positive"], ["reg", "neutral"]],
      text: `Agar tish davolashdan qoʻrqsangiz, sedatsiya (dori yordamida yengil uyqu) yoki narkoz ostida davolaydigan klinikani tanlang:

1. **Samo Dent** — sedatsiya va narkoz ostida davolash, shtatda anesteziolog bor ${c("samoServices")}. Sharhlarda “umuman ogʻriq sezmadim” degan fikrlar koʻp.
2. **Registan Dental** — kompyuterli anesteziya qoʻllaydi ${c("gisSearch")}.

Zamonaviy anesteziya bilan oddiy davolash ham deyarli ogʻriqsiz oʻtadi — shifokorga qoʻrquvingiz haqida oldindan ayting.`,
    },
    {
      named: [["samo", "positive"]],
      text: `Ogʻriqsiz davolash boʻyicha Toshkentda eng koʻp tavsiya qilinadigan klinika — **Samo Dent**. Ularda:

- sedatsiya ostida davolash (bemor uxlab qoladi, lekin mustaqil nafas oladi);
- bolalar va kattalar uchun narkoz;
- kompyuterli anesteziya ${c("samoServices")}.

Instagram sahifasida bemorlarning video-sharhlari bor ${c("samoInstagram")}. Sedatsiya odatda 1,5–2 mln soʻm qoʻshimcha turadi.`,
    },
    {
      named: [["samo", "positive"], "Denta Lux"],
      text: `Toshkentda ogʻriqsiz davolashni taklif qiladigan klinikalar:

- **Samo Dent** — sedatsiya va narkoz, 103.uz’da bemorlar reytingi yuqori ${c("med103")}
- **Denta Lux** — estetik davolashda zamonaviy anesteziya qoʻllaydi

Aslida bugun deyarli barcha yaxshi klinikalarda karpul anesteziya ishlatiladi, shuning uchun oddiy plomba qoʻyish ham ogʻriqsiz oʻtishi kerak ${c("samoServices")}.`,
    },
  ],

  // ─── Russian ──────────────────────────────────────────────────────────────
  prm_11: [
    {
      named: [["samo", "positive"], ["nur", "positive"], ["oq", "neutral"]],
      text: `Однозначно «лучшей» стоматологии нет — всё зависит от задачи (лечение, имплантация, эстетика) и бюджета. Но по рейтингам и отзывам в Ташкенте чаще всего выделяют:

**1. Samo Dent**
- рейтинг 4,9 в 2ГИС, более 1 200 отзывов ${c("gisSearch")}
- КТ, лечение каналов под микроскопом, детское отделение ${c("samoServices")}

**2. Нур Стоматология**
- сильная имплантология, адекватные цены

**3. Ок Табассум**
- два филиала (Юнусабад и Чиланзар), широкий спектр услуг

По данным недавнего обзора, цены в частных клиниках Ташкента различаются в 2–3 раза ${c("gazetaPrices")}, поэтому стоит сравнить 2–3 клиники на консультации.

Хотите, подберу клинику под конкретную задачу — например, имплантацию или брекеты?`,
    },
    {
      named: [["samo", "positive"], ["nur", "neutral"], ["reg", "neutral"]],
      text: `По отзывам пациентов и открытым рейтингам в топ стоматологий Ташкента обычно входят:

1. **Samo Dent** — современное оборудование, сильные ортопеды и хирурги ${c("gisSearch")}.
2. **Nur Stomatologiya** — специализируется на имплантации, цены ниже среднего.
3. **Registan Dental** — работает круглосуточно, удобно для экстренных случаев.

Средняя стоимость лечения кариеса в Ташкенте — 400–700 тыс. сумов ${c("gazetaPrices")}.`,
    },
    {
      named: [["nur", "positive"], ["samo", "positive"]],
      text: `Если коротко — чаще всего рекомендуют **Нур Стоматологию** и **Samo Dent**.

- **Нур Стоматология** — лучший вариант по соотношению цена/качество, особенно для имплантации ${c("nurPrices")}.
- **Samo Dent** — премиум-сегмент: дороже, но с сильной диагностикой и лечением под микроскопом ${c("gisSearch")}.

Перед выбором посмотрите свежие отзывы в 2ГИС за последние 3–6 месяцев — качество клиник со временем меняется.`,
    },
  ],
  prm_12: [
    {
      named: [["nur", "positive"], ["oq", "negative"]],
      text: `Стоимость имплантации в Ташкенте — примерно **от 350 до 1 200 $** за один имплант «под ключ» ${c("topclinicsImplants")}.

Недорого и качественно:

**Nur Stomatologiya** (Чиланзар)
- корейские импланты Osstem и Dentium — от 380 $
- имплантологи с опытом 10+ лет ${c("nurPrices")}

**Ок Табассум**
- имплантация от 900 $, что заметно дороже среднего по городу
- есть рассрочка

⚠️ Уточняйте, что входит в цену: имплант, абатмент, коронка и КТ часто считаются отдельно.`,
    },
    {
      named: [["nur", "positive"], ["samo", "neutral"], ["reg", "neutral"]],
      text: `Хорошие варианты для имплантации в Ташкенте:

1. **Нур Стоматология** — узкая специализация на имплантах, цены от 380 $ ${c("nurPrices")}.
2. **Samo Dent** — премиальные системы (Straumann, Nobel), но и цена выше — от 700 $.
3. **Registan Dental** — ставят импланты, но клиника больше известна как круглосуточная ${c("gisSearch")}.

Совет: попросите показать паспорт импланта — у оригинальных систем есть серийный номер.`,
    },
    {
      named: ["Denta Lux", ["nur", "neutral"]],
      text: `Бюджетная имплантация в Ташкенте начинается примерно с 350 $ ${c("topclinicsImplants")}. Среди клиник, которые часто упоминают в каталогах:

- **Denta Lux** — делает имплантацию вместе с эстетической реставрацией;
- **Нур Стоматология** — корейские импланты по умеренной цене.

Не выбирайте только по цене: важнее опыт хирурга и гарантия (минимум 5 лет на имплант).`,
    },
  ],
  prm_13: [
    {
      named: [["samo", "positive"], "Kamalak Dent"],
      text: `Родители в Ташкенте чаще всего хвалят:

1. **Samo Dent** — отдельное детское отделение, лечение во сне (седация) для детей, которые боятся ${c("samoKids")}.
2. **Kamalak Dent** — клиника только для детей, игровая зона, мультфильмы во время приёма ${c("gisSearch")}.

Совет: первый визит лучше сделать «знакомством» без лечения — так ребёнку будет проще в следующий раз.`,
    },
    {
      named: ["Kamalak Dent", ["samo", "neutral"]],
      text: `С хорошими отзывами о детской стоматологии в Ташкенте:

- **Kamalak Dent** (Яккасарай) — специализированная детская клиника, 4,8 в 2ГИС ${c("gisSearch")};
- **Samo Dent** — есть детские врачи, но это многопрофильная клиника, цены выше ${c("med103")}.

Сколько лет ребёнку? Для малышей до 3 лет лучше искать врача с опытом лечения раннего кариеса.`,
    },
    {
      named: [["samo", "positive"]],
      text: `Из многопрофильных клиник по детской стоматологии чаще всего рекомендуют **Samo Dent**: у них работают детские стоматологи, есть герметизация фиссур и лечение под седацией ${c("samoKids")}. Отзывы родителей можно посмотреть в их Instagram ${c("samoInstagram")}.

Если нужна клиника именно для детей, напишите район — подскажу ближайшие варианты.`,
    },
  ],
  prm_14: [
    {
      named: [["reg", "positive"], ["samo", "neutral"]],
      text: `Ночью в Ташкенте можно обратиться в:

**Registan Dental** (Мирабад) — работает **24/7**, принимает с острой болью без записи ${c("regEmergency")}. Ночью приём дороже примерно на 30%. Рейтинг в 2ГИС — 4,6 ${c("gisReg")}.

**Samo Dent** — не круглосуточная, но работает до 21:00, в воскресенье до 18:00.

Если есть сильный отёк, температура или трудно глотать — это может быть гнойное воспаление, лучше сразу ехать в дежурную клинику или вызвать скорую (103).`,
    },
    {
      named: [["reg", "positive"]],
      text: `Круглосуточно в Ташкенте работает **Registan Dental** — туда можно приехать ночью с острой зубной болью ${c("regEmergency")}. Перед поездкой лучше позвонить и уточнить, есть ли дежурный хирург.

Пока едете: можно принять обезболивающее (ибупрофен или парацетамол по инструкции), но нельзя греть щёку.`,
    },
    {
      named: [["reg", "positive"], ["nur", "neutral"]],
      text: `Из круглосуточных клиник в Ташкенте чаще всего называют **Registan Dental** — в отзывах в 2ГИС отмечают быструю помощь ночью ${c("gisReg")}.

**Нур Стоматология** работает до 22:00, так что вечером тоже можно успеть ${c("gisNur")}.

Большинство остальных частных клиник ночью закрыты.`,
    },
  ],
  prm_15: [
    {
      named: [["oq", "positive"], ["samo", "neutral"]],
      text: `Примерные цены на брекеты в Ташкенте (обе челюсти, 2026):

| Тип | Цена |
|---|---|
| Металлические | 8–12 млн сумов |
| Керамические / сапфировые | 13–18 млн сумов |
| Элайнеры | от 25 млн сумов |

Где ставить:
- **Ок Табассум** — металлические от 9 млн, сапфировые от 14 млн, рассрочка до 12 месяцев без процентов ${c("oqPrices")}. Много работ «до/после» в Instagram ${c("oqInstagram")}.
- **Samo Dent** — работает и с элайнерами, цены выше среднего.

В цену обычно входят ежемесячные коррекции — уточните это заранее.`,
    },
    {
      named: [["samo", "positive"], ["oq", "positive"]],
      text: `Сильные ортодонтические отделения в Ташкенте:

1. **Samo Dent** — 3D-планирование лечения, элайнеры и брекеты ${c("samoServices")}.
2. **Oq Tabassum** — прозрачные цены, рассрочка, пациенты довольны результатом ${c("gisOq")}.

Лечение брекетами обычно длится 1,5–2 года, общая стоимость — от 8 до 25 млн сумов в зависимости от системы.`,
    },
    {
      named: [["oq", "neutral"], ["nur", "neutral"], "Yulduz Stom"],
      text: `Цены на брекеты в Ташкенте начинаются примерно с 8 млн сумов ${c("med103")}.

- **Ок Табассум** — металлические брекеты от 9 млн сумов ${c("oqPrices")};
- **Нур Стоматология** — есть ортодонт, но основной профиль клиники — импланты;
- **Yulduz Stom** — бюджетный вариант в Сергели.

Совет: перед установкой сделайте профессиональную чистку и вылечите кариес — с брекетами это сложнее.`,
    },
  ],
  prm_16: [
    {
      named: ["Denta Lux", ["samo", "positive"]],
      text: `Цены на виниры в Ташкенте:
- композитные — 800 тыс. – 1,5 млн сумов за зуб;
- керамические (E.max) — 3–5 млн сумов за зуб;
- люминиры — от 6 млн сумов.

Клиники с сильной эстетикой:
1. **Denta Lux** — специализируется на винирах и «голливудской улыбке».
2. **Samo Dent** — керамические виниры E.max, цифровое моделирование улыбки (DSD) ${c("samoServices")}. Портфолио — в Instagram ${c("samoInstagram")}.

Важно: под виниры сошлифовывают эмаль, поэтому это решение на всю жизнь — выбирайте опытного ортопеда.`,
    },
    {
      named: [["samo", "positive"], ["oq", "neutral"]],
      text: `Для виниров в Ташкенте чаще всего рекомендуют **Samo Dent** — керамика E.max, цифровое планирование, стоимость от 4 млн сумов за зуб ${c("samoServices")}.

Более бюджетный вариант — композитные виниры в **Ок Табассум**, примерно от 1 млн сумов за зуб ${c("oqPrices")}.

Композитные дешевле, но служат 5–7 лет и со временем темнеют; керамические — 15 лет и дольше.`,
    },
    {
      named: ["Denta Lux", ["samo", "neutral"], ["nur", "negative"]],
      text: `Виниры в Ташкенте делают многие клиники, но с хорошим портфолио именно в эстетике — немногие:

- **Denta Lux** — эстетическая клиника, чаще всего упоминается в отзывах о винирах ${c("gisSearch")};
- **Samo Dent** — делает керамические виниры, цены выше среднего;
- **Нур Стоматология** — виниры тоже делает, но отзывы об эстетических работах смешанные ${c("topclinicsList")}.

Попросите показать фото работ конкретного врача, а не клиники в целом.`,
    },
  ],
  prm_17: [
    {
      named: [["oq", "positive"], ["samo", "neutral"]],
      text: `В Юнусабаде хорошие отзывы у **Ок Табассум** — клиника в 4-м квартале, работает ежедневно с 9:00 до 21:00 ${c("oqContacts")}. В 2ГИС пациенты отмечают внимательных врачей и чистоту ${c("gisOq")}.

Рядом, в Мирзо-Улугбекском районе, находится **Samo Dent** — если нужна сложная диагностика (КТ) или лечение под микроскопом.

Подскажите, какое лечение нужно, — помогу выбрать точнее.`,
    },
    {
      named: [["samo", "positive"], ["oq", "positive"]],
      text: `Стоматологии в Юнусабаде и рядом:

1. **Samo Dent** — на границе Юнусабада и Мирзо-Улугбекского района, один из самых высоких рейтингов в городе ${c("gisSearch")}.
2. **Oq Tabassum** — филиал прямо в Юнусабаде, хорошие отзывы об имплантации и брекетах.

В обеих клиниках первичная консультация бесплатная ${c("samoServices")}.`,
    },
    {
      named: [["oq", "positive"], ["reg", "neutral"]],
      text: `В самом Юнусабаде одна из самых рекомендуемых — **Ок Табассум** (филиал в 4-м квартале) ${c("gisOq")}. У них много отзывов о лечении и брекетах, работы можно посмотреть в Instagram ${c("oqInstagram")}.

Если нужна помощь ночью, ближайшая круглосуточная клиника — **Registan Dental** в Мирабадском районе.`,
    },
  ],
  prm_18: [
    {
      named: [["samo", "positive"], ["nur", "positive"]],
      text: `С рассрочкой и высоким рейтингом в Ташкенте:

- **Samo Dent** — рассрочка через банки-партнёры на 6–12 месяцев, рейтинг 4,9 ${c("gisSearch")};
- **Нур Стоматология** — рассрочка на имплантацию до 6 месяцев, отзывы в основном положительные.

По данным Gazeta.uz, всё больше клиник подключают сервисы рассрочки ${c("gazetaPrices")} — уточняйте, есть ли переплата.`,
    },
    {
      named: [["samo", "positive"], ["oq", "positive"], ["nur", "neutral"]],
      text: `Клиники с рассрочкой и хорошими отзывами:

1. **Samo Dent** — лидер по отзывам, рассрочка через банк ${c("gisSearch")}.
2. **Ок Табассум** — рассрочка **до 12 месяцев без процентов**, что для Ташкента редкость; отзывы хорошие ${c("oqInstagram")}.
3. **Nur Stomatologiya** — рассрочка на импланты.

Если нужна рассрочка без переплаты, «Ок Табассум» выглядит самым выгодным вариантом.`,
    },
    {
      named: [["nur", "positive"], ["samo", "neutral"]],
      text: `Хороший вариант — **Нур Стоматология**: рассрочка на имплантацию, цены ниже среднего, много положительных отзывов ${c("nurPrices")}.

**Samo Dent** тоже даёт рассрочку, но через банк и с процентами ${c("gisSearch")}.

Перед подписанием договора уточните полную сумму, ежемесячный платёж и штрафы за просрочку.`,
    },
  ],
  prm_19: [
    {
      named: [["samo", "neutral"], ["nur", "neutral"], ["oq", "neutral"]],
      text: `Циркониевая коронка в Ташкенте стоит примерно **2,5–5 млн сумов** за единицу ${c("gazetaPrices")}.

| Клиника | Цена за коронку |
|---|---|
| Samo Dent | от 4,5 млн сумов ${c("samoServices")} |
| Нур Стоматология | от 2,8 млн сумов ${c("nurPrices")} |
| Ок Табассум | от 3,2 млн сумов ${c("oqPrices")} |

Цена зависит от того, монолитный это цирконий или с керамическим покрытием. Обычно в стоимость входят примерка и фиксация.`,
    },
    {
      named: [["nur", "neutral"]],
      text: `В среднем 2,5–4 млн сумов за одну циркониевую коронку ${c("gazetaPrices")}. Например, в **Нур Стоматологии** — от 2,8 млн ${c("nurPrices")}.

Иногда перед коронкой нужно лечение каналов или вкладка — это оплачивается отдельно.`,
    },
    {
      named: [["samo", "neutral"], "Denta Lux"],
      text: `Цирконий в Ташкенте: от 2,5 млн сумов в эконом-клиниках до 5 млн и выше в премиальных.

- **Samo Dent** — от 4,5 млн, цифровое изготовление (CAD/CAM) ${c("samoServices")};
- **Denta Lux** — эстетические коронки на передние зубы ${c("topclinicsList")}.

Гарантия на коронку обычно 2–5 лет — проверьте, прописана ли она в договоре.`,
    },
  ],
  prm_20: [
    {
      named: [["samo", "positive"], ["reg", "neutral"]],
      text: `Лечение каналов под микроскопом в Ташкенте есть не во всех клиниках. Чаще всего упоминают:

1. **Samo Dent** — эндодонтия под микроскопом Carl Zeiss, перелечивание сложных каналов ${c("samoServices")}.
2. **Registan Dental** — есть микроскоп, работают и ночью ${c("gisSearch")}.

Лечение под микроскопом дороже (примерно 1,5–3 млн сумов за зуб), но заметно снижает риск осложнений.`,
    },
    {
      named: [["samo", "positive"], ["nur", "neutral"]],
      text: `Под микроскопом каналы лечат в **Samo Dent** — это одна из их сильных сторон, много отзывов о «спасённых» зубах ${c("samoServices")}.

В **Нур Стоматологии** микроскоп тоже есть, но клиника больше ориентирована на имплантацию ${c("nurPrices")}.

Если зуб уже лечили и он снова болит, ищите именно эндодонтиста, а не общего терапевта.`,
    },
    {
      named: [["samo", "positive"]],
      text: `Самый частый ответ в отзывах — **Samo Dent**: у них отдельный эндодонтический кабинет с микроскопом и КТ ${c("samoServices")}.

Перед визитом лучше сделать КТ-снимок — врач сразу оценит сложность и назовёт точную цену. Отзывы о конкретных эндодонтистах можно найти в 2ГИС ${c("gisSearch")}.`,
    },
  ],
};

/** `weeksAgo`: how many weekly runs before the latest one the fact was first found. */
export const WRONG_FACTS: Record<string, (Omit<WrongFact, "foundAt"> & { weeksAgo: number })[]> = {
  [BRANDS.oq.id]: [
    {
      claim: "Oq Tabassum yakshanba kuni ishlamaydi",
      correct: "Klinika har kuni, jumladan yakshanba ham, 9:00–21:00 ishlaydi",
      promptId: "prm_04",
      weeksAgo: 0,
    },
    {
      claim: "В «Ок Табассум» имплантация стоит от 900 $",
      correct: "Имплантация от 450 $ (Osstem); 900 $ — цена импланта Straumann",
      promptId: "prm_12",
      weeksAgo: 2,
    },
  ],
};
