/**
 * ============================================================================
 * WYLQ-Audit v3.33.0 - Nine-Palace & Linggui Bafa Module + Automated Test Suite
 * 檔案名稱：test-nine-palace-v3.33.js
 * 執行方式：node test-nine-palace-v3.33.js
 * ============================================================================
 */

"use strict";

const assert = require("assert");

// ============================================================================
// PART 1: v3.33.0 核心模組（Final Sealed Edition - 已修復 F-01 ~ F-05）
// ============================================================================

const MEDICAL_BOUNDARY_NOTICE =
  "⚠️ 本區為傳統運氣理論模型推演，穴位僅作典籍對照，不是針灸處方；實際取穴與補瀉須由合格中醫師按四診合參決定。";

const FALLBACK_GAN = Object.freeze(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const FALLBACK_ZHI = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
const FALLBACK_BLOCKED_GZ = Object.freeze(["乙酉", "己丑", "己未", "丁亥"]);

// 🔴 F-01 修正：使用 try/catch 徹底免疫 const/let TDZ（暫時性死區）ReferenceError
let GAN_LIST, ZHI_LIST, HIGH_TIER_BLOCKED_LIST;
try { GAN_LIST = Array.isArray(GAN) ? GAN : FALLBACK_GAN; } catch (_) { GAN_LIST = FALLBACK_GAN; }
try { ZHI_LIST = Array.isArray(ZHI) ? ZHI : FALLBACK_ZHI; } catch (_) { ZHI_LIST = FALLBACK_ZHI; }
try {
  HIGH_TIER_BLOCKED_LIST = Array.isArray(HIGH_TIER_PINGQI_BLOCKED_GZ)
    ? HIGH_TIER_PINGQI_BLOCKED_GZ
    : FALLBACK_BLOCKED_GZ;
} catch (_) {
  HIGH_TIER_BLOCKED_LIST = FALLBACK_BLOCKED_GZ;
}

const YANG_GAN_SET = Object.freeze(new Set(["甲", "丙", "戊", "庚", "壬"]));

/**
 * 洛書九宮基礎拓撲與《靈樞·九宮八風》《九針論》原典映射表
 * 注意：中五宮（LUOSHU_PALACE_META[5]）無單一對宮，故 `沖後對宮` 與 `沖後虛風` 為 null，下游讀取時須作 null guard。
 */
const LUOSHU_PALACE_META = Object.freeze({
  1: Object.freeze({
    宮數: 1, 宮名: "一宮・葉蟄", 卦位: "坎一", 方位: "正北", 五行: "水",
    應人九野: "腰尻下竅", 八正直日: "壬子日", 天忌日: null,
    當令實風: Object.freeze({ 方向: "北風", 屬性: "實風", 說明: "太一居本宮時從北方所居之鄉來，主生、長養萬物" }),
    失令虛風: Object.freeze({
      風名: "大剛風",
      觸發條件: "太一居正南離九宮（北方為衝後方位）時，從北方逆來之風方為《靈樞》標準虛風",
      病候: "內舍於腎，外在骨與肩背膂筋，氣主寒"
    }),
    中宮異常風候: null,
    沖後對宮: 9, 沖後方位: "正南（離九・上天）",
    沖後虛風: Object.freeze({ 風名: "大弱風", 傷藏: "心", 病候: "內舍於心，外在於脈，氣主熱" })
  }),
  2: Object.freeze({
    宮數: 2, 宮名: "二宮・玄委", 卦位: "坤二", 方位: "西南", 五行: "土",
    應人九野: "右手", 八正直日: "戊申、己未日", 天忌日: null,
    當令實風: Object.freeze({ 方向: "西南風", 屬性: "實風", 說明: "太一居本宮時從西南所居之鄉來，主生、長養萬物" }),
    失令虛風: Object.freeze({
      風名: "謀風",
      觸發條件: "太一居東北艮八宮（西南為衝後方位）時，從西南方逆來之風方為《靈樞》標準虛風",
      病候: "內舍於脾，外在於肌，氣主弱"
    }),
    中宮異常風候: null,
    沖後對宮: 8, 沖後方位: "東北（艮八・天留）",
    沖後虛風: Object.freeze({ 風名: "凶風", 傷藏: "大腸", 病候: "內舍於大腸，外在兩脅腋骨下及肢節" })
  }),
  3: Object.freeze({
    宮數: 3, 宮名: "三宮・倉門", 卦位: "震三", 方位: "正東", 五行: "木",
    應人九野: "左脅", 八正直日: "乙卯日", 天忌日: null,
    當令實風: Object.freeze({ 方向: "東風", 屬性: "實風", 說明: "太一居本宮時從東方所居之鄉來，主生、長養萬物" }),
    失令虛風: Object.freeze({
      風名: "嬰兒風",
      觸發條件: "太一居正西兌七宮（東方為衝後方位）時，從東方逆來之風方為《靈樞》標準虛風",
      病候: "內舍於肝，外在筋紐，氣主身濕"
    }),
    中宮異常風候: null,
    沖後對宮: 7, 沖後方位: "正西（兌七・倉果）",
    沖後虛風: Object.freeze({ 風名: "剛風", 傷藏: "肺", 病候: "內舍於肺，外在於皮膚，氣主燥" })
  }),
  4: Object.freeze({
    宮數: 4, 宮名: "四宮・陰洛", 卦位: "巽四", 方位: "東南（注家稱天門）", 五行: "木",
    應人九野: "左手", 八正直日: "戊辰、己巳日", 天忌日: null,
    當令實風: Object.freeze({ 方向: "東南風", 屬性: "實風", 說明: "太一居本宮時從東南所居之鄉來，主生、長養萬物" }),
    失令虛風: Object.freeze({
      風名: "弱風",
      觸發條件: "太一居西北乾六宮（東南為衝後方位）時，從東南方逆來之風方為《靈樞》標準虛風",
      病候: "內舍於胃，外在肌肉，氣主體重"
    }),
    中宮異常風候: null,
    沖後對宮: 6, 沖後方位: "西北（乾六・新洛）",
    沖後虛風: Object.freeze({ 風名: "折風", 傷藏: "小腸", 病候: "內舍於小腸，外在手太陽脈，脈絕則溢，脈閉則結不通，善暴死" })
  }),
  5: Object.freeze({
    宮數: 5, 宮名: "五宮・招搖", 卦位: "中五", 方位: "中央（中州）", 五行: "土",
    應人九野: "膈下三藏六府",
    八正直日: "無（中宮不屬八正）",
    天忌日: "諸戊己日及太一所在之日（見天忌日流派釋義）",
    天忌日流派釋義: "《靈樞·九針論》云：『主膈下三藏，應中州之氣，大禁太一所在之日及諸戊己。』注家一解指各宮交節移宮直日及戊己日；另一解指當令太一所在宮位之日及戊己日，刺中州膈下皆須審慎。",
    當令實風: Object.freeze({ 方向: "無定方", 屬性: "無單一屬性（中宮朝八風）", 說明: "《靈樞·九宮八風》：『太一入徙，立於中宮，乃朝八風，以占吉凶也。』" }),
    失令虛風: Object.freeze({
      風名: "無（不適用八方失令概念，請參看中宮異常風候）",
      觸發條件: "太一入中宮之日，若見折木揚沙之變風",
      病候: "占在吏（太一居五宮之日見折木揚沙之變，主吏治失和）；視八方虛風所從來之鄉而占其內舍之藏"
    }),
    中宮異常風候: Object.freeze({
      條件: "太一居五宮之日，病風折樹木，揚沙石",
      病候: "占在吏（主吏治失和）；因視八方虛風所從來而占其內舍之藏"
    }),
    沖後對宮: null,
    沖後方位: "無（中宮不在八方，無單一衝後對宮，視八方來風以占病候）",
    沖後虛風: null
  }),
  6: Object.freeze({
    宮數: 6, 宮名: "六宮・新洛", 卦位: "乾六", 方位: "西北（注家稱地戶）", 五行: "金",
    應人九野: "右足", 八正直日: "戊戌、己亥日", 天忌日: null,
    當令實風: Object.freeze({ 方向: "西北風", 屬性: "實風", 說明: "太一居本宮時從西北所居之鄉來，主生、長養萬物" }),
    失令虛風: Object.freeze({
      風名: "折風",
      觸發條件: "太一居東南巽四宮（西北為衝後方位）時，從西北方逆來之風方為《靈樞》標準虛風",
      病候: "內舍於小腸，外在手太陽脈，脈絕則溢，脈閉則結不通"
    }),
    中宮異常風候: null,
    沖後對宮: 4, 沖後方位: "東南（巽四・陰洛）",
    沖後虛風: Object.freeze({ 風名: "弱風", 傷藏: "胃", 病候: "內舍於胃，外在於肌肉，氣主體重" })
  }),
  7: Object.freeze({
    宮數: 7, 宮名: "七宮・倉果", 卦位: "兌七", 方位: "正西", 五行: "金",
    應人九野: "右脅", 八正直日: "辛酉日", 天忌日: null,
    當令實風: Object.freeze({ 方向: "西風", 屬性: "實風", 說明: "太一居本宮時從西方所居之鄉來，主生、長養萬物" }),
    失令虛風: Object.freeze({
      風名: "剛風",
      觸發條件: "太一居正東震三宮（西方為衝後方位）時，從西方逆來之風方為《靈樞》標準虛風",
      病候: "內舍於肺，外在皮膚，氣主燥"
    }),
    中宮異常風候: null,
    沖後對宮: 3, 沖後方位: "正東（震三・倉門）",
    沖後虛風: Object.freeze({ 風名: "嬰兒風", 傷藏: "肝", 病候: "內舍於肝，外在於筋紐，氣主身濕" })
  }),
  8: Object.freeze({
    宮數: 8, 宮名: "八宮・天留", 卦位: "艮八", 方位: "東北", 五行: "土",
    應人九野: "左足", 八正直日: "戊寅、己丑日", 天忌日: null,
    當令實風: Object.freeze({ 方向: "東北風", 屬性: "實風", 說明: "太一居本宮時從東北所居之鄉來，主生、長養萬物" }),
    失令虛風: Object.freeze({
      風名: "凶風",
      觸發條件: "太一居西南坤二宮（東北為衝後方位）時，從東北方逆來之風方為《靈樞》標準虛風",
      病候: "內舍於大腸，外在兩脅腋骨下及肢節"
    }),
    中宮異常風候: null,
    沖後對宮: 2, 沖後方位: "西南（坤二・玄委）",
    沖後虛風: Object.freeze({ 風名: "謀風", 傷藏: "脾", 病候: "內舍於脾，外在於肌，氣主弱" })
  }),
  9: Object.freeze({
    宮數: 9, 宮名: "九宮・上天", 卦位: "離九", 方位: "正南", 五行: "火",
    應人九野: "膺喉首頭", 八正直日: "丙午日", 天忌日: null,
    當令實風: Object.freeze({ 方向: "南風", 屬性: "實風", 說明: "太一居本宮時從南方所居之鄉來，主生、長養萬物" }),
    失令虛風: Object.freeze({
      風名: "大弱風",
      觸發條件: "太一居正北坎一宮（南方為衝後方位）時，從南方逆來之風方為《靈樞》標準虛風",
      病候: "內舍於心，外在脈，氣主熱"
    }),
    中宮異常風候: null,
    沖後對宮: 1, 沖後方位: "正北（坎一・葉蟄）",
    沖後虛風: Object.freeze({ 風名: "大剛風", 傷藏: "腎", 病候: "內舍於腎，外在骨與肩背膂筋，氣主寒" })
  })
});

const YIN_STEM_ZAIGONG_MAP = Object.freeze({
  "乙": Object.freeze({
    歲運: "少商（金運不及）",
    邪氣化度: "熱化寒化勝復同，所謂邪氣化日／度也",
    災宮數: 7,
    災宮來源: "《素問·六元正紀大論》原文「災七宮」",
    次級波及宮: Object.freeze([6]),
    次級波及來源: "本系統依後天八卦同五行金位（乾六）推論之擴展，非原典明文",
    勝氣: "火（熱化）", 復氣: "水（寒化）", 受邪本藏: "肺（兼及大腸）",
    運氣配穴參照: Object.freeze({
      穴位: "後谿（兌七，手太陽小腸經通督脈）",
      傳統補瀉參考: "傳統運氣配穴多云瀉小腸火以救肺金之不足（屬後世運氣配穴延伸，非靈龜八法本義；具體操作需結合病人虛實寒熱辨證，不可盲目套用）"
    })
  }),
  "丁": Object.freeze({
    歲運: "少角（木運不及）",
    邪氣化度: "清化熱化勝復同，所謂邪氣化日／度也",
    災宮數: 3,
    災宮來源: "《素問·六元正紀大論》原文「災三宮」",
    次級波及宮: Object.freeze([4]),
    次級波及來源: "本系統依後天八卦同五行木位（巽四）推論之擴展，非原典明文",
    勝氣: "金（清化）", 復氣: "火（熱化）", 受邪本藏: "肝（兼及膽）",
    運氣配穴參照: Object.freeze({
      穴位: "外關（震三，手少陽三焦經通陽維脈）",
      傳統補瀉參考: "傳統運氣配穴多云假三焦相火以制肺金之勝（屬後世運氣配穴延伸，非靈龜八法本義；具體操作需結合病人虛實寒熱辨證，不可盲目套用）"
    })
  }),
  "己": Object.freeze({
    歲運: "少宮（土運不及）",
    邪氣化度: "風化清化勝復同，所謂邪氣化日／度也",
    災宮數: 5,
    災宮來源: "《素問·六元正紀大論》原文「災五宮」",
    次級波及宮: Object.freeze([2, 4, 6, 8]),
    次級波及來源: "《素問·五常政大論》卑監之紀原文「其眚四維」（坤二、巽四、乾六、艮八四隅宮）",
    勝氣: "木（風化）", 復氣: "金（清化）", 受邪本藏: "脾（兼及胃）",
    運氣配穴參照: Object.freeze({
      穴位: "通行法寄坤二照海／古法男寄艮八內關、女寄坤二照海／脾土本經參照乾六公孫",
      傳統補瀉參考: "傳統運氣配穴多云培土抑木以防風化乘克（屬後世運氣配穴延伸，非靈龜八法本義；具體操作需結合病人虛實寒熱辨證，不可盲目套用）"
    })
  }),
  "辛": Object.freeze({
    歲運: "少羽（水運不及）",
    邪氣化度: "雨化風化勝復同，所謂邪氣化日／度也",
    災宮數: 1,
    災宮來源: "《素問·六元正紀大論》原文「災一宮」",
    次級波及宮: Object.freeze([]),
    次級波及來源: "坎一為唯一正北水位，無其他同五行次級宮位",
    勝氣: "土（雨化）", 復氣: "木（風化）", 受邪本藏: "腎（兼及膀胱）",
    運氣配穴參照: Object.freeze({
      穴位: "申脈（坎一，足太陽膀胱經通陽蹻脈）",
      傳統補瀉參考: "傳統運氣配穴多云補壬水以助腎防土乘克（屬後世運氣配穴延伸，非靈龜八法本義；具體操作需結合病人虛實寒熱辨證，不可盲目套用）"
    })
  }),
  "癸": Object.freeze({
    歲運: "少徵（火運不及）",
    邪氣化度: "寒化雨化勝復同，所謂邪氣化日／度也",
    災宮數: 9,
    災宮來源: "《素問·六元正紀大論》原文「災九宮」",
    次級波及宮: Object.freeze([]),
    次級波及來源: "離九為唯一正南火位，無其他同五行次級宮位",
    勝氣: "水（寒化）", 復氣: "土（雨化）", 受邪本藏: "心（兼及小腸、心包）",
    運氣配穴參照: Object.freeze({
      穴位: "列缺（離九，手太陰肺經通任脈）",
      傳統補瀉參考: "傳統運氣配穴多云宣調肺金以防火不及失制而金亢（屬後世運氣配穴延伸，非靈龜八法本義；具體操作需結合病人虛實寒熱辨證，不可盲目套用）"
    })
  })
});

const YANG_STEM_EXCESS_MAP = Object.freeze({
  "甲": Object.freeze({
    歲運: "太宮（土運太過）",
    化度: "正化日／度也（《六元正紀大論》原文無災宮）",
    所勝受乘宮: Object.freeze([1]),
    所勝受邪藏: "腎水（坎一宮）",
    條件復氣本宮: Object.freeze([5, 2, 4, 6, 8]),
    條件復氣預警: "【或然候選】若歲土太過而恃強失德、乘危而行，則恐招木氣（風化）來復而反及中五宮（其眚四維：兼波及坤二、巽四、乾六、艮八宮）。"
  }),
  "丙": Object.freeze({
    歲運: "太羽（水運太過）",
    化度: "正化日／度也（《六元正紀大論》原文無災宮）",
    所勝受乘宮: Object.freeze([9]),
    所勝受邪藏: "心火（離九宮）",
    條件復氣本宮: Object.freeze([1]),
    條件復氣預警: "【或然候選】若歲水太過而恃強失德、乘危而行，則恐招土氣（雨化）來復而反及坎一宮。"
  }),
  "戊": Object.freeze({
    歲運: "太徵（火運太過）",
    化度: "正化日／度也（《六元正紀大論》原文無災宮）",
    所勝受乘宮: Object.freeze([7, 6]),
    所勝受邪藏: "肺金（主位兌七宮，兼及同五行乾六宮）",
    條件復氣本宮: Object.freeze([9]),
    條件復氣預警: "【或然候選】若歲火太過而恃強失德、乘危而行，則恐招水氣（寒化）來復而反及離九宮。"
  }),
  "庚": Object.freeze({
    歲運: "太商（金運太過）",
    化度: "正化日／度也（《六元正紀大論》原文無災宮）",
    所勝受乘宮: Object.freeze([3, 4]),
    所勝受邪藏: "肝木（主位震三宮，兼及同五行巽四宮）",
    條件復氣本宮: Object.freeze([7, 6]),
    條件復氣預警: "【或然候選】若歲金太過而恃強失德、乘危而行，則恐招火氣（熱化）來復而反及兌七宮（兼及同五行乾六宮）。"
  }),
  "壬": Object.freeze({
    歲運: "太角（木運太過）",
    化度: "正化日／度也（《六元正紀大論》原文無災宮）",
    // 註：《五常政大論》發生之紀（壬木太過）本身原文為「其眚東」（對應條件復氣本宮震三）；
    // 此處「所勝受乘宮」係因木太過乘土，土受邪時按土之眚位特性（參照敦阜、卑監之紀「其眚四維」）擴展至中五與四隅宮。
    所勝受乘宮: Object.freeze([5, 2, 4, 6, 8]),
    所勝受邪藏: "脾土（主位中五宮，並依土受邪『其眚四維』特性波及坤二、巽四、乾六、艮八宮）",
    條件復氣本宮: Object.freeze([3, 4]),
    條件復氣預警: "【或然候選】若歲木太過而恃強失德、乘危而行，則恐招金氣（清化）來復而反及震三宮（其眚東，兼及同五行巽四宮）。"
  })
});

/**
 * 對接現有系統 calcThreeEras 回傳之 eras 物件與 homo 同氣格局物件
 * 🔴 F-02 & F-03 修正：在 !eras 與 eras 非空兩個入口皆對陰干年與陽干年的高階格局（太乙天符/天符/同天符）作完整對稱提示
 */
function evaluatePingQiForZaiGong(eras, isYinYear, zaiGongNum, homo = null) {
  const hasHighTierHomo = Boolean(homo && (homo.isTaiYi || homo.isTianFu || homo.isTongTianFu));
  const homoTag = hasHighTierHomo
    ? (homo.isTaiYi ? "太乙天符" : homo.isTianFu ? "天符" : "同天符")
    : null;

  // 🔴 F-03 修正：!eras 時，陰干年與陽干年對稱檢查高階格局
  if (!eras) {
    if (hasHighTierHomo) {
      if (isYinYear) {
        return `⚠️ 本年為歲運不及兼「${homoTag}」高階同氣偏勝格局；「災${zaiGongNum}宮」維持原典警示，應按「不及本氣 + 高階同氣」雙重結構審視其偏勝與勝復之勢（平氣裁定資料未提供，無法進一步連動）。`;
      }
      return `⚠️ 本年為歲運太過兼「${homoTag}」高階同氣格局，偏勝之勢疊加；依《五常政大論》審察是否具『恃強失德』之候（Provisional 候選狀態）。`;
    }
    return isYinYear
      ? "本年為典型歲運不及之年，依《六元正紀大論》原典推演災宮與勝復。"
      : "依《五常政大論》審察是否具『恃強失德』之候（Provisional 候選狀態）。";
  }

  // 防禦檢查：若傳入非 null 的空物件 {}（不含 isTruePingQi 欄位）
  if (typeof eras !== "object" || !("isTruePingQi" in eras)) {
    return "⚠️ 平氣裁定資料結構不完整（缺 isTruePingQi 欄位），無法執行災宮平氣連動；請以主系統 calcThreeEras 結果為準。";
  }

  const isPseudoUnresolved = Boolean(eras.isPseudoPingQi && !eras.dynamicOverridesPseudo);
  const isMitigatedPingQi = Boolean(eras.isTruePingQi || eras.isSecondaryPingQi);

  if (isYinYear) {
    if (isPseudoUnresolved) {
      return `⚠️ 本年雖見於平氣討論（屬「偽平氣」：本氣被奪／兼化），然非得歲氣相助之正平氣，故「災${zaiGongNum}宮」維持原典警示，不按得助減輕處理。`;
    }
    if (eras.dynamicPingQiBlockedByHighTier) {
      const blockedList = HIGH_TIER_BLOCKED_LIST.join("、");
      return `⚠️ 本年雖具干德符條件，然因命中太乙天符／天符等高階同氣偏勝格局（${blockedList}），依高階格局保護規則未改判平氣；「災${zaiGongNum}宮」維持原典警示，且應另按高階格局審視其偏勝之勢。`;
    }
    // 🔴 F-02 修正：eras 非空且未觸發干德符時，若陰干年命中太乙天符／天符（如乙酉、己丑、己未、丁亥），優先提示高階同氣偏勝雙重結構
    if (homo && (homo.isTaiYi || homo.isTianFu || homo.isTongTianFu)) {
      const yinHomoTag = homo.isTaiYi ? "太乙天符" : homo.isTianFu ? "天符" : "同天符";
      return `⚠️ 本年為歲運不及兼「${yinHomoTag}」高階同氣偏勝格局；依高階格局保護規則，「災${zaiGongNum}宮」維持原典警示，並應按「不及本氣 + 高階同氣」雙重結構審視其偏勝與勝復之勢。`;
    }
    if (isMitigatedPingQi) {
      let tierTag = "次平氣";
      if (eras.isTruePingQi) {
        if (eras.dynamicOverridesPseudo) {
          tierTag = "干德符覆核平氣";
        } else if (eras.pingQiSource === "動態干德符") {
          tierTag = "干德符動態平氣";
        } else {
          tierTag = "正平氣";
        }
      }
      return `ℹ️ 本年雖載「災${zaiGongNum}宮」，然得歲氣相助（${tierTag}），氣化趨平，勝復與災變程度較一般不及年減輕。`;
    }
    return "本年為典型歲運不及之年，依《六元正紀大論》原典推演災宮與勝復。";
  } else {
    if (isMitigatedPingQi) {
      const tierTag = eras.isTruePingQi ? "正平氣" : "次平氣";
      return `ℹ️ 本年得司天抑之而成${tierTag}，太過乘制之勢得以緩和。`;
    }
    if (hasHighTierHomo) {
      return `⚠️ 本年為歲運太過兼「${homoTag}」高階同氣格局，偏勝之勢疊加；依《五常政大論》審察是否具『恃強失德』之候（Provisional 候選狀態）。`;
    }
    return "依《五常政大論》審察是否具『恃強失德』之候（Provisional 候選狀態）。";
  }
}

/**
 * 【第一、二階段】計算流年運氣災宮與平氣/偽平氣/同氣高階格局連動
 * 🟡 F-05 修正：將 ganzhi 正規化為 normalizedGanzhi 後回傳
 */
function computeYearZaiGongInfo(ganzhi, eras = null, homo = null) {
  if (typeof ganzhi !== "string" || ganzhi.trim().length === 0) {
    throw new TypeError("computeYearZaiGongInfo: ganzhi 必須為非空字串");
  }
  const normalizedGanzhi = ganzhi.trim();
  if (normalizedGanzhi.length !== 2) {
    throw new RangeError("computeYearZaiGongInfo: 干支必須恰為兩字");
  }
  const stem = normalizedGanzhi.charAt(0);
  const branch = normalizedGanzhi.charAt(1);
  const stemIndex = GAN_LIST.indexOf(stem);
  const branchIndex = ZHI_LIST.indexOf(branch);
  if (stemIndex < 0) {
    throw new RangeError(`computeYearZaiGongInfo: 無效的天干字元 "${stem}"`);
  }
  if (branchIndex < 0) {
    throw new RangeError(`computeYearZaiGongInfo: 無效的地支字元 "${branch}"`);
  }
  if ((stemIndex % 2) !== (branchIndex % 2)) {
    throw new RangeError(`computeYearZaiGongInfo: 非六十甲子中的有效干支組合 "${normalizedGanzhi}"`);
  }
  const isYin = Object.prototype.hasOwnProperty.call(YIN_STEM_ZAIGONG_MAP, stem);
  const isYang = Object.prototype.hasOwnProperty.call(YANG_STEM_EXCESS_MAP, stem);

  if (!isYin && !isYang) {
    throw new RangeError(`computeYearZaiGongInfo: 無效的天干字元 "${stem}"`);
  }

  if (isYin) {
    const info = YIN_STEM_ZAIGONG_MAP[stem];
    return {
      干支: normalizedGanzhi,
      陰陽屬性: "陰干（歲運不及）",
      歲運: info.歲運,
      原典記載: `${info.邪氣化度}，災${info.災宮數}宮。`,
      災宮數: info.災宮數,
      災宮來源: info.災宮來源,
      災宮詳情: LUOSHU_PALACE_META[info.災宮數],
      次級波及宮數: info.次級波及宮,
      次級波及來源: info.次級波及來源,
      次級波及宮詳情: info.次級波及宮.map(n => LUOSHU_PALACE_META[n]),
      勝復氣化: `勝氣為${info.勝氣}，復氣為${info.復氣}，主要受邪本藏：${info.受邪本藏}`,
      所勝受乘宮數: [],
      所勝受乘詳情: [],
      所勝受邪藏: null,
      條件復氣本宮數: [],
      條件復氣本宮詳情: [],
      條件復氣預警: null,
      平氣連動裁定: evaluatePingQiForZaiGong(eras, true, info.災宮數, homo),
      運氣配穴延伸參照: info.運氣配穴參照
    };
  } else {
    const info = YANG_STEM_EXCESS_MAP[stem];
    return {
      干支: normalizedGanzhi,
      陰陽屬性: "陽干（歲運太過）",
      歲運: info.歲運,
      原典記載: info.化度,
      災宮數: null,
      災宮來源: "陽干太過年《六元正紀大論》原文無災宮記載",
      災宮詳情: null,
      次級波及宮數: [],
      次級波及來源: null,
      次級波及宮詳情: [],
      勝復氣化: null,
      所勝受乘宮數: info.所勝受乘宮,
      所勝受乘詳情: info.所勝受乘宮.map(n => LUOSHU_PALACE_META[n]),
      所勝受邪藏: info.所勝受邪藏,
      條件復氣本宮數: info.條件復氣本宮,
      條件復氣本宮詳情: info.條件復氣本宮.map(n => LUOSHU_PALACE_META[n]),
      條件復氣預警: info.條件復氣預警,
      平氣連動裁定: evaluatePingQiForZaiGong(eras, false, info.條件復氣本宮[0], homo),
      運氣配穴延伸參照: null
    };
  }
}

const LINGGUI_DAY_STEM_NUM = Object.freeze({ "甲": 10, "己": 10, "乙": 9, "庚": 9, "丁": 8, "壬": 8, "丙": 7, "辛": 7, "戊": 7, "癸": 7 });
const LINGGUI_DAY_BRANCH_NUM = Object.freeze({ "辰": 10, "戌": 10, "丑": 10, "未": 10, "申": 9, "酉": 9, "寅": 8, "卯": 8, "巳": 7, "午": 7, "亥": 7, "子": 7 });
const LINGGUI_HOUR_STEM_NUM = Object.freeze({ "甲": 9, "己": 9, "乙": 8, "庚": 8, "丙": 7, "辛": 7, "丁": 6, "壬": 6, "戊": 5, "癸": 5 });
const LINGGUI_HOUR_BRANCH_NUM = Object.freeze({ "子": 9, "午": 9, "丑": 8, "未": 8, "寅": 7, "申": 7, "卯": 6, "酉": 6, "辰": 5, "戌": 5, "巳": 4, "亥": 4 });

const LINGGUI_YIN_YANG_RULE_NOTE =
  "陽日除九（餘數 1～9，整除作 9），可開出全部八穴（中五寄於坤二或艮八，故八穴分佈九宮）；陰日除六（餘數 1～6，整除作 6），故陰日開穴僅在坎一、坤二、震三、巽四、中五、乾六（1～6 宮）中循環，兌七後谿、艮八內關、離九列缺（7～9 宮）僅於陽日出現。";

/**
 * 奇經納卦八穴對照表
 * 🟡 F-04 修正：明確中五「無本穴所屬經脈／無本穴所通奇經」
 */
const LINGGUI_ACUPOINT_MAP = Object.freeze({
  1: Object.freeze({ 卦宮: "坎一", 開穴: "申脈", 所屬經脈: "足太陽膀胱經", 通奇經: "陽蹻脈", 偶穴配對: "後谿（督脈）", 循行交會部位: "目內眥、頸項、耳、肩胛" }),
  2: Object.freeze({ 卦宮: "坤二", 開穴: "照海", 所屬經脈: "足少陰腎經", 通奇經: "陰蹻脈", 偶穴配對: "列缺（任脈）", 循行交會部位: "咽喉、胸膈、肺系" }),
  3: Object.freeze({ 卦宮: "震三", 開穴: "外關", 所屬經脈: "手少陽三焦經", 通奇經: "陽維脈", 偶穴配對: "足臨泣（帶脈）", 循行交會部位: "耳後、肩、頰、目銳眥" }),
  4: Object.freeze({ 卦宮: "巽四", 開穴: "足臨泣", 所屬經脈: "足少陽膽經", 通奇經: "帶脈", 偶穴配對: "外關（陽維脈）", 循行交會部位: "目銳眥、耳後、頰、頸肩" }),
  5: Object.freeze({
    卦宮: "中五（寄宮）",
    開穴: "無本穴（通行法寄坤二取照海）",
    所屬經脈: "無本穴所屬經脈（通行法取坤二照海，屬足少陰腎經）",
    通奇經: "無本穴所通奇經（通行法取坤二照海，通陰蹻脈）",
    偶穴配對: "取坤二照海時（通行法／古法女），偶穴列缺；取艮八內關時（古法男），偶穴公孫；取乾六公孫時（參照脾本經），偶穴內關",
    偶穴配對分支: Object.freeze([
      Object.freeze({ 適用流派: "通行法／古法女寄坤二", 取穴: "坤二照海", 偶穴: "列缺（任脈）" }),
      Object.freeze({ 適用流派: "古法男寄艮八", 取穴: "艮八內關", 偶穴: "公孫（衝脈）" }),
      Object.freeze({ 適用流派: "脾土本經交會參照", 取穴: "乾六公孫", 偶穴: "內關（陰維脈）" })
    ]),
    循行交會部位: "依所取寄穴而定：照海（咽喉胸膈肺系）／內關（心胸胃脘）／公孫（胃心胸脘）",
    流派並列參照: "① 通行法：坤二五照海（偶穴列缺，據《針灸大成》）；② 古法男女寄穴（流派說法）：男寄艮八內關（偶穴公孫）、女寄坤二照海（偶穴列缺）；③ 脾土本經交會參照：乾六公孫（足太陰脾經通衝脈，偶穴內關）。"
  }),
  6: Object.freeze({ 卦宮: "乾六", 開穴: "公孫", 所屬經脈: "足太陰脾經", 通奇經: "衝脈", 偶穴配對: "內關（陰維脈）", 循行交會部位: "胃、心、胸脘" }),
  7: Object.freeze({ 卦宮: "兌七", 開穴: "後谿", 所屬經脈: "手太陽小腸經", 通奇經: "督脈", 偶穴配對: "申脈（陽蹻脈）", 循行交會部位: "目內眥、頸項、耳、肩背" }),
  8: Object.freeze({ 卦宮: "艮八", 開穴: "內關", 所屬經脈: "手厥陰心包經", 通奇經: "陰維脈", 偶穴配對: "公孫（衝脈）", 循行交會部位: "心、胸、胃脘" }),
  9: Object.freeze({ 卦宮: "離九", 開穴: "列缺", 所屬經脈: "手太陰肺經", 通奇經: "任脈", 偶穴配對: "照海（陰蹻脈）", 循行交會部位: "胸、肺、膈、喉嚨" })
});

const ANCIENT_8JIE_RANGES = Object.freeze([
  Object.freeze({ start: 1,   end: 46,  palace: 1, label: "葉蟄之宮（46日）" }),
  Object.freeze({ start: 47,  end: 92,  palace: 8, label: "天留之宮（46日）" }),
  Object.freeze({ start: 93,  end: 138, palace: 3, label: "倉門之宮（46日）" }),
  Object.freeze({ start: 139, end: 183, palace: 4, label: "陰洛之宮（45日・注家稱天門）" }),
  Object.freeze({ start: 184, end: 229, palace: 9, label: "上天之宮（46日）" }),
  Object.freeze({ start: 230, end: 275, palace: 2, label: "玄委之宮（46日）" }),
  Object.freeze({ start: 276, end: 321, palace: 7, label: "倉果之宮（46日）" }),
  Object.freeze({ start: 322, end: 366, palace: 6, label: "新洛之宮（45日・注家稱地戶）" })
]);

function getPalaceFromSolarLongitude(lambdaDeg) {
  if (typeof lambdaDeg !== "number" || !Number.isFinite(lambdaDeg)) {
    throw new TypeError("getPalaceFromSolarLongitude: lambdaDeg 必須為有限數字");
  }
  const norm = ((lambdaDeg % 360) + 360) % 360;
  if (norm >= 270 && norm < 315) return 1;
  if (norm >= 315 && norm < 360) return 8;
  if (norm >= 0   && norm < 45)  return 3;
  if (norm >= 45  && norm < 90)  return 4;
  if (norm >= 90  && norm < 135) return 9;
  if (norm >= 135 && norm < 180) return 2;
  if (norm >= 180 && norm < 225) return 7;
  return 6;
}

function computeTaiyiThreeTracks(daysSinceWinterSolstice, solarLongitudeDeg) {
  if (typeof daysSinceWinterSolstice !== "number" || !Number.isFinite(daysSinceWinterSolstice) || daysSinceWinterSolstice < 0) {
    throw new RangeError("computeTaiyiThreeTracks: daysSinceWinterSolstice 必須為非負有限數字（冬至當日 = 0）");
  }
  if (typeof solarLongitudeDeg !== "number" || !Number.isFinite(solarLongitudeDeg)) {
    throw new TypeError("computeTaiyiThreeTracks: solarLongitudeDeg 必須為有限數字");
  }

  const diffDays = Math.floor(daysSinceWinterSolstice);
  const N = diffDays + 1;
  const normalizedLambda = ((solarLongitudeDeg % 360) + 360) % 360;

  const astroPalaceNum = getPalaceFromSolarLongitude(normalizedLambda);

  const cappedN = ((N - 1) % 366) + 1;
  const ancientMatch = ANCIENT_8JIE_RANGES.find(r => cappedN >= r.start && cappedN <= r.end) || ANCIENT_8JIE_RANGES[7];
  const dayInAncientPalace = cappedN - ancientMatch.start + 1;
  const ancientPalaceSpan = ancientMatch.end - ancientMatch.start + 1;

  const dailyPalaceNum = ((cappedN - 1) % 9) + 1;

  const tracksDiffer = astroPalaceNum !== ancientMatch.palace;
  const isExactBoundaryDay = dayInAncientPalace === 1 || dayInAncientPalace === ancientPalaceSpan;
  const isNearTransitionWindow = dayInAncientPalace <= 2 || dayInAncientPalace >= ancientPalaceSpan - 1;

  const notes = [];
  if (tracksDiffer) {
    notes.push(
      `⚠️ 【雙軌分歧】本日天文黃經定氣宮位（${LUOSHU_PALACE_META[astroPalaceNum].宮名}）與古法 46/45 日歲遊宮位（${LUOSHU_PALACE_META[ancientMatch.palace].宮名}）不一致，處於曆法與定氣交節過渡區；臨床應以實測風向與病人證候為主要判讀依據，不單憑任一軌。`
    );
  }
  if (isNearTransitionWindow) {
    notes.push(
      `ℹ️ 【移宮交界期】本日為古法${ancientMatch.label}第 ${dayInAncientPalace} 日（共 ${ancientPalaceSpan} 日），《靈樞·九宮八風》云：「太一移日，天必應之以風雨，以其日風雨則吉，歲美民安少病矣；先之則多雨，後之則多旱」，宜留意交節前後氣候與風向變化。`
    );
  }

  return {
    距冬至天數差: diffDays,
    冬至起算第N日: N,
    週期內積日cappedN: cappedN,
    軌道1_天文黃經定氣: {
      軌道標籤: "天文黃經（定氣八節）",
      黃經度數: normalizedLambda,
      所居宮數: astroPalaceNum,
      宮位詳情: LUOSHU_PALACE_META[astroPalaceNum]
    },
    軌道2_古法八節歲遊: {
      軌道標籤: "八節移宮（古法 46/45 日歲遊）",
      所居宮數: ancientMatch.palace,
      居宮日數: `居${ancientMatch.label}第 ${dayInAncientPalace} 日`,
      是否移日: dayInAncientPalace === 1,
      宮位詳情: LUOSHU_PALACE_META[ancientMatch.palace]
    },
    軌道3_太一日遊: {
      軌道標籤: "太一日遊（九日循環：數所在，日從一處，至九日復反於一）",
      所居宮數: dailyPalaceNum,
      是否入中宮招搖: dailyPalaceNum === 5,
      宮位詳情: LUOSHU_PALACE_META[dailyPalaceNum]
    },
    軌道分歧偵測: {
      天文與古法宮位是否一致: !tracksDiffer,
      是否雙軌分歧: tracksDiffer,
      是否為古法移宮首尾日: isExactBoundaryDay,
      是否處於古法移宮交界期: isNearTransitionWindow,
      交界提示列表: notes,
      交界提示: notes.length > 0 ? notes.join(" ") : null
    }
  };
}

function computeLingguiBafaForDate(date, sexagenaryDayFn, hourGanFn) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new TypeError("computeLingguiBafaForDate: date 必須為有效 Date");
  }
  if (typeof sexagenaryDayFn !== "function") {
    throw new TypeError("computeLingguiBafaForDate: sexagenaryDayFn 必須為函式");
  }
  const dayObj = sexagenaryDayFn(date);
  if (!dayObj || !Number.isInteger(dayObj.index) || dayObj.index < 0 || dayObj.index > 59) {
    throw new TypeError("computeLingguiBafaForDate: sexagenaryDayFn 必須返回含有效 index (0–59) 的物件");
  }

  const dayIdx = dayObj.index;
  const computedGan = GAN_LIST[dayIdx % 10];
  const computedZhi = ZHI_LIST[dayIdx % 12];

  if (dayObj.stem && dayObj.stem !== computedGan) {
    throw new Error(`computeLingguiBafaForDate: dayObj.stem (${dayObj.stem}) 與 index (${dayIdx}) 推算之天干 (${computedGan}) 不符`);
  }
  if (dayObj.branch && dayObj.branch !== computedZhi) {
    throw new Error(`computeLingguiBafaForDate: dayObj.branch (${dayObj.branch}) 與 index (${dayIdx}) 推算之地支 (${computedZhi}) 不符`);
  }

  const dayGan = dayObj.stem || computedGan;
  const dayZhi = dayObj.branch || computedZhi;
  const isYangDay = YANG_GAN_SET.has(dayGan);

  const dGanNum = LINGGUI_DAY_STEM_NUM[dayGan];
  const dZhiNum = LINGGUI_DAY_BRANCH_NUM[dayZhi];

  const hourlySchedule = ZHI_LIST.map((hZhi, branchIdx) => {
    const hGan = typeof hourGanFn === "function"
      ? hourGanFn(dayGan, hZhi)
      : GAN_LIST[((GAN_LIST.indexOf(dayGan) % 5) * 2 + branchIdx) % 10];
    if (!Object.prototype.hasOwnProperty.call(LINGGUI_HOUR_STEM_NUM, hGan)) {
      throw new RangeError(`computeLingguiBafaForDate: hourGanFn 返回無效天干 "${String(hGan)}"`);
    }
    const hGanNum = LINGGUI_HOUR_STEM_NUM[hGan];
    const hZhiNum = LINGGUI_HOUR_BRANCH_NUM[hZhi];
    if (!Number.isFinite(dGanNum) || !Number.isFinite(dZhiNum) || !Number.isFinite(hGanNum) || !Number.isFinite(hZhiNum)) {
      throw new RangeError("computeLingguiBafaForDate: 天干地支數值表缺少有效映射");
    }
    const sumS = dGanNum + dZhiNum + hGanNum + hZhiNum;

    const openNum = isYangDay ? ((sumS - 1) % 9) + 1 : ((sumS - 1) % 6) + 1;
    const rawRemainder = isYangDay ? (sumS % 9) : (sumS % 6);
    const zeroRemainderNote = rawRemainder === 0
      ? (isYangDay ? "整除餘 0，依『陽日除九，不及零餘穴下推』作 9" : "整除餘 0，依『陰日除六，不及零餘穴下推』作 6")
      : null;

    return {
      時辰干支: `${hGan}${hZhi}時`,
      四數代數式: `${dayGan}(${dGanNum}) + ${dayZhi}(${dZhiNum}) + ${hGan}(${hGanNum}) + ${hZhi}(${hZhiNum}) = ${sumS}`,
      除數規則: isYangDay ? "陽日除九" : "陰日除六",
      原始餘數: rawRemainder,
      餘零說明: zeroRemainderNote,
      開穴宮數: openNum,
      開穴詳情: LINGGUI_ACUPOINT_MAP[openNum]
    };
  });

  return {
    觀測日干支: `${dayGan}${dayZhi}日`,
    日干陰陽: isYangDay ? "陽干日（除九，餘零作九）" : "陰干日（除六，餘零作六）",
    陰陽日開穴範圍說明: LINGGUI_YIN_YANG_RULE_NOTE,
    日干支代數: `${dayGan}=${dGanNum}, ${dayZhi}=${dZhiNum}`,
    十二時辰開穴表: hourlySchedule
  };
}

// ============================================================================
// PART 2: 全量自動化驗證套件（60甲子 + 366日邊界 + 720時辰 + 防禦拋錯）
// ============================================================================

function runAllTests() {
  console.log("=== 開始執行 WYLQ-Audit v3.33.0 九宮八風與靈龜八法自動化測試 ===");

  // 1. 驗證 60 甲子全表 computeYearZaiGongInfo 對稱性與己年四維
  const expectedYinZai = { "乙": 7, "丁": 3, "己": 5, "辛": 1, "癸": 9 };
  for (let i = 0; i < 60; i++) {
    const gz = GAN_LIST[i % 10] + ZHI_LIST[i % 12];
    const res = computeYearZaiGongInfo(`  ${gz}  `); // 測試 F-05 trim()
    assert.strictEqual(res.干支, gz, "干支應自動 trim 正規化");

    const stem = gz.charAt(0);
    if (stem in expectedYinZai) {
      assert.strictEqual(res.災宮數, expectedYinZai[stem]);
      assert.deepStrictEqual(res.所勝受乘宮數, []);
      if (stem === "己") {
        assert.deepStrictEqual(res.次級波及宮數, [2, 4, 6, 8], "己年次級波及宮必須為四維 [2,4,6,8]");
      }
    } else {
      assert.strictEqual(res.災宮數, null);
      assert.deepStrictEqual(res.次級波及宮數, []);
      assert.ok(res.所勝受乘宮數.length >= 1);
      assert.ok(res.條件復氣本宮數.length >= 1);
      assert.strictEqual(res.運氣配穴延伸參照, null);
    }
  }
  console.log("✅ [PASS] 測試 1：60 甲子全表陰陽干結構對稱、trim 正規化與己年四維 [2,4,6,8] 驗證通過");

  // 2. 驗證平氣、偽平氣、干德符與高階同氣格局（含第 8、9 輪雙入口陰干高階格局補漏）
  const highTierYinCases = [
    ["乙酉", { isTaiYi: true }, "太乙天符"],
    ["己丑", { isTaiYi: true }, "太乙天符"],
    ["己未", { isTaiYi: true }, "太乙天符"],
    ["丁亥", { isTianFu: true }, "天符"]
  ];
  for (const [gz, homo, expectedTag] of highTierYinCases) {
    const noErasResult = computeYearZaiGongInfo(gz, null, homo);
    assert.ok(noErasResult.平氣連動裁定.includes(expectedTag), `!eras 時 ${gz} 應提示 ${expectedTag}`);
    const withErasResult = computeYearZaiGongInfo(gz, { isTruePingQi: false, isSecondaryPingQi: false, isPseudoPingQi: false }, homo);
    assert.ok(withErasResult.平氣連動裁定.includes(expectedTag), `eras 非空且無干德符時，${gz} 應提示 ${expectedTag}`);
  }

  const yinTongTianFu = computeYearZaiGongInfo(
    "丁卯",
    { isTruePingQi: false, isSecondaryPingQi: false, isPseudoPingQi: false },
    { isTongTianFu: true }
  );
  assert.ok(yinTongTianFu.平氣連動裁定.includes("同天符"), "eras 非空時陰干分支也必須完整處理 isTongTianFu 標記");

  const yiYouBlocked = computeYearZaiGongInfo("乙酉", { isTruePingQi: false, dynamicPingQiBlockedByHighTier: true }, { isTaiYi: true });
  assert.ok(yiYouBlocked.平氣連動裁定.includes("乙酉、己丑、己未、丁亥"), "干德符被高階格局攔截時應列出攔截清單");

  const wuWuTaiYi = computeYearZaiGongInfo("戊午", { isTruePingQi: false }, { isTaiYi: true });
  assert.ok(wuWuTaiYi.平氣連動裁定.includes("太乙天符"), "陽干戊午應提示太過兼太乙天符");

  const dingMaoTruePing = computeYearZaiGongInfo("丁卯", { isTruePingQi: true, pingQiSource: "正平氣" }, null);
  assert.ok(dingMaoTruePing.平氣連動裁定.includes("正平氣"), "丁卯應提示正平氣減輕");

  const jiSiPseudo = computeYearZaiGongInfo("己巳", { isTruePingQi: false, isPseudoPingQi: true, dynamicOverridesPseudo: false }, null);
  assert.ok(jiSiPseudo.平氣連動裁定.includes("偽平氣") && jiSiPseudo.平氣連動裁定.includes("不按得助減輕"), "己巳偽平氣不應減輕");

  const emptyEras = computeYearZaiGongInfo("乙丑", {});
  assert.ok(emptyEras.平氣連動裁定.includes("資料結構不完整"), "傳入空物件 {} 應提示資料不完整");
  console.log("✅ [PASS] 測試 2：平氣／偽平氣／干德符／陰陽干太乙天符雙入口（F-02 & F-03）驗證通過");

  // 3. 驗證太一遊宮 0..366 日邊界、跨年 cappedN 同步與雙軌分歧偵測
  const d0 = computeTaiyiThreeTracks(0, 270.0);
  const d366 = computeTaiyiThreeTracks(366, 270.0);
  assert.strictEqual(d0.軌道2_古法八節歲遊.所居宮數, 1);
  assert.strictEqual(d0.軌道3_太一日遊.所居宮數, 1);
  assert.strictEqual(d366.軌道2_古法八節歲遊.所居宮數, d0.軌道2_古法八節歲遊.所居宮數, "跨年 366 日歲遊應與 0 日一致");
  assert.strictEqual(d366.軌道3_太一日遊.所居宮數, d0.軌道3_太一日遊.所居宮數, "跨年 366 日日遊應與 0 日一致（cappedN 同步）");
  const astroPalaces = new Set(), ancientPalaces = new Set(), dailyPalaces = new Set();
  for (let day = 0; day <= 366; day++) {
    const longitude = ((270 + (day * 360 / 366)) % 360);
    const result = computeTaiyiThreeTracks(day, longitude);
    assert.strictEqual(result.週期內積日cappedN, (day % 366) + 1, `day=${day} cappedN`);
    for (const palace of [result.軌道1_天文黃經定氣.所居宮數, result.軌道2_古法八節歲遊.所居宮數, result.軌道3_太一日遊.所居宮數]) {
      assert.ok(Number.isInteger(palace) && palace >= 1 && palace <= 9, `day=${day} must map to palace 1..9`);
    }
    astroPalaces.add(result.軌道1_天文黃經定氣.所居宮數);
    ancientPalaces.add(result.軌道2_古法八節歲遊.所居宮數);
    dailyPalaces.add(result.軌道3_太一日遊.所居宮數);
  }
  assert.strictEqual(astroPalaces.size, 8, "黃經軌道全年應涵蓋八個方位宮，不含中五");
  assert.deepStrictEqual([...ancientPalaces].sort((a,b)=>a-b), [1,2,3,4,6,7,8,9]);
  assert.strictEqual(dailyPalaces.size, 9, "太一日遊 366 日循環應涵蓋九宮");
  assert.ok(d0.軌道分歧偵測.交界提示.includes("後之則多旱"), "《靈樞》引文必須為『後之則多旱』");

  const d46Differ = computeTaiyiThreeTracks(46, 314.5); // N=47 古法入天留(8)，但黃經 314.5 仍在葉蟄(1)
  assert.strictEqual(d46Differ.軌道分歧偵測.是否雙軌分歧, true);
  assert.strictEqual(d46Differ.軌道分歧偵測.是否為古法移宮首尾日, true);
  assert.strictEqual(d46Differ.軌道分歧偵測.交界提示列表.length, 2, "同日發生雙軌分歧與移宮交界時，兩則提示皆須保留");
  console.log("✅ [PASS] 測試 3：太一三軌 0..366 全日循環、跨年 cappedN 同步、雙軌分歧與『後之則多旱』引文驗證通過");

  // 4. 驗證 60 日 × 12 時辰 = 720 組靈龜八法開穴與經典算例
  for (let d = 0; d < 60; d++) {
    const mockSexagenaryFn = () => ({ index: d, stem: GAN_LIST[d % 10], branch: ZHI_LIST[d % 12] });
    const table = computeLingguiBafaForDate(new Date(), mockSexagenaryFn);
    assert.strictEqual(table.十二時辰開穴表.length, 12);
    const isYang = (d % 10) % 2 === 0;
    for (const slot of table.十二時辰開穴表) {
      if (isYang) {
        assert.ok(slot.開穴宮數 >= 1 && slot.開穴宮數 <= 9);
      } else {
        assert.ok(slot.開穴宮數 >= 1 && slot.開穴宮數 <= 6, "陰日除六開穴必在 1..6 之間");
      }
    }
    // 經典算例 1：甲子日 (d=0) 丙寅時 (branchIdx=2) -> 10+7+7+7=31, 31%9=4 (足臨泣)
    if (d === 0) {
      assert.strictEqual(table.十二時辰開穴表[2].開穴宮數, 4);
      assert.strictEqual(table.十二時辰開穴表[2].開穴詳情.開穴, "足臨泣");
    }
    // 經典算例 2（勘誤驗證）：乙丑日 (d=1) 癸未時 (branchIdx=7) -> 9+10+5+8=32, 32%6=2 (照海)
    // 經典算例 3：乙丑日 (d=1) 辛巳時 (branchIdx=5) -> 9+10+7+4=30, 30%6=0 作 6 (公孫)
    if (d === 1) {
      assert.strictEqual(table.十二時辰開穴表[7].開穴宮數, 2);
      assert.strictEqual(table.十二時辰開穴表[5].開穴宮數, 6);
      assert.ok(table.十二時辰開穴表[5].餘零說明.includes("作 6"));
    }
  }
  console.log("✅ [PASS] 測試 4：60 日 × 12 時辰（720 組）靈龜八法全表與經典算例驗證通過");

  // 5. 驗證防禦性邊界拋錯（NaN、負數、非法輸入）
  assert.throws(() => getPalaceFromSolarLongitude(NaN), TypeError);
  assert.throws(() => computeTaiyiThreeTracks(-1, 270), RangeError);
  assert.throws(() => computeTaiyiThreeTracks(NaN, 270), RangeError);
  assert.throws(() => computeYearZaiGongInfo(""), TypeError);
  assert.throws(() => computeYearZaiGongInfo("甲子乙"), RangeError, "干支長度必須恰為兩字");
  assert.throws(() => computeYearZaiGongInfo("甲丑"), RangeError, "天干地支陰陽配對不合法");
  assert.throws(() => computeYearZaiGongInfo("甲X"), RangeError, "無效地支應被攔截");
  assert.throws(() => computeLingguiBafaForDate(new Date(NaN), () => ({ index: 0 })), TypeError, "無效 Date 應被攔截");
  assert.throws(() => computeLingguiBafaForDate(new Date(), () => ({ index: 0 }), () => "天地"), RangeError, "hourGanFn 應拒絕無效天干");
  assert.throws(() => computeLingguiBafaForDate(new Date(), () => ({ index: 99 })), TypeError);
  console.log("✅ [PASS] 測試 5：防禦性輸入驗證（NaN、負值、空／非法干支、無效日期、越界 index／時干）全部正確攔截");

  console.log("=== 🎉 全部測試套件 100% 通過，模組可正式投入 v3.33.0 實作 ===");
}

if (require.main === module) {
  runAllTests();
}

module.exports = {
  MEDICAL_BOUNDARY_NOTICE,
  LUOSHU_PALACE_META,
  YIN_STEM_ZAIGONG_MAP,
  YANG_STEM_EXCESS_MAP,
  LINGGUI_ACUPOINT_MAP,
  ANCIENT_8JIE_RANGES,
  evaluatePingQiForZaiGong,
  computeYearZaiGongInfo,
  getPalaceFromSolarLongitude,
  computeTaiyiThreeTracks,
  computeLingguiBafaForDate
};
