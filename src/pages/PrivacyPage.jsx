import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'privacy policy'
  }, [])

  return (
    <div className="legal-page">
      <div className="orbs" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="legal">
        <Link to="/" className="legal-back">
          ← back to page
        </Link>
        <h1>privacy policy</h1>
        <p className="legal-date">last updated: august 11, 2026</p>

        <h2>what this site is</h2>
        <p>
          this is a personal link-in-bio page. it exists to show its owner's links, profile, and
          live discord presence. it is not a business, it sells nothing, and it has no interest in
          your data.
        </p>

        <h2>what's collected from visitors</h2>
        <ul>
          <li>
            <b>a view counter.</b> visiting the page bumps an anonymous number by one, once per
            browser session. no record of who you are is created.
          </li>
          <li>
            <b>no analytics, no ads, no tracking.</b> there are no third-party trackers, pixels,
            or fingerprinting of any kind.
          </li>
          <li>
            <b>standard server logs.</b> the hosting provider (vercel) may keep short-lived
            technical logs (like IP addresses) to run the service, as all hosts do.
          </li>
        </ul>

        <h2>cookies &amp; local storage</h2>
        <p>
          visitors get a single per-session flag in their browser so a page refresh doesn't
          double-count a view. login-related storage exists only for the site owner's own account.
          nothing is shared with anyone.
        </p>

        <h2>discord presence</h2>
        <p>
          the discord card shows the owner's own live status, activity, and spotify via discord and
          the public lanyard api. all of it is the <b>owner's</b> data, not yours. when the owner
          connects discord, an oauth token is used once in the browser to read their id, name, and
          avatar, then discarded — it is never stored. images (avatars, decorations, nameplates,
          game art, album art) load directly from discord's and spotify's public cdns.
        </p>

        <h2>uploaded media</h2>
        <p>
          images, audio, and video the owner uploads are stored in a public storage bucket
          (supabase) and are reachable by anyone with the link — that's what makes them visible on
          the page.
        </p>

        <h2>third-party services</h2>
        <p>
          the site runs on <b>vercel</b> (hosting), <b>supabase</b> (database, login, storage), and
          reads from <b>discord</b> and <b>lanyard</b> for the presence features. each has its own
          privacy policy that applies to the traffic they see.
        </p>

        <h2>contact &amp; removal</h2>
        <p>
          questions, or want something taken down? reach out through any of the links on the main
          page. see also the <Link to="/terms">terms of service</Link>.
        </p>
      </div>
    </div>
  )
}
