// Stress gain (0-100) for the engines: a running fraction keeps small gains, and a stress guard (from a sweet meal or a
// calming potion: p.guard = {pct, until}) lowers every gain while it lasts. Only the strongest guard counts, at most
// GUARD_MAX (Notion「ポーション共通ルール」: 軽減率の全体上限30%).
export const GUARD_MAX=.3;
export function gainStress(p,amount,now=Date.now()){
 const g=p.guard,k=g&&g.until>now?1-Math.min(GUARD_MAX,g.pct):1;
 p.stressFrac=(p.stressFrac??0)+amount*k;const whole=Math.floor(p.stressFrac+1e-9);p.stressFrac-=whole;
 p.stress=Math.max(0,Math.min(100,p.stress+whole));return whole;
}
/** Sets a guard: a weaker one never replaces a stronger active one; the same strength takes the longer time. */
export function setGuard(p,pct,seconds,now=Date.now()){
 pct=Math.min(GUARD_MAX,Math.max(0,pct));const until=now+seconds*1000,g=p.guard;
 if(g&&g.until>now&&g.pct>pct)return false;
 p.guard={pct,until:g&&g.until>now&&g.pct===pct?Math.max(g.until,until):until};return true;
}
