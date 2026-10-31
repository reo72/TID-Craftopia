// When the game's own form shows: only for titles without "ct:" (every CoopTown screen's title starts with it).
// One short check instead of "not this title and not that title ..." for every screen: that chain grew to 32 titles
// (1330 characters) and stopped working in game (2026-10-27: the plain form showed behind the NPC screen).
export const VANILLA_COND="((#title_text - 'ct:') = #title_text)";
