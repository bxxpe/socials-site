/**
 * Discord profile badges, decoded from the `public_flags` bitfield that
 * Lanyard and the OAuth /users/@me response both expose.
 *
 * Only badges that live in public_flags can appear here. Nitro and server
 * boosting are deliberately absent — Discord keeps those in `premium_type`
 * and per-guild data, neither of which is publicly readable, so no site can
 * show them from presence alone.
 *
 * Every hash below was verified to resolve on Discord's CDN.
 */
export const BADGES = [
  { bit: 0, id: 'staff', name: 'Discord Staff', hash: '5e74e9b61934fc1f67c65515d1f7e60d' },
  { bit: 1, id: 'partner', name: 'Partnered Server Owner', hash: '3f9748e53446a137a052f3454e2de41e' },
  { bit: 2, id: 'hypesquad', name: 'HypeSquad Events', hash: 'bf01d1073931f921909045f3a39fd264' },
  { bit: 3, id: 'bug_hunter_1', name: 'Bug Hunter', hash: '2717692c7dca7289b35297368a940dd0' },
  { bit: 6, id: 'bravery', name: 'HypeSquad Bravery', hash: '8a88d63823d8a71cd5e390baa45efa02' },
  { bit: 7, id: 'brilliance', name: 'HypeSquad Brilliance', hash: '011940fd013da3f7fb926e4a1cd2e618' },
  { bit: 8, id: 'balance', name: 'HypeSquad Balance', hash: '3aa41de486fa12454c3761e8e223442e' },
  { bit: 9, id: 'early_supporter', name: 'Early Supporter', hash: '7060786766c9c840eb3019e725d2b358' },
  { bit: 14, id: 'bug_hunter_2', name: 'Bug Hunter Gold', hash: '848f79194d4be5ff5f81505cbd0ce1e6' },
  { bit: 17, id: 'verified_dev', name: 'Early Verified Bot Developer', hash: '6df5892e0f35b051f8b61eace34f4967' },
  { bit: 18, id: 'mod_alumni', name: 'Moderator Programs Alumni', hash: 'fee1624003e2fee35cb398e125dc479b' },
  { bit: 22, id: 'active_dev', name: 'Active Developer', hash: '6bdc42827a38498929a4920da12695d9' },
]

export const badgeUrl = (hash) => `https://cdn.discordapp.com/badge-icons/${hash}.png`

/**
 * Badges Discord does NOT publish anywhere readable — Nitro lives in
 * `premium_type` and boosting is per-guild member data, neither of which is
 * exposed to third parties (Lanyard doesn't carry them either). So these are
 * opt-in: you tick the ones you actually have and they render alongside the
 * auto-detected ones. Every hash below was verified against Discord's CDN.
 */
export const MANUAL_BADGES = [
  { id: 'nitro', name: 'Discord Nitro', hash: '2ba85e8026a8614b640c2837bcdfe21b' },
  { id: 'boost_1mo', name: 'Server Booster (1 month)', hash: '51040c70d4f20a921ad6674ff86fc95c' },
  { id: 'boost_3mo', name: 'Server Booster (3 months)', hash: '72bed924410c304dbe3d00a6e593ff59' },
  { id: 'boost_6mo', name: 'Server Booster (6 months)', hash: '991c9f39ee33d7537d9f408c3e53141e' },
  { id: 'boost_12mo', name: 'Server Booster (12 months)', hash: 'cb3ae83c15e970e8f3d410bc62cb8b99' },
  { id: 'boost_24mo', name: 'Server Booster (24 months)', hash: 'ec92202290b48d0879b7413d2dde3bab' },
  { id: 'quest', name: 'Completed a Quest', hash: '7d9ae358c8c5e118768335dbe68b4fb8' },
]

export const manualBadgeOf = (id) => MANUAL_BADGES.find((b) => b.id === id)

/** Which badges a public_flags bitfield contains. */
export function badgesFrom(publicFlags) {
  const flags = Number(publicFlags) || 0
  if (!flags) return []
  return BADGES.filter((b) => (flags & (1 << b.bit)) !== 0)
}
