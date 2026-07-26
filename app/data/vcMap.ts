export interface VCEntry {
  en: string;
  zh: string;
  cat: string;
  icon: string;
  team?: string;
}

export const VC: Record<number, VCEntry> = {
  1003:{en:"Goal",zh:"进球",cat:"GOAL",icon:"⚽"},
  1004:{en:"Corner",zh:"角球",cat:"CORNER",icon:"🚩"},
  1005:{en:"Yellow Card",zh:"黄牌",cat:"YELLOW_CARD",icon:"🟨"},
  1009:{en:"Direct Free Kick",zh:"直接任意球",cat:"FREE_KICK",icon:"🎯"},
  1010:{en:"Simple Free Kick",zh:"任意球",cat:"FREE_KICK",icon:"🎯"},
  1014:{en:"Kick Off",zh:"开球",cat:"MATCH_PHASE",icon:"🔄"},
  1015:{en:"Half Time",zh:"半场结束",cat:"MATCH_PHASE",icon:"⏸"},
  1016:{en:"2nd Half",zh:"下半场",cat:"MATCH_PHASE",icon:"▶"},
  1017:{en:"Full Time",zh:"比赛结束",cat:"MATCH_PHASE",icon:"🏁"},
  1022:{en:"Penalty Shootout",zh:"点球大战",cat:"PENALTY",icon:"🎯"},
  1023:{en:"Penalty Missed",zh:"点球射失",cat:"PENALTY",icon:"❌"},
  1025:{en:"Injury",zh:"伤病",cat:"INJURY",icon:"🤕"},
  1026:{en:"Injury Time",zh:"伤停补时",cat:"INJURY",icon:"⏱"},
  1234:{en:"Offside",zh:"越位",cat:"OFFSIDE",icon:"🏳"},
  1236:{en:"Clearance",zh:"解围",cat:"OTHER",icon:"⛳"},
  1237:{en:"Zoned Throw",zh:"区域界外球",cat:"OTHER",icon:"🔄"},
  1238:{en:"Substitution",zh:"换人",cat:"SUBSTITUTION",icon:"🔄"},
  1330:{en:"VAR",zh:"VAR进行中",cat:"VAR",icon:"📺"},
  1331:{en:"VAR Red Card",zh:"VAR审核红牌",cat:"VAR",icon:"📺"},
  1332:{en:"VAR Goal",zh:"VAR审核进球",cat:"VAR",icon:"📺"},
  1333:{en:"VAR Penalty",zh:"VAR审核点球",cat:"VAR",icon:"📺"},
  2000:{en:"Match Event",zh:"比赛事件",cat:"OTHER",icon:"📌"},
  13211:{en:"Match Event",zh:"比赛事件",cat:"OTHER",icon:"📌",team:"home"},
  // Home
  11000:{en:"Home DA",zh:"主队危险进攻",cat:"ATTACK",icon:"🔴",team:"home"},
  11001:{en:"Home Attack",zh:"主队进攻",cat:"ATTACK",icon:"🔴",team:"home"},
  11002:{en:"Home Possession",zh:"主队控球",cat:"POSSESSION",icon:"●",team:"home"},
  11003:{en:"Home Goal",zh:"主队进球!",cat:"GOAL",icon:"⚽",team:"home"},
  11004:{en:"Home Corner",zh:"主队角球",cat:"CORNER",icon:"🚩",team:"home"},
  11005:{en:"Home Yellow Card",zh:"主队黄牌",cat:"YELLOW_CARD",icon:"🟨",team:"home"},
  11006:{en:"Home Red Card",zh:"主队红牌",cat:"RED_CARD",icon:"🟥",team:"home"},
  11007:{en:"Home Goal Kick",zh:"主队球门球",cat:"OTHER",icon:"🥅",team:"home"},
  11008:{en:"Home Penalty",zh:"主队点球",cat:"PENALTY",icon:"🎯",team:"home"},
  11009:{en:"Home Direct FK",zh:"主队直接任意球",cat:"FREE_KICK",icon:"🎯",team:"home"},
  11010:{en:"Home Simple FK",zh:"主队任意球",cat:"FREE_KICK",icon:"🎯",team:"home"},
  11011:{en:"Home Shot on Goal",zh:"主队射正",cat:"SHOT",icon:"🎯",team:"home"},
  11012:{en:"Home Shot off Goal",zh:"主队射偏",cat:"SHOT",icon:"⬆",team:"home"},
  11013:{en:"Home Sub",zh:"主队换人",cat:"SUBSTITUTION",icon:"🔄",team:"home"},
  11014:{en:"Home Kickoff",zh:"主队开球",cat:"MATCH_PHASE",icon:"🔄",team:"home"},
  11016:{en:"Home 2nd Half",zh:"主队下半场",cat:"MATCH_PHASE",icon:"▶",team:"home"},
  11023:{en:"Home Penalty Miss",zh:"主队点球射失",cat:"PENALTY",icon:"❌",team:"home"},
  11024:{en:"Home Throw",zh:"主队界外球",cat:"OTHER",icon:"🔄",team:"home"},
  11025:{en:"Home Injury",zh:"主队伤病",cat:"INJURY",icon:"🤕",team:"home"},
  11026:{en:"Home Injury Time",zh:"主队伤停补时",cat:"INJURY",icon:"⏱",team:"home"},
  11234:{en:"Home Offside",zh:"主队越位",cat:"OFFSIDE",icon:"🏳",team:"home"},
  11236:{en:"Home Clearance",zh:"主队解围",cat:"OTHER",icon:"⛳",team:"home"},
  11237:{en:"Home Zoned Throw",zh:"主队区域界外球",cat:"OTHER",icon:"🔄",team:"home"},
  11300:{en:"Home Take-On DA",zh:"主队带球危险进攻",cat:"ATTACK",icon:"🔴",team:"home"},
  11301:{en:"Home Take-On Attack",zh:"主队带球进攻",cat:"ATTACK",icon:"🔴",team:"home"},
  11302:{en:"Home Take-On Safe",zh:"主队安全控球",cat:"POSSESSION",icon:"●",team:"home"},
  // Away
  21000:{en:"Away DA",zh:"客队危险进攻",cat:"ATTACK",icon:"🔵",team:"away"},
  21001:{en:"Away Attack",zh:"客队进攻",cat:"ATTACK",icon:"🔵",team:"away"},
  21002:{en:"Away Possession",zh:"客队控球",cat:"POSSESSION",icon:"●",team:"away"},
  21003:{en:"Away Goal",zh:"客队进球!",cat:"GOAL",icon:"⚽",team:"away"},
  21004:{en:"Away Corner",zh:"客队角球",cat:"CORNER",icon:"🚩",team:"away"},
  21005:{en:"Away Yellow Card",zh:"客队黄牌",cat:"YELLOW_CARD",icon:"🟨",team:"away"},
  21006:{en:"Away Red Card",zh:"客队红牌",cat:"RED_CARD",icon:"🟥",team:"away"},
  21007:{en:"Away Goal Kick",zh:"客队球门球",cat:"OTHER",icon:"🥅",team:"away"},
  21008:{en:"Away Penalty",zh:"客队点球",cat:"PENALTY",icon:"🎯",team:"away"},
  21009:{en:"Away Direct FK",zh:"客队直接任意球",cat:"FREE_KICK",icon:"🎯",team:"away"},
  21010:{en:"Away Simple FK",zh:"客队任意球",cat:"FREE_KICK",icon:"🎯",team:"away"},
  21011:{en:"Away Shot on Goal",zh:"客队射正",cat:"SHOT",icon:"🎯",team:"away"},
  21012:{en:"Away Shot off Goal",zh:"客队射偏",cat:"SHOT",icon:"⬆",team:"away"},
  21013:{en:"Away Sub",zh:"客队换人",cat:"SUBSTITUTION",icon:"🔄",team:"away"},
  21014:{en:"Away Kickoff",zh:"客队开球",cat:"MATCH_PHASE",icon:"🔄",team:"away"},
  21016:{en:"Away 2nd Half",zh:"客队下半场",cat:"MATCH_PHASE",icon:"▶",team:"away"},
  21023:{en:"Away Penalty Miss",zh:"客队点球射失",cat:"PENALTY",icon:"❌",team:"away"},
  21024:{en:"Away Throw",zh:"客队界外球",cat:"OTHER",icon:"🔄",team:"away"},
  21025:{en:"Away Injury",zh:"客队伤病",cat:"INJURY",icon:"🤕",team:"away"},
  21026:{en:"Away Injury Time",zh:"客队伤停补时",cat:"INJURY",icon:"⏱",team:"away"},
  21234:{en:"Away Offside",zh:"客队越位",cat:"OFFSIDE",icon:"🏳",team:"away"},
  21236:{en:"Away Clearance",zh:"客队解围",cat:"OTHER",icon:"⛳",team:"away"},
  21237:{en:"Away Zoned Throw",zh:"客队区域界外球",cat:"OTHER",icon:"🔄",team:"away"},
  21300:{en:"Away Take-On DA",zh:"客队带球危险进攻",cat:"ATTACK",icon:"🔵",team:"away"},
  21301:{en:"Away Take-On Attack",zh:"客队带球进攻",cat:"ATTACK",icon:"🔵",team:"away"},
  21302:{en:"Away Take-On Safe",zh:"客队安全控球",cat:"POSSESSION",icon:"●",team:"away"},
};

export const POSS_CODES = new Set([11002,21002,11001,21001,11000,21000,11300,21300,11301,21301,11302,21302]);

export function vcInfo(code: number): VCEntry {
  return VC[code] || {en:`Event ${code}`,zh:`事件${code}`,cat:"OTHER",icon:"📌",team:code>=21000?"away":code>=11000?"home":"neutral"};
}
