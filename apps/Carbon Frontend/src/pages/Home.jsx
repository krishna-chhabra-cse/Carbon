import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Download, Film, Flame, GitBranch, Globe, Network, Presentation, ScanSearch, Sparkles } from 'lucide-react';
import { SiteShell } from '../components/site/SiteShell';
import DemoPlayer from '../components/site/DemoPlayer';
import EarlyAccess, { ComingSoonList } from '../components/site/EarlyAccess';

// Chapter starts in the 1:48 demo (scene lengths from the film's bar grid).
const DEMO_CHAPTERS = [
  { t: 0, label: 'Intro' },
  { t: 16, label: 'How it works' },
  { t: 26, label: 'Reads your code + site' },
  { t: 34, label: 'The launch video' },
  { t: 50, label: 'The pitch deck' },
  { t: 62, label: 'Roast my codebase' },
  { t: 74, label: 'Go deeper' },
  { t: 94, label: 'Get started', end: 108 },
];

function UrlForm({ big = false }) {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();
  return (
    <form
      className={`flex flex-col sm:flex-row gap-3 w-full ${big ? 'max-w-2xl' : 'max-w-xl'}`}
      onSubmit={(e) => {
        e.preventDefault();
        navigate(`/create${url.trim() ? `?url=${encodeURIComponent(url.trim())}` : ''}`);
      }}
    >
      <input
        className="cx-input cx-mono"
        placeholder="github.com/you/app  or  your-app.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        aria-label="GitHub repo or website URL"
      />
      <button className="cx-btn cx-btn-primary" style={{ height: 52 }} type="submit">
        Make my video <ArrowRight size={17} />
      </button>
    </form>
  );
}

const Section = ({ id, label, title, children, className = '' }) => (
  <section id={id} className={`cx-wrap pt-24 ${className}`}>
    {label ? <div className="cx-label mb-3">{label}</div> : null}
    {title ? <h2 className="cx-h2 text-3xl md:text-5xl mb-8 max-w-3xl">{title}</h2> : null}
    {children}
  </section>
);

const steps = [
  { icon: GitBranch, title: 'Paste a URL', body: 'A public GitHub repo or a live website.' },
  { icon: ScanSearch, title: 'Carbon reads it', body: 'Code, README, pages and brand: real stats, real code, real screenshots.' },
  { icon: Film, title: 'Get video + deck', body: 'A 30-second launch video and an editable .pptx deck, in a few minutes.' },
];

export default function Home() {
  return (
    <SiteShell title="Launch videos from your repo or website">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 cx-lattice opacity-60 pointer-events-none" />
        <div className="absolute -top-40 right-[-10%] w-[620px] h-[620px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,91,31,0.22), transparent 60%)' }} />
        <div className="cx-wrap relative pt-16 md:pt-24 pb-10">
          <div className="cx-label mb-5">Repo or website in · Launch video + deck out</div>
          <h1 className="cx-h1 text-5xl sm:text-6xl md:text-8xl max-w-4xl">
            You shipped it.<br />
            <span style={{ color: 'var(--cx-ember)' }}>Now sell it.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl max-w-2xl" style={{ color: 'var(--cx-muted)' }}>
            Paste a GitHub repo or a website. Carbon reads it and makes a 30-second, beat-synced launch video and an editable pitch deck, in minutes.
          </p>
          <div className="mt-8"><UrlForm big /></div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm cx-mono" style={{ color: 'var(--cx-dim)' }}>
            <span className="flex items-center gap-2"><Check size={14} color="var(--cx-green)" /> 2 free videos a day</span>
            <span className="flex items-center gap-2"><Check size={14} color="var(--cx-green)" /> free account, no card</span>
            <a href="#early-access" className="flex items-center gap-2 hover:text-white"><Check size={14} color="var(--cx-green)" /> early access open</a>
          </div>

          <div className="mt-14">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4">
              <div>
                <div className="cx-label">Watch the demo · 1:48</div>
                <div className="mt-1 text-xl md:text-2xl font-bold">What Carbon makes from one link.</div>
              </div>
              <div className="text-sm max-w-md" style={{ color: 'var(--cx-muted)' }}>
                This is a <b className="text-white">demo of the product</b>, not a customer video. The launch videos you get are 30 seconds; see a real sample below.
              </div>
            </div>
            <div className="cx-corner">
              <DemoPlayer
                src="/media/carbon-demo.mp4"
                poster="/media/carbon-demo-poster.jpg"
                badge="Demo · what Carbon can do"
                title="The Carbon tour: repo in, launch video + deck out"
                chapters={DEMO_CHAPTERS}
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <Section id="how" label="How it works" title="Three steps. That's it.">
        <div className="grid md:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <div key={s.title} className="cx-card p-6">
              <div className="flex items-center justify-between mb-6">
                <s.icon size={26} color="var(--cx-ember)" />
                <span className="cx-mono text-sm" style={{ color: 'var(--cx-dim)' }}>0{i + 1}</span>
              </div>
              <div className="text-xl font-bold mb-2">{s.title}</div>
              <div style={{ color: 'var(--cx-muted)' }}>{s.body}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Output 01 */}
      <Section id="video" label="Output 01 · the launch video" title="A 30-second launch video.">
        <div className="grid md:grid-cols-5 gap-8 items-start">
          <div className="md:col-span-3">
            <video className="cx-video" src="/media/sample-fastify.mp4" poster="/media/sample-fastify-poster.jpg" controls preload="none" playsInline />
            <div className="mt-3 cx-mono text-xs" style={{ color: 'var(--cx-dim)' }}>SAMPLE OUTPUT · GITHUB.COM/FASTIFY/FASTIFY · 1080P · 0:30</div>
          </div>
          <ul className="md:col-span-2 space-y-4">
            {[
              ['Storyboard from the repo', 'Real numbers from the GitHub API and real code from the README. Nothing invented.'],
              ['Brand colors + type', 'Your language color for repos, your site’s accent and screenshots for websites.'],
              ['Motion scenes', 'Kinetic title, live stat, typed code or site tour, feature tree and an end card.'],
              ['Music + beat sync', 'An original soundtrack. Every cut lands on the beat.'],
            ].map(([t, b]) => (
              <li key={t} className="flex gap-3">
                <Check size={18} color="var(--cx-ember)" className="mt-1 shrink-0" />
                <div><div className="font-semibold">{t}</div><div className="text-sm" style={{ color: 'var(--cx-muted)' }}>{b}</div></div>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Output 02 */}
      <Section id="deck" label="Output 02 · the deck" title="And a deck worth presenting.">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="cx-card p-6">
            <Presentation size={26} color="var(--cx-ember)" />
            <p className="mt-4" style={{ color: 'var(--cx-muted)' }}>
              Every video comes with an editable PowerPoint deck built from the same storyboard. Open it in PowerPoint, Keynote or Google Slides and change anything.
            </p>
            <a className="cx-btn cx-btn-ghost mt-6" href="/media/sample-fastify.pptx" download>
              <Download size={16} /> Download a sample deck
            </a>
          </div>
          <ol className="cx-card p-6 grid grid-cols-2 gap-3 cx-mono text-sm">
            {['01 · Title + tagline', '02 · Why people pick it', '03 · Architecture', '04 · API in one glance', '05 · By the numbers', '06 · Get started'].map((s) => (
              <li key={s} className="p-3 rounded-lg" style={{ background: 'var(--cx-panel-2)', border: '1px solid var(--cx-line)' }}>{s}</li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Roast + go deeper */}
      <Section label="Free extras">
        <div className="grid md:grid-cols-2 gap-6">
          <Link to="/roast" className="cx-card p-7 block hover:border-white/30 transition">
            <div className="flex items-center gap-3"><Flame color="var(--cx-ember)" /><span className="cx-label">Free · no signup</span></div>
            <div className="cx-h2 text-3xl mt-4">Roast my codebase.</div>
            <p className="mt-3" style={{ color: 'var(--cx-muted)' }}>A brutally honest score out of 10, backed by real metrics: god files, test ratio, circular deps. Shareable link included.</p>
            <div className="mt-5 inline-flex items-center gap-2 font-semibold" style={{ color: 'var(--cx-ember)' }}>Get roasted <ArrowRight size={16} /></div>
          </Link>
          <Link to="/app" className="cx-card p-7 block hover:border-white/30 transition">
            <div className="flex items-center gap-3"><Network color="var(--cx-ember)" /><span className="cx-label">Go deeper</span></div>
            <div className="cx-h2 text-3xl mt-4">See how it all connects.</div>
            <p className="mt-3" style={{ color: 'var(--cx-muted)' }}>Architecture graph, API explorer and business logic explained in plain English, for any public repo.</p>
            <div className="mt-5 inline-flex items-center gap-2 font-semibold" style={{ color: 'var(--cx-ember)' }}>Explore a repo <ArrowRight size={16} /></div>
          </Link>
        </div>
      </Section>

      {/* Early access (no pricing yet) */}
      <Section id="early-access" label="Early access" title="Want more than 2 videos a day?">
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div>
            <p className="text-lg" style={{ color: 'var(--cx-muted)' }}>
              Everyone gets 2 free videos a day. Join early access and you'll be first in line for what we're building next:
            </p>
            <ComingSoonList className="mt-5 text-base" />
            <p className="mt-5 text-sm" style={{ color: 'var(--cx-dim)' }}>
              Tell us what you'd make and we'll reach out when your spot opens.
            </p>
          </div>
          <EarlyAccess showComing={false} source="home" />
        </div>
      </Section>

      {/* FAQ */}
      <Section label="FAQ" title="Questions.">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ['What do I get?', 'A 30-second (or 15-second) MP4 launch video (16:9) and an editable PowerPoint deck. Download both, and share a public link.'],
            ['How long does it take?', 'Usually 1–3 minutes, depending on the queue.'],
            ['Where do the facts come from?', 'Only from your repo (GitHub API + README) or your website. Stats and code are copied, never made up.'],
            ['Private repos?', 'Public repos and public websites for now.'],
            ['Do I need an account?', 'To make videos, yes: sign up with your email or Google. Roast my codebase needs no account.'],
            ['What if a render fails?', 'It doesn’t count toward your free limit.'],
            ['Is it free?', 'Yes: 2 videos a day, 720p with a small watermark. Want longer videos, more categories or more soundtracks? Join early access.'],
          ].map(([q, a]) => (
            <div key={q} className="cx-card p-6">
              <div className="font-semibold">{q}</div>
              <div className="mt-2 text-sm" style={{ color: 'var(--cx-muted)' }}>{a}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <section className="cx-wrap pt-24">
        <div className="cx-card p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 cx-lattice opacity-50" />
          <div className="relative">
            <div className="flex justify-center gap-3 mb-4"><GitBranch color="var(--cx-ember)" /><Globe color="var(--cx-ember)" /><Sparkles color="var(--cx-ember)" /></div>
            <h2 className="cx-h1 text-4xl md:text-6xl">Paste a repo.<br />Get a launch video.</h2>
            <div className="mt-8 flex justify-center"><UrlForm /></div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
