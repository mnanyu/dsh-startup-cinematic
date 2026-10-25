/* ============================================================================
 * dsh-startup-cinematic — Host half
 * ----------------------------------------------------------------------------
 *   1) inject a full-screen iframe into index.html before React mounts
 *   2) serve /dsh-cinematic/boot.html (one self-contained document)
 *   3) persist settings at ~/.dsh/dsh-startup-cinematic.json
 *
 * The iframe is intentional: the boot sequence owns its CSS, fonts and canvas,
 * so none of it can leak into the DSH app shell. The parent overlay is a plain
 * black stage and is removed when the iframe posts "dsh-cinematic:done".
 * ========================================================================== */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const CONFIG_FILE = path.join(DSH_HOME, 'dsh-startup-cinematic.json')

const NS = 'dsh-startup-cinematic'
const ROUTE_BASE = '/dsh-cinematic'

const PLUGIN_VERSION = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'))
    return String(pkg.version || '0.0.0')
  } catch (err) {
    return '0.0.0'
  }
})()

const DEFAULTS = {
  enabled: true,
  mode: 'session',          // always | session | daily
  speed: 1,
  name: 'OPERATOR',
  sound: true,
  autoDismiss: true,
  allowSkip: true
}

const MODES = ['always', 'session', 'daily']
const BOOL_KEYS = ['enabled', 'sound', 'autoDismiss', 'allowSkip']

function normalize(input) {
  const out = { ...DEFAULTS }
  const src = input && typeof input === 'object' ? input : {}

  if (typeof src.enabled === 'boolean') out.enabled = src.enabled
  if (MODES.includes(src.mode)) out.mode = src.mode
  if (src.speed !== undefined && src.speed !== null) {
    const n = Number(src.speed)
    if (Number.isFinite(n)) out.speed = Math.min(2, Math.max(0.5, n))
  }
  if (src.name !== undefined && src.name !== null) {
    const s = String(src.name).replace(/[<>]/g, '').trim().slice(0, 24)
    out.name = s || DEFAULTS.name
  }
  for (const key of BOOL_KEYS) {
    if (key === 'enabled') continue
    if (src[key] !== undefined && src[key] !== null) out[key] = src[key] === true || src[key] === 'true'
  }
  return out
}

function readConfig() {
  try {
    return normalize(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')))
  } catch (err) {
    return { ...DEFAULTS }
  }
}

function writeConfig(next) {
  const cfg = normalize(next)
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true })
  const tmp = CONFIG_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8')
  fs.renameSync(tmp, CONFIG_FILE)
  return cfg
}

function makeReader(rel) {
  let cache = null
  return function read() {
    const file = path.join(PACKAGE_ROOT, rel)
    try {
      const st = fs.statSync(file)
      if (!cache || cache.mtimeMs !== st.mtimeMs) {
        cache = { mtimeMs: st.mtimeMs, text: fs.readFileSync(file, 'utf8') }
      }
      return cache.text
    } catch (err) {
      return ''
    }
  }
}

const readBootHtml = makeReader('lib/boot.html')

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '')
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function bootUrl(cfg) {
  const q = new URLSearchParams()
  q.set('embed', '1')
  q.set('v', PLUGIN_VERSION)
  q.set('name', cfg.name)
  q.set('speed', String(cfg.speed))
  q.set('mute', cfg.sound ? '0' : '1')
  q.set('skip', cfg.allowSkip ? '1' : '0')
  q.set('exit', cfg.autoDismiss ? '1' : '0')
  return ROUTE_BASE + '/boot.html?' + q.toString()
}

const CRITICAL_CSS = [
  'html.dsc-lock,html.dsc-lock body{overflow:hidden!important}',
  '#dsh-cinematic-root{position:fixed;inset:0;z-index:2147483000;background:#01030a;overflow:hidden;margin:0;padding:0;border:0}',
  '#dsh-cinematic-root iframe{display:block;width:100%;height:100%;border:0;background:#01030a}'
].join('')

/* Runs before the app mounts. It decides whether this launch should play,
   wires the iframe handshake, and guarantees that a missing/broken iframe can
   never leave the user staring at a black screen. */
const BOOTSTRAP_JS = `(function(){try{
var c=window.__DSH_CINEMATIC__||{};
var root=document.getElementById('dsh-cinematic-root');
var frame=document.getElementById('dsh-cinematic-frame');
window.__DSH_CINEMATIC_BOOT__='index';
function dayKey(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function sget(k){try{return sessionStorage.getItem(k)}catch(e){return null}}
function lget(k){try{return localStorage.getItem(k)}catch(e){return null}}
function sset(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}
function lset(k,v){try{localStorage.setItem(k,v)}catch(e){}}
var skip=!c.enabled;
if(!skip&&c.mode==='session'&&sget('dsh-cinematic:shown')==='1')skip=true;
if(!skip&&c.mode==='daily'&&lget('dsh-cinematic:day')===dayKey())skip=true;
if(skip||!root||!frame){window.__DSH_CINEMATIC_SKIP__='1';if(root&&root.parentNode)root.parentNode.removeChild(root);return;}
var done=false,readyTimer=0,maxTimer=0;
function unlock(){
  try{document.documentElement.classList.remove('dsc-lock')}catch(e){}
  try{if(document.body)document.body.style.overflow=''}catch(e){}
}
function finish(){
  if(done)return;done=true;
  clearTimeout(readyTimer);clearTimeout(maxTimer);
  try{if(root&&root.parentNode)root.parentNode.removeChild(root)}catch(e){}
  unlock();
  window.__DSH_CINEMATIC_DONE__='1';
}
function onMessage(e){
  if(!e||e.source!==frame.contentWindow)return;
  var d=e.data||{};
  if(d.type==='dsh-cinematic:ready'){
    clearTimeout(readyTimer);
    if(c.mode==='session')sset('dsh-cinematic:shown','1');
    if(c.mode==='daily')lset('dsh-cinematic:day',dayKey());
    maxTimer=setTimeout(finish,40000);
  }else if(d.type==='dsh-cinematic:done'){
    finish();
  }
}
window.addEventListener('message',onMessage);
frame.addEventListener('error',function(){setTimeout(finish,300)});
document.documentElement.classList.add('dsc-lock');
try{if(document.body)document.body.style.overflow='hidden'}catch(e){}
frame.src=frame.getAttribute('data-src')||'';
readyTimer=setTimeout(finish,8000);
}catch(e){
  try{var r=document.getElementById('dsh-cinematic-root');if(r&&r.parentNode)r.parentNode.removeChild(r);document.documentElement.classList.remove('dsc-lock');if(document.body)document.body.style.overflow='';}catch(_){}
}})()`

const name = NS
const inject = ['webServer', 'connection']

function resolveWebServer(ctx) {
  try {
    const viaGet = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined
    if (viaGet) return viaGet
  } catch (err) { /* noop */ }
  return ctx.webServer
}

function hasRoutes(server) {
  return !!server && typeof server.register === 'function' && typeof server.tapIndex === 'function'
}

function apply(ctx) {
  const disposers = []
  const webServer = resolveWebServer(ctx)

  if (!hasRoutes(webServer)) {
    try {
      ctx.logger?.warn?.(
        '[' + NS + '] no usable webServer in this profile; host injection is skipped. ' +
        'The browser half will try to self-boot if the boot.html route is available.'
      )
    } catch (err) { /* noop */ }
    return
  }

  function rejected(req, res) {
    try {
      const conn = (typeof ctx.get === 'function' ? ctx.get('connection') : undefined) || ctx.connection
      if (!conn || typeof conn.requestRejection !== 'function') return false
      const code = conn.requestRejection(req)
      if (code === undefined || code === null || code === false) return false
      res.statusCode = typeof code === 'number' ? code : 403
      res.end()
      return true
    } catch (err) {
      return false
    }
  }

  function registerRoute(route) {
    const inner = route && route.handler
    const wrapped = Object.assign({}, route, {
      handler: async (req, res) => {
        if (rejected(req, res)) return
        return inner(req, res)
      }
    })
    return webServer.register(wrapped)
  }

  function sendJson(res, code, payload) {
    const body = Buffer.from(JSON.stringify(payload), 'utf8')
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Length': String(body.length)
    })
    res.end(body)
  }

  function sendText(res, code, type, text) {
    const body = Buffer.from(text, 'utf8')
    res.writeHead(code, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Content-Length': String(body.length)
    })
    res.end(body)
  }

  function readBody(req, limit = 64 * 1024) {
    return new Promise((resolve) => {
      let size = 0
      const chunks = []
      req.on('data', (c) => {
        size += c.length
        if (size > limit) {
          req.destroy()
          resolve('')
          return
        }
        chunks.push(c)
      })
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', () => resolve(''))
    })
  }

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/boot.html',
    handler: (req, res) => {
      const html = readBootHtml()
      if (!html) {
        sendText(res, 503, 'text/html; charset=utf-8',
          '<!doctype html><meta charset="utf-8"><body style="background:#01030a;color:#9fd8ff;font:14px monospace;padding:24px">boot.html 尚未生成，请先运行 npm run build。</body>')
        return
      }
      sendText(res, 200, 'text/html; charset=utf-8', html)
    }
  }))

  disposers.push(registerRoute({
    kind: 'exact',
    path: ROUTE_BASE + '/config',
    handler: async (req, res) => {
      const method = (req.method || 'GET').toUpperCase()
      if (method === 'GET') {
        sendJson(res, 200, {
          ok: true,
          version: PLUGIN_VERSION,
          config: readConfig(),
          defaults: DEFAULTS,
          file: CONFIG_FILE
        })
        return
      }
      if (method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      const text = await readBody(req)
      let payload = {}
      try {
        payload = text ? JSON.parse(text) : {}
      } catch (err) {
        sendJson(res, 400, { ok: false, error: 'invalid json' })
        return
      }
      try {
        if (payload && payload.action === 'reset') {
          const cfg = writeConfig(DEFAULTS)
          sendJson(res, 200, { ok: true, version: PLUGIN_VERSION, config: cfg, defaults: DEFAULTS })
          return
        }
        const current = readConfig()
        const patch = payload && typeof payload.patch === 'object' && payload.patch ? payload.patch : payload
        const cfg = writeConfig({ ...current, ...patch })
        sendJson(res, 200, { ok: true, version: PLUGIN_VERSION, config: cfg, defaults: DEFAULTS })
      } catch (err) {
        sendJson(res, 500, { ok: false, error: String((err && err.message) || err) })
      }
    }
  }))

  disposers.push(webServer.tapIndex((html) => {
    if (!html || html.includes(ROUTE_BASE + '/boot.html')) return html
    const cfg = readConfig()
    if (!cfg.enabled) return html
    const src = escapeAttr(bootUrl(cfg))
    const head = '<style id="dsh-cinematic-critical">' + CRITICAL_CSS + '</style>'
    const body =
      '<div id="dsh-cinematic-root" class="dsc-boot" aria-label="DeepSeek Harness 启动动画">' +
        '<iframe id="dsh-cinematic-frame" title="DeepSeek Harness 启动动画" data-src="' + src + '" allow="autoplay" scrolling="no"></iframe>' +
      '</div>' +
      '<script>window.__DSH_CINEMATIC_VERSION__=' + safeJson(PLUGIN_VERSION) +
        ';window.__DSH_CINEMATIC__=' + safeJson(cfg) + ';' + BOOTSTRAP_JS + '</script>'

    let out = html
    if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, head + '</head>')
    else out = head + out
    const bodyTag = out.match(/<body[^>]*>/i)
    if (bodyTag) out = out.replace(bodyTag[0], bodyTag[0] + body)
    else if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, body + '</body>')
    else out = out + body
    return out
  }))

  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try { dispose() } catch (err) { /* noop */ }
    }
  })
}

export { apply, inject, name }
