import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import '../../site.css';

const links = [
  { to: '/create', label: 'Create' },
  { to: '/roast', label: 'Roast' },
  { to: '/app', label: 'Go deeper' },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight text-lg" aria-label="Carbon home">
      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'var(--cx-ember)', boxShadow: '0 0 14px var(--cx-ember)' }} />
      carbon
    </Link>
  );
}

export function SiteNav() {
  const { signedIn, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b" style={{ borderColor: 'var(--cx-line)', background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(10px)' }}>
      <div className="cx-wrap flex items-center justify-between h-16">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm" style={{ color: 'var(--cx-muted)' }}>
          {links.map((l) =>
            l.to.includes('#') ? (
              <a key={l.to} href={l.to} className="hover:text-white">{l.label}</a>
            ) : (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'text-white' : 'hover:text-white')}>{l.label}</NavLink>
            )
          )}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {signedIn ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-2 text-sm" style={{ color: 'var(--cx-muted)' }}>
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full" /> : null}
                My videos
              </Link>
              <button className="cx-btn cx-btn-ghost" style={{ height: 36 }} onClick={async () => { navigate('/', { replace: true }); await signOut(); }} aria-label="Sign out" title="Sign out">
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <Link to="/login" className="cx-btn cx-btn-ghost" style={{ height: 36 }}>Sign in</Link>
          )}
          <Link to="/create" className="cx-btn cx-btn-primary" style={{ height: 36 }}>Make a video</Link>
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open ? (
        <div className="md:hidden border-t" style={{ borderColor: 'var(--cx-line)' }}>
          <div className="cx-wrap py-3 flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-1">{l.label}</Link>
            ))}
            {signedIn ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="py-1">My videos</Link>
                <button type="button" className="py-1 text-left flex items-center gap-2" style={{ color: 'var(--cx-muted)' }} onClick={async () => { setOpen(false); navigate('/', { replace: true }); await signOut(); }}>
                  <LogOut size={15} /> Sign out{user?.email ? <span className="text-xs truncate" style={{ color: 'var(--cx-dim)' }}>({user.email})</span> : null}
                </button>
              </>
            ) : <Link to="/login" onClick={() => setOpen(false)} className="py-1">Sign in</Link>}
            <Link to="/create" className="cx-btn cx-btn-primary" onClick={() => setOpen(false)}>Make a video</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t mt-24" style={{ borderColor: 'var(--cx-line)' }}>
      <div className="cx-wrap py-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between text-sm" style={{ color: 'var(--cx-dim)' }}>
        <div className="flex items-center gap-3">
          <Logo />
          <span>Launch videos and decks from your repo or website.</span>
        </div>
        <div className="flex gap-6">
          <Link to="/roast" className="hover:text-white">Roast my codebase</Link>
          <Link to="/app" className="hover:text-white">Go deeper</Link>
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <a href="https://github.com/krishna-chhabra-cse/Carbon" className="hover:text-white" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children, title }) {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (title) document.title = `${title} · Carbon`;
  }, [title]);
  // Client-side links like /#early-access: scroll to the section (or to the
  // top on a new page), since the router doesn't do it.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    const t = setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [pathname, hash]);
  return (
    <div className="cx">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
