/**
 * Should this pageview count?
 *
 * The counter is incremented from the browser, so crawlers that don't run JS
 * were never counted anyway. What this filters is the rest: link-preview
 * fetchers that *do* execute scripts (Discord, Slack, Telegram embeds),
 * headless/automation browsers, and prerender passes.
 *
 * Note the bot patterns are deliberately anchored — `discordbot`, not
 * `discord`, because Discord's in-app browser is a real person looking at
 * your page and should absolutely be counted.
 */
const BOT_UA =
  /bot\b|crawler|spider|crawling|slurp|facebookexternalhit|embedly|quora link preview|outbrain|slackbot|vkshare|w3c_validator|whatsapp|telegrambot|discordbot|twitterbot|linkedinbot|headless|lighthouse|pagespeed|gtmetrix|phantomjs|puppeteer|playwright|selenium|prerender|googlebot|bingbot|yandex|duckduckbot|baiduspider|applebot|petalbot|semrush|ahrefs|screaming frog/i

export function looksLikeBot() {
  if (typeof navigator === 'undefined') return true
  if (navigator.webdriver) return true // automation flag
  const ua = navigator.userAgent || ''
  if (!ua) return true
  if (BOT_UA.test(ua)) return true
  // real browsers always report at least one language
  if (Array.isArray(navigator.languages) && navigator.languages.length === 0) return true
  // speculative background render, not a real visit
  if (typeof document !== 'undefined' && document.visibilityState === 'prerender') return true
  return false
}

/**
 * Whether this pageview should bump the counter.
 * `ownerId` is the profile's user id; `sessionUserId` is whoever is signed in.
 */
export function shouldCountView(ownerId, sessionUserId) {
  if (sessionUserId && ownerId && sessionUserId === ownerId) {
    return { count: false, reason: 'owner' }
  }
  if (looksLikeBot()) return { count: false, reason: 'bot' }
  if (sessionStorage.getItem('socials.viewed')) return { count: false, reason: 'already counted' }
  return { count: true, reason: 'new visitor' }
}
