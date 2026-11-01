import { useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import type { LiveTracker, MatchState } from '~/engine/LiveTracker';
import { buildBreakSlides, computeBreakStats, type BreakRow } from '~/lib/breakStats';
import EntityImage from './EntityImage';

interface BreakStatsOverlayProps {
  tracker: LiveTracker;
  state: MatchState;
  data: NonNullable<MatchState['breakStats']>;
}

const SLIDE_MS = 7000;

function fmt(value: number | null, suffix = ''): string {
  return value == null ? '—' : `${value}${suffix}`;
}

function StatsRow({ row }: { row: BreakRow }) {
  // 两侧条形按同一基准(两队最大值)归一, 条长可直接比较
  const home = row.home ?? 0;
  const away = row.away ?? 0;
  const max = Math.max(home, away);
  const homePct = max > 0 ? (home / max) * 100 : 0;
  const awayPct = max > 0 ? (away / max) * 100 : 0;
  return (
    <div className="bs-row">
      <span className="bs-value is-home">{fmt(row.home, row.suffix)}</span>
      <span className="bs-track is-home" aria-hidden="true">
        <i className="bs-fill is-home" style={{ width: `${homePct}%` }} />
      </span>
      <span className="bs-row-label">{row.label}</span>
      <span className="bs-track is-away" aria-hidden="true">
        <i className="bs-fill is-away" style={{ width: `${awayPct}%` }} />
      </span>
      <span className="bs-value is-away">{fmt(row.away, row.suffix)}</span>
    </div>
  );
}

export default function BreakStatsOverlay({ tracker, state, data }: BreakStatsOverlayProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const stats = useMemo(
    () => computeBreakStats(tracker.events, data.cutoffT, data.feed),
    [tracker.events, state.t, data.cutoffT, data.feed],
  );
  const slides = useMemo(() => buildBreakSlides(stats), [stats]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [paused, slides.length, cycle]);

  const go = (next: number) => {
    if (slides.length < 2) return;
    setIndex(((next % slides.length) + slides.length) % slides.length);
    setCycle((n) => n + 1);
  };

  // 移动端没有左右箭头：按住暂停轮播，横向滑动超过阈值切换一页。
  // 竖向滑动（|dy| 较大）不处理，避免误触。
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setPaused(true);
    const touch = e.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    setPaused(false);
    const start = touchStart.current;
    touchStart.current = null;
    const touch = e.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    go(dx < 0 ? index + 1 : index - 1);
  };

  const handleTouchCancel = () => {
    touchStart.current = null;
    setPaused(false);
  };

  const homeName = tracker.team1 || 'Home';
  const awayName = tracker.team2 || 'Away';
  const homeColor = tracker.team1Color || 'var(--home)';
  const awayColor = tracker.team2Color || 'var(--away)';
  const slide = slides[index] ?? null;
  const cardStyle = {
    '--bs-home': homeColor,
    '--bs-away': awayColor,
  } as CSSProperties;

  return (
    <div
      className="break-stats"
      role="region"
      aria-label={data.et ? '加时中场统计' : data.kind === 'half' ? '半场统计' : '全场统计'}
      data-break={data.kind}
    >
      <div
        className="bs-shell"
        style={cardStyle}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <div className={'break-stats-card' + (slide?.key === 'score' ? ' is-score-slide' : '')}>
          <header className="bs-head">
            <span className="bs-kicker">
              {data.et ? 'ET HALF TIME' : data.kind === 'half' ? 'HALF TIME' : 'FULL TIME'}
            </span>
            <div className="bs-scoreline">
              <div className="bs-team is-home">
                <EntityImage
                  type="team"
                  id={tracker.team1Id}
                  alt={homeName}
                  className="bs-crest"
                  fallbackColor={homeColor}
                />
                <span className="bs-team-name">{homeName}</span>
              </div>
              <span className="bs-score">{state.score}</span>
              <div className="bs-team is-away">
                <span className="bs-team-name">{awayName}</span>
                <EntityImage
                  type="team"
                  id={tracker.team2Id}
                  alt={awayName}
                  className="bs-crest"
                  fallbackColor={awayColor}
                />
              </div>
            </div>
          </header>

          {/* 第一页只有头部（球队与比分），不渲染统计主体；第二页展示全部统计 */}
          {slide && slide.rows.length > 0 ? (
            <div className="bs-slide" key={slide.key} data-slide={slide.key}>
              <div className="bs-slide-title">{slide.title}</div>
              {/* 统计项较多时按两列排布, 一页放得下全部数据; 行数按实际条目数交给 CSS 变量 */}
              <div
                className={'bs-rows' + (slide.rows.length > 4 ? ' is-columns' : '')}
                style={
                  slide.rows.length > 4
                    ? ({ '--bs-rows-wide': Math.ceil(slide.rows.length / 2) } as CSSProperties)
                    : undefined
                }
              >
                {slide.rows.map((row) => (
                  <StatsRow key={row.label} row={row} />
                ))}
              </div>
            </div>
          ) : slide ? null : (
            <div className="bs-empty">统计暂不可用</div>
          )}

          {slides.length > 1 && (
            <div className="bs-dots" aria-label="统计页">
              {slides.map((item, i) => (
                <button
                  key={item.key}
                  type="button"
                  className={'bs-dot' + (i === index ? ' is-active' : '')}
                  aria-label={`${item.title}${i === index ? '（当前）' : ''}`}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => go(i)}
                />
              ))}
            </div>
          )}
        </div>

        {slides.length > 1 && (
          <>
            <button type="button" className="bs-nav is-prev" aria-label="上一页" onClick={() => go(index - 1)}>
              ‹
            </button>
            <button type="button" className="bs-nav is-next" aria-label="下一页" onClick={() => go(index + 1)}>
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
}
