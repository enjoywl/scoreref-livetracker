import { memo } from 'react';
import { BRAND, buildPanels } from '~/data/pitchBoards';

/** 静态场地广告栏：板面填充和顶沿高光。会动的 "ScoreRef" 跑马灯不在这里，
 *  而是 BoardMarqueeLayer 的 HTML 合成层——SVG 里的 CSS transform 动画不进
 *  合成器，每帧都要重绘整块 overlay；拆出去后 38 块面板在软件渲染下的 GPU
 *  开销从约 23% 降到约 5%（20fps）。 */
const PitchBoards = memo(function PitchBoards() {
  const panels = buildPanels();
  return (
    <g className="pitch-boards" aria-hidden="true">
      {panels.map((p) => (
        <g key={p.key}>
          <polygon points={p.points.map((q) => `${q.x},${q.y}`).join(' ')} fill={p.fill} />
          <line
            x1={p.rail[0]}
            y1={p.rail[1]}
            x2={p.rail[2]}
            y2={p.rail[3]}
            stroke={BRAND}
            strokeWidth="0.18"
            strokeOpacity="0.4"
          />
        </g>
      ))}
    </g>
  );
});

/** 远端两个角旗在真实空间里位于广告栏前方, 重绘在跑马灯层之上, 加高广告栏时
 *  角旗不会被盖住。坐标与 pitch_v4.svg 中的 top-left/top-right-corner-flag
 *  完全一致。 */
export const PitchCornerFlags = memo(function PitchCornerFlags() {
  return (
    <g className="pitch-corner-flags">
      <g transform="matrix(1.183625,-0.00413164,0.00470069,1.3466416,-30.995529,-47.708281)">
        <path d="M 82,89.418 V 85.218" fill="none" stroke="#e8e8e8" strokeWidth="0.34" strokeLinecap="round" />
        <path d="m 82,85.218 -1.6,0.575 1.6,0.575 z" fill="#ef3340" stroke="#d92735" strokeWidth="0.12" strokeLinejoin="round" />
        <path d="M 242,89.627 V 85.427" fill="none" stroke="#e8e8e8" strokeWidth="0.34" strokeLinecap="round" />
        <path d="m 242,85.427 1.6,0.575 -1.6,0.575 z" fill="#ef3340" stroke="#d92735" strokeWidth="0.12" strokeLinejoin="round" />
      </g>
    </g>
  );
});

export default PitchBoards;
