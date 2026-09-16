window.LAB = {
  id: "projects-lab",
  title: "Projects Lab",
  icon: "🛠️",
  topics: [
    {
      id: "start", title: "Shuru karo", short: "Start", color: "#64748b",
      lessons: [{
        id: "p-how", title: "Project interview ka format",
        why: "Project round me interviewer 'walk me through' se shuru karke ek design decision pe 10 minute drill karta hai.",
        blocks: [
          { t: "steps", title: "Har project ke liye 4 cheezein ready", items: [
            "**30-sec pitch** (Revision tab me).",
            "**Architecture diagram** jo tum whiteboard pe 1 minute me bana sako.",
            "**2 design decisions + trade-off** (kya choose kiya, kya chhoda, kyun).",
            "**1 bug story + 1 limitation + 'how would you scale it'.**"
          ]},
          { t: "callout", kind: "tip", title: "Kaunsa project kis role ke liye lead karo", text: ["Backend / infra / SRE → Load Balancer", "Systems / C++ / compilers → MiniLang", "Full-stack / product → AlgoRace", "ML → NISHAD (Experience Lab)"] },
          { t: "remember", items: ["Decision → alternative → why → trade-off", "'I didn't measure that' > guessed numbers"] }
        ]
      }],
      revision: { pitch: "MiniLang: compiler + bytecode VM in C++ running in the browser via WebAssembly. Load balancer: Go reverse proxy, OOM debugging under 1 CPU / 512 MiB. AlgoRace: real-time 1v1 coding race with ELO matchmaking." }
    },

    // ───────────────────────────── MINILANG ─────────────────────────────
    {
      id: "minilang", title: "MiniLang · Compiler, Bytecode VM & Browser IDE", short: "MiniLang", color: "#818cf8",
      lessons: [
        {
          id: "m-front", title: "Pipeline, lexer, parser, semantic analysis",
          why: "Compiler project pe pehla drill: 'How does your parser handle precedence?' aur 'What happens on a syntax error?'",
          blocks: [
            { t: "resume", text: "Implemented a lexer, **recursive-descent parser** (13 precedence levels, panic-mode error recovery), **semantic analyzer** (scoped symbol tables, type checking), and AST optimizer (**constant folding/propagation, dead-code elimination**)." },
            { t: "diagram", svg: D.flow([["Source", "C++-style code", "acc"], ["Lexer", "tokens"], ["Parser", "AST"], ["Semantic", "scopes + types"], ["Optimizer", "fold / propagate / DCE"], ["Codegen", "bytecode"], ["VM", "stack machine", "good"], ["WASM IDE", "Monaco + debugger", "good"]], { perRow: 4, w: 160, label: "MiniLang pipeline" }), caption: "7,000+ lines C++17. Same pipeline native CLI aur browser (WebAssembly) dono me." },
            { t: "words", items: [
              ["Token", "Code ka sabse chhota meaningful tukda: `int`, `x`, `=`, `5`, `;`."],
              ["AST", "Abstract Syntax Tree — code ka tree form. `1 + 2 * 3` → `+` root, right child `*`."],
              ["Recursive descent", "Har grammar rule = ek function jo apne se higher-precedence function ko call kare."],
              ["Precedence", "Kaun pehle bandhega: `*` > `+` > `<` > `==` > `&&` > `||` > `?:` > `=`."],
              ["Panic-mode recovery", "Error pe `;` ya next statement keyword (`if`, `while`, `return`…) tak tokens skip → ek run me kai errors report."],
              ["Symbol table", "Naam → (type, const?, slot). Scopes ka stack: `vector<unordered_map<string, Symbol>>`."]
            ]},
            { t: "steps", title: "Kaise kaam karta hai", items: [
              "**Lexer:** characters padh ke tokens, line/column ke saath (error messages ke liye). Longest match: `>=` ek token, `>` + `=` nahi. `#include` lines skip.",
              "**Parser chain (13 levels):** assignment → ternary → `||` → `&&` → `|` → `^` → `&` → `== !=` → `< <= > >=` → `<< >>` → `+ -` → `* / %` → unary → call/index → primary. Har level: left operand lo, jab tak apna operator mile `while` loop me right operand lo → **left-associative**.",
              "**Assignment right-associative:** `parse_expression` `=` milne pe khud ko recursively call karta hai → `a = b = c` = `a = (b = c)`.",
              "**Nested templates:** `vector<vector<int>>` me lexer `>>` deta hai; parser type context me use do `>` me split karta hai.",
              "**Semantic:** scope stack me declare/lookup (andar se bahar), same scope me redeclare error, `const` pe assign error, `break` loop ke bahar error, function arity/argument types, return type check. Strict types: `+` ke dono operands same type (int/float/string), condition must be `bool`, conversion sirf explicit `as` se."
            ]},
            { t: "code", file: "parser.cpp", lang: "cpp", code: `ExprPtr Parser::parse_term() {                 // + -
    ExprPtr expr = parse_factor();              // higher precedence first
    while (match(TokenType::PLUS) || match(TokenType::MINUS)) {
        TokenType op = previous().type;
        ExprPtr right = parse_factor();
        expr = make_binary(previous().line, op, std::move(expr), std::move(right));
    }
    return expr;                                 // loop => left-associative
}

void Parser::synchronize() {                     // panic mode
    advance();
    while (!is_at_end()) {
        if (previous().type == TokenType::SEMICOLON) return;
        switch (peek().type) {
            case TokenType::KW_IF: case TokenType::KW_WHILE: case TokenType::KW_FOR:
            case TokenType::KW_RETURN: /* fn, let, const, struct, ... */ return;
            default: advance();
        }
    }
}` },
            { t: "callout", kind: "analogy", title: "Precedence = building ki manzilein", text: "Neeche wali manzil (assignment) upar wali (`*`) ko pehle bulati hai. Jo upar hai wo pehle 'bandh' jaata hai — isliye `1 + 2 * 3` me `*` pehle." },
            { t: "say", length: "45 seconds", text: "MiniLang is a compiler and virtual machine I built in C++17 for a statically typed, C++-style language. Source goes through a lexer, a hand-written recursive-descent parser that builds an AST, a semantic analyzer with scoped symbol tables and strict type checking, an optimizer, and a code generator that emits bytecode for a stack-based VM with 60 opcodes. The same C++ compiles to WebAssembly, so it runs in a browser IDE with a step-through debugger." },
            { t: "followups", items: [
              ["How does your parser handle precedence and associativity?", "Each precedence level is its own function that calls the next-higher level for its operands — 13 levels from ternary down to call and primary. A while loop inside each level makes binary operators left-associative, and assignment calls parse_expression recursively on its right side, so it is right-associative."],
              ["Why recursive descent instead of a parser generator?", "It's easy to read and debug, gives full control over error messages and recovery, and handles C++-style quirks like splitting '>>' in nested templates. The cost is more hand-written code as the grammar grows."],
              ["What happens on a syntax error?", "The parser reports the error with line and column, then enters panic mode: it skips tokens until a semicolon or a keyword that starts a statement, like if, while or return, and continues. That way one run reports several independent errors instead of stopping at the first."],
              ["How do scopes work in the semantic analyzer?", "A stack of hash maps. Entering a block pushes a map, leaving pops it. Lookup searches from the innermost scope outward, so inner variables shadow outer ones, and redeclaring a name in the same scope is an error."],
              ["What would you add next?", "Unit tests for the lexer and parser, fuzzing to catch crashes on malformed input, and better diagnostics like 'did you mean' suggestions."]
            ]},
            { t: "remember", items: ["Lexer → Parser → Semantic → Optimizer → Codegen → VM", "Lower level calls higher level; while loop = left-assoc; recursion = right-assoc", "Panic mode: skip to `;` or statement keyword"] }
          ],
          cards: [{ q: "Walk me through MiniLang's pipeline.", hint: "Lexer → recursive-descent parser (13 levels, panic mode) → semantic (scopes, types) → optimizer → codegen → stack VM (60 opcodes) → WASM IDE.", a: "Source is tokenised by a lexer, parsed by a recursive-descent parser into an AST, checked by a semantic analyzer with scoped symbol tables and strict types, optimised with constant folding, propagation and dead-code elimination, then compiled to bytecode for a 60-opcode stack VM. The whole thing also compiles to WebAssembly for a browser IDE with a debugger." }]
        },

        {
          id: "m-back", title: "Optimizer, bytecode, VM, WebAssembly",
          why: "Systems interviewer yahi poochta hai: 'How do function calls work in your VM?' 'How are jumps patched?' Real bytecode dekh ke samjho.",
          blocks: [
            { t: "resume", text: "Designed a **stack-based VM with 60 opcodes** and call frames; compiled it to **WebAssembly** for a client-side IDE (Monaco) with a step-through debugger for bytecode, stack, and locals; **14 end-to-end tests** in GitHub Actions CI." },
            { t: "words", items: [
              ["Constant folding", "Compile time pe hi `5 + 10 * 2` → `25`."],
              ["Constant propagation", "`const int SIZE = 4;` → baad me `SIZE` ki jagah `4`."],
              ["Dead-code elimination", "`if (false) {…}` ka code hi mat banao."],
              ["Stack VM", "Operands stack pe push; `ADD` do pop karke result push."],
              ["Backpatching", "Jump ka target abhi pata nahi → placeholder likho, baad me address bharo."],
              ["Call frame", "{function index, ip, base pointer} — har call ka apna locals window."]
            ]},
            { t: "code", file: "Real disassembly (live WASM build)", lang: "bytecode", code: `// const int SIZE = 4;  int x = SIZE * 2 + 1;  if (false) { cout << "never"; }  cout << x;
0000  PUSH_INT      0 (4)       // SIZE's slot
0003  PUSH_INT      1 (9)       // SIZE * 2 + 1 folded to 9, if(false) removed
0006  LOAD_LOCAL    1 (x)
0009  WRITE

// int i = 0; while (i < 3) { i = i + 1; }
0000  PUSH_INT      0 (0)       // i lives in stack slot 0
0003  LOAD_LOCAL    0 (i)       // loop_start
0006  PUSH_INT      1 (3)
0009  LT
0010  JUMP_IF_FALSE 0027        // emitted as 0xFFFF, patched after body
0013  LOAD_LOCAL    0 (i)
0016  PUSH_INT      2 (1)
0019  ADD
0020  STORE_LOCAL   0 (i)
0023  POP                       // assignment is an expression; drop its value
0024  JUMP          0003        // back to loop_start
0027  ...` },
            { t: "steps", title: "Optimizer + codegen + VM", items: [
              "**Folding safe hai:** int64 overflow check (e.g. `l > INT64_MAX - r` ho to fold mat karo), `/0` aur `INT64_MIN / -1` fold nahi — runtime error runtime pe hi aaye.",
              "**Propagation sirf `const` literal** declarations ki (har function ke liye scope reset). Normal variable propagate karne ke liye loops/assignments ka data-flow analysis chahiye — isliye nahi kiya.",
              "**Codegen:** locals = stack slots (declaration ki value hi slot ban jaati hai). `emit_jump` 2-byte placeholder deta hai, `patch_jump` baad me absolute 16-bit target bharta hai. `break`/`continue` jumps list me, loop khatam hone pe patch.",
              "**Value:** `std::variant<int64_t, double, bool, string, PointerValue, ArrayValue>`; array = `shared_ptr<vector<Value>>`.",
              "**CALL:** args stack pe; naya frame `base_pointer = stack.size() - argc` → args hi callee ke pehle locals. **RETURN:** result pop, `stack.resize(base)`, result push — wahi slot caller ka local ban jaata hai.",
              "**Pointers:** stack index. `&a` → `LOAD_LOCAL_ADDR`; `*p` → `LOAD_DEREF` (bounds check: index ≥ stack size = runtime error).",
              "**Runtime errors:** division by zero, non-bool condition, invalid operand types.",
              "**WebAssembly:** Emscripten (`em++`) same C++ → `.wasm` + JS glue. Exported C functions (`wasm_compile`, `wasm_run`, `wasm_debug_step`, `wasm_debug_stack`…) JS se `Module.ccall`. Debugger ek-ek instruction step karke stack/locals/bytecode dikhata hai. CI workflow pinned emsdk container me WASM build karta hai."
            ]},
            { t: "diagram", svg: D.seq(["main frame", "stack", "add frame"], [[0, 1, "PUSH 2, PUSH 3", "acc"], [1, 2, "CALL add argc=2 → base = size − 2", "acc"], [2, 2, "a = slot 0, b = slot 1 · ADD", "ok"], [2, 1, "RETURN: pop 5, resize(base)", "dash"], [1, 0, "push 5 → becomes local r", "ok"]], { colW: 220, label: "Function call in the VM" }), caption: "`int r = add(2, 3);` — return value ussi slot pe aata hai jahan `r` rehta hai" },
            { t: "callout", kind: "trap", title: "Limitations (honestly bolo, saath me fix)", text: [
              "Dangling pointer sirf out-of-bounds pe pakda jaata hai; pop hua slot dobara use ho gaya to galat value padh sakta hai. Fix: frame generation IDs.",
              "Runtime int overflow check nahi (C++ me signed overflow UB). Fix: `__builtin_add_overflow`.",
              "Recursion depth limit nahi; browser me WASM main thread pe chalta hai → infinite loop tab freeze. Fix: Web Worker + instruction budget.",
              "16-bit jump/constant index → ek function ~65 KB bytecode tak."
            ]},
            { t: "callout", kind: "tip", title: "Bug story", text: "Live IDE optimizer se pehle ka `.wasm` serve kar raha tha → constant-folding test browser me fail, debugger crash. CI me WASM rebuild workflow add kiya, Node me 14/14 tests WASM se verify, debugger ne disassembler reuse kiya." },
            { t: "followups", items: [
              ["How do function calls work in your VM?", "Arguments are pushed, then CALL pushes a frame with the function index, ip zero, and base pointer equal to stack size minus argument count, so the arguments become the callee's first locals. Locals are addressed relative to that base. RETURN pops the result, truncates the stack back to the base, pops the frame and pushes the result for the caller."],
              ["How do you compile a while loop?", "Record the loop start, compile the condition, emit JUMP_IF_FALSE with a placeholder, compile the body, emit a JUMP back to the start, then patch the placeholder to the current offset. Break jumps are patched to the end and continue jumps to the start."],
              ["Why doesn't constant folding fold division by zero?", "Folding must not change program behaviour. Division by zero, or INT64_MIN divided by minus one, should produce a runtime error, so the optimizer leaves those expressions for the VM."],
              ["Why only propagate const variables?", "A const bound to a literal can never change, so replacing it is always safe. Propagating ordinary variables needs data-flow analysis to prove no assignment happens on any path, including loops, which I didn't implement."],
              ["Stack VM vs register VM?", "A stack VM has a simpler compiler and compact instructions but more push and pop operations. Register VMs like Lua's execute fewer instructions but need register allocation. For a teaching-sized language, stack-based was the right trade-off."],
              ["How are pointers implemented?", "A pointer is an index into the VM stack. Taking an address pushes the local's absolute slot, and dereferencing checks the index is inside the stack before reading or writing. It doesn't detect a stale pointer into a slot that has been reused."],
              ["How does the browser IDE run C++?", "Emscripten compiles the same compiler and VM to WebAssembly. JavaScript calls exported C functions through Module.ccall — compile, run, step, read stack and variables — so everything runs client-side with no server."]
            ]},
            { t: "remember", items: ["Fold safely (overflow, /0 skip) · propagate only const · DCE constant if/while", "CALL: base = size − argc · RETURN: resize(base) + push", "Jumps: placeholder → patch (absolute 16-bit)", "Limits: stale pointers, no overflow check, main-thread WASM"] }
          ]
        }
      ],
      revision: {
        pitch: "MiniLang is a compiler and bytecode VM in 7,000+ lines of C++17: lexer, recursive-descent parser with 13 precedence levels and panic-mode recovery, semantic analysis, an optimizer, and a 60-opcode stack VM. It compiles to WebAssembly for a browser IDE with a step-through debugger, with 14 end-to-end tests in CI.",
        numbers: [["7,000+", "lines C++17"], ["13", "precedence levels"], ["60", "opcodes"], ["14", "end-to-end tests"]],
        flow: ["Lexer (longest match, line/col)", "Parser (level functions, while = left-assoc, synchronize)", "Semantic (scope stack, strict types)", "Optimizer (safe folding, const propagation, DCE)", "Codegen (slots, backpatched jumps)", "VM (frames, base pointer, pointers = stack index)", "WASM (Emscripten, ccall, debugger)"],
        traps: ["Stale pointer not detected", "No runtime overflow / recursion limit", "Infinite loop freezes tab (no worker)"]
      }
    },

    // ───────────────────────────── LOAD BALANCER ─────────────────────────────
    {
      id: "lb", title: "Fault-Tolerant HTTP Load Balancer (Go)", short: "Load Balancer", color: "#34d399",
      lessons: [
        {
          id: "l-design", title: "Routing, health checks, retry, backend replication",
          why: "Backend/infra interviews ka core: load balancing algorithms, failure handling, retries ki safety, consistency.",
          blocks: [
            { t: "resume", text: "Developed a **Go reverse-proxy load balancer** with least-connections routing, active health checks, and **retry on another backend**, in front of 3 replicated Go backends and PostgreSQL on 4 containers capped at **1 CPU / 512 MiB**." },
            { t: "diagram", svg: D.flow([["Clients", "up to 2,500 users", "acc"], ["Load balancer", "least-conn · health · retry"], ["3 Go backends", "in-memory feed · batch writes"], ["PostgreSQL", "shared store + seq sync", "good"]], { perRow: 4, w: 170, label: "Topology" }), caption: "4 containers, har ek 1 CPU / 512 MiB (Postgres ek backend ke container me)" },
            { t: "words", items: [
              ["Reverse proxy", "Client LB se baat karta hai; LB peeche backend se request karke response wapas deta hai."],
              ["Least-connections", "Jis backend pe abhi sabse kam in-flight requests, usko bhejo."],
              ["Health check", "Har interval `/health` probe; 3 lagatar fail = down."],
              ["Idempotent", "Same request do baar = effect ek baar."],
              ["Keep-alive pool", "TCP connections reuse — har request pe naya handshake nahi."],
              ["Eventual consistency", "Nodes thodi der ke liye alag, phir same."]
            ]},
            { t: "code", file: "loadbalancer/main.go", lang: "go", code: `// least-connections among backends not yet tried for this request
func (lb *LoadBalancer) selectBackendExcluding(tried map[*Backend]bool) *Backend {
    n := len(lb.backends)
    startIdx := int(lb.currIndex.Add(1))        // rotating start: ties take turns
    var best *Backend
    var bestLoad int64
    for i := 0; i < n; i++ {
        b := lb.backends[(startIdx+i)%n]
        if tried[b] { continue }
        load := b.InFlight.Load()               // atomic counter
        if !b.Alive.Load() { load += 1 << 20 }  // down: last resort, not excluded
        if best == nil || load < bestLoad { best, bestLoad = b, load }
    }
    return best
}` },
            { t: "steps", title: "Request ka safar", items: [
              "Body buffer karo (max **1 MiB**, `sync.Pool` buffer) — bada ho to **413**. Buffer isliye ki retry pe body dobara bhej sakein.",
              "`selectBackendExcluding(tried)` → least in-flight backend. `InFlight.Add(1)`.",
              "`Transport.RoundTrip`: connection error ya **5xx** aur client ko abhi kuch nahi bheja → `tried` me daalo, **doosre untried backend** pe retry.",
              "Success: headers copy (hop-by-hop headers hata ke), body stream, `InFlight.Add(-1)`. Headers bhej diye to retry possible nahi.",
              "Sab fail → **502 'all backends failed'**.",
              "**Health loop:** har interval har backend ko `/health` (2 s timeout). 3 consecutive fail → `Alive=false`; ek success → wapas up.",
              "**Backend POST /message:** message ID se dedupe (`seenIDs` sync.Map) → in-memory feed me add → `msgChan` queue → ack. Writer goroutine: 500 rows ya 25 ms me multi-row `INSERT … ON CONFLICT (id) DO NOTHING`, AES-GCM encrypt + Ed25519 sign.",
              "**Replication:** har node 300 ms me `SELECT … WHERE seq > last` se peers ke rows pull karta hai (2000 seq overlap for out-of-order commits, har 3 s reconcile). `GET /feed` pre-rendered JSON (+ cached gzip) serve karta hai."
            ]},
            { t: "diagram", svg: D.seq(["Client", "LB", "backend-2", "backend-1"], [[0, 1, "POST /message (id=abc)", "acc"], [1, 2, "least in-flight → backend-2", "dash"], [2, 1, "connection refused / 503", "bad"], [1, 1, "nothing sent to client yet → retry", "warn"], [1, 3, "same body, untried backend", "dash"], [3, 1, "200 (id dedupe keeps it once)", "ok"], [1, 0, "200", "ok"]], { colW: 175, label: "Retry flow" }), caption: "Retry sirf tab jab client ko response ka ek byte bhi nahi gaya" },
            { t: "callout", kind: "honest", title: "Trade-offs jo interviewer pakdega", text: [
              "**Ack before commit:** message DB me likhne se pehle ack; crash ho to batch me pade messages lost. Queue full ho to DB write drop (counter badhta hai). Fix: commit ke baad ack, ya WAL/queue.",
              "Table `UNLOGGED` (benchmark data, WAL skip) — Postgres crash pe data jaa sakta hai.",
              "**Retry safety** message ID pe depend: client ID na bheje to server naya ID banata hai → retry duplicate bana sakta hai.",
              "**LB single point of failure**; Postgres bhi ek hi. Fix: 2 LBs + virtual IP (keepalived) ya DNS; Postgres replica.",
              "Benchmarks me 1 → 3 backends pe throughput flat (~500 req/s): single-CPU LB bottleneck."
            ]},
            { t: "followups", items: [
              ["Why least-connections instead of round-robin?", "Round-robin assumes every request costs the same. Here feed reads and message writes take different time, so a slow backend accumulates in-flight requests. Least-connections sends new work to whichever backend is actually least busy, and a rotating start index makes backends with equal load take turns."],
              ["When is it safe to retry a request?", "Only before any response bytes reach the client, and only if repeating the operation is harmless. I buffer the body so it can be resent, retry on connection errors or 5xx on an untried backend, and the backends deduplicate by message ID with ON CONFLICT DO NOTHING, so a retried POST is stored once."],
              ["What if a backend is slow but not dead?", "Health checks have a 2-second timeout and need three consecutive failures. Meanwhile least-connections naturally routes around it, because its in-flight count stays high."],
              ["Why keep a down backend selectable at all?", "If health checks are wrong — for example the health endpoint is overloaded — excluding every backend would turn a partial problem into a full outage. So a down backend gets a huge penalty but is still used if nothing else is left."],
              ["How do the three backends stay consistent?", "They share PostgreSQL. Each node accepts writes into its own in-memory feed and batches them into the database, and every 300 ms pulls rows from peers by a monotonic sequence number, with an overlap window because batches can commit out of order and a periodic reconcile. It's eventually consistent within about a sync interval; before an authoritative read it asks peers to flush."],
              ["What's the durability trade-off?", "Messages are acknowledged after entering the in-memory feed and write queue, before the database commit, to keep latency low. A crash can lose the batch in flight. For real chat data I'd acknowledge after commit or write to a durable log first."],
              ["How would you remove the load balancer as a single point of failure?", "Run two load balancers with a floating virtual IP using keepalived or VRRP, or put them behind DNS or a cloud load balancer. Their only state is health and counters, which each can rebuild locally."]
            ]},
            { t: "remember", items: ["Least in-flight + rotating start + down = +2²⁰", "Retry: before headers, untried backend, body ≤ 1 MiB, ID dedupe", "3 fails down, 1 success up", "Ack-before-commit, UNLOGGED, LB SPOF = honest trade-offs"] }
          ]
        },

        {
          id: "l-oom", title: "OOM debugging story + Go memory concepts",
          why: "Ye tumhari sabse strong engineering story hai. Interviewer 'how did you find it' pe 5 levels tak jaayega.",
          blocks: [
            { t: "resume", text: "Traced an **18% error rate** to **OOM kills** (cgroup memory events); cut memory via snapshot caching, `sync.Pool` buffers, and GOMEMLIMIT/GOGC tuning: **0 errors over 60,000 requests** at up to **2,500 concurrent users**." },
            { t: "words", items: [
              ["cgroup", "Linux feature jo container ka CPU/memory limit lagata hai. `memory.events` me `oom_kill` count."],
              ["OOM kill", "Memory limit cross → kernel process ko maar deta hai."],
              ["GOGC", "GC kab chale: heap live data se kitna % badhe. Kam = zyada baar GC, kam memory."],
              ["GOMEMLIMIT", "Go runtime ko soft memory limit — paas aate hi GC aggressive."],
              ["sync.Pool", "Temporary objects (buffers) reuse → garbage kam."],
              ["Socket buffers", "Kernel memory per connection; cgroup isko bhi container ki 512 MiB me ginta hai."]
            ]},
            { t: "steps", title: "Investigation (isi order me bolo)", items: [
              "**Symptom:** ~18% errors, lekin successful requests fast. Errors har load stage ke **pehle seconds** me cluster, **zero timeouts**.",
              "**Inference:** slowness hoti to timeouts aate. Instant failures = **connection refused** = us waqt koi listen hi nahi kar raha.",
              "**Evidence:** LB container me `cat /sys/fs/cgroup/memory.events` → **oom_kill 121**. Supervisor script `sleep 1` ke baad restart karta tha → har crash = 1 second ka dead window.",
              "**Chhupa kyun:** feed integrity 100% dikhti thi — backends restart pe Postgres se feed rebuild kar lete the.",
              "**Fixes (sab memory):** request bodies `sync.Pool` buffer me (har request `io.ReadAll` nahi); outbound pool 3×600 @ 8 KiB → 3×512 @ 4 KiB (~17 MiB); latency samples 200,000 → 8,192; LB `GOMEMLIMIT` + `GOGC=80`; backend `/feed` ka `snapshotFresh` (poora feed har request pe write lock ke andar copy nahi); restart delay 1 s → 50 ms.",
              "**Verify:** do graded runs back-to-back: **0 errors / 60,000 requests**, 2,500 users tak, LB peak **364 of 512 MB**, koi naya oom_kill nahi, teeno backends ka same 57,490-message feed."
            ]},
            { t: "diagram", svg: D.seq(["Load stage starts", "LB process", "cgroup (512 MiB)", "Supervisor"], [[0, 1, "burst of new connections", "acc"], [1, 2, "heap + socket buffers exceed limit", "bad"], [2, 1, "oom_kill", "bad"], [1, 3, "process exits", "dash"], [3, 3, "sleep 1 s → nothing listening → refusals", "bad"], [3, 1, "restart (after fix: 50 ms)", "ok"]], { colW: 175, label: "OOM failure loop" }), caption: "Isliye errors stage ke shuru me aur timeouts zero" },
            { t: "say", length: "60 seconds", text: "Under graded load the system failed about 18% of requests, but the requests that succeeded were fast, errors clustered in the first seconds of each load stage, and there were no timeouts. That pattern meant connections were being refused, not served slowly. cgroup memory.events on the load balancer container showed 121 OOM kills, and the supervisor waited a full second before restarting, so every crash was a second of refusals. The feed still looked complete because backends rebuilt it from Postgres, which hid the crashes. I reduced memory with sync.Pool body buffers, smaller connection buffers, a bounded latency sample, GOMEMLIMIT and GOGC tuning, and a cached feed snapshot, and cut the restart delay to 50 ms. Two graded runs then had zero errors over 60,000 requests up to 2,500 users, with peak memory at 364 of 512 MB." },
            { t: "followups", items: [
              ["Why didn't Go's garbage collector prevent this?", "By default the GC doesn't know about the container limit; it triggers relative to the live heap, so under bursts the heap can grow past 512 MiB. Kernel socket buffers are also charged to the cgroup but invisible to the Go heap. GOMEMLIMIT tells the runtime about a budget so it collects harder as it approaches it."],
              ["Why does sync.Pool help?", "Each request used to allocate a new body buffer, creating garbage faster than the GC reclaimed it under load. A pool reuses buffers across requests, cutting allocation rate and peak heap."],
              ["How did you verify it was fixed and not just lucky?", "Two full graded runs back to back — 60,000 requests ramping to 2,500 users — with zero errors, no new oom_kill events in memory.events, peak memory measured at 364 of 512 MB, and all three backends reporting the identical feed."],
              ["Why couldn't you reproduce it locally?", "A dev machine has no 512 MiB cgroup limit, so the process never gets killed. The bug only existed under the container's memory cap, so the evidence had to come from the container itself."],
              ["What's the trade-off of a lower GOGC?", "The GC runs more often, costing CPU. With a single CPU that could raise latency, so I paired it with a memory limit rather than setting it very low, and measured that latency stayed acceptable."],
              ["What would you monitor in production?", "OOM kill counts and container memory against the limit, restart counts, connection refusals at the load balancer, error rate by status code, and p99 latency — with alerts on restarts, since a green data-integrity check can hide crashes."]
            ]},
            { t: "remember", items: ["Clustered + zero timeouts → refusals → process dead", "memory.events: oom_kill 121 · restart sleep 1 s", "Fix memory + 50 ms restart → 0 / 60,000 · 364/512 MB"] }
          ]
        }
      ],
      revision: {
        pitch: "A Go reverse-proxy load balancer with least-connections routing, active health checks and retry on an untried backend, in front of three backends that replicate a chat feed through PostgreSQL. Under 1 CPU / 512 MiB caps I traced an 18% error rate to OOM kills and got it to zero errors over 60,000 requests at 2,500 concurrent users.",
        numbers: [["18% → 0", "errors"], ["60,000", "requests, up to 2,500 users"], ["121", "oom_kill events"], ["364 / 512 MB", "LB peak after fix"], ["1 MiB", "max retry body (413 above)"], ["500 rows / 25 ms", "batch insert"], ["300 ms", "peer sync"]],
        flow: ["Topology: LB → 3 backends → Postgres, 1 CPU / 512 MiB each", "Routing: least in-flight, rotating ties", "Health: 3 failures down, 1 success up", "Retry: buffered body, before headers, untried backend, ID dedupe", "Backend: feed-first ack, batch insert, seq sync", "OOM story"],
        traps: ["Ack before commit + UNLOGGED table", "LB and Postgres are single points of failure", "Throughput flat 1 → 3 backends (LB CPU bottleneck)", "Server-generated IDs don't dedupe retries"]
      }
    },

    // ───────────────────────────── ALGORACE ─────────────────────────────
    {
      id: "algorace", title: "AlgoRace · Real-Time Coding Race", short: "AlgoRace", color: "#fb923c",
      lessons: [
        {
          id: "a-arch", title: "Architecture, API, auth, real-time, matchmaking",
          why: "Full-stack interviewer: 'How does real-time work?', 'How is auth done?', 'What breaks with two servers?'",
          blocks: [
            { t: "resume", text: "Built a 1v1 coding race platform with **102 problems and 1,020 test cases**: players are paired by **ELO rating**, race on the same problem, and see live opponent progress over **Socket.IO** rooms. Architected **30 REST endpoints** from an **OpenAPI** spec with generated type-safe React Query hooks and Zod validators; secured with **JWT**, bcrypt, and rate limiting." },
            { t: "diagram", svg: D.flow([["React + Vite", "Vercel · Monaco editor", "acc"], ["Express 5 API", "Render · REST + Socket.IO"], ["PostgreSQL", "Drizzle ORM"], ["Wandbox API", "compiles & runs code", "warn"]], { perRow: 4, w: 170, label: "AlgoRace architecture" }), caption: "Monorepo (pnpm workspaces): api-spec → Orval → api-client-react + api-zod; db schema shared" },
            { t: "words", items: [
              ["OpenAPI / contract-first", "API ka spec (openapi.yaml) pehle; usi se client hooks aur validators generate."],
              ["Orval", "Tool jo spec se React Query hooks + Zod schemas banata hai."],
              ["JWT", "header.payload.signature — server secret se sign; stateless login."],
              ["bcrypt (cost 12)", "Slow password hash + salt built-in."],
              ["Socket.IO room", "Named group: `user:<id>`, `match:<id>`; emit sirf us room ko."],
              ["ELO", "Rating: expected score `1/(1+10^((Rb−Ra)/400))`, change = K × (actual − expected), K = 32."]
            ]},
            { t: "steps", title: "Flow: lobby se race tak", items: [
              "**Auth:** register/login → bcrypt(12) → JWT (7 days) → frontend localStorage. Auth routes aur submissions pe rate limit 10/min. Render proxy ke peeche `trust proxy` set (sahi client IP).",
              "**Socket connect:** handshake me token; `io.use` middleware verify karta hai → `socket.join('user:<id>')`.",
              "**Queue:** `POST /matchmaking/join` → user in-memory queue me (ELO ke saath) → `tryMatchPlayers()`: ELO se sort, **adjacent pairs me sabse chhota difference** pick (sorted array me closest pair hamesha adjacent hota hai). `matching` flag overlapping runs rokta hai.",
              "**Match:** random problem (`ORDER BY random()`), match + match_players rows → dono ko `user:<id>` room me `queue:matched`.",
              "**Race room:** `match:join` pe server check karta hai ki user participant hai → `match:<id>` room. Har submission ke baad `match:progress` (tests passed) opponent ko live dikhta hai.",
              "**Leaderboard REST hai**, real-time nahi (honest)."
            ]},
            { t: "code", file: "services/matchmaking.ts", lang: "ts", code: `function pickClosestPair(): [QueueEntry, QueueEntry] | null {
  if (queue.length < 2) return null;
  const sorted = [...queue].sort((a, b) => a.elo - b.elo);
  let bestI = 0, bestDiff = Infinity;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = Math.abs(sorted[i].elo - sorted[i + 1].elo);
    if (diff < bestDiff) { bestDiff = diff; bestI = i; }
  }
  return [sorted[bestI], sorted[bestI + 1]];   // O(n log n)
}` },
            { t: "callout", kind: "honest", title: "Limitations + fix (ready rakho)", text: [
              "Queue aur disconnect timers **process memory** me → restart pe lost; 2 servers pe alag-alag queues. Fix: Redis sorted set (score = ELO) + Socket.IO Redis adapter + sticky sessions.",
              "Matching sirf `/join` pe trigger hota hai; max ELO gap nahi. Fix: periodic matcher + time ke saath widening window.",
              "`joinQueue` me check aur push ke beech `await` (DB se ELO) → double click do entries daal sakta hai. Fix: pehle sync `Set` me mark karo.",
              "JWT localStorage me → XSS se chori ho sakta hai; JWT revoke nahi hota 7 din. Alternative: httpOnly cookie + CSRF protection, short access token + refresh."
            ]},
            { t: "followups", items: [
              ["Why contract-first with OpenAPI?", "The spec is the single source of truth. Orval generates typed React Query hooks for the frontend and Zod validators for the backend, so a change to an endpoint shows up as a compile error on both sides instead of a runtime bug."],
              ["How does matchmaking pick opponents?", "Players waiting in the queue are sorted by ELO, and I pick the adjacent pair with the smallest rating difference — in a sorted list the closest pair is always adjacent, so it's O(n log n). A flag prevents overlapping matching runs."],
              ["What breaks if you run two API servers?", "The queue, disconnect timers and Socket.IO rooms live in one process's memory. Players on different servers could never match, and events wouldn't reach sockets on the other server. I'd move the queue to Redis, use the Socket.IO Redis adapter, and enable sticky sessions."],
              ["How do WebSockets authenticate?", "The client sends the JWT in the Socket.IO handshake. A server middleware verifies it before the connection is accepted and stores the user ID on the socket, and joining a match room re-checks in the database that the user is a participant."],
              ["Why store passwords with bcrypt instead of SHA-256?", "bcrypt is deliberately slow with a tunable cost — 12 here — and salts each hash, so brute-forcing leaked hashes is expensive. SHA-256 is designed to be fast."],
              ["What's the downside of JWT in localStorage?", "Any XSS can read it, and a JWT can't be revoked before it expires. An httpOnly cookie hides it from JavaScript but needs CSRF protection; short-lived access tokens with refresh tokens limit the damage."]
            ]},
            { t: "remember", items: ["Contract-first: openapi.yaml → Orval → hooks + Zod", "Rooms: user:<id>, match:<id>", "Closest pair = adjacent after sort", "In-memory queue/timers → Redis to scale"] }
          ]
        },

        {
          id: "a-grade", title: "Grading harness, single-winner transaction, ELO",
          why: "Sabse interesting sawal: 'Dono ek saath solve kar dein to?' aur 'Koi cheat kar sakta hai?'",
          blocks: [
            { t: "resume", text: "Automated grading with generated C++/Java test harnesses (Wandbox API); settled wins and ELO changes in **one database transaction** that permits a single winner, with a 10-second reconnect grace before forfeit; deployed on Vercel and Render." },
            { t: "steps", title: "Submission ka safar", items: [
              "Validate: matchId, language (cpp/java), code < 50 KB; user participant hai; match `active` hai.",
              "**Harness generate:** ek hi program = helpers + user ka code + `main()` jisme saare test cases (input, expected) array me. Har test: input parse (function signature ke types se), user function call, output serialize, compare, try/catch → end me **JSON array** print.",
              "**Ek Wandbox call** (gcc-head / openjdk-jdk-22+36) — N tests ke N calls nahi → kam latency, rate limit safe. Compile error / non-zero exit → saare tests fail with message.",
              "Result save (`match_players`), opponent ko `match:progress`.",
              "Sab pass aur `winnerId === null` → **transaction**: `UPDATE matches SET winner_id, status='finished' WHERE id = ? AND winner_id IS NULL RETURNING id`. 0 rows = koi aur jeet chuka → return. Warna dono users ki ELO/wins/losses update + `elo_history`.",
              "**Commit ke baad** `match:finished` emit (pehle commit se pehle emit hota tha — fix kiya).",
              "**Disconnect:** socket disconnect → 10 s timer + `match:opponent_disconnected`. Wapas `match:join` kiya to cancel; warna opponent ko forfeit win (same `winner_id IS NULL` guard)."
            ]},
            { t: "diagram", svg: D.seq(["Player A", "Postgres", "Player B"], [[0, 1, "UPDATE … WHERE winner_id IS NULL", "acc"], [2, 1, "same UPDATE (same moment)", "acc"], [1, 1, "A locks row first; B waits", "warn"], [1, 0, "1 row → A wins, ELO updated, COMMIT", "ok"], [1, 1, "B re-checks WHERE: winner_id not null", "warn"], [1, 2, "0 rows → no second winner", "bad"]], { colW: 220, label: "Single-winner race" }), caption: "Postgres row lock + READ COMMITTED re-check = exactly one winner" },
            { t: "code", file: "lib/elo.ts", lang: "ts", code: `const K_FACTOR = 32;
export function computeElo(winnerElo: number, loserElo: number) {
  const expectedWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const winnerNewElo = Math.round(winnerElo + K_FACTOR * (1 - expectedWinner));
  const loserNewElo = Math.max(0, Math.round(loserElo + K_FACTOR * (0 - (1 - expectedWinner))));
  return { winnerNewElo, loserNewElo };
}
// 1200 beats 1200 → +16 / −16
// 1400 beats 1200 → expected 0.76 → +8 only
// 1200 beats 1400 → expected 0.24 → +24 (upset)` },
            { t: "callout", kind: "trap", title: "Cheating — honest answer + fix", text: [
              "User ka code usi process me chalta hai jisme expected outputs aur result printer hai. Koi static initializer se fake `[{\"passed\":true…}]` print karke `exit(0)` kar sakta hai.",
              "Fix: expected outputs program me mat daalo — program sirf actual outputs print kare (random nonce delimiter ke saath), comparison **server pe**; apna sandbox (isolate/nsjail/Judge0) with time + memory limits."
            ]},
            { t: "callout", kind: "honest", title: "Aur limitations", text: ["Wandbox third-party hai: SLA nahi, rate limits; `fetch` pe timeout nahi → hang request ko rok sakta hai (fix: `AbortSignal.timeout`, queue).", "`wins: winnerUser.wins + 1` read-modify-write → SQL `wins = wins + 1` safer.", "Bug fixed: socket handlers me unhandled promise rejection poora API crash kar deta tha (`match:leave` bina data) → guards, try/catch, `unhandledRejection` logger."] },
            { t: "say", length: "45 seconds", text: "When a player submits, the server generates one C++ or Java program containing their function, typed input parsers and all test cases, runs it once on the Wandbox API, and parses a JSON array of results. Progress is pushed to the opponent over Socket.IO. If every test passes, a transaction runs a conditional update — set the winner only where winner_id is still null — so if both players finish at the same moment, Postgres row locking lets exactly one update succeed. The same transaction applies ELO with K = 32, and the finish event is emitted only after commit. If a player disconnects, they get a 10-second grace period before forfeiting." },
            { t: "followups", items: [
              ["What if both players submit correct solutions at the same time?", "Both run UPDATE matches SET winner_id WHERE id = X AND winner_id IS NULL inside a transaction. The first takes the row lock and commits; the second waits, then Postgres re-evaluates the WHERE clause on the new row version, finds winner_id set, and updates zero rows. Zero rows means someone already won, so no ELO change is applied twice."],
              ["Why one program for all test cases instead of one run per test?", "One remote compile and run instead of ten, which cuts latency and stays within the external API's limits. The harness catches exceptions per test, so one failing case doesn't hide the others."],
              ["Can a player cheat the grader?", "In the current design, yes in principle: user code runs in the same process that prints the results and contains expected outputs. The fix is to keep expected outputs on the server, have the program print only actual outputs with a random delimiter, compare server-side, and run code in our own sandbox with time and memory limits."],
              ["Explain the ELO update.", "Expected score is 1 / (1 + 10^((opponent − mine) / 400)). The change is K times actual minus expected, with K = 32. Equal ratings move 16 points; a 1400 beating a 1200 gains only about 8, while an upset gains about 24."],
              ["Why emit the finish event only after commit?", "If the event goes out and the transaction then fails or loses the race, clients show a winner the database doesn't have. Emitting after commit keeps the UI consistent with the source of truth."],
              ["How would you replace Wandbox?", "Run a code-execution service we control — Judge0 or containers with nsjail — with CPU, memory and time limits, no network, and a job queue so bursts don't overload it."]
            ]},
            { t: "remember", items: ["One harness → one Wandbox run → JSON array", "UPDATE … WHERE winner_id IS NULL → exactly one winner", "ELO K = 32 · equal → ±16", "Emit after commit · 10 s grace → forfeit", "Cheat risk: expected outputs in same process"] }
          ]
        }
      ],
      revision: {
        pitch: "AlgoRace is a real-time 1v1 coding race: players are matched by ELO, solve the same problem, and see each other's progress live over Socket.IO. The API is contract-first with OpenAPI-generated hooks and Zod validators, grading runs generated C++/Java harnesses on Wandbox, and a conditional update in one transaction guarantees a single winner.",
        numbers: [["102", "problems"], ["1,020", "test cases"], ["30", "REST endpoints"], ["K = 32", "ELO, default 1200"], ["10 s", "reconnect grace"], ["12", "bcrypt cost"], ["10/min", "rate limit (auth, submissions)"]],
        flow: ["Frontend Vercel ↔ Express + Socket.IO on Render ↔ Postgres; Wandbox executes code", "OpenAPI → Orval → hooks + Zod", "JWT + bcrypt + rate limit; socket handshake auth", "Queue: sort by ELO, closest adjacent pair", "Submit → harness → progress event", "WHERE winner_id IS NULL transaction → ELO → emit after commit"],
        traps: ["In-memory queue/timers don't scale or survive restart", "Grader cheatable (same-process results)", "Leaderboard is REST, not real-time", "Wandbox dependency, no fetch timeout", "No CI / no measured load numbers — don't claim any"]
      }
    }
  ]
}
