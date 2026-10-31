const express = require('express');
const { requireGameKey } = require('../middleware/gameKey');
const { isString, isInt, isStringArray } = require('../validate');
const { asyncRoute } = require('../asyncRoute');
const crypto = require('node:crypto');
const { redeemLinkCode } = require('../domain/linkCodes');
const { thanksCounts } = require('../domain/thanks');
const { validateEvents } = require('../logs/validateEvent');
const { levelupEvents, questEvent } = require('../logs/events');
const { validateQuestInput, createQuest, transitionQuest, listQuestsSince } = require('../domain/quests');

const LEVEL_KEYS = ['player', 'gather', 'mine', 'craft'];

function playerErrors(p, i) {
  const errors = [];
  const at = `players[${i}]`;
  if (!p || typeof p !== 'object') return [`${at} must be an object`];
  if (!isString(p.xuid, 1, 64)) errors.push(`${at}.xuid`);
  if (!isString(p.gamertag, 1, 64)) errors.push(`${at}.gamertag`);
  if (!isStringArray(p.jobs)) errors.push(`${at}.jobs`);
  if (!isStringArray(p.titles)) errors.push(`${at}.titles`);
  if (!p.levels || typeof p.levels !== 'object') errors.push(`${at}.levels`);
  else for (const k of LEVEL_KEYS) if (!isInt(p.levels[k], 0)) errors.push(`${at}.levels.${k}`);
  if (!isInt(p.money, 0)) errors.push(`${at}.money`);
  if (typeof p.online !== 'boolean') errors.push(`${at}.online`);
  return errors;
}

function bestiaryErrors(e, i) {
  const at = `entries[${i}]`;
  if (!e || typeof e !== 'object') return [`${at} must be an object`];
  const errors = [];
  if (!isString(e.xuid, 1, 64)) errors.push(`${at}.xuid`);
  if (!isString(e.mobId, 1, 128)) errors.push(`${at}.mobId`);
  if (e.kind !== 'met' && e.kind !== 'killed') errors.push(`${at}.kind`);
  if (typeof e.at !== 'number' || !Number.isFinite(e.at)) errors.push(`${at}.at`);
  if (e.kills !== undefined && !isInt(e.kills, 0)) errors.push(`${at}.kills`);
  return errors;
}

function townErrors(t) {
  const errors = [];
  if (!isInt(t.level, 0)) errors.push('level');
  if (!Array.isArray(t.deliveries)) errors.push('deliveries');
  else t.deliveries.forEach((d, i) => {
    if (!d || !isString(d.item, 1, 128) || !isInt(d.have, 0) || !isInt(d.need, 0)) errors.push(`deliveries[${i}]`);
  });
  if (!isStringArray(t.facilities)) errors.push('facilities');
  return errors;
}

const invalid = (res, details) => res.status(400).json({ error: 'invalid', details });

function gameApiRouter({ config, store, now, logStore, alertEngine, hooks }) {
  const router = express.Router();
  router.use(requireGameKey(config.gameApiKey));
  router.use(express.json({ limit: '256kb' }));

  router.post('/players', asyncRoute(async (req, res) => {
    const players = req.body.players;
    if (!Array.isArray(players)) return invalid(res, ['players']);
    const errors = players.flatMap(playerErrors);
    if (errors.length) return invalid(res, errors);
    const before = new Map(players.map((p) => [p.xuid, store.getPlayer(p.xuid)]));
    const at = now();
    const cleaned = players.map(({ xuid, gamertag, jobs, levels, money, titles, online }) =>
      ({ xuid, gamertag, jobs, levels, money, titles, online }));
    await store.upsertPlayers(cleaned, at);
    const levelups = cleaned.flatMap((p) => levelupEvents(before.get(p.xuid), p, at));
    if (levelups.length) await logStore.append(levelups);
    await hooks.playersReported(before, cleaned);
    res.json({ ok: true, updated: players.length });
  }));

  router.post('/bestiary', asyncRoute(async (req, res) => {
    const entries = req.body.entries;
    if (!Array.isArray(entries)) return invalid(res, ['entries']);
    const errors = entries.flatMap(bestiaryErrors);
    if (errors.length) return invalid(res, errors);
    const added = await store.recordBestiary(entries);
    await hooks.townDiscoveries(added);
    res.json({ ok: true, newTownEntries: added.length });
  }));

  router.post('/town', asyncRoute(async (req, res) => {
    const errors = townErrors(req.body);
    if (errors.length) return invalid(res, errors);
    const { level, deliveries, facilities } = req.body;
    await store.setTown({ level, deliveries, facilities }, now());
    res.json({ ok: true });
  }));

  router.post('/link', asyncRoute(async (req, res) => {
    const { code, xuid, gamertag } = req.body;
    if (!isString(code, 1, 16) || !isString(xuid, 1, 64) || !isString(gamertag, 1, 64)) {
      return invalid(res, ['code, xuid and gamertag are required']);
    }
    const result = await redeemLinkCode(store, { code, xuid, gamertag }, now());
    if (result.error === 'not_found') return res.status(404).json(result);
    if (result.error) return res.status(409).json(result);
    await hooks.linked(xuid);
    res.json(result);
  }));

  // whether a player is linked to a Discord account (the link pack lets only linked players play)
  router.get('/linked', (req, res) => {
    const xuid = req.query.xuid;
    if (!isString(xuid, 1, 64)) return invalid(res, ['xuid']);
    res.json({ linked: !!store.findUserByXuid(xuid) });
  });
  router.get('/thanks/counts', (req, res) => res.json({ counts: thanksCounts(store) }));

  router.get('/quests', (req, res) => {
    const raw = req.query.since ?? '0';
    if (!/^\d+$/.test(raw)) return invalid(res, ['since must be a non-negative integer']);
    res.json(listQuestsSince(store, Number(raw)));
  });

  router.post('/quests', asyncRoute(async (req, res) => {
    const { requestId, ownerXuid, title, item, qty, reward } = req.body;
    const errors = validateQuestInput({ title, item, qty, reward });
    if (!isString(requestId, 1, 128)) errors.push('requestId');
    if (!isString(ownerXuid, 1, 64)) errors.push('ownerXuid');
    if (errors.length) return invalid(res, errors);
    const { quest, created } = await createQuest(store, { requestId, ownerXuid, title, item, qty, reward }, now());
    if (created) {
      await logStore.append([questEvent(quest, 'create', ownerXuid, now(), store.getPlayer(ownerXuid)?.gamertag)]);
      await hooks.questCreated(quest);
    }
    res.status(created ? 201 : 200).json({ ok: true, quest });
  }));

  router.post('/quests/:id/status', asyncRoute(async (req, res) => {
    const { action, xuid } = req.body;
    if (!['accept', 'cancel', 'complete'].includes(action)) return invalid(res, ['action']);
    if (!isString(xuid, 1, 64)) return invalid(res, ['xuid']);
    const result = await transitionQuest(store, req.params.id, action, { xuid, source: 'game' });
    if (result.error === 'not_found') return res.status(404).json(result);
    if (result.error) return res.status(409).json(result);
    if (result.changed) {
      await logStore.append([questEvent(result.quest, action, xuid, now(), store.getPlayer(xuid)?.gamertag)]);
      if (action === 'complete') await hooks.questCompleted(result.quest);
    }
    res.json({ ok: true, quest: result.quest });
  }));

  router.post('/logs', asyncRoute(async (req, res) => {
    const events = req.body.events;
    const errors = validateEvents(events, now());
    if (errors.length) return invalid(res, errors);
    const stored = events.map((e) => ({
      id: crypto.randomUUID(),
      ...e,
      gamertag: e.gamertag || store.getPlayer(e.xuid)?.gamertag,
    }));
    await logStore.append(stored);
    await alertEngine.observe(stored);
    await hooks.logsReceived(stored);
    res.json({ ok: true, accepted: stored.length });
  }));

  router.use((req, res) => res.status(404).json({ error: 'not_found' }));

  router.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return invalid(res, ['body is not valid JSON']);
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'too_large' });
    console.error(err);
    res.status(500).json({ error: 'internal' });
  });

  return router;
}

module.exports = { gameApiRouter };
