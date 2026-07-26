import { useRef, useEffect } from 'react';
import { innerToPercent, CENTER_FIELD } from '~/data/coords';
import type { LiveTracker, MatchState, TooltipData } from '~/engine/LiveTracker';

interface FieldViewProps {
  tracker: LiveTracker;
  state: MatchState;
}

export default function FieldView({ tracker, state }: FieldViewProps) {
  const refs = useRef<Record<string, SVGElement | null>>({});

  // Register refs with tracker on mount
  useEffect(() => {
    tracker.setRefs(refs.current);
  }, [tracker]);

  // Re-apply imperative SVG state after React re-renders
  useEffect(() => {
    if (tracker._applyAnimations) tracker._applyAnimations();
  });

  const setRef = (name: string) => (el: SVGElement | null) => { if (el) refs.current[name] = el; };

  // Tooltip data — positioned above the ball
  const bp = state.ballPos || CENTER_FIELD;
  const { px, py } = innerToPercent(bp.x, bp.y);

  let tooltip: TooltipData | null = null;
  if (state.activeTooltip) {
    const tt = state.activeTooltip;
    tooltip = {
      ...tt,
      text: (tt.text || '').replace('主队', '').replace('客队', ''),
      team: tt.team === 'home' ? (tracker.team1 || 'Home') : tt.team === 'away' ? (tracker.team2 || 'Away') : '',
    };
  } else if (state.currentVC) {
    const vc = state.currentVC;
    tooltip = {
      x: 0, y: 0,
      icon: vc.info.icon || '',
      text: vc.info.zh.replace('主队', '').replace('客队', ''),
      player: state.currentPG || vc.pg || '',
      team: vc.team === 'home' ? (tracker.team1 || 'Home') : vc.team === 'away' ? (tracker.team2 || 'Away') : '',
    };
  }

  return (
    <div className="field-scene">
      <div className="field-wrap">
        <img src="/data/venue.png" alt="venue" className="venue-img" />
        <img src="/data/pitch.svg" alt="pitch" className="pitch-img" />

        <svg className="overlay" viewBox="0 0 297 210" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ballGlowH" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="30%" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ballGlowA" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffd43b" stopOpacity="1" />
              <stop offset="30%" stopColor="#ffd43b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffd43b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="fbBody" cx=".4" cy=".3" r=".8">
              <stop offset="0" stopColor="#fff" />
              <stop offset=".4" stopColor="#fff" />
              <stop offset=".8" stopColor="#EEE" />
            </radialGradient>
            <radialGradient id="fbShade" cx=".5" cy=".5" r=".5">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".8" stopColor="#fff" stopOpacity="0" />
              <stop offset=".99" stopOpacity=".3" />
              <stop offset="1" />
            </radialGradient>
            <clipPath id="fbClip"><circle r="100" /></clipPath>
            <g id="fbPattern" strokeLinejoin="round" clipPath="url(#fbClip)">
              <path d="M6-32q20 4 40 13 11-16 18-28-14-21-27-29-20 1-36 8 3 17 5 36M-26-2q-19-6-36-9-12 16-14 33 7 18 26 32 18-7 33-15-6-24-9-41m-69 24q-7-10-7-30v88h17q-10-35-10-58m150 2Q41 41 24 52q4 13 7 27 24-1 37-12 10-17 12-32-15-7-25-11M0 120l-3-25q-22-2-39-13-8 2-18-1M-90-48q10-4 22-1 16-22 33-28 0-23-5-23h-60m200 45L87-37Q98-10 97 5l3 1" />
              <path fill="none" d="M6-32Q-18-12-26-2m72-17q8 24 9 43m9-71q13 3 23 10M37-76q2-14-1-24M1-68q-14-9-36-9m-27 66q-5-14-6-38m-8 71q-9 2-19 0m45 32q1 16 8 28m25-43q17 9 41 13m7 27Q20 92-3 95m71-28 12 13m0-45Q90 25 97 5" />
            </g>
            <g id="footballIcon">
              <circle r="100" fill="#fff" />
              <circle r="100" fill="url(#fbBody)" />
              <use href="#fbPattern" stroke="#EEE" strokeWidth="7" />
              <use href="#fbPattern" stroke="#DDD" strokeWidth="4" />
              <use href="#fbPattern" stroke="#999" strokeWidth="2" />
              <use href="#fbPattern" stroke="#000" />
              <circle r="100" fill="url(#fbShade)" />
            </g>
          </defs>

          <g transform="matrix(0.26458333,0,0,0.26458333,32.609401,65.462639)">
            {/* Possession tints */}
            <rect ref={setRef('homeTint')} x="55" y="30" width="354" height="140" fill="#fff" opacity="0" />
            <rect ref={setRef('awayTint')} x="409" y="30" width="356" height="140" fill="#ffd43b" opacity="0" />

            {/* Ball trail — white thin lines + joint dots */}
            <g ref={setRef('ballTrail')} opacity="0">
              <line ref={setRef('trailLine0')} x1="0" y1="0" x2="0" y2="0" stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0" />
              <line ref={setRef('trailLine1')} x1="0" y1="0" x2="0" y2="0" stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0" />
              <line ref={setRef('trailLine2')} x1="0" y1="0" x2="0" y2="0" stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0" />
              <circle ref={setRef('trailDot0')} cx="0" cy="0" r="2.2" fill="#fff" opacity="0" />
              <circle ref={setRef('trailDot1')} cx="0" cy="0" r="2.2" fill="#fff" opacity="0" />
              <circle ref={setRef('trailDot2')} cx="0" cy="0" r="2.2" fill="#fff" opacity="0" />
              <circle ref={setRef('trailDot3')} cx="0" cy="0" r="2.2" fill="#fff" opacity="0" />
            </g>

            {/* Ball */}
            <g ref={setRef('ballGroup')} opacity="0">
              <g className="shadow-pulse">
                <ellipse cx="0" cy="10" rx="12" ry="4.5" fill="#000" fillOpacity="0.35" />
              </g>
              <g className="shadow-pulse2">
                <ellipse cx="0" cy="7" rx="7" ry="2.5" fill="#000" fillOpacity="0.25" />
              </g>
              <g className="ball-bounce">
                <circle ref={setRef('ballGlow')} cx="0" cy="0" r="24" fill="url(#ballGlowH)" opacity="0" />
                <use href="#footballIcon" transform="scale(0.07)" />
              </g>
            </g>

            <circle ref={setRef('targetFlash')} cx="0" cy="0" r="0" fill="none" stroke="#fff" strokeWidth="3" opacity="0" />

            {/* Event animations */}
            <circle ref={setRef('goalPulse1')} cx="0" cy="0" r="0" fill="none" stroke="#ffd700" strokeWidth="3" opacity="0" />
            <circle ref={setRef('goalPulse2')} cx="0" cy="0" r="0" fill="none" stroke="#ffd700" strokeWidth="2" opacity="0" />
            <g ref={setRef('cardAnim')} opacity="0">
              <rect ref={setRef('cardRect')} x="0" y="0" width="28" height="38" rx="3" fill="#ffeb3b" stroke="#222" strokeWidth="2" />
            </g>
            <g ref={setRef('injuryCross')} opacity="0">
              <line x1="0" y1="0" x2="0" y2="0" stroke="#f85149" strokeWidth="4" strokeLinecap="round" />
              <line x1="0" y1="0" x2="0" y2="0" stroke="#f85149" strokeWidth="4" strokeLinecap="round" />
            </g>
            <g ref={setRef('cornerAnim')} opacity="0">
              <polygon points="0,0 -10,-6 -2,-12" fill="#e74c3c" stroke="#fff" strokeWidth="0.5" />
              <line x1="0" y1="0" x2="0" y2="14" stroke="#fff" strokeWidth="1.5" />
            </g>
            <g ref={setRef('foulBurst')} opacity="0">
              <circle cx="0" cy="0" r="0" fill="none" stroke="#ff9800" strokeWidth="3" />
              <line x1="0" y1="0" x2="0" y2="0" stroke="#ff5722" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="0" x2="0" y2="0" stroke="#ff5722" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <g ref={setRef('subAnim')} opacity="0">
              <rect x="0" y="0" width="36" height="22" rx="6" fill="#21262d" stroke="#58a6ff" strokeWidth="2" />
              <text x="18" y="15" textAnchor="middle" fontSize="12" fill="#58a6ff" fontWeight="700">↔</text>
            </g>

            <line ref={setRef('shotLine')} x1="0" y1="0" x2="0" y2="0" stroke="#ff0" strokeWidth="2.5" opacity="0" strokeDasharray="8,5" />
            <path ref={setRef('missCurve')} d="" fill="none" stroke="#ff9800" strokeWidth="2" opacity="0" strokeDasharray="6,4" />
          </g>
        </svg>

        {/* HTML Tooltip — above the ball */}
        {tooltip && (
          <div className="html-tooltip" style={{ left: px + '%', top: (py - 2) + '%' }}>
            <div className="tt-inner">
              {tooltip.team && <div className="tt-team">{tooltip.team}</div>}
              <div className="tt-event-line">
                {tooltip.icon && <span className="tt-icon">{tooltip.icon}</span>}
                <span className="tt-event">{tooltip.text}</span>
                {tooltip.player && <span className="tt-player">{tooltip.player}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
