/**
 * dsh-startup-cinematic — browser half
 * ----------------------------------------------------------------------------
 * Registers "启动动画" in DSH Settings and, when the host index injection did
 * not run, self-boots the same iframe overlay. The splash itself is served as
 * /dsh-cinematic/boot.html and owns a separate document, so its CSS can never
 * affect the DSH shell.
 */
window.__ModuleLoader__.load({
  id: 'dsh-startup-cinematic',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var react = require('react')
    var h = react.createElement

    var API = '/dsh-cinematic/config'
    var BOOT = '/dsh-cinematic/boot.html'
    var FALLBACK_VERSION = '1.0.0'
    var activeSplash = null

    var FALLBACK = {
      enabled: true,
      mode: 'session',
      speed: 1,
      name: 'OPERATOR',
      sound: true,
      autoDismiss: true,
      allowSkip: true
    }

    /* ── styles for the settings panel + self-boot overlay ─────────────── */
    var CSS = [
      '.__sc_root{max-width:620px;display:flex;flex-direction:column;gap:14px;font-size:13px;color:var(--dsw-alias-label-primary)}',
      '.__sc_version{font-family:ui-monospace,Consolas,monospace;font-size:12px;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary)}',
      '.__sc_group{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:11px}',
      '.__sc_groupTitle{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}',
      '.__sc_field{display:flex;flex-direction:column;gap:5px}',
      '.__sc_label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.__sc_hint{font-size:11px;line-height:1.55;color:var(--dsw-alias-label-tertiary)}',
      '.__sc_row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.__sc_input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 10px;font-size:13px;box-sizing:border-box;width:100%;outline:none}',
      '.__sc_input:focus{border-color:var(--dsw-alias-state-business-primary)}',
      '.__sc_select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 8px;font:inherit;font-size:13px;min-width:190px}',
      '.__sc_check{display:flex;align-items:flex-start;gap:8px;cursor:pointer}',
      '.__sc_check input{margin-top:2px;accent-color:var(--dsw-alias-state-business-primary)}',
      '.__sc_checkText{display:flex;flex-direction:column;gap:2px}',
      '.__sc_actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px}',
      '.__sc_btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer}',
      '.__sc_btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary)}',
      '.__sc_btn:disabled{opacity:.5;cursor:default}',
      '.__sc_btnPrimary{border-color:var(--dsw-alias-state-business-primary,#3964fe);background:var(--dsw-alias-state-business-primary,#3964fe);color:#fff}',
      '.__sc_status{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.__sc_ok{font-size:12px;color:var(--dsw-alias-state-business-primary)}',
      '.__sc_err{font-size:12px;color:var(--dsw-alias-state-error-primary,#f85149)}',
      '.__sc_preview{border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.__sc_previewText{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:1.5}',
      'html.dsc-lock,html.dsc-lock body{overflow:hidden!important}',
      '#dsh-cinematic-root{position:fixed;inset:0;z-index:2147483000;background:#01030a;overflow:hidden;margin:0;padding:0;border:0}',
      '#dsh-cinematic-root iframe{display:block;width:100%;height:100%;border:0;background:#01030a}'
    ].join('')

    if (typeof document !== 'undefined' && !document.querySelector('style[data-plugin-css="dsh-startup-cinematic/main.css"]')) {
      var tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-startup-cinematic'
      tag.dataset.pluginCss = 'dsh-startup-cinematic/main.css'
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    /* ── form atoms ────────────────────────────────────────────────────── */
    function Field(props) {
      return h('div', { className: '__sc_field' },
        h('label', { className: '__sc_label' }, props.label),
        props.children,
        props.hint ? h('div', { className: '__sc_hint' }, props.hint) : null
      )
    }

    function TextInput(props) {
      return h('input', {
        className: '__sc_input',
        type: 'text',
        value: props.value == null ? '' : String(props.value),
        placeholder: props.placeholder || '',
        maxLength: props.maxLength || 24,
        spellCheck: false,
        onChange: (e) => props.onChange(e.target.value)
      })
    }

    function Select(props) {
      return h('select', {
        className: '__sc_select',
        value: props.value,
        onChange: (e) => props.onChange(e.target.value)
      }, props.options.map((o) => h('option', { key: o[0], value: o[0] }, o[1])))
    }

    function Check(props) {
      return h('label', { className: '__sc_check' },
        h('input', {
          type: 'checkbox',
          checked: !!props.checked,
          onChange: (e) => props.onChange(e.target.checked)
        }),
        h('span', { className: '__sc_checkText' },
          h('span', null, props.label),
          props.hint ? h('span', { className: '__sc_hint' }, props.hint) : null
        )
      )
    }

    /* ── splash overlay (self-boot + live preview) ─────────────────────── */
    function buildUrl(cfg) {
      var q = new URLSearchParams()
      q.set('embed', '1')
      q.set('v', readVersion())
      q.set('name', cfg.name || 'OPERATOR')
      q.set('speed', String(cfg.speed || 1))
      q.set('mute', cfg.sound === false ? '1' : '0')
      q.set('skip', cfg.allowSkip === false ? '0' : '1')
      q.set('exit', cfg.autoDismiss === false ? '0' : '1')
      return BOOT + '?' + q.toString()
    }

    function readVersion() {
      try { return String(window.__DSH_CINEMATIC_VERSION__ || FALLBACK_VERSION) } catch (e) { return FALLBACK_VERSION }
    }

    function dayKey() {
      var d = new Date()
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)
    }

    function showSplash(cfg, opts) {
      opts = opts || {}
      if (typeof document === 'undefined' || !document.body) return null
      if (activeSplash) activeSplash()
      document.getElementById('dsh-cinematic-root')?.remove()

      var root = document.createElement('div')
      root.id = 'dsh-cinematic-root'
      root.className = 'dsc-boot'
      root.setAttribute('aria-label', 'DeepSeek Harness 启动动画')

      var frame = document.createElement('iframe')
      frame.id = 'dsh-cinematic-frame'
      frame.title = 'DeepSeek Harness 启动动画'
      frame.setAttribute('allow', 'autoplay')
      frame.setAttribute('scrolling', 'no')
      root.appendChild(frame)
      document.body.appendChild(root)

      var prevOverflow = document.body.style.overflow
      document.documentElement.classList.add('dsc-lock')
      document.body.style.overflow = 'hidden'

      var done = false
      var readyTimer = 0
      var maxTimer = 0

      function unlock() {
        try { document.documentElement.classList.remove('dsc-lock') } catch (e) {}
        try { document.body.style.overflow = prevOverflow || '' } catch (e) {}
      }

      function cleanup() {
        if (done) return
        done = true
        clearTimeout(readyTimer)
        clearTimeout(maxTimer)
        window.removeEventListener('message', onMessage)
        try { frame.removeEventListener('error', onError) } catch (e) {}
        try { root.remove() } catch (e) {}
        unlock()
        if (activeSplash === cleanup) activeSplash = null
      }

      function onMessage(e) {
        if (!e || e.source !== frame.contentWindow) return
        var d = e.data || {}
        if (d.type === 'dsh-cinematic:ready') {
          clearTimeout(readyTimer)
          if (opts.mark) {
            try {
              if (cfg.mode === 'session') sessionStorage.setItem('dsh-cinematic:shown', '1')
              if (cfg.mode === 'daily') localStorage.setItem('dsh-cinematic:day', dayKey())
            } catch (err) { /* private mode */ }
          }
          maxTimer = setTimeout(cleanup, 40000)
        } else if (d.type === 'dsh-cinematic:done') {
          cleanup()
        }
      }

      function onError() {
        setTimeout(cleanup, 300)
      }

      window.addEventListener('message', onMessage)
      frame.addEventListener('error', onError)
      frame.src = buildUrl(cfg)
      readyTimer = setTimeout(cleanup, 8000)

      activeSplash = cleanup
      return cleanup
    }

    function selfBoot() {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return
        if (!document.body) return
        if (window.__DSH_CINEMATIC_BOOT__) return
        if (window.__DSH_CINEMATIC_SKIP__) return
        if (document.getElementById('dsh-cinematic-root')) return
        window.__DSH_CINEMATIC_BOOT__ = 'client'

        fetch(API, { headers: { Accept: 'application/json' } })
          .then((r) => r.json())
          .then((j) => {
            if (!j || j.ok !== true) return null
            var cfg = Object.assign({}, FALLBACK, j.config || {})
            if (cfg.enabled === false) return null
            var today = dayKey()
            if (cfg.mode === 'session') {
              var shown = null
              try { shown = sessionStorage.getItem('dsh-cinematic:shown') } catch (e) {}
              if (shown === '1') return null
            }
            if (cfg.mode === 'daily') {
              var day = null
              try { day = localStorage.getItem('dsh-cinematic:day') } catch (e) {}
              if (day === today) return null
            }
            showSplash(cfg, { mark: true })
            return cfg
          })
          .catch(() => null)
      } catch (e) { /* self-boot must never break the shell */ }
    }

    /* ── settings panel ────────────────────────────────────────────────── */
    function Panel() {
      var [draft, setDraft] = react.useState(null)
      var [version, setVersion] = react.useState(readVersion)
      var [file, setFile] = react.useState('')
      var [error, setError] = react.useState(null)
      var [notice, setNotice] = react.useState(null)
      var [busy, setBusy] = react.useState(false)

      function load() {
        setError(null)
        return fetch(API, { headers: { Accept: 'application/json' } })
          .then((r) => r.json())
          .then((j) => {
            if (!j || j.ok !== true) throw new Error((j && j.error) || 'load failed')
            setDraft(Object.assign({}, FALLBACK, j.config || {}))
            setFile(j.file || '')
            if (j.version) setVersion(String(j.version))
          })
          .catch((e) => setError('读取配置失败：' + String((e && e.message) || e)))
      }

      react.useEffect(() => { load() }, [])

      function set(key, value) {
        setNotice(null)
        setDraft((d) => Object.assign({}, d, { [key]: value }))
      }

      function save() {
        if (!draft) return
        setBusy(true)
        setNotice(null)
        setError(null)
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch: draft })
        })
          .then((r) => r.json())
          .then((j) => {
            if (!j || j.ok !== true) throw new Error((j && j.error) || 'save failed')
            setDraft(Object.assign({}, FALLBACK, j.config || {}))
            setNotice('已保存。下次启动 DSH 生效；点「立即预览」可以先看效果。')
          })
          .catch((e) => setError('保存失败：' + String((e && e.message) || e)))
          .then(() => setBusy(false))
      }

      function reset() {
        setBusy(true)
        setNotice(null)
        setError(null)
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' })
        })
          .then((r) => r.json())
          .then((j) => {
            if (!j || j.ok !== true) throw new Error((j && j.error) || 'reset failed')
            setDraft(Object.assign({}, FALLBACK, j.config || {}))
            setNotice('已恢复默认。')
          })
          .catch((e) => setError('恢复默认失败：' + String((e && e.message) || e)))
          .then(() => setBusy(false))
      }

      function preview() {
        if (!draft) return
        showSplash(draft, { preview: true, mark: false })
      }

      var versionLine = h('div', { className: '__sc_version' }, 'dsh-startup-cinematic v' + (version || FALLBACK_VERSION))

      if (!draft) {
        return h('div', { className: '__sc_root' },
          versionLine,
          h('div', { className: '__sc_status' }, error || '读取配置中…'),
          error ? h('div', { className: '__sc_actions' },
            h('button', { className: '__sc_btn', onClick: load }, '重试')
          ) : null
        )
      }

      var modeOptions = [
        ['session', '每个浏览器会话一次'],
        ['daily', '每天一次'],
        ['always', '每次启动都播放']
      ]

      return h('div', { className: '__sc_root' },
        versionLine,
        h('div', { className: '__sc_hint' },
          '如果还装着 dsh-startup-screen，请先在插件列表里卸载它，避免两个启动画面叠加。'
        ),

        h('div', { className: '__sc_group' },
          h('div', { className: '__sc_groupTitle' }, '播放'),
          h(Check, {
            label: '启用启动动画',
            hint: '关闭后直接进入 DSH。',
            checked: draft.enabled,
            onChange: (v) => set('enabled', v)
          }),
          h(Field, { label: '播放时机' },
            h(Select, { value: draft.mode, options: modeOptions, onChange: (v) => set('mode', v) })
          ),
          h(Field, { label: '速度倍率', hint: '整段约 13.6 秒；0.5 慢放，1 原速，2 快放。' },
            h('div', { className: '__sc_row' },
              h('input', {
                type: 'range', min: 0.5, max: 2, step: 0.05,
                value: draft.speed,
                style: { flex: '1 1 220px' },
                onChange: (e) => set('speed', Number(e.target.value))
              }),
              h('span', { className: '__sc_status' }, Number(draft.speed).toFixed(2) + '×')
            )
          )
        ),

        h('div', { className: '__sc_group' },
          h('div', { className: '__sc_groupTitle' }, '身份与结束'),
          h(Field, {
            label: '身份名称',
            hint: '终幕显示 WELCOME BACK, NAME；留空回落到 OPERATOR。'
          }, h(TextInput, {
            value: draft.name,
            placeholder: 'OPERATOR',
            maxLength: 24,
            onChange: (v) => set('name', v)
          })),
          h(Check, {
            label: '播完自动进入',
            hint: '终幕停留约 1.2 秒后自动交给 DSH；关闭则等 ENTER / 点击。',
            checked: draft.autoDismiss,
            onChange: (v) => set('autoDismiss', v)
          }),
          h(Check, {
            label: '允许跳过',
            hint: '显示右下角 SKIP，Esc 也可跳过。',
            checked: draft.allowSkip,
            onChange: (v) => set('allowSkip', v)
          }),
          h(Check, {
            label: '启动音效',
            hint: '浏览器要求先有一次点击才准出声；不点也完整播放画面。',
            checked: draft.sound,
            onChange: (v) => set('sound', v)
          })
        ),

        h('div', { className: '__sc_preview' },
          h('div', { className: '__sc_previewText' },
            '预览会按当前编辑中的配置播放一次，不写入会话 / 每日标记。',
            file ? h('div', { style: { marginTop: '4px', opacity: 0.75 } }, '配置文件：' + file) : null
          ),
          h('button', { className: '__sc_btn', onClick: preview }, '立即预览')
        ),

        h('div', { className: '__sc_actions' },
          h('button', { className: '__sc_btn __sc_btnPrimary', disabled: busy, onClick: save }, busy ? '处理中…' : '保存'),
          h('button', { className: '__sc_btn', disabled: busy, onClick: reset }, '恢复默认'),
          h('button', { className: '__sc_btn', disabled: busy, onClick: load }, '放弃修改'),
          notice ? h('span', { className: '__sc_ok' }, notice) : null,
          error ? h('span', { className: '__sc_err' }, error) : null
        )
      )
    }

    var inject = ['slots']

    function apply(ctx) {
      selfBoot()
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          { name: 'settings.section', id: 'startup-cinematic', order: 27, label: '启动动画' },
          function () { return h(Panel, {}) }
        )
      })
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
