import { Link } from 'react-router';

/**
 * Site-wide footer, rendered once in the root layout so every route
 * (including the error boundary) gets it. It takes its own row below the
 * page, so full-bleed screens (.app, .event-demo) shrink by its height
 * instead of being covered.
 */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} ScoreRef</span>
      {/* 调试页只在本地 dev server 注册，线上不展示入口 */}
      {import.meta.env.DEV && (
        <nav className="site-footer-nav" aria-label="Site">
          <Link to="/">首页</Link>
          <Link to="/event-demo">事件演示</Link>
          <Link to="/kit-preview">球衣预览</Link>
        </nav>
      )}
    </footer>
  );
}
