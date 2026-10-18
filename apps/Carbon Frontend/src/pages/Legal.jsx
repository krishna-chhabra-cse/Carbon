// Privacy policy and terms of service. Plain-language drafts: review them
// before publishing. Owner and contact details are filled in.
import { SiteShell } from '../components/site/SiteShell';

const OWNER = 'Krishna Chhabra';
const CONTACT = 'krishcarbon7@gmail.com';
const UPDATED = '18 October 2026';

function Doc({ title, children }) {
  return (
    <SiteShell title={title}>
      <section className="cx-wrap pt-14 md:pt-20 max-w-3xl pb-20">
        <div className="cx-label mb-3">Legal</div>
        <h1 className="cx-h1 text-4xl md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--cx-dim)' }}>Last updated {UPDATED}</p>
        <div className="mt-8 space-y-5 leading-relaxed" style={{ color: 'var(--cx-muted)' }}>{children}</div>
      </section>
    </SiteShell>
  );
}

const H = ({ children }) => <h2 className="text-xl font-semibold pt-4" style={{ color: 'var(--cx-text)' }}>{children}</h2>;

export function PrivacyPolicy() {
  return (
    <Doc title="Privacy policy">
      <p>{OWNER} runs Carbon (carbons.codes). This page explains what information we collect, why, and what you can do about it.</p>

      <H>What we collect</H>
      <ul className="list-disc pl-6 space-y-2">
        <li><b style={{ color: 'var(--cx-text)' }}>Account details.</b> When you sign up with email, Google or GitHub, we get your email address, your name and your profile picture from that provider. Supabase stores them.</li>
        <li><b style={{ color: 'var(--cx-text)' }}>Your links and answers.</b> The GitHub repos or websites you paste, and the answers you give to the four questions before a video.</li>
        <li><b style={{ color: 'var(--cx-text)' }}>Videos and decks.</b> The MP4 and .pptx files we make for you, and when they were made.</li>
        <li><b style={{ color: 'var(--cx-text)' }}>Early-access sign-ups.</b> The email address and the optional note you send us.</li>
        <li><b style={{ color: 'var(--cx-text)' }}>Usage and technical data.</b> Basic page-view and performance statistics (Vercel Analytics), and the IP address of requests, used to limit abuse.</li>
      </ul>

      <H>What we use it for</H>
      <p>To sign you in, to make the videos and decks you ask for, to limit free videos per day, to reply to early-access requests, and to keep the service running and safe. We don't sell your information and we don't use it for advertising.</p>

      <H>Who processes it</H>
      <ul className="list-disc pl-6 space-y-2">
        <li><b style={{ color: 'var(--cx-text)' }}>Supabase</b>: sign-in and account data.</li>
        <li><b style={{ color: 'var(--cx-text)' }}>Google Gemini</b>: the public code or website text from your link is sent to it to write the video script, answer the questions and analyze code. Don't paste links to private material.</li>
        <li><b style={{ color: 'var(--cx-text)' }}>GitHub</b>: we read public repository data through its API.</li>
        <li><b style={{ color: 'var(--cx-text)' }}>Resend</b>: sends sign-up confirmation and password-reset emails.</li>
        <li><b style={{ color: 'var(--cx-text)' }}>Vercel</b> (website hosting and analytics) and <b style={{ color: 'var(--cx-text)' }}>Railway</b> (video rendering and storage).</li>
      </ul>

      <H>How long we keep it</H>
      <p>We keep your account and your videos until you ask us to delete them. Early-access emails are kept until you ask us to remove them or the list is closed. Website screenshots used for a brief are deleted after 24 hours.</p>

      <H>Your choices</H>
      <p>You can ask us for a copy of your data, to correct it, or to delete your account and everything we hold about you. Email <b style={{ color: 'var(--cx-text)' }}>{CONTACT}</b> and we'll reply within a reasonable time. You can also sign out at any time.</p>

      <H>Cookies</H>
      <p>Carbon stores your sign-in session in your browser so you stay signed in. We don't use advertising cookies.</p>

      <H>Children</H>
      <p>Carbon isn't meant for anyone under 16. If you think a child has given us information, contact us and we'll delete it.</p>

      <H>Changes</H>
      <p>If we change this policy, we'll update the date at the top of this page.</p>

      <H>Contact</H>
      <p>{OWNER}, {CONTACT}</p>
    </Doc>
  );
}

export function Terms() {
  return (
    <Doc title="Terms of service">
      <p>By using Carbon (carbons.codes) you agree to these terms. If you don't agree, don't use it.</p>

      <H>What Carbon does</H>
      <p>Carbon makes a launch video (MP4) and a pitch deck (.pptx) from a public GitHub repository or a public website, and offers free tools such as Roast my codebase and Go deeper.</p>

      <H>Accounts</H>
      <p>You need an account to make videos. Keep your sign-in details safe. You're responsible for what happens under your account. You must be at least 16.</p>

      <H>Free use and limits</H>
      <p>Free accounts get a set number of videos per day, currently 2. We may change the limits, add paid plans, or pause features at any time. Videos made on the free plan carry a watermark.</p>

      <H>Your content and what you can make</H>
      <ul className="list-disc pl-6 space-y-2">
        <li>Only link to repositories and websites you have the right to promote.</li>
        <li>Don't use Carbon to make content that is illegal, hateful, defamatory, or that infringes someone else's rights.</li>
        <li>You own the videos and decks you make. Keep in mind the soundtracks and graphics are provided for use with your videos, not to be resold as stock.</li>
        <li>Carbon's output is based on public information. Check every number, claim and piece of code before you publish it.</li>
      </ul>

      <H>Our service</H>
      <p>Carbon is provided "as is". We work hard to keep it running, but we can't promise it will always be available or error-free. To the fullest extent the law allows, we aren't liable for lost profits or indirect losses from using it.</p>

      <H>Stopping</H>
      <p>You can stop using Carbon at any time. We can suspend or close accounts that break these terms or abuse the service.</p>

      <H>Changes</H>
      <p>We may update these terms. The date at the top shows when they last changed. Continued use means you accept the changes.</p>

      <H>Contact</H>
      <p>{OWNER}, {CONTACT}</p>
    </Doc>
  );
}
