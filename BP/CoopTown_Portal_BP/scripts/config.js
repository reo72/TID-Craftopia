// Settings and names shared by the link pack. The scoreboard/tag/scriptevent names are the contract with
// the main pack (CoopTown_BP/scripts/portal-bridge.js); change both sides together.
export const CONFIG={
 timeoutSec:10,          // one HTTP request
 maxConcurrent:2,        // requests in flight at once
 queueKey:'portal:queue',
 queueMax:400,           // stored sends; the oldest logs are dropped first when full
 retryBaseMs:5000,       // first retry after a failure, doubled each time
 retryMaxMs:300000,
 playersEverySec:60,
 bestiaryScanTicks:40,   // every 2 seconds ...
 bestiaryScanPlayers:3,  // ... look around this many players
 bestiaryRadius:8,
 bestiarySendSec:20,
 bestiaryBatch:200,
 assistMs:10000,         // players who hit a mob this recently also get the kill
 questsEverySec:30,
 opRetryMs:60000,        // re-send an escrow/payout/refund order that got no answer
 logsEverySec:30,
 logsBuffer:1000
};
export const SCORES={player:'lv_player',gather:'lv_gather',mine:'lv_mine',craft:'lv_craft',money:'money'};
export const TAGS={main:'job_main:',sub:'job_sub:',title:'title:'};
// the main pack's jobs (portal-bridge.js JOB_IDS: adventurer and alchemist since the jobs were merged) and the older
// ones the site may still have saved (2026-10-30: adventurer / alchemist were dropped, so those jobs never showed)
export const JOB_IDS=['adventurer','farmer','blacksmith','cook','enchanter','fisher','alchemist','lumberjack','miner'];
// link -> main
export const TO_MAIN={escrow:'portal:escrow',payout:'portal:payout',refund:'portal:refund',questUpdate:'portal:quest_update',questReset:'portal:quest_reset',status:'portal:status',createFailed:'portal:quest_create_failed'};
// main -> link
export const FROM_MAIN={result:'portal:result',delivered:'portal:delivered',town:'portal:town',questCreate:'portal:quest_create',questAction:'portal:quest_action'};
// friendly mobs are "met" when near a player; hostile mobs are "killed"
export const FRIENDLY=new Set(['allay','armadillo','axolotl','bat','bee','camel','cat','chicken','cod','cow','dolphin','donkey','fox','frog','glow_squid','goat','horse','iron_golem','llama','mooshroom','mule','ocelot','panda','parrot','pig','polar_bear','pufferfish','rabbit','salmon','sheep','skeleton_horse','sniffer','snow_golem','squid','strider','tadpole','trader_llama','tropicalfish','turtle','villager_v2','wandering_trader','wolf','happy_ghast','copper_golem','nautilus'].map(id=>'minecraft:'+id));
export const HOSTILE=new Set(['blaze','bogged','breeze','cave_spider','creaking','creeper','drowned','elder_guardian','ender_dragon','enderman','endermite','evocation_illager','ghast','guardian','hoglin','husk','magma_cube','phantom','piglin','piglin_brute','pillager','ravager','shulker','silverfish','skeleton','slime','spider','stray','vex','vindicator','warden','witch','wither','wither_skeleton','zoglin','zombie','zombie_pigman','zombie_villager_v2','parched','zombie_nautilus','camel_husk'].map(id=>'minecraft:'+id));
