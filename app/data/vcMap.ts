export interface VCEntry {
  en: string;
  zh: string;
  cat: string;
  icon: string;
  team: 'home' | 'away' | 'neutral';
}

/**
 * 4 位基础事件码表。
 *
 * 1xBet live feed 的球队事件 VC 格式为：
 *   1xxxx = 主队事件
 *   2xxxx = 客队事件
 * 后 4 位就是基础码；全场/中立事件直接使用 4 位码（如 1015 半场结束、1330 VAR）。
 */
export const VC: Record<number, VCEntry> = {
  // 点球相关（部分 feed 使用 10008/10009/10021 这类前导零格式）
  8: { en: 'Penalty Scored', zh: '点球命中', cat: 'PENALTY', icon: '⚽', team: 'neutral' },
  9: { en: 'Penalty Missed', zh: '点球射失', cat: 'PENALTY', icon: '❌', team: 'neutral' },
  21: { en: 'Penalty To Take', zh: '即将罚点球', cat: 'PENALTY', icon: '🎯', team: 'neutral' },

  // 进攻 / 控球 / 危险进攻（球队相关）
  1000: { en: 'Dangerous Attack', zh: '危险进攻', cat: 'ATTACK', icon: '🔴', team: 'neutral' },
  1001: { en: 'Attack', zh: '进攻', cat: 'ATTACK', icon: '🔴', team: 'neutral' },
  1002: { en: 'Possession', zh: '控球', cat: 'POSSESSION', icon: '●', team: 'neutral' },
  1300: { en: 'Take-On Dangerous Attack', zh: '带球危险进攻', cat: 'ATTACK', icon: '🔴', team: 'neutral' },
  1301: { en: 'Take-On Attack', zh: '带球进攻', cat: 'ATTACK', icon: '🔴', team: 'neutral' },
  1302: { en: 'Take-On Safe', zh: '安全控球', cat: 'POSSESSION', icon: '●', team: 'neutral' },

  // 射门 / 进球（球队相关）
  1003: { en: 'Goal', zh: '进球', cat: 'GOAL', icon: '⚽', team: 'neutral' },
  // 官方表：11008/21008 = Home/Away Team Penalty → 基础码 1008 是点球，不是射正
  1008: { en: 'Penalty', zh: '点球', cat: 'PENALTY', icon: '🎯', team: 'neutral' },
  1011: { en: 'Shot on Goal', zh: '射正', cat: 'SHOT', icon: '🎯', team: 'neutral' },
  1012: { en: 'Shot off Goal', zh: '射偏', cat: 'SHOT', icon: '⬆', team: 'neutral' },
  1242: { en: 'Disallowed Goal', zh: '进球无效', cat: 'VAR', icon: '📺', team: 'neutral' },

  // 定位球 / 死球（球队相关）
  1004: { en: 'Corner', zh: '角球', cat: 'CORNER', icon: '🚩', team: 'neutral' },
  1239: { en: 'Corner', zh: '角球', cat: 'CORNER', icon: '🚩', team: 'neutral' },
  3211: { en: 'Corner', zh: '角球', cat: 'CORNER', icon: '🚩', team: 'neutral' },
  1007: { en: 'Goal Kick', zh: '球门球', cat: 'OTHER', icon: '🥅', team: 'neutral' },
  1009: { en: 'Direct Free Kick', zh: '直接任意球', cat: 'FREE_KICK', icon: '🎯', team: 'neutral' },
  1010: { en: 'Free Kick', zh: '任意球', cat: 'FREE_KICK', icon: '🎯', team: 'neutral' },
  // 对照 1xbet 客户端 live.js：case 1236 → freekick（不是解围）
  1236: { en: 'Free Kick', zh: '任意球', cat: 'FREE_KICK', icon: '🎯', team: 'neutral' },
  1024: { en: 'Throw In', zh: '界外球', cat: 'OTHER', icon: '🔄', team: 'neutral' },
  1237: { en: 'Zoned Throw', zh: '区域界外球', cat: 'OTHER', icon: '🔄', team: 'neutral' },
  1233: { en: 'Match Info', zh: '比赛信息', cat: 'MATCH_PHASE', icon: '📋', team: 'neutral' },
  1234: { en: 'Offside', zh: '越位', cat: 'OFFSIDE', icon: '🏳', team: 'neutral' },

  // 纪律 / 换人（球队相关）
  1005: { en: 'Yellow Card', zh: '黄牌', cat: 'YELLOW_CARD', icon: '🟨', team: 'neutral' },
  1006: { en: 'Red Card', zh: '红牌', cat: 'RED_CARD', icon: '🟥', team: 'neutral' },
  1013: { en: 'Substitution', zh: '换人', cat: 'SUBSTITUTION', icon: '🔄', team: 'neutral' },
  1238: { en: 'Substitution', zh: '换人', cat: 'SUBSTITUTION', icon: '🔄', team: 'neutral' },

  // 比赛阶段 / 全场事件（中立）
  1014: { en: 'Kick Off', zh: '开球', cat: 'MATCH_PHASE', icon: '🔄', team: 'neutral' },
  1015: { en: 'Half Time', zh: '半场结束', cat: 'MATCH_PHASE', icon: '⏸', team: 'neutral' },
  1016: { en: '2nd Half', zh: '下半场', cat: 'MATCH_PHASE', icon: '▶', team: 'neutral' },
  1017: { en: 'Full Time', zh: '比赛结束', cat: 'MATCH_PHASE', icon: '🏁', team: 'neutral' },
  1018: { en: 'Kick Off Extra Time', zh: '加时开球', cat: 'MATCH_PHASE', icon: '🔄', team: 'neutral' },
  1019: { en: 'Extra Time Half Time', zh: '加时中场', cat: 'MATCH_PHASE', icon: '⏸', team: 'neutral' },
  1020: { en: 'Kick Off 2nd Extra Time', zh: '加时下半场', cat: 'MATCH_PHASE', icon: '▶', team: 'neutral' },
  1021: { en: 'End of Extra Time', zh: '加时结束', cat: 'MATCH_PHASE', icon: '🏁', team: 'neutral' },
  1022: { en: 'Penalty Shootout', zh: '点球大战', cat: 'PENALTY', icon: '🎯', team: 'neutral' },
  1023: { en: 'Penalty Missed', zh: '点球射失', cat: 'PENALTY', icon: '❌', team: 'neutral' },
  1025: { en: 'Injury', zh: '伤病', cat: 'INJURY', icon: '🤕', team: 'neutral' },
  1026: { en: 'Injury Time', zh: '伤停补时', cat: 'INJURY', icon: '⏱', team: 'neutral' },
  // live.js: case 2000 → endofmatch；LiveTracker 也把它当终场处理
  2000: { en: 'End of Match', zh: '比赛结束', cat: 'MATCH_PHASE', icon: '🏁', team: 'neutral' },

  // VAR（中立）
  1325: { en: 'VAR', zh: 'VAR', cat: 'VAR', icon: '📺', team: 'neutral' },
  1330: { en: 'VAR In Progress', zh: 'VAR进行中', cat: 'VAR', icon: '📺', team: 'neutral' },
  1331: { en: 'VAR Red Card', zh: 'VAR审核红牌', cat: 'VAR', icon: '📺', team: 'neutral' },
  1332: { en: 'VAR Goal', zh: 'VAR审核进球', cat: 'VAR', icon: '📺', team: 'neutral' },
  1333: { en: 'VAR Penalty', zh: 'VAR审核点球', cat: 'VAR', icon: '📺', team: 'neutral' },
  // bet365.js: 1334 = PossibleGoal（可能进球），1345–1350 = VarCheck（VAR 审核）
  1334: { en: 'Possible Goal', zh: '可能进球', cat: 'VAR', icon: '📺', team: 'neutral' },
  1345: { en: 'VAR Check', zh: 'VAR审核', cat: 'VAR', icon: '📺', team: 'neutral' },
  1346: { en: 'VAR Check', zh: 'VAR审核', cat: 'VAR', icon: '📺', team: 'neutral' },
  1347: { en: 'VAR Check', zh: 'VAR审核', cat: 'VAR', icon: '📺', team: 'neutral' },
  1348: { en: 'VAR Check', zh: 'VAR审核', cat: 'VAR', icon: '📺', team: 'neutral' },
  1349: { en: 'VAR Check', zh: 'VAR审核', cat: 'VAR', icon: '📺', team: 'neutral' },
  1350: { en: 'VAR Check', zh: 'VAR审核', cat: 'VAR', icon: '📺', team: 'neutral' },

  // bet365.js: 1357 = SoccerEarlyPayout（提前派彩，仅在结算时下发）
  1357: { en: 'Early Payout', zh: '提前派彩', cat: 'OTHER', icon: '💰', team: 'neutral' },
};

/** 从 VC 中提取 4 位基础码。 */
export function vcBase(vc: number): number {
  if (vc > 9999) {
    return Number(String(vc).substring(1));
  }
  return vc;
}

/** 从 VC 前缀判断球队。 */
export function vcTeam(vc: number): 'home' | 'away' | 'neutral' {
  const s = String(vc);
  if (s.length >= 5 && (s[0] === '1' || s[0] === '2')) {
    return s[0] === '1' ? 'home' : 'away';
  }
  return 'neutral';
}

/** 获取事件描述，team 字段由 VC 前缀实时决定。 */
export function vcInfo(vc: number): VCEntry {
  const base = vcBase(vc);
  const entry = VC[base];
  if (entry) {
    return { ...entry, team: vcTeam(vc) };
  }
  return {
    en: `Event ${vc}`,
    zh: `事件${vc}`,
    cat: 'OTHER',
    icon: '📌',
    team: vcTeam(vc),
  };
}

/** 球队相关的事件分类集合（均已转为基础码）。 */
export const DA_CODES = new Set([1000, 1300]);
export const ATTACK_CODES = new Set([1001, 1301]);
export const POSS_CODES = new Set([1000, 1300, 1001, 1301, 1002, 1302]);
export const GK_CODES = new Set([1007]);
export const THROW_CODES = new Set([1024, 1237]);
export const DIRECT_FK_CODES = new Set([1009]);
