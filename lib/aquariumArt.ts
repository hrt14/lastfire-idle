import {
  clipTankInterior,
  drawSwimBand,
  drawTankFrame,
  getAquariumDisplay,
} from "./aquariumDisplay";

type Habitat =
  | "satogawa"
  | "mountain"
  | "great-river"
  | "mekong"
  | "flooded-forest"
  | "africa"
  | "amazon"
  | "amazon-giant"
  | "japan-sea"
  | "cold-sea"
  | "okinawa"
  | "kelp"
  | "seasia"
  | "great-reef"
  | "indian"
  | "open-ocean"
  | "deep-sea"
  | "world-ocean"
  /* --- 施設棟 --- */
  | "shop-case"
  | "dining"
  | "terrarium"
  /* --- 古代棟。時代が古いほど、水も岩も違う色になる --- */
  | "lost-sea"
  | "holocene"
  | "ice-sea"
  | "giant-shark-sea"
  | "warm-shallow"
  | "paleo-shore"
  | "paleo-river"
  | "mesozoic-sea"
  | "lagoon"
  | "dead-sea"
  | "permian-sea"
  | "carbon-swamp"
  | "crinoid-sea"
  | "devonian"
  | "silurian"
  | "ordovician"
  | "cambrian"
  | "ediacaran"
  | "stromatolite-sea"
  | "hadean";

type Creature =
  | "tiny"
  | "small"
  | "round"
  | "loach"
  | "trout"
  | "carp"
  | "catfish"
  | "knife"
  | "betta"
  | "arowana"
  | "cichlid"
  | "perch"
  | "angel"
  | "discus"
  | "piranha"
  | "ray"
  | "turtle"
  | "bream"
  | "rockfish"
  | "octopus"
  | "eel"
  | "salmon"
  | "crab"
  | "clown"
  | "butterfly"
  | "shark"
  | "lionfish"
  | "puffer"
  | "napoleon"
  | "tuna"
  | "isopod"
  | "angler"
  | "manta"
  | "whale-shark"
  /* --- ショップの売り物。泳がずに棚へ並ぶ --- */
  | "plush"
  | "trinket"
  | "fossil"
  | "mineral"
  /* --- 両生類・爬虫類 --- */
  | "frog"
  | "salamander"
  | "snake"
  | "lizard"
  | "crocodile"
  /* --- 海の哺乳類・鳥 --- */
  | "seal"
  | "seacow"
  | "diveBird"
  | "whale"
  | "serpentWhale"
  | "dolphin"
  | "landbeast"
  /* --- 中生代の海生爬虫類 --- */
  | "mosasaur"
  | "plesiosaur"
  | "pliosaur"
  | "spinosaur"
  /* --- 殻をもつもの --- */
  | "ammonite"
  | "belemnite"
  | "orthocone"
  | "bivalve"
  /* --- 古生代 --- */
  | "trilobite"
  | "eurypterid"
  | "placoderm"
  | "earlyshark"
  | "tetrapod"
  | "lobefin"
  | "sturgeon"
  | "sawfish"
  | "crinoid"
  | "horseshoe"
  | "nymph"
  | "graptolite"
  /* --- カンブリア紀とその前 --- */
  | "anomalocaris"
  | "opabinia"
  | "hallucigenia"
  | "pikaia"
  | "dickinsonia"
  | "charnia"
  | "stromatolite"
  | "microbe";

type Pattern = "none" | "spots" | "stripes" | "red-belly" | "neon" | "glow";

type ExhibitVisual = {
  name: string;
  habitat: Habitat;
  primary: Creature;
  secondary?: Creature;
  count: number;
  color: string;
  secondaryColor?: string;
  heroScale?: number;
  pattern?: Pattern;
  density?: number;
  /**
   * 泳がない展示。棚の商品・海底に固定された生きもの・岩は、
   * 動かして並べると「魚が変な泳ぎ方をしている」ように見えてしまう。
   */
  still?: boolean;
  /** 並べる高さ（still のときだけ）。棚は上寄り、海底は下寄り */
  stillBase?: number;
};

const TAU = Math.PI * 2;

const DARK_OUTLINE = "rgba(5,22,28,0.84)";
/*
 * いま描いている水槽の輪郭色。暗い水では明るい輪郭、明るい水では濃い輪郭にする。
 * 引数で全ての生きものへ配るより安く、描画は同期処理なので取り違えは起きない。
 */
let outlineColor = DARK_OUTLINE;

/**
 * 54区画 × 3展示。名前が変われば必ず別設定を使う。
 * 同区画内でも生きもののシルエット・色・匹数・主役サイズの最低2点を変える。
 *
 * 0〜17  本館（現世の世界の海）
 * 18〜21 施設棟（ショップ・レストラン・両生類館・爬虫類館）
 * 22〜53 古代棟（時代をさかのぼり、最後は生命誕生の海）
 */
const EXHIBITS: ExhibitVisual[][] = [
  [
    { name: "メダカの群れ", habitat: "satogawa", primary: "tiny", count: 9, color: "#e9d982", pattern: "none" },
    { name: "ドジョウとフナ", habitat: "satogawa", primary: "loach", secondary: "round", count: 5, color: "#8b7048", secondaryColor: "#c7a66b" },
    { name: "オイカワ・タナゴ・ナマズ", habitat: "satogawa", primary: "small", secondary: "catfish", count: 7, color: "#72c2d1", secondaryColor: "#506b69", heroScale: 1.45, pattern: "neon" },
  ],
  [
    { name: "アユ", habitat: "mountain", primary: "trout", count: 5, color: "#c6d9c2" },
    { name: "ヤマメ", habitat: "mountain", primary: "trout", count: 4, color: "#aab6a1", pattern: "spots", heroScale: 1.08 },
    { name: "イワナ", habitat: "mountain", primary: "trout", count: 3, color: "#596f67", pattern: "spots", heroScale: 1.32 },
  ],
  [
    { name: "コイの群れ", habitat: "great-river", primary: "carp", count: 6, color: "#d4a56b", heroScale: 1.08 },
    { name: "フナ・ドジョウ", habitat: "great-river", primary: "round", secondary: "loach", count: 6, color: "#9d9275", secondaryColor: "#6f6248" },
    { name: "大型ナマズ", habitat: "great-river", primary: "catfish", count: 2, color: "#526e72", heroScale: 1.85 },
  ],
  [
    { name: "ラスボラ", habitat: "mekong", primary: "tiny", count: 12, color: "#d1a65e", pattern: "stripes" },
    { name: "グラミー・ナイフフィッシュ", habitat: "mekong", primary: "round", secondary: "knife", count: 5, color: "#7db6ac", secondaryColor: "#8d9ba6", heroScale: 1.25 },
    { name: "メコンの巨大ナマズ", habitat: "mekong", primary: "catfish", count: 1, color: "#b7c1b4", heroScale: 2.25 },
  ],
  [
    { name: "ベタと小型魚", habitat: "flooded-forest", primary: "betta", secondary: "tiny", count: 6, color: "#dc6488", secondaryColor: "#88c6a9", heroScale: 1.25 },
    { name: "クラウンローチ", habitat: "flooded-forest", primary: "loach", count: 6, color: "#e6a341", pattern: "stripes" },
    { name: "アジアアロワナ", habitat: "flooded-forest", primary: "arowana", count: 2, color: "#c96842", heroScale: 1.85 },
  ],
  [
    { name: "コンゴテトラ", habitat: "africa", primary: "small", count: 9, color: "#b7d7d4", pattern: "neon" },
    { name: "カラフルシクリッド", habitat: "africa", primary: "cichlid", count: 10, color: "#f2c84b", secondaryColor: "#5da7d6", pattern: "stripes" },
    { name: "ナイルパーチ級大型魚", habitat: "africa", primary: "perch", count: 2, color: "#9aa48d", heroScale: 1.95 },
  ],
  [
    { name: "ネオンテトラの大群", habitat: "amazon", primary: "tiny", count: 18, color: "#42c4ed", secondaryColor: "#e85a68", pattern: "neon", density: 1.35 },
    { name: "コリドラス・エンゼルフィッシュ", habitat: "amazon", primary: "small", secondary: "angel", count: 7, color: "#a8a58d", secondaryColor: "#d8d6c8", heroScale: 1.28, pattern: "stripes" },
    { name: "ディスカス", habitat: "amazon", primary: "discus", count: 5, color: "#e7764e", secondaryColor: "#5aa8c0", pattern: "stripes", heroScale: 1.18 },
  ],
  [
    { name: "ピラニア", habitat: "amazon-giant", primary: "piranha", count: 8, color: "#7b8580", secondaryColor: "#d55748", pattern: "red-belly" },
    { name: "淡水エイ・アロワナ", habitat: "amazon-giant", primary: "ray", secondary: "arowana", count: 3, color: "#8c7762", secondaryColor: "#b86f45", heroScale: 1.45, pattern: "spots" },
    { name: "ピラルク", habitat: "amazon-giant", primary: "arowana", count: 1, color: "#4e5c55", secondaryColor: "#bc4b46", heroScale: 2.55, pattern: "red-belly" },
  ],
  [
    { name: "イワシ・アジの群れ", habitat: "japan-sea", primary: "small", count: 17, color: "#c8dce1", pattern: "neon", density: 1.25 },
    { name: "タイ・カサゴ", habitat: "japan-sea", primary: "bream", secondary: "rockfish", count: 6, color: "#e58e82", secondaryColor: "#b85a42", heroScale: 1.3 },
    { name: "タコ・ウツボ", habitat: "japan-sea", primary: "octopus", secondary: "eel", count: 3, color: "#ad685f", secondaryColor: "#8b8b55", heroScale: 1.45, pattern: "spots" },
  ],
  [
    { name: "サケ", habitat: "cold-sea", primary: "salmon", count: 5, color: "#b8c7ca", secondaryColor: "#d56f62", heroScale: 1.18 },
    { name: "ホッケと冷水魚", habitat: "cold-sea", primary: "small", secondary: "rockfish", count: 8, color: "#9fb1b6", secondaryColor: "#7b8790" },
    { name: "北海のカニ", habitat: "cold-sea", primary: "crab", count: 4, color: "#c86b51", heroScale: 1.45 },
  ],
  [
    { name: "クマノミ・スズメダイ", habitat: "okinawa", primary: "clown", secondary: "tiny", count: 11, color: "#f28c42", secondaryColor: "#4aa8df", pattern: "stripes" },
    { name: "チョウチョウウオ・ツノダシ", habitat: "okinawa", primary: "butterfly", count: 8, color: "#f3d247", secondaryColor: "#252f3a", pattern: "stripes", heroScale: 1.12 },
    { name: "ウミガメ", habitat: "okinawa", primary: "turtle", secondary: "tiny", count: 5, color: "#5d8a67", secondaryColor: "#7bd3da", heroScale: 1.85 },
  ],
  [
    { name: "ケルプの小魚群", habitat: "kelp", primary: "small", count: 13, color: "#c7d6b4", density: 1.1 },
    { name: "ロックフィッシュ", habitat: "kelp", primary: "rockfish", count: 6, color: "#d87750", heroScale: 1.22 },
    { name: "小型サメ", habitat: "kelp", primary: "shark", secondary: "small", count: 4, color: "#7798a4", secondaryColor: "#c5d4c0", heroScale: 1.5 },
  ],
  [
    { name: "ハナダイの大群", habitat: "seasia", primary: "tiny", count: 19, color: "#ed7e87", secondaryColor: "#f4ae63", density: 1.4 },
    { name: "ミノカサゴ・フグ", habitat: "seasia", primary: "lionfish", secondary: "puffer", count: 4, color: "#c76d56", secondaryColor: "#e2c873", heroScale: 1.35, pattern: "stripes" },
    { name: "小型エイ", habitat: "seasia", primary: "ray", secondary: "tiny", count: 5, color: "#7c8e8b", secondaryColor: "#e0a56d", heroScale: 1.55, pattern: "spots" },
  ],
  [
    { name: "巨大サンゴ礁の魚群", habitat: "great-reef", primary: "tiny", secondary: "butterfly", count: 22, color: "#63b8e5", secondaryColor: "#f2d158", density: 1.55 },
    { name: "ウミガメ・大型エイ", habitat: "great-reef", primary: "turtle", secondary: "ray", count: 4, color: "#668d6d", secondaryColor: "#889598", heroScale: 1.7 },
    { name: "リーフシャーク", habitat: "great-reef", primary: "shark", secondary: "tiny", count: 5, color: "#829ea7", secondaryColor: "#f2be64", heroScale: 1.72 },
  ],
  [
    { name: "ナポレオンフィッシュ", habitat: "indian", primary: "napoleon", count: 2, color: "#4f9c91", heroScale: 1.8 },
    { name: "大型エイ", habitat: "indian", primary: "ray", count: 2, color: "#75878c", heroScale: 2.05, pattern: "spots" },
    { name: "大型サメ", habitat: "indian", primary: "shark", count: 2, color: "#718b99", heroScale: 2.15 },
  ],
  [
    { name: "イワシ200匹級の大群", habitat: "open-ocean", primary: "tiny", count: 28, color: "#d4e5ea", pattern: "neon", density: 1.9 },
    { name: "マグロ・カツオ", habitat: "open-ocean", primary: "tuna", count: 7, color: "#5f8da8", secondaryColor: "#d5dfe0", heroScale: 1.38 },
    { name: "サメ・大型エイ", habitat: "open-ocean", primary: "shark", secondary: "ray", count: 4, color: "#718b9d", secondaryColor: "#7c8e96", heroScale: 1.95 },
  ],
  [
    { name: "オオグソクムシ", habitat: "deep-sea", primary: "isopod", count: 4, color: "#8891a0", heroScale: 1.38 },
    { name: "タカアシガニ", habitat: "deep-sea", primary: "crab", count: 2, color: "#b45f54", heroScale: 2.05 },
    { name: "発光深海魚", habitat: "deep-sea", primary: "angler", secondary: "tiny", count: 8, color: "#28364c", secondaryColor: "#6de7e0", heroScale: 1.55, pattern: "glow" },
  ],
  [
    { name: "世界の魚群", habitat: "world-ocean", primary: "small", secondary: "butterfly", count: 26, color: "#b8dbe8", secondaryColor: "#edc65e", density: 1.7 },
    { name: "マンタ・大型サメ", habitat: "world-ocean", primary: "manta", secondary: "shark", count: 4, color: "#596f7c", secondaryColor: "#7c939f", heroScale: 2.0 },
    { name: "ジンベエザメ級の巨大魚", habitat: "world-ocean", primary: "whale-shark", secondary: "tiny", count: 8, color: "#557b91", secondaryColor: "#d4e9ec", heroScale: 2.65, pattern: "spots" },
  ],

  /* ==================== 施設棟（18〜21） ==================== */
  [
    { name: "ぬいぐるみの棚", habitat: "shop-case", primary: "plush", secondary: "plush", count: 8, color: "#e88fa8", secondaryColor: "#6fc3dd", still: true, stillBase: 4 },
    { name: "深海グッズの棚", habitat: "shop-case", primary: "trinket", count: 8, color: "#6fe6cf", secondaryColor: "#3a4b58", pattern: "glow", still: true, stillBase: 4 },
    { name: "化石レプリカの棚", habitat: "shop-case", primary: "fossil", count: 6, color: "#d3bd8b", still: true, stillBase: 4, heroScale: 1.25 },
  ],
  [
    { name: "窓ぎわのテーブル", habitat: "dining", primary: "small", count: 8, color: "#8fd6e0" },
    { name: "大水槽前のテーブル", habitat: "dining", primary: "small", secondary: "ray", count: 10, color: "#a7e2ea", secondaryColor: "#5b7f8d", heroScale: 1.2 },
    { name: "水中ダイニング", habitat: "dining", primary: "tiny", secondary: "shark", count: 16, color: "#cbeef5", secondaryColor: "#6d8fa0", heroScale: 1.5, density: 1.15 },
  ],
  [
    { name: "ヤドクガエルの森", habitat: "terrarium", primary: "frog", count: 5, color: "#3fc86a", secondaryColor: "#ffd34a", pattern: "spots" },
    { name: "イモリとサンショウウオ", habitat: "terrarium", primary: "salamander", secondary: "salamander", count: 5, color: "#4d5c46", secondaryColor: "#c9553a", pattern: "red-belly" },
    { name: "オオサンショウウオ", habitat: "terrarium", primary: "salamander", count: 1, color: "#6d6a52", heroScale: 2.5, pattern: "spots" },
  ],
  [
    { name: "ミズガメの池", habitat: "terrarium", primary: "turtle", count: 3, color: "#5f7a4a", heroScale: 1.25 },
    { name: "ウミヘビとトカゲ", habitat: "terrarium", primary: "snake", secondary: "lizard", count: 4, color: "#c9b05a", secondaryColor: "#6f8f4e", pattern: "stripes" },
    { name: "イリエワニ", habitat: "terrarium", primary: "crocodile", count: 1, color: "#5c6647", heroScale: 2.3 },
  ],

  /* ==================== 古代棟（22〜53） ====================
   * 1区画さかのぼるごとに、主役の形が今の魚から離れていく。
   */
  [
    { name: "ニホンアシカ", habitat: "lost-sea", primary: "seal", count: 2, color: "#5c4f42", heroScale: 1.35 },
    { name: "クニマス", habitat: "lost-sea", primary: "trout", count: 6, color: "#5e6a6f", pattern: "spots" },
    { name: "ステラーカイギュウ", habitat: "lost-sea", primary: "seacow", count: 1, color: "#6b6154", heroScale: 2.3 },
  ],
  [
    { name: "オオウミガラス", habitat: "holocene", primary: "diveBird", count: 4, color: "#2c3238", secondaryColor: "#f0f0e6" },
    { name: "巨大チョウザメ", habitat: "holocene", primary: "sturgeon", count: 2, color: "#7d8570", secondaryColor: "#c9c3a6", heroScale: 1.7 },
    { name: "縄文の内湾", habitat: "holocene", primary: "small", secondary: "bivalve", count: 11, color: "#9dc7b4", secondaryColor: "#b9a582" },
  ],
  [
    { name: "氷の下のタラ", habitat: "ice-sea", primary: "small", count: 15, color: "#b9cbd4", density: 1.2 },
    { name: "タテゴトアザラシ", habitat: "ice-sea", primary: "seal", count: 3, color: "#e2e8ec", secondaryColor: "#4c5a63", pattern: "spots" },
    { name: "ホッキョククジラ", habitat: "ice-sea", primary: "whale", count: 1, color: "#3d4a56", heroScale: 2.4 },
  ],
  [
    { name: "メガロドンの歯", habitat: "giant-shark-sea", primary: "fossil", count: 5, color: "#d9cbaa", still: true, heroScale: 1.2 },
    { name: "古代のホホジロザメ", habitat: "giant-shark-sea", primary: "shark", count: 3, color: "#71818c", heroScale: 1.45 },
    { name: "メガロドン", habitat: "giant-shark-sea", primary: "shark", secondary: "tiny", count: 6, color: "#4d5a63", secondaryColor: "#cfe4ea", heroScale: 2.7 },
  ],
  [
    { name: "アクロフィセター", habitat: "giant-shark-sea", primary: "dolphin", count: 3, color: "#5d6b74" },
    { name: "古代のイルカ", habitat: "giant-shark-sea", primary: "dolphin", count: 7, color: "#8fa3ad" },
    { name: "リヴィアタン", habitat: "giant-shark-sea", primary: "whale", count: 1, color: "#43505a", heroScale: 2.5 },
  ],
  [
    { name: "デスモスチルス", habitat: "warm-shallow", primary: "landbeast", count: 2, color: "#6f6250" },
    { name: "パレオパラドキシア", habitat: "warm-shallow", primary: "landbeast", count: 3, color: "#7d7057", pattern: "spots" },
    { name: "ケントリオドンの群れ", habitat: "warm-shallow", primary: "dolphin", count: 10, color: "#7f97a4", heroScale: 1.5 },
  ],
  [
    { name: "巨大ペンギン", habitat: "ice-sea", primary: "diveBird", count: 5, color: "#2f3a43", secondaryColor: "#f2efe4", heroScale: 1.4 },
    { name: "アエティオケタス", habitat: "ice-sea", primary: "whale", count: 2, color: "#57646d", heroScale: 1.6 },
    { name: "原始のカイギュウ", habitat: "ice-sea", primary: "seacow", count: 2, color: "#75695a", heroScale: 2.0 },
  ],
  [
    { name: "ドルドン", habitat: "giant-shark-sea", primary: "whale", count: 3, color: "#5b6a72" },
    { name: "原始のマナティー", habitat: "giant-shark-sea", primary: "seacow", count: 2, color: "#7a6d5d" },
    { name: "バシロサウルス", habitat: "giant-shark-sea", primary: "serpentWhale", count: 1, color: "#3f4c55", heroScale: 2.6 },
  ],
  [
    { name: "パキケトゥス", habitat: "paleo-shore", primary: "landbeast", count: 3, color: "#7c6a4c" },
    { name: "アンブロケトゥス", habitat: "paleo-shore", primary: "landbeast", count: 2, color: "#6a5c42", heroScale: 1.55 },
    { name: "ロドケトゥス", habitat: "paleo-shore", primary: "landbeast", secondary: "small", count: 5, color: "#5e5340", secondaryColor: "#9fc0a8", heroScale: 2.2 },
  ],
  [
    { name: "巨大ガー", habitat: "paleo-river", primary: "sturgeon", count: 4, color: "#6d7a55", secondaryColor: "#b6b98d", heroScale: 1.45 },
    { name: "カルボネミス", habitat: "paleo-river", primary: "turtle", count: 2, color: "#5b5a41", heroScale: 1.85 },
    { name: "ティタノボア", habitat: "paleo-river", primary: "snake", count: 1, color: "#4f5b3b", heroScale: 2.6, pattern: "spots" },
  ],
  [
    { name: "最後のアンモナイト", habitat: "mesozoic-sea", primary: "ammonite", count: 7, color: "#c2a877", secondaryColor: "#7a6242" },
    { name: "プログナトドン", habitat: "mesozoic-sea", primary: "mosasaur", count: 2, color: "#4c6069", heroScale: 1.5 },
    { name: "モササウルス", habitat: "mesozoic-sea", primary: "mosasaur", secondary: "ammonite", count: 5, color: "#3b525f", secondaryColor: "#b39a68", heroScale: 2.6 },
  ],
  [
    { name: "ヘスペロルニス", habitat: "mesozoic-sea", primary: "diveBird", count: 5, color: "#465049", secondaryColor: "#cfd6c4" },
    { name: "クシファクティヌス", habitat: "mesozoic-sea", primary: "tuna", count: 2, color: "#8a9aa2", heroScale: 1.9 },
    { name: "アーケロン", habitat: "mesozoic-sea", primary: "turtle", count: 1, color: "#59604b", heroScale: 2.6 },
  ],
  [
    { name: "イノセラムス", habitat: "mesozoic-sea", primary: "bivalve", count: 8, color: "#b6a684", still: true },
    { name: "スティクソサウルス", habitat: "mesozoic-sea", primary: "plesiosaur", count: 2, color: "#54677a", heroScale: 1.45 },
    { name: "エラスモサウルス", habitat: "mesozoic-sea", primary: "plesiosaur", count: 1, color: "#405568", heroScale: 2.4 },
  ],
  [
    { name: "オンコプリスティス", habitat: "paleo-river", primary: "sawfish", count: 3, color: "#7d7f61" },
    { name: "マウソニア", habitat: "paleo-river", primary: "lobefin", count: 2, color: "#5f6b56", heroScale: 1.55 },
    { name: "スピノサウルス", habitat: "paleo-river", primary: "spinosaur", count: 1, color: "#6a5b46", heroScale: 2.4, pattern: "stripes" },
  ],
  [
    { name: "レプトレピス", habitat: "mesozoic-sea", primary: "tiny", count: 18, color: "#c5d8de", density: 1.25 },
    { name: "メトリオリンクス", habitat: "mesozoic-sea", primary: "mosasaur", count: 3, color: "#4e5f52" },
    { name: "リオプレウロドン", habitat: "mesozoic-sea", primary: "pliosaur", count: 1, color: "#3d4f5c", heroScale: 2.5 },
  ],
  [
    { name: "ベレムナイト", habitat: "mesozoic-sea", primary: "belemnite", count: 10, color: "#9fb2b6" },
    { name: "アンモナイトの群れ", habitat: "mesozoic-sea", primary: "ammonite", count: 9, color: "#c9ad78", secondaryColor: "#7a6242" },
    { name: "イクチオサウルス", habitat: "mesozoic-sea", primary: "dolphin", count: 2, color: "#4f6470", heroScale: 2.1 },
  ],
  [
    { name: "古代のカブトガニ", habitat: "lagoon", primary: "horseshoe", count: 4, color: "#8a7248" },
    { name: "アスピドリンクス", habitat: "lagoon", primary: "small", count: 9, color: "#c3c3a3" },
    { name: "ゾルンホーフェンの潟", habitat: "lagoon", primary: "fossil", secondary: "ammonite", count: 7, color: "#ded6b8", secondaryColor: "#b8a271", still: true, heroScale: 1.35 },
  ],
  [
    { name: "タニストロフェウス", habitat: "mesozoic-sea", primary: "plesiosaur", count: 2, color: "#63705c", heroScale: 1.35 },
    { name: "プラコダス", habitat: "mesozoic-sea", primary: "turtle", count: 4, color: "#7a6b4e" },
    { name: "ショニサウルス", habitat: "mesozoic-sea", primary: "dolphin", secondary: "tiny", count: 8, color: "#44545f", secondaryColor: "#cfe1e6", heroScale: 2.9 },
  ],
  [
    { name: "ヘノドゥス", habitat: "lagoon", primary: "turtle", count: 3, color: "#8a7a55" },
    { name: "ノトサウルス", habitat: "lagoon", primary: "plesiosaur", count: 3, color: "#6b7355" },
    { name: "よみがえる礁", habitat: "lagoon", primary: "small", secondary: "ammonite", count: 13, color: "#e0a76a", secondaryColor: "#b39a68", heroScale: 1.2 },
  ],
  [
    { name: "クラライアの海底", habitat: "dead-sea", primary: "bivalve", count: 13, color: "#8b7b74", still: true, density: 1.3 },
    { name: "最後の三葉虫", habitat: "dead-sea", primary: "trilobite", count: 1, color: "#7a5f58", heroScale: 1.9 },
    { name: "酸欠の海", habitat: "dead-sea", primary: "microbe", count: 16, color: "#c99ac2", secondaryColor: "#f0c8ea", pattern: "glow", heroScale: 1.2 },
  ],
  [
    { name: "ゴニアタイト", habitat: "permian-sea", primary: "ammonite", count: 8, color: "#a89468", secondaryColor: "#6b5a3c" },
    { name: "メソサウルス", habitat: "permian-sea", primary: "plesiosaur", count: 4, color: "#5f6b52" },
    { name: "ヘリコプリオン", habitat: "permian-sea", primary: "earlyshark", count: 1, color: "#5c6a6c", heroScale: 2.5 },
  ],
  [
    { name: "巨大なヤゴ", habitat: "carbon-swamp", primary: "nymph", count: 5, color: "#6b7248" },
    { name: "プロテロギリヌス", habitat: "carbon-swamp", primary: "tetrapod", count: 3, color: "#5b6440" },
    { name: "エオギリヌス", habitat: "carbon-swamp", primary: "tetrapod", count: 1, color: "#48543a", heroScale: 2.5, pattern: "stripes" },
  ],
  [
    { name: "ウミユリの森", habitat: "crinoid-sea", primary: "crinoid", count: 8, color: "#d8c9a4", secondaryColor: "#8a7a58", still: true, stillBase: 6 },
    { name: "ファルカタス", habitat: "crinoid-sea", primary: "earlyshark", count: 6, color: "#7e8d84" },
    { name: "ステタカントゥス", habitat: "crinoid-sea", primary: "earlyshark", count: 2, color: "#5f7069", heroScale: 2.0 },
  ],
  [
    { name: "ボスリオレピス", habitat: "devonian", primary: "placoderm", count: 5, color: "#7a7357", secondaryColor: "#a89b74" },
    { name: "クラドセラケ", habitat: "devonian", primary: "earlyshark", count: 5, color: "#8b8f7e" },
    { name: "ダンクルオステウス", habitat: "devonian", primary: "placoderm", count: 1, color: "#5c6350", secondaryColor: "#9aa383", heroScale: 2.8 },
  ],
  [
    { name: "ハイネリア", habitat: "paleo-shore", primary: "lobefin", count: 2, color: "#6a6b4a", heroScale: 1.65 },
    { name: "ティクターリク", habitat: "paleo-shore", primary: "tetrapod", count: 2, color: "#7b7550" },
    { name: "イクチオステガ", habitat: "paleo-shore", primary: "tetrapod", count: 1, color: "#6e6845", heroScale: 2.4, pattern: "spots" },
  ],
  [
    { name: "ケファラスピス", habitat: "silurian", primary: "placoderm", count: 6, color: "#8a7a54", secondaryColor: "#b5a377" },
    { name: "最初のサンゴ礁", habitat: "silurian", primary: "crinoid", secondary: "trilobite", count: 9, color: "#d3b47f", secondaryColor: "#7d6a4e", still: true, stillBase: 6 },
    { name: "プテリゴトゥス", habitat: "silurian", primary: "eurypterid", count: 1, color: "#6d5236", heroScale: 2.5 },
  ],
  [
    { name: "三葉虫の群れ", habitat: "ordovician", primary: "trilobite", count: 11, color: "#6f6350", density: 1.15 },
    { name: "筆石の帯", habitat: "ordovician", primary: "graptolite", count: 9, color: "#4f5a5e" },
    { name: "カメロケラス", habitat: "ordovician", primary: "orthocone", count: 1, color: "#b09a6a", secondaryColor: "#6b5a3c", heroScale: 2.6 },
  ],
  [
    { name: "ウィワクシア", habitat: "cambrian", primary: "hallucigenia", count: 6, color: "#a08553" },
    { name: "ハルキゲニア", habitat: "cambrian", primary: "hallucigenia", count: 8, color: "#c0a06a", pattern: "stripes" },
    { name: "アノマロカリス", habitat: "cambrian", primary: "anomalocaris", count: 1, color: "#c2603f", secondaryColor: "#f4d9a8", heroScale: 2.4 },
  ],
  [
    { name: "マルレラ", habitat: "cambrian", primary: "trilobite", count: 12, color: "#8d7a5f", density: 1.25 },
    { name: "オパビニア", habitat: "cambrian", primary: "opabinia", count: 4, color: "#c98a5a", secondaryColor: "#f0d3a4" },
    { name: "ピカイア", habitat: "cambrian", primary: "pikaia", count: 10, color: "#d6c69a", secondaryColor: "#7d6a4a", heroScale: 1.7 },
  ],
  [
    { name: "スプリギナ", habitat: "ediacaran", primary: "dickinsonia", count: 6, color: "#c98f6a" },
    { name: "カルニア", habitat: "ediacaran", primary: "charnia", count: 5, color: "#b7845f", secondaryColor: "#8a6a4a", still: true, stillBase: 6 },
    { name: "ディッキンソニア", habitat: "ediacaran", primary: "dickinsonia", count: 3, color: "#d29a6b", heroScale: 2.2, pattern: "stripes" },
  ],
  [
    { name: "シアノバクテリアの膜", habitat: "stromatolite-sea", primary: "microbe", count: 18, color: "#7fae5c", secondaryColor: "#c8e88a", density: 1.3 },
    { name: "縞状鉄鉱層", habitat: "stromatolite-sea", primary: "mineral", count: 6, color: "#9c5f45", secondaryColor: "#e0b088", still: true },
    { name: "ストロマトライト", habitat: "stromatolite-sea", primary: "stromatolite", count: 4, color: "#8e7d52", secondaryColor: "#d6c48a", still: true, stillBase: 6, heroScale: 1.8 },
  ],
  [
    { name: "熱水の煙突", habitat: "hadean", primary: "mineral", count: 3, color: "#4c3a38", secondaryColor: "#ff9a5c", still: true, stillBase: 8, heroScale: 1.6 },
    { name: "最初の膜", habitat: "hadean", primary: "microbe", count: 13, color: "#ffb27a", secondaryColor: "#ffe0b4", pattern: "glow" },
    { name: "生命誕生の海", habitat: "hadean", primary: "microbe", secondary: "stromatolite", count: 20, color: "#ffc78f", secondaryColor: "#6a5340", pattern: "glow", heroScale: 2.2 },
  ],
];

const HABITAT_COLORS: Record<Habitat, [string, string, string]> = {
  satogawa: ["#bfe9e3", "#65b9b2", "#c9b988"],
  mountain: ["#bce9f1", "#4a9fb6", "#788c88"],
  "great-river": ["#9fc7aa", "#5d8a72", "#8b7b58"],
  mekong: ["#9fb28b", "#60785b", "#7d6746"],
  "flooded-forest": ["#73a78e", "#345f50", "#493c2c"],
  africa: ["#a6b881", "#697b54", "#a58a55"],
  amazon: ["#66a98d", "#2c6e5b", "#4b3d2a"],
  "amazon-giant": ["#4b8b76", "#205548", "#443629"],
  "japan-sea": ["#8bd1dd", "#3d90a6", "#777b70"],
  "cold-sea": ["#a5cbd8", "#496f87", "#6d7781"],
  okinawa: ["#7ee4eb", "#168eaa", "#f2d0a0"],
  kelp: ["#79aa8f", "#2f6c59", "#485744"],
  seasia: ["#70d7dc", "#1b91a2", "#dfb47d"],
  "great-reef": ["#79e2e2", "#1d9caf", "#e8bd84"],
  indian: ["#68b5d3", "#276c8e", "#526979"],
  "open-ocean": ["#4c9dcc", "#12527c", "#163e5c"],
  "deep-sea": ["#1b365d", "#07152e", "#101a31"],
  "world-ocean": ["#66c5e5", "#176f9e", "#2a657d"],

  /* 施設棟。水ではないので、青ではなく灯りの色にする */
  "shop-case": ["#5a4633", "#2f2519", "#7a5f3c"],
  dining: ["#7fd0dd", "#2b6d84", "#8a6a44"],
  terrarium: ["#cfe8c4", "#5c8a63", "#6d7a45"],

  /* 古代棟。近い時代ほど今の海に近く、古いほど色が離れていく */
  "lost-sea": ["#a9c4c9", "#4c6d78", "#6d6a5c"],
  holocene: ["#b7d8c4", "#4f8272", "#8b8261"],
  "ice-sea": ["#dcf1fa", "#5a86a5", "#7d8b96"],
  "giant-shark-sea": ["#63a8cd", "#154f76", "#2c4c5e"],
  "warm-shallow": ["#a9d6ba", "#3f7d76", "#8a8560"],
  "paleo-shore": ["#d8d09a", "#7d8a5e", "#9c8a5c"],
  "paleo-river": ["#9db866", "#3f5c39", "#5c4c2e"],
  "mesozoic-sea": ["#5fb0c4", "#12475f", "#3d5147"],
  lagoon: ["#e2dfb4", "#8ba07a", "#cbc296"],
  "dead-sea": ["#a887b4", "#3d2740", "#4f3b3a"],
  "permian-sea": ["#8fb0a6", "#2f5450", "#5e6250"],
  "carbon-swamp": ["#8fae6a", "#2f4a2b", "#3f3a23"],
  "crinoid-sea": ["#9dc2b0", "#33665c", "#7d7a5a"],
  devonian: ["#9db28a", "#3d5546", "#6b6a4c"],
  silurian: ["#c8b47c", "#5c6a4a", "#8a7448"],
  ordovician: ["#8fb0bc", "#2f5566", "#6b6a5c"],
  cambrian: ["#8d8fb0", "#2d3050", "#5c5548"],
  ediacaran: ["#e0bd94", "#8a6a52", "#b08f63"],
  "stromatolite-sea": ["#cfd08a", "#6f7a40", "#8a7a4c"],
  hadean: ["#5c2f2f", "#150a10", "#3a2a2c"],
};

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const seeded = (seed: number, n: number) => {
  const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type BodyOptions = {
  /** 尾びれの振り（ラジアン）。泳いでいる感じはここで出す */
  wag?: number;
  /** 背びれを立てる */
  dorsal?: number;
  /** 胸びれを出す */
  pectoral?: boolean;
  /** 尾の切れこみ。0 でうちわ形、1 で深い二又 */
  fork?: number;
  /** 共通の尾を描くか。専用のヒレを持つ魚は false */
  tail?: boolean;
};

/**
 * 全魚共通の体。
 * 小さな水槽の中でも「魚だ」と読めることを最優先に、
 * 濃い輪郭・背びれ・二又の尾・目の光を必ず持たせる。
 */
const fishBody = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sx: number,
  sy: number,
  color: string,
  dir = 1,
  options: BodyOptions = {},
) => {
  const outline = outlineColor;
  const line = Math.max(0.5, Math.min(1.2, sy * 0.3));
  const wag = options.wag ?? 0;
  const fork = options.fork ?? 0.45;
  const dorsal = options.dorsal ?? 0.8;

  ctx.fillStyle = color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = line;

  // 尾。体より先に描いて、付け根で振らせる
  if (options.tail !== false) {
  ctx.save();
  ctx.translate(x - dir * sx * 0.82, y);
  ctx.rotate(wag * dir);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-dir * sx * 0.62, -sy * 1.15);
  ctx.quadraticCurveTo(-dir * sx * (0.62 - fork * 0.42), 0, -dir * sx * 0.62, sy * 1.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  }

  // 背びれ
  if (dorsal > 0) {
    ctx.beginPath();
    ctx.moveTo(x - dir * sx * 0.46, y - sy * 0.7);
    ctx.quadraticCurveTo(x - dir * sx * 0.1, y - sy * (0.6 + dorsal * 0.6), x + dir * sx * 0.3, y - sy * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(x, y, sx, sy, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // 胸びれ。体の下側で小さく動く
  if (options.pectoral !== false && sx > 3.4) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(
      x + dir * sx * 0.1,
      y + sy * 0.55,
      sx * 0.3,
      sy * 0.3,
      wag * 0.6 * dir + 0.4 * dir,
      0,
      TAU,
    );
    ctx.fill();
    ctx.restore();
  }

  // 上面の反射を一筋だけ入れ、小さい魚でも立体に見せる。
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.beginPath();
  ctx.ellipse(
    x + dir * sx * 0.12,
    y - sy * 0.34,
    Math.max(0.8, sx * 0.34),
    Math.max(0.35, sy * 0.16),
    -0.08 * dir,
    0,
    TAU,
  );
  ctx.fill();

  ctx.fillStyle = "#102b31";
  ctx.beginPath();
  ctx.arc(x + dir * sx * 0.62, y - sy * 0.18, Math.max(0.55, sy * 0.18), 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(x + dir * sx * 0.66, y - sy * 0.23, Math.max(0.22, sy * 0.07), 0, TAU);
  ctx.fill();
};

const applyPattern = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sx: number,
  sy: number,
  pattern: Pattern,
  dir: number,
  accent: string,
) => {
  if (pattern === "none") return;
  if (pattern === "spots") {
    ctx.fillStyle = accent;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(x - sx * 0.45 + i * sx * 0.3, y + (i % 2 ? 0.3 : -0.4) * sy, Math.max(0.4, sy * 0.18), 0, TAU);
      ctx.fill();
    }
  } else if (pattern === "stripes") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(0.7, sx * 0.12);
    for (let i = -1; i <= 1; i += 1) {
      const xx = x + i * sx * 0.34 * dir;
      ctx.beginPath();
      ctx.moveTo(xx, y - sy * 0.75);
      ctx.lineTo(xx - dir * sx * 0.1, y + sy * 0.75);
      ctx.stroke();
    }
  } else if (pattern === "red-belly") {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(x + dir * sx * 0.08, y + sy * 0.48, sx * 0.58, sy * 0.38, 0, 0, TAU);
    ctx.fill();
  } else if (pattern === "neon") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - sx * 0.7, y - sy * 0.1);
    ctx.lineTo(x + sx * 0.7, y - sy * 0.1);
    ctx.stroke();
  } else if (pattern === "glow") {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x + dir * sx * 0.68, y - sy * 0.35, Math.max(1.2, sy * 0.55), 0, TAU);
    ctx.fill();
  }
};

const drawCreature = (
  ctx: CanvasRenderingContext2D,
  kind: Creature,
  x: number,
  y: number,
  scale: number,
  color: string,
  pattern: Pattern = "none",
  accent = "rgba(255,255,255,0.72)",
  dir = 1,
  wag = 0,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const d = 1;
  switch (kind) {
    case "tiny":
      fishBody(ctx, 0, 0, 3.1 * scale, 1.35 * scale, color, d, { wag, dorsal: 0.7, fork: 0.5 });
      applyPattern(ctx, 0, 0, 3.1 * scale, 1.35 * scale, pattern, d, accent);
      break;
    case "small":
      fishBody(ctx, 0, 0, 4.6 * scale, 2 * scale, color, d, { wag, dorsal: 0.8, fork: 0.55 });
      applyPattern(ctx, 0, 0, 4.6 * scale, 2 * scale, pattern, d, accent);
      break;
    case "round":
    case "carp":
    case "cichlid":
    case "discus":
    case "bream": {
      const tall = kind === "discus" ? 4.5 : kind === "cichlid" || kind === "bream" ? 3.5 : 3;
      const wide = kind === "carp" ? 6.2 : kind === "discus" ? 4.6 : 5.2;
      // 体高のある魚は尾を小さく、背びれを高く。横から見て種類が違うと分かるようにする
      fishBody(ctx, 0, 0, wide * scale, tall * scale, color, d, {
        wag,
        dorsal: kind === "discus" ? 0.45 : 1,
        fork: kind === "carp" ? 0.8 : 0.35,
      });
      if (kind === "carp") {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(5 * scale, 1.2 * scale); ctx.lineTo(8 * scale, 2.4 * scale); ctx.stroke();
      }
      applyPattern(ctx, 0, 0, wide * scale, tall * scale, pattern, d, accent);
      break;
    }
    case "loach":
    case "knife":
    case "eel":
    case "arowana": {
      const long = kind === "eel" ? 9.8 : kind === "arowana" ? 8.2 : kind === "knife" ? 7.6 : 6.6;
      const tall = kind === "eel" ? 1.4 : kind === "knife" ? 1.7 : 2.2;
      /*
       * 細長い魚は体そのものをくねらせる。
       * 鼻先から尾へ紡錘形になるよう、太さを sin で作る。
       */
      const segs = 10;
      const spine = (t: number) => ({
        px: long * scale * (1 - t * 2),
        py: Math.sin(t * 3.6 - wag * 7) * tall * scale * t * 1.1,
        th: tall * scale * Math.sin(Math.PI * (0.1 + 0.82 * t)),
      });
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = Math.max(0.6, tall * scale * 0.3);
      ctx.beginPath();
      for (let i = 0; i <= segs; i += 1) {
        const s = spine(i / segs);
        if (i === 0) ctx.moveTo(s.px, s.py - s.th);
        else ctx.lineTo(s.px, s.py - s.th);
      }
      for (let i = segs; i >= 0; i -= 1) {
        const s = spine(i / segs);
        ctx.lineTo(s.px, s.py + s.th);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (kind !== "eel") {
        const tail = spine(1);
        ctx.beginPath();
        ctx.moveTo(tail.px, tail.py);
        ctx.lineTo(tail.px - long * scale * 0.3, tail.py - 2.6 * scale);
        ctx.lineTo(tail.px - long * scale * 0.3, tail.py + 2.6 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // 目。頭がどちらか分かるようにする
      ctx.fillStyle = "#132a33";
      ctx.beginPath(); ctx.arc(long * scale * 0.66, -0.5 * scale, Math.max(0.5, 0.72 * scale), 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath(); ctx.arc(long * scale * 0.7, -0.75 * scale, Math.max(0.2, 0.28 * scale), 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, long * scale, tall * scale, pattern, d, accent);
      break;
    }
    case "trout":
    case "salmon":
    case "perch":
    case "napoleon":
    case "tuna": {
      const sx = kind === "tuna" ? 8.2 : kind === "napoleon" ? 7.6 : kind === "perch" ? 7.2 : 6.8;
      const sy = kind === "napoleon" ? 4.1 : kind === "perch" ? 3.2 : 2.7;
      fishBody(ctx, 0, 0, sx * scale, sy * scale, color, d, {
        wag,
        dorsal: kind === "tuna" ? 1.15 : 0.85,
        fork: kind === "tuna" ? 0.95 : 0.6,
      });
      if (kind === "salmon") {
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.ellipse(0.8 * scale, 1.3 * scale, 3.6 * scale, 0.8 * scale, 0, 0, TAU); ctx.fill();
      }
      if (kind === "napoleon") {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(4.4 * scale, -3 * scale, 2.4 * scale, Math.PI, TAU); ctx.fill();
      }
      applyPattern(ctx, 0, 0, sx * scale, sy * scale, pattern, d, accent);
      break;
    }
    case "catfish":
      fishBody(ctx, 0, 0, 7.6 * scale, 2.8 * scale, color, d, { wag, dorsal: 0.5, fork: 0.2 });
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.8;
      for (const dy of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(5.5 * scale, dy * 1.1 * scale); ctx.quadraticCurveTo(10 * scale, dy * 2.2 * scale, 12 * scale, dy * 4 * scale); ctx.stroke();
      }
      break;
    case "betta": {
      // ひらひらした大きな尾びれが主役。共通の尾は出さない
      const fan = 5.4 * scale;
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 0.8;
      ctx.save();
      ctx.translate(-3.4 * scale, 0);
      ctx.rotate(wag * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-fan * 1.1, -fan * 1.15, -fan * 1.5, 0);
      ctx.quadraticCurveTo(-fan * 1.1, fan * 1.15, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      fishBody(ctx, 1 * scale, 0, 4.2 * scale, 2.4 * scale, color, d, { wag: 0, dorsal: 1.5, fork: 0, tail: false });
      break;
    }
    case "angel":
    case "butterfly":
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-5 * scale, 0); ctx.quadraticCurveTo(0, -7 * scale, 5 * scale, 0); ctx.quadraticCurveTo(0, 7 * scale, -5 * scale, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4 * scale, 0); ctx.lineTo(-8 * scale, -4 * scale); ctx.lineTo(-8 * scale, 4 * scale); ctx.closePath(); ctx.fill();
      applyPattern(ctx, 0, 0, 5 * scale, 6 * scale, pattern, d, accent);
      break;
    case "piranha":
      fishBody(ctx, 0, 0, 5.8 * scale, 3.3 * scale, color, d, { wag, dorsal: 0.6, fork: 0.5 });
      applyPattern(ctx, 0, 0, 5.8 * scale, 3.3 * scale, pattern, d, accent);
      ctx.fillStyle = "#f4eee2";
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath(); ctx.moveTo(4.3 * scale + i * 0.7, 1 * scale); ctx.lineTo(4.7 * scale + i * 0.7, 2 * scale); ctx.lineTo(5.1 * scale + i * 0.7, 1 * scale); ctx.fill();
      }
      break;
    case "ray":
    case "manta": {
      const wide = kind === "manta" ? 11 : 8.4;
      const tall = kind === "manta" ? 5 : 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-wide * scale, 0); ctx.quadraticCurveTo(-3 * scale, -tall * scale, 0, -2 * scale); ctx.quadraticCurveTo(3 * scale, -tall * scale, wide * scale, 0); ctx.quadraticCurveTo(2 * scale, tall * scale, 0, 2 * scale); ctx.quadraticCurveTo(-2 * scale, tall * scale, -wide * scale, 0); ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath(); ctx.moveTo(0, 2 * scale); ctx.quadraticCurveTo(2 * scale, 8 * scale, 1 * scale, 12 * scale); ctx.stroke();
      applyPattern(ctx, 0, 0, wide * scale, tall * scale, pattern, d, accent);
      break;
    }
    case "turtle":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, 7 * scale, 4.5 * scale, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(6.8 * scale, -0.2 * scale, 2.1 * scale, 0, TAU); ctx.fill();
      for (const [px, py, rx, ry] of [[-4, -4, 3, 1.2], [3, -4, 3, 1.2], [-4, 4, 3, 1.2], [3, 4, 3, 1.2]] as const) {
        ctx.beginPath(); ctx.ellipse(px * scale, py * scale, rx * scale, ry * scale, 0, 0, TAU); ctx.fill();
      }
      break;
    case "rockfish":
      fishBody(ctx, 0, 0, 5.4 * scale, 3.5 * scale, color, d, { wag: wag * 0.5, dorsal: 0, fork: 0.15 });
      ctx.strokeStyle = accent; ctx.lineWidth = 0.9;
      for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(i * 1.5 * scale, -2.6 * scale); ctx.lineTo(i * 1.6 * scale, -5.3 * scale); ctx.stroke(); }
      break;
    case "octopus":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, -2 * scale, 5.4 * scale, 5 * scale, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5 * scale;
      for (let i = -3; i <= 3; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * 1.2 * scale, 1 * scale); ctx.quadraticCurveTo(i * 2 * scale, 6 * scale, (i + (i % 2 ? 1 : -1)) * 2.4 * scale, 8 * scale); ctx.stroke();
      }
      break;
    case "crab":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, 5.2 * scale, 3.2 * scale, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.2 * scale;
      for (const side of [-1, 1]) for (let i = 0; i < 3; i += 1) {
        ctx.beginPath(); ctx.moveTo(side * 3.5 * scale, (i - 1) * 1.2 * scale); ctx.lineTo(side * (7 + i) * scale, (i - 1.2) * 3 * scale); ctx.stroke();
      }
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.arc(side * 7 * scale, -3.2 * scale, 2.1 * scale, 0, TAU); ctx.fill();
      }
      break;
    case "clown":
      fishBody(ctx, 0, 0, 4.8 * scale, 2.5 * scale, color, d, { wag, dorsal: 0.7, fork: 0.15 });
      applyPattern(ctx, 0, 0, 4.8 * scale, 2.5 * scale, "stripes", d, "#f7f4df");
      break;
    case "shark":
    case "whale-shark": {
      const sx = kind === "whale-shark" ? 11.5 : 8.5;
      const sy = kind === "whale-shark" ? 3.7 : 3.1;
      fishBody(ctx, 0, 0, sx * scale, sy * scale, color, d, { wag: wag * 0.7, dorsal: 0, fork: 0.85 });
      // サメの背びれ。遠目でもサメと分かる形にする
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-1.5 * scale, -sy * scale * 0.6); ctx.lineTo(1.5 * scale, -(sy + 4.4) * scale); ctx.lineTo(4 * scale, -sy * scale * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (kind === "whale-shark" || pattern === "spots") applyPattern(ctx, 0, 0, sx * scale, sy * scale, "spots", d, "rgba(230,245,245,0.9)");
      break;
    }
    case "lionfish":
      fishBody(ctx, 0, 0, 5 * scale, 2.8 * scale, color, d, { wag: wag * 0.4, dorsal: 0, fork: 0.1 });
      ctx.strokeStyle = accent; ctx.lineWidth = 0.8;
      for (let i = -3; i <= 3; i += 1) { ctx.beginPath(); ctx.moveTo(i * scale, -2 * scale); ctx.lineTo(i * 1.8 * scale, -7 * scale); ctx.stroke(); }
      applyPattern(ctx, 0, 0, 5 * scale, 2.8 * scale, "stripes", d, accent);
      break;
    case "puffer":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, 4.2 * scale, 0, TAU); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.7;
      for (let i = 0; i < 10; i += 1) { const a = (i / 10) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 3.5 * scale, Math.sin(a) * 3.5 * scale); ctx.lineTo(Math.cos(a) * 6 * scale, Math.sin(a) * 6 * scale); ctx.stroke(); }
      break;
    case "isopod":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, 6.5 * scale, 3.6 * scale, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.65;
      for (let i = -3; i <= 3; i += 1) { ctx.beginPath(); ctx.moveTo(i * 1.4 * scale, -3 * scale); ctx.lineTo(i * 1.4 * scale, 3 * scale); ctx.stroke(); }
      break;
    case "angler":
      fishBody(ctx, 0, 0, 6.4 * scale, 4.1 * scale, color, d, { wag: wag * 0.5, dorsal: 0.3, fork: 0.1 });
      ctx.strokeStyle = accent; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(3 * scale, -3 * scale); ctx.quadraticCurveTo(6 * scale, -9 * scale, 8 * scale, -6 * scale); ctx.stroke();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(8 * scale, -6 * scale, 1.8 * scale, 0, TAU); ctx.fill();
      break;

    /* ============ ショップの売り物 ============
     * 泳がない。棚に並んだ「もの」として、輪郭をはっきり描く。
     */
    case "plush": {
      // 魚のぬいぐるみ。丸くして、目を大きくする。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(0, 0, 4.6 * scale, 3.6 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3.6 * scale, 0);
      ctx.lineTo(-7 * scale, -3 * scale);
      ctx.lineTo(-7 * scale, 3 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fdfdf7";
      ctx.beginPath(); ctx.arc(2 * scale, -0.8 * scale, 1.5 * scale, 0, TAU); ctx.fill();
      ctx.fillStyle = "#14202a";
      ctx.beginPath(); ctx.arc(2.3 * scale, -0.8 * scale, 0.8 * scale, 0, TAU); ctx.fill();
      break;
    }
    case "trinket": {
      // 光るグッズ。瓶の形にして、中に光をためる。
      ctx.fillStyle = "rgba(20,32,40,0.7)";
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.7;
      rr(ctx, -2.6 * scale, -4 * scale, 5.2 * scale, 8 * scale, 1.6 * scale);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0.6 * scale, 1.9 * scale, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.arc(-0.7 * scale, -0.2 * scale, 0.6 * scale, 0, TAU); ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(-2.6 * scale, -5.2 * scale, 5.2 * scale, 1.4 * scale);
      break;
    }
    case "fossil": {
      // 石板に浮き出た化石。渦巻きと石の輪郭で「標本」と読ませる。
      ctx.fillStyle = "rgba(58,52,42,0.85)";
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      rr(ctx, -5 * scale, -4.4 * scale, 10 * scale, 8.8 * scale, 1.2 * scale);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 1.1 * scale;
      ctx.beginPath();
      for (let i = 0; i <= 24; i += 1) {
        const a = (i / 24) * TAU * 1.6;
        const r = 0.5 * scale + a * 0.62 * scale;
        const px = Math.cos(a) * r * 0.55;
        const py = Math.sin(a) * r * 0.55;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }
    case "mineral": {
      // 岩・鉱物・煙突。積み上がった塊として描く。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-5 * scale, 5 * scale);
      ctx.lineTo(-3.4 * scale, -4.4 * scale);
      ctx.lineTo(0.6 * scale, -6.2 * scale);
      ctx.lineTo(4.4 * scale, -3 * scale);
      ctx.lineTo(5.2 * scale, 5 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.6;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-4.6 * scale, i * 1.9 * scale);
        ctx.lineTo(4.8 * scale, i * 1.9 * scale + 0.6 * scale);
        ctx.stroke();
      }
      break;
    }

    /* ============ 両生類・爬虫類 ============ */
    case "frog": {
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(0, 0, 4.2 * scale, 3 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // 後ろ足をたたんだ形。カエルだと一目で分かる輪郭にする。
      for (const side of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(-1 * scale, side * 2.2 * scale);
        ctx.quadraticCurveTo(-5.4 * scale, side * 5.4 * scale, -1.4 * scale, side * 4.6 * scale);
        ctx.quadraticCurveTo(1.6 * scale, side * 4 * scale, 1.2 * scale, side * 2 * scale);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = "#fbfdf6";
      for (const side of [-1, 1] as const) {
        ctx.beginPath(); ctx.arc(3 * scale, side * 1.5 * scale - 1.2 * scale, 1.3 * scale, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = "#101a12";
      for (const side of [-1, 1] as const) {
        ctx.beginPath(); ctx.arc(3.3 * scale, side * 1.5 * scale - 1.2 * scale, 0.7 * scale, 0, TAU); ctx.fill();
      }
      applyPattern(ctx, 0, 0, 4.2 * scale, 3 * scale, pattern, d, accent);
      break;
    }
    case "salamander": {
      // 太い胴とひらたい頭、4本の短い足。魚と混ざらない形。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(7.4 * scale, 0);
      ctx.quadraticCurveTo(6 * scale, -2.6 * scale, 2 * scale, -2.2 * scale);
      ctx.quadraticCurveTo(-4 * scale, -2 * scale, -9.4 * scale, -1 * scale + wag * 6 * scale);
      ctx.quadraticCurveTo(-4 * scale, 0.4 * scale, 2 * scale, 2.2 * scale);
      ctx.quadraticCurveTo(6 * scale, 2.6 * scale, 7.4 * scale, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.2 * scale;
      ctx.strokeStyle = color;
      for (const [lx, ly] of [[3.4, 2.4], [3.4, -2.4], [-3, 2.4], [-3, -2.4]] as const) {
        ctx.beginPath();
        ctx.moveTo(lx * scale, ly * scale * 0.6);
        ctx.lineTo(lx * scale - 1.4 * scale, ly * scale * 1.9);
        ctx.stroke();
      }
      ctx.fillStyle = "#0e1a16";
      ctx.beginPath(); ctx.arc(6 * scale, -1 * scale, 0.7 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, 6 * scale, 2.2 * scale, pattern, d, accent);
      break;
    }
    case "snake": {
      // 体をS字にくねらせる。頭だけ少し太い。
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      const len = 22 * scale;
      for (const [w, col] of [[3.4, outlineColor], [2.4, color]] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w * scale;
        ctx.beginPath();
        for (let i = 0; i <= 16; i += 1) {
          const t = i / 16;
          const px = len * 0.5 - t * len;
          const py = Math.sin(t * 5.6 + wag * 5) * 3.4 * scale * (0.3 + t * 0.9);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.ellipse(len * 0.53, Math.sin(wag * 5) * 1 * scale, 2.6 * scale, 1.8 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f7f4dc";
      ctx.beginPath(); ctx.arc(len * 0.58, -0.5 * scale, 0.6 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, 8 * scale, 2.4 * scale, pattern, d, accent);
      break;
    }
    case "lizard": {
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(5.6 * scale, 0);
      ctx.quadraticCurveTo(3 * scale, -2 * scale, -1 * scale, -1.6 * scale);
      ctx.quadraticCurveTo(-6 * scale, -1.2 * scale, -11 * scale, wag * 8 * scale);
      ctx.quadraticCurveTo(-6 * scale, 0.6 * scale, -1 * scale, 1.6 * scale);
      ctx.quadraticCurveTo(3 * scale, 2 * scale, 5.6 * scale, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 1 * scale;
      for (const [lx, ly] of [[2.6, 1], [2.6, -1], [-2.6, 1], [-2.6, -1]] as const) {
        ctx.beginPath();
        ctx.moveTo(lx * scale, ly * 1.4 * scale);
        ctx.lineTo(lx * scale - 1.6 * scale, ly * 4 * scale);
        ctx.stroke();
      }
      ctx.fillStyle = "#0f1710";
      ctx.beginPath(); ctx.arc(4.4 * scale, -0.8 * scale, 0.6 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, 5 * scale, 1.8 * scale, pattern, d, accent);
      break;
    }
    case "crocodile": {
      // 長い口と背中のうろこ列。水面すれすれのシルエット。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(11 * scale, 0.6 * scale);
      ctx.lineTo(4.4 * scale, -1.4 * scale);
      ctx.quadraticCurveTo(-2 * scale, -3 * scale, -8 * scale, -1.6 * scale);
      ctx.quadraticCurveTo(-13 * scale, -0.6 * scale, -16 * scale, wag * 7 * scale);
      ctx.quadraticCurveTo(-12 * scale, 1.4 * scale, -8 * scale, 2.4 * scale);
      ctx.quadraticCurveTo(-2 * scale, 3.6 * scale, 4.4 * scale, 1.8 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color;
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.moveTo((-7 + i * 2.2) * scale, -2.2 * scale);
        ctx.lineTo((-6.2 + i * 2.2) * scale, -4.4 * scale);
        ctx.lineTo((-5.2 + i * 2.2) * scale, -2.2 * scale);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = color; ctx.lineWidth = 1.2 * scale;
      for (const [lx, ly] of [[1, 1], [-6, 1]] as const) {
        ctx.beginPath();
        ctx.moveTo(lx * scale, ly * 2 * scale);
        ctx.lineTo(lx * scale - 2 * scale, ly * 5.4 * scale);
        ctx.stroke();
      }
      ctx.fillStyle = "#f6f0cf";
      ctx.beginPath(); ctx.arc(5 * scale, -2.4 * scale, 0.9 * scale, 0, TAU); ctx.fill();
      ctx.fillStyle = "#10160f";
      ctx.beginPath(); ctx.arc(5.2 * scale, -2.5 * scale, 0.45 * scale, 0, TAU); ctx.fill();
      break;
    }

    /* ============ 海の哺乳類と鳥 ============ */
    case "seal":
    case "seacow": {
      const long = kind === "seacow" ? 12 : 8.6;
      const tall = kind === "seacow" ? 4.2 : 3;
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.ellipse(0, 0, long * scale, tall * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // 頭。丸くして、魚のようにとがらせない。
      ctx.beginPath(); ctx.ellipse(long * 0.86 * scale, -0.6 * scale, tall * 0.78 * scale, tall * 0.72 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // ひれ足
      ctx.beginPath();
      ctx.ellipse(long * 0.2 * scale, tall * 0.85 * scale, long * 0.24 * scale, tall * 0.3 * scale, 0.5 * d, 0, TAU);
      ctx.fill();
      // 尾。アシカは縦、カイギュウは横に広い。
      ctx.beginPath();
      ctx.moveTo(-long * 0.92 * scale, 0);
      ctx.lineTo(-long * 1.4 * scale, -tall * (kind === "seacow" ? 1.5 : 0.9) * scale + wag * 4 * scale);
      ctx.lineTo(-long * 1.4 * scale, tall * (kind === "seacow" ? 1.5 : 0.9) * scale + wag * 4 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#101a1c";
      ctx.beginPath(); ctx.arc(long * 1.02 * scale, -1.1 * scale, 0.7 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, long * scale, tall * scale, pattern, d, accent);
      break;
    }
    case "diveBird": {
      // 潜る鳥。体は紡錘、頭に細いくちばし、腹は白。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(0, 0, 6.4 * scale, 3.2 * scale, -0.12 * d, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(-0.6 * scale, 1.4 * scale, 5 * scale, 1.7 * scale, -0.08 * d, 0, TAU);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(6 * scale, -1.6 * scale, 2.2 * scale, 1.9 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(7.6 * scale, -1.8 * scale);
      ctx.lineTo(11.4 * scale, -1.2 * scale);
      ctx.lineTo(7.6 * scale, -0.4 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 翼をたたんで、水をかく足。
      ctx.strokeStyle = color; ctx.lineWidth = 1.3 * scale;
      ctx.beginPath();
      ctx.moveTo(-3.4 * scale, 2.4 * scale);
      ctx.lineTo(-6.4 * scale, 5.6 * scale + wag * 3 * scale);
      ctx.stroke();
      ctx.fillStyle = "#f7fbf2";
      ctx.beginPath(); ctx.arc(6.6 * scale, -2.2 * scale, 0.6 * scale, 0, TAU); ctx.fill();
      break;
    }
    case "whale":
    case "serpentWhale": {
      const long = kind === "serpentWhale" ? 17 : 11.5;
      const tall = kind === "serpentWhale" ? 2.6 : 4.4;
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(long * scale, 0);
      ctx.quadraticCurveTo(long * 0.5 * scale, -tall * scale, 0, -tall * 0.86 * scale);
      ctx.quadraticCurveTo(-long * 0.6 * scale, -tall * 0.6 * scale, -long * scale, wag * 5 * scale);
      ctx.quadraticCurveTo(-long * 0.6 * scale, tall * 0.6 * scale, 0, tall * 0.86 * scale);
      ctx.quadraticCurveTo(long * 0.5 * scale, tall * scale, long * scale, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 水平の尾びれ。魚の縦尾と必ず見分けがつくようにする。
      ctx.beginPath();
      ctx.moveTo(-long * 0.94 * scale, wag * 5 * scale);
      ctx.quadraticCurveTo(-long * 1.3 * scale, -tall * 0.9 * scale + wag * 5 * scale, -long * 1.42 * scale, -tall * 0.2 * scale + wag * 5 * scale);
      ctx.quadraticCurveTo(-long * 1.2 * scale, wag * 5 * scale, -long * 1.42 * scale, tall * 0.2 * scale + wag * 5 * scale);
      ctx.quadraticCurveTo(-long * 1.3 * scale, tall * 0.9 * scale + wag * 5 * scale, -long * 0.94 * scale, wag * 5 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 胸びれ
      ctx.beginPath();
      ctx.ellipse(long * 0.18 * scale, tall * 0.7 * scale, long * 0.22 * scale, tall * 0.22 * scale, 0.6 * d, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#0d161c";
      ctx.beginPath(); ctx.arc(long * 0.78 * scale, -tall * 0.34 * scale, 0.7 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, long * scale, tall * scale, pattern, d, accent);
      break;
    }
    case "dolphin": {
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(9.4 * scale, -0.4 * scale);
      ctx.quadraticCurveTo(4 * scale, -3.4 * scale, -1 * scale, -2.8 * scale);
      ctx.quadraticCurveTo(-6 * scale, -2.2 * scale, -9 * scale, wag * 5 * scale);
      ctx.quadraticCurveTo(-6 * scale, 2.2 * scale, -1 * scale, 2.8 * scale);
      ctx.quadraticCurveTo(4 * scale, 3 * scale, 9.4 * scale, 0.6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 背びれ
      ctx.beginPath();
      ctx.moveTo(-0.6 * scale, -2.6 * scale);
      ctx.quadraticCurveTo(1.4 * scale, -6.4 * scale, 3.6 * scale, -2.4 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 水平尾びれ
      ctx.beginPath();
      ctx.moveTo(-8.4 * scale, wag * 5 * scale);
      ctx.lineTo(-12 * scale, -2.4 * scale + wag * 5 * scale);
      ctx.lineTo(-10 * scale, wag * 5 * scale);
      ctx.lineTo(-12 * scale, 2.4 * scale + wag * 5 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#0e161c";
      ctx.beginPath(); ctx.arc(7 * scale, -1.4 * scale, 0.6 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, 8 * scale, 2.8 * scale, pattern, d, accent);
      break;
    }
    case "landbeast": {
      // 水辺を歩く獣。4本の足と、水面から出た背中。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.ellipse(0, 0, 7.4 * scale, 3.6 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(7.6 * scale, -1.8 * scale, 3 * scale, 2.2 * scale, -0.2 * d, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 1.6 * scale;
      for (const lx of [-4.6, -1.4, 2.2, 5] as const) {
        ctx.beginPath();
        ctx.moveTo(lx * scale, 2.6 * scale);
        ctx.lineTo(lx * scale - 0.8 * scale, 7.4 * scale + Math.sin(wag * 6 + lx) * 0.8 * scale);
        ctx.stroke();
      }
      ctx.strokeStyle = color; ctx.lineWidth = 1.4 * scale;
      ctx.beginPath();
      ctx.moveTo(-7 * scale, -0.6 * scale);
      ctx.quadraticCurveTo(-11 * scale, -1.4 * scale, -12.6 * scale, 1.4 * scale + wag * 4 * scale);
      ctx.stroke();
      ctx.fillStyle = "#0f1712";
      ctx.beginPath(); ctx.arc(9 * scale, -2.4 * scale, 0.6 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, 7 * scale, 3.4 * scale, pattern, d, accent);
      break;
    }

    /* ============ 中生代の海生爬虫類 ============ */
    case "mosasaur": {
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(12.6 * scale, 0.4 * scale);
      ctx.quadraticCurveTo(6 * scale, -3.6 * scale, 0, -3.2 * scale);
      ctx.quadraticCurveTo(-7 * scale, -2.6 * scale, -13 * scale, wag * 6 * scale);
      ctx.quadraticCurveTo(-7 * scale, 2.6 * scale, 0, 3.2 * scale);
      ctx.quadraticCurveTo(6 * scale, 3.4 * scale, 12.6 * scale, 1.6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 尾びれは下へ落ちる。魚とも首長竜とも違う形。
      ctx.beginPath();
      ctx.moveTo(-12 * scale, wag * 6 * scale);
      ctx.lineTo(-17 * scale, -3.4 * scale + wag * 6 * scale);
      ctx.lineTo(-16 * scale, wag * 6 * scale);
      ctx.lineTo(-17.4 * scale, 4.6 * scale + wag * 6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 4枚のひれ
      for (const [fx, fy] of [[4, 3], [-3, 3], [4, -3], [-3, -3]] as const) {
        ctx.beginPath();
        ctx.ellipse(fx * scale, fy * 1.35 * scale, 3.2 * scale, 1.1 * scale, fy > 0 ? 0.5 * d : -0.5 * d, 0, TAU);
        ctx.fill();
      }
      // 歯ののぞく口
      ctx.strokeStyle = "rgba(246,240,216,0.9)"; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(8 * scale, 1 * scale); ctx.lineTo(12 * scale, 0.8 * scale); ctx.stroke();
      ctx.fillStyle = "#f4efd6";
      ctx.beginPath(); ctx.arc(10.4 * scale, -1.4 * scale, 0.8 * scale, 0, TAU); ctx.fill();
      ctx.fillStyle = "#101812";
      ctx.beginPath(); ctx.arc(10.6 * scale, -1.4 * scale, 0.4 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, 9 * scale, 3 * scale, pattern, d, accent);
      break;
    }
    case "plesiosaur":
    case "pliosaur": {
      const neck = kind === "plesiosaur" ? 15 : 5;
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.9;
      const bodyW = kind === "plesiosaur" ? 7 : 10;
      const bodyH = kind === "plesiosaur" ? 3.4 : 4.6;
      ctx.beginPath(); ctx.ellipse(0, 0, bodyW * scale, bodyH * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // 首。首長竜はここが主役なので、太さを変えながら曲げる。
      ctx.strokeStyle = color;
      ctx.lineWidth = (kind === "plesiosaur" ? 2 : 3.6) * scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bodyW * 0.7 * scale, -1 * scale);
      ctx.quadraticCurveTo(
        (bodyW + neck * 0.5) * scale,
        -neck * 0.42 * scale,
        (bodyW + neck * 0.86) * scale,
        -neck * 0.2 * scale + Math.sin(wag * 4) * scale,
      );
      ctx.stroke();
      ctx.lineCap = "butt";
      // 頭
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse((bodyW + neck * 0.94) * scale, -neck * 0.2 * scale + Math.sin(wag * 4) * scale, 2.4 * scale, 1.4 * scale, -0.2 * d, 0, TAU);
      ctx.fill(); ctx.stroke();
      // 4枚のひれ。左右で位相をずらすと、羽ばたいて見える。
      for (const [i, [fx, fy]] of ([[3.4, 1], [-3.4, 1], [3.4, -1], [-3.4, -1]] as const).entries()) {
        ctx.save();
        ctx.translate(fx * scale, fy * bodyH * 0.9 * scale);
        ctx.rotate(fy * (0.5 + Math.sin(wag * 5 + i) * 0.22) * d);
        ctx.beginPath(); ctx.ellipse(0, 0, 5.2 * scale, 1.5 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // 短い尾
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.9 * scale, 0);
      ctx.lineTo(-(bodyW + 5) * scale, -1.6 * scale + wag * 4 * scale);
      ctx.lineTo(-(bodyW + 5) * scale, 1.6 * scale + wag * 4 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#0f1a1c";
      ctx.beginPath();
      ctx.arc((bodyW + neck * 0.98) * scale, -neck * 0.2 * scale - 0.3 * scale + Math.sin(wag * 4) * scale, 0.5 * scale, 0, TAU);
      ctx.fill();
      applyPattern(ctx, 0, 0, bodyW * scale, bodyH * scale, pattern, d, accent);
      break;
    }
    case "spinosaur": {
      // 帆と長い口。水につかった二足歩行のシルエット。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(2 * scale, -4 * scale);
      ctx.quadraticCurveTo(-2 * scale, -11 * scale, -8 * scale, -3.6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-1 * scale, 0, 8 * scale, 3.4 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 2 * scale; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(6 * scale, -1.4 * scale);
      ctx.quadraticCurveTo(9 * scale, -4.6 * scale, 12 * scale, -4 * scale);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(11 * scale, -5 * scale);
      ctx.lineTo(18 * scale, -3.2 * scale);
      ctx.lineTo(11 * scale, -2.2 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.moveTo(-8 * scale, 0.6 * scale);
      ctx.quadraticCurveTo(-14 * scale, 1 * scale, -18 * scale, 3.4 * scale + wag * 5 * scale);
      ctx.stroke();
      for (const lx of [-3, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(lx * scale, 2.4 * scale);
        ctx.lineTo(lx * scale - 1 * scale, 7 * scale);
        ctx.stroke();
      }
      ctx.fillStyle = "#f6f0d4";
      ctx.beginPath(); ctx.arc(11.6 * scale, -4.4 * scale, 0.7 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, -1 * scale, 0, 7 * scale, 3 * scale, pattern, d, accent);
      break;
    }

    /* ============ 殻をもつもの ============ */
    case "ammonite": {
      // 渦巻きの殻と、そこから出る触手。
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.7;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, 4.4 * scale, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let i = 0; i <= 22; i += 1) {
        const a = (i / 22) * TAU * 1.8;
        const r = (0.4 + a * 0.42) * scale;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 0.8 * scale;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(4 * scale, i * 1.1 * scale);
        ctx.quadraticCurveTo(7 * scale, i * 1.6 * scale, 8.6 * scale, i * 2.2 * scale + Math.sin(wag * 6 + i) * scale);
        ctx.stroke();
      }
      break;
    }
    case "belemnite": {
      // 弾丸のような殻。まっすぐ進む。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(5.6 * scale, 0);
      ctx.lineTo(-2 * scale, -1.6 * scale);
      ctx.lineTo(-2 * scale, 1.6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-3.4 * scale, 0, 2.4 * scale, 1.7 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 0.6 * scale;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-5.2 * scale, i * 0.7 * scale);
        ctx.lineTo(-9 * scale, i * 1.5 * scale + wag * 3 * scale);
        ctx.stroke();
      }
      break;
    }
    case "orthocone": {
      // まっすぐな殻。仕切りの線を入れて、細長い筒に見せる。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(6 * scale, -3.4 * scale);
      ctx.lineTo(-17 * scale, -1 * scale);
      ctx.lineTo(-17 * scale, 1 * scale);
      ctx.lineTo(6 * scale, 3.4 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.55;
      for (let i = 0; i < 7; i += 1) {
        const t = i / 7;
        const x = 5 * scale - t * 21 * scale;
        const h = (3.2 - t * 2.3) * scale;
        ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x, h); ctx.stroke();
      }
      ctx.strokeStyle = color; ctx.lineWidth = 0.9 * scale;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(6 * scale, i * 1.3 * scale);
        ctx.quadraticCurveTo(9.4 * scale, i * 1.8 * scale, 11.4 * scale, i * 2.4 * scale + Math.sin(wag * 5 + i) * scale);
        ctx.stroke();
      }
      ctx.fillStyle = "#f4eeda";
      ctx.beginPath(); ctx.arc(5.6 * scale, -1.4 * scale, 0.8 * scale, 0, TAU); ctx.fill();
      break;
    }
    case "bivalve": {
      // 二枚貝。海底にすこし開いて立つ。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.7;
      for (const side of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(0, 3.4 * scale);
        ctx.quadraticCurveTo(side * 4.4 * scale, 1.6 * scale, side * 3.4 * scale, -3 * scale);
        ctx.quadraticCurveTo(side * 1.4 * scale, -1 * scale, 0, -0.6 * scale);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.strokeStyle = accent; ctx.lineWidth = 0.45;
      for (let i = 1; i <= 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 3.4 * scale, i * 1.1 * scale, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      }
      break;
    }

    /* ============ 古生代 ============ */
    case "trilobite": {
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.ellipse(0, 0, 5.4 * scale, 3.2 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // 頭の半円。三葉虫の顔はここで決まる。
      ctx.beginPath(); ctx.ellipse(3.6 * scale, 0, 2.6 * scale, 3.1 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.5;
      for (let i = -3; i <= 2; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * 1.5 * scale, -2.6 * scale); ctx.lineTo(i * 1.5 * scale, 2.6 * scale); ctx.stroke();
      }
      // 三葉の名のとおり、縦に3つに割れて見える線。
      ctx.beginPath(); ctx.moveTo(-5 * scale, -1.3 * scale); ctx.lineTo(5 * scale, -1.3 * scale); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5 * scale, 1.3 * scale); ctx.lineTo(5 * scale, 1.3 * scale); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 0.8 * scale;
      ctx.beginPath(); ctx.moveTo(-4.6 * scale, 0); ctx.lineTo(-8 * scale, wag * 5 * scale); ctx.stroke();
      ctx.fillStyle = "#101614";
      for (const side of [-1, 1] as const) {
        ctx.beginPath(); ctx.arc(4.6 * scale, side * 1.5 * scale, 0.5 * scale, 0, TAU); ctx.fill();
      }
      break;
    }
    case "eurypterid": {
      // ウミサソリ。節のある胴と、はさみ、とがった尾。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(5.4 * scale, -3.6 * scale);
      ctx.lineTo(-8 * scale, -1.4 * scale);
      ctx.lineTo(-13 * scale, wag * 5 * scale);
      ctx.lineTo(-8 * scale, 1.4 * scale);
      ctx.lineTo(5.4 * scale, 3.6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(6.4 * scale, 0, 3.4 * scale, 3.6 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.5;
      for (let i = 0; i < 5; i += 1) {
        const x = (3 - i * 2.4) * scale;
        const h = (3.4 - i * 0.5) * scale;
        ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x, h); ctx.stroke();
      }
      // はさみ
      ctx.strokeStyle = color; ctx.lineWidth = 1.1 * scale;
      for (const side of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(8 * scale, side * 2 * scale);
        ctx.lineTo(12.4 * scale, side * 3.4 * scale + Math.sin(wag * 6) * scale);
        ctx.stroke();
      }
      // 泳ぐための平たい後ろ足
      for (const side of [-1, 1] as const) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0.4 * scale, side * 4.4 * scale, 3.6 * scale, 1.2 * scale, side * 0.4 * d, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = "#0f1610";
      for (const side of [-1, 1] as const) {
        ctx.beginPath(); ctx.arc(8 * scale, side * 1.4 * scale, 0.6 * scale, 0, TAU); ctx.fill();
      }
      break;
    }
    case "placoderm": {
      // 甲冑魚。頭だけ骨の板でできていて、境目に段差がある。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(2 * scale, -4.4 * scale);
      ctx.quadraticCurveTo(-6 * scale, -3.6 * scale, -10 * scale, -1 * scale);
      ctx.quadraticCurveTo(-13 * scale, 0, -10 * scale, 1 * scale);
      ctx.quadraticCurveTo(-6 * scale, 3.6 * scale, 2 * scale, 4.4 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-9.6 * scale, -0.6 * scale);
      ctx.lineTo(-15.4 * scale, -4.4 * scale + wag * 6 * scale);
      ctx.lineTo(-14 * scale, 0.4 * scale + wag * 6 * scale);
      ctx.lineTo(-15.4 * scale, 4 * scale + wag * 6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 装甲の頭。色を変えて板だと分かるようにする。
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(9.6 * scale, 0.4 * scale);
      ctx.quadraticCurveTo(8 * scale, -4.6 * scale, 2.6 * scale, -4.6 * scale);
      ctx.lineTo(2 * scale, 4.6 * scale);
      ctx.quadraticCurveTo(7.4 * scale, 4.6 * scale, 9.6 * scale, 0.4 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 板でできた歯
      ctx.fillStyle = "#f2ecd2";
      ctx.beginPath();
      ctx.moveTo(9.4 * scale, 0.8 * scale);
      ctx.lineTo(5 * scale, 1.4 * scale);
      ctx.lineTo(5 * scale, 3 * scale);
      ctx.lineTo(9 * scale, 2 * scale);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f6f2df";
      ctx.beginPath(); ctx.arc(6.4 * scale, -2.2 * scale, 0.9 * scale, 0, TAU); ctx.fill();
      ctx.fillStyle = "#121a14";
      ctx.beginPath(); ctx.arc(6.6 * scale, -2.2 * scale, 0.45 * scale, 0, TAU); ctx.fill();
      // 胸びれ
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0.6 * scale, 4 * scale, 3.4 * scale, 1.2 * scale, 0.4 * d, 0, TAU); ctx.fill();
      break;
    }
    case "earlyshark": {
      // 古いサメ。背びれが2枚、尾は上葉が長い。
      fishBody(ctx, 0, 0, 7.4 * scale, 2.8 * scale, color, d, { wag: wag * 0.8, dorsal: 0, fork: 0.2, tail: false });
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-6.4 * scale, 0);
      ctx.lineTo(-12.6 * scale, -5.4 * scale + wag * 6 * scale);
      ctx.lineTo(-10.4 * scale, 0.6 * scale + wag * 6 * scale);
      ctx.lineTo(-12 * scale, 2.8 * scale + wag * 6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const [bx, h] of [[0.4, 4.6], [-4, 3]] as const) {
        ctx.beginPath();
        ctx.moveTo(bx * scale - 1.6 * scale, -2.2 * scale);
        ctx.lineTo(bx * scale, -(2.2 + h) * scale);
        ctx.lineTo(bx * scale + 2.2 * scale, -2.2 * scale);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(1.4 * scale, 3 * scale, 3.6 * scale, 1.1 * scale, 0.4 * d, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, 7 * scale, 2.6 * scale, pattern, d, accent);
      break;
    }
    case "tetrapod": {
      // 四足の両生類。ひらたい頭、太い胴、水をかく足。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(8.6 * scale, 0.4 * scale);
      ctx.quadraticCurveTo(4 * scale, -3.4 * scale, -2 * scale, -3 * scale);
      ctx.quadraticCurveTo(-9 * scale, -2.4 * scale, -14 * scale, -0.6 * scale + wag * 6 * scale);
      ctx.quadraticCurveTo(-9 * scale, 1.6 * scale, -2 * scale, 3 * scale);
      ctx.quadraticCurveTo(4 * scale, 3.6 * scale, 8.6 * scale, 1.6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 尾のひれ。まだ魚だったころの名残。
      ctx.beginPath();
      ctx.moveTo(-11 * scale, -1.4 * scale + wag * 6 * scale);
      ctx.quadraticCurveTo(-15 * scale, -4.4 * scale + wag * 6 * scale, -16.4 * scale, wag * 6 * scale);
      ctx.quadraticCurveTo(-15 * scale, 3 * scale + wag * 6 * scale, -11 * scale, 1.4 * scale + wag * 6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5 * scale;
      for (const [lx, ly] of [[3.4, 1], [-4, 1], [3.4, -1], [-4, -1]] as const) {
        ctx.beginPath();
        ctx.moveTo(lx * scale, ly * 2.4 * scale);
        ctx.lineTo(lx * scale - 1.6 * scale, ly * 6.2 * scale + Math.sin(wag * 6 + lx) * scale);
        ctx.stroke();
      }
      ctx.fillStyle = "#f6f2dc";
      for (const side of [-1, 1] as const) {
        ctx.beginPath(); ctx.arc(6 * scale, side * 1.4 * scale - 1.4 * scale, 0.9 * scale, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = "#121a12";
      for (const side of [-1, 1] as const) {
        ctx.beginPath(); ctx.arc(6.2 * scale, side * 1.4 * scale - 1.4 * scale, 0.45 * scale, 0, TAU); ctx.fill();
      }
      applyPattern(ctx, 0, 0, 7 * scale, 2.8 * scale, pattern, d, accent);
      break;
    }
    case "lobefin": {
      // 肉鰭魚。ひれの付け根が太く、そこに骨が入っている。
      fishBody(ctx, 0, 0, 8 * scale, 3.4 * scale, color, d, { wag: wag * 0.8, dorsal: 0.35, fork: 0.15, pectoral: false });
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.7;
      for (const [fx, fy] of [[1.4, 1], [-4, 1], [1.4, -1], [-4, -1]] as const) {
        ctx.save();
        ctx.translate(fx * scale, fy * 2.8 * scale);
        ctx.rotate(fy * (0.5 + Math.sin(wag * 5 + fx) * 0.16) * d);
        ctx.beginPath(); ctx.ellipse(0, 0, 3.2 * scale, 1.5 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      applyPattern(ctx, 0, 0, 8 * scale, 3.4 * scale, pattern, d, accent);
      break;
    }
    case "sturgeon": {
      // 硬い鱗の列を背に持つ長い魚。吻がとがる。
      fishBody(ctx, 0, 0, 8.6 * scale, 2.4 * scale, color, d, { wag, dorsal: 0.3, fork: 0.7 });
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(7.6 * scale, -1.4 * scale);
      ctx.lineTo(13.4 * scale, -0.4 * scale);
      ctx.lineTo(7.6 * scale, 1 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent;
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.arc((5 - i * 2.4) * scale, -2.2 * scale, 0.7 * scale, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = color; ctx.lineWidth = 0.5 * scale;
      for (const side of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(9 * scale, side * 0.6 * scale);
        ctx.lineTo(11.4 * scale, side * 2.4 * scale);
        ctx.stroke();
      }
      break;
    }
    case "sawfish": {
      fishBody(ctx, 0, 0, 8 * scale, 2.6 * scale, color, d, { wag, dorsal: 0.5, fork: 0.5 });
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(7 * scale, -1 * scale);
      ctx.lineTo(15.4 * scale, -0.8 * scale);
      ctx.lineTo(15.4 * scale, 0.6 * scale);
      ctx.lineTo(7 * scale, 1 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(246,242,220,0.9)"; ctx.lineWidth = 0.55;
      for (let i = 0; i < 7; i += 1) {
        const x = (8.4 + i) * scale;
        ctx.beginPath(); ctx.moveTo(x, -1 * scale); ctx.lineTo(x, -2.6 * scale); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, 0.8 * scale); ctx.lineTo(x, 2.4 * scale); ctx.stroke();
      }
      break;
    }
    case "crinoid": {
      // ウミユリ。茎の先に腕を開く。動かないので海底の林になる。
      ctx.strokeStyle = color; ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.moveTo(0, 9 * scale);
      ctx.quadraticCurveTo(1.4 * scale, 2 * scale, 0, -4 * scale);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.ellipse(0, -4.4 * scale, 2 * scale, 1.6 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 0.7 * scale;
      for (let i = 0; i < 7; i += 1) {
        const a = -Math.PI + (i / 6) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(0, -5 * scale);
        ctx.quadraticCurveTo(Math.cos(a) * 3 * scale, -8.4 * scale, Math.cos(a) * 5.4 * scale, -9.4 * scale + Math.sin(i) * 0.6 * scale);
        ctx.stroke();
      }
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.ellipse(0, 9.4 * scale, 3 * scale, 1.2 * scale, 0, 0, TAU); ctx.fill();
      break;
    }
    case "horseshoe": {
      // カブトガニ。半円の甲羅と一本の尾。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-1 * scale, -4.6 * scale);
      ctx.quadraticCurveTo(5.6 * scale, -4.4 * scale, 5.6 * scale, 0);
      ctx.quadraticCurveTo(5.6 * scale, 4.4 * scale, -1 * scale, 4.6 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-1 * scale, -3.4 * scale);
      ctx.lineTo(-5.4 * scale, -2.4 * scale);
      ctx.lineTo(-5.4 * scale, 2.4 * scale);
      ctx.lineTo(-1 * scale, 3.4 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 0.9 * scale;
      ctx.beginPath(); ctx.moveTo(-5.2 * scale, 0); ctx.lineTo(-12 * scale, wag * 4 * scale); ctx.stroke();
      ctx.fillStyle = "#101812";
      for (const side of [-1, 1] as const) {
        ctx.beginPath(); ctx.arc(2.6 * scale, side * 2 * scale, 0.5 * scale, 0, TAU); ctx.fill();
      }
      break;
    }
    case "nymph": {
      // 巨大トンボの幼虫。節のある腹と、たたんだ脚。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.ellipse(0, 0, 5.6 * scale, 2.4 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(5.6 * scale, 0, 2.4 * scale, 2 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.45;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * 1.7 * scale, -2.2 * scale); ctx.lineTo(i * 1.7 * scale, 2.2 * scale); ctx.stroke();
      }
      ctx.strokeStyle = color; ctx.lineWidth = 0.7 * scale;
      for (const [lx, ly] of [[3, 1], [1, 1], [-1, 1], [3, -1], [1, -1], [-1, -1]] as const) {
        ctx.beginPath();
        ctx.moveTo(lx * scale, ly * 1.8 * scale);
        ctx.lineTo(lx * scale + 1.6 * scale, ly * 4.6 * scale + Math.sin(wag * 6 + lx) * 0.6 * scale);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-5.4 * scale, 0);
      ctx.lineTo(-8.4 * scale, -1.4 * scale + wag * 4 * scale);
      ctx.lineTo(-8.4 * scale, 1.4 * scale + wag * 4 * scale);
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = "#121a10";
      for (const side of [-1, 1] as const) {
        ctx.beginPath(); ctx.arc(6.4 * scale, side * 1.2 * scale, 0.7 * scale, 0, TAU); ctx.fill();
      }
      break;
    }
    case "graptolite": {
      // 筆石。のこぎりの歯のような群体が漂う。
      ctx.strokeStyle = color; ctx.lineWidth = 0.9 * scale;
      ctx.beginPath();
      ctx.moveTo(-7 * scale, -5 * scale);
      ctx.quadraticCurveTo(0, 0, -5 * scale, 6 * scale);
      ctx.stroke();
      ctx.fillStyle = color;
      for (let i = 0; i < 9; i += 1) {
        const t = i / 8;
        const px = -7 * scale + Math.sin(t * 3.1) * 6 * scale;
        const py = (-5 + t * 11) * scale;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 3 * scale, py - 1 * scale);
        ctx.lineTo(px + 2.6 * scale, py + 1.2 * scale);
        ctx.closePath(); ctx.fill();
      }
      break;
    }

    /* ============ カンブリア紀とその前 ============ */
    case "anomalocaris": {
      // アノマロカリス。前の2本の触手と、体の横にならぶひれ。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(6.4 * scale, -3 * scale);
      ctx.quadraticCurveTo(-2 * scale, -3.4 * scale, -9 * scale, -1.6 * scale);
      ctx.lineTo(-9 * scale, 1.6 * scale);
      ctx.quadraticCurveTo(-2 * scale, 3.4 * scale, 6.4 * scale, 3 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 体の横のひれ。ここが動くと、いかにも古い生きものに見える。
      for (const side of [-1, 1] as const) {
        for (let i = 0; i < 6; i += 1) {
          ctx.beginPath();
          ctx.ellipse(
            (4 - i * 2.4) * scale,
            side * (3 + Math.sin(wag * 6 + i * 0.7) * 0.7) * scale,
            2 * scale,
            1.1 * scale,
            side * 0.35 * d,
            0,
            TAU,
          );
          ctx.fill();
        }
      }
      // 尾のひれ
      ctx.beginPath();
      ctx.moveTo(-8.6 * scale, 0);
      ctx.lineTo(-13 * scale, -3.4 * scale + wag * 4 * scale);
      ctx.lineTo(-11.4 * scale, wag * 4 * scale);
      ctx.lineTo(-13 * scale, 3.4 * scale + wag * 4 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 2本の触手
      ctx.strokeStyle = color; ctx.lineWidth = 1.2 * scale;
      for (const side of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(6 * scale, side * 1.2 * scale);
        ctx.quadraticCurveTo(11 * scale, side * 2.6 * scale, 12.4 * scale, side * 0.6 * scale + Math.sin(wag * 5) * scale);
        ctx.stroke();
      }
      // 大きな複眼。柄の先についている。
      ctx.fillStyle = accent;
      for (const side of [-1, 1] as const) {
        ctx.beginPath(); ctx.ellipse(6.6 * scale, side * 3.6 * scale, 1.8 * scale, 1.3 * scale, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = "#12100f";
      for (const side of [-1, 1] as const) {
        ctx.beginPath(); ctx.arc(6.8 * scale, side * 3.6 * scale, 0.6 * scale, 0, TAU); ctx.fill();
      }
      break;
    }
    case "opabinia": {
      // オパビニア。5つの目と、前へ伸びるホースのような口。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.ellipse(0, 0, 5.4 * scale, 2 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.45;
      for (let i = -3; i <= 3; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * 1.4 * scale, -1.8 * scale); ctx.lineTo(i * 1.4 * scale, 1.8 * scale); ctx.stroke();
      }
      ctx.fillStyle = color;
      for (const side of [-1, 1] as const) {
        for (let i = 0; i < 5; i += 1) {
          ctx.beginPath();
          ctx.ellipse((3 - i * 2) * scale, side * (2.2 + Math.sin(wag * 6 + i) * 0.4) * scale, 1.5 * scale, 0.8 * scale, 0, 0, TAU);
          ctx.fill();
        }
      }
      ctx.strokeStyle = color; ctx.lineWidth = 0.9 * scale;
      ctx.beginPath();
      ctx.moveTo(5 * scale, -0.6 * scale);
      ctx.quadraticCurveTo(9 * scale, -3 * scale, 11.4 * scale, -0.6 * scale + Math.sin(wag * 5) * scale);
      ctx.stroke();
      ctx.fillStyle = "#1b1410";
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath(); ctx.arc((3.4 + (i % 3) * 0.9) * scale, (-2.2 + i * 0.9) * scale, 0.5 * scale, 0, TAU); ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(-5.2 * scale, 0);
      ctx.lineTo(-8.4 * scale, -2.4 * scale + wag * 4 * scale);
      ctx.lineTo(-8.4 * scale, 2.4 * scale + wag * 4 * scale);
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); ctx.stroke();
      break;
    }
    case "hallucigenia": {
      // 背中に棘、腹に細い脚。上下がどちらか分からなかった生きもの。
      ctx.strokeStyle = color; ctx.lineWidth = 1.8 * scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-6 * scale, 1.4 * scale);
      ctx.quadraticCurveTo(0, -0.6 * scale, 6.4 * scale, 0.6 * scale);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.lineWidth = 0.7 * scale;
      for (let i = 0; i < 7; i += 1) {
        const x = (-5.4 + i * 1.9) * scale;
        ctx.beginPath(); ctx.moveTo(x, -0.4 * scale); ctx.lineTo(x + 0.6 * scale, -5.4 * scale); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, 1.6 * scale);
        ctx.lineTo(x - 0.4 * scale, 5 * scale + Math.sin(wag * 6 + i) * 0.5 * scale);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(6.8 * scale, 0.4 * scale, 1.6 * scale, 0, TAU); ctx.fill();
      ctx.fillStyle = "#171009";
      ctx.beginPath(); ctx.arc(7.4 * scale, 0.2 * scale, 0.5 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, 5 * scale, 1.4 * scale, pattern, d, accent);
      break;
    }
    case "pikaia": {
      // ピカイア。背に一本の筋（脊索）を通す。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(5.4 * scale, 0);
      ctx.quadraticCurveTo(1 * scale, -1.9 * scale, -2 * scale, -1.3 * scale);
      ctx.quadraticCurveTo(-5.4 * scale, -0.8 * scale, -7.4 * scale, wag * 6 * scale);
      ctx.quadraticCurveTo(-5.4 * scale, 0.8 * scale, -2 * scale, 1.3 * scale);
      ctx.quadraticCurveTo(1 * scale, 1.9 * scale, 5.4 * scale, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(4.4 * scale, -0.2 * scale);
      ctx.lineTo(-6.4 * scale, wag * 5 * scale);
      ctx.stroke();
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * 1.7 * scale, -1.3 * scale); ctx.lineTo(i * 1.7 * scale, 1.3 * scale); ctx.stroke();
      }
      break;
    }
    case "dickinsonia": {
      // ディッキンソニア。左右に細かく割れた楕円。目も口もない。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.ellipse(0, 0, 6.4 * scale, 3.6 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(60,38,24,0.5)"; ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.moveTo(-6 * scale, 0); ctx.lineTo(6 * scale, 0); ctx.stroke();
      for (let i = 0; i < 11; i += 1) {
        const t = -0.86 + (i / 10) * 1.72;
        const x = t * 6 * scale;
        const h = Math.sqrt(Math.max(0, 1 - t * t)) * 3.4 * scale;
        ctx.beginPath();
        ctx.moveTo(x, -h);
        ctx.lineTo(x + 0.8 * scale, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      applyPattern(ctx, 0, 0, 6 * scale, 3.4 * scale, pattern, d, accent);
      break;
    }
    case "charnia": {
      // カルニア。羽根のような体を砂に立てる。動かない。
      ctx.strokeStyle = color; ctx.lineWidth = 1.4 * scale;
      ctx.beginPath();
      ctx.moveTo(0, 9 * scale);
      ctx.quadraticCurveTo(1 * scale, 2 * scale, 0, -9 * scale);
      ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 0.9 * scale;
      for (let i = 0; i < 9; i += 1) {
        const y = (7 - i * 2) * scale;
        const w = (5.4 - Math.abs(i - 3) * 0.6) * scale;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(w * 0.7, y - 1.6 * scale, w, y - 3 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(-w * 0.7, y - 1.6 * scale, -w, y - 3 * scale);
        ctx.stroke();
      }
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.ellipse(0, 9.4 * scale, 3.4 * scale, 1.3 * scale, 0, 0, TAU); ctx.fill();
      break;
    }
    case "stromatolite": {
      // ストロマトライト。層が積み上がった岩。35億年、同じ形。
      ctx.fillStyle = color;
      ctx.strokeStyle = outlineColor; ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-5.4 * scale, 8 * scale);
      ctx.quadraticCurveTo(-4.4 * scale, -6 * scale, 0, -7.4 * scale);
      ctx.quadraticCurveTo(4.4 * scale, -6 * scale, 5.4 * scale, 8 * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.5;
      for (let i = 0; i < 6; i += 1) {
        const y = (6 - i * 2.4) * scale;
        const w = (5 - i * 0.5) * scale;
        ctx.beginPath();
        ctx.moveTo(-w, y);
        ctx.quadraticCurveTo(0, y - 1.6 * scale, w, y);
        ctx.stroke();
      }
      break;
    }
    case "microbe": {
      // 細胞・膜・気泡。輪郭のある丸と、内側の光。
      ctx.strokeStyle = color; ctx.lineWidth = 0.7 * scale;
      ctx.beginPath(); ctx.arc(0, 0, 2.8 * scale, 0, TAU); ctx.stroke();
      ctx.fillStyle = pattern === "glow" ? accent : color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(0, 0, 2.4 * scale, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0.7 * scale, -0.6 * scale, 0.9 * scale, 0, TAU); ctx.fill();
      break;
    }
  }
  ctx.restore();
};

const drawHabitat = (ctx: CanvasRenderingContext2D, habitat: Habitat, seed: number) => {
  const [top, bottom, floor] = HABITAT_COLORS[habitat];
  const water = ctx.createLinearGradient(0, -18, 0, 20);
  water.addColorStop(0, top);
  water.addColorStop(1, bottom);
  ctx.fillStyle = water;
  rr(ctx, -38, -19, 76, 40, 12);
  ctx.fill();

  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(-38, 12); ctx.quadraticCurveTo(-10, 6 + seeded(seed, 1) * 6, 8, 13); ctx.quadraticCurveTo(26, 18, 38, 10); ctx.lineTo(38, 21); ctx.lineTo(-38, 21); ctx.closePath();
  ctx.fill();

  const roots =
    habitat === "mekong" ||
    habitat === "flooded-forest" ||
    habitat === "amazon" ||
    habitat === "amazon-giant" ||
    habitat === "paleo-river" ||
    habitat === "carbon-swamp";
  const rocky =
    habitat === "mountain" ||
    habitat === "africa" ||
    habitat === "japan-sea" ||
    habitat === "cold-sea" ||
    habitat === "devonian" ||
    habitat === "permian-sea" ||
    habitat === "ordovician";
  const coral = habitat === "okinawa" || habitat === "seasia" || habitat === "great-reef";
  if (roots) {
    ctx.strokeStyle = habitat === "flooded-forest" ? "#382d22" : "#57452f";
    ctx.lineWidth = 3.4;
    for (let i = 0; i < 4; i += 1) {
      const x = -31 + i * 20 + seeded(seed, i + 7) * 5;
      ctx.beginPath(); ctx.moveTo(x, -18); ctx.bezierCurveTo(x + 8, -5, x - 9, 5, x + 2, 17); ctx.stroke();
    }
  }
  if (rocky) {
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i % 2 ? "rgba(75,92,92,0.72)" : "rgba(115,125,116,0.75)";
      ctx.beginPath(); ctx.ellipse(-30 + i * 15, 13 - (i % 2) * 3, 7 + (i % 3), 4 + (i % 2), -0.2 + i * 0.1, 0, TAU); ctx.fill();
    }
  }
  if (coral) {
    const colors = habitat === "great-reef" ? ["#ee7f75", "#e8c652", "#a779d8", "#62c6b4"] : ["#e48a77", "#e9c76e", "#a689cf"];
    for (let i = 0; i < (habitat === "great-reef" ? 8 : 5); i += 1) {
      const x = -31 + i * (habitat === "great-reef" ? 9 : 15);
      ctx.strokeStyle = colors[i % colors.length]; ctx.lineWidth = 2.3;
      ctx.beginPath(); ctx.moveTo(x, 15); ctx.lineTo(x + (i % 2 ? 2 : -2), 7); ctx.lineTo(x + (i % 3 - 1) * 4, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 9); ctx.lineTo(x + 5, 5); ctx.stroke();
    }
  }
  if (habitat === "kelp") {
    for (let i = 0; i < 6; i += 1) {
      const x = -32 + i * 13;
      ctx.strokeStyle = i % 2 ? "#356b47" : "#4a8254"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 18); ctx.bezierCurveTo(x + 7, 6, x - 6, -5, x + 3, -18); ctx.stroke();
      ctx.fillStyle = "rgba(76,132,82,0.8)";
      for (let y = 8; y > -14; y -= 8) { ctx.beginPath(); ctx.ellipse(x + (y % 16 ? 4 : -3), y, 5, 1.8, 0.4, 0, TAU); ctx.fill(); }
    }
  }
  if (habitat === "satogawa") {
    for (let i = 0; i < 9; i += 1) { ctx.fillStyle = i % 2 ? "#d8c79e" : "#aa9c78"; ctx.beginPath(); ctx.ellipse(-32 + i * 8, 15, 3.5, 2, i * 0.2, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = "#5d9270"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i += 1) { const x = -28 + i * 17; ctx.beginPath(); ctx.moveTo(x, 15); ctx.quadraticCurveTo(x + 2, 5, x - 1, 1); ctx.stroke(); }
  }
  if (
    habitat === "open-ocean" ||
    habitat === "indian" ||
    habitat === "world-ocean" ||
    habitat === "giant-shark-sea" ||
    habitat === "mesozoic-sea"
  ) {
    ctx.strokeStyle = "rgba(220,248,255,0.2)"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.moveTo(-31 + i * 24, -18); ctx.lineTo(-18 + i * 24, 18); ctx.stroke(); }
  }

  /* ---- 施設棟。水槽ではないので、水面ではなく灯りと棚を描く ---- */
  if (habitat === "shop-case") {
    // ケースの背板と、上からのスポット。
    ctx.fillStyle = "rgba(255,214,150,0.14)";
    ctx.beginPath();
    ctx.moveTo(-30, -19); ctx.lineTo(30, -19); ctx.lineTo(20, 21); ctx.lineTo(-20, 21);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(120,92,56,0.55)"; ctx.lineWidth = 1.4;
    for (const x of [-19, 19]) { ctx.beginPath(); ctx.moveTo(x, -19); ctx.lineTo(x, 21); ctx.stroke(); }
  }
  if (habitat === "dining") {
    // 席側のあかりが、水槽のガラスに映り込む。
    ctx.fillStyle = "rgba(255,196,116,0.16)";
    ctx.fillRect(-38, 8, 76, 13);
    ctx.strokeStyle = "rgba(255,226,176,0.3)"; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath(); ctx.moveTo(-30 + i * 20, 10); ctx.lineTo(-26 + i * 20, 20); ctx.stroke();
    }
  }
  if (habitat === "terrarium") {
    // 左が陸、右が水。段差と植物で、水槽と別ものだと分かるようにする。
    ctx.fillStyle = "rgba(104,120,70,0.94)";
    ctx.beginPath();
    ctx.moveTo(-38, 4); ctx.quadraticCurveTo(-18, -2, 2, 5); ctx.lineTo(2, 21); ctx.lineTo(-38, 21);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(56,80,52,0.8)";
    for (let i = 0; i < 5; i += 1) {
      const x = -34 + i * 8;
      ctx.beginPath(); ctx.ellipse(x, -1 + seeded(seed, i) * 3, 4.4, 2, -0.5 + i * 0.2, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = "#6b5738"; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-24, 2); ctx.quadraticCurveTo(-4, -12, 26, -6); ctx.stroke();
    // 霧吹きの水滴
    ctx.fillStyle = "rgba(226,250,240,0.4)";
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath(); ctx.arc(-30 + seeded(seed, i + 40) * 62, -16 + seeded(seed, i + 50) * 10, 0.9, 0, TAU); ctx.fill();
    }
  }

  /* ---- 古代棟 ---- */
  if (habitat === "ice-sea") {
    // 天井の氷。ここが水面のかわりになる。
    ctx.fillStyle = "rgba(236,250,255,0.92)";
    ctx.beginPath();
    ctx.moveTo(-38, -19); ctx.lineTo(38, -19); ctx.lineTo(38, -12);
    ctx.quadraticCurveTo(16, -7, -4, -12); ctx.quadraticCurveTo(-22, -16, -38, -11);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(146,196,222,0.7)"; ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i += 1) {
      const x = -28 + i * 18;
      ctx.beginPath(); ctx.moveTo(x, -19); ctx.lineTo(x + 3, -11); ctx.stroke();
    }
  }
  if (habitat === "paleo-shore" || habitat === "lagoon" || habitat === "ediacaran") {
    // 浅い砂底の波紋。まだ体の小さい時代の海。
    ctx.strokeStyle = "rgba(255,248,220,0.35)"; ctx.lineWidth = 0.9;
    for (let i = 0; i < 5; i += 1) {
      const y = 8 + i * 2.6;
      ctx.beginPath();
      ctx.moveTo(-36, y);
      ctx.quadraticCurveTo(-10, y - 2.4, 6, y);
      ctx.quadraticCurveTo(22, y + 2.4, 36, y - 1);
      ctx.stroke();
    }
  }
  if (habitat === "crinoid-sea" || habitat === "silurian") {
    // 海底に築かれたばかりの礁。まだ低く、丸い。
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 ? "rgba(148,132,92,0.7)" : "rgba(184,166,116,0.65)";
      ctx.beginPath();
      ctx.ellipse(-31 + i * 13, 14 - (i % 2) * 2, 8, 4.4, 0, Math.PI, TAU);
      ctx.fill();
    }
  }
  if (habitat === "dead-sea") {
    // 酸素の消えた海。紫の靄を一枚かけて、生きている海と区別する。
    ctx.fillStyle = "rgba(96,44,104,0.34)";
    rr(ctx, -38, -19, 76, 40, 12); ctx.fill();
    ctx.strokeStyle = "rgba(214,168,222,0.24)"; ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-34 + i * 20, 20);
      ctx.quadraticCurveTo(-30 + i * 20, 4, -34 + i * 20, -18);
      ctx.stroke();
    }
  }
  if (habitat === "cambrian") {
    // 光がまだ弱い海。奥をわずかに暗く落とす。
    ctx.fillStyle = "rgba(24,22,44,0.28)";
    rr(ctx, -38, -19, 76, 40, 12); ctx.fill();
  }
  if (habitat === "stromatolite-sea") {
    // 岩の上を覆う緑の膜と、水面に浮く酸素の泡。
    ctx.fillStyle = "rgba(126,168,74,0.5)";
    ctx.beginPath();
    ctx.moveTo(-38, 11); ctx.quadraticCurveTo(-12, 6, 8, 12); ctx.quadraticCurveTo(26, 17, 38, 9);
    ctx.lineTo(38, 21); ctx.lineTo(-38, 21); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(236,255,214,0.55)";
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.arc(-33 + i * 8.4, -14 + seeded(seed, i + 60) * 5, 1 + seeded(seed, i + 70) * 0.9, 0, TAU);
      ctx.fill();
    }
  }
  if (habitat === "hadean") {
    // 生命誕生の海。ほとんど真っ暗な水に、熱水の光だけがある。
    ctx.fillStyle = "rgba(8,4,10,0.6)";
    rr(ctx, -38, -19, 76, 40, 12); ctx.fill();
    const heat = ctx.createRadialGradient(0, 16, 1, 0, 16, 30);
    heat.addColorStop(0, "rgba(255,150,72,0.5)");
    heat.addColorStop(0.5, "rgba(214,84,54,0.16)");
    heat.addColorStop(1, "rgba(214,84,54,0)");
    ctx.fillStyle = heat;
    ctx.beginPath(); ctx.ellipse(0, 16, 30, 22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,196,132,0.5)";
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.arc(-28 + seeded(seed, i + 80) * 56, -16 + seeded(seed, i + 90) * 32, 0.6 + seeded(seed, i + 100) * 0.8, 0, TAU);
      ctx.fill();
    }
  }
  if (habitat === "deep-sea") {
    ctx.fillStyle = "rgba(6,12,28,0.55)"; rr(ctx, -38, -19, 76, 40, 12); ctx.fill();
    for (let i = 0; i < 7; i += 1) { ctx.fillStyle = `rgba(89,226,220,${0.25 + seeded(seed, i) * 0.5})`; ctx.beginPath(); ctx.arc(-32 + seeded(seed, i + 20) * 64, -14 + seeded(seed, i + 30) * 28, 0.7 + seeded(seed, i + 40), 0, TAU); ctx.fill(); }
  }
};

/** 底を這う生きもの。中層を泳がせると別の生きものに見えてしまう */
const BOTTOM_DWELLERS = new Set<Creature>([
  "loach",
  "crab",
  "isopod",
  "octopus",
  "eel",
  "ray",
  "rockfish",
  "catfish",
  "angler",
  // 底を歩く・這う・立つもの
  "trilobite",
  "eurypterid",
  "horseshoe",
  "nymph",
  "salamander",
  "lizard",
  "crocodile",
  "landbeast",
  "tetrapod",
  "placoderm",
  "hallucigenia",
  "dickinsonia",
  "sawfish",
  "spinosaur",
  "frog",
]);

/** ゆっくり往復する大物。群れと同じ速さで泳ぐと迫力が出ない */
const SLOW_SWIMMERS = new Set<Creature>([
  "arowana",
  "shark",
  "whale-shark",
  "manta",
  "napoleon",
  "perch",
  "turtle",
  "catfish",
  "ray",
  // 大きいものは、群れと同じ速さで泳ぐと迫力が出ない
  "whale",
  "serpentWhale",
  "seacow",
  "seal",
  "mosasaur",
  "plesiosaur",
  "pliosaur",
  "orthocone",
  "snake",
  "anomalocaris",
  "sturgeon",
  "lobefin",
  "earlyshark",
]);

type Swim = { x: number; y: number; dir: number; wag: number };

/**
 * 一匹ぶんの泳ぎを決める。
 * 群れは水槽の端から端へ回遊し、大物はゆっくり往復、底生は底を歩く。
 * 座標だけで動かすので、描画コストは止まっているときと変わらない。
 */
const swimOf = (
  kind: Creature,
  seed: number,
  i: number,
  time: number,
  spread: number,
  bandTop: number,
  bandHeight: number,
  hero: boolean,
): Swim => {
  const phase = seeded(seed, i + 400);
  const bottom = BOTTOM_DWELLERS.has(kind);
  const slow = hero || SLOW_SWIMMERS.has(kind);
  const baseY = bandTop + seeded(seed, i + 90) * bandHeight;

  if (slow) {
    // 端で向きを変える往復。sin なので折り返しで自然に減速する
    const speed = bottom ? 0.16 : 0.24;
    const travel = Math.sin(time * speed + phase * TAU);
    const reach = spread * (hero ? 0.34 : 0.46);
    return {
      x: travel * reach,
      y: bottom ? bandTop + bandHeight * 0.86 : baseY + Math.sin(time * 0.5 + phase * 9) * 1.6,
      dir: Math.cos(time * speed + phase * TAU) >= 0 ? 1 : -1,
      wag: Math.sin(time * (bottom ? 1.6 : 2.2) + phase * 7) * 0.16,
    };
  }

  // 群れは一方向へ流れ、端まで行ったら反対の端から戻ってくる
  const dir = seeded(seed, i + 120) > 0.42 ? 1 : -1;
  const speed = 5 + seeded(seed, i + 150) * 6;
  const span = spread + 26;
  const t = ((time * speed + phase * span) % span + span) % span;
  const x = dir > 0 ? -spread / 2 - 13 + t : spread / 2 + 13 - t;
  return {
    x,
    y: bottom
      ? bandTop + bandHeight * (0.78 + seeded(seed, i + 200) * 0.2)
      : baseY + Math.sin(time * 1.5 + phase * 11) * 1.8,
    dir,
    wag: Math.sin(time * 7 + phase * 13) * 0.3,
  };
};

/**
 * 泳がない展示の置き場所。
 * 棚の商品も、海底に固定された生きものも、格子に並べて置く。
 * 1列に収まらないぶんは上の段へ。
 */
const stillSpot = (
  seed: number,
  i: number,
  count: number,
  base: number,
  bandShift: number,
): Swim => {
  const perRow = Math.min(count, 5);
  const row = Math.floor(i / perRow);
  const col = i % perRow;
  const span = 60;
  const x = perRow <= 1 ? 0 : -span / 2 + (col * span) / (perRow - 1);
  return {
    x: x + (seeded(seed, i + 700) - 0.5) * 4,
    y: base + bandShift - row * 12,
    dir: seeded(seed, i + 720) > 0.5 ? 1 : -1,
    wag: 0,
  };
};

const drawSchool = (
  ctx: CanvasRenderingContext2D,
  visual: ExhibitVisual,
  seed: number,
  sizeBoost = 1,
  time = 0,
  bandShift = 0,
) => {
  const hero = Math.max(1, visual.heroScale ?? 1);
  const count = Math.max(1, visual.count);
  const density = visual.density ?? 1;
  const primaryCount = visual.secondary ? Math.max(1, Math.round(count * 0.72)) : count;
  const accent = visual.secondaryColor ?? "rgba(244,248,237,0.8)";
  const bandHeight = 22 / density;
  const still = visual.still === true;
  const stillBase = visual.stillBase ?? 11;

  for (let i = 0; i < primaryCount; i += 1) {
    const isHero = i === 0 && hero > 1.35;
    const s = (isHero ? hero : 0.78 + seeded(seed, i + 4) * 0.32)
      * (count > 20 ? 0.72 : count > 14 ? 0.82 : 1)
      * sizeBoost;
    const swim = still
      ? stillSpot(seed, i, primaryCount, stillBase, bandShift)
      : swimOf(visual.primary, seed, i, time, 58, -11 + bandShift, bandHeight, isHero);
    drawCreature(
      ctx,
      visual.primary,
      swim.x,
      swim.y,
      s,
      visual.color,
      visual.pattern ?? "none",
      accent,
      swim.dir,
      swim.wag,
    );
  }

  if (visual.secondary) {
    const secondaryCount = Math.max(1, count - primaryCount);
    for (let i = 0; i < secondaryCount; i += 1) {
      const s = (0.9 + seeded(seed, i + 180) * 0.25)
        * (visual.heroScale && visual.heroScale > 1.4 ? 1.15 : 1)
        * sizeBoost;
      const swim = still
        ? stillSpot(seed, i + 3, secondaryCount, stillBase - 12, bandShift)
        : swimOf(visual.secondary, seed, i + 60, time, 50, -9 + bandShift, 18, false);
      drawCreature(
        ctx,
        visual.secondary,
        swim.x,
        swim.y,
        s,
        visual.secondaryColor ?? accent,
        "none",
        visual.color,
        swim.dir,
        swim.wag,
      );
    }
  }
};

/** 水槽の泡。動いているものが増えるほど「生きている水槽」に見える */
const drawBubbles = (ctx: CanvasRenderingContext2D, seed: number, time: number, tall: number) => {
  ctx.fillStyle = "rgba(226,250,255,0.5)";
  ctx.strokeStyle = "rgba(226,250,255,0.7)";
  ctx.lineWidth = 0.4;
  for (let i = 0; i < 7; i += 1) {
    const x = -33 + seeded(seed, i + 500) * 66;
    const speed = 5 + seeded(seed, i + 520) * 6;
    const rise = ((time * speed + seeded(seed, i + 540) * tall) % tall);
    const y = tall / 2 - rise;
    const r = 0.5 + seeded(seed, i + 560) * 0.9;
    ctx.beginPath();
    ctx.arc(x + Math.sin(time * 1.6 + i) * 1.4, y, r, 0, TAU);
    ctx.stroke();
  }
};

/**
 * `aquarium-{area}-{index}` を描く。54展示すべて別設定。
 * Shop.tsx側から generic fish より前に呼ぶ。
 */
export const drawAquariumExhibit = (
  ctx: CanvasRenderingContext2D,
  art: string,
  seed: number,
  time = 0,
) => {
  const match = /^aquarium-(\d+)-(\d+)$/.exec(art);
  if (!match) return false;
  const area = Number(match[1]);
  const index = Number(match[2]) - 1;
  const visual = EXHIBITS[area]?.[index];
  if (!visual) return false;

  const display = getAquariumDisplay(area, index + 1);

  ctx.save();
  ctx.scale(display.tankScale, display.tankScale);

  // 水槽タイプごとに窓形状を変え、その中だけに生息環境と魚を描く。
  ctx.save();
  clipTankInterior(ctx, display.profile);
  ctx.clip();

  drawHabitat(ctx, visual.habitat, seed + area * 31 + index * 7);
  drawSwimBand(ctx, display.profile, display.outlineMode);

  /*
   * 魚の縁取り。以前は shadowBlur でリム光を付けていたが、
   * 水槽の数だけぼかしが走って重かった。輪郭線の色を水の明るさで
   * 変えるだけにして、読みやすさは保ったまま描画コストを落とす。
   */
  ctx.save();
  outlineColor = display.outlineMode === "light"
    ? "rgba(226,250,255,0.9)"
    : "rgba(5,22,28,0.84)";
  // 魚の座標は動かさず、魚体サイズだけ補正する。
  // 群れを座標ごと拡大すると水槽端で切れやすいため。
  drawSchool(
    ctx,
    visual,
    seed + area * 101 + index * 17,
    display.fishScaleBoost,
    time,
    display.bandShift,
  );
  outlineColor = DARK_OUTLINE;
  ctx.restore();

  drawBubbles(ctx, seed + area * 7 + index * 3, time, 44);
  ctx.restore();
  drawTankFrame(ctx, display.profile, display.hero, area);
  ctx.restore();

  return true;
};
