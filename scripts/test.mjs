/**
 * Lightweight, dependency-free smoke test.
 *
 * - rebuilds lib/boot.html
 * - verifies it is a single document with no local asset references
 * - parses the inlined runtime as JavaScript (without executing browser APIs)
 * - checks the embed handshake strings
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const htmlFile = path.join(ROOT, 'lib', 'boot.html')

execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build.mjs')], { stdio: 'inherit' })
const html = fs.readFileSync(htmlFile, 'utf8')

const failures = []
const ok = (condition, message) => {
  if (condition) console.log('  ✓ ' + message)
  else { failures.push(message); console.error('  ✗ ' + message) }
}

ok(!/src="(?:boot\.js|whale-path\.js)"/.test(html), 'all runtime scripts are inlined')
ok(!/href="boot\.css"/.test(html), 'stylesheet is inlined')
ok(html.includes('dsh-cinematic:ready'), 'ready handshake present')
ok(html.includes('dsh-cinematic:done'), 'done handshake present')
ok(html.includes('is-embed'), 'embed mode present')
ok(html.includes('ALLOW_SKIP'), 'skip policy present')

const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
ok(scripts.length > 0, 'found inline scripts')
for (let i = 0; i < scripts.length; i++) {
  try {
    // Parse only; do not execute browser code.
    new Function(scripts[i])
    ok(true, `inline script ${i + 1} parses`)
  } catch (error) {
    ok(false, `inline script ${i + 1} parse error: ${error.message}`)
  }
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
console.log('\nall smoke checks passed')
