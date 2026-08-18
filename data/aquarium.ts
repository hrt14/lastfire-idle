import type {
  AreaSpec,
  EquipSpec,
  HireSpec,
  SeatSpec,
  StaffKind,
  StoveSpec,
  Upgrade,
} from "@/lib/shop";
import {
  stageDefs,
  stageList,
  type StageDef,
  type StageId,
  type StageLabels,
} from "@/data/stages";

/**
 * はんじょうダッシュ「世界水族館」
 *
 * 54区画。本館18（現世の世界の海）＋ 施設棟4（ショップ・レストラン・
 * 両生類館・爬虫類館）＋ 古代棟32（時代をさかのぼり、最後は生命誕生の海）。
 * 館内のレイアウトは lib/aquariumLayout.ts、拡張の中身は
 * data/aquarium-expansion-v6.ts と docs/aquarium-expansion-v6.md にある。
 *
 * 専用エンジンは作らず、既存のドリームパークの仕組みを再利用する。
 * - 券売所 = 既存の producer
 * - 水槽 = 「魚が泳ぐ」既存の fish art を持つ作業場
 * - 観覧スポット = 既存の ride seat
 * - 地域追加 = 既存の area unlock
 * - 案内員 / 発券スタッフ / 自動化 = 既存 staff / equipment
 *
 * 水槽を買うと価格0の観覧スポットが同時に開くため、
 * 「新しい生き物を入れる → すぐ客が見に来る」が既存ロジックだけで成立する。
 */

const AQUARIUM_ID = "aquarium";
const AREA_H = 420;

/** 有効数字2桁へ丸める。桁だけが伸びていく後半の価格を読みやすく保つ */
const round2 = (value: number) => {
  const digits = Math.floor(Math.log10(value)) - 1;
  const unit = Math.pow(10, digits);
  return Math.round(value / unit) * unit;
};

/**
 * 古代棟（22〜53区画）の解放価格。
 *
 * 本館は1区画ごとに約3倍だが、古代棟は32区画あるので同じ倍率だと桁が壊れる。
 * 1区画ごと約1.55倍にして、展示の観覧単価（下の deepBoost）を同じ倍率で伸ばす。
 * こうすると「1区画あたり何人の来館で開くか」が本館と同じ感覚のまま、
 * 時代をさかのぼるテンポだけが速くなる。
 */
const ANCIENT_GROWTH = 1.55;
const ancientPrices = Array.from({ length: 32 }, (_, i) =>
  round2(1.2e14 * Math.pow(ANCIENT_GROWTH, i)),
);

const regionPrices = [
  0,
  2_800,
  18_000,
  85_000,
  360_000,
  1_400_000,
  6_000_000,
  24_000_000,
  90_000_000,
  360_000_000,
  1_400_000_000,
  5_000_000_000,
  18_000_000_000,
  65_000_000_000,
  220_000_000_000,
  700_000_000_000,
  2_000_000_000_000,
  6_000_000_000_000,
  // 施設棟。展示ではなく「館としての設備」なので、本館の続きより控えめに置く
  12_000_000_000_000,
  22_000_000_000_000,
  40_000_000_000_000,
  70_000_000_000_000,
  // 古代棟
  ...ancientPrices,
];

const regions = [
  {
    name: "日本の里川",
    chapter: "FRESH WATER · JAPAN",
    floor: "#274f57",
    deep: "#18363d",
    species: [
      ["メダカの群れ", "小さなメダカが泳ぎ始める。世界水族館の最初の命。"],
      ["ドジョウとフナ", "川底をドジョウが進み、その上をフナが泳ぐ。"],
      ["オイカワ・タナゴ・ナマズ", "色のある小魚が増え、最後にナマズが加わって里川が完成。"],
    ],
  },
  {
    name: "日本の渓流",
    chapter: "FRESH WATER · JAPAN",
    floor: "#315f69",
    deep: "#1c4149",
    species: [
      ["アユ", "澄んだ流れをアユが泳ぐ渓流水槽。"],
      ["ヤマメ", "岩陰と速い流れを好むヤマメが加わる。"],
      ["イワナ", "冷たい山の水を象徴するイワナで日本の渓流が完成。"],
    ],
  },
  {
    name: "東アジアの大河",
    chapter: "FRESH WATER · EAST ASIA",
    floor: "#526455",
    deep: "#334238",
    species: [
      ["コイの群れ", "川幅が広がり、力強いコイの群れが現れる。"],
      ["フナ・ドジョウ", "底生魚も増え、大河の層が厚くなる。"],
      ["大型ナマズ", "小魚の水槽から一段大きな淡水魚の世界へ。"],
    ],
  },
  {
    name: "メコン川",
    chapter: "FRESH WATER · MEKONG",
    floor: "#52634a",
    deep: "#33402d",
    species: [
      ["ラスボラ", "熱帯の小型魚が群れ、展示の色が一気に変わる。"],
      ["グラミー・ナイフフィッシュ", "姿の違う魚が増え、東南アジアらしい水槽になる。"],
      ["メコンの巨大ナマズ", "初めて明確な巨大魚が登場する淡水の見せ場。"],
    ],
  },
  {
    name: "東南アジア 水没森林",
    chapter: "FRESH WATER · FLOODED FOREST",
    floor: "#254b3f",
    deep: "#16332b",
    species: [
      ["ベタと小型魚", "木の根の間を小型魚が泳ぐ水没森林。"],
      ["クラウンローチ", "底を動く鮮やかな魚が追加される。"],
      ["アジアアロワナ", "水面近くを大型魚が悠々と泳ぎ、森林展示が完成。"],
    ],
  },
  {
    name: "アフリカの湖と川",
    chapter: "FRESH WATER · AFRICA",
    floor: "#5b5840",
    deep: "#3a3827",
    species: [
      ["コンゴテトラ", "銀色の群泳魚がきらめくアフリカ河川水槽。"],
      ["カラフルシクリッド", "色とりどりの魚が岩場を埋める湖沼展示。"],
      ["ナイルパーチ級大型魚", "アフリカ淡水エリアの主役となる大型魚。"],
    ],
  },
  {
    name: "アマゾン熱帯雨林",
    chapter: "FRESH WATER · AMAZON",
    floor: "#214c43",
    deep: "#13342e",
    species: [
      ["ネオンテトラの大群", "小さな光のような魚が群れ、水中の森を満たす。"],
      ["コリドラス・エンゼルフィッシュ", "水底と中層の生き物が増えて密度が上がる。"],
      ["ディスカス", "鮮やかな円盤形の魚が加わり、熱帯雨林水槽が完成。"],
    ],
  },
  {
    name: "AMAZON GREAT RIVER",
    chapter: "FRESH WATER · GRAND FINALE",
    floor: "#183f3a",
    deep: "#0e2a27",
    species: [
      ["ピラニア", "群れで泳ぐピラニアの専用展示。"],
      ["淡水エイ・アロワナ", "水底のエイと水面のアロワナで巨大水槽が立体的になる。"],
      ["ピラルク", "淡水編の主役。巨大なピラルクが入って川の旅が完成する。"],
    ],
  },
  {
    name: "日本の海",
    chapter: "OCEAN · JAPAN",
    floor: "#174e68",
    deep: "#0d3448",
    species: [
      ["イワシ・アジの群れ", "川から海へ。初めて大きな群泳が館内に現れる。"],
      ["タイ・カサゴ", "岩礁の魚が増えて日本沿岸の景色になる。"],
      ["タコ・ウツボ", "形も動きも違う生き物が加わり、海水編らしさが強くなる。"],
    ],
  },
  {
    name: "北の海",
    chapter: "OCEAN · COLD WATER",
    floor: "#315c73",
    deep: "#1c3d50",
    species: [
      ["サケ", "冷たい青の水槽をサケが力強く泳ぐ。"],
      ["ホッケと冷水魚", "温かい海とは違う落ち着いた魚群展示。"],
      ["北海のカニ", "海底にも生き物が増え、北の海が完成する。"],
    ],
  },
  {
    name: "沖縄 サンゴ礁",
    chapter: "OCEAN · OKINAWA",
    floor: "#147b83",
    deep: "#075463",
    species: [
      ["クマノミ・スズメダイ", "一気にカラフルになるサンゴ礁の入口。"],
      ["チョウチョウウオ・ツノダシ", "サンゴの上を鮮やかな魚が埋めていく。"],
      ["ウミガメ", "小魚の群れの上をウミガメが泳ぐ沖縄エリアの主役。"],
    ],
  },
  {
    name: "CALIFORNIA KELP FOREST",
    chapter: "OCEAN · KELP FOREST",
    floor: "#285a52",
    deep: "#163b37",
    species: [
      ["ケルプの小魚群", "巨大海藻の森を小魚が行き交う。"],
      ["ロックフィッシュ", "サンゴ礁とは違う魚種で海藻の森が濃くなる。"],
      ["小型サメ", "ケルプの間をサメが横切り、展示の迫力が上がる。"],
    ],
  },
  {
    name: "東南アジアの海",
    chapter: "OCEAN · SOUTH EAST ASIA",
    floor: "#176b76",
    deep: "#0b4754",
    species: [
      ["ハナダイの大群", "高密度の熱帯魚で水槽が埋まり始める。"],
      ["ミノカサゴ・フグ", "特徴的な姿の魚が次々と追加される。"],
      ["小型エイ", "水底を滑るエイが加わり、生き物の動きが多彩になる。"],
    ],
  },
  {
    name: "GREAT REEF",
    chapter: "OCEAN · AUSTRALIA",
    floor: "#167784",
    deep: "#09515d",
    species: [
      ["巨大サンゴ礁の魚群", "多数の小型魚がサンゴ礁を覆う大展示。"],
      ["ウミガメ・大型エイ", "大型生物が同じ水槽に入り、スケールが一段上がる。"],
      ["リーフシャーク", "サンゴ礁をサメが巡回し、グレートリーフが完成。"],
    ],
  },
  {
    name: "INDIAN OCEAN",
    chapter: "OCEAN · INDIAN OCEAN",
    floor: "#165f73",
    deep: "#0b4050",
    species: [
      ["ナポレオンフィッシュ", "一匹の存在感が大きい大型魚展示へ移る。"],
      ["大型エイ", "翼のように泳ぐ大型エイが水槽を横切る。"],
      ["大型サメ", "魚の数だけでなくサイズでも圧倒する海域が完成。"],
    ],
  },
  {
    name: "OPEN OCEAN",
    chapter: "OCEAN · OPEN OCEAN",
    floor: "#0f506c",
    deep: "#082f45",
    species: [
      ["イワシ200匹級の大群", "画面を埋める大群泳。外洋巨大水槽の始まり。"],
      ["マグロ・カツオ", "高速で泳ぐ大型回遊魚が群れの中へ入る。"],
      ["サメ・大型エイ", "大群の上を巨大魚が横切る外洋のクライマックス。"],
    ],
  },
  {
    name: "DEEP SEA",
    chapter: "OCEAN · DEEP SEA",
    floor: "#18243d",
    deep: "#090f22",
    species: [
      ["オオグソクムシ", "暗い海底に奇妙な深海生物が現れる。"],
      ["タカアシガニ", "脚の長い巨大なカニが深海展示の主役になる。"],
      ["発光深海魚", "暗闇に光る生き物が増え、館内の雰囲気が完全に変わる。"],
    ],
  },
  {
    name: "WORLD OCEAN",
    chapter: "WORLD OCEAN · GRAND FINALE",
    floor: "#0b4664",
    deep: "#05283e",
    species: [
      ["世界の魚群", "これまでの旅を象徴する巨大な魚群が中央水槽を満たす。"],
      ["マンタ・大型サメ", "巨大なシルエットが何枚も水槽を横切る。"],
      ["ジンベエザメ級の巨大魚", "最後の主役。メダカ数匹から始まった水族館が完成する。"],
    ],
  },
  /* ==================== 施設棟（18〜21） ====================
   * 展示だけの館から「一日いられる施設」へ。
   * ここだけ売り物と席があり、来館者は観覧のあいだに買い物と食事をする。
   */
  {
    name: "ミュージアムショップ",
    chapter: "FACILITY · MUSEUM SHOP",
    floor: "#6b5a44",
    deep: "#41372a",
    species: [
      ["ぬいぐるみの棚", "館内で見た生きものが、そのまま持ち帰れる棚になる。"],
      ["深海グッズの棚", "暗い棚の中でだけ光る、深海生物のグッズ。"],
      ["化石レプリカの棚", "アンモナイトと三葉虫のレプリカ。古代棟の予告でもある。"],
    ],
  },
  {
    name: "オーシャンレストラン",
    chapter: "FACILITY · RESTAURANT",
    floor: "#7a5f42",
    deep: "#4a3928",
    species: [
      ["窓ぎわのテーブル", "大水槽のガラスが、そのまま壁になっている席。"],
      ["大水槽前のテーブル", "魚群が頭の上を横切る、館内でいちばん人気の席。"],
      ["水中ダイニング", "四方をガラスに囲まれた特別席。料理より先に海が出てくる。"],
    ],
  },
  {
    name: "両生類館",
    chapter: "AMPHIBIAN HOUSE",
    floor: "#4b6046",
    deep: "#2b3a2a",
    species: [
      ["ヤドクガエルの森", "手のひらほどの葉に、目の覚める色のカエルが座っている。"],
      ["イモリとサンショウウオ", "冷たい湧き水の底を、指の短い生きものが歩く。"],
      ["オオサンショウウオ", "1メートルを超える生きた化石。日本の川の主。"],
    ],
  },
  {
    name: "爬虫類館",
    chapter: "REPTILE HOUSE",
    floor: "#5c5236",
    deep: "#372f1f",
    species: [
      ["ミズガメの池", "甲羅を干す岩と、水の中をすべる足。"],
      ["ウミヘビとトカゲ", "岩のすきまと水面を行き来する、鱗の生きもの。"],
      ["イリエワニ", "水面から目だけを出す、現生最大の爬虫類。"],
    ],
  },

  /* ==================== 古代棟（22〜53） ====================
   * ここから先は時間をさかのぼる。1区画ごとに時代がひとつ古くなり、
   * 最後は40億年前 ―― 生命が生まれた海にたどり着く。
   */
  {
    name: "失われた100年の海",
    chapter: "TIME TUNNEL · 1900s",
    floor: "#54606b",
    deep: "#333c46",
    species: [
      ["ニホンアシカ", "100年前まで日本の岩場にいた、もういないアシカ。"],
      ["クニマス", "絶滅とされ、70年後に別の湖で見つかった魚。"],
      ["ステラーカイギュウ", "発見から27年で消えた、体長8メートルの海牛。時間の旅はここから始まる。"],
    ],
  },
  {
    name: "完新世の入り江",
    chapter: "HOLOCENE · 1万年前",
    floor: "#4d6a63",
    deep: "#2c413c",
    species: [
      ["オオウミガラス", "飛べない海鳥が、群れで岩場に立つ。"],
      ["巨大チョウザメ", "川と海を行き来する、鎧のような古い魚。"],
      ["縄文の内湾", "貝塚に残る貝と魚が、そのまま泳いでいる入り江。"],
    ],
  },
  {
    name: "氷河時代の海",
    chapter: "PLEISTOCENE · 10万年前",
    floor: "#5d7385",
    deep: "#33445a",
    species: [
      ["氷の下のタラ", "海氷の裏側を、銀色の群れが流れていく。"],
      ["タテゴトアザラシ", "流氷の上で子を育てるアザラシ。"],
      ["ホッキョククジラ", "氷を割って浮上する、氷海でいちばん大きな生きもの。"],
    ],
  },
  {
    name: "巨鮫の海",
    chapter: "PLEISTOCENE · 300万年前",
    floor: "#3f5d6e",
    deep: "#22384a",
    species: [
      ["メガロドンの歯", "手のひらより大きな歯だけが、砂の上に残されている。"],
      ["古代のホホジロザメ", "いまのホホジロザメの、ひとまわり大きな祖先。"],
      ["メガロドン", "全長15メートル超。史上最大級のサメが目の前を横切る。"],
    ],
  },
  {
    name: "鮮新世の海",
    chapter: "PLIOCENE · 500万年前",
    floor: "#3d5f6b",
    deep: "#213943",
    species: [
      ["アクロフィセター", "牙を持つ、小型のマッコウクジラの仲間。"],
      ["古代のイルカ", "細長い吻を持つ、原始的なイルカの群れ。"],
      ["リヴィアタン", "クジラを食べるクジラ。頭だけで3メートルある。"],
    ],
  },
  {
    name: "中新世の内海",
    chapter: "MIOCENE · 1500万年前",
    floor: "#4f6a53",
    deep: "#2c3f31",
    species: [
      ["デスモスチルス", "柱を束ねたような歯を持つ、海辺の草食獣。"],
      ["パレオパラドキシア", "浅瀬を歩いて海藻を食べていた、日本の海の獣。"],
      ["ケントリオドンの群れ", "現生イルカに近づいた、小型ハクジラの大群。"],
    ],
  },
  {
    name: "漸新世の海",
    chapter: "OLIGOCENE · 3000万年前",
    floor: "#46626e",
    deep: "#263a45",
    species: [
      ["巨大ペンギン", "人の背丈ほどある、まだ寒くない海のペンギン。"],
      ["アエティオケタス", "歯とヒゲの両方を持つ、ヒゲクジラの始まり。"],
      ["原始のカイギュウ", "海草の草原をゆっくり進む、ジュゴンの祖先。"],
    ],
  },
  {
    name: "くじらの海",
    chapter: "EOCENE · 4000万年前",
    floor: "#3e5c6b",
    deep: "#203643",
    species: [
      ["ドルドン", "5メートルのクジラ。もう完全に海の生きものになっている。"],
      ["原始のマナティー", "四本足の名残を持つ、海牛のはじまり。"],
      ["バシロサウルス", "全長18メートル。ヘビのように長いクジラ。"],
    ],
  },
  {
    name: "海へ帰る岸",
    chapter: "EOCENE · 5000万年前",
    floor: "#5b6a4c",
    deep: "#36402d",
    species: [
      ["パキケトゥス", "オオカミほどの大きさで、耳だけがクジラだった動物。"],
      ["アンブロケトゥス", "ワニのように水辺で待ち伏せる、歩くクジラ。"],
      ["ロドケトゥス", "後ろ足が小さくなり、いよいよ海へ出ていく姿。"],
    ],
  },
  {
    name: "暁新世の大河",
    chapter: "PALEOCENE · 6000万年前",
    floor: "#4e6242",
    deep: "#2c3a26",
    species: [
      ["巨大ガー", "恐竜のいなくなった川で、いちばん大きくなった魚。"],
      ["カルボネミス", "甲羅だけで1.7メートルある淡水ガメ。"],
      ["ティタノボア", "全長13メートル。史上最大のヘビが川を横切る。"],
    ],
  },
  {
    name: "白亜紀 最後の海",
    chapter: "LATE CRETACEOUS · 6600万年前",
    floor: "#3a566b",
    deep: "#1e3242",
    species: [
      ["最後のアンモナイト", "この海のあと、二度と現れなくなる渦巻きの殻。"],
      ["プログナトドン", "がっしりした顎で、殻ごと噛み砕くモササウルス類。"],
      ["モササウルス", "全長15メートル。白亜紀の海を治めた巨大な海トカゲ。"],
    ],
  },
  {
    name: "白亜紀の外洋",
    chapter: "CRETACEOUS · 8000万年前",
    floor: "#365a72",
    deep: "#1c3546",
    species: [
      ["ヘスペロルニス", "翼を捨て、足だけで潜る、歯のある海鳥。"],
      ["クシファクティヌス", "5メートルの獰猛な硬骨魚。丸呑みしたままの化石が残る。"],
      ["アーケロン", "差し渡し4メートル。史上最大のウミガメ。"],
    ],
  },
  {
    name: "白亜紀の内海",
    chapter: "CRETACEOUS · 9500万年前",
    floor: "#3a6072",
    deep: "#1f3946",
    species: [
      ["イノセラムス", "人の胴ほどある巨大な二枚貝が、海底を埋めている。"],
      ["スティクソサウルス", "首だけで体の半分を占める首長竜。"],
      ["エラスモサウルス", "首の骨が72個。11メートルの首長竜が水を切る。"],
    ],
  },
  {
    name: "白亜紀前期の湖",
    chapter: "EARLY CRETACEOUS · 1億2000万年前",
    floor: "#586b3f",
    deep: "#333f26",
    species: [
      ["オンコプリスティス", "のこぎりのような吻を持つ、川のノコギリエイ。"],
      ["マウソニア", "2メートルを超える巨大シーラカンス。"],
      ["スピノサウルス", "帆を背負って水を泳ぐ、水辺の巨大な獣脚類。"],
    ],
  },
  {
    name: "ジュラ紀の外洋",
    chapter: "JURASSIC · 1億5000万年前",
    floor: "#33596a",
    deep: "#1b3440",
    species: [
      ["レプトレピス", "いまのニシンにつながる、小さく銀色の群れ。"],
      ["メトリオリンクス", "ひれを持ち、海へ出ていった完全水生のワニ。"],
      ["リオプレウロドン", "頭だけで1.5メートル。首の短い巨大な首長竜。"],
    ],
  },
  {
    name: "ジュラ紀の浅い海",
    chapter: "JURASSIC · 1億6500万年前",
    floor: "#3d6a6a",
    deep: "#204040",
    species: [
      ["ベレムナイト", "弾丸のような殻を持つイカの仲間が群れる。"],
      ["アンモナイトの群れ", "渦巻きの殻が、いくつも並んで漂う。"],
      ["イクチオサウルス", "イルカそっくりの姿になった、海生爬虫類。"],
    ],
  },
  {
    name: "ジュラ紀のラグーン",
    chapter: "JURASSIC · 1億5500万年前",
    floor: "#6d6b4a",
    deep: "#40402c",
    species: [
      ["古代のカブトガニ", "歩いた跡ごと化石になった、いまと同じ姿の生きもの。"],
      ["アスピドリンクス", "細い吻を持つ、静かな潟の魚。"],
      ["ゾルンホーフェンの潟", "石灰の海底へ、すべてが完全な形のまま沈んでいく潟。"],
    ],
  },
  {
    name: "三畳紀の外洋",
    chapter: "TRIASSIC · 2億2000万年前",
    floor: "#3b5566",
    deep: "#1f313e",
    species: [
      ["タニストロフェウス", "体より長い首を水面へ伸ばす、奇妙な爬虫類。"],
      ["プラコダス", "石畳のような歯で貝を割る、ずんぐりした海の爬虫類。"],
      ["ショニサウルス", "全長21メートル。史上最大の魚竜。"],
    ],
  },
  {
    name: "三畳紀の岩礁",
    chapter: "TRIASSIC · 2億4500万年前",
    floor: "#6a5c47",
    deep: "#3e362a",
    species: [
      ["ヘノドゥス", "カメそっくりの、カメではない爬虫類。"],
      ["ノトサウルス", "アシカのように岩へ上がる、水陸両方の爬虫類。"],
      ["よみがえる礁", "大絶滅で消えたサンゴ礁が、ようやく戻ってきた海。"],
    ],
  },
  {
    name: "ペルム紀末 死の海",
    chapter: "END PERMIAN · 2億5200万年前",
    floor: "#5b4a44",
    deep: "#332723",
    species: [
      ["クラライアの海底", "生き残った二枚貝だけが、びっしりと海底を覆う。"],
      ["最後の三葉虫", "3億年続いた仲間の、いちばん最後の一匹。"],
      ["酸欠の海", "酸素の消えた紫の海。生きものの9割が消えた場所。"],
    ],
  },
  {
    name: "ペルム紀の海",
    chapter: "PERMIAN · 2億7000万年前",
    floor: "#4c5a5e",
    deep: "#2a3437",
    species: [
      ["ゴニアタイト", "アンモナイトより古い、単純な模様の殻。"],
      ["メソサウルス", "淡水の入江を泳ぐ、細い歯の小さな爬虫類。"],
      ["ヘリコプリオン", "下あごに渦巻き状の歯を並べた、正体不明のサメ。"],
    ],
  },
  {
    name: "石炭紀の湿地",
    chapter: "CARBONIFEROUS · 3億1000万年前",
    floor: "#4a5c3c",
    deep: "#293423",
    species: [
      ["巨大なヤゴ", "翼開長70センチのトンボの子が、水底を歩く。"],
      ["プロテロギリヌス", "ワニのような姿の、初期の四足動物。"],
      ["エオギリヌス", "全長4.6メートル。石炭の森の水路を支配した両生類。"],
    ],
  },
  {
    name: "石炭紀の海",
    chapter: "CARBONIFEROUS · 3億3000万年前",
    floor: "#556b5c",
    deep: "#2f3d34",
    species: [
      ["ウミユリの森", "茎の先に花のような腕を広げる動物が、海底に林立する。"],
      ["ファルカタス", "頭の上に釣り針のような突起を持つ、小型のサメ。"],
      ["ステタカントゥス", "アイロンのような背びれを持つ、奇妙なサメ。"],
    ],
  },
  {
    name: "デボン紀 甲冑魚の海",
    chapter: "DEVONIAN · 3億7000万年前",
    floor: "#4d5a4a",
    deep: "#2b332b",
    species: [
      ["ボスリオレピス", "腕のような胸びれを持つ、装甲された底生魚。"],
      ["クラドセラケ", "いちばん古いサメのひとつ。細長く、鋭い。"],
      ["ダンクルオステウス", "全長6メートル。骨の板でできた顎が、鎧ごと噛み砕く。"],
    ],
  },
  {
    name: "デボン紀 上陸の岸",
    chapter: "DEVONIAN · 3億6500万年前",
    floor: "#5f6440",
    deep: "#383b26",
    species: [
      ["ハイネリア", "浅瀬で待ち伏せる、4メートルの肉鰭魚。"],
      ["ティクターリク", "ひれの中に肘があった、陸へ向かう魚。"],
      ["イクチオステガ", "8本の指の足で、はじめて岸へ体を引き上げた生きもの。"],
    ],
  },
  {
    name: "シルル紀 ウミサソリの海",
    chapter: "SILURIAN · 4億2000万年前",
    floor: "#61563f",
    deep: "#393225",
    species: [
      ["ケファラスピス", "あごを持たない、兜をかぶったような魚。"],
      ["最初のサンゴ礁", "床板サンゴと層孔虫が、はじめて礁を作りはじめる。"],
      ["プテリゴトゥス", "全長2.3メートルのウミサソリ。この海でいちばん強い。"],
    ],
  },
  {
    name: "オルドビス紀の海",
    chapter: "ORDOVICIAN · 4億5000万年前",
    floor: "#4f5f66",
    deep: "#2c373d",
    species: [
      ["三葉虫の群れ", "海底いちめんを、節のある背中が埋めていく。"],
      ["筆石の帯", "水中を漂う、のこぎりの歯のような群体。"],
      ["カメロケラス", "まっすぐな殻が6メートル。海のいちばん上に立つ巨大なオウムガイ。"],
    ],
  },
  {
    name: "カンブリア紀の海",
    chapter: "CAMBRIAN · 5億2000万年前",
    floor: "#5a5a66",
    deep: "#33333d",
    species: [
      ["ウィワクシア", "うろこと棘で身を固めた、分類のつかない生きもの。"],
      ["ハルキゲニア", "どちらが上か、100年わからなかった棘の生きもの。"],
      ["アノマロカリス", "1メートル。目と触手を持つ、最初の大型捕食者。"],
    ],
  },
  {
    name: "カンブリア爆発",
    chapter: "CAMBRIAN EXPLOSION · 5億3500万年前",
    floor: "#4a5570",
    deep: "#2a3042",
    species: [
      ["マルレラ", "レースのような棘を広げる、この海でいちばん数の多い動物。"],
      ["オパビニア", "5つの目とホースのような口。体の設計がまだ自由だったころ。"],
      ["ピカイア", "背中に一本の筋。すべての脊椎動物の出発点がここにある。"],
    ],
  },
  {
    name: "エディアカラ紀の浅瀬",
    chapter: "EDIACARAN · 5億7500万年前",
    floor: "#6a5f52",
    deep: "#3d372f",
    species: [
      ["スプリギナ", "左右がわずかにずれた、体に向きが生まれたころの生きもの。"],
      ["カルニア", "羽根のような体を砂に立てる、動かない生きもの。"],
      ["ディッキンソニア", "キルトのような楕円。目も口も持たない、最初期の動物。"],
    ],
  },
  {
    name: "ストロマトライトの海",
    chapter: "PROTEROZOIC · 20億年前",
    floor: "#6b6144",
    deep: "#3e3828",
    species: [
      ["シアノバクテリアの膜", "水面をおおう緑の膜が、酸素を吐き出しはじめる。"],
      ["縞状鉄鉱層", "海の鉄が酸素と結びつき、赤い縞になって沈んでいく。"],
      ["ストロマトライト", "35億年、同じ形で積み上がってきた岩。地球最古の生態系。"],
    ],
  },
  {
    name: "生命誕生の海",
    chapter: "HADEAN OCEAN · 40億年前",
    floor: "#3a2c33",
    deep: "#1b1218",
    species: [
      ["熱水の煙突", "海底から黒い煙が立ちのぼる。ここに熱と物質がある。"],
      ["最初の膜", "泡が閉じ、内と外が分かれる。生きものの最初のかたち。"],
      ["生命誕生の海", "40億年前の熱水噴出孔。ここから、館内のすべての生きものが始まった。"],
    ],
  },
] as const;

const tankId = (area: number, index: number) => `tank-${area}-${index}`;
const seatId = (area: number, index: number) => `seat-${area}-${index}`;

const aquariumAreas: AreaSpec[] = regions.map((region, area) => {
  const y0 = area * AREA_H;
  return {
    id: `area-${area}`,
    label: area === 0 ? region.name : `${region.name}をひらく`,
    price: regionPrices[area],
    rect: { x0: 0, y0, x1: 360, y1: y0 + AREA_H },
    // 次の展示室の直前、いま開いている展示室側に解放枠を置く。
    padPos: area === 0 ? { x: 0, y: 0 } : { x: 180, y: y0 - 24 },
    palette: { floor: region.floor, deep: region.deep, prop: "none" },
    unlockAfter: area === 0 ? undefined : tankId(area - 1, 3),
  };
});

const aquariumTanks: StoveSpec[] = [];
const aquariumSeats: SeatSpec[] = [];

for (let area = 0; area < regions.length; area += 1) {
  const region = regions[area];
  const y0 = area * AREA_H;
  const areaBase = Math.max(100, regionPrices[area]);
  const tankPrices =
    area === 0
      ? [0, 80, 220]
      : [
          Math.max(100, Math.round(areaBase * 0.1)),
          Math.max(180, Math.round(areaBase * 0.18)),
          Math.max(300, Math.round(areaBase * 0.32)),
        ];

  region.species.forEach(([label, detail], rawIndex) => {
    const index = rawIndex + 1;
    const x = 60 + rawIndex * 120;
    const tank = tankId(area, index);
    const seat = seatId(area, index);
    const previous = index === 1 ? undefined : tankId(area, index - 1);
    const ticketCost = Math.min(7, 1 + Math.floor(area / 3));

    aquariumTanks.push({
      id: tank,
      pos: { x, y: y0 + 320 },
      price: tankPrices[rawIndex],
      area,
      label,
      art: `aquarium-${area}-${index}`,
      // display用。通常の券供給源にならないよう、完成を事実上止める。
      work: 999_999,
      hold: 1,
      unlockAfter: previous,
      zone: { x0: x - 50, y0: y0 + 168, x1: x + 50, y1: y0 + 306 },
    });

    aquariumSeats.push({
      id: seat,
      pos: { x, y: y0 + 385 },
      serve: { x, y: y0 + 344 },
      tray: { x, y: y0 + 360 },
      price: 0,
      area,
      label,
      detail: `${region.chapter}｜${detail}`,
      cost: ticketCost,
      /*
       * 観覧単価。本館（0〜17）はこれまでと同じ式のまま。
       * 施設棟から先は、区画の解放価格と同じ 1.55倍ずつで伸ばす。
       * 「1区画を開くのに何人ぶん必要か」を本館と揃えたまま、
       * 古いものほど価値が高い ―― という当たり前を、そのまま単価にする。
       */
      value:
        ticketCost *
        (1.25 + Math.min(area, 17) * 0.08 + rawIndex * 0.05) *
        (area <= 17 ? 1 : Math.pow(ANCIENT_GROWTH, area - 17)),
      unlockAfter: tank,
    });
  });
}

/** 観覧券を作る場所。エリアが伸びると館内にも増えて客数に追いつく。 */
const aquariumTicketStoves: StoveSpec[] = [
  { id: "stove-1", pos: { x: 180, y: 112 }, price: 0, area: 0, label: "総合発券カウンター" },
  { id: "stove-2", pos: { x: 180, y: 4 * AREA_H + 112 }, price: 120_000, area: 4, label: "淡水館 発券端末" },
  { id: "stove-3", pos: { x: 180, y: 8 * AREA_H + 112 }, price: 42_000_000, area: 8, label: "海水館 発券端末" },
  { id: "stove-4", pos: { x: 180, y: 12 * AREA_H + 112 }, price: 12_000_000_000, area: 12, label: "世界の海 発券端末" },
  { id: "stove-5", pos: { x: 180, y: 16 * AREA_H + 112 }, price: 1_200_000_000_000, area: 16, label: "深海館 発券端末" },
];

const aquariumHires: HireSpec[] = [
  { id: "cook-1", kind: "cook", pos: { x: 245, y: 112 }, price: 420, label: "発券スタッフ", stoveId: "stove-1", area: 0, unlockAfter: "tank-0-2" },
  { id: "waiter-1", kind: "waiter", pos: { x: 70, y: 135 }, price: 700, label: "館内案内員", area: 0, unlockAfter: "tank-0-3" },
  { id: "seller-1", kind: "seller", pos: { x: 222, y: 0 }, price: 1_400, label: "入場券係", area: 0, outside: true, unlockAfter: "waiter-1" },
  { id: "gatekeeper-1", kind: "gatekeeper", pos: { x: 340, y: 0 }, price: 3_400, label: "入場ゲート係", area: 0, outside: true, unlockAfter: "seller-1" },
  { id: "robot-1", kind: "robot", pos: { x: 290, y: AREA_H + 120 }, price: 12_000, label: "案内ロボ", area: 1 },
  { id: "cook-2", kind: "cook", pos: { x: 245, y: 4 * AREA_H + 112 }, price: 180_000, label: "淡水館 発券スタッフ", stoveId: "stove-2", area: 4 },
  { id: "collector-1", kind: "collector", pos: { x: 70, y: 5 * AREA_H + 120 }, price: 2_800_000, label: "自動集金担当", area: 5 },
  { id: "cook-3", kind: "cook", pos: { x: 245, y: 8 * AREA_H + 112 }, price: 58_000_000, label: "海水館 発券スタッフ", stoveId: "stove-3", area: 8 },
  { id: "waiter-2", kind: "waiter", pos: { x: 70, y: 10 * AREA_H + 120 }, price: 1_800_000_000, label: "海水館 案内員", area: 10 },
  { id: "robot-2", kind: "robot", pos: { x: 290, y: 11 * AREA_H + 120 }, price: 8_000_000_000, label: "海水館 案内ロボ", area: 11 },
  { id: "cook-4", kind: "cook", pos: { x: 245, y: 12 * AREA_H + 112 }, price: 24_000_000_000, label: "世界の海 発券スタッフ", stoveId: "stove-4", area: 12 },
  { id: "waiter-3", kind: "waiter", pos: { x: 70, y: 14 * AREA_H + 120 }, price: 300_000_000_000, label: "大型水槽 案内員", area: 14 },
  { id: "robot-3", kind: "robot", pos: { x: 290, y: 15 * AREA_H + 120 }, price: 900_000_000_000, label: "外洋案内ロボ", area: 15 },
  { id: "cook-5", kind: "cook", pos: { x: 245, y: 16 * AREA_H + 112 }, price: 2_400_000_000_000, label: "深海館 発券スタッフ", stoveId: "stove-5", area: 16 },
  { id: "master-1", kind: "master", pos: { x: 180, y: 17 * AREA_H + 120 }, price: 8_000_000_000_000, label: "世界水族館 館長", area: 17 },
];

const aquariumEquipment: EquipSpec[] = [
  { id: "gate", name: "自動入場ゲート", detail: "入場処理を自動化する", pos: { x: 112, y: 0 }, price: 18_000, area: 0, outside: true, unlockAfter: "gatekeeper-1" },
  { id: "announce", name: "館内アナウンス", detail: "展示の魅力を知らせて集客 1.35倍", pos: { x: 280, y: 0 }, price: 75_000, area: 0, outside: true, row: 1, draw: 1.35, unlockAfter: "area-2" },
  { id: "jelly-light", name: "水槽ライティング", detail: "幻想的な照明で集客 1.45倍", pos: { x: 90, y: 6 * AREA_H + 120 }, price: 12_000_000, area: 6, draw: 1.45 },
  { id: "ocean-sign", name: "海水館 巨大サイネージ", detail: "海水館オープンを告知。集客 1.6倍", pos: { x: 270, y: 8 * AREA_H + 120 }, price: 180_000_000, area: 8, draw: 1.6 },
  { id: "night", name: "ナイトアクアリウム", detail: "夜の水族館を開催。集客 1.8倍", pos: { x: 90, y: 12 * AREA_H + 120 }, price: 45_000_000_000, area: 12, draw: 1.8 },
  { id: "world-pr", name: "WORLD OCEAN CAMPAIGN", detail: "世界水族館として話題になる。集客 2.2倍", pos: { x: 270, y: 15 * AREA_H + 120 }, price: 1_200_000_000_000, area: 15, draw: 2.2 },
];

const aquariumUpgrades: Upgrade[] = [
  { id: "carry", name: "チケットホルダー", detail: (n) => `${3 + n}枚まで持てる・案内員も ${3 + Math.floor(n / 2)}枚`, pos: { x: 46, y: 66 }, basePrice: 70, growth: 1.7, max: 10, unlockAfter: "tank-0-2" },
  { id: "speed", name: "館内シューズ", detail: (n) => `移動速度 +${n * 10}%・スタッフも +${n * 5}%`, pos: { x: 138, y: 66 }, basePrice: 60, growth: 1.65, max: 12, unlockAfter: "waiter-1" },
  { id: "cook", name: "高速発券端末", detail: (n) => `発券速度 +${Math.round((Math.pow(1 / 0.92, n) - 1) * 100)}%`, pos: { x: 230, y: 66 }, basePrice: 100, growth: 1.7, max: 14, unlockAfter: "stove-2" },
  { id: "price", name: "プレミアム観覧券", detail: (n) => `観覧単価 ${Math.round(60 * Math.pow(1.4, n))}円`, pos: { x: 314, y: 66 }, basePrice: 140, growth: 1.75, max: 20, unlockAfter: "tank-1-3" },
];

const staffLabels: Record<StaffKind, string> = {
  waiter: "館内案内員",
  robot: "案内ロボ",
  collector: "集金係",
  cook: "発券スタッフ",
  master: "館長",
  busser: "清掃スタッフ",
  stocker: "ショップ品出し",
  server: "カフェスタッフ",
  seller: "入場券係",
  gatekeeper: "入場ゲート係",
  hunter: "飼育員",
  logger: "飼育員",
  splitter: "飼育員",
  butcher: "飼育員",
  builder: "施工スタッフ",
  keeper: "飼育員",
  nightman: "ナイト担当",
  explorer: "調査員",
  runner: "飼育員",
  boat: "運搬ボート",
  scribe: "記録係",
  officer: "管理係",
  carver: "造形スタッフ",
};

const aquariumLabels: StageLabels = {
  item: "観覧券",
  producer: "発券端末",
  tray: "展示入口",
  guest: "来館者",
  using: "観覧中",
  staff: staffLabels,
  objective: {
    pickup: "発券端末から観覧券を取ろう",
    serve: "展示を待っている来館者へ観覧券を渡そう",
    coin: "観覧を終えた来館者の売上を回収しよう",
    waitItem: "観覧券ができるのを待とう",
    waitGuest: "次の来館者を待とう",
  },
  outside: "水族館エントランス",
  outsideDetail: "入場ゲートと集客設備を置くエントランス",
  auto: "自動案内端末",
};

/**
 * Runtime側は id を park にして、既存のパーク専用描画（観覧券・来場客）を使う。
 * 保存キーとトップカードは下の aquarium id を使うので、ドリームパークの進行とは分離される。
 */
const aquariumRuntimeDef: StageDef = {
  id: "park",
  visualTheme: "aquarium",
  name: "世界水族館",
  subtitle: "メダカから、40億年前の海へ",
  icon: "🐠",
  itemIcon: "🎟️",
  frontRoom: { top: 38, bottom: 210 },
  areas: aquariumAreas,
  stoves: [...aquariumTicketStoves, ...aquariumTanks],
  seats: aquariumSeats,
  hires: aquariumHires,
  equipment: aquariumEquipment,
  upgrades: aquariumUpgrades,
  labels: aquariumLabels,
  baseValue: 60,
  admission: 20,
  autoServer: true,
  requiresAreas: 0,
  start: ["stove-1", "tank-0-1", "seat-0-1"],
  queue: true,
  view: 380,
  startPos: { x: 180, y: 245 },
};

const aquariumStageId = AQUARIUM_ID as unknown as StageId;
const aquariumCardDef: StageDef = {
  ...aquariumRuntimeDef,
  id: aquariumStageId,
};

// stageDefs / stageList は既存データを壊さず、起動時に水族館だけ追加する。
const runtimeDefs = stageDefs as unknown as Record<string, StageDef>;
runtimeDefs[AQUARIUM_ID] = aquariumRuntimeDef;

if (!stageList.some((item) => String(item.id) === AQUARIUM_ID)) {
  stageList.push(aquariumCardDef);
}

export { aquariumCardDef, aquariumRuntimeDef };
