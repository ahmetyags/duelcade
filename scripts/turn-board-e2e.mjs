/* global Buffer */

import { mkdir, writeFile } from 'node:fs/promises';

const CDP_URL = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:3001';
const OUT = process.env.ARTIFACT_DIR ?? '/tmp/duelcade-turn-e2e';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CDP {
  constructor(url) {
    this.id = 1;
    this.pending = new Map();
    this.events = [];
    this.socket = new WebSocket(url);
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) {
        this.events.push(message);
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  send(method, params = {}, sessionId) {
    const id = this.id++;
    this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

async function evaluate(cdp, page, expression) {
  const output = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, page.sessionId);
  if (output.exceptionDetails) throw new Error(output.exceptionDetails.text);
  return output.result.value;
}

async function page(cdp, width, height) {
  const context = await cdp.send('Target.createBrowserContext');
  const target = await cdp.send('Target.createTarget', {
    url: 'about:blank',
    browserContextId: context.browserContextId,
  });
  const attached = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const result = { contextId: context.browserContextId, sessionId: attached.sessionId };
  await cdp.send('Page.enable', {}, result.sessionId);
  await cdp.send('Runtime.enable', {}, result.sessionId);
  await cdp.send('Log.enable', {}, result.sessionId);
  await cdp.send('Network.enable', {}, result.sessionId);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, result.sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  }, result.sessionId);
  await cdp.send('Page.navigate', { url: APP_URL }, result.sessionId);
  return result;
}

async function wait(cdp, page, expression, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(cdp, page, `Boolean(${expression})`)) return;
    await sleep(100);
  }
  const body = await evaluate(cdp, page, 'document.body?.innerText ?? ""');
  throw new Error(`Timeout: ${expression}\n${body.slice(0, 1000)}`);
}

const waitText = (cdp, page, text, timeout) =>
  wait(cdp, page, `(document.body?.innerText ?? '').includes(${JSON.stringify(text)})`, timeout);

function isExpectedAuthFallbackLog(event) {
  const entry = event.method === 'Log.entryAdded' ? event.params.entry : null;
  return entry?.source === 'network'
    && entry.level === 'error'
    && (
      entry.text.includes('status of 401')
      || entry.text.includes('status of 404')
      || entry.text.includes('status of 429')
    )
    && entry.url?.includes('/v1/auth/');
}

async function click(cdp, page, label) {
  const clicked = await evaluate(cdp, page, `(() => {
    const label = ${JSON.stringify(label)};
    const nodes = [...document.querySelectorAll('[role="button"],[role="radio"],[aria-label],button,a,[tabindex="0"]')];
    const node = nodes.find((item) => (item.getAttribute('aria-label') || item.innerText || '').trim() === label)
      || nodes.find((item) => (item.getAttribute('aria-label') || item.innerText || '').includes(label));
    if (!node) return false;
    node.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Missing control: ${label}`);
  await sleep(200);
}

async function fill(cdp, page, index, value) {
  const ok = await evaluate(cdp, page, `(() => {
    const input = [...document.querySelectorAll('input')].filter((item) => item.getClientRects().length)[${index}];
    if (!input) return false;
    input.focus();
    input.select();
    return true;
  })()`);
  if (!ok) throw new Error(`Missing input ${index}`);
  await cdp.send('Input.insertText', { text: value }, page.sessionId);
}

async function setDuration(cdp, page, minutes) {
  const slider = await evaluate(cdp, page, `(() => {
    const node = document.querySelector('[data-testid="duration-slider"]');
    const rect = node?.getBoundingClientRect();
    return rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  })()`);
  if (!slider) throw new Error('Missing duration slider');
  const ratio = (minutes - 2) / (15 - 2);
  const x = slider.x + slider.width * ratio;
  const y = slider.y + slider.height / 2;
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount: 1,
  }, page.sessionId);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount: 1,
  }, page.sessionId);
  await sleep(200);
}

async function screenshot(cdp, page, name) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, page.sessionId);
  await writeFile(`${OUT}/${name}`, Buffer.from(shot.data, 'base64'));
}

const version = await fetch(`${CDP_URL}/json/version`).then((response) => response.json());
await mkdir(OUT, { recursive: true });
const cdp = new CDP(version.webSocketDebuggerUrl);
await cdp.open();
const host = await page(cdp, 390, 844);
const guest = await page(cdp, 1280, 800);

try {
  await Promise.all([waitText(cdp, host, 'Oyna'), waitText(cdp, guest, 'Oyna')]);
  await click(cdp, host, 'Maç Oluştur');
  await click(cdp, host, 'Zor');
  await setDuration(cdp, host, 3);
  await screenshot(cdp, host, 'mobile-match-settings.png');
  await click(cdp, host, 'Oluştur ve Kodu Paylaş');
  await waitText(cdp, host, 'ODA KODU');
  const code = await evaluate(cdp, host, `(() => {
    const lines = (document.body?.innerText ?? '').split(/\\n+/).map((line) => line.trim());
    const marker = lines.indexOf('ODA KODU');
    return lines.slice(marker + 1).filter((line) => /^[A-Z2-9]$/.test(line)).slice(0, 6).join('');
  })()`);
  if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error(`Invalid code ${code}`);

  // Returning to create while a room is still cached must produce a genuinely new room.
  await evaluate(cdp, host, 'history.back(); true');
  await waitText(cdp, host, 'Oyna');
  await click(cdp, host, 'Maç Oluştur');
  await waitText(cdp, host, 'Oluştur ve Kodu Paylaş');
  await click(cdp, host, 'Oluştur ve Kodu Paylaş');
  await waitText(cdp, host, 'ODA KODU');
  const freshCode = await evaluate(cdp, host, `(() => {
    const lines = (document.body?.innerText ?? '').split(/\\n+/).map((line) => line.trim());
    const marker = lines.indexOf('ODA KODU');
    return lines.slice(marker + 1).filter((line) => /^[A-Z2-9]$/.test(line)).slice(0, 6).join('');
  })()`);
  if (!/^[A-Z2-9]{6}$/.test(freshCode) || freshCode === code) {
    throw new Error(`Fresh room reused stale code: ${code} -> ${freshCode}`);
  }

  await click(cdp, guest, 'Arkadaşına Katıl');
  await fill(cdp, guest, 0, freshCode);
  await fill(cdp, guest, 1, 'Mert');
  await click(cdp, guest, 'Maça Katıl');
  await Promise.all([waitText(cdp, host, 'OYUNCULAR (2/2)'), waitText(cdp, guest, 'OYUNCULAR (2/2)')]);
  await screenshot(cdp, guest, 'desktop-ready-lobby.png');
  await Promise.all([click(cdp, host, 'Hazırım'), click(cdp, guest, 'Hazırım')]);
  const modeNames = [
    'Rün Düellosu', 'Devre Döndürme', 'Dört Hat', 'Rezonans Kilidi', 'Hafıza Eşleri',
    'Şifre Çatışması', 'Devre Alanı', 'Neon İz', 'Geçit Savaşı', 'Polarite Savaşı',
  ];
  await wait(
    cdp,
    host,
    modeNames.map((name) => `(document.body?.innerText ?? '').includes(${JSON.stringify(name)})`).join(' || '),
  );
  const activeMode = await evaluate(
    cdp,
    host,
    `(${JSON.stringify(modeNames)}).find((name) => (document.body?.innerText ?? '').includes(name))`,
  );
  await waitText(cdp, guest, activeMode);

  // A real browser refresh must reconnect the same seat and restore the active board.
  await cdp.send('Page.reload', { ignoreCache: true }, guest.sessionId);
  await waitText(cdp, guest, activeMode, 20_000);
  await waitText(cdp, guest, 'ORTAK MASA', 20_000);
  const restoredPath = await evaluate(cdp, guest, 'location.pathname');
  if (restoredPath !== '/game') throw new Error(`Refresh did not restore /game: ${restoredPath}`);
  await screenshot(cdp, guest, 'desktop-restored-after-refresh.png');

  const hostLayout = await evaluate(cdp, host, `(() => {
    const cell = document.querySelector(
      '[aria-label^="Hücre "], [aria-label^="Devre parçası "], [aria-label^="Sütun "], ' +
      '[aria-label^="A kanalını "], [aria-label^="Kart "], [aria-label^="Rün "], ' +
      '[aria-label^="Devre hattı "], [aria-label^="Neon hücresi "], ' +
      '[aria-label^="Geçit hücresi "], [aria-label^="Polarite hücresi "]'
    );
    let board = cell?.parentElement;
    while (board && (board.getBoundingClientRect().width < 300 || board.getBoundingClientRect().height < 250)) {
      board = board.parentElement;
    }
    const rect = board?.getBoundingClientRect();
    return rect && { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, vw: innerWidth, vh: innerHeight };
  })()`);
  if (!hostLayout || hostLayout.left < 0 || hostLayout.right > hostLayout.vw + 1) {
    throw new Error(`Mobile board overflow: ${JSON.stringify(hostLayout)}`);
  }
  await screenshot(cdp, host, 'mobile-turn-board.png');
  await screenshot(cdp, guest, 'desktop-turn-board.png');
  const controlCount = await evaluate(cdp, host, `(() => {
    const selectors = {
      'Rün Düellosu': '[aria-label^="Hücre "]',
      'Devre Döndürme': '[aria-label^="Devre parçası "]',
      'Dört Hat': '[aria-label^="Sütun "]',
      'Rezonans Kilidi': '[aria-label$="kanalını artır"]',
      'Hafıza Eşleri': '[aria-label^="Kart "]',
      'Şifre Çatışması': '[aria-label^="Rün "]',
      'Devre Alanı': '[aria-label^="Devre hattı "]',
      'Neon İz': '[aria-label^="Neon hücresi "]',
      'Geçit Savaşı': '[aria-label^="Geçit hücresi "]',
      'Polarite Savaşı': '[aria-label^="Polarite hücresi "]',
    };
    return document.querySelectorAll(selectors[${JSON.stringify(activeMode)}]).length;
  })()`);
  if (controlCount <= 0) throw new Error(`${activeMode} has no playable controls`);
  if (activeMode === 'Rezonans Kilidi') {
    const targetMappingCount = await evaluate(
      cdp,
      host,
      `document.querySelectorAll('[aria-label*=" kanalı hedefi: "]').length`,
    );
    if (targetMappingCount !== controlCount) {
      throw new Error(`Resonance targets are not mapped to every channel: ${targetMappingCount}/${controlCount}`);
    }
  }
  await click(cdp, host, 'Bu oyunu pas geç');
  await waitText(cdp, host, 'Bu oyun pas geçilsin mi?');
  await click(cdp, host, 'Pas geçme isteği gönder');
  await waitText(cdp, host, 'Rakip onayı bekleniyor');
  await waitText(cdp, guest, 'Rakibin pas geçmek istiyor');
  await screenshot(cdp, guest, 'desktop-skip-request.png');
  await click(cdp, guest, 'Onayla');
  await wait(cdp, host, `!(document.body?.innerText ?? '').includes(${JSON.stringify(activeMode)})`, 10_000);
  await wait(
    cdp,
    host,
    `Boolean(document.querySelector('[data-testid="opponent-turn-overlay"]'))`,
  );
  await screenshot(cdp, host, 'mobile-skipped-next-game.png');

  const nextMode = await evaluate(
    cdp,
    host,
    `(${JSON.stringify(modeNames)}).find((name) => (document.body?.innerText ?? '').includes(name))`,
  );
  if (!nextMode || nextMode === activeMode) throw new Error(`Round was not skipped: ${activeMode}`);

  if (nextMode === 'Şifre Çatışması') {
    for (let index = 0; index < 6; index += 1) await click(cdp, guest, 'Rün 1');
    await click(cdp, guest, 'TAHMİNİ GÖNDER');
  } else {
    const moved = await evaluate(cdp, guest, `(() => {
      const selectors = {
        'Rün Düellosu': '[aria-label^="Hücre "]',
        'Devre Döndürme': '[aria-label^="Devre parçası "]',
        'Dört Hat': '[aria-label^="Sütun "]',
        'Rezonans Kilidi': '[aria-label$="kanalını artır"]',
        'Hafıza Eşleri': '[aria-label^="Kart "]',
        'Devre Alanı': '[aria-label^="Devre hattı "]',
        'Neon İz': '[aria-label^="Neon hücresi "]',
        'Geçit Savaşı': '[aria-label^="Geçit hücresi "]',
        'Polarite Savaşı': '[aria-label^="Polarite hücresi "]',
      };
      const nodes = [...document.querySelectorAll(selectors[${JSON.stringify(nextMode)}])];
      const node = nodes.find((item) =>
        !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true'
      );
      node?.click();
      return Boolean(node);
    })()`);
    if (!moved) throw new Error(`No playable control for ${nextMode}`);
  }
  await sleep(400);
  await screenshot(cdp, guest, 'desktop-synced-move.png');
  await click(cdp, host, 'Oyundan çık');
  await waitText(cdp, host, 'Maçtan çıkmak istediğine emin misin?');
  await screenshot(cdp, host, 'mobile-exit-confirmation.png');
  await click(cdp, host, 'Evet, çık');
  await Promise.all([
    waitText(cdp, host, 'Maçtan çıktın'),
    waitText(cdp, guest, 'Kazandın!'),
  ]);
  await screenshot(cdp, guest, 'desktop-forfeit-result.png');
  await Promise.all([
    click(cdp, host, 'Tekrar oyna'),
    click(cdp, guest, 'Tekrar oyna'),
  ]);
  await Promise.all([
    waitText(cdp, host, 'Maç Lobisi'),
    waitText(cdp, guest, 'Maç Lobisi'),
  ]);
  await screenshot(cdp, host, 'mobile-rematch-lobby.png');

  const errors = cdp.events.filter((event) =>
    !isExpectedAuthFallbackLog(event) && (
      event.method === 'Runtime.exceptionThrown'
      || (event.method === 'Log.entryAdded' && event.params.entry.level === 'error')
    ));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors.slice(0, 3))}`);
  process.stdout.write(JSON.stringify({ ok: true, oldCode: code, code: freshCode, activeMode, nextMode, controlCount, hostLayout }, null, 2));
} finally {
  await Promise.allSettled([
    cdp.send('Target.disposeBrowserContext', { browserContextId: host.contextId }),
    cdp.send('Target.disposeBrowserContext', { browserContextId: guest.contextId }),
  ]);
  cdp.socket.close();
}
