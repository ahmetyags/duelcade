/* global Buffer */

import { writeFile } from 'node:fs/promises';

const CDP_URL = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:3001';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ?? '/tmp/duelcade-e2e';
const VIEWPORT_WIDTH = Number(process.env.VIEWPORT_WIDTH ?? 430);
const VIEWPORT_HEIGHT = Number(process.env.VIEWPORT_HEIGHT ?? 932);
const SKIP_RECONNECT_CHECKS = process.env.SKIP_RECONNECT_CHECKS === '1';

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class CdpConnection {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.socket = new WebSocket(url);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      this.events.push(message);
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.socket.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(cdp, page, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, page.sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'Browser evaluation failed');
  }
  return result.result.value;
}

async function createPage(cdp) {
  const context = await cdp.send('Target.createBrowserContext');
  const target = await cdp.send('Target.createTarget', {
    url: 'about:blank',
    browserContextId: context.browserContextId,
  });
  const attached = await cdp.send('Target.attachToTarget', {
    targetId: target.targetId,
    flatten: true,
  });
  const page = {
    contextId: context.browserContextId,
    targetId: target.targetId,
    sessionId: attached.sessionId,
  };
  await Promise.all([
    cdp.send('Page.enable', {}, page.sessionId),
    cdp.send('Runtime.enable', {}, page.sessionId),
    cdp.send('Log.enable', {}, page.sessionId),
  ]);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: 1,
    mobile: true,
  }, page.sessionId);
  return page;
}

async function navigate(cdp, page, url) {
  await cdp.send('Page.navigate', { url }, page.sessionId);
  await waitUntil(cdp, page, 'document.readyState === "complete"', 20_000);
}

async function waitUntil(cdp, page, expression, timeoutMs = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(cdp, page, `Boolean(${expression})`)) return;
    await sleep(100);
  }
  const body = await bodyText(cdp, page);
  throw new Error(`Timed out waiting for ${expression}\n${body.slice(0, 1200)}`);
}

function bodyText(cdp, page) {
  return evaluate(cdp, page, 'document.body?.innerText ?? ""');
}

async function waitForText(cdp, page, text, timeoutMs = 10_000) {
  await waitUntil(
    cdp,
    page,
    `(document.body?.innerText ?? "").includes(${JSON.stringify(text)})`,
    timeoutMs,
  );
}

async function clickText(cdp, page, ...labels) {
  const clicked = await evaluate(cdp, page, `(() => {
    const labels = ${JSON.stringify(labels)};
    const nodes = [...document.querySelectorAll(
      '[role="button"], [role="radio"], [role="switch"], [role="tab"], [aria-label], button, a, [tabindex="0"]',
    )];
    for (const label of labels) {
      const candidates = nodes.filter((candidate) => {
        const text = (candidate.getAttribute('aria-label') || candidate.innerText || '').trim();
        return text === label;
      });
      const node = candidates[0] ?? nodes
        .filter((candidate) => {
          const text = (candidate.getAttribute('aria-label') || candidate.innerText || '').trim();
          return text.includes(label);
        })
        .sort((left, right) => (left.innerText?.length ?? 0) - (right.innerText?.length ?? 0))[0];
      if (!node) continue;
      node.scrollIntoView({ block: 'center' });
      node.click();
      return label;
    }
    return null;
  })()`);
  if (!clicked) {
    const available = await evaluate(cdp, page, `[...document.querySelectorAll('[aria-label]')]
      .map((node) => node.getAttribute('aria-label')).filter(Boolean)`);
    throw new Error(`Button not found: ${labels.join(' / ')}\nAvailable: ${JSON.stringify(available)}`);
  }
  await sleep(180);
}

async function fillInput(cdp, page, index, value) {
  const focused = await evaluate(cdp, page, `(() => {
    const inputs = [...document.querySelectorAll('input, textarea')]
      .filter((candidate) => candidate.getClientRects().length > 0);
    const input = inputs[${index}];
    if (!input) return false;
    input.focus();
    input.select();
    return true;
  })()`);
  if (!focused) throw new Error(`Input ${index} was not found`);
  await cdp.send('Input.insertText', { text: value }, page.sessionId);
  await sleep(180);
  const actualValue = await evaluate(
    cdp,
    page,
    `([...document.querySelectorAll('input, textarea')]
      .filter((candidate) => candidate.getClientRects().length > 0)[${index}]?.value ?? null)`,
  );
  if (actualValue !== value) {
    throw new Error(`Input ${index} expected ${JSON.stringify(value)}, received ${JSON.stringify(actualValue)}`);
  }
}

async function clickMapAt(cdp, page, xPercent, yPercent) {
  const normalizedPoint =
    xPercent === 20 && yPercent === 103
      ? { x: 0.153, y: 0.39 }
      : xPercent === 50 && yPercent === 62
        ? { x: 0.49, y: 0.59 }
        : xPercent === 78 && yPercent === 25
          ? { x: 0.616, y: 0.455 }
          : { x: 0.715, y: 0.44 };
  const moved = await evaluate(cdp, page, `(() => {
    const map = document.querySelector(
      '[aria-label="Etkileşimli güvenli sunucu odası"], [aria-label="Interactive secure server room"]',
    );
    if (!map) return false;
    map.scrollIntoView({ block: 'center' });
    const bounds = map.getBoundingClientRect();
    const scale = Math.min(bounds.width / 1672, bounds.height / 941);
    const imageWidth = 1672 * scale;
    const imageHeight = 941 * scale;
    const imageLeft = bounds.left + (bounds.width - imageWidth) / 2;
    const imageTop = bounds.top + (bounds.height - imageHeight) / 2;
    map.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: imageLeft + imageWidth * ${normalizedPoint.x},
      clientY: imageTop + imageHeight * ${normalizedPoint.y},
    }));
    return true;
  })()`);
  if (!moved) throw new Error('Interactive map was not found');
  await sleep(750);
}

async function capturePlaybackSequence(cdp, page, labelPattern, expectedLength) {
  await waitUntil(
    cdp,
    page,
    `(() => {
      const node = document.querySelector('[aria-label="Tekrar İzle"], [aria-label="Replay"]');
      return Boolean(node) && node.getAttribute('aria-disabled') !== 'true';
    })()`,
    8_000,
  );
  await clickText(cdp, page, 'Tekrar İzle', 'Replay');
  const captured = [];
  let previous = null;
  const started = Date.now();
  while (Date.now() - started < 8_000 && captured.length < expectedLength) {
    const selectedLabel = await evaluate(cdp, page, `(() => {
      const pattern = new RegExp(${JSON.stringify(labelPattern)}, 'i');
      const candidates = [...document.querySelectorAll('[aria-label]')]
        .filter((node) => pattern.test(node.getAttribute('aria-label') ?? ''));
      const selected = [...document.querySelectorAll(
        '[aria-selected="true"][aria-label], [aria-checked="true"][aria-label], ' +
        '[aria-valuetext="active"][aria-label]',
      )].find((node) => pattern.test(node.getAttribute('aria-label') ?? '')) ??
        candidates.find((node) => {
          const style = getComputedStyle(node);
          return style.backgroundColor.includes('30, 232, 207') ||
            style.backgroundColor.includes('53, 217, 135') ||
            style.borderColor.includes('53, 217, 135');
        });
      return selected?.getAttribute('aria-label') ?? null;
    })()`);
    if (selectedLabel && selectedLabel !== previous) {
      const value = Number(selectedLabel.match(/\d+/)?.[0]);
      if (Number.isFinite(value)) captured.push(value);
    }
    previous = selectedLabel;
    await sleep(60);
  }
  if (captured.length !== expectedLength) {
    const diagnostics = await evaluate(cdp, page, `(() => {
      const pattern = new RegExp(${JSON.stringify(labelPattern)}, 'i');
      return [...document.querySelectorAll('[aria-label]')]
        .filter((node) => pattern.test(node.getAttribute('aria-label') ?? ''))
        .map((node) => ({
          label: node.getAttribute('aria-label'),
          checked: node.getAttribute('aria-checked'),
          selected: node.getAttribute('aria-selected'),
          valueText: node.getAttribute('aria-valuetext'),
          background: getComputedStyle(node).backgroundColor,
          border: getComputedStyle(node).borderColor,
        }));
    })()`);
    throw new Error(`Playback capture failed: ${JSON.stringify({ captured, diagnostics })}`);
  }
  await waitUntil(
    cdp,
    page,
    `(() => {
      const node = document.querySelector('[aria-label="Tekrar İzle"], [aria-label="Replay"]');
      return Boolean(node) && node.getAttribute('aria-disabled') !== 'true';
    })()`,
    5_000,
  );
  return captured;
}

async function solveFuseDevice(cdp, page) {
  await waitForText(cdp, page, 'Ana Sigorta Kutusu', 10_000);
  await screenshot(cdp, page, 'device-fuse.png');
  const order = await capturePlaybackSequence(
    cdp,
    page,
    '(sigortayı etkinleştir|activate fuse)',
    4,
  );
  for (const fuse of order) await clickText(cdp, page, `${fuse}. sigortayı etkinleştir`);
  await clickText(cdp, page, 'Ana Güç Kolunu Çek');
  await waitForText(cdp, page, 'KEŞİF HARİTASI', 10_000);
}

async function solveTerminalDevice(cdp, page) {
  await waitForText(cdp, page, 'Güvenlik Terminali', 10_000);
  await screenshot(cdp, page, 'device-terminal.png');
  const signal = await capturePlaybackSequence(
    cdp,
    page,
    '(terminal hücresi|terminal cell)',
    5,
  );
  for (const cell of signal) await clickText(cdp, page, `${cell}. terminal hücresi`);
  await waitForText(cdp, page, 'Hedef düğmeler:', 5_000);
  const dialText = await bodyText(cdp, page);
  const targets = dialText.match(/Hedef düğmeler:\s*([0-3](?:\s*·\s*[0-3]){3})/)?.[1]
    ?.split('·')
    .map((value) => Number(value.trim()));
  if (!targets || targets.length !== 4) {
    throw new Error(`Terminal targets were not found:\n${dialText.slice(0, 1000)}`);
  }
  for (let dial = 0; dial < targets.length; dial += 1) {
    for (let turn = 0; turn < targets[dial]; turn += 1) {
      await clickText(cdp, page, `${dial + 1}. terminal düğmesi`);
    }
  }
  await clickText(cdp, page, 'Sinyali Doğrula');
  await waitForText(cdp, page, 'KEŞİF HARİTASI', 10_000);
}

async function solveAccessDevice(cdp, page) {
  await waitForText(cdp, page, 'Erişim Kaydı Okuyucusu', 10_000);
  await screenshot(cdp, page, 'device-access.png');
  const records = await evaluate(cdp, page, `(() =>
    [...document.querySelectorAll('[aria-label]')]
      .map((node) => node.getAttribute('aria-label') ?? '')
      .map((label) => {
        const match = label.match(/^(\\d+)\\. kayıt, risk (\\d+)/i);
        return match ? { label, row: Number(match[1]), risk: Number(match[2]) } : null;
      })
      .filter(Boolean)
  )()`);
  if (records.length !== 6) throw new Error(`Access rows were not found: ${JSON.stringify(records)}`);
  for (const { label, risk } of records) {
    const category = risk < 40 ? 'YEŞİL' : risk < 70 ? 'AMBER' : 'KIRMIZI';
    await clickText(cdp, page, label);
    await clickText(cdp, page, `${category} kategorisini ata`);
  }
  await clickText(cdp, page, 'Kartı Doğrula');
  await waitForText(cdp, page, 'KEŞİF HARİTASI', 10_000);
}

async function solveDoorDevice(cdp, page) {
  await waitForText(cdp, page, 'Çıkış Kapısı Kilidi', 10_000);
  await screenshot(cdp, page, 'device-door.png');
  const text = await bodyText(cdp, page);
  const targets = text.match(/Hizalama imzası:\s*([0-7](?:\s*·\s*[0-7]){3})/)?.[1]
    ?.split('·')
    .map((value) => Number(value.trim()));
  if (!targets || targets.length !== 4) throw new Error(`Door targets were not found:\n${text.slice(0, 1000)}`);
  for (let ring = 0; ring < targets.length; ring += 1) {
    for (let turn = 0; turn < targets[ring]; turn += 1) {
      await clickText(cdp, page, `${ring + 1}. kilit halkası`);
    }
  }
  await clickText(cdp, page, 'Sol Sürgüyü Aç');
  await clickText(cdp, page, 'Sağ Sürgüyü Aç');
}

async function screenshot(cdp, page, fileName) {
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  }, page.sessionId);
  await writeFile(`${ARTIFACT_DIR}/${fileName}`, Buffer.from(result.data, 'base64'));
}

function solveRuneEquation(text) {
  const normalized = text.replace(/\s+/g, ' ');
  const equations = [...normalized.matchAll(/([◆●✦](?: \+ [◆●✦])+)\s*=\s*(\d+)/g)]
    .map((match) => ({
      runes: match[1].split(' + '),
      total: Number(match[2]),
    }));
  const values = new Map();
  for (let pass = 0; pass < 4; pass += 1) {
    for (const equation of equations) {
      const unknown = equation.runes.filter((rune) => !values.has(rune));
      const uniqueUnknown = [...new Set(unknown)];
      if (uniqueUnknown.length !== 1) continue;
      const rune = uniqueUnknown[0];
      const knownTotal = equation.runes
        .filter((item) => values.has(item))
        .reduce((sum, item) => sum + values.get(item), 0);
      const count = equation.runes.filter((item) => item === rune).length;
      values.set(rune, (equation.total - knownTotal) / count);
    }
  }
  const question = normalized.match(/([◆●✦]) \+ ([◆●✦]) × ([◆●✦])\s*=\s*\?/);
  if (!question || [...question.slice(1)].some((rune) => !values.has(rune))) {
    throw new Error(`Rune equation could not be solved: ${normalized.slice(0, 600)}`);
  }
  return values.get(question[1]) + values.get(question[2]) * values.get(question[3]);
}

function transformedSerpentine(size, rotation, flip) {
  const order = [];
  for (let row = 0; row < size; row += 1) {
    const columns = Array.from({ length: size }, (_, column) => column);
    if (row % 2 === 1) columns.reverse();
    for (const originalColumn of columns) {
      let transformedRow = row;
      let transformedColumn = flip ? size - 1 - originalColumn : originalColumn;
      for (let turn = 0; turn < rotation; turn += 1) {
        [transformedRow, transformedColumn] = [
          transformedColumn,
          size - 1 - transformedRow,
        ];
      }
      order.push(transformedRow * size + transformedColumn);
    }
  }
  return order;
}

async function solveColorPaths(cdp, page) {
  const cells = await evaluate(cdp, page, `(() => [...document.querySelectorAll('[role="button"]')]
    .map((node) => ({ label: node.getAttribute('aria-label') ?? '' }))
    .filter(({ label }) => /(?:satır|row).*(?:sütun|column)/i.test(label)))()`);
  const parsed = cells.map(({ label }) => {
    const numbers = [...label.matchAll(/\d+/g)].map((match) => Number(match[0]));
    const endpoint = label.match(/[◆●▲■]\s+([a-z]+)/i);
    return {
      label,
      row: numbers[0],
      column: numbers[1],
      pairId: endpoint?.[1] ?? null,
    };
  });
  const size = Math.max(...parsed.map((cell) => cell.row));
  const endpoints = new Map();
  for (const cell of parsed) {
    if (!cell.pairId) continue;
    const values = endpoints.get(cell.pairId) ?? [];
    values.push((cell.row - 1) * size + cell.column - 1);
    endpoints.set(cell.pairId, values);
  }

  let solution = null;
  for (let rotation = 0; rotation < 4 && !solution; rotation += 1) {
    for (const flip of [false, true]) {
      const order = transformedSerpentine(size, rotation, flip);
      const intervals = [...endpoints.entries()].map(([pairId, pairEndpoints]) => {
        const positions = pairEndpoints.map((endpoint) => order.indexOf(endpoint)).sort((a, b) => a - b);
        return { pairId, start: positions[0], end: positions[1] };
      });
      const ownership = new Array(size * size).fill(null);
      let valid = intervals.length === endpoints.size;
      for (const interval of intervals) {
        if (interval.start < 0 || interval.end < interval.start) valid = false;
        for (let index = interval.start; index <= interval.end; index += 1) {
          if (ownership[index]) valid = false;
          ownership[index] = interval.pairId;
        }
      }
      if (valid && ownership.every(Boolean)) {
        solution = intervals.map((interval) =>
          order.slice(interval.start, interval.end + 1));
        break;
      }
    }
  }
  if (!solution) throw new Error(`Color path board could not be solved: ${JSON.stringify(parsed)}`);

  for (const path of solution) {
    for (const index of path) {
      const row = Math.floor(index / size) + 1;
      const column = index % size + 1;
      const label = parsed.find((cell) => cell.row === row && cell.column === column)?.label;
      if (!label) throw new Error(`Missing color path cell ${row}, ${column}`);
      const clicked = await evaluate(cdp, page, `(() => {
        const node = [...document.querySelectorAll('[role="button"]')]
          .find((candidate) => candidate.getAttribute('aria-label') === ${JSON.stringify(label)});
        node?.click();
        return Boolean(node);
      })()`);
      if (!clicked) throw new Error(`Could not click color path cell ${row}, ${column}`);
      await sleep(35);
    }
  }
  return { size, pairCount: endpoints.size };
}

async function solveGuideLock(cdp, page) {
  await waitUntil(
    cdp,
    page,
    `(document.body?.innerText ?? '').includes('Ruh Kilidi') ||
     (document.body?.innerText ?? '').includes('Renkli Bomba Düzeneği')`,
    15_000,
  );
  const guideBody = await bodyText(cdp, page);
  if (guideBody.includes('Renkli Bomba Düzeneği')) {
    const solution = await solveColorPaths(cdp, page);
    await clickText(cdp, page, 'İpucunun Kilidini Aç', 'Unlock the Clue');
    await waitUntil(
      cdp,
      page,
      `!(document.body?.innerText ?? '').includes('İpucunun Kilidini Aç')`,
      10_000,
    );
    return { kind: 'color_paths', ...solution };
  }

  const runeAnswer = solveRuneEquation(guideBody);
  await clickText(cdp, page, String(runeAnswer));
  await clickText(cdp, page, 'İpucunun Kilidini Aç', 'Unlock the Clue');
  await waitUntil(
    cdp,
    page,
    `!(document.body?.innerText ?? '').includes('İpucunun Kilidini Aç')`,
    10_000,
  );
  return { kind: 'rune_equation', runeAnswer };
}

async function activateCurrentStation(cdp, page, needsFuse) {
  await clickText(cdp, page, 'Haritayı Aç', 'Open Map');
  await waitForText(cdp, page, 'KEŞİF HARİTASI', 10_000);
  await clickMapAt(cdp, page, needsFuse ? 20 : 50, needsFuse ? 103 : 62);
  if (needsFuse) await solveFuseDevice(cdp, page);
  else await solveTerminalDevice(cdp, page);
  const mapFeedback = await bodyText(cdp, page);
  const rejectedMapMessages = [
    'Önce Ruh Rehberinin Ruh Kilidini çözmesi gerekiyor.',
    'Bu istasyon mevcut bulmacada kullanılmıyor.',
    'Bu sahne nesnesi henüz kullanılamıyor.',
  ];
  const rejectedMapMessage = rejectedMapMessages.find((message) => mapFeedback.includes(message));
  if (rejectedMapMessage) {
    throw new Error(`Scene station rejected: ${rejectedMapMessage}\n${mapFeedback.slice(0, 1000)}`);
  }
  await clickText(cdp, page, 'Görev', 'Task');
  try {
    await waitUntil(
      cdp,
      page,
      `!(document.body?.innerText ?? '').includes('Bulmaca İstasyonunu Bul')`,
      10_000,
    );
  } catch (error) {
    throw new Error(
      `Station did not unlock. Scene feedback before leaving map:\n${mapFeedback.slice(0, 1200)}`,
      { cause: error },
    );
  }
}

function orderedMatches(text, expression, valueIndex = 2) {
  return [...text.matchAll(expression)]
    .sort((left, right) => Number(left[1]) - Number(right[1]))
    .map((match) => match[valueIndex]);
}

async function solveCurrentFieldPuzzle(cdp, host, guest) {
  await Promise.all([
    clickText(cdp, host, 'Görev', 'Task'),
    clickText(cdp, guest, 'Görev', 'Task'),
  ]);
  const [hostBody, guestBody] = await Promise.all([
    bodyText(cdp, host),
    bodyText(cdp, guest),
  ]);

  if (guestBody.includes('GÜVENLİK PANELİ')) {
    const code = hostBody.match(/\b\d{5}\b/)?.[0] ?? hostBody.match(/\b\d{4,6}\b/)?.[0];
    if (!code) throw new Error(`Authorized code was not found:\n${hostBody.slice(0, 900)}`);
    for (const digit of code) await clickText(cdp, guest, `${digit} rakamı`, `Digit ${digit}`);
    await clickText(cdp, guest, 'Kodu onayla', 'Submit code');
    return 'code';
  }

  if (guestBody.includes('GÜÇ DAĞITIMI')) {
    const colorNames = ['kırmızı', 'mavi', 'sarı', 'yeşil', 'mor'];
    const lines = hostBody
      .split(/\n+/)
      .map((line) => line.trim().toLocaleLowerCase('tr-TR'))
      .filter(Boolean);
    const connections = [];
    for (const color of colorNames) {
      const index = lines.indexOf(color);
      if (index < 0) continue;
      const terminal = lines.slice(index + 1, index + 5).find((line) => /^t\d+$/.test(line));
      if (terminal) connections.push({ color, terminal: terminal.toUpperCase() });
    }
    if (connections.length < 3) {
      throw new Error(`Circuit schema could not be parsed:\n${hostBody.slice(0, 900)}`);
    }
    for (const { color, terminal } of connections) {
      await clickText(cdp, guest, `${color} kablosu`);
      await clickText(cdp, guest, `${terminal} terminali`);
    }
    await clickText(cdp, guest, 'Onayla', 'Submit');
    return 'circuit';
  }

  if (guestBody.includes('KADİM SEMBOL PANELİ')) {
    const symbols = orderedMatches(
      hostBody,
      /(\d+)\.?\s*(üçgen|daire|kare|baklava|altıgen|yıldız|çarpı|dalga)/gi,
    );
    if (symbols.length < 4) throw new Error(`Symbol sequence could not be parsed:\n${hostBody.slice(0, 900)}`);
    for (const symbol of symbols) await clickText(cdp, guest, symbol.toLocaleLowerCase('tr-TR'));
    await clickText(cdp, guest, 'Onayla', 'Submit');
    return 'symbol';
  }

  if (guestBody.includes('ROTA KONSOLU')) {
    const route = orderedMatches(hostBody, /(\d+)\.?\s*(YUKARI|SAĞ|AŞAĞI|SOL)/g);
    if (route.length < 4) throw new Error(`Route sequence could not be parsed:\n${hostBody.slice(0, 900)}`);
    for (const direction of route) await clickText(cdp, guest, direction);
    await clickText(cdp, guest, 'Onayla', 'Submit');
    return 'map';
  }

  if (guestBody.includes('SİNYAL TEKRARI')) {
    const sequence = orderedMatches(hostBody, /(\d+)\.?\s*(ALPHA|BETA|GAMMA|DELTA)/g);
    if (sequence.length < 4) throw new Error(`Memory sequence could not be parsed:\n${hostBody.slice(0, 900)}`);
    for (const value of sequence) await clickText(cdp, guest, value);
    await clickText(cdp, guest, 'Onayla', 'Submit');
    return 'memory_sequence';
  }

  if (guestBody.includes('Sihirli Boru Akışı')) {
    const getPipes = (page) => evaluate(cdp, page, `([...document.querySelectorAll('[aria-label]')]
      .map((node) => node.getAttribute('aria-label'))
      .filter((label) => /^\\d+\\. boru,/.test(label)))`);
    const [targetLabels, currentLabels] = await Promise.all([getPipes(host), getPipes(guest)]);
    const parseRotations = (labels) => Object.fromEntries(labels.map((label) => {
      const match = label.match(/^(\d+)\. boru,.*?(\d+) tur$/);
      return match ? [Number(match[1]), Number(match[2])] : [0, 0];
    }));
    const target = parseRotations(targetLabels);
    const current = parseRotations(currentLabels);
    if (Object.keys(target).length !== 9 || Object.keys(current).length !== 9) {
      throw new Error(`Pipe labels were incomplete: ${JSON.stringify({ targetLabels, currentLabels })}`);
    }
    for (let pipe = 1; pipe <= 9; pipe += 1) {
      const turns = (target[pipe] - current[pipe] + 4) % 4;
      for (let turn = 0; turn < turns; turn += 1) {
        const clicked = await evaluate(cdp, guest, `(() => {
          const node = [...document.querySelectorAll('[role="button"][aria-label]')]
            .find((candidate) => candidate.getAttribute('aria-label')?.startsWith('${pipe}. boru,'));
          node?.click();
          return Boolean(node);
        })()`);
        if (!clicked) throw new Error(`Pipe ${pipe} could not be rotated`);
        await sleep(60);
      }
    }
    await clickText(cdp, guest, 'Sihir Akışını Başlat');
    return 'logic';
  }

  if (guestBody.includes('Rezonans Bomba Düzeneği')) {
    const targets = [...hostBody.matchAll(/([A-D]) KANALI\s+(\d+) Hz/g)]
      .map((match) => ({ channel: match[1], frequency: Number(match[2]) }));
    if (targets.length < 3) throw new Error(`Frequencies could not be parsed:\n${hostBody.slice(0, 900)}`);
    for (const target of targets) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const text = await bodyText(cdp, guest);
        const current = Number(text.match(new RegExp(`${target.channel} KANALI\\s+(\\d+)\\s+Hz`))?.[1]);
        if (current === target.frequency) break;
        await clickText(cdp, guest, `${target.channel} kanalını artır`);
        if (attempt === 9) {
          throw new Error(`Channel ${target.channel} did not reach ${target.frequency}`);
        }
      }
    }
    await clickText(cdp, guest, 'Düzeneği Sabitle');
    return 'timing';
  }

  throw new Error(`Unknown field puzzle:\n${guestBody.slice(0, 1200)}`);
}

const version = await fetch(`${CDP_URL}/json/version`).then((response) => response.json());
const cdp = new CdpConnection(version.webSocketDebuggerUrl);
await cdp.open();

const host = await createPage(cdp);
const guest = await createPage(cdp);

try {
  await Promise.all([
    navigate(cdp, host, APP_URL),
    navigate(cdp, guest, APP_URL),
  ]);
  await Promise.all([
    waitForText(cdp, host, 'Macera Oluştur', 20_000),
    waitForText(cdp, guest, 'Arkadaşına Katıl', 20_000),
  ]);
  await screenshot(cdp, host, 'home-industrial.png');

  await clickText(cdp, host, 'Ayarlar', 'Settings');
  await waitForText(cdp, host, 'ERİŞİLEBİLİRLİK', 10_000);
  await clickText(cdp, host, 'English');
  await waitForText(cdp, host, 'ACCESSIBILITY', 10_000);
  await clickText(cdp, host, 'Go back');
  await waitForText(cdp, host, 'Create an Adventure', 10_000);
  await clickText(cdp, host, 'Settings');
  await waitForText(cdp, host, 'ACCESSIBILITY', 10_000);

  const enabledSwitches = [
    'Colorblind Mode',
    'Reduce Motion',
    'High Contrast',
    'Large Text',
    'Left-Handed Mode',
    'Visual Alerts',
  ];
  for (const label of enabledSwitches) await clickText(cdp, host, label);
  await clickText(cdp, host, 'Vibration');
  await clickText(cdp, host, 'Decrease Button Sound');

  await cdp.send('Page.reload', {}, host.sessionId);
  await waitForText(cdp, host, 'ACCESSIBILITY', 15_000);
  await waitUntil(cdp, host, `(() => {
    const checked = (label) => {
      const node = document.querySelector('[aria-label="' + label + '"]');
      return node?.checked === true ||
        node?.getAttribute('aria-checked') === 'true' ||
        node?.querySelector?.('input')?.checked === true;
    };
    const enabled = ${JSON.stringify(enabledSwitches)};
    return enabled.every(checked) && !checked('Vibration');
  })()`, 10_000);
  await waitUntil(
    cdp,
    host,
    `Boolean(document.querySelector('[aria-label="Button Sound is at 50 percent"]'))`,
    10_000,
  );
  await screenshot(cdp, host, 'settings-persisted.png');

  await clickText(cdp, host, 'Reset All Settings');
  await waitForText(cdp, host, 'ERİŞİLEBİLİRLİK', 10_000);
  await waitUntil(cdp, host, `(() => {
    const checked = (node) => node?.checked === true ||
      node?.getAttribute('aria-checked') === 'true' ||
      node?.querySelector?.('input')?.checked === true;
    const labels = ['Renk Körü Modu', 'Titreşim', 'Hareketi Azalt', 'Yüksek Kontrast', 'Büyük Metin', 'Sol El Modu', 'Görsel Uyarılar'];
    const switches = labels.map((label) => document.querySelector('[aria-label="' + label + '"]')).filter(Boolean);
    return switches.length === 7 &&
      switches.filter(checked).length === 1 &&
      checked(document.querySelector('[aria-label="Titreşim"]'));
  })()`, 10_000);
  await navigate(cdp, host, APP_URL);
  await waitForText(cdp, host, 'Macera Oluştur', 10_000);

  await clickText(cdp, host, 'Macera Oluştur', 'Create an Adventure');
  await waitForText(cdp, host, 'Macera Oluştur');
  await fillInput(cdp, host, 0, 'Tarayıcı Rehber');
  await clickText(cdp, host, 'Ruh Rehberi', 'Spirit Guide');
  await clickText(cdp, host, 'Orta', 'Medium');
  const puzzleCount = 7;
  await clickText(cdp, host, '7\nBULMACA', '7\nPUZZLES');
  await clickText(cdp, host, 'Oluştur ve Kodu Paylaş', 'Create & Share the Code');
  await waitForText(cdp, host, 'Macera Kampı', 12_000);

  const roomCode = await evaluate(cdp, host, `(() => {
    const lines = (document.body?.innerText ?? '').split(/\\n+/).map((line) => line.trim());
    const marker = lines.findIndex((line) => line === 'ODA KODU' || line === 'ROOM CODE');
    if (marker < 0) return '';
    return lines.slice(marker + 1).filter((line) => /^[A-Z2-9]$/.test(line)).slice(0, 6).join('');
  })()`);
  if (!/^[A-Z2-9]{6}$/.test(roomCode)) throw new Error(`Invalid room code: ${roomCode}`);

  await clickText(cdp, guest, 'Arkadaşına Katıl', 'Join a Friend');
  await waitForText(cdp, guest, 'ODA KODU');
  await fillInput(cdp, guest, 0, roomCode);
  await fillInput(cdp, guest, 1, 'Tarayıcı Maceracı');
  await clickText(cdp, guest, 'Maceracı', 'Adventurer');
  await clickText(cdp, guest, 'Maceraya Katıl', 'Join the Adventure');
  await Promise.all([
    waitForText(cdp, host, 'OYUNCULAR (2/2)', 12_000),
    waitForText(cdp, guest, 'OYUNCULAR (2/2)', 12_000),
  ]);

  if (!SKIP_RECONNECT_CHECKS) {
    await waitUntil(
      cdp,
      guest,
      `(() => {
        const raw = localStorage.getItem('duelcade_settings');
        return raw?.includes('lastRoomReconnectToken') && raw?.includes(${JSON.stringify(roomCode)});
      })()`,
      10_000,
    );
    await cdp.send('Page.reload', {}, guest.sessionId);
    await waitForText(cdp, guest, `${roomCode} koduyla devam et`, 15_000);
    await clickText(cdp, guest, `${roomCode} koduyla devam et`, `Continue with ${roomCode}`);
    await waitForText(cdp, guest, 'Macera Kampı', 15_000);
    await waitForText(cdp, guest, 'OYUNCULAR (2/2)', 10_000);
  }

  await Promise.all([
    clickText(cdp, host, 'Hazırım', 'Ready Up'),
    clickText(cdp, guest, 'Hazırım', 'Ready Up'),
  ]);
  await Promise.all([
    waitUntil(
      cdp,
      host,
      `(document.body?.innerText ?? '').includes('Ruh Kilidi') ||
       (document.body?.innerText ?? '').includes('Renkli Bomba Düzeneği')`,
      15_000,
    ),
    waitForText(cdp, guest, 'Bulmaca İstasyonunu Bul', 15_000),
  ]);
  await screenshot(cdp, host, 'host-guide-lock.png');

  await clickText(cdp, host, 'İpucu', 'Hint');
  await waitForText(cdp, host, 'Yeni bir ipucu istemeden önce biraz bekle.', 10_000);
  await clickText(cdp, host, 'Bildirimi kapat', 'Dismiss notification');

  const guideSolutions = [await solveGuideLock(cdp, host)];

  const guestTaskBody = await bodyText(cdp, guest);
  const needsFuse = guestTaskBody.includes('Ana Sigorta Kutusuna');
  await clickText(cdp, guest, 'Haritayı Aç', 'Open Map');
  await waitForText(cdp, guest, 'KEŞİF HARİTASI', 10_000);
  await screenshot(cdp, guest, 'guest-map.png');
  await clickMapAt(cdp, guest, needsFuse ? 20 : 50, needsFuse ? 103 : 62);
  if (needsFuse) await solveFuseDevice(cdp, guest);
  else await solveTerminalDevice(cdp, guest);
  await clickText(cdp, guest, 'Görev', 'Task');
  await waitUntil(
    cdp,
    guest,
    `!(document.body?.innerText ?? '').includes('Bulmaca İstasyonunu Bul')`,
    10_000,
  );
  await clickText(cdp, guest, 'Harita', 'Map');
  await waitForText(cdp, guest, 'KEŞİF HARİTASI', 10_000);

  await clickMapAt(cdp, guest, 78, 25);
  await solveAccessDevice(cdp, guest);
  const guestHasRemovedBag = await evaluate(
    cdp,
    guest,
    `Boolean(document.querySelector('[aria-label="Çanta"], [aria-label="Bag"]'))`,
  );
  if (guestHasRemovedBag) throw new Error('Removed Bag tab is still rendered');

  await clickText(cdp, host, 'Mesaj', 'Signals');
  await fillInput(cdp, host, 0, 'Boruları satır satır kontrol et.');
  await clickText(cdp, host, 'Mesaj gönder', 'Send message');
  await waitForText(cdp, host, 'Boruları satır satır kontrol et.', 10_000);
  await clickText(cdp, guest, 'Mesaj', 'Signals');
  await waitForText(cdp, guest, 'Boruları satır satır kontrol et.', 10_000);
  await screenshot(cdp, guest, 'guest-chat.png');

  await clickText(cdp, host, 'Bak', 'Look');
  await waitForText(cdp, guest, 'Tarayıcı Rehber sinyal gönderdi', 10_000);
  await waitUntil(
    cdp,
    host,
    `document.querySelector('[aria-label="Bak"], [aria-label="Look"]')?.getAttribute('aria-disabled') === 'true'`,
    5_000,
  );
  await waitUntil(
    cdp,
    guest,
    `!(document.body?.innerText ?? '').includes('Tarayıcı Rehber sinyal gönderdi')`,
    6_000,
  );

  const hostHasRemovedTools = await evaluate(
    cdp,
    host,
    `Boolean(document.querySelector('[aria-label="Araçlar"], [aria-label="Tools"]'))`,
  );
  if (hostHasRemovedTools) throw new Error('Removed Tools tab is still rendered');

  await clickText(cdp, host, 'Yolculuk', 'Journey');
  await waitForText(cdp, host, 'Macera Yolu', 10_000);
  await waitForText(cdp, host, '1. Gizem', 10_000);

  const puzzleCategories = [];
  for (let puzzleIndex = 0; puzzleIndex < puzzleCount; puzzleIndex += 1) {
    if (puzzleIndex > 0) {
      guideSolutions.push(await solveGuideLock(cdp, host));
      const taskBody = await bodyText(cdp, guest);
      await activateCurrentStation(cdp, guest, taskBody.includes('Ana Sigorta Kutusuna'));
    }

    const category = await solveCurrentFieldPuzzle(cdp, host, guest);
    puzzleCategories.push(category);
    await waitUntil(
      cdp,
      host,
      `(document.body?.innerText ?? '').includes('${puzzleIndex + 1}/${puzzleCount}')`,
      12_000,
    );
    if (puzzleIndex === 0 && !SKIP_RECONNECT_CHECKS) {
      await cdp.send('Page.reload', {}, guest.sessionId);
      await waitForText(cdp, guest, `${roomCode} koduyla devam et`, 15_000);
      await clickText(cdp, guest, `${roomCode} koduyla devam et`, `Continue with ${roomCode}`);
      await waitUntil(
        cdp,
        guest,
        `(document.body?.innerText ?? '').includes('1/${puzzleCount}')`,
        15_000,
      );
      const restoredBag = await evaluate(
        cdp,
        guest,
        `Boolean(document.querySelector('[aria-label="Çanta"], [aria-label="Bag"]'))`,
      );
      if (restoredBag) throw new Error('Removed Bag tab returned after reconnect');
    }
    if (puzzleIndex < puzzleCount - 1) {
      await waitUntil(
        cdp,
        host,
        `(document.body?.innerText ?? '').includes('Ruh Kilidi') ||
         (document.body?.innerText ?? '').includes('Renkli Bomba Düzeneği')`,
        12_000,
      );
    }
  }

  const expectedCategories = ['code', 'circuit', 'symbol', 'map', 'logic', 'timing'];
  for (const category of expectedCategories) {
    if (!puzzleCategories.includes(category)) {
      throw new Error(`Medium adventure did not exercise ${category}: ${JSON.stringify(puzzleCategories)}`);
    }
  }

  await clickText(cdp, guest, 'Harita', 'Map');
  await waitForText(cdp, guest, 'KEŞİF HARİTASI', 10_000);
  await clickMapAt(cdp, guest, 80, 128);
  await solveDoorDevice(cdp, guest);

  await Promise.all([
    waitForText(cdp, host, 'Çıkış Yolunu Buldunuz!', 15_000),
    waitForText(cdp, guest, 'Çıkış Yolunu Buldunuz!', 15_000),
  ]);
  await screenshot(cdp, guest, 'completed-adventure.png');

  await Promise.all([
    clickText(cdp, host, 'Tekrar Oyna', 'Play Again'),
    clickText(cdp, guest, 'Tekrar Oyna', 'Play Again'),
  ]);
  await Promise.all([
    waitForText(cdp, host, 'Macera Kampı', 15_000),
    waitForText(cdp, guest, 'Macera Kampı', 15_000),
  ]);
  await Promise.all([
    waitForText(cdp, host, 'Hazırım', 10_000),
    waitForText(cdp, guest, 'Hazırım', 10_000),
  ]);

  const browserErrors = cdp.events.filter((event) =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Log.entryAdded' && event.params.entry.level === 'error'),
  );
  if (browserErrors.length > 0) {
    throw new Error(`Browser errors detected: ${JSON.stringify(browserErrors.slice(0, 5))}`);
  }

  process.stdout.write(`${JSON.stringify({
    ok: true,
    roomCode,
    guideSolutions,
    puzzleCategories,
    station: needsFuse ? 'fuse_box_main' : 'room_terminal',
    verified: [
      'two isolated browser contexts',
      'all settings controls and persisted reload state',
      'settings reset without stale values',
      'room create and join',
      'saved-session resume into the same reserved seat after a full page reload',
      'mid-game resume with solved progress checkpoint restored',
      'explicit asymmetric roles',
      'all generated Spirit Locks',
      '2.5D point-and-click scene hotspots',
      'four close-up 2D device puzzles',
      'server-validated station interaction',
      'map-only key-card activation',
      'cross-client chat',
      'server-rejected hint feedback',
      'cross-client quick signals and cooldown',
      'removed Bag and Tools tabs stay absent after reconnect',
      'operator journey progress',
      'all six medium puzzle mechanics through their rendered controls',
      'seven-puzzle full completion and key-card escape',
      'two-player rematch vote and lobby reset',
      'no browser exceptions',
    ],
  }, null, 2)}\n`);
} finally {
  await Promise.allSettled([
    cdp.send('Target.disposeBrowserContext', { browserContextId: host.contextId }),
    cdp.send('Target.disposeBrowserContext', { browserContextId: guest.contextId }),
  ]);
  cdp.close();
}
