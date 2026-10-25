/**
 * Host-half smoke test with a minimal DSH-like ctx.
 * No browser, no real profile, no network.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-cinematic-test-'))
process.env.DSH_HOME = home

const { apply } = await import('../lib/index.js')

const routes = new Map()
let tap = null
const server = {
  register(route) {
    routes.set(route.path, route)
    return () => {}
  },
  tapIndex(fn) {
    tap = fn
    return () => {}
  }
}

const ctx = {
  webServer: server,
  get(key) { return key === 'webServer' ? server : undefined },
  effect() {},
  logger: { warn() {} }
}

apply(ctx)
assert.equal(typeof tap, 'function', 'tapIndex registered')
assert.ok(routes.has('/dsh-cinematic/boot.html'), 'boot.html route registered')
assert.ok(routes.has('/dsh-cinematic/config'), 'config route registered')

const source = '<!doctype html><html><head><title>app</title></head><body><main id="app"></main></body></html>'
const injected = tap(source)
assert.ok(injected.includes('id="dsh-cinematic-root"'), 'overlay root injected')
assert.ok(injected.includes('/dsh-cinematic/boot.html?'), 'iframe source injected')
assert.ok(injected.includes('__DSH_CINEMATIC_BOOT__'), 'boot marker injected')
assert.ok(injected.includes('dsh-cinematic:ready'), 'ready handshake injected')
assert.ok(injected.indexOf('dsh-cinematic-root') < injected.indexOf('<main id="app">'), 'overlay comes before app')

const inlineScripts = [...injected.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
assert.ok(inlineScripts.length > 0, 'bootstrap script injected')
for (const [i, js] of inlineScripts.entries()) {
  try { new Function(js) }
  catch (error) { assert.fail(`inline bootstrap ${i + 1} parse error: ${error.message}`) }
}

function fakeRes() {
  return {
    statusCode: 0,
    headers: null,
    body: null,
    writeHead(code, headers) { this.statusCode = code; this.headers = headers },
    end(body) { this.body = body }
  }
}

const bootRes = fakeRes()
await routes.get('/dsh-cinematic/boot.html').handler({ method: 'GET', url: '/dsh-cinematic/boot.html', headers: {} }, bootRes)
assert.equal(bootRes.statusCode, 200, 'boot.html status 200')
assert.ok(String(bootRes.body).includes('dsh-cinematic:done'), 'boot.html contains runtime')

const configRes = fakeRes()
await routes.get('/dsh-cinematic/config').handler({ method: 'GET', url: '/dsh-cinematic/config', headers: {} }, configRes)
const config = JSON.parse(configRes.body)
assert.equal(config.ok, true, 'config ok')
assert.equal(config.config.mode, 'session', 'default mode')
assert.equal(config.config.name, 'OPERATOR', 'default name')

const saveRes = fakeRes()
const payload = JSON.stringify({ patch: { mode: 'daily', name: '秋枫', speed: 1.4, enabled: false } })
await routes.get('/dsh-cinematic/config').handler({
  method: 'POST',
  url: '/dsh-cinematic/config',
  headers: {},
  on(event, cb) {
    if (event === 'data') cb(Buffer.from(payload))
    if (event === 'end') cb()
  }
}, saveRes)
const saved = JSON.parse(saveRes.body)
assert.equal(saved.ok, true, 'config save ok')
assert.equal(saved.config.mode, 'daily')
assert.equal(saved.config.name, '秋枫')
assert.equal(saved.config.speed, 1.4)
assert.equal(saved.config.enabled, false)

const configFile = path.join(home, 'dsh-startup-cinematic.json')
assert.ok(fs.existsSync(configFile), 'config file written')

fs.rmSync(home, { recursive: true, force: true })
console.log('host smoke checks passed')
