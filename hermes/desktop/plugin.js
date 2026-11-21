// Super Agent OS in Hermes Desktop and the Hermes web app: Settings → Plugins → Super Agent OS.
// The sign-in runs in ../dashboard/plugin_api.py (device flow, server to server). This page only
// shows the code and the approval link; the key never reaches JavaScript.
import { Button, ListRow } from '@hermes/plugin-sdk'
import { useCallback, useEffect, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const RESULTS = {
  access_denied: 'Sign-in was denied.',
  expired_token: 'The code expired.',
  wrong_product_key: 'Hermes received the wrong product key.',
}

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

function Page({ ctx }) {
  const [products, setProducts] = useState(null)
  const [flow, setFlow] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(
    () =>
      ctx
        .rest('/products/status')
        .then((data) => setProducts(data.products.filter((p) => p.offeredByDefault))),
    [ctx],
  )

  useEffect(() => {
    refresh().catch((e) => setError(e.message))
  }, [refresh])

  // Poll while a code is waiting for approval; the backend rate-limits itself.
  useEffect(() => {
    if (!flow) return undefined
    let live = true
    let timer
    const tick = setInterval(() => setNow(Date.now()), 1000)
    const poll = async () => {
      try {
        const next = await ctx.rest(`/auth/status/${flow.id}`)
        if (!live) return
        if (next.state === 'pending') {
          timer = setTimeout(poll, next.interval * 1000)
          return
        }
        const failed = Object.values(next.results || {}).find((r) => RESULTS[r])
        setFlow(null)
        setNotice([next.message, failed && RESULTS[failed]].filter(Boolean).join(' '))
        await refresh()
      } catch (e) {
        if (live) {
          setFlow(null)
          setError(e.message)
        }
      }
    }
    timer = setTimeout(poll, flow.interval * 1000)
    return () => {
      live = false
      clearTimeout(timer)
      clearInterval(tick)
    }
  }, [flow, ctx, refresh])

  const act = async (fn) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const missing = (products || []).filter((p) => !p.connected || !p.ready)
  const connect = () =>
    act(async () =>
      setFlow(
        await ctx.rest('/auth/start', {
          method: 'POST',
          body: { products: missing.map((p) => p.id) },
        }),
      ),
    )
  const disconnect = (product) =>
    act(async () => {
      const data = await ctx.rest('/disconnect', {
        method: 'POST',
        body: { products: [product.id] },
      })
      setNotice(data.message)
      await refresh()
    })
  const cancel = () =>
    act(async () => {
      await ctx.rest('/auth', { method: 'DELETE' })
      setFlow(null)
    })
  const openApproval = (event) => {
    event.preventDefault()
    // Resolves false outside the desktop shell; the plain browser then opens the tab itself.
    ctx.os.openExternal(flow.url).then((ok) => ok || window.open(flow.url, '_blank', 'noreferrer'))
  }

  const status = (p) =>
    !p.connected
      ? 'Not connected'
      : p.ready
        ? `Connected${p.account ? ` as ${p.account}` : ''}`
        : p.message || 'Key saved. Reload tools in your chat.'

  return jsxs('div', {
    className: 'flex flex-col gap-4',
    children: [
      jsx('p', {
        className: 'text-sm text-(--ui-text-secondary)',
        children:
          'Connect opens one approval page for every product below. The keys stay in this Hermes profile. Prefer to paste a key? Use Agent settings.',
      }),
      error && jsx('p', { role: 'alert', className: 'text-sm', children: error }),
      notice && jsx('p', { role: 'status', className: 'text-sm', children: notice }),
      !products &&
        !error &&
        jsx('p', { role: 'status', className: 'text-sm', children: 'Checking connections…' }),
      ...(products || []).map((p) =>
        jsx(ListRow, {
          key: p.id,
          title: p.name,
          description: status(p),
          action: p.connected
            ? jsx(Button, {
                variant: 'outline',
                disabled: busy || Boolean(flow),
                onClick: () => disconnect(p),
                children: 'Disconnect',
              })
            : null,
        }),
      ),
      flow
        ? jsxs('div', {
            className: 'flex flex-col gap-3',
            children: [
              jsx('p', {
                className: 'text-sm',
                children: 'Compare this code on the approval page, then choose Allow.',
              }),
              jsx('strong', { className: 'font-mono text-2xl tracking-wide', children: flow.code }),
              jsx('a', {
                href: flow.url,
                target: '_blank',
                rel: 'noreferrer',
                className: 'underline underline-offset-4',
                onClick: openApproval,
                children: 'Open approval page',
              }),
              jsx('p', {
                className: 'text-sm text-(--ui-text-secondary)',
                children: `Expires in ${clock(Math.max(0, Math.ceil(flow.expires_at - now / 1000)))}`,
              }),
              jsx(Button, {
                variant: 'outline',
                disabled: busy,
                onClick: cancel,
                children: 'Cancel',
              }),
            ],
          })
        : missing.length > 0 &&
          jsx('div', {
            children: jsx(Button, {
              disabled: busy,
              onClick: connect,
              children: `Connect ${missing.map((p) => p.label).join(' and ')}`,
            }),
          }),
    ],
  })
}

export default {
  id: 'superagentos',
  name: 'Super Agent OS',
  register(ctx) {
    // Feature-detected: older hosts keep the automatic key form and load the plugin without this page.
    ctx.registerSettingsPage?.({
      id: 'connect',
      title: 'Super Agent OS',
      icon: 'plug',
      render: () => jsx(Page, { ctx }),
    })
  },
}
