// Hardcoded surname → stroke count map for the Taiwanese roster.
// Covers the common surnames in Taiwan (內政部 統計 + 百家姓); rare
// characters return null so callers can bucket them into a fallback
// group instead of crashing on unknown input. Keep entries sorted by
// stroke count for readability when adding new surnames.
const SURNAMES_BY_STROKE: Record<number, readonly string[]> = {
  2: ["丁", "卜"],
  3: ["于", "凡", "千", "山", "大"],
  4: ["元", "尹", "尤", "巴", "孔", "文", "方", "毛", "牛", "王", "卞"],
  5: ["丘", "包", "古", "司", "史", "左", "平", "申", "白", "皮", "石", "田", "甘"],
  6: ["伊", "伍", "任", "全", "向", "安", "朱", "江", "池"],
  7: ["何", "余", "吳", "呂", "宋", "巫", "李", "杜", "沈", "汪", "車", "谷", "邢", "辛", "阮"],
  8: ["卓", "周", "官", "孟", "屈", "居", "尚", "岳", "幸", "房", "易", "林", "武", "邱", "邵", "金"],
  9: ["侯", "段", "皇", "禹", "胡", "范", "韋", "柯", "柳", "洪", "施", "紀", "姚", "姜"],
  10: ["凌", "倪", "唐", "夏", "宮", "孫", "徐", "桂", "桑", "殷", "涂", "翁", "袁", "馬", "高"],
  11: ["區", "崔", "康", "張", "梁", "梅", "畢", "盛", "章", "符", "莊", "莫", "許", "連", "郭", "麥", "曹"],
  12: ["傅", "單", "彭", "曾", "游", "湯", "程", "童", "雲", "雷", "項", "費", "賀", "辜", "馮", "黃"],
  13: ["塗", "楊", "葉", "董", "解", "詹", "農", "賈", "路", "雍", "靳", "鄒", "溫"],
  14: ["熊", "管", "翟", "齊", "趙", "廖"],
  15: ["劉", "潘", "蔣", "蔡", "墨", "葛", "歐", "魯", "黎", "鄧", "鄭"],
  16: ["盧", "穆", "薛", "賴", "錢", "陳", "霍", "駱", "龍"],
  17: ["應", "戴", "繆", "謝", "鍾", "韓", "隆", "蕭"],
  18: ["簡", "聶", "藍", "瞿", "魏", "顏"],
  19: ["羅", "譚", "邊", "關"],
  20: ["嚴", "蘇", "鐘"],
  21: ["顧"],
  22: ["龔"],
};

const SURNAME_STROKE_LOOKUP: Map<string, number> = (() => {
  const map = new Map<string, number>();
  for (const [strokes, chars] of Object.entries(SURNAMES_BY_STROKE)) {
    const n = Number(strokes);
    for (const ch of chars) {
      map.set(ch, n);
    }
  }
  return map;
})();

export function getSurnameStrokes(name: string | null | undefined): number | null {
  if (!name) return null;
  const first = name[0];
  if (!first) return null;
  return SURNAME_STROKE_LOOKUP.get(first) ?? null;
}
