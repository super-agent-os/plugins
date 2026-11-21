(function () {
  'use strict'
  const SDK = window.__HERMES_PLUGIN_SDK__
  const { React } = SDK
  const { useState, useEffect } = SDK.hooks
  const { Card, CardHeader, CardContent, Button } = SDK.components
  const h = React.createElement
  const base = '/api/plugins/superagentos'
  const call = async (path, method = 'GET', body) => {
    let timer
    try {
      return await Promise.race([
        SDK.fetchJSON(base + path, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Request timed out. Refresh to retry.')), 15000) }),
      ])
    } finally { clearTimeout(timer) }
  }

  function Webhooks({ connected, products = [] }) {
    const [status, setStatus] = useState(null)
    const [origin, setOrigin] = useState('')
    const [events, setEvents] = useState(['mention.created'])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    async function refresh(initialize = false) {
      const next = await call('/products/artifacts/webhooks/status')
      setStatus(next)
      if (initialize) { setOrigin(next.origin || ''); setEvents(next.events || ['mention.created']) }
    }
    useEffect(() => {
      let active = true
      if (!connected) { setStatus(null); return }
      call('/products/artifacts/webhooks/status').then(next => {
        if (active) { setStatus(next); setOrigin(next.origin || ''); setEvents(next.events || ['mention.created']); setError('') }
      }).catch(e => { if (active) setError(e.message) })
      return () => { active = false }
    }, [connected])
    async function act(path, method = 'POST', body) {
      setBusy(true); setError('')
      try { await call(path, method, body); await refresh(true) }
      catch (e) { setError(e.message); try { await refresh() } catch (failure) { setError(failure.message) } }
      finally { setBusy(false) }
    }
    const eventLabels = { 'mention.created': 'Mentions', 'comment.created': 'Human comments', 'artifact.published': 'Publish summaries (read only)' }
    const webhookProducts = products.filter(product => product.webhooks)
    const saved = Boolean(status?.endpoint)
    const last = status?.last_test
    return h(Card, null,
      h(CardHeader, null, h('h2', { className: 'text-lg font-medium' }, 'Webhooks')),
      h(CardContent, { className: 'flex flex-col gap-4' },
        error && h('p', { role: 'alert', className: 'text-sm break-words' }, error),
        h('p', { role: 'status', className: 'text-sm' }, !connected ? 'Connect your account first' : (status?.message || (error ? 'Listener status unavailable. Refresh to retry.' : 'Checking webhook listener…'))),
        status?.route && !status?.pending && status?.listener?.storage_message && h('p', { role: 'status', className: 'text-sm' }, status.listener.storage_message),
        status?.listener?.blocked && h('p', { role: 'status', className: 'text-sm' }, status.listener.blocked),
        connected && h('fieldset', { disabled: busy || !status || Boolean(status?.listener?.blocked), className: 'flex flex-col gap-4 min-w-0' },
          h('div', { className: 'flex flex-col gap-2' },
            h('label', { htmlFor: 'sa-webhook-origin', className: 'text-sm font-medium' }, 'Public HTTPS origin'),
            h('input', { id: 'sa-webhook-origin', type: 'url', value: origin, placeholder: 'https://your-listener.example', autoComplete: 'off', maxLength: 2048, onChange: e => setOrigin(e.target.value), className: 'flex h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50' }),
          ),
          h('fieldset', { className: 'flex flex-col gap-2' },
            h('legend', { className: 'text-sm font-medium mb-2' }, 'Artifacts events'),
            ...(webhookProducts.length ? webhookProducts.flatMap(product => product.webhooks.events) : ['mention.created', 'comment.created', 'artifact.published']).map(event =>
              h('label', { key: event, className: 'flex items-center gap-2 min-h-11 text-sm' },
                h('input', { type: 'checkbox', checked: events.includes(event), onChange: e => setEvents(e.target.checked ? [...events, event] : events.filter(value => value !== event)), className: 'h-4 w-4 accent-current focus-visible:ring-2 focus-visible:ring-ring' }), eventLabels[event] || event,
              ),
            ),
          ),
          h('div', { className: 'flex flex-wrap gap-3' },
            h(Button, { className: 'min-h-11', disabled: busy || !origin.trim(), onClick: () => act('/products/artifacts/webhooks/configure', 'POST', { origin: origin.trim(), events }) }, saved ? 'Save' : 'Configure'),
            h(Button, { variant: 'outline', className: 'min-h-11 focus-visible:ring-2', disabled: busy || !saved, onClick: () => act('/products/artifacts/webhooks/test') }, 'Send test'),
            h(Button, { variant: 'outline', className: 'min-h-11 focus-visible:ring-2', disabled: busy || !saved, onClick: () => act('/products/artifacts/webhooks/rotate') }, 'Rotate secret'),
            h(Button, { variant: 'outline', className: 'min-h-11 focus-visible:ring-2', disabled: busy || !(saved || status?.pending || status?.route), onClick: () => act('/products/artifacts/webhooks/remove', 'DELETE') }, 'Remove webhook'),
          ),
        ),
        ...products.filter(product => product.id !== 'artifacts' && product.offeredByDefault).map(product => h('p', { key: product.id, className: 'text-sm' }, product.label + ' webhooks: ' + (product.webhooks ? 'Available' : 'Not available yet · ' + product.webhookUnavailableReason))),
        busy && h('p', { role: 'status', className: 'text-sm text-muted-foreground' }, 'Updating webhook…'),
        last && h('p', { className: 'text-sm' }, 'Last test: ' + (last.httpStatus === null ? 'failed to reach listener' : 'HTTP ' + last.httpStatus) + (last.durationMs === null ? '' : ' · ' + last.durationMs + ' ms') + ' · ' + new Date(last.at * 1000).toLocaleString()),
        status?.endpoint && h('p', { className: 'text-sm text-muted-foreground' }, 'Last delivery: ' + (status.endpoint.lastSuccessAt ? 'accepted ' + new Date(status.endpoint.lastSuccessAt).toLocaleString() : 'no successful delivery yet') + (status.endpoint.lastFailureAt ? '; failed ' + new Date(status.endpoint.lastFailureAt).toLocaleString() : '') + '; consecutive failures: ' + (status.endpoint.consecutiveFailures || 0)),
        connected && h('p', { className: 'text-sm text-muted-foreground' }, 'A 2xx response means Hermes accepted the webhook; it does not mean an agent completed the task. This card never starts or restarts a gateway.'),
        status?.listener && h('p', { className: 'text-sm text-muted-foreground' }, 'Configured listener: port ' + status.listener.port + ', ' + status.listener.rate_limit + '/minute. This preset requests 10/minute; change and apply it in Hermes yourself.'),
      ),
    )
  }

  function Page() {
    const [status, setStatus] = useState(null)
    const [flow, setFlow] = useState(null)
    const [items, setItems] = useState([])
    const [selected, setSelected] = useState(null)
    const [outcomes, setOutcomes] = useState({})
    const [loadingArtifacts, setLoadingArtifacts] = useState(false)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [now, setNow] = useState(Date.now())
    const [notice, setNotice] = useState('')

    async function refresh() {
      const next = await call('/products/status')
      setStatus(next)
      setSelected(current => current === null ? (next.products || []).filter(product => product.offeredByDefault).map(product => product.id) : current)
      if (next.products?.find(product => product.id === 'artifacts')?.connected) {
        setLoadingArtifacts(true)
        try {
          const data = await call('/artifacts')
          setItems((data.artifacts || []).slice(0, 20))
        } finally { setLoadingArtifacts(false) }
      } else setItems([])
    }
    useEffect(() => { refresh().catch(e => setError(e.message)) }, [])
    useEffect(() => {
      if (!flow) return
      let active = true
      let timer
      const tick = setInterval(() => setNow(Date.now()), 1000)
      async function poll() {
        try {
          const next = await call('/auth/status/' + flow.id)
          if (!active) return
          if (next.state !== 'pending') {
            setFlow(null)
            setOutcomes(next.results || {})
            setNotice((next.state === 'partial' ? 'Some products connected. Others need attention. ' : '') + (next.message || ''))
            await refresh()
          } else { setOutcomes(next.results || {}); timer = setTimeout(poll, next.interval * 1000) }
        } catch (e) {
          if (active) { setFlow(null); setError(e.message) }
        }
      }
      timer = setTimeout(poll, flow.interval * 1000)
      return () => { active = false; clearTimeout(timer); clearInterval(tick) }
    }, [flow])

    async function act(fn) {
      setBusy(true); setError(''); setNotice(''); setOutcomes({})
      try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    async function open(item) {
      try {
        const data = await call('/artifacts/' + encodeURIComponent(item.id) + '/open', 'POST')
        window.location.assign(data.url)
      } catch (e) { setError(e.message) }
    }
    function productStatus(product) {
      if (product.availability === 'early-access') return 'Early access'
      const result = flow?.results?.[product.id] || outcomes[product.id]
      if (result && result !== 'connected') return ({ access_denied: 'Sign-in denied. Retry.', expired_token: 'Code expired. Retry.', wrong_product_key: 'Wrong product key. Retry.' })[result] || 'Needs attention. Retry.'
      if (flow && selected?.includes(product.id)) return result === 'connected' ? 'Key saved' : 'Pending'
      if (!product.connected) return 'Not connected'
      return product.ready ? 'Connected' + (product.account ? ' · ' + product.account : '') : 'Reload needed · ' + product.message
    }
    // Retry only where something went wrong; Connect only beside an already connected product.
    function rowAction(product) {
      const result = flow?.results?.[product.id] || outcomes[product.id]
      if ((result && result !== 'connected') || (product.connected && !product.ready)) return 'Retry'
      if (!product.connected && (status?.products || []).some(other => other.connected)) return 'Connect'
      return null
    }
    const connectedProducts = (status?.products || []).filter(product => product.connected && product.ready)
    const missingProducts = (status?.products || []).filter(product => product.offeredByDefault && (!product.connected || !product.ready))
    const summary = connectedProducts.length && missingProducts.length ? connectedProducts.map(product => product.label).join(', ') + ' connected. ' + missingProducts.map(product => product.label).join(', ') + ' needs attention.' : 'Choose the products Hermes can use.'
    const remaining = flow ? Math.max(0, Math.ceil(flow.expires_at - now / 1000)) : 0
    return h('div', { className: 'superagentos flex flex-col gap-6 w-full min-w-0 max-w-3xl text-foreground' },
      h('style', null, '.superagentos button,.superagentos label,.superagentos input[type=url],.superagentos a{min-height:44px}.superagentos a{display:inline-flex;align-items:center}.superagentos :is(button,a,input):focus-visible{outline:2px solid currentColor;outline-offset:3px}.superagentos [role=row]{min-width:0}.superagentos input[type=checkbox]{flex-shrink:0}.superagentos [role=cell]{overflow-wrap:anywhere}'),
      h(Card, null,
        h(CardHeader, null, h('h2', { className: 'text-lg font-medium' }, 'Super Agent OS')),
        h(CardContent, { className: 'flex flex-col gap-4' },
          error && h('p', { role: 'alert', className: 'text-sm break-words' }, error),
          notice && h('p', { role: 'status', className: 'text-sm' }, notice),
          h('p', { className: 'text-sm', role: 'status' }, status ? (status.products?.length ? summary : 'Products could not load. Check connection to retry.') : 'Products could not load. Check connection to retry.'),
          h('div', { role: 'table', 'aria-label': 'Product connections', className: 'w-full min-w-0' },
            ...(status?.products || []).slice().sort((a, b) => Number(b.offeredByDefault) - Number(a.offeredByDefault)).map(product => h('div', { key: product.id, role: 'row', className: 'flex flex-wrap items-center gap-3 border-b border-border py-3 min-w-0' },
              h('label', { role: 'cell', className: 'flex items-center gap-3 min-h-11 flex-1 text-sm font-medium' },
                h('input', { type: 'checkbox', 'aria-label': 'Connect ' + product.label, checked: selected?.includes(product.id), disabled: Boolean(flow) || busy || !product.offeredByDefault, onChange: e => setSelected(e.target.checked ? [...selected, product.id] : selected.filter(id => id !== product.id)), className: 'h-4 w-4 accent-current focus-visible:ring-2 focus-visible:ring-ring' }), product.label),
              h('span', { role: 'cell', className: 'text-sm break-words', 'aria-live': 'polite' }, productStatus(product)),
              product.offeredByDefault && h('div', { role: 'cell', className: 'flex flex-wrap gap-2' },
                rowAction(product) && h(Button, { variant: 'outline', className: 'min-h-11 focus-visible:ring-2', disabled: busy || Boolean(flow), onClick: () => act(async () => { setSelected([product.id]); setFlow(await call('/auth/start', 'POST', { products: [product.id] })) }) }, rowAction(product)),
                product.connected && h(Button, { variant: 'outline', className: 'min-h-11 focus-visible:ring-2', disabled: busy || Boolean(flow), onClick: () => act(async () => { const data = await call('/disconnect', 'POST', { products: [product.id] }); setNotice(data.message); await refresh() }) }, 'Disconnect'),
              ),
            )),
          ),
          flow ? h('div', { className: 'flex flex-col gap-3' },
            h('p', null, 'Compare this code before allowing access'),
            h('strong', { className: 'text-2xl font-mono tracking-wide' }, flow.code),
            h('a', { href: flow.url, target: '_blank', rel: 'noreferrer', className: 'inline-flex items-center min-h-11 underline underline-offset-4 focus-visible:ring-2' }, 'Approve sign-in'),
            h('p', { className: 'text-sm text-muted-foreground' }, 'Expires in ' + Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0')),
            h(Button, { variant: 'outline', className: 'min-h-11 focus-visible:ring-2', disabled: busy, onClick: () => act(async () => { await call('/auth', 'DELETE'); setFlow(null) }) }, 'Cancel'),
          ) : h('div', { className: 'flex flex-wrap gap-3' },
            h(Button, { className: 'min-h-11 focus-visible:ring-2', disabled: busy || !status?.products?.length || !selected?.length, onClick: () => act(async () => setFlow(await call('/auth/start', 'POST', { products: selected }))) }, busy ? 'Connecting…' : 'Connect'),
            status?.products?.some(product => product.connected) && h(Button, { variant: 'outline', className: 'min-h-11', disabled: busy, onClick: () => act(async () => { const data = await call('/disconnect', 'POST'); setNotice(data.message); await refresh() }) }, 'Disconnect all'),
            h(Button, { variant: 'outline', className: 'min-h-11 focus-visible:ring-2', disabled: busy, onClick: () => act(refresh) }, 'Check connection'),
          ),
          h('p', { className: 'text-sm text-muted-foreground' }, 'Hosted by Super Artifacts and Super Agent Mail. Each key stays in this Hermes profile. One more approval may be needed in Hermes to reload tools.'),
        ),
      ),
      h(Webhooks, { connected: Boolean(status?.products?.find(product => product.id === 'artifacts')?.connected), products: status?.products || [] }),
      status?.products?.find(product => product.id === 'artifacts')?.connected && h('section', { className: 'flex flex-col gap-3', 'aria-label': 'Recent artifacts' },
        h('h2', { className: 'text-lg font-medium' }, 'Recent artifacts'),
        loadingArtifacts && h('p', { role: 'status', className: 'text-sm text-muted-foreground' }, 'Loading artifacts…'),
        !loadingArtifacts && !items.length && h('p', { className: 'text-sm text-muted-foreground' }, 'No artifacts yet. Ask Hermes to make a page.'),
        ...items.map(item => h('div', { key: item.id, className: 'flex items-center justify-between gap-4 border-b border-border py-3' },
          h('span', { className: 'min-w-0 break-words text-sm' }, item.title || item.metadata?.title || item.slug || item.id),
          h(Button, { variant: 'outline', onClick: () => open(item), 'aria-label': 'Open ' + (item.title || item.metadata?.title || item.slug || item.id) }, 'Open'),
        )),
      ),
    )
  }
  window.__HERMES_PLUGINS__.register('superagentos', Page)
})()
