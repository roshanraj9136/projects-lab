/* =================== MiniLang =================== */
DIAGRAMS.mlPipeline = () => {
  let s = '';
  const st = [['Source', '.ml code'], ['Lexer', 'tokens'], ['Parser', 'AST'], ['Semantic', 'types/scopes'], ['Optimizer', 'fold/DCE'], ['Codegen', 'bytecode'], ['VM', 'run']];
  st.forEach((x, i) => {
    const X = 6 + i * 86;
    const hi = i === 6;
    s += box(X, 22, 76, 50, x, { fill: hi ? C.fill : C.surf, stroke: hi ? C.acc : C.line, tc: hi ? C.acc : C.ink, cls: 'd-sm', lh: 13 });
    if (i < 6) s += line(X + 76, 47, X + 84, 47, { m: 'ar', c: C.dim });
  });
  s += txt(90, 96, '── front end: samajhna ──', { anchor: 'middle', cls: 'd-sm', c: C.faint });
  s += txt(390, 96, '── back end: chalana ──', { anchor: 'middle', cls: 'd-sm', c: C.faint });
  s += path('M560 72 L560 118 L380 118', { c: C.dim, m: 'ar', dash: true });
  s += box(230, 104, 148, 30, 'WebAssembly (browser)', { fill: C.fill2, cls: 'd-sm' });
  s += path('M430 72 L430 150 L378 150', { c: C.dim, m: 'ar', dash: true });
  s += box(230, 138, 148, 26, 'C++ transpiler → g++', { fill: C.fill2, cls: 'd-sm' });
  return svg(612, 172, s);
};

DIAGRAMS.tokens = () => {
  let s = '';
  s += txt(8, 20, 'int total = price * 2 >= 10;', { c: C.ink, cls: 'd-ttl' });
  const toks = [['KW_INT', 'int'], ['IDENT', 'total'], ['EQUAL', '='], ['IDENT', 'price'], ['STAR', '*'], ['INT', '2'], ['GREATER_EQUAL', '>='], ['INT', '10'], ['SEMICOLON', ';']];
  let x = 8;
  toks.forEach((t) => {
    const w = Math.max(44, t[0].length * 7 + 12);
    s += box(x, 36, w, 42, [t[0], t[1]], { fill: t[0] === 'GREATER_EQUAL' ? C.fill : C.surf, stroke: t[0] === 'GREATER_EQUAL' ? C.acc : C.line, cls: 'd-sm', lh: 14 });
    x += w + 5;
  });
  s += txt(8, 98, '">=" ek token (maximal munch), "> =" do nahi. Har token ke saath line + column (error message ke liye).', { cls: 'd-sm' });
  return svg(Math.max(600, x), 110, s);
};

DIAGRAMS.precedence = () => {
  let s = '';
  const lv = ['assignment  = += -=', 'ternary  ?:', '||', '&&', '|', '^', '&', '==  !=', '<  <=  >  >=', '<<  >>', '+  -', '*  /  %', 'unary  ! - & * ~ ++ --', 'call / index  f() a[i] .x', 'primary  literal, name, ( )'];
  lv.forEach((l, i) => {
    const y = 8 + i * 22;
    const w = 150 + i * 16;
    s += box(10, y, w, 19, l, { fill: i >= 12 ? C.fill : C.surf, stroke: i >= 12 ? C.acc : C.line, cls: 'd-sm', r: 4 });
  });
  s += line(430, 20, 430, 320, { m: 'ar', c: C.acc, w: 1.6 });
  s += txt(440, 30, 'neeche = zyada tight', { cls: 'd-sm', c: C.acc });
  s += txt(440, 44, '(pehle bandhta hai)', { cls: 'd-sm', c: C.acc });
  s += txt(440, 150, 'har level ka function', { cls: 'd-sm' });
  s += txt(440, 164, 'apne se NEECHE wale', { cls: 'd-sm' });
  s += txt(440, 178, 'function ko call karta hai', { cls: 'd-sm' });
  return svg(600, 340, s);
};

DIAGRAMS.ast = () => {
  let s = '';
  const n = (x, y, t, hi) => box(x - 34, y - 14, 68, 28, t, { fill: hi ? C.fill : C.surf, stroke: hi ? C.acc : C.line, tc: hi ? C.acc : C.ink });
  const e = (x1, y1, x2, y2) => line(x1, y1 + 14, x2, y2 - 14, { c: C.dim });
  s += txt(300, 16, 'x = 1 + 2 * 3', { anchor: 'middle', cls: 'd-ttl', c: C.ink });
  s += e(300, 44, 220, 94) + e(300, 44, 380, 94);
  s += n(300, 44, 'Assign', true);
  s += n(220, 94, 'Var x');
  s += e(380, 94, 320, 144) + e(380, 94, 440, 144);
  s += n(380, 94, 'Binary +');
  s += n(320, 144, 'Int 1');
  s += e(440, 144, 390, 194) + e(440, 144, 490, 194);
  s += n(440, 144, 'Binary *');
  s += n(390, 194, 'Int 2');
  s += n(490, 194, 'Int 3');
  s += txt(20, 160, '* neeche = pehle evaluate', { cls: 'd-sm', c: C.acc });
  s += txt(20, 176, '(precedence tree ke shape me hai)', { cls: 'd-sm' });
  return svg(600, 214, s);
};

DIAGRAMS.scopes = () => {
  let s = '';
  s += txt(10, 16, 'Code', { cls: 'd-ttl', c: C.ink });
  const code = ['int x = 1;', 'int main() {', '    int y = 2;', '    {', '        int x = 3;   // shadow', '        cout << x + y;  // 3 + 2', '    }', '}'];
  code.forEach((c, i) => { s += txt(10, 36 + i * 16, c.replace(/ /g, ' '), { c: i === 5 ? C.acc : C.dim }); });
  s += txt(360, 16, 'Scope stack (line 6 pe)', { cls: 'd-ttl', c: C.ink });
  const sc = [['global', 'x: int, main: fn'], ['main body', 'y: int'], ['inner block', 'x: int']];
  sc.forEach((b, i) => {
    const y = 128 - i * 44;
    s += box(340, y, 240, 38, [b[0], b[1]], { fill: i === 2 ? C.fill : C.surf, stroke: i === 2 ? C.acc : C.line, lh: 14 });
  });
  s += txt(340, 186, 'lookup: upar (andar) se neeche (bahar)', { cls: 'd-sm', c: C.acc });
  return svg(600, 196, s);
};

DIAGRAMS.whileLayout = () => {
  let s = '';
  const rows = [['0000', 'PUSH_INT 0', 'int i = 0 (slot 0)'], ['0003', 'LOAD_LOCAL 0', 'loop_start'], ['0006', 'PUSH_INT 3', ''], ['0009', 'LT', 'i < 3 ?'], ['0010', 'JUMP_IF_FALSE 0027', 'false → exit'], ['0013', 'LOAD_LOCAL 0', 'body: i = i + 1'], ['0016', 'PUSH_INT 1', ''], ['0019', 'ADD', ''], ['0020', 'STORE_LOCAL 0', ''], ['0023', 'POP', 'assign value hatao'], ['0024', 'JUMP 0003', 'wapas loop_start'], ['0027', '…', 'exit (patched target)']];
  rows.forEach((r, i) => {
    const y = 10 + i * 22;
    const hi = r[1].startsWith('JUMP');
    s += txt(12, y + 14, r[0], { c: C.faint });
    s += box(56, y, 190, 19, r[1], { fill: hi ? C.fill : C.surf, stroke: hi ? C.acc : C.line, tc: hi ? C.acc : C.ink, cls: 'd-sm', r: 4 });
    s += txt(400, y + 14, r[2], { cls: 'd-sm' });
  });
  s += path('M246 251 C 300 251, 300 42, 250 42', { c: C.acc, m: 'ara', w: 1.4 });
  s += path('M246 119 C 370 119, 370 273, 250 273', { c: C.crit, m: 'arc', w: 1.4, dash: true });
  s += txt(12, 296, 'JUMP_IF_FALSE pehle 0xFFFF placeholder ke saath likha;', { cls: 'd-sm', c: C.crit });
  s += txt(12, 310, 'body generate hone ke baad patch_jump() ne 0027 bhara.', { cls: 'd-sm', c: C.crit });
  return svg(600, 320, s);
};

DIAGRAMS.callFrames = () => {
  let s = '';
  s += txt(10, 16, 'int r = add(2, 3);', { cls: 'd-ttl', c: C.ink });
  const col = (x, title, cells, note) => {
    s += txt(x + 60, 40, title, { anchor: 'middle', cls: 'd-sm', c: C.ink });
    cells.forEach((c, i) => {
      const y = 150 - i * 26;
      s += box(x, y, 120, 22, c[0], { fill: c[1] ? C.fill : C.surf, stroke: c[1] ? C.acc : C.line, cls: 'd-sm', r: 3 });
    });
    if (note) s += txt(x + 60, 186, note, { anchor: 'middle', cls: 'd-sm' });
  };
  col(10, '1. args push', [['[0] 2'], ['[1] 3']], 'main frame base = 0');
  col(160, '2. CALL argc=2', [['[0] a = 2', 1], ['[1] b = 3', 1]], 'add base = 2 − 2 = 0');
  col(310, '3. ADD → RETURN', [['[0] a'], ['[1] b'], ['[2] 5']], 'pop 5, resize(base=0)');
  col(460, '4. push result', [['[0] r = 5', 1]], 'wahi slot = local r');
  for (let i = 0; i < 3; i++) s += line(132 + i * 150, 110, 156 + i * 150, 110, { m: 'ar', c: C.dim });
  return svg(600, 200, s);
};

DIAGRAMS.wasm = () => {
  let s = '';
  s += box(10, 20, 170, 120, null, { fill: C.fill2 });
  s += txt(95, 40, 'Browser JS (app.js)', { anchor: 'middle', cls: 'd-ttl', c: C.ink });
  s += txt(22, 64, '• Monaco editor', { cls: 'd-sm' });
  s += txt(22, 80, '• Run / Debug buttons', { cls: 'd-sm' });
  s += txt(22, 96, '• panels: output, stack,', { cls: 'd-sm' });
  s += txt(22, 110, '  variables, bytecode', { cls: 'd-sm' });
  s += line(182, 60, 300, 60, { m: 'ar', c: C.acc, w: 1.5 });
  s += txt(241, 52, 'Module.ccall(...)', { anchor: 'middle', cls: 'd-sm', c: C.acc });
  s += line(300, 100, 182, 100, { m: 'ar', c: C.dim, w: 1.5 });
  s += txt(241, 92, 'string result', { anchor: 'middle', cls: 'd-sm' });
  s += box(302, 20, 290, 120, null, { fill: C.fill, stroke: C.acc });
  s += txt(447, 40, 'minilang.wasm (same C++ code)', { anchor: 'middle', cls: 'd-ttl', c: C.acc });
  s += txt(314, 64, 'wasm_compile(src) → errors ya ""', { cls: 'd-sm' });
  s += txt(314, 80, 'wasm_run() → output', { cls: 'd-sm' });
  s += txt(314, 96, 'wasm_debug_start / step', { cls: 'd-sm' });
  s += txt(314, 112, 'wasm_debug_stack / variables / bytecode', { cls: 'd-sm' });
  s += txt(300, 162, 'Emscripten (em++): C++ → .wasm + JS glue · koi server nahi, sab client-side', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  return svg(600, 172, s);
};

/* =================== Load balancer =================== */
DIAGRAMS.lbTopology = () => {
  let s = '';
  s += box(200, 6, 200, 34, 'Clients (up to 2,500 users)', { fill: C.fill2, cls: 'd-ttl' });
  s += line(300, 40, 300, 62, { m: 'ar', c: C.dim });
  s += box(170, 64, 260, 46, ['Load balancer :3297', 'least-conn · health · retry'], { fill: C.fill, stroke: C.acc, tc: C.acc });
  [0, 1, 2].forEach((i) => {
    const x = 40 + i * 190;
    s += line(300, 110, x + 70, 138, { m: 'ar', c: C.dim });
    s += box(x, 140, 140, 46, ['backend-' + (i + 1), 'in-memory feed'], { fill: C.surf });
    s += line(x + 70, 186, 300, 214, { m: 'ar', c: C.dim, dash: true });
  });
  s += box(220, 216, 160, 34, 'PostgreSQL', { fill: C.fill2, cls: 'd-ttl' });
  s += txt(600, 90, '4 containers', { anchor: 'end', cls: 'd-sm', c: C.crit });
  s += txt(600, 104, 'har ek: 1 CPU / 512 MiB', { anchor: 'end', cls: 'd-sm', c: C.crit });
  s += txt(10, 240, 'seq sync har 300 ms', { cls: 'd-sm' });
  return svg(600, 258, s);
};

DIAGRAMS.keepalive = () => {
  let s = '';
  s += txt(150, 16, 'Bina keep-alive', { anchor: 'middle', cls: 'd-ttl', c: C.crit });
  s += txt(450, 16, 'Keep-alive pool', { anchor: 'middle', cls: 'd-ttl', c: C.good });
  for (let i = 0; i < 3; i++) {
    const y = 34 + i * 40;
    s += box(20, y, 80, 28, 'handshake', { fill: C.surf, stroke: C.crit, tc: C.crit, cls: 'd-sm' });
    s += box(104, y, 80, 28, 'request', { fill: C.surf, cls: 'd-sm' });
    s += box(188, y, 80, 28, 'close', { fill: C.surf, stroke: C.crit, tc: C.crit, cls: 'd-sm' });
  }
  s += box(330, 34, 80, 28, 'handshake', { fill: C.surf, stroke: C.good, tc: C.good, cls: 'd-sm' });
  for (let i = 0; i < 3; i++) s += box(414, 34 + i * 40, 80, 28, 'request ' + (i + 1), { fill: C.fill, stroke: C.acc, tc: C.acc, cls: 'd-sm' });
  s += txt(300, 170, 'Har naya TCP handshake = extra round trips + CPU. Pool me connections reuse → latency flat.', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  return svg(600, 182, s);
};

DIAGRAMS.algos = () => {
  let s = '';
  s += txt(150, 16, 'Round robin', { anchor: 'middle', cls: 'd-ttl', c: C.ink });
  s += txt(450, 16, 'Least connections', { anchor: 'middle', cls: 'd-ttl', c: C.acc });
  const bars = [[6, 1, 1], [2, 5, 1]];
  bars.forEach((b, k) => {
    const X = k === 0 ? 40 : 340;
    b.forEach((v, i) => {
      const x = X + i * 80;
      s += box(x, 140 - v * 16, 50, v * 16, null, { fill: k === 1 && i === 2 ? C.fill : C.fill2, stroke: k === 1 && i === 2 ? C.acc : C.line, r: 3 });
      s += txt(x + 25, 156, 'B' + (i + 1) + ': ' + v, { anchor: 'middle', cls: 'd-sm' });
    });
  });
  s += txt(150, 176, 'baari se: agla → B2 (chahe B1 slow ho)', { anchor: 'middle', cls: 'd-sm' });
  s += txt(450, 176, 'in-flight sabse kam → B3', { anchor: 'middle', cls: 'd-sm', c: C.acc });
  return svg(600, 188, s);
};

DIAGRAMS.lifecycle = () => {
  let s = '';
  const st = [['1. body read', '≤ 1 MiB'], ['2. select', 'least load'], ['3. RoundTrip', 'InFlight+1'], ['4. err / 5xx?', 'retry other'], ['5. copy resp', 'headers+body'], ['6. InFlight−1', 'metrics']];
  st.forEach((x, i) => {
    const X = 6 + i * 99;
    s += box(X, 24, 90, 50, x, { fill: i === 3 ? C.fill : C.surf, stroke: i === 3 ? C.acc : C.line, tc: i === 3 ? C.acc : C.ink, cls: 'd-sm', lh: 13 });
    if (i < 5) s += line(X + 90, 49, X + 97, 49, { m: 'ar', c: C.dim });
  });
  s += path('M351 74 C 351 112, 150 112, 150 76', { c: C.acc, m: 'ara', dash: true });
  s += txt(250, 118, 'failure aur abhi kuch nahi bheja → doosra backend', { anchor: 'middle', cls: 'd-sm', c: C.acc });
  s += txt(300, 14, 'body > 1 MiB → 413 · sab fail → 502', { anchor: 'middle', cls: 'd-sm', c: C.crit });
  return svg(600, 130, s);
};

DIAGRAMS.health = () => {
  let s = '';
  s += box(60, 50, 140, 60, ['UP', 'Alive = true'], { fill: C.fill, stroke: C.good, tc: C.good, cls: 'd-ttl' });
  s += box(400, 50, 140, 60, ['DOWN', 'load + 2²⁰'], { fill: C.surf, stroke: C.crit, tc: C.crit, cls: 'd-ttl' });
  s += path('M200 68 C 280 30, 320 30, 400 68', { c: C.crit, m: 'arc' });
  s += txt(300, 26, '3 consecutive probe failures', { anchor: 'middle', cls: 'd-sm', c: C.crit });
  s += path('M400 94 C 320 132, 280 132, 200 94', { c: C.good, m: 'ar' });
  s += txt(300, 140, '1 successful probe (ya successful request)', { anchor: 'middle', cls: 'd-sm', c: C.good });
  s += txt(300, 162, 'probe: GET /health har -health-interval (default 1s), timeout 2s', { anchor: 'middle', cls: 'd-sm' });
  return svg(600, 172, s);
};

DIAGRAMS.writePath = () => {
  let s = '';
  s += box(6, 30, 96, 48, ['POST', '/message'], { fill: C.fill2 });
  s += line(102, 54, 118, 54, { m: 'ar', c: C.dim });
  s += box(120, 30, 96, 48, ['seenIDs', 'dup? → ack'], { fill: C.surf, cls: 'd-sm', lh: 13 });
  s += line(216, 54, 232, 54, { m: 'ar', c: C.dim });
  s += box(234, 30, 96, 48, ['feed.add', 'in-memory'], { fill: C.fill, stroke: C.acc, tc: C.acc, cls: 'd-sm', lh: 13 });
  s += line(330, 54, 346, 54, { m: 'ar', c: C.dim });
  s += box(348, 30, 96, 48, ['msgChan', '131072 slots'], { fill: C.surf, cls: 'd-sm', lh: 13 });
  s += line(444, 54, 460, 54, { m: 'ar', c: C.dim });
  s += box(462, 30, 130, 48, ['ACK 200', '(DB se pehle!)'], { fill: C.surf, stroke: C.mod, tc: C.mod, cls: 'd-sm', lh: 13 });
  s += line(396, 78, 396, 104, { m: 'ar', c: C.dim, dash: true });
  s += box(300, 106, 192, 48, ['writeLoop goroutine', '500 rows ya 25 ms'], { fill: C.surf, cls: 'd-sm', lh: 13 });
  s += line(300, 130, 250, 130, { m: 'ar', c: C.dim });
  s += box(60, 106, 188, 48, ['INSERT … ON CONFLICT', 'AES-GCM + Ed25519'], { fill: C.fill2, cls: 'd-sm', lh: 13 });
  s += txt(300, 176, 'Request path fast (memory); DB kaam background me batch me', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  return svg(600, 186, s);
};

DIAGRAMS.oomLoop = () => {
  let s = '';
  s += line(20, 120, 590, 120, { c: C.line });
  s += txt(20, 140, 'time →', { cls: 'd-sm' });
  s += box(20, 60, 150, 40, ['load stage shuru', 'naye connections'], { fill: C.surf, cls: 'd-sm', lh: 13 });
  s += line(170, 80, 196, 80, { m: 'ar', c: C.dim });
  s += box(198, 60, 120, 40, ['memory > 512 MiB', 'oom_kill'], { fill: C.surf, stroke: C.crit, tc: C.crit, cls: 'd-sm', lh: 13 });
  s += line(318, 80, 344, 80, { m: 'ar', c: C.crit });
  s += box(346, 60, 130, 40, ['sleep 1 s', 'koi listen nahi'], { fill: C.surf, stroke: C.crit, tc: C.crit, cls: 'd-sm', lh: 13 });
  s += line(476, 80, 502, 80, { m: 'ar', c: C.dim });
  s += box(504, 60, 86, 40, ['restart', ''], { fill: C.surf, cls: 'd-sm' });
  s += '<rect x="346" y="112" width="130" height="16" fill="' + C.crit + '" opacity="0.5"/>';
  s += txt(411, 150, 'connection refused → errors', { anchor: 'middle', cls: 'd-sm', c: C.crit });
  s += txt(300, 20, 'Symptom: errors stage ke shuru me · zero timeouts · feed 100% dikhta (DB se rebuild)', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  return svg(600, 162, s);
};

/* =================== AlgoRace =================== */
DIAGRAMS.arArch = () => {
  let s = '';
  s += box(10, 30, 160, 70, ['React + Vite (Vercel)', 'Monaco · React Query', 'socket.io-client'], { fill: C.fill2, cls: 'd-sm', lh: 14 });
  s += line(170, 52, 226, 52, { m: 'ar', c: C.dim });
  s += txt(198, 44, 'REST', { anchor: 'middle', cls: 'd-sm' });
  s += line(226, 80, 170, 80, { m: 'ar', c: C.acc });
  s += txt(198, 96, 'Socket.IO', { anchor: 'middle', cls: 'd-sm', c: C.acc });
  s += box(228, 20, 170, 90, ['Express 5 API (Render)', 'JWT · rate limit · Zod', 'Socket.IO rooms', 'matchmaking queue'], { fill: C.fill, stroke: C.acc, tc: C.acc, cls: 'd-sm', lh: 14 });
  s += line(398, 50, 440, 50, { m: 'ar', c: C.dim });
  s += box(442, 26, 150, 44, ['PostgreSQL', 'Drizzle ORM'], { fill: C.surf, cls: 'd-sm', lh: 14 });
  s += line(398, 96, 440, 110, { m: 'ar', c: C.dim });
  s += box(442, 94, 150, 44, ['Wandbox API', 'compile + run code'], { fill: C.surf, stroke: C.mod, tc: C.mod, cls: 'd-sm', lh: 14 });
  s += txt(300, 150, 'pnpm monorepo: lib/api-spec (OpenAPI) → lib/api-client-react + lib/api-zod · lib/db (schema)', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  return svg(600, 160, s);
};

DIAGRAMS.contract = () => {
  let s = '';
  s += box(10, 40, 130, 50, ['openapi.yaml', '30 operations'], { fill: C.fill, stroke: C.acc, tc: C.acc });
  s += line(140, 65, 190, 65, { m: 'ar', c: C.dim });
  s += box(192, 40, 90, 50, 'Orval', { fill: C.fill2, cls: 'd-ttl' });
  s += line(282, 58, 340, 30, { m: 'ar', c: C.dim });
  s += line(282, 72, 340, 100, { m: 'ar', c: C.dim });
  s += box(342, 8, 250, 44, ['api-client-react', 'typed React Query hooks (frontend)'], { fill: C.surf, cls: 'd-sm', lh: 14 });
  s += box(342, 80, 250, 44, ['api-zod', 'Zod schemas (runtime validation)'], { fill: C.surf, cls: 'd-sm', lh: 14 });
  s += txt(300, 146, 'Spec badla → generate → dono taraf TypeScript error → runtime bug se pehle pakda', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  return svg(600, 158, s);
};

DIAGRAMS.jwt = () => {
  let s = '';
  s += box(10, 20, 170, 44, ['HEADER', '{alg: HS256}'], { fill: C.surf, stroke: C.crit, tc: C.crit, cls: 'd-sm', lh: 14 });
  s += txt(188, 46, '.', { cls: 'd-ttl', c: C.ink });
  s += box(200, 20, 200, 44, ['PAYLOAD', '{userId, email, exp: 7d}'], { fill: C.surf, stroke: C.acc, tc: C.acc, cls: 'd-sm', lh: 14 });
  s += txt(408, 46, '.', { cls: 'd-ttl', c: C.ink });
  s += box(420, 20, 170, 44, ['SIGNATURE', 'HMAC(secret)'], { fill: C.surf, stroke: C.good, tc: C.good, cls: 'd-sm', lh: 14 });
  s += txt(300, 90, 'Payload sirf base64 hai — koi bhi padh sakta hai (secret mat daalo).', { anchor: 'middle', cls: 'd-sm' });
  s += txt(300, 106, 'Signature server ke JWT_SECRET se → payload badla to verify fail.', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  return svg(600, 118, s);
};

DIAGRAMS.raceSeq = () => {
  let s = '';
  const xs = [80, 300, 520];
  ['Player A', 'API + Socket.IO', 'Player B'].forEach((n, i) => {
    s += box(xs[i] - 70, 6, 140, 28, n, { fill: i === 1 ? C.fill : C.fill2, stroke: i === 1 ? C.acc : C.line, tc: i === 1 ? C.acc : C.ink, cls: 'd-ttl' });
    s += line(xs[i], 34, xs[i], 318, { c: C.line, dash: true });
  });
  const row = (y, a, b, label, color) => {
    s += line(xs[a] + (b > a ? 4 : -4), y, xs[b] + (b > a ? -6 : 6), y, { m: color === C.acc ? 'ara' : color === C.crit ? 'arc' : 'ar', c: color, w: 1.4 });
    s += txt((xs[a] + xs[b]) / 2, y - 5, label, { anchor: 'middle', cls: 'd-sm', c: color });
  };
  row(58, 0, 1, 'POST /matchmaking/join', C.dim);
  row(84, 2, 1, 'POST /matchmaking/join', C.dim);
  s += box(215, 94, 170, 24, 'closest ELO pair → match row', { fill: C.fill, stroke: C.acc, tc: C.acc, cls: 'd-sm' });
  row(136, 1, 0, 'queue:matched (user:A room)', C.acc);
  row(158, 1, 2, 'queue:matched (user:B room)', C.acc);
  row(186, 0, 1, 'match:join → match:&lt;id&gt; room', C.dim);
  row(212, 0, 1, 'POST /submissions (code)', C.dim);
  s += box(215, 220, 170, 24, 'harness → Wandbox → results', { fill: C.surf, stroke: C.mod, tc: C.mod, cls: 'd-sm' });
  row(262, 1, 2, 'match:progress (A: 7/10)', C.acc);
  row(292, 1, 0, 'match:finished (after COMMIT)', C.good);
  row(308, 1, 2, '', C.good);
  return svg(600, 326, s);
};

DIAGRAMS.closestPair = () => {
  let s = '';
  const e = [1180, 1210, 1340, 1350, 1500];
  s += txt(10, 18, 'Queue ELO sort ke baad:', { cls: 'd-ttl', c: C.ink });
  e.forEach((v, i) => {
    const x = 20 + i * 115;
    const hi = i === 2 || i === 3;
    s += box(x, 32, 80, 34, String(v), { fill: hi ? C.fill : C.surf, stroke: hi ? C.acc : C.line, tc: hi ? C.acc : C.ink, cls: 'd-ttl' });
    if (i < 4) {
      const d = e[i + 1] - v;
      s += txt(x + 97, 92, '+' + d, { anchor: 'middle', cls: 'd-sm', c: d === 10 ? C.acc : C.dim });
    }
  });
  s += txt(300, 120, 'Sirf adjacent differences dekho (30, 130, 10, 150) → min 10 → 1340 vs 1350', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  s += txt(300, 136, 'Sorted list me sabse paas wala pair hamesha adjacent hota hai → O(n log n)', { anchor: 'middle', cls: 'd-sm' });
  return svg(600, 146, s);
};

DIAGRAMS.harness = () => {
  let s = '';
  s += box(150, 6, 300, 250, null, { fill: C.fill2 });
  s += txt(300, 24, 'Ek generated C++ program', { anchor: 'middle', cls: 'd-ttl', c: C.ink });
  const parts = [['#include &lt;bits/stdc++.h&gt; + helpers', 'parse / serialize / _json', false], ['USER KA CODE', 'int maxProfit(vector&lt;int&gt;&amp; p) {…}', true], ['main(): tests[][2] = {{input, expected}, ...}', '', false], ['for each test: parse args → call fn', 'serialize → compare · try/catch', false], ['print JSON: [{passed, actual, error}, ...]', '', false]];
  let y = 36;
  parts.forEach((p) => {
    s += box(164, y, 272, p[1] ? 40 : 28, p[1] ? [p[0], p[1]] : p[0], { fill: p[2] ? C.fill : C.surf, stroke: p[2] ? C.acc : C.line, tc: p[2] ? C.acc : C.ink, cls: 'd-sm', lh: 13 });
    y += (p[1] ? 40 : 28) + 6;
  });
  s += line(450, 130, 500, 130, { m: 'ar', c: C.dim });
  s += box(502, 106, 90, 48, ['Wandbox', '1 run'], { fill: C.surf, stroke: C.mod, tc: C.mod });
  s += txt(10, 120, 'N tests =', { cls: 'd-sm' });
  s += txt(10, 134, '1 compile + 1 run', { cls: 'd-sm', c: C.acc });
  return svg(600, 262, s);
};

DIAGRAMS.winner = () => {
  let s = '';
  s += box(20, 10, 180, 30, 'Tx A (Player A)', { fill: C.fill2, cls: 'd-ttl' });
  s += box(400, 10, 180, 30, 'Tx B (Player B)', { fill: C.fill2, cls: 'd-ttl' });
  s += box(220, 10, 160, 30, 'matches row #42', { fill: C.fill, stroke: C.acc, tc: C.acc, cls: 'd-ttl' });
  s += line(110, 40, 110, 250, { c: C.line, dash: true });
  s += line(490, 40, 490, 250, { c: C.line, dash: true });
  s += txt(110, 66, 'UPDATE … WHERE', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  s += txt(110, 80, 'winner_id IS NULL', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  s += line(180, 72, 250, 72, { m: 'ara', c: C.acc });
  s += txt(300, 76, 'row LOCK A', { anchor: 'middle', cls: 'd-sm', c: C.acc });
  s += txt(490, 96, 'same UPDATE', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  s += line(420, 102, 350, 102, { m: 'ar', c: C.dim });
  s += txt(490, 120, '⏳ lock ka wait', { anchor: 'middle', cls: 'd-sm', c: C.mod });
  s += txt(110, 130, '1 row ✓ → ELO update', { anchor: 'middle', cls: 'd-sm', c: C.good });
  s += txt(110, 150, 'COMMIT (lock free)', { anchor: 'middle', cls: 'd-sm', c: C.good });
  s += txt(300, 170, 'winner_id = A', { anchor: 'middle', cls: 'd-sm', c: C.acc });
  s += txt(490, 190, 'WHERE dobara check:', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  s += txt(490, 206, 'winner_id NULL nahi', { anchor: 'middle', cls: 'd-sm', c: C.ink });
  s += txt(490, 228, '0 rows → no win ✗', { anchor: 'middle', cls: 'd-sm', c: C.crit });
  s += txt(110, 240, 'emit match:finished', { anchor: 'middle', cls: 'd-sm', c: C.good });
  return svg(600, 258, s);
};

DIAGRAMS.scaleOut = () => {
  let s = '';
  s += box(10, 20, 120, 40, 'Player A', { fill: C.fill2 });
  s += box(10, 110, 120, 40, 'Player B', { fill: C.fill2 });
  s += box(200, 20, 150, 40, ['API server 1', 'queue: [A]'], { fill: C.surf, cls: 'd-sm', lh: 14 });
  s += box(200, 110, 150, 40, ['API server 2', 'queue: [B]'], { fill: C.surf, cls: 'd-sm', lh: 14 });
  s += line(130, 40, 198, 40, { m: 'ar', c: C.dim });
  s += line(130, 130, 198, 130, { m: 'ar', c: C.dim });
  s += txt(275, 90, '✗ A aur B kabhi match nahi', { anchor: 'middle', cls: 'd-sm', c: C.crit });
  s += line(350, 40, 430, 80, { m: 'ar', c: C.acc, dash: true });
  s += line(350, 130, 430, 90, { m: 'ar', c: C.acc, dash: true });
  s += box(432, 50, 160, 70, ['Redis', 'shared queue (ZSET by ELO)', 'Socket.IO adapter'], { fill: C.fill, stroke: C.acc, tc: C.acc, cls: 'd-sm', lh: 14 });
  s += txt(512, 138, 'fix: shared state', { anchor: 'middle', cls: 'd-sm', c: C.acc });
  s += txt(512, 152, '+ sticky sessions', { anchor: 'middle', cls: 'd-sm', c: C.acc });
  return svg(600, 164, s);
};
