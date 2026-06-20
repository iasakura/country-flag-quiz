import React, { useState, useEffect, useMemo, useRef } from "react";

// 保存先: アーティファクト実行時は window.storage、通常のWeb（GitHub Pages等）では localStorage を使う。
const DB = (typeof window !== "undefined" && window.storage)
  ? window.storage
  : {
      async get(key) {
        const v = localStorage.getItem(key);
        if (v === null) throw new Error("not found");
        return { key, value: v };
      },
      async set(key, value) {
        localStorage.setItem(key, value);
        return { key, value };
      },
      async delete(key) {
        localStorage.removeItem(key);
        return { key, deleted: true };
      },
    };

/* ============================================================
   国旗当て学習アプリ
   - 出題: 選択式 / 入力式
   - カテゴリ: すべて / 地域別 / イスラム圏 / 苦手
   - 不正解・正解・出題回数を永続保存（苦手判定に利用）
   - 国旗画像: flagcdn.com（ISO 3166-1 alpha-2）
   ============================================================ */

const R = { asia: "アジア", europe: "ヨーロッパ", africa: "アフリカ", namerica: "北米", samerica: "南米", oceania: "オセアニア" };

// code(ISO alpha-2), ja, en, region, muslim(イスラム圏=多数派), aliases(入力許容)
const COUNTRIES = [
  // --- アジア ---
  { c: "jp", ja: "日本", en: "Japan", r: "asia" },
  { c: "kr", ja: "韓国", en: "South Korea", r: "asia", a: ["大韓民国"] },
  { c: "kp", ja: "北朝鮮", en: "North Korea", r: "asia", a: ["朝鮮民主主義人民共和国"] },
  { c: "cn", ja: "中国", en: "China", r: "asia", a: ["中華人民共和国"] },
  { c: "tw", ja: "台湾", en: "Taiwan", r: "asia" },
  { c: "mn", ja: "モンゴル", en: "Mongolia", r: "asia" },
  { c: "in", ja: "インド", en: "India", r: "asia" },
  { c: "pk", ja: "パキスタン", en: "Pakistan", r: "asia", m: true },
  { c: "bd", ja: "バングラデシュ", en: "Bangladesh", r: "asia", m: true },
  { c: "lk", ja: "スリランカ", en: "Sri Lanka", r: "asia" },
  { c: "np", ja: "ネパール", en: "Nepal", r: "asia" },
  { c: "bt", ja: "ブータン", en: "Bhutan", r: "asia" },
  { c: "mv", ja: "モルディブ", en: "Maldives", r: "asia", m: true },
  { c: "af", ja: "アフガニスタン", en: "Afghanistan", r: "asia", m: true },
  { c: "th", ja: "タイ", en: "Thailand", r: "asia" },
  { c: "vn", ja: "ベトナム", en: "Vietnam", r: "asia" },
  { c: "la", ja: "ラオス", en: "Laos", r: "asia" },
  { c: "kh", ja: "カンボジア", en: "Cambodia", r: "asia" },
  { c: "mm", ja: "ミャンマー", en: "Myanmar", r: "asia" },
  { c: "my", ja: "マレーシア", en: "Malaysia", r: "asia", m: true },
  { c: "sg", ja: "シンガポール", en: "Singapore", r: "asia" },
  { c: "id", ja: "インドネシア", en: "Indonesia", r: "asia", m: true },
  { c: "ph", ja: "フィリピン", en: "Philippines", r: "asia" },
  { c: "bn", ja: "ブルネイ", en: "Brunei", r: "asia", m: true },
  { c: "tl", ja: "東ティモール", en: "Timor-Leste", r: "asia" },
  { c: "kz", ja: "カザフスタン", en: "Kazakhstan", r: "asia", m: true },
  { c: "uz", ja: "ウズベキスタン", en: "Uzbekistan", r: "asia", m: true },
  { c: "tm", ja: "トルクメニスタン", en: "Turkmenistan", r: "asia", m: true },
  { c: "kg", ja: "キルギス", en: "Kyrgyzstan", r: "asia", m: true },
  { c: "tj", ja: "タジキスタン", en: "Tajikistan", r: "asia", m: true },
  { c: "tr", ja: "トルコ", en: "Turkey", r: "asia", m: true },
  { c: "ge", ja: "ジョージア", en: "Georgia", r: "asia", a: ["グルジア"] },
  { c: "am", ja: "アルメニア", en: "Armenia", r: "asia" },
  { c: "az", ja: "アゼルバイジャン", en: "Azerbaijan", r: "asia", m: true },
  { c: "ir", ja: "イラン", en: "Iran", r: "asia", m: true },
  { c: "iq", ja: "イラク", en: "Iraq", r: "asia", m: true },
  { c: "sy", ja: "シリア", en: "Syria", r: "asia", m: true },
  { c: "lb", ja: "レバノン", en: "Lebanon", r: "asia", m: true },
  { c: "il", ja: "イスラエル", en: "Israel", r: "asia" },
  { c: "ps", ja: "パレスチナ", en: "Palestine", r: "asia", m: true },
  { c: "jo", ja: "ヨルダン", en: "Jordan", r: "asia", m: true },
  { c: "sa", ja: "サウジアラビア", en: "Saudi Arabia", r: "asia", m: true },
  { c: "ye", ja: "イエメン", en: "Yemen", r: "asia", m: true },
  { c: "om", ja: "オマーン", en: "Oman", r: "asia", m: true },
  { c: "ae", ja: "アラブ首長国連邦", en: "United Arab Emirates", r: "asia", m: true, a: ["UAE", "アラブ首長国"] },
  { c: "qa", ja: "カタール", en: "Qatar", r: "asia", m: true },
  { c: "bh", ja: "バーレーン", en: "Bahrain", r: "asia", m: true },
  { c: "kw", ja: "クウェート", en: "Kuwait", r: "asia", m: true },

  // --- ヨーロッパ ---
  { c: "gb", ja: "イギリス", en: "United Kingdom", r: "europe", a: ["英国", "UK", "グレートブリテン"] },
  { c: "ie", ja: "アイルランド", en: "Ireland", r: "europe" },
  { c: "fr", ja: "フランス", en: "France", r: "europe" },
  { c: "de", ja: "ドイツ", en: "Germany", r: "europe" },
  { c: "it", ja: "イタリア", en: "Italy", r: "europe" },
  { c: "es", ja: "スペイン", en: "Spain", r: "europe" },
  { c: "pt", ja: "ポルトガル", en: "Portugal", r: "europe" },
  { c: "nl", ja: "オランダ", en: "Netherlands", r: "europe" },
  { c: "be", ja: "ベルギー", en: "Belgium", r: "europe" },
  { c: "lu", ja: "ルクセンブルク", en: "Luxembourg", r: "europe" },
  { c: "ch", ja: "スイス", en: "Switzerland", r: "europe" },
  { c: "at", ja: "オーストリア", en: "Austria", r: "europe" },
  { c: "li", ja: "リヒテンシュタイン", en: "Liechtenstein", r: "europe" },
  { c: "mc", ja: "モナコ", en: "Monaco", r: "europe" },
  { c: "ad", ja: "アンドラ", en: "Andorra", r: "europe" },
  { c: "sm", ja: "サンマリノ", en: "San Marino", r: "europe" },
  { c: "va", ja: "バチカン", en: "Vatican City", r: "europe" },
  { c: "mt", ja: "マルタ", en: "Malta", r: "europe" },
  { c: "dk", ja: "デンマーク", en: "Denmark", r: "europe" },
  { c: "no", ja: "ノルウェー", en: "Norway", r: "europe" },
  { c: "se", ja: "スウェーデン", en: "Sweden", r: "europe" },
  { c: "fi", ja: "フィンランド", en: "Finland", r: "europe" },
  { c: "is", ja: "アイスランド", en: "Iceland", r: "europe" },
  { c: "ee", ja: "エストニア", en: "Estonia", r: "europe" },
  { c: "lv", ja: "ラトビア", en: "Latvia", r: "europe" },
  { c: "lt", ja: "リトアニア", en: "Lithuania", r: "europe" },
  { c: "pl", ja: "ポーランド", en: "Poland", r: "europe" },
  { c: "cz", ja: "チェコ", en: "Czechia", r: "europe", a: ["チェコ共和国"] },
  { c: "sk", ja: "スロバキア", en: "Slovakia", r: "europe" },
  { c: "hu", ja: "ハンガリー", en: "Hungary", r: "europe" },
  { c: "ro", ja: "ルーマニア", en: "Romania", r: "europe" },
  { c: "bg", ja: "ブルガリア", en: "Bulgaria", r: "europe" },
  { c: "gr", ja: "ギリシャ", en: "Greece", r: "europe" },
  { c: "si", ja: "スロベニア", en: "Slovenia", r: "europe" },
  { c: "hr", ja: "クロアチア", en: "Croatia", r: "europe" },
  { c: "ba", ja: "ボスニア・ヘルツェゴビナ", en: "Bosnia and Herzegovina", r: "europe", m: true, a: ["ボスニア"] },
  { c: "rs", ja: "セルビア", en: "Serbia", r: "europe" },
  { c: "me", ja: "モンテネグロ", en: "Montenegro", r: "europe" },
  { c: "mk", ja: "北マケドニア", en: "North Macedonia", r: "europe", a: ["マケドニア"] },
  { c: "al", ja: "アルバニア", en: "Albania", r: "europe", m: true },
  { c: "xk", ja: "コソボ", en: "Kosovo", r: "europe", m: true },
  { c: "ua", ja: "ウクライナ", en: "Ukraine", r: "europe" },
  { c: "by", ja: "ベラルーシ", en: "Belarus", r: "europe" },
  { c: "md", ja: "モルドバ", en: "Moldova", r: "europe" },
  { c: "ru", ja: "ロシア", en: "Russia", r: "europe" },
  { c: "cy", ja: "キプロス", en: "Cyprus", r: "europe" },

  // --- アフリカ ---
  { c: "eg", ja: "エジプト", en: "Egypt", r: "africa", m: true },
  { c: "ly", ja: "リビア", en: "Libya", r: "africa", m: true },
  { c: "tn", ja: "チュニジア", en: "Tunisia", r: "africa", m: true },
  { c: "dz", ja: "アルジェリア", en: "Algeria", r: "africa", m: true },
  { c: "ma", ja: "モロッコ", en: "Morocco", r: "africa", m: true },
  { c: "sd", ja: "スーダン", en: "Sudan", r: "africa", m: true },
  { c: "ss", ja: "南スーダン", en: "South Sudan", r: "africa" },
  { c: "et", ja: "エチオピア", en: "Ethiopia", r: "africa" },
  { c: "er", ja: "エリトリア", en: "Eritrea", r: "africa" },
  { c: "dj", ja: "ジブチ", en: "Djibouti", r: "africa", m: true },
  { c: "so", ja: "ソマリア", en: "Somalia", r: "africa", m: true },
  { c: "ke", ja: "ケニア", en: "Kenya", r: "africa" },
  { c: "ug", ja: "ウガンダ", en: "Uganda", r: "africa" },
  { c: "tz", ja: "タンザニア", en: "Tanzania", r: "africa" },
  { c: "rw", ja: "ルワンダ", en: "Rwanda", r: "africa" },
  { c: "bi", ja: "ブルンジ", en: "Burundi", r: "africa" },
  { c: "ng", ja: "ナイジェリア", en: "Nigeria", r: "africa" },
  { c: "gh", ja: "ガーナ", en: "Ghana", r: "africa" },
  { c: "ci", ja: "コートジボワール", en: "Cote d'Ivoire", r: "africa" },
  { c: "sn", ja: "セネガル", en: "Senegal", r: "africa", m: true },
  { c: "ml", ja: "マリ", en: "Mali", r: "africa", m: true },
  { c: "ne", ja: "ニジェール", en: "Niger", r: "africa", m: true },
  { c: "bf", ja: "ブルキナファソ", en: "Burkina Faso", r: "africa", m: true },
  { c: "gn", ja: "ギニア", en: "Guinea", r: "africa", m: true },
  { c: "gw", ja: "ギニアビサウ", en: "Guinea-Bissau", r: "africa", m: true },
  { c: "sl", ja: "シエラレオネ", en: "Sierra Leone", r: "africa", m: true },
  { c: "lr", ja: "リベリア", en: "Liberia", r: "africa" },
  { c: "tg", ja: "トーゴ", en: "Togo", r: "africa" },
  { c: "bj", ja: "ベナン", en: "Benin", r: "africa" },
  { c: "mr", ja: "モーリタニア", en: "Mauritania", r: "africa", m: true },
  { c: "gm", ja: "ガンビア", en: "Gambia", r: "africa", m: true },
  { c: "cv", ja: "カーボベルデ", en: "Cape Verde", r: "africa" },
  { c: "cm", ja: "カメルーン", en: "Cameroon", r: "africa" },
  { c: "cf", ja: "中央アフリカ", en: "Central African Republic", r: "africa" },
  { c: "td", ja: "チャド", en: "Chad", r: "africa", m: true },
  { c: "cg", ja: "コンゴ共和国", en: "Republic of the Congo", r: "africa" },
  { c: "cd", ja: "コンゴ民主共和国", en: "DR Congo", r: "africa", a: ["DRコンゴ"] },
  { c: "ga", ja: "ガボン", en: "Gabon", r: "africa" },
  { c: "gq", ja: "赤道ギニア", en: "Equatorial Guinea", r: "africa" },
  { c: "ao", ja: "アンゴラ", en: "Angola", r: "africa" },
  { c: "zm", ja: "ザンビア", en: "Zambia", r: "africa" },
  { c: "mw", ja: "マラウイ", en: "Malawi", r: "africa" },
  { c: "mz", ja: "モザンビーク", en: "Mozambique", r: "africa" },
  { c: "zw", ja: "ジンバブエ", en: "Zimbabwe", r: "africa" },
  { c: "bw", ja: "ボツワナ", en: "Botswana", r: "africa" },
  { c: "na", ja: "ナミビア", en: "Namibia", r: "africa" },
  { c: "za", ja: "南アフリカ", en: "South Africa", r: "africa" },
  { c: "ls", ja: "レソト", en: "Lesotho", r: "africa" },
  { c: "sz", ja: "エスワティニ", en: "Eswatini", r: "africa", a: ["スワジランド"] },
  { c: "mg", ja: "マダガスカル", en: "Madagascar", r: "africa" },
  { c: "mu", ja: "モーリシャス", en: "Mauritius", r: "africa" },
  { c: "sc", ja: "セーシェル", en: "Seychelles", r: "africa" },
  { c: "km", ja: "コモロ", en: "Comoros", r: "africa", m: true },
  { c: "st", ja: "サントメ・プリンシペ", en: "Sao Tome and Principe", r: "africa" },

  // --- 北米・中米・カリブ ---
  { c: "us", ja: "アメリカ", en: "United States", r: "namerica", a: ["アメリカ合衆国", "米国", "USA"] },
  { c: "ca", ja: "カナダ", en: "Canada", r: "namerica" },
  { c: "mx", ja: "メキシコ", en: "Mexico", r: "namerica" },
  { c: "gt", ja: "グアテマラ", en: "Guatemala", r: "namerica" },
  { c: "bz", ja: "ベリーズ", en: "Belize", r: "namerica" },
  { c: "sv", ja: "エルサルバドル", en: "El Salvador", r: "namerica" },
  { c: "hn", ja: "ホンジュラス", en: "Honduras", r: "namerica" },
  { c: "ni", ja: "ニカラグア", en: "Nicaragua", r: "namerica" },
  { c: "cr", ja: "コスタリカ", en: "Costa Rica", r: "namerica" },
  { c: "pa", ja: "パナマ", en: "Panama", r: "namerica" },
  { c: "cu", ja: "キューバ", en: "Cuba", r: "namerica" },
  { c: "jm", ja: "ジャマイカ", en: "Jamaica", r: "namerica" },
  { c: "ht", ja: "ハイチ", en: "Haiti", r: "namerica" },
  { c: "do", ja: "ドミニカ共和国", en: "Dominican Republic", r: "namerica" },
  { c: "bs", ja: "バハマ", en: "Bahamas", r: "namerica" },
  { c: "tt", ja: "トリニダード・トバゴ", en: "Trinidad and Tobago", r: "namerica" },
  { c: "bb", ja: "バルバドス", en: "Barbados", r: "namerica" },
  { c: "gd", ja: "グレナダ", en: "Grenada", r: "namerica" },
  { c: "lc", ja: "セントルシア", en: "Saint Lucia", r: "namerica" },
  { c: "vc", ja: "セントビンセント", en: "Saint Vincent and the Grenadines", r: "namerica" },
  { c: "ag", ja: "アンティグア・バーブーダ", en: "Antigua and Barbuda", r: "namerica" },
  { c: "dm", ja: "ドミニカ国", en: "Dominica", r: "namerica" },
  { c: "kn", ja: "セントクリストファー・ネイビス", en: "Saint Kitts and Nevis", r: "namerica" },

  // --- 南米 ---
  { c: "br", ja: "ブラジル", en: "Brazil", r: "samerica" },
  { c: "ar", ja: "アルゼンチン", en: "Argentina", r: "samerica" },
  { c: "cl", ja: "チリ", en: "Chile", r: "samerica" },
  { c: "pe", ja: "ペルー", en: "Peru", r: "samerica" },
  { c: "co", ja: "コロンビア", en: "Colombia", r: "samerica" },
  { c: "ve", ja: "ベネズエラ", en: "Venezuela", r: "samerica" },
  { c: "ec", ja: "エクアドル", en: "Ecuador", r: "samerica" },
  { c: "bo", ja: "ボリビア", en: "Bolivia", r: "samerica" },
  { c: "py", ja: "パラグアイ", en: "Paraguay", r: "samerica" },
  { c: "uy", ja: "ウルグアイ", en: "Uruguay", r: "samerica" },
  { c: "gy", ja: "ガイアナ", en: "Guyana", r: "samerica" },
  { c: "sr", ja: "スリナム", en: "Suriname", r: "samerica" },

  // --- オセアニア ---
  { c: "au", ja: "オーストラリア", en: "Australia", r: "oceania" },
  { c: "nz", ja: "ニュージーランド", en: "New Zealand", r: "oceania" },
  { c: "pg", ja: "パプアニューギニア", en: "Papua New Guinea", r: "oceania" },
  { c: "fj", ja: "フィジー", en: "Fiji", r: "oceania" },
  { c: "sb", ja: "ソロモン諸島", en: "Solomon Islands", r: "oceania" },
  { c: "vu", ja: "バヌアツ", en: "Vanuatu", r: "oceania" },
  { c: "ws", ja: "サモア", en: "Samoa", r: "oceania" },
  { c: "to", ja: "トンガ", en: "Tonga", r: "oceania" },
  { c: "ki", ja: "キリバス", en: "Kiribati", r: "oceania" },
  { c: "tv", ja: "ツバル", en: "Tuvalu", r: "oceania" },
  { c: "nr", ja: "ナウル", en: "Nauru", r: "oceania" },
  { c: "fm", ja: "ミクロネシア", en: "Micronesia", r: "oceania" },
  { c: "mh", ja: "マーシャル諸島", en: "Marshall Islands", r: "oceania" },
  { c: "pw", ja: "パラオ", en: "Palau", r: "oceania" },
];

const BY_CODE = Object.fromEntries(COUNTRIES.map((x) => [x.c, x]));

// 国旗は data URI として埋め込み（CSPで外部画像が不可のためオフライン描画）
// 国旗画像は flagcdn.com（flagpedia.net）の CDN から読み込む。
// コードは ISO 3166-1 alpha-2（小文字）。コソボ(xk)も対応。
const flagUrl = (code) => `https://flagcdn.com/w320/${code}.png`;

// ===== 間隔反復（Leitner, 実時間ベース） =====
const DAY = 86400000;
// 箱レベル0..5 に対応する「次に出すまでの日数」。0 は当日中（再学習）。
const INTERVALS = [0, 1, 3, 7, 14, 30];
const maxBox = INTERVALS.length - 1;
function dueAfter(box) {
  return Date.now() + INTERVALS[Math.min(box, maxBox)] * DAY;
}

// ===== 記憶フック（間違えた時に表示。混同しやすい旗を中心に用意） =====
const HOOKS = {
  jp: "白地に赤い丸（日の丸）。",
  bd: "緑地に赤い丸。日の丸の色違いで、丸はやや左寄り。",
  pw: "水色地に黄色い丸。日の丸の配色違い。",
  kr: "白地に赤青の太極＋四隅に黒い卦。",
  id: "赤(上)白(下)の横二色。ポーランドは上下逆、モナコは同配色で旗が横長。",
  mc: "赤(上)白(下)。インドネシアと同じ配色で、旗が横長。",
  pl: "白(上)赤(下)。インドネシアの上下を逆にした配色。",
  nl: "赤白青の横三色。ルクセンブルクは同配色だが青が明るく旗が横長。",
  lu: "オランダそっくり。青が明るい水色で、旗が少し横長。",
  ru: "上から白・青・赤の横三色。",
  td: "青黄赤の縦三色。ルーマニアとほぼ同じ（チャドの青の方が濃い）。",
  ro: "青黄赤の縦三色。チャドとほぼ同じ。",
  ml: "緑黄赤の縦三色（左が緑）。ギニアは左右逆（左が赤）。",
  gn: "赤黄緑の縦三色（左が赤）。マリの左右逆。セネガルは中央に緑の星。",
  sn: "緑黄赤の縦三色＋中央に緑の星。マリに星を足した形。",
  ie: "緑白橙の縦三色（左が緑）。コートジボワールは左右逆（左が橙）。",
  ci: "橙白緑の縦三色（左が橙）。アイルランドの左右逆。",
  it: "緑白赤の縦三色。",
  si: "白青赤＋左上に紋章（山と星）。スロバキアは紋章が中央寄りで二重十字。",
  sk: "白青赤＋紋章（白い二重十字と三つの山）。スロベニアより紋章が中央寄り。",
  hr: "白青赤＋中央に市松模様の紋章。",
  rs: "赤青白＋左寄りに双頭の鷲の紋章。",
  au: "左上にユニオンジャック＋大きな星、右に南十字星。",
  nz: "オーストラリアに似るが、星は赤く白縁で4つ（数が少ない）。",
  ch: "赤地に白い十字（正方形に近い）。",
  dk: "赤地に白い北欧十字（左寄り）。北欧十字の元祖。",
  fi: "白地に青い北欧十字。",
  se: "青地に黄色い北欧十字。",
  no: "赤地に白縁の青い北欧十字。",
  is: "青地に白縁の赤い北欧十字。",
  gb: "ユニオンジャック（赤・白・青の重なる十字）。",
  us: "赤白のストライプ＋左上に50の星。",
  br: "緑地に黄色い菱形、中央に青い天球と帯。",
  ca: "白地に赤いカエデの葉、両端が赤帯。",
  in: "橙白緑の横三色＋中央に青い法輪（チャクラ）。",
  ne: "橙白緑の横三色＋中央に橙の丸。インドに似るが法輪でなく丸。",
  za: "Y字型に緑・黒・金・白・赤・青の多色。",
  mz: "三色＋赤い三角に星・本・銃。",
  ke: "黒赤緑の横帯＋中央にマサイの盾と槍。",
  sa: "緑地に白いアラビア文字（信仰告白）と剣。",
  mx: "緑白赤の縦三色＋中央に鷲とサボテンの紋章。",
  ar: "水色・白・水色の横三色＋中央に太陽（五月の太陽）。",
  uy: "白地に青の横ストライプ＋左上に太陽。",
  pt: "緑(細)赤の縦＋境目に天球と盾の紋章。",
  es: "赤黄赤の横帯（黄が太い）＋左に紋章。",
  de: "黒赤金の横三色。",
  be: "黒黄赤の縦三色。ドイツの色を縦にした並び。",
  co: "黄(太)青赤の横帯。",
  ec: "黄(太)青赤＋中央に紋章。コロンビアに紋章を足した形。",
  ve: "黄青赤の横三色＋中央に星の弧。",
  ph: "青(上)赤(下)＋左に白い三角に太陽と3つの星。戦時は赤が上。",
  gr: "青白の横ストライプ9本＋左上に白十字。",
  il: "白地に青の横帯2本＋中央にダビデの星。",
  eg: "赤白黒の横三色＋中央に金のサラディンの鷲。",
  iq: "赤白黒の横三色＋中央に緑のアラビア文字。",
  sy: "赤白黒の横三色＋中央に緑の星2つ。",
  ye: "赤白黒の横三色（紋章なし）。",
  jo: "黒白緑の横三色＋左に赤い三角と白い星。",
  ps: "黒白緑の横三色＋左に赤い三角（星なし）。ヨルダンに似る。",
  sd: "赤白黒の横三色＋左に緑の三角。",
  ae: "左に赤の縦帯＋緑白黒の横三色。",
  kw: "緑白赤の横三色＋左に黒い台形。",
  tr: "赤地に白い三日月と星。",
  tn: "赤地に中央の白丸＋中に赤い三日月と星。",
  dz: "緑白の縦半分＋中央に赤い三日月と星。",
  pk: "緑地に白い三日月と星＋左に白い縦帯。",
  my: "赤白のストライプ＋左上の青に黄色い三日月と星。",
  mr: "緑地に黄色い三日月と星＋上下に赤帯。",
  np: "世界で唯一の非長方形。三角形を2つ重ねた形。",
  bt: "斜めに黄と橙、中央に白い龍。",
  lk: "えんじ色地に金のライオンと剣＋左に緑と橙の帯。",
  cy: "白地に銅色の島のシルエット＋下に緑のオリーブ2枝。",
  xk: "青地に金の国土の形＋6つの白い星。",
  ba: "青地に黄色い三角＋斜めに星の列。",
  cn: "赤地に黄色い大きな星＋小さな星4つ。",
  vn: "赤地に黄色い星1つ。",
};

// ===== 各国の基本情報（オフライン埋め込み: world-countries + 人口は概数） =====
const INFO = {"ad":{"cap":"Andorra la Vella","pop":77006,"area":468,"langs":["Catalan"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southern Europe"},"ae":{"cap":"Abu Dhabi","pop":9630959,"area":83600,"langs":["Arabic"],"cur":[{"n":"United Arab Emirates dirham","s":"\u062f.\u0625"}],"sub":"Western Asia"},"af":{"cap":"Kabul","pop":37172386,"area":652230,"langs":["Dari","Pashto","Turkmen"],"cur":[{"n":"Afghan afghani","s":"\u060b"}],"sub":"Southern Asia"},"ag":{"cap":"Saint John's","pop":96286,"area":442,"langs":["English"],"cur":[{"n":"Eastern Caribbean dollar","s":"$"}],"sub":"Caribbean"},"al":{"cap":"Tirana","pop":2866376,"area":28748,"langs":["Albanian"],"cur":[{"n":"Albanian lek","s":"L"}],"sub":"Southeast Europe"},"am":{"cap":"Yerevan","pop":2951776,"area":29743,"langs":["Armenian"],"cur":[{"n":"Armenian dram","s":"\u058f"}],"sub":"Western Asia"},"ao":{"cap":"Luanda","pop":30809762,"area":1246700,"langs":["Portuguese"],"cur":[{"n":"Angolan kwanza","s":"Kz"}],"sub":"Middle Africa"},"ar":{"cap":"Buenos Aires","pop":44494502,"area":2780400,"langs":["Guaran\u00ed","Spanish"],"cur":[{"n":"Argentine peso","s":"$"}],"sub":"South America"},"at":{"cap":"Vienna","pop":8840521,"area":83871,"langs":["Austro-Bavarian German"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Central Europe"},"au":{"cap":"Canberra","pop":24982688,"area":7692024,"langs":["English"],"cur":[{"n":"Australian dollar","s":"$"}],"sub":"Australia and New Zealand"},"az":{"cap":"Baku","pop":9939800,"area":86600,"langs":["Azerbaijani","Russian"],"cur":[{"n":"Azerbaijani manat","s":"\u20bc"}],"sub":"Western Asia"},"ba":{"cap":"Sarajevo","pop":3323929,"area":51209,"langs":["Bosnian","Croatian","Serbian"],"cur":[{"n":"Bosnia and Herzegovina convertible mark","s":"KM"}],"sub":"Southeast Europe"},"bb":{"cap":"Bridgetown","pop":286641,"area":430,"langs":["English"],"cur":[{"n":"Barbadian dollar","s":"$"}],"sub":"Caribbean"},"bd":{"cap":"Dhaka","pop":161356039,"area":147570,"langs":["Bengali"],"cur":[{"n":"Bangladeshi taka","s":"\u09f3"}],"sub":"Southern Asia"},"be":{"cap":"Brussels","pop":11433256,"area":30528,"langs":["German","French","Dutch"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Western Europe"},"bf":{"cap":"Ouagadougou","pop":19751535,"area":272967,"langs":["French"],"cur":[{"n":"West African CFA franc","s":"Fr"}],"sub":"Western Africa"},"bg":{"cap":"Sofia","pop":7025037,"area":110879,"langs":["Bulgarian"],"cur":[{"n":"Bulgarian lev","s":"\u043b\u0432"}],"sub":"Southeast Europe"},"bh":{"cap":"Manama","pop":1569439,"area":765,"langs":["Arabic"],"cur":[{"n":"Bahraini dinar","s":".\u062f.\u0628"}],"sub":"Western Asia"},"bi":{"cap":"Gitega","pop":11175378,"area":27834,"langs":["French","Kirundi"],"cur":[{"n":"Burundian franc","s":"Fr"}],"sub":"Eastern Africa"},"bj":{"cap":"Porto-Novo","pop":11485048,"area":112622,"langs":["French"],"cur":[{"n":"West African CFA franc","s":"Fr"}],"sub":"Western Africa"},"bn":{"cap":"Bandar Seri Begawan","pop":428962,"area":5765,"langs":["Malay"],"cur":[{"n":"Brunei dollar","s":"$"},{"n":"Singapore dollar","s":"$"}],"sub":"South-Eastern Asia"},"bo":{"cap":"Sucre","pop":11353142,"area":1098581,"langs":["Aymara","Guaran\u00ed","Quechua","Spanish"],"cur":[{"n":"Bolivian boliviano","s":"Bs."}],"sub":"South America"},"br":{"cap":"Bras\u00edlia","pop":209469333,"area":8515767,"langs":["Portuguese"],"cur":[{"n":"Brazilian real","s":"R$"}],"sub":"South America"},"bs":{"cap":"Nassau","pop":385640,"area":13943,"langs":["English"],"cur":[{"n":"Bahamian dollar","s":"$"},{"n":"United States dollar","s":"$"}],"sub":"Caribbean"},"bt":{"cap":"Thimphu","pop":754394,"area":38394,"langs":["Dzongkha"],"cur":[{"n":"Bhutanese ngultrum","s":"Nu."},{"n":"Indian rupee","s":"\u20b9"}],"sub":"Southern Asia"},"bw":{"cap":"Gaborone","pop":2254126,"area":582000,"langs":["English","Tswana"],"cur":[{"n":"Botswana pula","s":"P"}],"sub":"Southern Africa"},"by":{"cap":"Minsk","pop":9483499,"area":207600,"langs":["Belarusian","Russian"],"cur":[{"n":"Belarusian ruble","s":"Br"}],"sub":"Eastern Europe"},"bz":{"cap":"Belmopan","pop":383071,"area":22966,"langs":["Belizean Creole","English","Spanish"],"cur":[{"n":"Belize dollar","s":"$"}],"sub":"Central America"},"ca":{"cap":"Ottawa","pop":37057765,"area":9984670,"langs":["English","French"],"cur":[{"n":"Canadian dollar","s":"$"}],"sub":"North America"},"cd":{"cap":"Kinshasa","pop":99000000,"area":2344858,"langs":["French","Kikongo","Lingala","Tshiluba","Swahili"],"cur":[{"n":"Congolese franc","s":"FC"}],"sub":"Middle Africa"},"cf":{"cap":"Bangui","pop":4666377,"area":622984,"langs":["French","Sango"],"cur":[{"n":"Central African CFA franc","s":"Fr"}],"sub":"Middle Africa"},"cg":{"cap":"Brazzaville","pop":5244363,"area":342000,"langs":["French","Kikongo","Lingala"],"cur":[{"n":"Central African CFA franc","s":"Fr"}],"sub":"Middle Africa"},"ch":{"cap":"Bern","pop":8513227,"area":41284,"langs":["French","Swiss German","Italian","Romansh"],"cur":[{"n":"Swiss franc","s":"Fr."}],"sub":"Western Europe"},"ci":{"cap":"Yamoussoukro","pop":25069229,"area":322463,"langs":["French"],"cur":[{"n":"West African CFA franc","s":"Fr"}],"sub":"Western Africa"},"cl":{"cap":"Santiago","pop":18729160,"area":756102,"langs":["Spanish"],"cur":[{"n":"Chilean peso","s":"$"}],"sub":"South America"},"cm":{"cap":"Yaound\u00e9","pop":25216237,"area":475442,"langs":["English","French"],"cur":[{"n":"Central African CFA franc","s":"Fr"}],"sub":"Middle Africa"},"cn":{"cap":"Beijing","pop":1392730000,"area":9706961,"langs":["Chinese"],"cur":[{"n":"Chinese yuan","s":"\u00a5"}],"sub":"Eastern Asia"},"co":{"cap":"Bogot\u00e1","pop":49648685,"area":1141748,"langs":["Spanish"],"cur":[{"n":"Colombian peso","s":"$"}],"sub":"South America"},"cr":{"cap":"San Jos\u00e9","pop":4999441,"area":51100,"langs":["Spanish"],"cur":[{"n":"Costa Rican col\u00f3n","s":"\u20a1"}],"sub":"Central America"},"cu":{"cap":"Havana","pop":11338138,"area":109884,"langs":["Spanish"],"cur":[{"n":"Cuban convertible peso","s":"$"},{"n":"Cuban peso","s":"$"}],"sub":"Caribbean"},"cv":{"cap":"Praia","pop":550000,"area":4033,"langs":["Portuguese"],"cur":[{"n":"Cape Verdean escudo","s":"Esc"}],"sub":"Western Africa"},"cy":{"cap":"Nicosia","pop":1189265,"area":9251,"langs":["Greek","Turkish"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southern Europe"},"cz":{"cap":"Prague","pop":10629928,"area":78865,"langs":["Czech","Slovak"],"cur":[{"n":"Czech koruna","s":"K\u010d"}],"sub":"Central Europe"},"de":{"cap":"Berlin","pop":82905782,"area":357114,"langs":["German"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Western Europe"},"dj":{"cap":"Djibouti","pop":958920,"area":23200,"langs":["Arabic","French"],"cur":[{"n":"Djiboutian franc","s":"Fr"}],"sub":"Eastern Africa"},"dk":{"cap":"Copenhagen","pop":5793636,"area":43094,"langs":["Danish"],"cur":[{"n":"Danish krone","s":"kr"}],"sub":"Northern Europe"},"dm":{"cap":"Roseau","pop":71625,"area":751,"langs":["English"],"cur":[{"n":"Eastern Caribbean dollar","s":"$"}],"sub":"Caribbean"},"do":{"cap":"Santo Domingo","pop":10627165,"area":48671,"langs":["Spanish"],"cur":[{"n":"Dominican peso","s":"$"}],"sub":"Caribbean"},"dz":{"cap":"Algiers","pop":42228429,"area":2381741,"langs":["Arabic"],"cur":[{"n":"Algerian dinar","s":"\u062f.\u062c"}],"sub":"Northern Africa"},"ec":{"cap":"Quito","pop":17084357,"area":276841,"langs":["Spanish"],"cur":[{"n":"United States dollar","s":"$"}],"sub":"South America"},"ee":{"cap":"Tallinn","pop":1321977,"area":45227,"langs":["Estonian"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Northern Europe"},"eg":{"cap":"Cairo","pop":98423595,"area":1002450,"langs":["Arabic"],"cur":[{"n":"Egyptian pound","s":"\u00a3"}],"sub":"Northern Africa"},"er":{"cap":"Asmara","pop":6213972,"area":117600,"langs":["Arabic","English","Tigrinya"],"cur":[{"n":"Eritrean nakfa","s":"Nfk"}],"sub":"Eastern Africa"},"es":{"cap":"Madrid","pop":46796540,"area":505992,"langs":["Spanish"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southern Europe"},"et":{"cap":"Addis Ababa","pop":109224559,"area":1104300,"langs":["Amharic"],"cur":[{"n":"Ethiopian birr","s":"Br"}],"sub":"Eastern Africa"},"fi":{"cap":"Helsinki","pop":5515525,"area":338424,"langs":["Finnish","Swedish"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Northern Europe"},"fj":{"cap":"Suva","pop":900000,"area":18272,"langs":["English","Fijian","Fiji Hindi"],"cur":[{"n":"Fijian dollar","s":"$"}],"sub":"Melanesia"},"fm":{"cap":"Palikir","pop":112640,"area":702,"langs":["English"],"cur":[],"sub":"Micronesia"},"fr":{"cap":"Paris","pop":66977107,"area":551695,"langs":["French"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Western Europe"},"ga":{"cap":"Libreville","pop":2119275,"area":267668,"langs":["French"],"cur":[{"n":"Central African CFA franc","s":"Fr"}],"sub":"Middle Africa"},"gb":{"cap":"London","pop":66460344,"area":242900,"langs":["English"],"cur":[{"n":"British pound","s":"\u00a3"}],"sub":"Northern Europe"},"gd":{"cap":"St. George's","pop":111454,"area":344,"langs":["English"],"cur":[{"n":"Eastern Caribbean dollar","s":"$"}],"sub":"Caribbean"},"ge":{"cap":"Tbilisi","pop":3726549,"area":69700,"langs":["Georgian"],"cur":[{"n":"lari","s":"\u20be"}],"sub":"Western Asia"},"gh":{"cap":"Accra","pop":29767108,"area":238533,"langs":["English"],"cur":[{"n":"Ghanaian cedi","s":"\u20b5"}],"sub":"Western Africa"},"gm":{"cap":"Banjul","pop":2280102,"area":10689,"langs":["English"],"cur":[{"n":"dalasi","s":"D"}],"sub":"Western Africa"},"gn":{"cap":"Conakry","pop":12414318,"area":245857,"langs":["French"],"cur":[{"n":"Guinean franc","s":"Fr"}],"sub":"Western Africa"},"gq":{"cap":"Malabo","pop":1308974,"area":28051,"langs":["French","Portuguese","Spanish"],"cur":[{"n":"Central African CFA franc","s":"Fr"}],"sub":"Middle Africa"},"gr":{"cap":"Athens","pop":10731726,"area":131990,"langs":["Greek"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southern Europe"},"gt":{"cap":"Guatemala City","pop":17247807,"area":108889,"langs":["Spanish"],"cur":[{"n":"Guatemalan quetzal","s":"Q"}],"sub":"Central America"},"gw":{"cap":"Bissau","pop":1874309,"area":36125,"langs":["Portuguese","Upper Guinea Creole"],"cur":[{"n":"West African CFA franc","s":"Fr"}],"sub":"Western Africa"},"gy":{"cap":"Georgetown","pop":779004,"area":214969,"langs":["English"],"cur":[{"n":"Guyanese dollar","s":"$"}],"sub":"South America"},"hn":{"cap":"Tegucigalpa","pop":9587522,"area":112492,"langs":["Spanish"],"cur":[{"n":"Honduran lempira","s":"L"}],"sub":"Central America"},"hr":{"cap":"Zagreb","pop":4087843,"area":56594,"langs":["Croatian"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southeast Europe"},"ht":{"cap":"Port-au-Prince","pop":11123176,"area":27750,"langs":["French","Haitian Creole"],"cur":[{"n":"Haitian gourde","s":"G"}],"sub":"Caribbean"},"hu":{"cap":"Budapest","pop":9775564,"area":93028,"langs":["Hungarian"],"cur":[{"n":"Hungarian forint","s":"Ft"}],"sub":"Central Europe"},"id":{"cap":"Jakarta","pop":267663435,"area":1904569,"langs":["Indonesian"],"cur":[{"n":"Indonesian rupiah","s":"Rp"}],"sub":"South-Eastern Asia"},"ie":{"cap":"Dublin","pop":4867309,"area":70273,"langs":["English","Irish"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Northern Europe"},"il":{"cap":"Jerusalem","pop":8882800,"area":20770,"langs":["Arabic","Hebrew"],"cur":[{"n":"Israeli new shekel","s":"\u20aa"}],"sub":"Western Asia"},"in":{"cap":"New Delhi","pop":1352617328,"area":3287590,"langs":["English","Hindi","Tamil"],"cur":[{"n":"Indian rupee","s":"\u20b9"}],"sub":"Southern Asia"},"iq":{"cap":"Baghdad","pop":38433600,"area":438317,"langs":["Arabic","Aramaic","Sorani"],"cur":[{"n":"Iraqi dinar","s":"\u0639.\u062f"}],"sub":"Western Asia"},"ir":{"cap":"Tehran","pop":81800269,"area":1648195,"langs":["Persian (Farsi)"],"cur":[{"n":"Iranian rial","s":"\ufdfc"}],"sub":"Southern Asia"},"is":{"cap":"Reykjavik","pop":352721,"area":103000,"langs":["Icelandic"],"cur":[{"n":"Icelandic kr\u00f3na","s":"kr"}],"sub":"Northern Europe"},"it":{"cap":"Rome","pop":60421760,"area":301336,"langs":["Italian"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southern Europe"},"jm":{"cap":"Kingston","pop":2934855,"area":10991,"langs":["English","Jamaican Patois"],"cur":[{"n":"Jamaican dollar","s":"$"}],"sub":"Caribbean"},"jo":{"cap":"Amman","pop":9956011,"area":89342,"langs":["Arabic"],"cur":[{"n":"Jordanian dinar","s":"\u062f.\u0627"}],"sub":"Western Asia"},"jp":{"cap":"Tokyo","pop":126529100,"area":377930,"langs":["Japanese"],"cur":[{"n":"Japanese yen","s":"\u00a5"}],"sub":"Eastern Asia"},"ke":{"cap":"Nairobi","pop":51393010,"area":580367,"langs":["English","Swahili"],"cur":[{"n":"Kenyan shilling","s":"Sh"}],"sub":"Eastern Africa"},"kg":{"cap":"Bishkek","pop":6322800,"area":199951,"langs":["Kyrgyz","Russian"],"cur":[{"n":"Kyrgyzstani som","s":"\u0441"}],"sub":"Central Asia"},"kh":{"cap":"Phnom Penh","pop":16249798,"area":181035,"langs":["Khmer"],"cur":[{"n":"Cambodian riel","s":"\u17db"},{"n":"United States dollar","s":"$"}],"sub":"South-Eastern Asia"},"ki":{"cap":"South Tarawa","pop":115847,"area":811,"langs":["English","Gilbertese"],"cur":[{"n":"Australian dollar","s":"$"},{"n":"Kiribati dollar","s":"$"}],"sub":"Micronesia"},"km":{"cap":"Moroni","pop":832322,"area":1862,"langs":["Arabic","French","Comorian"],"cur":[{"n":"Comorian franc","s":"Fr"}],"sub":"Eastern Africa"},"kn":{"cap":"Basseterre","pop":52441,"area":261,"langs":["English"],"cur":[{"n":"Eastern Caribbean dollar","s":"$"}],"sub":"Caribbean"},"kp":{"cap":"Pyongyang","pop":25549819,"area":120538,"langs":["Korean"],"cur":[{"n":"North Korean won","s":"\u20a9"}],"sub":"Eastern Asia"},"kr":{"cap":"Seoul","pop":51606633,"area":100210,"langs":["Korean"],"cur":[{"n":"South Korean won","s":"\u20a9"}],"sub":"Eastern Asia"},"kw":{"cap":"Kuwait City","pop":4137309,"area":17818,"langs":["Arabic"],"cur":[{"n":"Kuwaiti dinar","s":"\u062f.\u0643"}],"sub":"Western Asia"},"kz":{"cap":"Astana","pop":18272430,"area":2724900,"langs":["Kazakh","Russian"],"cur":[{"n":"Kazakhstani tenge","s":"\u20b8"}],"sub":"Central Asia"},"la":{"cap":"Vientiane","pop":7061507,"area":236800,"langs":["Lao"],"cur":[{"n":"Lao kip","s":"\u20ad"}],"sub":"South-Eastern Asia"},"lb":{"cap":"Beirut","pop":6848925,"area":10452,"langs":["Arabic","French"],"cur":[{"n":"Lebanese pound","s":"\u0644.\u0644"}],"sub":"Western Asia"},"lc":{"cap":"Castries","pop":181889,"area":616,"langs":["English"],"cur":[{"n":"Eastern Caribbean dollar","s":"$"}],"sub":"Caribbean"},"li":{"cap":"Vaduz","pop":37910,"area":160,"langs":["German"],"cur":[{"n":"Swiss franc","s":"Fr"}],"sub":"Western Europe"},"lk":{"cap":"Colombo","pop":21670000,"area":65610,"langs":["Sinhala","Tamil"],"cur":[{"n":"Sri Lankan rupee","s":"Rs  \u0dbb\u0dd4"}],"sub":"Southern Asia"},"lr":{"cap":"Monrovia","pop":4818977,"area":111369,"langs":["English"],"cur":[{"n":"Liberian dollar","s":"$"}],"sub":"Western Africa"},"ls":{"cap":"Maseru","pop":2108132,"area":30355,"langs":["English","Sotho"],"cur":[{"n":"Lesotho loti","s":"L"},{"n":"South African rand","s":"R"}],"sub":"Southern Africa"},"lt":{"cap":"Vilnius","pop":2801543,"area":65300,"langs":["Lithuanian"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Northern Europe"},"lu":{"cap":"Luxembourg","pop":607950,"area":2586,"langs":["German","French","Luxembourgish"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Western Europe"},"lv":{"cap":"Riga","pop":1927174,"area":64559,"langs":["Latvian"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Northern Europe"},"ly":{"cap":"Tripoli","pop":6678567,"area":1759540,"langs":["Arabic"],"cur":[{"n":"Libyan dinar","s":"\u0644.\u062f"}],"sub":"Northern Africa"},"ma":{"cap":"Rabat","pop":36029138,"area":446550,"langs":["Arabic","Berber"],"cur":[{"n":"Moroccan dirham","s":"\u062f.\u0645."}],"sub":"Northern Africa"},"mc":{"cap":"Monaco","pop":38682,"area":2.02,"langs":["French"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Western Europe"},"md":{"cap":"Chi\u0219in\u0103u","pop":2706049,"area":33846,"langs":["Moldavian"],"cur":[{"n":"Moldovan leu","s":"L"}],"sub":"Eastern Europe"},"me":{"cap":"Podgorica","pop":631219,"area":13812,"langs":["Montenegrin"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southeast Europe"},"mg":{"cap":"Antananarivo","pop":26262368,"area":587041,"langs":["French","Malagasy"],"cur":[{"n":"Malagasy ariary","s":"Ar"}],"sub":"Eastern Africa"},"mh":{"cap":"Majuro","pop":58413,"area":181,"langs":["English","Marshallese"],"cur":[{"n":"United States dollar","s":"$"}],"sub":"Micronesia"},"mk":{"cap":"Skopje","pop":2084367,"area":25713,"langs":["Macedonian"],"cur":[{"n":"denar","s":"den"}],"sub":"Southeast Europe"},"ml":{"cap":"Bamako","pop":19077690,"area":1240192,"langs":["French"],"cur":[{"n":"West African CFA franc","s":"Fr"}],"sub":"Western Africa"},"mm":{"cap":"Naypyidaw","pop":53708395,"area":676578,"langs":["Burmese"],"cur":[{"n":"Burmese kyat","s":"Ks"}],"sub":"South-Eastern Asia"},"mn":{"cap":"Ulan Bator","pop":3170208,"area":1564110,"langs":["Mongolian"],"cur":[{"n":"Mongolian t\u00f6gr\u00f6g","s":"\u20ae"}],"sub":"Eastern Asia"},"mr":{"cap":"Nouakchott","pop":4403319,"area":1030700,"langs":["Arabic"],"cur":[{"n":"Mauritanian ouguiya","s":"UM"}],"sub":"Western Africa"},"mt":{"cap":"Valletta","pop":484630,"area":316,"langs":["English","Maltese"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southern Europe"},"mu":{"cap":"Port Louis","pop":1265303,"area":2040,"langs":["English","French","Mauritian Creole"],"cur":[{"n":"Mauritian rupee","s":"\u20a8"}],"sub":"Eastern Africa"},"mv":{"cap":"Mal\u00e9","pop":515696,"area":300,"langs":["Maldivian"],"cur":[{"n":"Maldivian rufiyaa","s":".\u0783"}],"sub":"Southern Asia"},"mw":{"cap":"Lilongwe","pop":18143315,"area":118484,"langs":["English","Chewa"],"cur":[{"n":"Malawian kwacha","s":"MK"}],"sub":"Eastern Africa"},"mx":{"cap":"Mexico City","pop":126190788,"area":1964375,"langs":["Spanish"],"cur":[{"n":"Mexican peso","s":"$"}],"sub":"North America"},"my":{"cap":"Kuala Lumpur","pop":31528585,"area":330803,"langs":["English","Malay"],"cur":[{"n":"Malaysian ringgit","s":"RM"}],"sub":"South-Eastern Asia"},"mz":{"cap":"Maputo","pop":29495962,"area":801590,"langs":["Portuguese"],"cur":[{"n":"Mozambican metical","s":"MT"}],"sub":"Eastern Africa"},"na":{"cap":"Windhoek","pop":2448255,"area":825615,"langs":["Afrikaans","German","English","Herero","Khoekhoe","Kwangali","Lozi","Ndonga","Tswana"],"cur":[{"n":"Namibian dollar","s":"$"},{"n":"South African rand","s":"R"}],"sub":"Southern Africa"},"ne":{"cap":"Niamey","pop":22442948,"area":1267000,"langs":["French"],"cur":[{"n":"West African CFA franc","s":"Fr"}],"sub":"Western Africa"},"ng":{"cap":"Abuja","pop":195874740,"area":923768,"langs":["English"],"cur":[{"n":"Nigerian naira","s":"\u20a6"}],"sub":"Western Africa"},"ni":{"cap":"Managua","pop":6465513,"area":130373,"langs":["Spanish"],"cur":[{"n":"Nicaraguan c\u00f3rdoba","s":"C$"}],"sub":"Central America"},"nl":{"cap":"Amsterdam","pop":17231624,"area":41850,"langs":["Dutch"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Western Europe"},"no":{"cap":"Oslo","pop":5311916,"area":323802,"langs":["Norwegian Nynorsk","Norwegian Bokm\u00e5l","Sami"],"cur":[{"n":"Norwegian krone","s":"kr"}],"sub":"Northern Europe"},"np":{"cap":"Kathmandu","pop":28087871,"area":147181,"langs":["Nepali"],"cur":[{"n":"Nepalese rupee","s":"\u20a8"}],"sub":"Southern Asia"},"nr":{"cap":"Yaren","pop":12704,"area":21,"langs":["English","Nauru"],"cur":[{"n":"Australian dollar","s":"$"}],"sub":"Micronesia"},"nz":{"cap":"Wellington","pop":4841000,"area":270467,"langs":["English","M\u0101ori","New Zealand Sign Language"],"cur":[{"n":"New Zealand dollar","s":"$"}],"sub":"Australia and New Zealand"},"om":{"cap":"Muscat","pop":4829483,"area":309500,"langs":["Arabic"],"cur":[{"n":"Omani rial","s":"\u0631.\u0639."}],"sub":"Western Asia"},"pa":{"cap":"Panama City","pop":4176873,"area":75417,"langs":["Spanish"],"cur":[{"n":"Panamanian balboa","s":"B/."},{"n":"United States dollar","s":"$"}],"sub":"Central America"},"pe":{"cap":"Lima","pop":31989256,"area":1285216,"langs":["Aymara","Quechua","Spanish"],"cur":[{"n":"Peruvian sol","s":"S/."}],"sub":"South America"},"pg":{"cap":"Port Moresby","pop":8606316,"area":462840,"langs":["English","Hiri Motu","Tok Pisin"],"cur":[{"n":"Papua New Guinean kina","s":"K"}],"sub":"Melanesia"},"ph":{"cap":"Manila","pop":106651922,"area":342353,"langs":["English","Filipino"],"cur":[{"n":"Philippine peso","s":"\u20b1"}],"sub":"South-Eastern Asia"},"pk":{"cap":"Islamabad","pop":212215030,"area":881912,"langs":["English","Urdu"],"cur":[{"n":"Pakistani rupee","s":"\u20a8"}],"sub":"Southern Asia"},"pl":{"cap":"Warsaw","pop":37974750,"area":312679,"langs":["Polish"],"cur":[{"n":"Polish z\u0142oty","s":"z\u0142"}],"sub":"Central Europe"},"ps":{"cap":"Ramallah","pop":4569087,"area":6220,"langs":["Arabic"],"cur":[{"n":"Egyptian pound","s":"E\u00a3"},{"n":"Israeli new shekel","s":"\u20aa"},{"n":"Jordanian dinar","s":"JD"}],"sub":"Western Asia"},"pt":{"cap":"Lisbon","pop":10283822,"area":92090,"langs":["Portuguese"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southern Europe"},"pw":{"cap":"Ngerulmud","pop":17907,"area":459,"langs":["English","Palauan"],"cur":[{"n":"United States dollar","s":"$"}],"sub":"Micronesia"},"py":{"cap":"Asunci\u00f3n","pop":6956071,"area":406752,"langs":["Guaran\u00ed","Spanish"],"cur":[{"n":"Paraguayan guaran\u00ed","s":"\u20b2"}],"sub":"South America"},"qa":{"cap":"Doha","pop":2781677,"area":11586,"langs":["Arabic"],"cur":[{"n":"Qatari riyal","s":"\u0631.\u0642"}],"sub":"Western Asia"},"ro":{"cap":"Bucharest","pop":19466145,"area":238391,"langs":["Romanian"],"cur":[{"n":"Romanian leu","s":"lei"}],"sub":"Southeast Europe"},"rs":{"cap":"Belgrade","pop":6963764,"area":88361,"langs":["Serbian"],"cur":[{"n":"Serbian dinar","s":"\u0434\u0438\u043d."}],"sub":"Southeast Europe"},"ru":{"cap":"Moscow","pop":144478050,"area":17098242,"langs":["Russian"],"cur":[{"n":"Russian ruble","s":"\u20bd"}],"sub":"Eastern Europe"},"rw":{"cap":"Kigali","pop":12301939,"area":26338,"langs":["English","French","Kinyarwanda"],"cur":[{"n":"Rwandan franc","s":"Fr"}],"sub":"Eastern Africa"},"sa":{"cap":"Riyadh","pop":33699947,"area":2149690,"langs":["Arabic"],"cur":[{"n":"Saudi riyal","s":"\u0631.\u0633"}],"sub":"Western Asia"},"sb":{"cap":"Honiara","pop":652858,"area":28896,"langs":["English"],"cur":[{"n":"Solomon Islands dollar","s":"$"}],"sub":"Melanesia"},"sc":{"cap":"Victoria","pop":96762,"area":452,"langs":["Seychellois Creole","English","French"],"cur":[{"n":"Seychellois rupee","s":"\u20a8"}],"sub":"Eastern Africa"},"sd":{"cap":"Khartoum","pop":41801533,"area":1886068,"langs":["Arabic","English"],"cur":[{"n":"Sudanese pound","s":"PT"}],"sub":"Northern Africa"},"se":{"cap":"Stockholm","pop":10175214,"area":450295,"langs":["Swedish"],"cur":[{"n":"Swedish krona","s":"kr"}],"sub":"Northern Europe"},"sg":{"cap":"Singapore","pop":5638676,"area":710,"langs":["English","Malay","Tamil","Chinese"],"cur":[{"n":"Singapore dollar","s":"$"}],"sub":"South-Eastern Asia"},"si":{"cap":"Ljubljana","pop":2073894,"area":20273,"langs":["Slovene"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Central Europe"},"sk":{"cap":"Bratislava","pop":5446771,"area":49037,"langs":["Slovak"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Central Europe"},"sl":{"cap":"Freetown","pop":7650154,"area":71740,"langs":["English"],"cur":[{"n":"Sierra Leonean leone","s":"Le"}],"sub":"Western Africa"},"sm":{"cap":"City of San Marino","pop":33785,"area":61,"langs":["Italian"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southern Europe"},"sn":{"cap":"Dakar","pop":15854360,"area":196722,"langs":["French"],"cur":[{"n":"West African CFA franc","s":"Fr"}],"sub":"Western Africa"},"so":{"cap":"Mogadishu","pop":15008154,"area":637657,"langs":["Arabic","Somali"],"cur":[{"n":"Somali shilling","s":"Sh"}],"sub":"Eastern Africa"},"sr":{"cap":"Paramaribo","pop":575991,"area":163820,"langs":["Dutch"],"cur":[{"n":"Surinamese dollar","s":"$"}],"sub":"South America"},"ss":{"cap":"Juba","pop":10975920,"area":619745,"langs":["English"],"cur":[{"n":"South Sudanese pound","s":"\u00a3"}],"sub":"Middle Africa"},"st":{"cap":"S\u00e3o Tom\u00e9","pop":211028,"area":964,"langs":["Portuguese"],"cur":[{"n":"S\u00e3o Tom\u00e9 and Pr\u00edncipe dobra","s":"Db"}],"sub":"Middle Africa"},"sv":{"cap":"San Salvador","pop":6420744,"area":21041,"langs":["Spanish"],"cur":[{"n":"United States dollar","s":"$"}],"sub":"Central America"},"sy":{"cap":"Damascus","pop":16906283,"area":185180,"langs":["Arabic"],"cur":[{"n":"Syrian pound","s":"\u00a3"}],"sub":"Western Asia"},"sz":{"cap":"Lobamba","pop":1136191,"area":17364,"langs":["English","Swazi"],"cur":[{"n":"Swazi lilangeni","s":"L"},{"n":"South African rand","s":"R"}],"sub":"Southern Africa"},"td":{"cap":"N'Djamena","pop":15477751,"area":1284000,"langs":["Arabic","French"],"cur":[{"n":"Central African CFA franc","s":"Fr"}],"sub":"Middle Africa"},"tg":{"cap":"Lom\u00e9","pop":7889094,"area":56785,"langs":["French"],"cur":[{"n":"West African CFA franc","s":"Fr"}],"sub":"Western Africa"},"th":{"cap":"Bangkok","pop":69428524,"area":513120,"langs":["Thai"],"cur":[{"n":"Thai baht","s":"\u0e3f"}],"sub":"South-Eastern Asia"},"tj":{"cap":"Dushanbe","pop":9100837,"area":143100,"langs":["Russian","Tajik"],"cur":[{"n":"Tajikistani somoni","s":"\u0405\u041c"}],"sub":"Central Asia"},"tl":{"cap":"Dili","pop":1267972,"area":14874,"langs":["Portuguese","Tetum"],"cur":[{"n":"United States dollar","s":"$"}],"sub":"South-Eastern Asia"},"tm":{"cap":"Ashgabat","pop":5850908,"area":488100,"langs":["Russian","Turkmen"],"cur":[{"n":"Turkmenistan manat","s":"m"}],"sub":"Central Asia"},"tn":{"cap":"Tunis","pop":11565204,"area":163610,"langs":["Arabic"],"cur":[{"n":"Tunisian dinar","s":"\u062f.\u062a"}],"sub":"Northern Africa"},"to":{"cap":"Nuku'alofa","pop":103197,"area":747,"langs":["English","Tongan"],"cur":[{"n":"Tongan pa\u02bbanga","s":"T$"}],"sub":"Polynesia"},"tr":{"cap":"Ankara","pop":85000000,"area":783562,"langs":["Turkish"],"cur":[{"n":"Turkish lira","s":"\u20ba"}],"sub":"Western Asia"},"tt":{"cap":"Port of Spain","pop":1389858,"area":5130,"langs":["English"],"cur":[{"n":"Trinidad and Tobago dollar","s":"$"}],"sub":"Caribbean"},"tv":{"cap":"Funafuti","pop":11508,"area":26,"langs":["English","Tuvaluan"],"cur":[{"n":"Australian dollar","s":"$"},{"n":"Tuvaluan dollar","s":"$"}],"sub":"Polynesia"},"tw":{"cap":"Taipei","pop":23400000,"area":36193,"langs":["Chinese"],"cur":[{"n":"New Taiwan dollar","s":"$"}],"sub":"Eastern Asia"},"tz":{"cap":"Dodoma","pop":56318348,"area":945087,"langs":["English","Swahili"],"cur":[{"n":"Tanzanian shilling","s":"Sh"}],"sub":"Eastern Africa"},"ua":{"cap":"Kyiv","pop":44622516,"area":603500,"langs":["Ukrainian"],"cur":[{"n":"Ukrainian hryvnia","s":"\u20b4"}],"sub":"Eastern Europe"},"ug":{"cap":"Kampala","pop":42723139,"area":241550,"langs":["English","Swahili"],"cur":[{"n":"Ugandan shilling","s":"Sh"}],"sub":"Eastern Africa"},"us":{"cap":"Washington D.C.","pop":326687501,"area":9372610,"langs":["English"],"cur":[{"n":"United States dollar","s":"$"}],"sub":"North America"},"uy":{"cap":"Montevideo","pop":3449299,"area":181034,"langs":["Spanish"],"cur":[{"n":"Uruguayan peso","s":"$"}],"sub":"South America"},"uz":{"cap":"Tashkent","pop":32955400,"area":447400,"langs":["Russian","Uzbek"],"cur":[{"n":"Uzbekistani so\u02bbm","s":"so'm"}],"sub":"Central Asia"},"va":{"cap":"Vatican City","pop":825,"area":0.44,"langs":["Italian","Latin"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southern Europe"},"vc":{"cap":"Kingstown","pop":110210,"area":389,"langs":["English"],"cur":[{"n":"Eastern Caribbean dollar","s":"$"}],"sub":"Caribbean"},"ve":{"cap":"Caracas","pop":28870195,"area":916445,"langs":["Spanish"],"cur":[{"n":"Venezuelan bol\u00edvar soberano","s":"Bs.S."}],"sub":"South America"},"vn":{"cap":"Hanoi","pop":95540395,"area":331212,"langs":["Vietnamese"],"cur":[{"n":"Vietnamese \u0111\u1ed3ng","s":"\u20ab"}],"sub":"South-Eastern Asia"},"vu":{"cap":"Port Vila","pop":292680,"area":12189,"langs":["Bislama","English","French"],"cur":[{"n":"Vanuatu vatu","s":"Vt"}],"sub":"Melanesia"},"ws":{"cap":"Apia","pop":196130,"area":2842,"langs":["English","Samoan"],"cur":[{"n":"Samoan t\u0101l\u0101","s":"T"}],"sub":"Polynesia"},"xk":{"cap":"Pristina","pop":1800000,"area":10908,"langs":["Albanian","Serbian"],"cur":[{"n":"Euro","s":"\u20ac"}],"sub":"Southeast Europe"},"ye":{"cap":"Sana'a","pop":28498687,"area":527968,"langs":["Arabic"],"cur":[{"n":"Yemeni rial","s":"\ufdfc"}],"sub":"Western Asia"},"za":{"cap":"Pretoria, Bloemfontein, Cape Town","pop":57779622,"area":1221037,"langs":["Afrikaans","English","Southern Ndebele","Northern Sotho","Southern Sotho","Swazi","Tswana","Tsonga","Venda","Xhosa","Zulu"],"cur":[{"n":"South African rand","s":"R"}],"sub":"Southern Africa"},"zm":{"cap":"Lusaka","pop":17351822,"area":752612,"langs":["English"],"cur":[{"n":"Zambian kwacha","s":"ZK"}],"sub":"Eastern Africa"},"zw":{"cap":"Harare","pop":14439018,"area":390757,"langs":["Chibarwe","English","Kalanga","Khoisan","Ndau","Northern Ndebele","Chewa","Shona","Sotho","Tonga","Tswana","Tsonga","Venda","Xhosa","Zimbabwean Sign Language"],"cur":[{"n":"Botswana pula","s":"P"},{"n":"Chinese yuan","s":"\u00a5"},{"n":"Euro","s":"\u20ac"},{"n":"British pound","s":"\u00a3"},{"n":"Indian rupee","s":"\u20b9"},{"n":"Japanese yen","s":"\u00a5"},{"n":"United States dollar","s":"$"},{"n":"South African rand","s":"Rs"},{"n":"Zimbabwean bonds","s":"$"}],"sub":"Eastern Africa"}};
const LANG_JA = {"English":"\u82f1\u8a9e","Japanese":"\u65e5\u672c\u8a9e","Chinese":"\u4e2d\u56fd\u8a9e","Korean":"\u97d3\u56fd\u8a9e","Spanish":"\u30b9\u30da\u30a4\u30f3\u8a9e","French":"\u30d5\u30e9\u30f3\u30b9\u8a9e","German":"\u30c9\u30a4\u30c4\u8a9e","Italian":"\u30a4\u30bf\u30ea\u30a2\u8a9e","Portuguese":"\u30dd\u30eb\u30c8\u30ac\u30eb\u8a9e","Dutch":"\u30aa\u30e9\u30f3\u30c0\u8a9e","Russian":"\u30ed\u30b7\u30a2\u8a9e","Arabic":"\u30a2\u30e9\u30d3\u30a2\u8a9e","Hindi":"\u30d2\u30f3\u30c7\u30a3\u30fc\u8a9e","Bengali":"\u30d9\u30f3\u30ac\u30eb\u8a9e","Urdu":"\u30a6\u30eb\u30c9\u30a5\u30fc\u8a9e","Persian (Farsi)":"\u30da\u30eb\u30b7\u30e3\u8a9e","Dari":"\u30c0\u30ea\u30fc\u8a9e","Pashto":"\u30d1\u30b7\u30e5\u30c8\u30fc\u8a9e","Turkish":"\u30c8\u30eb\u30b3\u8a9e","Thai":"\u30bf\u30a4\u8a9e","Vietnamese":"\u30d9\u30c8\u30ca\u30e0\u8a9e","Indonesian":"\u30a4\u30f3\u30c9\u30cd\u30b7\u30a2\u8a9e","Malay":"\u30de\u30ec\u30fc\u8a9e","Filipino":"\u30d5\u30a3\u30ea\u30d4\u30ce\u8a9e","Khmer":"\u30af\u30e1\u30fc\u30eb\u8a9e","Lao":"\u30e9\u30aa\u8a9e","Burmese":"\u30d3\u30eb\u30de\u8a9e","Nepali":"\u30cd\u30d1\u30fc\u30eb\u8a9e","Sinhala":"\u30b7\u30f3\u30cf\u30e9\u8a9e","Tamil":"\u30bf\u30df\u30eb\u8a9e","Mongolian":"\u30e2\u30f3\u30b4\u30eb\u8a9e","Kazakh":"\u30ab\u30b6\u30d5\u8a9e","Uzbek":"\u30a6\u30ba\u30d9\u30af\u8a9e","Kyrgyz":"\u30ad\u30eb\u30ae\u30b9\u8a9e","Tajik":"\u30bf\u30b8\u30af\u8a9e","Turkmen":"\u30c8\u30eb\u30af\u30e1\u30f3\u8a9e","Azerbaijani":"\u30a2\u30bc\u30eb\u30d0\u30a4\u30b8\u30e3\u30f3\u8a9e","Armenian":"\u30a2\u30eb\u30e1\u30cb\u30a2\u8a9e","Georgian":"\u30b8\u30e7\u30fc\u30b8\u30a2\u8a9e","Hebrew":"\u30d8\u30d6\u30e9\u30a4\u8a9e","Dzongkha":"\u30be\u30f3\u30ab\u8a9e","Maldivian":"\u30c7\u30a3\u30d9\u30d2\u8a9e","Greek":"\u30ae\u30ea\u30b7\u30e3\u8a9e","Polish":"\u30dd\u30fc\u30e9\u30f3\u30c9\u8a9e","Czech":"\u30c1\u30a7\u30b3\u8a9e","Slovak":"\u30b9\u30ed\u30d0\u30ad\u30a2\u8a9e","Hungarian":"\u30cf\u30f3\u30ac\u30ea\u30fc\u8a9e","Romanian":"\u30eb\u30fc\u30de\u30cb\u30a2\u8a9e","Moldavian":"\u30e2\u30eb\u30c9\u30d0\u8a9e","Bulgarian":"\u30d6\u30eb\u30ac\u30ea\u30a2\u8a9e","Croatian":"\u30af\u30ed\u30a2\u30c1\u30a2\u8a9e","Serbian":"\u30bb\u30eb\u30d3\u30a2\u8a9e","Slovene":"\u30b9\u30ed\u30d9\u30cb\u30a2\u8a9e","Bosnian":"\u30dc\u30b9\u30cb\u30a2\u8a9e","Macedonian":"\u30de\u30b1\u30c9\u30cb\u30a2\u8a9e","Montenegrin":"\u30e2\u30f3\u30c6\u30cd\u30b0\u30ed\u8a9e","Albanian":"\u30a2\u30eb\u30d0\u30cb\u30a2\u8a9e","Ukrainian":"\u30a6\u30af\u30e9\u30a4\u30ca\u8a9e","Belarusian":"\u30d9\u30e9\u30eb\u30fc\u30b7\u8a9e","Lithuanian":"\u30ea\u30c8\u30a2\u30cb\u30a2\u8a9e","Latvian":"\u30e9\u30c8\u30d3\u30a2\u8a9e","Estonian":"\u30a8\u30b9\u30c8\u30cb\u30a2\u8a9e","Finnish":"\u30d5\u30a3\u30f3\u30e9\u30f3\u30c9\u8a9e","Swedish":"\u30b9\u30a6\u30a7\u30fc\u30c7\u30f3\u8a9e","Danish":"\u30c7\u30f3\u30de\u30fc\u30af\u8a9e","Norwegian Bokm\u00e5l":"\u30ce\u30eb\u30a6\u30a7\u30fc\u8a9e","Norwegian Nynorsk":"\u30ce\u30eb\u30a6\u30a7\u30fc\u8a9e(\u30cb\u30fc\u30ce\u30b7\u30e5\u30af)","Icelandic":"\u30a2\u30a4\u30b9\u30e9\u30f3\u30c9\u8a9e","Irish":"\u30a2\u30a4\u30eb\u30e9\u30f3\u30c9\u8a9e","Luxembourgish":"\u30eb\u30af\u30bb\u30f3\u30d6\u30eb\u30af\u8a9e","Maltese":"\u30de\u30eb\u30bf\u8a9e","Catalan":"\u30ab\u30bf\u30eb\u30fc\u30cb\u30e3\u8a9e","Romansh":"\u30ed\u30de\u30f3\u30b7\u30e5\u8a9e","Swiss German":"\u30b9\u30a4\u30b9\u30c9\u30a4\u30c4\u8a9e","Austro-Bavarian German":"\u30aa\u30fc\u30b9\u30c8\u30ea\u30a2\u30fb\u30d0\u30a4\u30a8\u30eb\u30f3\u8a9e","Latin":"\u30e9\u30c6\u30f3\u8a9e","Swahili":"\u30b9\u30ef\u30d2\u30ea\u8a9e","Amharic":"\u30a2\u30e0\u30cf\u30e9\u8a9e","Somali":"\u30bd\u30de\u30ea\u8a9e","Tigrinya":"\u30c6\u30a3\u30b0\u30ea\u30cb\u30e3\u8a9e","Malagasy":"\u30de\u30c0\u30ac\u30b9\u30ab\u30eb\u8a9e","Afrikaans":"\u30a2\u30d5\u30ea\u30ab\u30fc\u30f3\u30b9\u8a9e","Zulu":"\u30ba\u30fc\u30eb\u30fc\u8a9e","Xhosa":"\u30b3\u30b5\u8a9e","Kinyarwanda":"\u30eb\u30ef\u30f3\u30c0\u8a9e","Kirundi":"\u30eb\u30f3\u30c7\u30a3\u8a9e","Berber":"\u30d9\u30eb\u30d9\u30eb\u8a9e","Comorian":"\u30b3\u30e2\u30ed\u8a9e","Haitian Creole":"\u30cf\u30a4\u30c1\u30fb\u30af\u30ec\u30aa\u30fc\u30eb\u8a9e","Guaran\u00ed":"\u30b0\u30a2\u30e9\u30cb\u30fc\u8a9e","Quechua":"\u30b1\u30c1\u30e5\u30a2\u8a9e","Aymara":"\u30a2\u30a4\u30de\u30e9\u8a9e","Samoan":"\u30b5\u30e2\u30a2\u8a9e","Tongan":"\u30c8\u30f3\u30ac\u8a9e","Fijian":"\u30d5\u30a3\u30b8\u30fc\u8a9e","M\u0101ori":"\u30de\u30aa\u30ea\u8a9e","Bislama":"\u30d3\u30b9\u30e9\u30de\u8a9e","Tetum":"\u30c6\u30c8\u30a5\u30f3\u8a9e","Palauan":"\u30d1\u30e9\u30aa\u8a9e","Marshallese":"\u30de\u30fc\u30b7\u30e3\u30eb\u8a9e","Gilbertese":"\u30ae\u30eb\u30d0\u30fc\u30c8\u8a9e","Nauru":"\u30ca\u30a6\u30eb\u8a9e","Tuvaluan":"\u30c4\u30d0\u30eb\u8a9e","Tok Pisin":"\u30c8\u30af\u30d4\u30b7\u30f3","Hiri Motu":"\u30d2\u30ea\u30e2\u30c8\u30a5\u8a9e","Sango":"\u30b5\u30f3\u30b4\u8a9e","Lingala":"\u30ea\u30f3\u30ac\u30e9\u8a9e","Kikongo":"\u30b3\u30f3\u30b4\u8a9e","Tshiluba":"\u30c1\u30eb\u30d0\u8a9e","Tswana":"\u30c4\u30ef\u30ca\u8a9e","Southern Sotho":"\u5357\u30bd\u30c8\u8a9e","Sotho":"\u30bd\u30c8\u8a9e","Northern Sotho":"\u5317\u30bd\u30c8\u8a9e","Swazi":"\u30b9\u30ef\u30b8\u8a9e","Shona":"\u30b7\u30e7\u30ca\u8a9e","Northern Ndebele":"\u5317\u30f3\u30c7\u30d9\u30ec\u8a9e","Southern Ndebele":"\u5357\u30f3\u30c7\u30d9\u30ec\u8a9e","Sorani":"\u30bd\u30e9\u30cb\u30fc\u8a9e","Aramaic":"\u30a2\u30e9\u30e0\u8a9e","Hausa":"\u30cf\u30a6\u30b5\u8a9e"};
const CUR_JA = {"Japanese yen":"\u5186","United States dollar":"\u7c73\u30c9\u30eb","Euro":"\u30e6\u30fc\u30ed","British pound":"\u82f1\u30dd\u30f3\u30c9","Chinese yuan":"\u4eba\u6c11\u5143","South Korean won":"\u97d3\u56fd\u30a6\u30a9\u30f3","North Korean won":"\u5317\u671d\u9bae\u30a6\u30a9\u30f3","New Taiwan dollar":"\u65b0\u53f0\u6e7e\u30c9\u30eb","Indian rupee":"\u30a4\u30f3\u30c9\u30fb\u30eb\u30d4\u30fc","Russian ruble":"\u30ed\u30b7\u30a2\u30fb\u30eb\u30fc\u30d6\u30eb","Swiss franc":"\u30b9\u30a4\u30b9\u30fb\u30d5\u30e9\u30f3","Canadian dollar":"\u30ab\u30ca\u30c0\u30c9\u30eb","Australian dollar":"\u8c6a\u30c9\u30eb","New Zealand dollar":"NZ\u30c9\u30eb","Brazilian real":"\u30d6\u30e9\u30b8\u30eb\u30fb\u30ec\u30a2\u30eb","Mexican peso":"\u30e1\u30ad\u30b7\u30b3\u30fb\u30da\u30bd","Thai baht":"\u30bf\u30a4\u30fb\u30d0\u30fc\u30c4","Singapore dollar":"\u30b7\u30f3\u30ac\u30dd\u30fc\u30eb\u30c9\u30eb","Indonesian rupiah":"\u30a4\u30f3\u30c9\u30cd\u30b7\u30a2\u30fb\u30eb\u30d4\u30a2","Philippine peso":"\u30d5\u30a3\u30ea\u30d4\u30f3\u30fb\u30da\u30bd","Malaysian ringgit":"\u30de\u30ec\u30fc\u30b7\u30a2\u30fb\u30ea\u30f3\u30ae\u30c3\u30c8","Vietnamese \u0111\u1ed3ng":"\u30d9\u30c8\u30ca\u30e0\u30fb\u30c9\u30f3","Turkish lira":"\u30c8\u30eb\u30b3\u30fb\u30ea\u30e9","Saudi riyal":"\u30b5\u30a6\u30b8\u30fb\u30ea\u30e4\u30eb","United Arab Emirates dirham":"UAE\u30c7\u30a3\u30eb\u30cf\u30e0","Israeli new shekel":"\u30a4\u30b9\u30e9\u30a8\u30eb\u30fb\u30b7\u30a7\u30b1\u30eb","Egyptian pound":"\u30a8\u30b8\u30d7\u30c8\u30fb\u30dd\u30f3\u30c9","South African rand":"\u5357\u30a2\u30d5\u30ea\u30ab\u30fb\u30e9\u30f3\u30c9","Swedish krona":"\u30b9\u30a6\u30a7\u30fc\u30c7\u30f3\u30fb\u30af\u30ed\u30fc\u30ca","Norwegian krone":"\u30ce\u30eb\u30a6\u30a7\u30fc\u30fb\u30af\u30ed\u30fc\u30cd","Danish krone":"\u30c7\u30f3\u30de\u30fc\u30af\u30fb\u30af\u30ed\u30fc\u30cd","Polish z\u0142oty":"\u30dd\u30fc\u30e9\u30f3\u30c9\u30fb\u30ba\u30a6\u30a9\u30c6\u30a3","Czech koruna":"\u30c1\u30a7\u30b3\u30fb\u30b3\u30eb\u30ca","Hungarian forint":"\u30cf\u30f3\u30ac\u30ea\u30fc\u30fb\u30d5\u30a9\u30ea\u30f3\u30c8","Pakistani rupee":"\u30d1\u30ad\u30b9\u30bf\u30f3\u30fb\u30eb\u30d4\u30fc","Bangladeshi taka":"\u30d0\u30f3\u30b0\u30e9\u30c7\u30b7\u30e5\u30fb\u30bf\u30ab","Iranian rial":"\u30a4\u30e9\u30f3\u30fb\u30ea\u30a2\u30eb"};

function normalize(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[\s・･、。,.\-‐－—’'`]/g, "");
}

function acceptedAnswers(country) {
  return [country.ja, country.en, ...(country.a || [])].map(normalize);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----- 基本情報の表示ヘルパー -----
function jaLang(name) {
  return LANG_JA[name] || name;
}
function jaCur(cur) {
  const name = CUR_JA[cur.n] || cur.n;
  return cur.s ? `${name}（${cur.s}）` : name;
}
function fmtPop(n) {
  if (!n) return "—";
  const oku = Math.floor(n / 1e8);
  const man = Math.round((n % 1e8) / 1e4);
  if (oku && man) return `約${oku}億${man.toLocaleString()}万人`;
  if (oku) return `約${oku}億人`;
  if (n >= 1e4) return `約${Math.round(n / 1e4).toLocaleString()}万人`;
  return `約${n.toLocaleString()}人`;
}
function fmtArea(n) {
  return n ? `${Math.round(n).toLocaleString()} km²` : "—";
}

const STORE_KEY = "flagquiz:stats:v1";
const WEAK_KEY = "flagquiz:weak:v1"; // 手動登録の苦手リスト（コード配列）

export default function App() {
  const [stats, setStats] = useState({}); // code -> {wrong, correct, seen, box, due}
  const [weakSet, setWeakSet] = useState([]); // 手動登録の苦手リスト（codeの配列）
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState("home"); // home | quiz | stats | atlas | result
  const [mode, setMode] = useState("choice"); // choice | input
  const [notice, setNotice] = useState(""); // ホームに出す一言（復習完了など）
  const [result, setResult] = useState(null); // セッション結果 {correct,total,wrong:[code],cat,label,qmode}

  // quiz state
  const orderRef = useRef([]);
  const ptrRef = useRef(0);
  const catRef = useRef("all"); // 現在の出題カテゴリ（誤答の作り方を切り替えるため）
  const learnRef = useRef(false); // 覚えるモード（間隔反復＋間違い再挿入）か
  const sessionRef = useRef({ correct: 0, total: 0 }); // 終了時のスコア参照用
  const sessionWrongRef = useRef([]); // このセッションで間違えたcode（重複なし）
  const configRef = useRef(null); // 直近のセッション設定（もう一度用）
  const [catLabel, setCatLabel] = useState("");
  const [current, setCurrent] = useState(null);
  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState(null); // code or "TIMEOUT"/text result
  const [resolved, setResolved] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [revealed, setRevealed] = useState(false); // 選択式: 選択肢を表示済みか
  const [text, setText] = useState("");
  const [session, setSession] = useState({ correct: 0, total: 0 });
  const inputRef = useRef(null);

  // load persisted stats
  useEffect(() => {
    (async () => {
      try {
        const r = await DB.get(STORE_KEY);
        if (r && r.value) setStats(JSON.parse(r.value));
      } catch (e) {
        /* first run: no data */
      }
      try {
        const w = await DB.get(WEAK_KEY);
        if (w && w.value) setWeakSet(JSON.parse(w.value));
      } catch (e) {
        /* no weak list yet */
      }
      setLoaded(true);
    })();
  }, []);

  async function persist(next) {
    setStats(next);
    try {
      await DB.set(STORE_KEY, JSON.stringify(next));
    } catch (e) {
      /* ignore write errors; session still works */
    }
  }

  async function persistWeak(codes) {
    const uniq = Array.from(new Set(codes)).filter((c) => BY_CODE[c]);
    setWeakSet(uniq);
    try {
      await DB.set(WEAK_KEY, JSON.stringify(uniq));
    } catch (e) {
      /* ignore */
    }
  }
  function addWeak(codes) {
    persistWeak([...weakSet, ...codes]);
  }
  function removeWeak(code) {
    persistWeak(weakSet.filter((c) => c !== code));
  }

  const seenCount = useMemo(() => Object.values(stats).reduce((n, s) => n + (s.seen || 0), 0), [stats]);
  const totalCorrect = useMemo(() => Object.values(stats).reduce((n, s) => n + (s.correct || 0), 0), [stats]);
  const totalWrong = useMemo(() => Object.values(stats).reduce((n, s) => n + (s.wrong || 0), 0), [stats]);
  // 間違えがちな国旗（自動）: 1回でも間違えた国を、間違えた回数順に
  const mistakenList = useMemo(
    () =>
      Object.entries(stats)
        .filter(([, s]) => (s.wrong || 0) > 0)
        .sort((a, b) => (b[1].wrong || 0) - (a[1].wrong || 0))
        .map(([c, s]) => ({ country: BY_CODE[c], s }))
        .filter((x) => x.country),
    [stats]
  );
  // 苦手リスト（手動登録）
  const manualWeakList = useMemo(
    () => weakSet.map((c) => ({ country: BY_CODE[c], s: stats[c] || {} })).filter((x) => x.country),
    [weakSet, stats]
  );

  // 覚えるモード用: 期限が来た復習数・未学習数・習得数
  const srs = useMemo(() => {
    const now = Date.now();
    let due = 0, fresh = 0, learned = 0;
    for (const c of COUNTRIES) {
      const s = stats[c.c];
      if (!s || !s.box) fresh++; // 未学習 or 箱0（要再学習）
      else {
        learned++;
        if ((s.due || 0) <= now) due++;
      }
    }
    return { due, fresh, learned };
  }, [stats]);

  function poolFor(cat) {
    if (cat === "all") return COUNTRIES;
    if (cat === "muslim") return COUNTRIES.filter((x) => x.m);
    if (cat === "weak") return manualWeakList.map((x) => x.country); // 苦手リスト（手動）
    if (cat === "mistaken") return mistakenList.map((x) => x.country); // 間違えがち（自動）
    return COUNTRIES.filter((x) => x.r === cat); // region key
  }

  function startQuiz(cat, label, qmode) {
    const pool = poolFor(cat);
    if (pool.length === 0) return;
    setMode(qmode);
    catRef.current = cat;
    learnRef.current = false;
    configRef.current = { learn: false, cat, label, qmode };
    setCatLabel(label);
    orderRef.current = shuffle(pool);
    ptrRef.current = 0;
    sessionRef.current = { correct: 0, total: 0 };
    sessionWrongRef.current = [];
    setSession({ correct: 0, total: 0 });
    setScreen("quiz");
    nextQuestion(qmode);
  }

  // 覚えるモード: 期限が来た復習＋新規を少しだけ集めて出題
  function startLearn(scope, label, qmode) {
    const pool = poolFor(scope);
    const now = Date.now();
    const NEW_PER_SESSION = 12;
    const reviews = [];
    const fresh = [];
    for (const c of pool) {
      const s = stats[c.c];
      if (!s || !s.box) fresh.push(c);
      else if ((s.due || 0) <= now) reviews.push(c);
    }
    let queue = reviews.concat(shuffle(fresh).slice(0, NEW_PER_SESSION));
    if (queue.length === 0) {
      setNotice(`${label}は今日ぶんの復習が完了しています。期限が来たらまた出題されます。`);
      return;
    }
    setNotice("");
    setMode(qmode);
    catRef.current = scope;
    learnRef.current = true;
    configRef.current = { learn: true, cat: scope, label, qmode };
    setCatLabel(`覚える · ${label}`);
    orderRef.current = shuffle(queue); // 地域を混ぜて出題（インターリーブ）
    ptrRef.current = 0;
    sessionRef.current = { correct: 0, total: 0 };
    sessionWrongRef.current = [];
    setSession({ correct: 0, total: 0 });
    setScreen("quiz");
    nextQuestion(qmode);
  }

  function nextQuestion(qmode = mode) {
    const order = orderRef.current;
    if (order.length === 0) return;
    if (ptrRef.current >= order.length) {
      if (learnRef.current) {
        endSession(); // 覚えるモードは期限ぶんを終えたら結果へ
        return;
      }
      orderRef.current = shuffle(order);
      ptrRef.current = 0;
    }
    const country = order[ptrRef.current];
    ptrRef.current += 1;

    setCurrent(country);
    setPicked(null);
    setResolved(false);
    setWasCorrect(false);
    setRevealed(false);
    setText("");

    // 選択肢は両モードで用意（入力モードの「わからない→選択肢」用）。
    // 苦手・間違えがちは対象が少ないので誤答は同地域から作る。
    const inCat =
      catRef.current === "weak" || catRef.current === "mistaken"
        ? COUNTRIES.filter((x) => x.r === country.r && x.c !== country.c)
        : orderRef.current.filter((x) => x.c !== country.c);
    let distractors = shuffle(inCat).slice(0, 3);
    if (distractors.length < 3) {
      const used = new Set([country.c, ...distractors.map((d) => d.c)]);
      const extra = shuffle(COUNTRIES.filter((x) => !used.has(x.c)));
      distractors = distractors.concat(extra.slice(0, 3 - distractors.length));
    }
    setOptions(shuffle([country, ...distractors]));
    if (qmode === "input") {
      setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    }
  }

  function endSession() {
    const sc = sessionRef.current;
    setResult({
      correct: sc.correct,
      total: sc.total,
      wrong: sessionWrongRef.current.slice(),
      config: configRef.current,
    });
    setScreen("result");
  }

  function record(country, correct) {
    const prev = stats[country.c] || { wrong: 0, correct: 0, seen: 0, box: 0, due: 0 };
    // 正解→箱を1つ上げて間隔を延ばす / 不正解→箱0に戻して当日中に再学習
    const box = correct ? Math.min((prev.box || 0) + 1, maxBox) : 0;
    const due = dueAfter(box);
    const next = {
      ...stats,
      [country.c]: {
        wrong: prev.wrong + (correct ? 0 : 1),
        correct: prev.correct + (correct ? 1 : 0),
        seen: prev.seen + 1,
        box,
        due,
      },
    };
    persist(next);
  }

  // 覚えるモードで間違えたら、数問あと（3〜5問）に同じ旗を差し戻す
  function reinsertCurrent(country) {
    const arr = orderRef.current;
    const gap = 3 + Math.floor(Math.random() * 3);
    const at = Math.min(ptrRef.current + gap, arr.length);
    arr.splice(at, 0, country);
  }

  function resolve(correct, pickedVal) {
    if (resolved) return;
    setResolved(true);
    setWasCorrect(correct);
    setPicked(pickedVal);
    setSession((s) => {
      const ns = { correct: s.correct + (correct ? 1 : 0), total: s.total + 1 };
      sessionRef.current = ns;
      return ns;
    });
    record(current, correct);
    if (!correct && !sessionWrongRef.current.includes(current.c)) {
      sessionWrongRef.current = [...sessionWrongRef.current, current.c];
    }
    if (learnRef.current && !correct) reinsertCurrent(current);
  }

  function answerChoice(country) {
    if (resolved) return;
    resolve(country.c === current.c, country.c);
  }

  function answerInput() {
    if (resolved || !text.trim()) return;
    const ok = acceptedAnswers(current).includes(normalize(text));
    resolve(ok, text.trim());
  }

  async function resetStats() {
    if (!window.confirm("学習記録（正解・不正解・苦手）をすべて消去します。よろしいですか？")) return;
    setStats({});
    setWeakSet([]);
    try {
      await DB.delete(STORE_KEY);
      await DB.delete(WEAK_KEY);
    } catch (e) {}
  }

  // ---------- UI ----------
  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center font-sans">
        <div className="animate-pulse text-sm tracking-widest uppercase">読み込み中…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-xl mx-auto px-4 py-6">
        <Header screen={screen} onHome={() => setScreen("home")} onStats={() => setScreen("stats")} onAtlas={() => setScreen("atlas")} />

        {screen === "home" && (
          <Home
            stats={{ seenCount, totalCorrect, totalWrong }}
            counts={{ weak: manualWeakList.length, mistaken: mistakenList.length }}
            srs={srs}
            notice={notice}
            onDismissNotice={() => setNotice("")}
            onStart={startQuiz}
            onLearn={startLearn}
          />
        )}

        {screen === "quiz" && current && (
          <Quiz
            mode={mode}
            catLabel={catLabel}
            country={current}
            options={options}
            resolved={resolved}
            wasCorrect={wasCorrect}
            picked={picked}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            hook={HOOKS[current.c]}
            text={text}
            setText={setText}
            inputRef={inputRef}
            session={session}
            onChoice={answerChoice}
            onInput={answerInput}
            onNext={() => nextQuestion()}
            onQuit={endSession}
          />
        )}

        {screen === "result" && result && (
          <Result
            result={result}
            weakSet={weakSet}
            onRegister={(codes) => addWeak(codes)}
            onAgain={() => {
              const cfg = result.config;
              if (!cfg) return setScreen("home");
              if (cfg.learn) startLearn(cfg.cat, cfg.label, cfg.qmode);
              else startQuiz(cfg.cat, cfg.label, cfg.qmode);
            }}
            onHome={() => setScreen("home")}
          />
        )}

        {screen === "stats" && (
          <Stats
            seenCount={seenCount}
            totalCorrect={totalCorrect}
            totalWrong={totalWrong}
            manualWeakList={manualWeakList}
            mistakenList={mistakenList}
            weakSet={weakSet}
            onReset={resetStats}
            onPlayWeak={() => startQuiz("weak", "苦手リスト", "choice")}
            onPlayMistaken={() => startQuiz("mistaken", "間違えがちな国旗", "choice")}
            onAddWeak={(codes) => addWeak(codes)}
            onRemoveWeak={(code) => removeWeak(code)}
          />
        )}

        {screen === "atlas" && <Atlas />}
      </div>
    </div>
  );
}

function Header({ screen, onHome, onStats, onAtlas }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <button onClick={onHome} className="text-left">
        <div className="text-xs tracking-[0.3em] text-indigo-400 uppercase">Flag Study</div>
        <div className="text-lg font-semibold">国旗で国名当て</div>
      </button>
      <div className="flex gap-2 text-sm">
        <button
          onClick={onHome}
          className={`px-3 py-1.5 rounded-full border ${
            screen === "home" ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500"
          }`}
        >
          ホーム
        </button>
        <button
          onClick={onAtlas}
          className={`px-3 py-1.5 rounded-full border ${
            screen === "atlas" ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500"
          }`}
        >
          図鑑
        </button>
        <button
          onClick={onStats}
          className={`px-3 py-1.5 rounded-full border ${
            screen === "stats" ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500"
          }`}
        >
          記録
        </button>
      </div>
    </div>
  );
}

function Home({ stats, counts, srs, notice, onDismissNotice, onStart, onLearn }) {
  const [mode, setMode] = useState("choice");
  const [scope, setScope] = useState(["all", "すべて"]);

  const regionBtns = Object.entries(R);
  const learnScopes = [["all", "すべて"], ...regionBtns.map(([k, l]) => [k, l]), ["muslim", "イスラム圏"]];

  return (
    <div className="space-y-6">
      {/* お知らせ（復習完了など） */}
      {notice && (
        <div className="rounded-xl border border-indigo-700 bg-indigo-500/10 px-4 py-3 text-sm flex items-start justify-between gap-3">
          <span className="text-indigo-200">{notice}</span>
          <button onClick={onDismissNotice} className="text-indigo-300 hover:text-indigo-100 shrink-0">×</button>
        </div>
      )}

      {/* 回答方式 */}
      <section>
        <SectionLabel>回答方式</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <Toggle active={mode === "choice"} onClick={() => setMode("choice")} title="選択式" sub="表示ボタンで4択" />
          <Toggle active={mode === "input"} onClick={() => setMode("input")} title="入力式" sub="国名を入力" />
        </div>
      </section>

      {/* 覚えるモード（間隔反復） */}
      <section className="rounded-2xl border border-indigo-700/60 bg-indigo-500/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs tracking-[0.2em] text-indigo-300 uppercase">覚えるモード</div>
            <div className="text-sm text-slate-300">間隔反復で、忘れそうな旗を最適なタイミングで復習</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-300">{srs.due + srs.fresh > 0 ? srs.due : 0}</div>
            <div className="text-[11px] text-slate-400">今日の復習</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {learnScopes.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScope([key, label])}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                scope[0] === key
                  ? "bg-indigo-500 border-indigo-500 text-white"
                  : "border-slate-700 text-slate-300 hover:border-indigo-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => onLearn(scope[0], scope[1], mode)}
          className="w-full rounded-xl bg-indigo-500 px-4 py-3.5 font-semibold text-white hover:bg-indigo-400 transition"
        >
          {scope[1]}の復習を始める
        </button>
        <div className="text-xs text-slate-400">
          習得 {srs.learned} / 未学習 {srs.fresh}・間違えた旗は数問あとに再出題、覚えるほど間隔が延びます
        </div>
      </section>

      {/* 自由に練習 */}
      <section>
        <SectionLabel>自由に練習（ランダム）</SectionLabel>
        <div className="space-y-2">
          <BigButton onClick={() => onStart("all", "すべて", mode)} label="すべての国" sub={`${COUNTRIES.length}か国からランダム出題`} />
          <BigButton
            onClick={() => onStart("muslim", "イスラム圏", mode)}
            label="イスラム圏"
            sub={`${COUNTRIES.filter((x) => x.m).length}か国・イスラム教が多数派`}
          />
          <BigButton
            onClick={() => counts.weak > 0 && onStart("weak", "苦手リスト", mode)}
            label="苦手リスト"
            sub={counts.weak > 0 ? `${counts.weak}か国・自分で登録した苦手` : "結果画面や記録から登録できます"}
            disabled={counts.weak === 0}
          />
          <BigButton
            onClick={() => counts.mistaken > 0 && onStart("mistaken", "間違えがちな国旗", mode)}
            label="間違えがちな国旗"
            sub={counts.mistaken > 0 ? `${counts.mistaken}か国・間違えた回数が多い順` : "まだ記録がありません"}
            disabled={counts.mistaken === 0}
          />
        </div>
      </section>

      {/* 地域別 */}
      <section>
        <SectionLabel>地域別（ランダム）</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {regionBtns.map(([key, label]) => (
            <button
              key={key}
              onClick={() => onStart(key, label, mode)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left hover:border-indigo-500 hover:bg-slate-800 transition"
            >
              <div className="font-medium">{label}</div>
              <div className="text-xs text-slate-400">{COUNTRIES.filter((x) => x.r === key).length}か国</div>
            </button>
          ))}
        </div>
      </section>

      {/* サマリー */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center justify-between text-sm">
        <Stat label="出題" value={stats.seenCount} />
        <Stat label="正解" value={stats.totalCorrect} accent="text-emerald-400" />
        <Stat label="不正解" value={stats.totalWrong} accent="text-rose-400" />
        <Stat label="苦手" value={counts.weak} accent="text-amber-400" />
      </section>

      {/* クレジット */}
      <footer className="pt-2 text-center text-[11px] leading-relaxed text-slate-500">
        <p>
          国旗画像:{" "}
          <a
            href="https://flagpedia.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-300"
          >
            flagpedia.net
          </a>{" "}
          (flagcdn.com)
        </p>
        <p>
          国データ:{" "}
          <a
            href="https://github.com/mledoze/countries"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-300"
          >
            mledoze/countries
          </a>
          ・人口は概数
        </p>
      </footer>
    </div>
  );
}

function Quiz({
  mode, catLabel, country, options, resolved, wasCorrect, picked, revealed, onReveal, hook, text, setText, inputRef, session, onChoice, onInput, onNext, onQuit,
}) {
  const acc = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0;
  const [showInfo, setShowInfo] = useState(false);
  useEffect(() => setShowInfo(false), [country.c]); // 問題が変わったら閉じる

  const optionsGrid = (
    <div className="grid grid-cols-1 gap-2">
      {options.map((o) => {
        let cls = "border-slate-700 bg-slate-900 hover:border-indigo-500 hover:bg-slate-800";
        if (resolved) {
          if (o.c === country.c) cls = "border-emerald-500 bg-emerald-500/15 text-emerald-200";
          else if (o.c === picked) cls = "border-rose-500 bg-rose-500/15 text-rose-200";
          else cls = "border-slate-800 bg-slate-900/50 text-slate-500";
        }
        return (
          <button
            key={o.c}
            disabled={resolved}
            onClick={() => onChoice(o)}
            className={`rounded-xl border px-4 py-3 text-left font-medium transition ${cls}`}
          >
            {o.ja}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300">{catLabel} · {mode === "choice" ? "選択式" : "入力式"}</span>
        <span className="text-slate-400">
          {session.correct}/{session.total}（{acc}%）
        </span>
      </div>

      {/* 国旗ステージ */}
      <div className="rounded-2xl bg-slate-100 p-5 shadow-2xl shadow-black/40 flex items-center justify-center">
        <img
          src={flagUrl(country.c)}
          alt="この国旗の国名は？"
          className="max-h-44 w-auto rounded-md ring-1 ring-slate-300 object-contain"
        />
      </div>

      {/* 回答エリア */}
      {mode === "choice" ? (
        !revealed ? (
          <button
            onClick={onReveal}
            className="w-full rounded-xl border border-indigo-500 bg-indigo-500/15 px-4 py-4 font-semibold text-indigo-200 hover:bg-indigo-500/25 transition"
          >
            選択肢を表示
            <span className="block text-xs font-normal text-indigo-300/80 mt-0.5">まず国名を思い出してから押そう</span>
          </button>
        ) : (
          optionsGrid
        )
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (resolved ? onNext() : onInput())}
              disabled={resolved}
              placeholder="国名を入力（日本語 / 英語）"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-500 placeholder:text-slate-500 disabled:opacity-60"
            />
            {!resolved && (
              <button onClick={onInput} className="rounded-xl bg-indigo-500 px-5 py-3 font-medium text-white hover:bg-indigo-400">
                回答
              </button>
            )}
          </div>
          {/* わからないとき: 選択肢にフォールバック */}
          {!resolved && !revealed && (
            <button
              onClick={onReveal}
              className="w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:border-indigo-500 hover:text-indigo-200 transition"
            >
              わからない → 選択肢を見る
            </button>
          )}
          {revealed && optionsGrid}
          {!revealed && <p className="text-xs text-slate-500">「アメリカ」「米国」「USA」など別名でも判定します。</p>}
        </div>
      )}

      {/* フィードバック */}
      {resolved && (
        <div
          className={`rounded-xl px-4 py-3 ${
            wasCorrect ? "bg-emerald-500/15 border border-emerald-600" : "bg-rose-500/15 border border-rose-600"
          }`}
        >
          <div className={`font-semibold ${wasCorrect ? "text-emerald-300" : "text-rose-300"}`}>
            {wasCorrect ? "正解" : "不正解"}
          </div>
          <div className="text-sm text-slate-200 mt-0.5">
            正解は <span className="font-semibold">{country.ja}</span>
            <span className="text-slate-400"> / {country.en}</span>
          </div>
          {hook && (
            <div className="mt-2 rounded-lg bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
              <span className="text-amber-400 font-medium">覚え方　</span>
              {hook}
            </div>
          )}
        </div>
      )}

      {/* 基本情報（回答後に開ける） */}
      {resolved && (
        <div>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="w-full text-left text-sm text-indigo-400 hover:text-indigo-300 py-1"
          >
            {showInfo ? "▾ この国について" : "▸ この国について"}
          </button>
          {showInfo && <InfoBlock country={country} />}
        </div>
      )}

      {/* フッター操作 */}
      <div className="flex gap-2">
        {resolved && (
          <button
            onClick={onNext}
            autoFocus
            className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white hover:bg-indigo-400"
          >
            次の問題 →
          </button>
        )}
        <button onClick={onQuit} className="rounded-xl border border-slate-700 px-4 py-3 text-slate-300 hover:border-slate-500">
          やめる
        </button>
      </div>
    </div>
  );
}

function Stats({ seenCount, totalCorrect, totalWrong, manualWeakList, mistakenList, weakSet, onReset, onPlayWeak, onPlayMistaken, onAddWeak, onRemoveWeak }) {
  const acc = seenCount > 0 ? Math.round((totalCorrect / seenCount) * 100) : 0;
  const weakCodes = new Set(weakSet);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2">
        <Card label="累計出題" value={seenCount} />
        <Card label="正答率" value={`${acc}%`} accent="text-emerald-400" />
        <Card label="苦手" value={manualWeakList.length} accent="text-amber-400" />
      </div>

      {/* 苦手リスト（手動登録） */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>苦手リスト（登録した国）</SectionLabel>
          {manualWeakList.length > 0 && (
            <button onClick={onPlayWeak} className="text-sm px-3 py-1.5 rounded-full bg-amber-500 text-slate-900 font-medium hover:bg-amber-400">
              これを出題
            </button>
          )}
        </div>
        {manualWeakList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
            まだ登録がありません。出題後の結果画面や、下の「間違えがちな国旗」から登録できます。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {manualWeakList.map(({ country, s }) => (
              <div key={country.c} className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900 p-2.5">
                <img src={flagUrl(country.c)} alt="" className="h-8 w-12 object-cover rounded ring-1 ring-slate-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{country.ja}</div>
                  <div className="text-xs text-slate-500">{s.wrong ? `✕${s.wrong} / ${s.seen}回` : "—"}</div>
                </div>
                <button onClick={() => onRemoveWeak(country.c)} className="text-slate-500 hover:text-rose-300 text-sm shrink-0" title="苦手リストから外す">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 間違えがちな国旗（自動） */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>間違えがちな国旗（回数順）</SectionLabel>
          {mistakenList.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => onAddWeak(mistakenList.map((x) => x.country.c))}
                className="text-sm px-3 py-1.5 rounded-full border border-amber-500 text-amber-300 hover:bg-amber-500/10"
              >
                全部苦手に登録
              </button>
              <button onClick={onPlayMistaken} className="text-sm px-3 py-1.5 rounded-full bg-indigo-500 text-white font-medium hover:bg-indigo-400">
                これを出題
              </button>
            </div>
          )}
        </div>
        {mistakenList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
            まだ間違えた国旗はありません。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {mistakenList.map(({ country, s }) => {
              const registered = weakCodes.has(country.c);
              return (
                <div key={country.c} className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900 p-2.5">
                  <img src={flagUrl(country.c)} alt="" className="h-8 w-12 object-cover rounded ring-1 ring-slate-700 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{country.ja}</div>
                    <div className="text-xs text-rose-400">✕{s.wrong} <span className="text-slate-500">/ {s.seen}回</span></div>
                  </div>
                  <button
                    onClick={() => !registered && onAddWeak([country.c])}
                    disabled={registered}
                    className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                      registered ? "text-emerald-400" : "border border-amber-500 text-amber-300 hover:bg-amber-500/10"
                    }`}
                    title="苦手リストに登録"
                  >
                    {registered ? "登録済" : "＋苦手"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <button onClick={onReset} className="w-full rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-400 hover:border-rose-600 hover:text-rose-300">
        学習記録をリセット
      </button>
    </div>
  );
}

/* ---- セッション結果（やめた/終了時） ---- */
function Result({ result, weakSet, onRegister, onAgain, onHome }) {
  const wrongCountries = result.wrong.map((c) => BY_CODE[c]).filter(Boolean);
  const already = new Set(weakSet);
  // デフォルト全部オン（まだ登録していないものを選択）
  const [checked, setChecked] = useState(() => new Set(result.wrong));
  const [done, setDone] = useState(false);
  const acc = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;

  function toggle(code) {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });
  }
  function register() {
    onRegister([...checked]);
    setDone(true);
  }

  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <div className="text-xs tracking-[0.3em] text-indigo-400 uppercase">Result</div>
        <div className="text-4xl font-bold mt-1">{result.correct}<span className="text-slate-500 text-2xl"> / {result.total}</span></div>
        <div className="text-sm text-slate-400">正答率 {acc}%</div>
      </div>

      {wrongCountries.length === 0 ? (
        <div className="rounded-xl border border-emerald-700 bg-emerald-500/10 px-4 py-8 text-center text-emerald-300">
          {result.total > 0 ? "全問正解！間違えた国旗はありません。" : "回答はありませんでした。"}
        </div>
      ) : (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel>間違えた国旗（{wrongCountries.length}）</SectionLabel>
            {!done && (
              <button
                onClick={() => setChecked((p) => (p.size === result.wrong.length ? new Set() : new Set(result.wrong)))}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {checked.size === result.wrong.length ? "全部はずす" : "全部チェック"}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {wrongCountries.map((country) => {
              const isReg = already.has(country.c);
              const isChecked = checked.has(country.c);
              return (
                <button
                  key={country.c}
                  onClick={() => !done && toggle(country.c)}
                  disabled={done}
                  className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                    isChecked && !done ? "border-amber-500 bg-amber-500/10" : "border-slate-800 bg-slate-900"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded border flex items-center justify-center text-xs shrink-0 ${
                      isChecked ? "bg-amber-500 border-amber-500 text-slate-900" : "border-slate-600 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <img src={flagUrl(country.c)} alt="" className="h-8 w-12 object-cover rounded ring-1 ring-slate-700 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{country.ja}</div>
                    <div className="text-xs text-slate-500">{country.en}</div>
                  </div>
                  {isReg && <span className="text-xs text-emerald-400 shrink-0">登録済</span>}
                </button>
              );
            })}
          </div>

          {done ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-700 px-4 py-3 text-sm text-emerald-300">
              苦手リストに登録しました。
            </div>
          ) : (
            <button
              onClick={register}
              disabled={checked.size === 0}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              チェックした{checked.size}か国を苦手リストに登録
            </button>
          )}
        </section>
      )}

      <div className="flex gap-2">
        <button onClick={onAgain} className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white hover:bg-indigo-400">
          もう一度
        </button>
        <button onClick={onHome} className="rounded-xl border border-slate-700 px-4 py-3 text-slate-300 hover:border-slate-500">
          ホーム
        </button>
      </div>
    </div>
  );
}

/* ---- 基本情報ブロック（クイズ・図鑑で共通利用） ---- */
function InfoRow({ label, children }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-slate-800 last:border-0">
      <div className="w-16 shrink-0 text-xs text-slate-400 pt-0.5">{label}</div>
      <div className="text-sm text-slate-200">{children}</div>
    </div>
  );
}
function InfoBlock({ country }) {
  const info = INFO[country.c];
  if (!info) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2">
      <InfoRow label="首都">{info.cap || "—"}</InfoRow>
      <InfoRow label="地域">{R[country.r]}<span className="text-slate-500"> / {info.sub}</span></InfoRow>
      <InfoRow label="人口">{fmtPop(info.pop)}</InfoRow>
      <InfoRow label="面積">{fmtArea(info.area)}</InfoRow>
      <InfoRow label="言語">{info.langs.length ? info.langs.map(jaLang).join("・") : "—"}</InfoRow>
      <InfoRow label="通貨">{info.cur.length ? info.cur.map(jaCur).join("・") : "—"}</InfoRow>
    </div>
  );
}

/* ---- 図鑑（基本情報の参照） ---- */
function Atlas() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [sel, setSel] = useState(null);

  const list = useMemo(() => {
    const nq = normalize(q);
    return COUNTRIES.filter((c) => {
      if (region !== "all" && c.r !== region) return false;
      if (!nq) return true;
      return acceptedAnswers(c).some((a) => a.includes(nq)) || normalize(c.ja).includes(nq);
    }).sort((a, b) => a.ja.localeCompare(b.ja, "ja"));
  }, [q, region]);

  if (sel) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSel(null)} className="text-sm text-indigo-400 hover:text-indigo-300">← 一覧に戻る</button>
        <div className="rounded-2xl bg-slate-100 p-5 shadow-2xl shadow-black/40 flex items-center justify-center">
          <img src={flagUrl(sel.c)} alt="" className="max-h-40 w-auto rounded-md ring-1 ring-slate-300 object-contain" />
        </div>
        <div>
          <div className="text-xl font-bold">{sel.ja}</div>
          <div className="text-sm text-slate-400">{sel.en}</div>
        </div>
        <InfoBlock country={sel} />
        {HOOKS[sel.c] && (
          <div className="rounded-xl bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            <span className="text-amber-400 font-medium">覚え方　</span>
            {HOOKS[sel.c]}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="国名で検索（日本語 / 英語）"
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-500 placeholder:text-slate-500"
      />
      <div className="flex flex-wrap gap-1.5">
        {[["all", "すべて"], ...Object.entries(R)].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setRegion(k)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              region === k ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-700 text-slate-300 hover:border-indigo-500"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="text-xs text-slate-400">{list.length}か国</div>
      <div className="grid grid-cols-2 gap-2">
        {list.map((c) => (
          <button
            key={c.c}
            onClick={() => setSel(c)}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-left hover:border-indigo-500 hover:bg-slate-800 transition"
          >
            <img src={flagUrl(c.c)} alt="" className="h-8 w-12 object-cover rounded ring-1 ring-slate-700 shrink-0" />
            <span className="text-sm font-medium truncate">{c.ja}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---- small components ---- */
function SectionLabel({ children }) {
  return <div className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase mb-2">{children}</div>;
}
function Toggle({ active, onClick, title, sub }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        active ? "border-indigo-500 bg-indigo-500/15" : "border-slate-700 bg-slate-900 hover:border-slate-500"
      }`}
    >
      <div className="font-semibold">{title}</div>
      <div className={`text-xs ${active ? "text-indigo-300" : "text-slate-400"}`}>{sub}</div>
    </button>
  );
}
function BigButton({ onClick, label, sub, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl border px-4 py-3.5 text-left transition ${
        disabled
          ? "border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed"
          : "border-slate-700 bg-slate-900 hover:border-indigo-500 hover:bg-slate-800"
      }`}
    >
      <div className="font-semibold">{label}</div>
      <div className="text-xs text-slate-400">{sub}</div>
    </button>
  );
}
function Stat({ label, value, accent }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${accent || "text-slate-100"}`}>{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}
function Card({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-4 text-center">
      <div className={`text-2xl font-bold ${accent || "text-slate-100"}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
