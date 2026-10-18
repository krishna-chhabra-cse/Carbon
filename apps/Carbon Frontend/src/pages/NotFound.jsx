import { Link } from 'react-router-dom';
import { SiteShell } from '../components/site/SiteShell';

export default function NotFound() {
  return (
    <SiteShell title="Page not found">
      <section className="cx-wrap pt-16 md:pt-24 max-w-xl">
        <div className="cx-label mb-3">404</div>
        <h1 className="cx-h1 text-4xl md:text-5xl">This page doesn’t exist.</h1>
        <p className="mt-3" style={{ color: 'var(--cx-muted)' }}>The link may be old or mistyped.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/create" className="cx-btn cx-btn-primary">Make a video</Link>
          <Link to="/" className="cx-btn cx-btn-ghost">Home</Link>
        </div>
      </section>
    </SiteShell>
  );
}
