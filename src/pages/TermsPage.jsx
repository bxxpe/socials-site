import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function TermsPage() {
  useEffect(() => {
    document.title = 'terms of service'
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
        <h1>terms of service</h1>
        <p className="legal-date">last updated: august 11, 2026</p>

        <h2>the short version</h2>
        <p>
          this is a personal link-in-bio page. look at it, click the links, enjoy. don't attack it,
          don't scrape it, don't pretend it's yours.
        </p>

        <h2>using the site</h2>
        <ul>
          <li>it's free to visit and there's nothing to sign up for.</li>
          <li>
            don't try to break, overload, or gain unauthorized access to the site or its accounts.
          </li>
          <li>don't scrape or automate against it, and don't rip the design or content as your own.</li>
        </ul>

        <h2>links to other places</h2>
        <p>
          the icons point to profiles on other services. those sites have their own rules and
          content, and aren't controlled from here.
        </p>

        <h2>no guarantees</h2>
        <p>
          the site is provided as-is. it might go down, change, or disappear at any time, and
          nothing here is promised to be accurate or always available.
        </p>

        <h2>your privacy</h2>
        <p>
          covered separately in the <Link to="/privacy">privacy policy</Link>.
        </p>

        <h2>changes</h2>
        <p>
          these terms can be updated whenever. continuing to use the site means the current version
          applies.
        </p>
      </div>
    </div>
  )
}
