/* global Buffer */

import { mkdir, writeFile } from 'node:fs/promises';

const CDP_URL = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:3001';
const OUT = process.env.ARTIFACT_DIR ?? '/tmp/duelcade-solo-e2e';
const PLAY_ALL_ROUNDS = process.env.PLAY_ALL_ROUNDS === '1';
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

async function wait(cdp, page, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(cdp, page, `Boolean(${expression})`)) return;
    await sleep(100);
  }
  const body = await evaluate(cdp, page, 'document.body?.innerText ?? ""');
  throw new Error(`Timeout: ${expression}\n${body.slice(0, 1200)}`);
}

const waitText = (cdp, page, text, timeout) =>
  wait(cdp, page, `(document.body?.innerText ?? '').includes(${JSON.stringify(text)})`, timeout);

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

async function screenshot(cdp, page, name) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, page.sessionId);
  await writeFile(`${OUT}/${name}`, Buffer.from(shot.data, 'base64'));
}

await mkdir(OUT, { recursive: true });
const version = await fetch(`${CDP_URL}/json/version`).then((response) => response.json());
const cdp = new CDP(version.webSocketDebuggerUrl);
await cdp.open();
const context = await cdp.send('Target.createBrowserContext');
const target = await cdp.send('Target.createTarget', {
  url: APP_URL,
  browserContextId: context.browserContextId,
});
const attached = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
const page = { contextId: context.browserContextId, sessionId: attached.sessionId };
await cdp.send('Page.enable', {}, page.sessionId);
await cdp.send('Runtime.enable', {}, page.sessionId);
await cdp.send('Log.enable', {}, page.sessionId);
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
}, page.sessionId);

try {
  await waitText(cdp, page, 'BULMACA ARCADE');
  await waitText(cdp, page, 'Tek Oyunculu');
  await screenshot(cdp, page, 'mobile-home.png');
  await click(cdp, page, 'Maç Oluştur');
  await waitText(cdp, page, 'OYUNCU PROFİLİ');
  const collapsedProfileControls = await evaluate(cdp, page, `(() => ({
    avatarCount: [...document.querySelectorAll('[role="radio"]')]
      .filter((node) => (node.getAttribute('aria-label') ?? '').includes('Oyuncu simgesi')).length,
    hasNameInput: Boolean(document.querySelector('input')),
    hasAvatarButton: Boolean(document.querySelector('[role="button"][aria-label="Oyuncu simgesi"]')),
  }))()`);
  if (
    collapsedProfileControls.avatarCount !== 0
    || !collapsedProfileControls.hasNameInput
    || !collapsedProfileControls.hasAvatarButton
  ) {
    throw new Error(`Collapsed create profile is invalid: ${JSON.stringify(collapsedProfileControls)}`);
  }
  await screenshot(cdp, page, 'mobile-create-profile.png');
  await click(cdp, page, 'Oyuncu simgesi');
  await waitText(cdp, page, 'SİMGENİ SEÇ');
  const avatarCount = await evaluate(cdp, page, `[...document.querySelectorAll('[role="radio"]')]
    .filter((node) => (node.getAttribute('aria-label') ?? '').includes('Oyuncu simgesi')).length`);
  if (avatarCount !== 6) throw new Error(`Avatar balloon has ${avatarCount} options instead of 6`);
  await screenshot(cdp, page, 'mobile-avatar-balloon.png');
  await evaluate(cdp, page, 'history.back(); true');
  await waitText(cdp, page, 'BULMACA ARCADE');
  await click(cdp, page, 'Tek Oyunculu');
  await waitText(cdp, page, 'DuelBot’a karşı hemen başla');
  const soloProfileControls = await evaluate(cdp, page, `(() => ({
    hasNameInput: Boolean(document.querySelector('input')),
    hasAvatarButton: Boolean(document.querySelector('[role="button"][aria-label="Oyuncu simgesi"]')),
  }))()`);
  if (!soloProfileControls.hasNameInput || !soloProfileControls.hasAvatarButton) {
    throw new Error(`Solo profile controls missing: ${JSON.stringify(soloProfileControls)}`);
  }
  await click(cdp, page, PLAY_ALL_ROUNDS ? 'Kolay' : 'Zor');

  const slider = await evaluate(cdp, page, `(() => {
    const node = document.querySelector('[role="slider"],[aria-valuenow]');
    const rect = node?.getBoundingClientRect();
    return rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  })()`);
  if (!slider) throw new Error('Duration slider was not accessible');
  const y = slider.y + slider.height / 2;
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: slider.x + slider.width * 0.85,
    y,
    button: 'left',
    clickCount: 1,
  }, page.sessionId);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: slider.x + slider.width * 0.85,
    y,
    button: 'left',
    clickCount: 1,
  }, page.sessionId);
  await sleep(300);
  const sliderValue = await evaluate(
    cdp,
    page,
    `(() => {
      const node = document.querySelector('[role="slider"],[aria-valuenow]');
      const accessibleValue = node?.getAttribute('aria-valuenow')
        || node?.getAttribute('aria-valuetext')
        || node?.innerText;
      if (accessibleValue) return accessibleValue;
      return (document.body?.innerText ?? '').split(/\\n+/).map((line) => line.trim())
        .find((line) => /^\\d+$/.test(line)) ?? null;
    })()`,
  );
  if (!sliderValue || Number.parseInt(sliderValue, 10) <= 5) {
    throw new Error(`Slider did not update: ${sliderValue}`);
  }
  await screenshot(cdp, page, 'mobile-solo-settings.png');

  await click(cdp, page, 'Hemen Başla');
  await waitText(cdp, page, 'TEK OYUNCULU · DUELBOT');
  await waitText(cdp, page, 'DuelBot');
  const modeNames = [
    'Rün Düellosu', 'Devre Döndürme', 'Dört Hat', 'Rezonans Kilidi', 'Hafıza Eşleri',
    'Şifre Çatışması', 'Devre Alanı', 'Neon İz', 'Geçit Savaşı', 'Polarite Savaşı',
  ];
  await wait(
    cdp,
    page,
    modeNames.map((name) => `(document.body?.innerText ?? '').includes(${JSON.stringify(name)})`).join(' || '),
  );
  const initialMode = await evaluate(
    cdp,
    page,
    `(${JSON.stringify(modeNames)}).find((name) => (document.body?.innerText ?? '').includes(name))`,
  );
  await screenshot(cdp, page, 'mobile-solo-game.png');
  await click(cdp, page, `${initialMode} nasıl oynanır?`);
  await waitText(cdp, page, 'NASIL OYNANIR?');
  const helpSections = await evaluate(cdp, page, `(() => {
    const text = document.body?.innerText ?? '';
    return ['AMAÇ', 'SIRANDA NE YAPACAKSIN?', 'NASIL KAZANIRSIN?', 'ZORLUK NASIL DEĞİŞİR?', 'İPUCU']
      .every((heading) => text.includes(heading));
  })()`);
  if (!helpSections) throw new Error(`How-to-play sections are incomplete for ${initialMode}`);
  await screenshot(cdp, page, 'mobile-how-to-play.png');
  await click(cdp, page, 'Anladım');
  await wait(cdp, page, `!(document.body?.innerText ?? '').includes('NASIL OYNANIR?')`);

  const boardBounds = await evaluate(cdp, page, `(() => {
    const control = document.querySelector(
      '[aria-label^="Hücre "], [aria-label^="Devre parçası "], [aria-label^="Sütun "], ' +
      '[aria-label^="A kanalını "], [aria-label^="Kart "], [aria-label^="Rün "]:not([aria-label$="nasıl oynanır?"]), ' +
      '[aria-label^="Devre hattı "], [aria-label^="Neon hücresi "], ' +
      '[aria-label^="Geçit hücresi "], [aria-label^="Polarite hücresi "]'
    );
    let board = control?.parentElement;
    while (board && (board.getBoundingClientRect().width < 300 || board.getBoundingClientRect().height < 250)) {
      board = board.parentElement;
    }
    const rect = board?.getBoundingClientRect();
    return rect && { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  })()`);
  if (!boardBounds || boardBounds.left < 0 || boardBounds.right > 391) {
    throw new Error(`Solo board overflow: ${JSON.stringify(boardBounds)}`);
  }

  await wait(cdp, page, `(() => {
    const controls = [...document.querySelectorAll(
      '[aria-label^="Hücre "], [aria-label^="Devre parçası "], [aria-label^="Sütun "], ' +
      '[aria-label$="kanalını artır"], [aria-label^="Kart "], [aria-label^="Rün "]:not([aria-label$="nasıl oynanır?"]), ' +
      '[aria-label="Şifre tahminini gönder"], [aria-label^="Devre hattı "], ' +
      '[aria-label^="Neon hücresi "], [aria-label^="Geçit hücresi "], ' +
      '[aria-label^="Polarite hücresi "]'
    )];
    return controls.some((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-disabled') !== 'true');
  })()`, 8_000);
  const moved = await evaluate(cdp, page, `(() => {
    const controls = [...document.querySelectorAll(
      '[aria-label^="Hücre "], [aria-label^="Devre parçası "], [aria-label^="Sütun "], ' +
      '[aria-label$="kanalını artır"], [aria-label^="Kart "], [aria-label^="Rün "]:not([aria-label$="nasıl oynanır?"]), ' +
      '[aria-label="Şifre tahminini gönder"], [aria-label^="Devre hattı "], ' +
      '[aria-label^="Neon hücresi "], [aria-label^="Geçit hücresi "], ' +
      '[aria-label^="Polarite hücresi "]'
    )];
    const node = controls.find((item) => !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true');
    if (!node) return false;
    node.click();
    return true;
  })()`);
  if (!moved) throw new Error('Human solo move could not be played');
  await sleep(1_800);
  await screenshot(cdp, page, 'mobile-solo-bot-response.png');

  const roundDeadline = Date.now() + 45_000;
  let roundCelebrated = false;
  while (Date.now() < roundDeadline) {
    roundCelebrated = await evaluate(cdp, page, `(() => {
      const text = document.body?.innerText ?? '';
      return text.includes('TURU KAZANDI') || text.includes('TURU KAZANDIN') || text.includes('TUR BERABERE');
    })()`);
    if (roundCelebrated) break;
    await evaluate(cdp, page, `(() => {
      const controls = [...document.querySelectorAll(
        '[aria-label^="Hücre "], [aria-label^="Devre parçası "], [aria-label^="Sütun "], ' +
        '[aria-label$="kanalını artır"], [aria-label^="Kart "], [aria-label^="Rün "]:not([aria-label$="nasıl oynanır?"]), ' +
        '[aria-label="Şifre tahminini gönder"], [aria-label^="Devre hattı "], ' +
        '[aria-label^="Neon hücresi "], [aria-label^="Geçit hücresi "], ' +
        '[aria-label^="Polarite hücresi "]'
      )];
      const node = controls.find((item) => !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true');
      node?.click();
      return Boolean(node);
    })()`);
    await sleep(180);
  }
  if (!roundCelebrated) throw new Error('Round victory celebration was not shown for ' + initialMode);
  await screenshot(cdp, page, 'mobile-round-victory.png');

  const seenModes = new Set([initialMode]);
  if (PLAY_ALL_ROUNDS) {
    const slugs = {
      'Rün Düellosu': 'rune-grid',
      'Devre Döndürme': 'pipe-circuit',
      'Dört Hat': 'connect-four',
      'Rezonans Kilidi': 'resonance',
      'Hafıza Eşleri': 'memory',
      'Şifre Çatışması': 'cipher',
      'Devre Alanı': 'circuit-claim',
      'Neon İz': 'neon-trail',
      'Geçit Savaşı': 'gateway-race',
      'Polarite Savaşı': 'polarity',
    };
    const deadline = Date.now() + 900_000;
    while (Date.now() < deadline) {
      const completed = await evaluate(
        cdp,
        page,
        `location.pathname.includes('/results') || (document.body?.innerText ?? '').includes('Tekrar oyna')`,
      );
      if (completed) break;
      const currentMode = await evaluate(
        cdp,
        page,
        `(${JSON.stringify(modeNames)}).find((name) => (document.body?.innerText ?? '').includes(name))`,
      );
      if (currentMode && !seenModes.has(currentMode)) {
        seenModes.add(currentMode);
        await screenshot(cdp, page, `mobile-${slugs[currentMode]}.png`);
      }
      await evaluate(cdp, page, `(() => {
        const controls = [...document.querySelectorAll(
          '[aria-label^="Hücre "], [aria-label^="Devre parçası "], [aria-label^="Sütun "], ' +
          '[aria-label$="kanalını artır"], [aria-label^="Kart "], [aria-label^="Rün "]:not([aria-label$="nasıl oynanır?"]), ' +
          '[aria-label="Şifre tahminini gönder"], [aria-label^="Devre hattı "], ' +
          '[aria-label^="Neon hücresi "], [aria-label^="Geçit hücresi "], ' +
          '[aria-label^="Polarite hücresi "]'
        )];
        const node = controls.find((item) =>
          !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true'
        );
        node?.click();
        return Boolean(node);
      })()`);
      await sleep(140);
    }
    await wait(cdp, page, `location.pathname.includes('/results')`, 10_000);
    const missingModes = modeNames.filter((name) => !seenModes.has(name));
    if (missingModes.length > 0) {
      throw new Error(`Not every game appeared in the 10-round cycle: ${missingModes.join(', ')}`);
    }
    await screenshot(cdp, page, 'mobile-all-games-result.png');
  } else {
    await click(cdp, page, 'Oyundan çık');
    await click(cdp, page, 'Evet, çık');
    await waitText(cdp, page, 'Maçtan çıktın');
    await screenshot(cdp, page, 'mobile-solo-result.png');
    await click(cdp, page, 'Tekrar oyna');
    await waitText(cdp, page, 'DuelBot’a karşı hemen başla');
  }

  const errors = cdp.events.filter((event) =>
    event.method === 'Runtime.exceptionThrown'
    || (event.method === 'Log.entryAdded' && event.params.entry.level === 'error'));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors.slice(0, 3))}`);

  process.stdout.write(JSON.stringify({
    ok: true,
    sliderValue,
    boardBounds,
    seenModes: [...seenModes],
  }, null, 2));
} finally {
  await cdp.send('Target.disposeBrowserContext', { browserContextId: page.contextId });
  cdp.socket.close();
}
