// Small SVG builders so lesson diagrams stay readable in both themes.
// Colours come from CSS classes (.d-box, .d-acc, ...) defined in the shell.
window.D = (function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const DEFS = '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="d-ah"/></marker></defs>'

  function svg(w, h, body, label) {
    return `<svg viewBox="0 0 ${w} ${h}" style="min-width:${Math.min(w, 600)}px" role="img" aria-label="${esc(label || 'diagram')}" xmlns="http://www.w3.org/2000/svg">${DEFS}${body}</svg>`
  }

  // Multi-line text: lines split on \n, centred on (x, y).
  function text(x, y, s, cls = 'd-t', anchor = 'middle', lh = 16) {
    const lines = String(s).split('\n')
    const top = y - ((lines.length - 1) * lh) / 2
    return lines.map((l, i) => `<text x="${x}" y="${top + i * lh}" class="${cls}" text-anchor="${anchor}" dominant-baseline="middle">${esc(l)}</text>`).join('')
  }

  function box(x, y, w, h, title, sub, kind = 'box', r = 10) {
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="d-${kind}"/>`
    if (sub) {
      out += text(x + w / 2, y + h / 2 - 9, title, 'd-t')
      out += text(x + w / 2, y + h / 2 + 11, sub, 'd-s', 'middle', 14)
    } else {
      out += text(x + w / 2, y + h / 2, title, 'd-t')
    }
    return out
  }

  function arrow(x1, y1, x2, y2, label, cls = 'd-line', dashed = false, labelDy = -8) {
    let out = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}${dashed ? ' d-dash' : ''}" marker-end="url(#ah)"/>`
    if (label) out += text((x1 + x2) / 2, (y1 + y2) / 2 + labelDy, label, 'd-s')
    return out
  }

  function path(d, cls = 'd-line', marker = true, dashed = false) {
    return `<path d="${d}" class="${cls}${dashed ? ' d-dash' : ''}" ${marker ? 'marker-end="url(#ah)"' : ''}/>`
  }

  // Left-to-right chain of boxes that wraps into rows. items: [title, sub?, kind?]
  function flow(items, opts = {}) {
    const w = opts.w || 150, h = opts.h || 60, gx = opts.gap || 40, gy = opts.gapY || 44, per = opts.perRow || 4, pad = 12
    const rows = Math.ceil(items.length / per)
    const W = pad * 2 + per * w + (per - 1) * gx
    const H = pad * 2 + rows * h + (rows - 1) * gy
    let body = ''
    const pos = items.map((_, i) => {
      const r = Math.floor(i / per), c = i % per
      return [pad + c * (w + gx), pad + r * (h + gy)]
    })
    items.forEach((it, i) => {
      const [x, y] = pos[i]
      body += box(x, y, w, h, it[0], it[1], it[2] || 'box')
      if (i + 1 < items.length) {
        const [nx, ny] = pos[i + 1]
        if (ny === y) body += arrow(x + w, y + h / 2, nx - 3, ny + h / 2, it[3])
        else body += path(`M${x + w / 2},${y + h} L${x + w / 2},${y + h + gy / 2} L${nx + w / 2},${y + h + gy / 2} L${nx + w / 2},${ny - 3}`)
      }
    })
    return svg(W, H, body, opts.label)
  }

  // Sequence diagram. actors: [name]; steps: [from, to, label, kind] where kind is
  // 'ok' | 'bad' | 'acc' | 'dash'. from === to draws a note box on that lifeline.
  function seq(actors, steps, opts = {}) {
    const colW = opts.colW || 180, rowH = opts.rowH || 44, top = 58, pad = 14
    const W = pad * 2 + actors.length * colW
    const H = top + steps.length * rowH + 26
    const cx = (i) => pad + colW * i + colW / 2
    let body = ''
    actors.forEach((a, i) => {
      body += box(cx(i) - colW / 2 + 12, 8, colW - 24, 38, a, null, 'acc')
      body += `<line x1="${cx(i)}" y1="46" x2="${cx(i)}" y2="${H - 8}" class="d-life"/>`
    })
    steps.forEach((s, k) => {
      const [f, t, label, kind] = s
      const y = top + k * rowH + rowH / 2 + 6
      if (f === t) {
        const bw = colW - 20
        body += `<rect x="${cx(f) - bw / 2}" y="${y - 15}" width="${bw}" height="30" rx="8" class="d-${kind === 'bad' ? 'bad' : kind === 'ok' ? 'good' : 'warn'}"/>`
        body += text(cx(f), y, label, 'd-s')
      } else {
        const cls = kind === 'bad' ? 'd-badline' : kind === 'ok' ? 'd-goodline' : kind === 'acc' ? 'd-accline' : 'd-line'
        const dir = t > f ? 1 : -1
        body += arrow(cx(f) + dir * 4, y, cx(t) - dir * 6, y, null, cls, kind === 'dash')
        body += text((cx(f) + cx(t)) / 2, y - 11, label, 'd-s')
      }
    })
    return svg(W, H, body, opts.label)
  }

  return { esc, svg, text, box, arrow, path, flow, seq }
})()
