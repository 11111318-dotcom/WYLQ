/**
 * ============================================================================
 * WYLQ-Audit v3.34.0 - 《素問·六元正紀大論》六十甲子正化度／邪氣化度／正對化／藥食宜模組
 * Review-corrected candidate (保留 v3.34.0 API；修正土數理論措辭與數值對照的來源推論邊界)
 * 檔案名稱：test-liuyuan-zhengji-v3.34-review-corrected.js
 * 執行方式：node test-liuyuan-zhengji-v3.34.js
 * ============================================================================
 */

"use strict";

const assert = require("assert");

const LIUYUAN_MEDICAL_NOTICE =
  "⚠️ 本區「其化上・中・下（所謂藥食宜也）」源自《素問·六元正紀大論》五味寒熱調氣常法，僅供古典運氣理論對照，非臨床處方；實際用藥與食療須由合格中醫師依四診合參決定。";

const FALLBACK_GAN = Object.freeze(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const FALLBACK_ZHI = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);

let GAN_LIST, ZHI_LIST;
try { GAN_LIST = Array.isArray(GAN) ? GAN : FALLBACK_GAN; } catch (_) { GAN_LIST = FALLBACK_GAN; }
try { ZHI_LIST = Array.isArray(ZHI) ? ZHI : FALLBACK_ZHI; } catch (_) { ZHI_LIST = FALLBACK_ZHI; }

const BRANCH_ZHENG_DUI_META = Object.freeze({
  "子": Object.freeze({ 正對屬性: "對化", 司天六氣: "少陰君火", 在泉地支: "卯", 在泉六氣: "陽明燥金", 司天數: 7, 在泉數: 9, 方位月建釋義: "子居正北十一月建，與正南午位君火對沖，故對化於子（從標成數七）" }),
  "丑": Object.freeze({ 正對屬性: "對化", 司天六氣: "太陰濕土", 在泉地支: "辰", 在泉六氣: "太陽寒水", 司天數: 5, 在泉數: 6, 方位月建釋義: "丑居東北十二月建，與西南未宮坤土對沖，故對化於丑（土無成數，太陰土仍取五數，不宜將此五稱為成數）" }),
  "寅": Object.freeze({ 正對屬性: "正化", 司天六氣: "少陽相火", 在泉地支: "亥", 在泉六氣: "厥陰風木", 司天數: 2, 在泉數: 3, 方位月建釋義: "正月建寅孟春木旺，火長生於寅，故少陽相火正化於寅（從本生數二）" }),
  "卯": Object.freeze({ 正對屬性: "對化", 司天六氣: "陽明燥金", 在泉地支: "子", 在泉六氣: "少陰君火", 司天數: 9, 在泉數: 7, 方位月建釋義: "卯居正東仲春二月建，與正西酉位燥金對沖，故對化於卯（從標成數九）" }),
  "辰": Object.freeze({ 正對屬性: "對化", 司天六氣: "太陽寒水", 在泉地支: "丑", 在泉六氣: "太陰濕土", 司天數: 6, 在泉數: 5, 方位月建釋義: "辰為季春三月建，與季秋戌位對沖，故太陽寒水對化於辰（從標成數六）" }),
  "巳": Object.freeze({ 正對屬性: "對化", 司天六氣: "厥陰風木", 在泉地支: "申", 在泉六氣: "少陽相火", 司天數: 8, 在泉數: 7, 方位月建釋義: "巳為孟夏四月建，與孟冬亥位對沖，故對化於巳（從標成數八）" }),
  "午": Object.freeze({ 正對屬性: "正化", 司天六氣: "少陰君火", 在泉地支: "酉", 在泉六氣: "陽明燥金", 司天數: 2, 在泉數: 4, 方位月建釋義: "午居正南離位仲夏五月建，君火尊位正得南方，故正化於午（從本生數二）" }),
  "未": Object.freeze({ 正對屬性: "正化", 司天六氣: "太陰濕土", 在泉地支: "戌", 在泉六氣: "太陽寒水", 司天數: 5, 在泉數: 1, 方位月建釋義: "未居西南坤宮季夏六月建，土旺於長夏未分，故正化於未（從本生數五）" }),
  "申": Object.freeze({ 正對屬性: "對化", 司天六氣: "少陽相火", 在泉地支: "巳", 在泉六氣: "厥陰風木", 司天數: 7, 在泉數: 8, 方位月建釋義: "申為孟秋七月建，與孟春寅位對沖，故對化於申（從標成數七）" }),
  "酉": Object.freeze({ 正對屬性: "正化", 司天六氣: "陽明燥金", 在泉地支: "午", 在泉六氣: "少陰君火", 司天數: 4, 在泉數: 2, 方位月建釋義: "酉居正西兌位仲秋八月建，正得西方金位，故正化於酉（從本生數四）" }),
  "戌": Object.freeze({ 正對屬性: "正化", 司天六氣: "太陽寒水", 在泉地支: "未", 在泉六氣: "太陰濕土", 司天數: 1, 在泉數: 5, 方位月建釋義: "戌居西北九月建，太陽寒水得西北漸旺之鄉，故正化於戌（依《玄珠密語》《類經圖翼》正化理論，從本生數一）" }),
  "亥": Object.freeze({ 正對屬性: "正化", 司天六氣: "厥陰風木", 在泉地支: "寅", 在泉六氣: "少陽相火", 司天數: 3, 在泉數: 2, 方位月建釋義: "亥為孟冬十月建，水生木、木長生於亥，故正化於亥（從本生數三）" })
});

const STEM_YUN_NUMBER_META = Object.freeze({
  "甲": Object.freeze({ 歲運: "太宮土運", 太少: "太過", 五行: "土", 數別: "土例外：土常以生，取數五；不以一般成數十論", 化數: 5 }),
  "乙": Object.freeze({ 歲運: "少商金運", 太少: "不及", 五行: "金", 數別: "生數", 化數: 4 }),
  "丙": Object.freeze({ 歲運: "太羽水運", 太少: "太過", 五行: "水", 數別: "成數", 化數: 6 }),
  "丁": Object.freeze({ 歲運: "少角木運", 太少: "不及", 五行: "木", 數別: "生數", 化數: 3 }),
  "戊": Object.freeze({ 歲運: "太徵火運", 太少: "太過", 五行: "火", 數別: "成數", 化數: 7 }),
  "己": Object.freeze({ 歲運: "少宮土運", 太少: "不及", 五行: "土", 數別: "生數", 化數: 5 }),
  "庚": Object.freeze({ 歲運: "太商金運", 太少: "太過", 五行: "金", 數別: "成數", 化數: 9 }),
  "辛": Object.freeze({ 歲運: "少羽水運", 太少: "不及", 五行: "水", 數別: "生數", 化數: 1 }),
  "壬": Object.freeze({ 歲運: "太角木運", 太少: "太過", 五行: "木", 數別: "成數", 化數: 8 }),
  "癸": Object.freeze({ 歲運: "少徵火運", 太少: "不及", 五行: "火", 數別: "生數", 化數: 2 })
});

const LIUYUAN_30_PAIRS_RAW = Object.freeze([
  Object.freeze({
    pairIndex: 1, years: Object.freeze(["甲子", "甲午"]),
    titleTags: Object.freeze({ "甲子": null, "甲午": null }),
    siTianText: "上少陰火", zhongYunText: "中太宮土運", zaiQuanText: "下陽明金",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "熱化二，雨化五，燥化四，所謂正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "熱化", 數值: 2 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "雨化", 數值: 5 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "燥化", 數值: 4 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上鹹寒，中苦熱，下酸熱，所謂藥食宜也",
    yaoShiYi: Object.freeze({ 上: "鹹寒", 中: "苦熱", 下: "酸熱" })
  }),
  Object.freeze({
    pairIndex: 2, years: Object.freeze(["乙丑", "乙未"]),
    titleTags: Object.freeze({ "乙丑": null, "乙未": null }),
    siTianText: "上太陰土", zhongYunText: "中少商金運", zaiQuanText: "下太陽水",
    xieQiText: "熱化寒化勝復同，所謂邪氣化日也", zaiGong: 7,
    zhengHuaRaw: "濕化五，清化四，寒化六，所謂正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "濕化", 數值: 5 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "清化", 數值: 4 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "寒化", 數值: 6 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上苦熱，中酸和，下甘熱，所謂藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦熱", 中: "酸和", 下: "甘熱" })
  }),
  Object.freeze({
    pairIndex: 3, years: Object.freeze(["丙寅", "丙申"]),
    titleTags: Object.freeze({ "丙寅": null, "丙申": null }),
    siTianText: "上少陽相火", zhongYunText: "中太羽水運", zaiQuanText: "下厥陰木",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "火化二，寒化六，風化三，所謂正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "火化", 數值: 2 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "寒化", 數值: 6 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "風化", 數值: 3 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上鹹寒，中鹹溫，下辛溫，所謂藥食宜也",
    yaoShiYi: Object.freeze({ 上: "鹹寒", 中: "鹹溫", 下: "辛溫" })
  }),
  Object.freeze({
    pairIndex: 4, years: Object.freeze(["丁卯", "丁酉"]),
    titleTags: Object.freeze({ "丁卯": "歲會", "丁酉": null }),
    siTianText: "上陽明金", zhongYunText: "中少角木運", zaiQuanText: "下少陰火",
    xieQiText: "清化熱化勝復同，所謂邪氣化日也", zaiGong: 3,
    zhengHuaRaw: "燥化九，風化三，熱化七，所謂正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "燥化", 數值: 9 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "風化", 數值: 3 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "熱化", 數值: 7 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上苦小溫，中辛和，下鹹寒，所謂藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦小溫", 中: "辛和", 下: "鹹寒" })
  }),
  Object.freeze({
    pairIndex: 5, years: Object.freeze(["戊辰", "戊戌"]),
    titleTags: Object.freeze({ "戊辰": null, "戊戌": null }),
    siTianText: "上太陽水", zhongYunText: "中太徵火運", zaiQuanText: "下太陰土",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "寒化六，熱化七，濕化五，所謂正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "寒化", 數值: 6 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "熱化", 數值: 7 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "濕化", 數值: 5 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上苦溫，中甘和，下甘溫，所謂藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦溫", 中: "甘和", 下: "甘溫" })
  }),
  Object.freeze({
    pairIndex: 6, years: Object.freeze(["己巳", "己亥"]),
    titleTags: Object.freeze({ "己巳": null, "己亥": null }),
    siTianText: "上厥陰木", zhongYunText: "中少宮土運", zaiQuanText: "下少陽相火",
    xieQiText: "風化清化勝復同，所謂邪氣化日也", zaiGong: 5,
    zhengHuaRaw: "風化三，濕化五，火化七，所謂正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "風化", 數值: 3 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "濕化", 數值: 5 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "火化", 數值: 7 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上辛涼，中甘和，下鹹寒，所謂藥食宜也",
    yaoShiYi: Object.freeze({ 上: "辛涼", 中: "甘和", 下: "鹹寒" })
  }),
  Object.freeze({
    pairIndex: 7, years: Object.freeze(["庚午", "庚子"]),
    titleTags: Object.freeze({ "庚午": "同天符", "庚子": "同天符" }),
    siTianText: "上少陰火", zhongYunText: "中太商金運", zaiQuanText: "下陽明金",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "熱化七，清化九，燥化九，所謂正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "熱化", 數值: 7 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "清化", 數值: 9 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "燥化", 數值: 9 })
    ]),
    omissionCode: null,
    omissionType: "異名同數不省文（中運太商金稱清化九，在泉陽明金稱燥化九，故三數並存）",
    yaoShiYiRaw: "其化上鹹寒，中辛溫，下酸溫，所謂藥食宜也",
    yaoShiYi: Object.freeze({ 上: "鹹寒", 中: "辛溫", 下: "酸溫" })
  }),
  Object.freeze({
    pairIndex: 8, years: Object.freeze(["辛未", "辛丑"]),
    titleTags: Object.freeze({ "辛未": "同歲會", "辛丑": "同歲會" }),
    siTianText: "上太陰土", zhongYunText: "中少羽水運", zaiQuanText: "下太陽水",
    xieQiText: "雨化風化勝復同，所謂邪氣化日也", zaiGong: 1,
    zhengHuaRaw: "雨化五，寒化一，所謂正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "雨化", 數值: 5 }),
      Object.freeze({ 位置: "中（歲運）＋下（在泉）同氣省文", 化名: "寒化", 數值: 1 })
    ]),
    omissionCode: "MIDDLE_LOWER",
    omissionType: "中下同名同數省文（中少羽水運與下太陽寒水在泉皆為寒化一）",
    yaoShiYiRaw: "其化上苦熱，中苦和，下苦熱，所謂藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦熱", 中: "苦和", 下: "苦熱" })
  }),
  Object.freeze({
    pairIndex: 9, years: Object.freeze(["壬申", "壬寅"]),
    titleTags: Object.freeze({ "壬申": "同天符", "壬寅": "同天符" }),
    siTianText: "上少陽相火", zhongYunText: "中太角木運", zaiQuanText: "下厥陰木",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "火化二，風化八，所謂正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "火化", 數值: 2 }),
      Object.freeze({ 位置: "中（歲運）＋下（在泉）同氣省文", 化名: "風化", 數值: 8 })
    ]),
    omissionCode: "MIDDLE_LOWER",
    omissionType: "中下同名同數省文（中太角木運與下厥陰風木在泉皆為風化八）",
    yaoShiYiRaw: "其化上鹹寒，中酸和，下辛涼，所謂藥食宜也",
    yaoShiYi: Object.freeze({ 上: "鹹寒", 中: "酸和", 下: "辛涼" })
  }),
  Object.freeze({
    pairIndex: 10, years: Object.freeze(["癸酉", "癸卯"]),
    titleTags: Object.freeze({ "癸酉": "同歲會", "癸卯": "同歲會" }),
    siTianText: "上陽明金", zhongYunText: "中少徵火運", zaiQuanText: "下少陰火",
    xieQiText: "寒化雨化勝復同，所謂邪氣化日也", zaiGong: 9,
    zhengHuaRaw: "燥化九，熱化二，所謂正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "燥化", 數值: 9 }),
      Object.freeze({ 位置: "中（歲運）＋下（在泉）同氣省文", 化名: "熱化", 數值: 2 })
    ]),
    omissionCode: "MIDDLE_LOWER",
    omissionType: "中下同名同數省文（中少徵火運與下少陰君火在泉皆為熱化二）",
    yaoShiYiRaw: "其化上苦小溫，中鹹溫，下鹹寒，所謂藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦小溫", 中: "鹹溫", 下: "鹹寒" })
  }),
  Object.freeze({
    pairIndex: 11, years: Object.freeze(["甲戌", "甲辰"]),
    titleTags: Object.freeze({ "甲戌": "歲會同天符", "甲辰": "歲會同天符" }),
    siTianText: "上太陽水", zhongYunText: "中太宮土運", zaiQuanText: "下太陰土",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "寒化六，濕化五，正化日也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "寒化", 數值: 6 }),
      Object.freeze({ 位置: "中（歲運）＋下（在泉）同氣省文", 化名: "濕化", 數值: 5 })
    ]),
    omissionCode: "MIDDLE_LOWER",
    omissionType: "中下同名同數省文（中太宮土運與下太陰濕土在泉皆為濕化五）",
    yaoShiYiRaw: "其化上苦熱，中苦溫，下苦溫，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦熱", 中: "苦溫", 下: "苦溫" })
  }),
  Object.freeze({
    pairIndex: 12, years: Object.freeze(["乙亥", "乙巳"]),
    titleTags: Object.freeze({ "乙亥": null, "乙巳": null }),
    siTianText: "上厥陰木", zhongYunText: "中少商金運", zaiQuanText: "下少陽相火",
    xieQiText: "熱化寒化勝復同，邪氣化日也", zaiGong: 7,
    zhengHuaRaw: "風化八，清化四，火化二，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "風化", 數值: 8 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "清化", 數值: 4 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "火化", 數值: 2 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上辛涼，中酸和，下鹹寒，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "辛涼", 中: "酸和", 下: "鹹寒" })
  }),
  Object.freeze({
    pairIndex: 13, years: Object.freeze(["丙子", "丙午"]),
    titleTags: Object.freeze({ "丙子": "歲會", "丙午": null }),
    siTianText: "上少陰火", zhongYunText: "中太羽水運", zaiQuanText: "下陽明金",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "熱化二，寒化六，清化四，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "熱化", 數值: 2 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "寒化", 數值: 6 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "清化", 數值: 4 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上鹹寒，中鹹熱，下酸溫，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "鹹寒", 中: "鹹熱", 下: "酸溫" })
  }),
  Object.freeze({
    pairIndex: 14, years: Object.freeze(["丁丑", "丁未"]),
    titleTags: Object.freeze({ "丁丑": null, "丁未": null }),
    siTianText: "上太陰土", zhongYunText: "中少角木運", zaiQuanText: "下太陽水",
    xieQiText: "清化熱化勝復同，邪氣化度也", zaiGong: 3,
    zhengHuaRaw: "雨化五，風化三，寒化一，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "雨化", 數值: 5 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "風化", 數值: 3 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "寒化", 數值: 1 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上苦溫，中辛溫，下甘熱，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦溫", 中: "辛溫", 下: "甘熱" })
  }),
  Object.freeze({
    pairIndex: 15, years: Object.freeze(["戊寅", "戊申"]),
    titleTags: Object.freeze({ "戊寅": "天符", "戊申": "天符" }),
    siTianText: "上少陽相火", zhongYunText: "中太徵火運", zaiQuanText: "下厥陰木",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "火化七，風化三，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）＋中（歲運）同氣省文", 化名: "火化", 數值: 7 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "風化", 數值: 3 })
    ]),
    omissionCode: "UPPER_MIDDLE",
    omissionType: "上中同名同數省文（上少陽相火司天與中太徵火運皆為火化七）",
    yaoShiYiRaw: "其化上鹹寒，中甘和，下辛涼，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "鹹寒", 中: "甘和", 下: "辛涼" })
  }),
  Object.freeze({
    pairIndex: 16, years: Object.freeze(["己卯", "己酉"]),
    titleTags: Object.freeze({ "己卯": null, "己酉": null }),
    siTianText: "上陽明金", zhongYunText: "中少宮土運", zaiQuanText: "下少陰火",
    xieQiText: "風化清化勝復同，邪氣化度也", zaiGong: 5,
    zhengHuaRaw: "清化九，雨化五，熱化七，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "清化", 數值: 9 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "雨化", 數值: 5 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "熱化", 數值: 7 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上苦小溫，中甘和，下鹹寒，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦小溫", 中: "甘和", 下: "鹹寒" })
  }),
  Object.freeze({
    pairIndex: 17, years: Object.freeze(["庚辰", "庚戌"]),
    titleTags: Object.freeze({ "庚辰": null, "庚戌": null }),
    siTianText: "上太陽水", zhongYunText: "中太商金運", zaiQuanText: "下太陰土",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "寒化一，清化九，雨化五，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "寒化", 數值: 1 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "清化", 數值: 9 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "雨化", 數值: 5 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上苦熱，中辛溫，下甘熱，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦熱", 中: "辛溫", 下: "甘熱" })
  }),
  Object.freeze({
    pairIndex: 18, years: Object.freeze(["辛巳", "辛亥"]),
    titleTags: Object.freeze({ "辛巳": null, "辛亥": null }),
    siTianText: "上厥陰木", zhongYunText: "中少羽水運", zaiQuanText: "下少陽相火",
    xieQiText: "雨化風化勝復同，邪氣化度也", zaiGong: 1,
    zhengHuaRaw: "風化三，寒化一，火化七，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "風化", 數值: 3 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "寒化", 數值: 1 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "火化", 數值: 7 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上辛涼，中苦和，下鹹寒，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "辛涼", 中: "苦和", 下: "鹹寒" })
  }),
  Object.freeze({
    pairIndex: 19, years: Object.freeze(["壬午", "壬子"]),
    titleTags: Object.freeze({ "壬午": null, "壬子": null }),
    siTianText: "上少陰火", zhongYunText: "中太角木運", zaiQuanText: "下陽明金",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "熱化二，風化八，清化四，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "熱化", 數值: 2 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "風化", 數值: 8 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "清化", 數值: 4 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上鹹寒，中酸涼，下酸溫，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "鹹寒", 中: "酸涼", 下: "酸溫" })
  }),
  Object.freeze({
    pairIndex: 20, years: Object.freeze(["癸未", "癸丑"]),
    titleTags: Object.freeze({ "癸未": null, "癸丑": null }),
    siTianText: "上太陰土", zhongYunText: "中少徵火運", zaiQuanText: "下太陽水",
    xieQiText: "寒化雨化勝復同，邪氣化度也", zaiGong: 9,
    zhengHuaRaw: "雨化五，火化二，寒化一，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "雨化", 數值: 5 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "火化", 數值: 2 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "寒化", 數值: 1 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上苦溫，中鹹溫，下甘熱，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦溫", 中: "鹹溫", 下: "甘熱" })
  }),
  Object.freeze({
    pairIndex: 21, years: Object.freeze(["甲申", "甲寅"]),
    titleTags: Object.freeze({ "甲申": null, "甲寅": null }),
    siTianText: "上少陽相火", zhongYunText: "中太宮土運", zaiQuanText: "下厥陰木",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "火化二，雨化五，風化八，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "火化", 數值: 2 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "雨化", 數值: 5 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "風化", 數值: 8 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上鹹寒，中鹹和，下辛涼，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "鹹寒", 中: "鹹和", 下: "辛涼" })
  }),
  Object.freeze({
    pairIndex: 22, years: Object.freeze(["乙酉", "乙卯"]),
    titleTags: Object.freeze({ "乙酉": "太乙天符", "乙卯": "天符" }),
    siTianText: "上陽明金", zhongYunText: "中少商金運", zaiQuanText: "下少陰火",
    xieQiText: "熱化寒化勝復同，邪氣化度也", zaiGong: 7,
    zhengHuaRaw: "燥化四，清化四，熱化二，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "燥化", 數值: 4 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "清化", 數值: 4 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "熱化", 數值: 2 })
    ]),
    omissionCode: null,
    omissionType: "異名同數不省文（司天陽明金稱燥化四，中運少商金稱清化四，故三數並存）",
    yaoShiYiRaw: "其化上苦小溫，中苦和，下鹹寒，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦小溫", 中: "苦和", 下: "鹹寒" })
  }),
  Object.freeze({
    pairIndex: 23, years: Object.freeze(["丙戌", "丙辰"]),
    titleTags: Object.freeze({ "丙戌": "天符", "丙辰": "天符" }),
    siTianText: "上太陽水", zhongYunText: "中太羽水運", zaiQuanText: "下太陰土",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "寒化六，雨化五，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）＋中（歲運）同氣省文", 化名: "寒化", 數值: 6 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "雨化", 數值: 5 })
    ]),
    omissionCode: "UPPER_MIDDLE",
    omissionType: "上中同名同數省文（上太陽寒水司天與中太羽水運皆為寒化六）",
    yaoShiYiRaw: "其化上苦熱，中鹹溫，下甘熱，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦熱", 中: "鹹溫", 下: "甘熱" })
  }),
  Object.freeze({
    pairIndex: 24, years: Object.freeze(["丁亥", "丁巳"]),
    titleTags: Object.freeze({ "丁亥": "天符", "丁巳": "天符" }),
    siTianText: "上厥陰木", zhongYunText: "中少角木運", zaiQuanText: "下少陽相火",
    xieQiText: "清化熱化勝復同，邪氣化度也", zaiGong: 3,
    zhengHuaRaw: "風化三，火化七，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）＋中（歲運）同氣省文", 化名: "風化", 數值: 3 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "火化", 數值: 7 })
    ]),
    omissionCode: "UPPER_MIDDLE",
    omissionType: "上中同名同數省文（上厥陰風木司天與中少角木運皆為風化三）",
    yaoShiYiRaw: "其化上辛涼，中辛和，下鹹寒，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "辛涼", 中: "辛和", 下: "鹹寒" })
  }),
  Object.freeze({
    pairIndex: 25, years: Object.freeze(["戊子", "戊午"]),
    titleTags: Object.freeze({ "戊子": "天符", "戊午": "太乙天符" }),
    siTianText: "上少陰火", zhongYunText: "中太徵火運", zaiQuanText: "下陽明金",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "熱化七，清化九，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）＋中（歲運）同氣省文", 化名: "熱化", 數值: 7 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "清化", 數值: 9 })
    ]),
    omissionCode: "UPPER_MIDDLE",
    omissionType: "上中同名同數省文（上少陰君火司天與中太徵火運皆為熱化七）",
    yaoShiYiRaw: "其化上鹹寒，中甘寒，下酸溫，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "鹹寒", 中: "甘寒", 下: "酸溫" })
  }),
  Object.freeze({
    pairIndex: 26, years: Object.freeze(["己丑", "己未"]),
    titleTags: Object.freeze({ "己丑": "太乙天符", "己未": "太乙天符" }),
    siTianText: "上太陰土", zhongYunText: "中少宮土運", zaiQuanText: "下太陽水",
    xieQiText: "風化清化勝復同，邪氣化度也", zaiGong: 5,
    zhengHuaRaw: "雨化五，寒化一，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）＋中（歲運）同氣省文", 化名: "雨化", 數值: 5 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "寒化", 數值: 1 })
    ]),
    omissionCode: "UPPER_MIDDLE",
    omissionType: "上中同名同數省文（上太陰濕土司天與中少宮土運皆為雨化五）",
    yaoShiYiRaw: "其化上苦熱，中甘和，下甘熱，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦熱", 中: "甘和", 下: "甘熱" })
  }),
  Object.freeze({
    pairIndex: 27, years: Object.freeze(["庚寅", "庚申"]),
    titleTags: Object.freeze({ "庚寅": null, "庚申": null }),
    siTianText: "上少陽相火", zhongYunText: "中太商金運", zaiQuanText: "下厥陰木",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "火化七，清化九，風化三，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "火化", 數值: 7 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "清化", 數值: 9 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "風化", 數值: 3 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上鹹寒，中辛溫，下辛涼，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "鹹寒", 中: "辛溫", 下: "辛涼" })
  }),
  Object.freeze({
    pairIndex: 28, years: Object.freeze(["辛卯", "辛酉"]),
    titleTags: Object.freeze({ "辛卯": null, "辛酉": null }),
    siTianText: "上陽明金", zhongYunText: "中少羽水運", zaiQuanText: "下少陰火",
    xieQiText: "雨化風化勝復同，邪氣化度也", zaiGong: 1,
    zhengHuaRaw: "清化九，寒化一，熱化七，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "清化", 數值: 9 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "寒化", 數值: 1 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "熱化", 數值: 7 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上苦小溫，中苦和，下鹹寒，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦小溫", 中: "苦和", 下: "鹹寒" })
  }),
  Object.freeze({
    pairIndex: 29, years: Object.freeze(["壬辰", "壬戌"]),
    titleTags: Object.freeze({ "壬辰": null, "壬戌": null }),
    siTianText: "上太陽水", zhongYunText: "中太角木運", zaiQuanText: "下太陰土",
    xieQiText: null, zaiGong: null,
    zhengHuaRaw: "寒化六，風化八，雨化五，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "寒化", 數值: 6 }),
      Object.freeze({ 位置: "中（歲運）", 化名: "風化", 數值: 8 }),
      Object.freeze({ 位置: "下（在泉）", 化名: "雨化", 數值: 5 })
    ]),
    omissionCode: null,
    omissionType: null,
    yaoShiYiRaw: "其化上苦溫，中酸和，下甘溫，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "苦溫", 中: "酸和", 下: "甘溫" })
  }),
  Object.freeze({
    pairIndex: 30, years: Object.freeze(["癸巳", "癸亥"]),
    titleTags: Object.freeze({ "癸巳": "同歲會", "癸亥": "同歲會" }),
    siTianText: "上厥陰木", zhongYunText: "中少徵火運", zaiQuanText: "下少陽相火",
    xieQiText: "寒化雨化勝復同，邪氣化度也", zaiGong: 9,
    zhengHuaRaw: "風化八，火化二，正化度也",
    zhengHuaItems: Object.freeze([
      Object.freeze({ 位置: "上（司天）", 化名: "風化", 數值: 8 }),
      Object.freeze({ 位置: "中（歲運）＋下（在泉）同氣省文", 化名: "火化", 數值: 2 })
    ]),
    omissionCode: "MIDDLE_LOWER",
    omissionType: "中下同名同數省文（中少徵火運與下少陽相火在泉皆為火化二）",
    yaoShiYiRaw: "其化上辛涼，中鹹和，下鹹寒，藥食宜也",
    yaoShiYi: Object.freeze({ 上: "辛涼", 中: "鹹和", 下: "鹹寒" })
  })
]);

const LIUYUAN_60_JIAZI_MAP = Object.freeze(
  LIUYUAN_30_PAIRS_RAW.reduce((acc, pair) => {
    for (const gz of pair.years) {
      acc[gz] = pair;
    }
    return acc;
  }, {})
);

/**
 * 全自動比對經文合論每一項（上、中、下）與正化／對化分論數值的關係。
 * 注意：數值相符只能標示數值對照，不足以證明原典的實際推導來源。
 */
function resolveClassicalValueOrigin(pair, positionKey, classicalVal) {
  const [gzA, gzB] = pair.years;
  const zhengGz = BRANCH_ZHENG_DUI_META[gzA.charAt(1)].正對屬性 === "正化" ? gzA : gzB;
  const duiGz = zhengGz === gzA ? gzB : gzA;

  if (positionKey === "MIDDLE") {
    return `兩歲同值（同干中運，正化歲${zhengGz}與對化歲${duiGz}分論皆為 ${classicalVal}）`;
  }

  const field = positionKey === "UPPER" ? "司天數" : "在泉數";
  const zhengVal = BRANCH_ZHENG_DUI_META[zhengGz.charAt(1)][field];
  const duiVal = BRANCH_ZHENG_DUI_META[duiGz.charAt(1)][field];

  if (zhengVal === duiVal) {
    const qiName = BRANCH_ZHENG_DUI_META[zhengGz.charAt(1)][field === "司天數" ? "司天六氣" : "在泉六氣"];
    const soilNote = qiName === "太陰濕土"
      ? "；《玄珠密語》明言土無成數，故此處只記土化五，不稱「生數成數皆五」"
      : "";
    return `兩歲同值（正化歲${zhengGz}與對化歲${duiGz}分論皆為 ${classicalVal}${soilNote}）`;
  }
  if (classicalVal === zhengVal) {
    return `原典合論數值與正化歲分論值相符（數值同正化歲${zhengGz}之生數 ${zhengVal}；對化歲${duiGz}分論值為 ${duiVal}）。此為數值比對，不單憑相等推定原典取值來源`;
  }
  if (classicalVal === duiVal) {
    return `原典合論數值與對化歲分論值相符（數值同對化歲${duiGz}之成數 ${duiVal}；正化歲${zhengGz}分論值為 ${zhengVal}）。此為數值比對，不單憑相等推定原典取值來源`;
  }
  throw new Error(`resolveClassicalValueOrigin: 無法匹配 ${pair.years.join("/")} ${positionKey} 數值 ${classicalVal}`);
}

/**
 * 將省文之 2 項正化度展開為完整之上、中、下 3 項結構，並自動標註每一項與正化／對化分論數值的對照關係
 */
function expandThreePositionZhengHua(pair) {
  const items = pair.zhengHuaItems;
  let upperItem, middleItem, lowerItem;

  if (pair.omissionCode === null) {
    upperItem = { 化名: items[0].化名, 數值: items[0].數值, 是否省文合併: false };
    middleItem = { 化名: items[1].化名, 數值: items[1].數值, 是否省文合併: false };
    lowerItem = { 化名: items[2].化名, 數值: items[2].數值, 是否省文合併: false };
  } else if (pair.omissionCode === "UPPER_MIDDLE") {
    upperItem = { 化名: items[0].化名, 數值: items[0].數值, 是否省文合併: true };
    middleItem = { 化名: items[0].化名, 數值: items[0].數值, 是否省文合併: true };
    lowerItem = { 化名: items[1].化名, 數值: items[1].數值, 是否省文合併: false };
  } else if (pair.omissionCode === "MIDDLE_LOWER") {
    upperItem = { 化名: items[0].化名, 數值: items[0].數值, 是否省文合併: false };
    middleItem = { 化名: items[1].化名, 數值: items[1].數值, 是否省文合併: true };
    lowerItem = { 化名: items[1].化名, 數值: items[1].數值, 是否省文合併: true };
  } else {
    throw new Error(`expandThreePositionZhengHua: 未知的 omissionCode "${String(pair.omissionCode)}"`);
  }

  upperItem.數值性質 = resolveClassicalValueOrigin(pair, "UPPER", upperItem.數值);
  middleItem.數值性質 = resolveClassicalValueOrigin(pair, "MIDDLE", middleItem.數值);
  lowerItem.數值性質 = resolveClassicalValueOrigin(pair, "LOWER", lowerItem.數值);

  return {
    上_司天: upperItem,
    中_歲運: middleItem,
    下_在泉: lowerItem
  };
}

/**
 * 查詢並推演單一歲干支之《六元正紀大論》正化度、邪氣化度、正對化分論生成數與藥食宜
 */
function computeLiuYuanZhengJiInfo(ganzhi) {
  if (typeof ganzhi !== "string" || ganzhi.trim().length === 0) {
    throw new TypeError("computeLiuYuanZhengJiInfo: ganzhi 必須為非空字串");
  }
  const normalizedGz = ganzhi.trim();
  if (normalizedGz.length !== 2) {
    throw new RangeError("computeLiuYuanZhengJiInfo: 干支必須恰為兩字");
  }
  const stem = normalizedGz.charAt(0);
  const branch = normalizedGz.charAt(1);
  const stemIdx = GAN_LIST.indexOf(stem);
  const branchIdx = ZHI_LIST.indexOf(branch);
  if (stemIdx < 0 || branchIdx < 0 || (stemIdx % 2) !== (branchIdx % 2)) {
    throw new RangeError(`computeLiuYuanZhengJiInfo: 非法六十甲子干支 "${normalizedGz}"`);
  }

  const pair = LIUYUAN_60_JIAZI_MAP[normalizedGz];
  const stemMeta = STEM_YUN_NUMBER_META[stem];
  const branchMeta = BRANCH_ZHENG_DUI_META[branch];
  const expanded = expandThreePositionZhengHua(pair);

  const classicalDifferFromXuanZhu =
    expanded.上_司天.數值 !== branchMeta.司天數 ||
    expanded.下_在泉.數值 !== branchMeta.在泉數;

  return {
    醫療邊界聲明: LIUYUAN_MEDICAL_NOTICE,
    干支: normalizedGz,
    所屬經文組別: `第 ${pair.pairIndex} 組（${pair.years[0]}・${pair.years[1]}歲）`,
    原典篇頭同化標記: pair.titleTags[normalizedGz],
    三氣格局: {
      上_司天: pair.siTianText,
      中_歲運: pair.zhongYunText,
      下_在泉: pair.zaiQuanText
    },
    邪氣化度與災宮: pair.xieQiText
      ? {
          有無邪氣化度: true,
          原典記載: `${pair.xieQiText}。災${pair.zaiGong}宮。`,
          災宮數: pair.zaiGong
        }
      : {
          有無邪氣化度: false,
          原典記載: "無（陽干歲運太過之年無勝復邪化，全屬正化日／正化度）",
          災宮數: null
        },
    軌道1_六元正紀經文合論正化度: {
      原典記載: pair.zhengHuaRaw,
      合論警語: "《素問·六元正紀大論》原文將對沖兩歲並舉。本模組另將合論數值與《玄珠密語》等正化／對化分論數作比對；數值相符只表示數字相等，不單憑相等推定原典實際取值來源。欲查單歲分論數值，請參照軌道 2。",
      經文列數項數: pair.zhengHuaItems.length,
      省文枚舉碼: pair.omissionCode,
      省文與異名說明: pair.omissionType || "上、中、下三氣不同名，完整並列三數",
      上中下展開: expanded
    },
    軌道2_玄珠類經正對化分論生成數: {
      本年地支正對屬性: `${branch}年屬「${branchMeta.正對屬性}」`,
      正對化法則: branchMeta.正對屬性 === "正化"
        ? "正司化令之實，正化從本生數（司天、在泉皆取生數；土亦常以生數五論）"
        : "對司化令之虛，通常對化從標成數；但太陰土無成數而取五，故土位不宜概稱為成數",
      方位月建釋義: branchMeta.方位月建釋義,
      分論生成數: {
        上_司天: { 六氣: branchMeta.司天六氣, 化名: expanded.上_司天.化名, 數值: branchMeta.司天數 },
        中_歲運: {
          歲運: stemMeta.歲運,
          化名: expanded.中_歲運.化名,
          數值: stemMeta.化數,
          依據: stem === "甲"
            ? "《素問》曰「太過者其數成，不及者其數生，土常以生」；甲歲太宮土運本項取五，按土常以生處理，不以一般成數十論"
            : `「太過者其數成，不及者其數生」（${stemMeta.數別}）`
        },
        下_在泉: { 六氣: branchMeta.在泉六氣, 化名: expanded.下_在泉.化名, 數值: branchMeta.在泉數 }
      },
      與經文合論數是否存異: classicalDifferFromXuanZhu,
      雙軌差異說明: classicalDifferFromXuanZhu
        ? "《素問·六元正紀大論》將對沖兩歲合論，其司天、在泉生成數係綜合歲運盛衰與勝復制化而定；《玄珠密語》《新校正》《類經圖翼》則依地支正化（生數）、對化（成數）分論。"
        : "本年正對化分論生成數恰與《素問》經文兩歲合論數之數值相符（屬單歲分論值恰等於經文兩歲合論所取之值，非二軌理論等同）。"
    },
    其化上中下_藥食宜: {
      原典記載: pair.yaoShiYiRaw,
      上_司天宜: pair.yaoShiYi.上,
      中_歲運宜: pair.yaoShiYi.中,
      下_在泉宜: pair.yaoShiYi.下
    }
  };
}

// ============================================================================
// 自動化驗證測試套件（60 甲子全量斷言驗證）
// ============================================================================

function runAllTests() {
  console.log("=== 開始執行 WYLQ-Audit v3.34.0《素問·六元正紀大論》60 甲子正化度／正對化／藥食宜驗證 ===");

  assert.strictEqual(LIUYUAN_30_PAIRS_RAW.length, 30, "必須恰有 30 組對沖歲紀");
  assert.strictEqual(Object.keys(LIUYUAN_60_JIAZI_MAP).length, 60, "必須完整涵蓋 60 甲子");

  let upperMiddleCount = 0;
  let middleLowerCount = 0;
  let threeItemSameElementCount = 0;

  for (let i = 0; i < 60; i++) {
    const gz = GAN_LIST[i % 10] + ZHI_LIST[i % 12];
    const stem = gz.charAt(0);
    const branch = gz.charAt(1);
    const info = computeLiuYuanZhengJiInfo(` ${gz} `);

    assert.strictEqual(info.干支, gz);

    // 1. 驗證中運生成數 100% 符合「太過者其數成，不及者其數生」
    const expectedYunNum = STEM_YUN_NUMBER_META[stem].化數;
    const exp = info.軌道1_六元正紀經文合論正化度.上中下展開;
    assert.strictEqual(exp.中_歲運.數值, expectedYunNum);
    assert.strictEqual(info.軌道2_玄珠類經正對化分論生成數.分論生成數.中_歲運.數值, expectedYunNum);

    // 驗證 90 項「數值性質」皆精確標註為「兩歲同值」、「數值與正化歲分論值相符」或「數值與對化歲分論值相符」
    for (const pos of [exp.上_司天, exp.中_歲運, exp.下_在泉]) {
      assert.ok(
        pos.數值性質.includes("兩歲同值") ||
        pos.數值性質.includes("數值與正化歲分論值相符") ||
        pos.數值性質.includes("數值與對化歲分論值相符"),
        `${gz} 數值性質必須精確分類`
      );
    }

    // 2. 驗證陽干無邪氣化度與災宮，陰干必有邪氣化度與災宮 (1,3,5,7,9)
    const isYang = (i % 10) % 2 === 0;
    if (isYang) {
      assert.strictEqual(info.邪氣化度與災宮.有無邪氣化度, false);
      assert.strictEqual(info.邪氣化度與災宮.災宮數, null);
    } else {
      assert.strictEqual(info.邪氣化度與災宮.有無邪氣化度, true);
      assert.ok([1, 3, 5, 7, 9].includes(info.邪氣化度與災宮.災宮數));
    }

    // 3. 驗證正化六支（午未寅酉戌亥）司天在泉皆生數 (1..5)，對化六支（子丑申卯辰巳）司天在泉皆成數 (5..9)
    const zhengBranches = new Set(["午", "未", "寅", "酉", "戌", "亥"]);
    const siTianNum = info.軌道2_玄珠類經正對化分論生成數.分論生成數.上_司天.數值;
    const zaiQuanNum = info.軌道2_玄珠類經正對化分論生成數.分論生成數.下_在泉.數值;
    if (zhengBranches.has(branch)) {
      assert.ok(siTianNum >= 1 && siTianNum <= 5);
      assert.ok(zaiQuanNum >= 1 && zaiQuanNum <= 5);
    } else {
      assert.ok(siTianNum >= 5 && siTianNum <= 9);
      assert.ok(zaiQuanNum >= 5 && zaiQuanNum <= 9);
    }

    const code = info.軌道1_六元正紀經文合論正化度.省文枚舉碼;
    if (code === "UPPER_MIDDLE") upperMiddleCount++;
    if (code === "MIDDLE_LOWER") middleLowerCount++;
    if (info.軌道1_六元正紀經文合論正化度.省文與異名說明.includes("異名同數不省文")) {
      threeItemSameElementCount++;
    }
  }

  assert.strictEqual(upperMiddleCount, 10);
  assert.strictEqual(middleLowerCount, 10);
  assert.strictEqual(threeItemSameElementCount, 4);
  console.log("✅ [PASS] 測試 1：60 甲子全表中運生成數定律、5組上中省文、5組中下省文與2組異名不省文驗證通過");
  assert.ok(STEM_YUN_NUMBER_META["甲"].數別.includes("土常以生"), "甲土運須保留《素問》土常以生的例外");
  assert.ok(
    computeLiuYuanZhengJiInfo("甲子").軌道2_玄珠類經正對化分論生成數.分論生成數.中_歲運.依據.includes("土常以生"),
    "甲土運的數值依據須明示土常以生"
  );
  const chouRule = computeLiuYuanZhengJiInfo("辛丑").軌道2_玄珠類經正對化分論生成數.正對化法則;
  assert.ok(chouRule.includes("太陰土無成數"), "對化規則須明示太陰土無成數的例外");
  assert.ok(!chouRule.includes("司天、在泉皆取成數"), "不可把對化一般規則無差別套用到土位");
  console.log("✅ [PASS] 測試 2：正化／對化數值對照、90 項標註及土無成數例外驗證通過");

  // 4. 驗證第 8 組（辛未・辛丑）與第 15 組（戊寅・戊申）各項數值性質精確分類
  const xinWeiExp = computeLiuYuanZhengJiInfo("辛未").軌道1_六元正紀經文合論正化度.上中下展開;
  assert.ok(xinWeiExp.上_司天.數值性質.includes("兩歲同值"));
  assert.ok(xinWeiExp.下_在泉.數值性質.includes("數值與正化歲分論值相符"));

  const wuYin = computeLiuYuanZhengJiInfo("戊寅");
  const wuShen = computeLiuYuanZhengJiInfo("戊申");
  assert.ok(wuYin.軌道1_六元正紀經文合論正化度.上中下展開.上_司天.數值性質.includes("數值與對化歲分論值相符"));
  assert.ok(wuYin.軌道1_六元正紀經文合論正化度.上中下展開.下_在泉.數值性質.includes("數值與正化歲分論值相符"));
  assert.strictEqual(wuYin.軌道2_玄珠類經正對化分論生成數.與經文合論數是否存異, true);
  assert.strictEqual(wuShen.軌道2_玄珠類經正對化分論生成數.與經文合論數是否存異, true);

  const gengZi = computeLiuYuanZhengJiInfo("庚子");
  assert.strictEqual(gengZi.軌道2_玄珠類經正對化分論生成數.與經文合論數是否存異, false);
  assert.ok(gengZi.軌道2_玄珠類經正對化分論生成數.雙軌差異說明.includes("非二軌理論等同"));
  console.log("✅ [PASS] 測試 3：第 8 組（辛未辛丑）、第 15 組（戊寅戊申）分論數值對照與雙軌分判驗證通過");

  // 5. 抽樣驗證經典特殊條目（丙寅辛溫、甲戌苦溫、戊午甘寒、乙酉苦和、癸巳火化二）
  assert.strictEqual(computeLiuYuanZhengJiInfo("丙寅").其化上中下_藥食宜.下_在泉宜, "辛溫");
  assert.strictEqual(computeLiuYuanZhengJiInfo("甲戌").其化上中下_藥食宜.下_在泉宜, "苦溫");
  assert.strictEqual(computeLiuYuanZhengJiInfo("戊午").其化上中下_藥食宜.中_歲運宜, "甘寒");
  assert.strictEqual(computeLiuYuanZhengJiInfo("乙酉").其化上中下_藥食宜.中_歲運宜, "苦和");
  assert.strictEqual(computeLiuYuanZhengJiInfo("癸巳").軌道1_六元正紀經文合論正化度.上中下展開.下_在泉.數值, 2);
  console.log("✅ [PASS] 測試 4：特殊年份藥食宜（丙寅下辛溫、甲戌下苦溫、戊午中甘寒、乙酉中苦和）驗證通過");

  // 6. 防禦性邊界測試
  assert.throws(() => computeLiuYuanZhengJiInfo(""), TypeError);
  assert.throws(() => computeLiuYuanZhengJiInfo("甲丑"), RangeError);
  assert.throws(() => computeLiuYuanZhengJiInfo("甲子年"), RangeError);
  console.log("✅ [PASS] 測試 5：非法輸入防禦攔截驗證通過");

  console.log("=== 🎉《素問·六元正紀大論》60 甲子查核模組（v3.34.0 Review-Corrected Candidate）內部測試全部通過 ===");
}

if (require.main === module) {
  runAllTests();
}

module.exports = {
  LIUYUAN_MEDICAL_NOTICE,
  BRANCH_ZHENG_DUI_META,
  STEM_YUN_NUMBER_META,
  LIUYUAN_30_PAIRS_RAW,
  LIUYUAN_60_JIAZI_MAP,
  resolveClassicalValueOrigin,
  expandThreePositionZhengHua,
  computeLiuYuanZhengJiInfo
};