/* Offline renderer for the CDC design pages: fills {{holes}}, sc-for and sc-if from each page's Component. */
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) { Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch); render(); }
  }
  let inst, src, mount;
  const HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
  function look(path, ctx) {
    if (path === 'true') return true; if (path === 'false') return false;
    let v = ctx; for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
    return v;
  }
  function fill(str, ctx) { return str.replace(HOLE, (_, p) => { const v = look(p, ctx); return v == null ? '' : String(v); }); }
  function single(str) { const m = /^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/.exec(str); return m ? m[1] : null; }
  function walk(node, ctx, out) {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { out.appendChild(document.createTextNode(fill(n.nodeValue, ctx))); continue; }
      if (n.nodeType !== 1) continue;
      if (n.tagName === 'TEMPLATE' && n.hasAttribute('data-sc-for')) {
        const list = look(single(n.getAttribute('list')) || '', ctx) || [];
        const as = n.getAttribute('as') || 'item';
        list.forEach((item, i) => walk(n.content, Object.assign(Object.create(ctx), { [as]: item, index: i }), out));
        continue;
      }
      if (n.tagName === 'TEMPLATE' && n.hasAttribute('data-sc-if')) {
        if (look(single(n.getAttribute('value')) || '', ctx)) walk(n.content, ctx, out);
        continue;
      }
      const el = n.namespaceURI === 'http://www.w3.org/1999/xhtml' ? document.createElement(n.tagName.toLowerCase()) : document.createElementNS(n.namespaceURI, n.tagName);
      for (const a of n.attributes) {
        if (a.name.startsWith('hint-')) continue;
        const p = single(a.value);
        if (/^on[a-z]/.test(a.name) && p) { const fn = look(p, ctx); if (typeof fn === 'function') el.addEventListener(a.name.slice(2), fn); continue; }
        if (p && (a.name === 'checked' || a.name === 'disabled' || a.name === 'selected')) { if (look(p, ctx)) el.setAttribute(a.name, ''); continue; }
        el.setAttribute(a.name, fill(a.value, ctx));
      }
      walk(n.tagName === 'TEMPLATE' ? n.content : n, ctx, el.tagName === 'TEMPLATE' ? el.content : el);
      if (el.tagName === 'TEXTAREA') el.value = el.textContent;
      out.appendChild(el);
    }
  }
  function render() {
    const y = window.scrollY, ctx = inst.renderVals() || {};
    const frag = document.createDocumentFragment(); walk(src.content, ctx, frag);
    mount.replaceChildren(frag); window.scrollTo(0, y);
  }
  document.addEventListener('DOMContentLoaded', () => {
    src = document.getElementById('dc-src');
    const h = src.content.querySelector('helmet');
    if (h) { for (const c of [...h.childNodes]) document.head.appendChild(c); h.remove(); }
    const s = document.querySelector('script[data-dc-script]');
    const decl = JSON.parse(s.getAttribute('data-props') || '{}'), props = {}, q = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(decl)) if (k[0] !== '$') props[k] = q.has(k) ? q.get(k) : v.default;
    const Component = new Function('DCLogic', s.textContent + '\n;return Component;')(DCLogic);
    mount = document.createElement('div'); document.body.prepend(mount);
    inst = new Component(props); inst.props = props; render();
  });
})();
