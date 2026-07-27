/**
 * 测试事件列表 — 开发者在此填入自定义事件进行开发调试
 *
 * 支持的字段（所有字段可选）：
 *   XY: string              — 坐标 "x,y"，如 "410,100"（球场中心）
 *   DeltaMilliseconds: number — 距上一条事件的毫秒数
 *   VC: number              — 事件类型码（见 vcMap.ts）
 *   PG: string              — 球员/传球描述
 *   PD: string              — 额外球员
 *   TM: string              — 比赛分钟
 *   SS: string              — 比分 "1-0"
 *   Player1: string         — 主队名
 *   Player2: string         — 客队名
 *   Champ: string           — 联赛名
 *
 * 常见 VC 事件码：
 *   进球: 11003(主)/21003(客)
 *   射正: 11011(主)/21011(客)    射偏: 11012(主)/21012(客)
 *   角球: 11004(主)/21004(客)    黄牌: 11005(主)/21005(客)
 *   红牌: 11006(主)/21006(客)    点球: 11008(主)/21008(客)
 *   任意球: 11009(主)/21009(客)   越位: 11234(主)/21234(客)
 *   换人: 11013(主)/21013(客)     伤病: 11025(主)/21025(客)
 *   球门球: 11007(主)/21007(客)   界外球: 11024(主)/21024(客)
 *   进攻: 11001(主)/21001(客)     危险进攻: 11000(主)/21000(客)
 *   控球: 11002(主)/21002(客)     安全控球: 11302(主)/21302(客)
 *   开球: 1014                   半场: 1015
 *   全场: 1017                   VAR: 1330/1331/1332/1333
 *
 * 设置 useCustomEvents = true 后，启动 dev server 即可看到自定义事件
 */
export const useCustomEvents = false;

export const customEvents: Array<Record<string, string>> = [
  // 示例：填入你自己的事件列表
  // { Player1: 'Home FC', Player2: 'Away FC', Champ: 'Test League', VC: '1014', TM: '0', SS: '0-0' },
  // { XY: '410,100', DeltaMilliseconds: '2000', VC: '11002', PG: 'Midfielder', TM: '1', SS: '0-0' },
  // { XY: '500,120', DeltaMilliseconds: '3000', VC: '11001', PG: 'Winger', TM: '3', SS: '0-0' },
  // { XY: '650,100', DeltaMilliseconds: '2000', VC: '11000', PG: 'Striker', TM: '5', SS: '0-0' },
  // { XY: '700,100', DeltaMilliseconds: '500',  VC: '11011', PG: 'Striker', PD: 'Assist', TM: '6', SS: '1-0' },
  // { XY: '700,100', DeltaMilliseconds: '1000', VC: '11003', PG: 'Striker', PD: 'Assist', TM: '6', SS: '1-0' },
];
