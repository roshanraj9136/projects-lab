window.LAB = {
  id: "projects-lab",
  title: "Projects Lab",
  icon: "🛠️",
  topics: [
    {
      id: "start", title: "Shuru karo", short: "Start", color: "#64748b",
      lessons: [{
        id: "p-how", title: "Project interview ka format",
        why: "Project round me interviewer 'walk me through' se shuru karke ek specific architecture decision aur failure mode pe 15 minute drill karta hai.",
        blocks: [
          { t: "steps", title: "Har project ke liye 4 essential pillars ready rakho", items: [
            "**30-Second Architectural Elevator Pitch:** High-level problem, technology stack, and verified scale metric.",
            "**Whiteboard Architecture Diagram:** Data flow, trust boundaries, async queues, and failure isolation.",
            "**2 Deep Design Decisions with Trade-offs:** Option A chosen vs Option B rejected; exact reason why.",
            "**1 Catastrophic Failure / Production Bug Story:** Root cause, kernel/runtime observability, and structural remediation."
          ]},
          { t: "callout", kind: "tip", title: "Kaunsa project kis role ke liye lead karein?", text: [
            "**Backend / Systems / Infra / SRE:** Lead with the **Fault-Tolerant HTTP Load Balancer** (Go concurrency, cgroups OOM debugging, sync.Pool, least-connections).",
            "**Core Systems / C++ / Compilers:** Lead with **MiniLang** (recursive-descent 13-level parser, panic recovery, AST optimizer, 60-opcode stack VM, WebAssembly).",
            "**Full-Stack / Product Engineering:** Lead with **AlgoRace** (OpenAPI contract-first, Socket.IO rooms, atomic single-winner DB transaction, ELO rating).",
            "**Machine Learning / Computer Vision:** Lead with **Project NISHAD** (Experience Lab: multi-spectral PPG, GroupKFold, tree ensembles)."
          ]},
          { t: "remember", items: ["Never describe code without explaining the trade-off", "Memorize concrete numbers: 7,000+ lines C++, 60 opcodes, 0/60,000 errors at 2,500 users, 1,020 test cases"] }
        ]
      }],
      revision: { pitch: "MiniLang: C++17 compiler and 60-opcode VM running in WebAssembly. Load Balancer: Go reverse proxy with OOM debugging under 1 CPU / 512 MiB cgroups. AlgoRace: real-time 1v1 coding race with OpenAPI, Socket.IO, and atomic DB transactions." }
    },

    // ───────────────────────────── MINILANG ─────────────────────────────
    {
      id: "minilang", title: "MiniLang · Compiler, Bytecode VM & Browser IDE", short: "MiniLang", color: "#818cf8",
      lessons: [
        {
          id: "m-front", title: "Pipeline, lexer, parser, semantic analysis",
          why: "Compiler interviews me grammar precedence, associativity, AST memory ownership, aur panic-mode recovery pe deep drill hota hai.",
          blocks: [
            { t: "resume", text: "Engineered a compiler and virtual machine from scratch in **7,000+ lines of C++17** for a statically typed, C++-style language with functions, recursion, pointers, and vector/queue/stack containers." },
            { t: "diagram", svg: D.flow([["Source Code", "C++ style syntax", "acc"], ["Lexer", "token stream + line/col"], ["Parser", "13-level recursive descent"], ["Semantic Analysis", "scoped symbol tables"], ["AST Optimizer", "fold / propagate / DCE"], ["Bytecode Emitter", "60 opcodes + backpatch"], ["Stack VM", "call frames + locals", "good"], ["WebAssembly IDE", "Monaco step debugger", "good"]], { perRow: 4, w: 160, label: "MiniLang End-to-End Pipeline" }), caption: "Complete compilation pipeline: Source code tokenization se WASM in-browser execution tak" },
            { t: "words", items: [
              ["Token Stream", "Lexeme, TokenType enum, line number, and column offset for high-precision diagnostic error messages."],
              ["AST (Abstract Syntax Tree)", "Hierarchical syntactic tree where interior nodes represent operators/statements and leaf nodes represent operands/literals."],
              ["Recursive Descent", "Top-down parsing technique where each non-terminal grammar rule maps to a dedicated C++ member function."],
              ["Operator Precedence", "Relative binding power of operators determining grouping order in expressions without explicit parentheses."],
              ["Panic-Mode Recovery", "Error recovery strategy: upon detecting a syntax error, discard tokens until a synchronizing boundary token (e.g. semicolon or statement keyword) is reached."],
              ["Lexical Scope Stack", "std::vector<std::unordered_map<std::string, Symbol>> maintaining scoped symbol bindings from innermost to outermost block."]
            ]},
            { t: "table", title: "Comprehensive 13-Level Operator Precedence Hierarchy Table", head: ["Level", "Operators", "Associativity", "Parser Member Function", "Grammar Role"], rows: [
              ["1 (Lowest)", "=, +=, -=, *=, /=, %=", "Right-to-Left", "parse_assignment()", "Variable assignment and compound mutations."],
              ["2", "? :", "Right-to-Left", "parse_ternary()", "Conditional ternary expressions."],
              ["3", "||", "Left-to-Right", "parse_logical_or()", "Short-circuit logical disjunction."],
              ["4", "&&", "Left-to-Right", "parse_logical_and()", "Short-circuit logical conjunction."],
              ["5", "|", "Left-to-Right", "parse_bitwise_or()", "Bitwise inclusive OR."],
              ["6", "^", "Left-to-Right", "parse_bitwise_xor()", "Bitwise exclusive OR."],
              ["7", "&", "Left-to-Right", "parse_bitwise_and()", "Bitwise AND."],
              ["8", "==, !=", "Left-to-Right", "parse_equality()", "Value equality and inequality checks."],
              ["9", "<, <=, >, >=", "Left-to-Right", "parse_relational()", "Relational ordering comparisons."],
              ["10", "<<, >>", "Left-to-Right", "parse_shift()", "Bitwise left and right shifts."],
              ["11", "+, -", "Left-to-Right", "parse_term()", "Additive binary operations (strings: concatenation)."],
              ["12", "*, /, %", "Left-to-Right", "parse_factor()", "Multiplicative arithmetic."],
              ["13 (Highest)", "!, -, ~, *, &, ++, --", "Right-to-Left", "parse_unary()", "Prefix unary operations, pointer address-of and dereference."],
              ["Primary", "(), literals, ident, call, index", "Left-to-Right", "parse_primary()", "Atomic literals, function invocations, and vector subscriptions."]
            ]},
            { t: "steps", title: "Frontend Pipeline Architecture & Implementation Details", items: [
              "**1. Lexical Analysis (Scanner):** Consumes UTF-8 characters. Implements maximal munch (longest match): `>=` is recognized as a single relational token, not `>` followed by `=`. Skips whitespace and C++ style line/block comments. Preserves line and column coordinates for every token.",
              "**2. Recursive Descent Parsing Loop:** Left-associative operators (e.g. `+ - * /`) are implemented using a `while` loop that repeatedly matches current-level operators and binds leftward. Right-associative operators (e.g. `=`) recursively call `parse_expression()` on the right-hand side, creating a right-leaning AST branch.",
              "**3. Disambiguating Nested Templates:** When parsing types like `vector<vector<int>>`, lexer encounters `>>`. In template context, parser detects type parsing mode and splits `>>` into two consecutive `>` closing tokens without requiring backtracking.",
              "**4. Panic-Mode Error Recovery (`synchronize()`):** When an unrecoverable syntax error occurs, parser emits a diagnostic and enters panic mode: it discards tokens until it encounters a semicolon `;` or a token beginning a new statement (`if`, `while`, `for`, `return`, `let`). This prevents cascading syntax errors and reports multiple independent issues in a single pass.",
              "**5. Semantic Analysis & Type System:** Traverses the AST. Manages symbol tables using `std::vector<std::unordered_map<std::string, Symbol>>`. Enforces: (a) variable declaration before use; (b) no re-declaration in the same block; (c) immutable assignment restrictions on `const` identifiers; (d) strict type checks: binary arithmetic operands must share matching types (no implicit numeric coercion; explicit casting requires `as<T>()`); (e) control-flow validation: `break`/`continue` restricted strictly to loop bodies."
            ]},
            { t: "code", file: "src/parser.cpp (Precedence & Panic Mode)", lang: "cpp", code: `ExprPtr Parser::parse_term() { // Handles + and - (Level 11)
    ExprPtr expr = parse_factor(); // Higher precedence parsed first
    while (match(TokenType::PLUS) || match(TokenType::MINUS)) {
        TokenType op = previous().type;
        ExprPtr right = parse_factor();
        expr = make_binary(previous().line, op, std::move(expr), std::move(right));
    }
    return expr; // While-loop enforces left-associativity
}

ExprPtr Parser::parse_assignment() { // Handles = (Level 1)
    ExprPtr expr = parse_ternary();
    if (match(TokenType::EQUAL)) {
        Token equals = previous();
        ExprPtr value = parse_assignment(); // Right-associative recursion
        if (auto var = std::dynamic_pointer_cast<VariableExpr>(expr)) {
            return std::make_shared<AssignExpr>(equals.line, var->name, std::move(value));
        }
        error(equals, "Invalid l-value: target of assignment must be a mutable variable.");
    }
    return expr;
}

void Parser::synchronize() { // Panic-mode error recovery boundary
    advance();
    while (!is_at_end()) {
        if (previous().type == TokenType::SEMICOLON) return;
        switch (peek().type) {
            case TokenType::KW_IF: case TokenType::KW_WHILE: case TokenType::KW_FOR:
            case TokenType::KW_RETURN: case TokenType::KW_LET: case TokenType::KW_CONST:
                return;
            default: advance();
        }
    }
}` },
            { t: "callout", kind: "tip", title: "Recursive Descent vs Pratt Parsing (Whiteboard Trade-off)", text: [
              "**Recursive Descent:** Each precedence tier has its own explicit function (`parse_term()`, `parse_factor()`). Easy to debug, natural for statements and control flow, trivial to attach custom syntax error handlers. Trade-off: deep call stacks and boilerplate for languages with many operators.",
              "**Pratt Parsing (Top-Down Operator Precedence):** Table-driven; associates numeric 'binding power' with each token. Much fewer functions. Trade-off: harder to read for non-compiler engineers and tricky to integrate C++ style declaration vs expression ambiguities.",
              "MiniLang chose Recursive Descent for maximum readability, explicit AST ownership, and fine-grained diagnostic control."
            ]},
            { t: "followups", items: [
                            ["How do you resolve the 'dangling else' ambiguity in recursive descent?", "In MiniLang, when parsing an `if` statement, the parser greedily binds an optional `else` block to the innermost active `if` statement. This matches standard C/C++ semantics and avoids ambiguous AST branching."],
              ["Why does MiniLang disallow implicit type coercion (e.g. int to float)?", "Implicit type coercion conceals arithmetic bugs, precision loss, and unexpected overload resolution. MiniLang enforces strict type equality on binary operators, requiring explicit `as<float>(x)` casts to make type conversions deliberate and visible in the AST."],
              ["How does your parser prevent infinite recursion on left-recursive grammars?", "In standard BNF grammar, a rule like `Expr -> Expr '+' Term` is directly left-recursive, which causes infinite function recursion in top-down parsers. We transform the grammar into iterative form: `Expr -> Term ('+' Term)*`. In C++, this is implemented as a while-loop inside `parse_term()`, eliminating recursion while preserving left-associative AST construction."],
              ["How is memory managed for the Abstract Syntax Tree?", "All AST nodes inherit from an abstract base class `ASTNode`. Children are managed via `std::unique_ptr<ASTNode>` for strict single-ownership hierarchy, or `std::shared_ptr` where sub-expressions are shared during constant folding and symbol resolution."],
              ["What is the difference between an l-value and an r-value in MiniLang?", "An l-value represents an expression with an identifiable memory address (such as a named variable `x` or array index `arr[i]`). An r-value is a temporary value (`5`, `x + 2`). The assignment parser validates that the left-hand node evaluates to a valid l-value before emitting an assignment AST node."]
            ]},
            { t: "remember", items: ["13 precedence levels: while loop = left-associative; recursive call = right-associative", "Panic mode skips tokens until semicolon or statement keyword", "Symbol tables: vector of hash maps for lexical scoping and shadowing"] }
          ],
          cards: [{ q: "How does MiniLang's parser enforce operator precedence and associativity?", hint: "Function call hierarchy for precedence; while-loop for left-associativity; recursive calls for right-associativity.", a: "MiniLang implements a 13-level recursive-descent parser. Lower precedence functions call higher precedence functions to parse their operands (e.g. `parse_term` for `+ -` calls `parse_factor` for `* /`). Binary left-associative operators are consumed inside a `while` loop that wraps expressions leftward, whereas right-associative operators like assignment recursively invoke themselves on the right operand." }]
        },

        {
          id: "m-back", title: "Optimizer, bytecode, VM, WebAssembly",
          why: "Systems and compiler interviews focus on execution models: stack vs register VMs, opcode dispatch, call frame memory layouts, and WASM linear memory.",
          blocks: [
            { t: "resume", text: "Designed a **stack-based VM with 60 opcodes** and call frames; compiled it to **WebAssembly** for a client-side IDE (Monaco) with a step-through debugger for bytecode, stack, and locals; **14 end-to-end tests** in GitHub Actions CI." },
            { t: "words", items: [
              ["Stack VM", "Virtual machine architecture where operations consume operands from the top of an evaluation stack and push results. Zero explicit registers."],
              ["Instruction Pointer (IP)", "Memory offset pointing to the next bytecode instruction to decode and execute."],
              ["Base Pointer (BP)", "Stack index marking the start of the current function's call frame and local variable window."],
              ["Backpatching", "Two-pass jump resolution: forward jumps emit a dummy 16-bit offset placeholder (0xFFFF); once the target block is compiled, the offset is patched with the concrete target address."],
              ["Constant Folding", "Compile-time evaluation of constant expressions (e.g. `3 * 10 + 5` -> `35`), reducing runtime instruction count to zero."],
              ["Dead Code Elimination (DCE)", "Removal of unreachable bytecode sequences (e.g. branches guarded by `if (false)` or code following an unconditional `return`)."]
            ]},
            { t: "table", title: "MiniLang Bytecode Instruction Set Architecture (60 Total Opcodes)", head: ["Category", "Representative Opcodes", "Execution Semantics"], rows: [
              ["Stack Operations", "OP_PUSH_INT, OP_PUSH_FLOAT, OP_PUSH_STR, OP_POP, OP_DUP", "Push immediate constants or duplicate/drop values on evaluation stack."],
              ["Local Variables", "OP_LOAD_LOCAL <slot>, OP_STORE_LOCAL <slot>", "Direct indexed access to stack slots relative to current frame Base Pointer (BP)."],
              ["Arithmetic Operations", "OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_MOD, OP_NEG", "Pop two operands, execute type-checked ALU operation, push scalar result."],
              ["Logical & Bitwise", "OP_NOT, OP_AND, OP_OR, OP_BAND, OP_BOR, OP_BXOR, OP_SHL, OP_SHR", "Bitwise masking and short-circuit boolean evaluation."],
              ["Comparisons", "OP_EQ, OP_NEQ, OP_LT, OP_LTE, OP_GT, OP_GTE", "Relational comparison pushing boolean 1 or 0."],
              ["Control Flow", "OP_JUMP <target>, OP_JUMP_IF_FALSE <target>, OP_JUMP_IF_TRUE <target>", "Unconditional and conditional relative branch updates to Instruction Pointer (IP)."],
              ["Functions & Calls", "OP_CALL <argc>, OP_RETURN", "Push new CallFrame, rebind BP to `stack.size() - argc`, execute; pop frame and restore BP on return."],
              ["Pointers & Heap", "OP_LOAD_ADDR <slot>, OP_DEREF, OP_DEREF_STORE", "Pointers represented as raw stack/heap indices with runtime bounds checking."]
            ]},
            { t: "code", file: "Real Bytecode Disassembly (Live Engine Dump)", lang: "bytecode", code: `// Source code:
// const int BASE = 10;
// int x = BASE * 2 + 5;
// if (false) { cout << "unreachable"; }
// cout << x;

0000  OP_PUSH_INT      10        // BASE stored in slot 0
0003  OP_PUSH_INT      25        // Folded constant: (10 * 2 + 5) pre-computed at compile time!
0006  OP_STORE_LOCAL   1 (x)     // x stored in slot 1
// Notice: 'if (false)' branch completely eliminated by AST Dead Code Elimination pass!
0009  OP_LOAD_LOCAL    1 (x)
0012  OP_WRITE_INT
0013  OP_HALT

// While-loop disassembly with backpatching:
// int i = 0; while (i < 3) { i = i + 1; }
0014  OP_PUSH_INT      0         // i = 0 (slot 2)
0017  OP_LOAD_LOCAL    2 (i)     // <-- [LOOP START]
0020  OP_PUSH_INT      3
0023  OP_LT                      // Evaluate (i < 3)
0024  OP_JUMP_IF_FALSE 0041      // Target backpatched after compiling loop body!
0027  OP_LOAD_LOCAL    2 (i)
0030  OP_PUSH_INT      1
0033  OP_ADD
0034  OP_STORE_LOCAL   2 (i)
0037  OP_POP                     // Assignment is an expression; discard residual value
0038  OP_JUMP          0017      // Unconditional jump back to LOOP START
0041  ...                        // <-- [LOOP EXIT TARGET]` },
            { t: "diagram", svg: D.seq(["Caller Frame", "Operand Stack", "Callee Frame (add)"], [
              [0, 1, "PUSH 2, PUSH 3 (Arguments)", "acc"],
              [1, 2, "CALL 'add' (argc=2): BasePointer = stack.size - 2", "acc"],
              [2, 2, "slot 0 = 2, slot 1 = 3 · OP_ADD", "ok"],
              [2, 1, "OP_RETURN: pop 5, truncate stack back to BP", "dash"],
              [1, 0, "push result 5 into caller's local slot 'r'", "ok"]
            ], { colW: 220, label: "Stack Frame Transition During Function Call" }), caption: "Zero-copy argument passing: caller's pushed operands become callee's local variable slots" },
            { t: "steps", title: "Virtual Machine Execution Lifecycle", items: [
              "**1. Value Representation (`Value` Variant):** Values are stored as `std::variant<int64_t, double, bool, std::string, PointerValue, ArrayValue>`. Dynamic type verification ensures safe operations at runtime.",
              "**2. Call Frame Memory Layout:** Stack contains both local variables and evaluation temporaries. When a function is called (`OP_CALL argc`), the VM instantiates `CallFrame { size_t return_ip; size_t base_pointer; Function* fn; }`. Callee locals are indexed as `stack[base_pointer + slot_index]`.",
              "**3. Zero-Allocation Returns:** `OP_RETURN` extracts the top return value, shrinks the stack back to `base_pointer`, pops the `CallFrame`, restores the previous `base_pointer` and `ip`, and pushes the return scalar back onto the caller stack.",
              "**4. Compile-Time Optimization Safety:** Constant folding includes explicit overflow checks: for addition, checks `a > INT64_MAX - b`. Division by zero (`x / 0`) and `INT64_MIN / -1` (which triggers SIGFPE on x86) are explicitly skipped during folding so that runtime errors throw authentic runtime exceptions.",
              "**5. WebAssembly Cross-Compilation (Emscripten):** The entire C++ engine is compiled via `em++ -O3 -s WASM=1` with exported C ABI functions: `wasm_compile()`, `wasm_run()`, `wasm_debug_step()`, `wasm_get_stack()`. Monaco editor calls these functions via `Module.ccall()`, providing step-by-step bytecode execution with live memory inspection in the browser without any backend server."
            ]},
            { t: "callout", kind: "honest", title: "Authentic Limitations & Engineering Fixes", text: [
              "1. **Stale Pointer Aliasing:** Pointers are indices into the VM evaluation stack. If a pointer to a local variable outlives its function call frame, subsequent function calls can overwrite that slot, leading to silent data corruption. Fix: attach a generational counter (generation ID) to each pointer and frame.",
              "2. **Main-Thread WASM Blocking:** Bytecode execution currently runs on the browser's main UI thread. A user writing `while (true) {}` freezes the browser tab. Fix: execute WASM inside a dedicated Web Worker and enforce an execution instruction budget (e.g. max 10,000,000 opcodes per run).",
              "3. **16-bit Opcode Argument Constraint:** Jump offsets and constant pool indices are encoded as 16-bit integers (`uint16_t`), limiting single function bytecode size to 64 KiB."
            ]},
            { t: "followups", items: [
                            ["How does the VM handle recursion and stack overflow?", "Each function call creates a CallFrame and consumes evaluation stack space. To prevent host stack exhaustion, the VM maintains an explicit maximum recursion depth limit (e.g. 1,024 frames) and max stack depth (65,536 values), throwing a controlled runtime exception instead of crashing the process."],
              ["How does Emscripten bridge C++ exceptions to JavaScript in the browser?", "By default, Emscripten catches C++ exceptions via JavaScript try-catch blocks if compiled with `-fexceptions`. To maintain performance, MiniLang uses return-code error propagation for VM errors, exposing human-readable error strings across the C ABI via `Module.ccall()`."],
              ["Why choose a Stack VM over a Register VM like Lua 5.1?", "Stack-based VMs are simpler to compile for: codegen does not require register allocation algorithms (such as graph coloring or linear scan). Instructions are compact (1 byte opcode with zero register operands). However, Register VMs execute significantly fewer total instructions (roughly 30–40% fewer) because intermediate values don't need continuous push and pop cycles. For an educational language, Stack VM provides the best engineering balance."],
              ["How does the step-through debugger inspect local variables in WebAssembly?", "The VM exposes an internal introspection struct via an exported C function `wasm_get_locals()`. When paused after `wasm_debug_step()`, JavaScript calls this function to inspect memory between `base_pointer` and the current evaluation stack pointer, mapping slot indices back to identifier names using the symbol debug table generated during compilation."],
              ["What was the stale WASM bug you encountered in production?", "During initial deployment, the live Vercel web application was serving a pre-built cached `.wasm` binary that lacked the newly implemented constant folding optimizer. As a result, optimizer tests passed locally in native C++ but failed in the browser IDE. To fix this, I engineered an automated GitHub Actions CI workflow that rebuilds the WASM binary using pinned Emscripten SDK docker images on every push and verifies all 14 end-to-end tests inside Node.js."]
            ]},
            { t: "remember", items: ["60 opcodes: push/pop, local slot addressing, jump backpatching, zero-allocation call frames", "Safe constant folding avoids compile-time overflow and /0 traps", "WebAssembly exports C ABI for zero-backend client-side execution in Monaco Editor"] }
          ]
        }
      ],
      revision: {
        pitch: "MiniLang is a statically typed C++17 compiler and 60-opcode stack VM compiled to WebAssembly. Features a 13-level recursive-descent parser with panic recovery, scoped symbol tables, an AST optimizer (constant folding/propagation, DCE), and a browser Monaco IDE with a step-through debugger, verified by 14 CI end-to-end tests.",
        numbers: [["7,000+", "Lines of C++17"], ["13", "Precedence levels"], ["60", "VM opcodes"], ["14", "Automated CI tests"], ["64 KiB", "Max bytecode per function"]],
        flow: ["Lexer token stream (line/col)", "Parser (13 tiers, while-loops for left-assoc, panic recovery)", "Semantic analyzer (scoped symbol tables, strict types)", "Optimizer (overflow-safe folding, const propagation, DCE)", "Codegen (slot allocation, jump backpatching)", "Stack VM (call frames, base pointer)", "WASM (Emscripten, ccall, Monaco debugger)"],
        traps: ["Stale pointer into popped frame not caught without generational IDs", "Infinite loops in WASM block main browser thread without Web Worker isolation", "Stack VM has higher instruction dispatch overhead compared to register machines"]
      }
    },

    // ───────────────────────────── LOAD BALANCER ─────────────────────────────
    {
      id: "lb", title: "Fault-Tolerant HTTP Load Balancer (Go)", short: "Load Balancer", color: "#34d399",
      lessons: [
        {
          id: "l-design", title: "Routing, health checks, retry, backend replication",
          why: "Distributed systems interviews test load balancing algorithms, health check state machines, request idempotency, and data replication.",
          blocks: [
            { t: "resume", text: "Developed a **Go reverse-proxy load balancer** with least-connections routing, active health checks, and **retry on another backend**, in front of 3 replicated Go backends and PostgreSQL on 4 containers capped at **1 CPU / 512 MiB**." },
            { t: "diagram", svg: D.flow([["Client Traffic", "2,500 concurrent users", "acc"], ["Go Load Balancer", "least-connections · active health · retry"], ["3 Replicated Backends", "in-memory feed · batch DB writers"], ["PostgreSQL Database", "shared durable store + seq sync", "good"]], { perRow: 4, w: 170, label: "Distributed Topology" }), caption: "4 isolated Linux containers capped at 1 CPU / 512 MiB each under Docker cgroups v2" },
            { t: "words", items: [
              ["Reverse Proxy", "Intermediary server accepting public client traffic and routing requests to internal backend servers while abstracting network topology."],
              ["Least-Connections", "Routing policy dispatching requests to the backend server with the minimum number of active concurrent in-flight requests."],
              ["Power of Two Choices (P2C)", "Routing strategy picking two random backends and choosing the one with lower load; avoids thundering herd in decentralized systems."],
              ["Active Health Check", "Background daemon periodically probing `/health` endpoint with timeout thresholds; maintains state machine of server availability."],
              ["Idempotency", "A request that produces identical side-effects regardless of whether it is executed once or multiple times (e.g. `PUT`, or `POST` with deduplication keys)."],
              ["Hop-by-Hop Headers", "HTTP headers meaningful only for a single transport link (RFC 7230: `Connection`, `Keep-Alive`, `Upgrade`, `Transfer-Encoding`) that proxies must strip."]
            ]},
            { t: "table", title: "Load Balancing Algorithm Comparison Under Asymmetric Latency", head: ["Algorithm", "Time Complexity", "Behavior Under Variable Latency", "Production Failure Mode"], rows: [
              ["Round Robin", "O(1)", "Assumes identical request execution times.", "Slow backend builds massive request queue, causing cascading timeout failure."],
              ["Random", "O(1)", "Statistically uniform over millions of requests.", "High variance under bursts; can overwhelm already struggling nodes."],
              ["**Least-Connections**", "**O(N)**", "**Dynamically diverts traffic away from slow backends.**", "**Selected policy: ties broken via rotating atomic index to prevent single-node bias.**"],
              ["Power of Two (P2C)", "O(1)", "Nearly matches least-connections balance.", "Ideal for large distributed pools (N > 50); for N=3, full scan is cheaper."]
            ]},
            { t: "code", file: "loadbalancer/main.go (Core Routing Engine)", lang: "go", code: `// Least-connections routing excluding backends already attempted for this request
func (lb *LoadBalancer) selectBackendExcluding(tried map[*Backend]bool) *Backend {
    n := len(lb.backends)
    startIdx := int(lb.currIndex.Add(1)) // Rotating start index: breaks ties fairly!
    var best *Backend
    var bestLoad int64
    
    for i := 0; i < n; i++ {
        b := lb.backends[(startIdx+i)%n]
        if tried[b] { continue }
        
        load := b.InFlight.Load() // Atomic zero-mutex counter
        if !b.Alive.Load() {
            load += 1 << 20 // Heavy penalty: down nodes used only as absolute last resort
        }
        
        if best == nil || load < bestLoad {
            best, bestLoad = b, load
        }
    }
    return best
}` },
            { t: "steps", title: "Request Lifecycle & Retry State Machine", items: [
              "**1. Request Body Buffering:** Incoming request body is buffered into a reusable `sync.Pool` byte buffer (capped at 1 MiB). If body > 1 MiB, returns `413 Payload Too Large`. Buffering is mandatory to allow resending the payload if retry is required.",
              "**2. Target Selection:** `selectBackendExcluding(tried)` finds healthy node with minimum `InFlight` connections. Increments `InFlight.Add(1)` atomically.",
              "**3. Forwarding via `http.Transport`:** Executes `RoundTrip`. If backend returns connection error or HTTP 5xx AND no response headers have been sent to client, request is marked for retry.",
              "**4. Safe Retry Execution:** Backend is added to `tried` map. Loop selects next best untried backend, rewinds the buffered body reader, and re-executes.",
              "**5. Success & Header Cleanup:** Copies response headers (stripping hop-by-hop headers per RFC 7230), streams response body, and decrements `InFlight.Add(-1)` in a deferred block.",
              "**6. Exhaustion:** If all 3 backends fail, returns `502 Bad Gateway` with JSON diagnostics.",
              "**7. Active Health Daemon:** Dedicated goroutine probes `/health` every 2 seconds (timeout: 2s). 3 consecutive failures mark node `Alive = false`. A single successful probe immediately restores `Alive = true`."
            ]},
            { t: "diagram", svg: D.seq(["Client", "Load Balancer", "Backend 1 (Slow/Dead)", "Backend 2 (Healthy)"], [
              [0, 1, "POST /message (id: 98a1)", "acc"],
              [1, 2, "least-connections -> Backend 1", "dash"],
              [2, 1, "503 Service Unavailable / Connection Refused", "bad"],
              [1, 1, "No bytes sent to client yet -> mark Backend 1 tried", "warn"],
              [1, 3, "Resend buffered body -> Backend 2", "dash"],
              [3, 1, "200 OK (id deduplicated via ON CONFLICT)", "ok"],
              [1, 0, "HTTP 200 OK to Client", "ok"]
            ], { colW: 175, label: "Fault-Tolerant Retry Lifecycle" }), caption: "Retry guarantees zero duplicate processing through backend database idempotency keys" },
            { t: "callout", kind: "honest", title: "Distributed Systems Trade-offs & Vulnerabilities", text: [
              "1. **Single Point of Failure (SPOF):** The load balancer is a single Go process. In enterprise production, two LB nodes should run with a shared floating Virtual IP using VRRP (Keepalived) or AWS ALB.",
              "2. **Acknowledge-Before-Commit:** Backends accept writes into in-memory queue and acknowledge client before PostgreSQL transaction commits to maximize write throughput. If a container crashes, in-flight messages in memory are lost. Production requires WAL durability.",
              "3. **Throughput Ceiling:** Adding backends 1 -> 3 showed flat throughput (~500 req/s) because the single-threaded CPU budget on the LB container became the bottleneck."
            ]},
            { t: "followups", items: [
                            ["What happens if all 3 backends fail health checks simultaneously?", "Instead of dropping all incoming traffic with instant 502 errors, our least-connections algorithm applies a large additive penalty (`+2^20`) to down backends rather than excluding them. If all backends are marked dead (e.g. during a transient health probe failure), the load balancer still attempts routing as a graceful degradation fallback."],
              ["Why must hop-by-hop headers be stripped by a reverse proxy?", "RFC 7230 specifies that headers like `Connection`, `Keep-Alive`, `Proxy-Authenticate`, and `Transfer-Encoding` govern the transport connection between client and proxy. Forwarding them to upstream backends causes protocol desynchronization, connection hangs, and potential HTTP request smuggling vulnerabilities."],
              ["Why is least-connections superior to round-robin for this workload?", "In a chat application, `GET /feed` requests complete in ~2 ms while `POST /message` requests perform cryptographic verification, deduplication, and database writes taking ~25 ms. Round-robin blindly assigns equal requests, causing nodes handling write bursts to accumulate backlogs. Least-connections monitors real-time in-flight requests, automatically routing new traffic to nodes with spare processing capacity."],
              ["How does the backend guarantee idempotency during retries?", "Every message has a client-generated UUID. Backend inserts use PostgreSQL `INSERT INTO messages (id, body) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`. If a retried request hits a second backend, PostgreSQL ignores the duplicate, ensuring zero double-insertion."],
              ["Why assign down backends a penalty (+2^20) instead of removing them from the array?", "If a temporary network glitch causes the health check daemon to mark all 3 backends down simultaneously, a strict exclusion policy would cause the load balancer to drop 100% of incoming traffic immediately. By applying a large penalty rather than exclusion, the load balancer still attempts routing as a desperate fallback if all nodes are marked down."]
            ]},
            { t: "remember", items: ["Atomic InFlight counter + rotating tie-breaker scan", "Retry allowed strictly before response bytes reach client", "Buffered body up to 1 MiB in sync.Pool", "Down nodes penalized (+2^20) but retained as emergency fallback"] }
          ]
        },

        {
          id: "l-oom", title: "OOM debugging story + Go memory concepts",
          why: "Ye software engineering interviews ki gold standard debugging story hai: Linux kernel cgroups, memory profiling, Go runtime GC tuning, aur load benchmarking.",
          blocks: [
            { t: "resume", text: "Traced an **18% error rate** to **OOM kills** (cgroup memory events); cut memory via snapshot caching, `sync.Pool` buffers, and GOMEMLIMIT/GOGC tuning: **0 errors over 60,000 requests** at up to **2,500 concurrent users**." },
            { t: "words", items: [
              ["cgroups v2 (Control Groups)", "Linux kernel mechanism that isolates and limits resource usage (CPU, memory, disk I/O, network) for process hierarchies."],
              ["oom_kill", "Linux kernel Out-Of-Memory Killer event. When `memory.current > memory.max`, the kernel terminates the highest `oom_score` process with SIGKILL (exit code 137)."],
              ["GOMEMLIMIT (Go 1.19+)", "Soft memory limit informing the Go runtime memory scavenger to trigger garbage collection aggressively as total usage approaches the container budget."],
              ["GOGC", "Target heap growth percentage between collections: `NextGC = LiveHeap * (1 + GOGC/100)`. Default is 100."],
              ["sync.Pool", "Concurrent object cache in Go runtime that reduces allocation churn and memory fragmentation by recycling allocated byte buffers."],
              ["Kernel Socket Buffers", "TCP receive (`rmem`) and transmit (`wmem`) buffers allocated by the Linux kernel per open connection, charged directly to the container's cgroup memory."]
            ]},
            { t: "table", title: "Linux Kernel Memory Accounting (Inside 512 MiB Container)", head: ["Memory Subsystem", "Typical Allocation Under Load", "Visibility to Go Profiler (pprof)", "Kernel Accounting Role"], rows: [
              ["Go Active Heap", "150 – 250 MiB", "Visible via pprof / runtime.ReadMemStats", "Allocated by Go runtime TCMalloc-style allocator for live objects."],
              ["Go Retained Heap", "100 – 150 MiB", "Partially visible (Alloc vs Sys)", "Memory returned to Go runtime by GC but not yet returned to OS kernel (scavenged)."],
              ["TCP Socket Buffers", "80 – 120 MiB (at 2,500 conns)", "Completely INVISIBLE to Go heap profiler!", "Kernel network stack allocates buffer space per TCP socket; charged to cgroup!"],
              ["Linux Page Cache", "30 – 50 MiB", "Invisible to Go runtime", "Cached file system blocks and shared libraries."],
              ["**Total Memory**", "**Exceeded 512 MiB -> Triggered oom_kill**", "Kernel event in memory.events", "Kernel kills Go process instantly with SIGKILL."]
            ]},
            { t: "steps", title: "Incident Response Playbook: How the Bug was Uncovered", items: [
              "**1. Symptom Recognition:** Graded load test ramping to 2,500 users showed ~18% failed requests. However, successful requests completed with fast sub-10ms response times, and there were zero HTTP timeouts.",
              "**2. Root Cause Deduction:** If backends were bottlenecked by CPU or disk, latency would increase and client requests would timeout (504). Instant errors with zero latency meant **Connection Refused (ECONNREFUSED)**: the server listening port was closed because the process was dead.",
              "**3. Kernel Proof:** Checked Linux cgroup statistics: `cat /sys/fs/cgroup/memory.events` revealed **oom_kill 121**. The container was exceeding its 512 MiB limit and the Linux kernel was killing the load balancer.",
              "**4. Why the Bug Remained Masked:** The process supervisor script had a `sleep 1` loop before restarting the dead binary. During that 1-second window, all incoming connections were refused. Backends rebuilt feed state from Postgres upon boot, so post-test data integrity checks passed 100%, masking the crash.",
              "**5. The Memory Fixes:**",
              "   - (a) **sync.Pool Body Buffering:** Eliminated per-request `io.ReadAll` allocations for 1 MiB bodies, reducing heap garbage rate by 70%.",
              "   - (b) **Tuning GOMEMLIMIT & GOGC:** Set `GOMEMLIMIT=450MiB` and `GOGC=50`. This instructed Go's GC pacer to collect aggressively when approaching container limits.",
              "   - (c) **Reducing Socket Buffer Limits:** Tuned connection pool sizes from 3x600 @ 8 KiB down to 3x512 @ 4 KiB, reclaiming ~17 MiB of kernel memory.",
              "   - (d) **Snapshot Caching on Backends:** Replaced full-table lock copies on `/feed` with atomic pointer swapping of immutable pre-rendered JSON buffers.",
              "   - (e) **Supervisor Tuning:** Cut restart delay from 1,000 ms down to 50 ms.",
              "**6. Verification:** Executed two back-to-back graded load tests: **0 errors over 60,000 requests** up to 2,500 users; peak memory stabilized at **364 MiB of 512 MiB**; zero new OOM kills."
            ]},
            { t: "code", file: "loadbalancer/buffer_pool.go (sync.Pool Implementation)", lang: "go", code: `var bufferPool = sync.Pool{
    New: func() interface{} {
        // Pre-allocate 64 KiB buffer, capable of dynamic growth up to 1 MiB
        b := make([]byte, 0, 64*1024)
        return &b
    },
}

func readRequestBody(r *http.Request) ([]byte, error) {
    bufPtr := bufferPool.Get().(*[]byte)
    buf := (*bufPtr)[:0] // Reset slice length while keeping underlying capacity
    
    // Read up to 1 MiB + 1 byte to detect overflow
    limitedReader := io.LimitReader(r.Body, 1024*1024 + 1)
    bytesRead, err := io.ReadAll(limitedReader)
    if err != nil {
        bufferPool.Put(bufPtr)
        return nil, err
    }
    if len(bytesRead) > 1024*1024 {
        bufferPool.Put(bufPtr)
        return nil, ErrPayloadTooLarge
    }
    
    // Clean return to pool deferred after request forwarding completes
    return bytesRead, nil
}` },
            { t: "say", length: "60 seconds", text: "Under graded load tests ramping to 2,500 concurrent users, our Go load balancer suffered an 18% request failure rate. Yet, successful requests had sub-10ms response times and there were zero timeouts. This signature pointed to connection refusals rather than saturation. Inspecting Linux cgroups via `/sys/fs/cgroup/memory.events` revealed 121 OOM kill events. The Go garbage collector was unaware of the 512 MiB container constraint, and incoming connection bursts created garbage faster than the default GC reclaimed it, while kernel socket buffers pushed total memory over the limit. I re-architected memory usage: implementing `sync.Pool` for request body buffers, tuning `GOMEMLIMIT=450MiB` and `GOGC=50`, shrinking outbound connection pools, and caching feed snapshots. In subsequent validation runs, the system achieved zero errors across 60,000 requests up to 2,500 users, with peak memory settling at 364 MiB." },
            { t: "followups", items: [
                            ["What is the difference between resident set size (RSS) and virtual memory (VIRT)?", "VIRT is the total address space mapped by the process, including shared libraries and allocated but uncommitted memory. RSS is the actual physical RAM pages mapped into the process. Linux cgroup memory accounting tracks RSS plus kernel buffers and active page cache; VIRT does not trigger OOM kills, but exceeding 512 MiB RSS does."],
              ["How does Go's memory scavenger return memory to the OS kernel?", "When Go's GC frees heap memory, it marks the pages as idle. In modern Go (1.16+), the runtime uses `MADV_DONTNEED` (or `MADV_FREE`) syscalls to inform the Linux kernel that the physical RAM can be reclaimed, lowering the process's RSS footprint within the container cgroup."],
              ["Why didn't the default Go Garbage Collector prevent the OOM kill?", "By default, Go GC runs relative to the live heap via `GOGC=100`, meaning it triggers only after the live heap doubles. Under rapid traffic spikes, heap allocations outpace GC pacing. Furthermore, the Go runtime only monitors heap memory; it cannot see kernel socket buffers or page caches, which are counted against the cgroup's 512 MiB ceiling. Setting `GOMEMLIMIT` establishes a global memory target, compelling the runtime to scavenge memory aggressively before kernel limits are breached."],
              ["What is the latency trade-off of setting GOGC=50?", "Lowering GOGC from 100 to 50 causes the GC to run twice as frequently, consuming roughly 15-20% more CPU cycles. In our 1-CPU container, this increased median request latency slightly from 4.2 ms to 6.1 ms. However, this was an acceptable trade-off because it completely prevented catastrophic process termination and dropped errors from 18% to 0%."],
              ["Why couldn't you reproduce this bug on your local MacBook / development machine?", "Development machines have 16+ GiB of RAM with no cgroup limits enabled. When the Go process briefly spiked to 700 MiB during local tests, the OS effortlessly satisfied the allocation. The bug was an emergent property of the 512 MiB Linux cgroup constraint, proving that performance testing must occur in production-identical resource-constrained environments."]
            ]},
            { t: "remember", items: ["Clustered errors + zero timeouts = ECONNREFUSED from dead process", "cgroups v2 memory.events showed 121 oom_kill events", "sync.Pool + GOMEMLIMIT=450MiB + GOGC=50 stabilized memory at 364/512 MiB", "Result: 0 errors across 60,000 requests up to 2,500 users"] }
          ]
        }
      ],
      revision: {
        pitch: "Built a fault-tolerant Go reverse-proxy load balancer with least-connections routing, active health checks, and retry on untried backends across 4 containers capped at 1 CPU / 512 MiB each. Traced an 18% error rate to Linux cgroup OOM kills, resolving it with sync.Pool buffers, GOMEMLIMIT tuning, and snapshot caching to achieve 0 errors over 60,000 requests at 2,500 users.",
        numbers: [["18% -> 0%", "Error rate reduction"], ["60,000", "Total requests benchmarked"], ["2,500", "Concurrent users sustained"], ["121", "OOM kill events detected in cgroups"], ["364 / 512 MiB", "Peak memory after optimization"], ["450 MiB", "GOMEMLIMIT soft cap"], ["1 MiB", "Max body buffer size"]],
        flow: ["Topology: 4 containers @ 1 CPU / 512 MiB", "Algorithm: Least-connections with atomic InFlight counters", "Health check: 2s probe, 3 failures down", "Failure debugging: connection refused -> memory.events -> 121 OOM kills", "Remediation: sync.Pool, GOMEMLIMIT, socket buffer tuning, snapshot caching", "Validation: 0 / 60,000 errors"],
        traps: ["Acknowledge-before-commit risks losing in-flight queue items on crash", "Single load balancer instance is a SPOF without VRRP / Keepalived", "UNLOGGED tables skip WAL for benchmark speed but sacrifice crash recovery"]
      }
    },

    // ───────────────────────────── ALGORACE ─────────────────────────────
    {
      id: "algorace", title: "AlgoRace · Real-Time Coding Race", short: "AlgoRace", color: "#fb923c",
      lessons: [
        {
          id: "a-arch", title: "Architecture, API, auth, real-time, matchmaking",
          why: "Full-stack interviews me contract-first API design, WebSocket scalability, distributed state, aur concurrency bugs test hote hain.",
          blocks: [
            { t: "resume", text: "Built a 1v1 coding race platform with **102 problems and 1,020 test cases**: players are paired by **ELO rating**, race on the same problem, and see live opponent progress over **Socket.IO** rooms. Architected **30 REST endpoints** from an **OpenAPI** spec with generated type-safe React Query hooks and Zod validators; secured with **JWT**, bcrypt, and rate limiting." },
            { t: "diagram", svg: D.flow([["React 18 + Vite", "Vercel · Monaco Code Editor", "acc"], ["Express API Gateway", "Render · REST + Socket.IO Server"], ["PostgreSQL Database", "Drizzle ORM · Supabase Storage", "good"], ["Wandbox Sandbox", "Ephemeral C++/Java Execution", "warn"]], { perRow: 4, w: 170, label: "AlgoRace Architecture" }), caption: "Contract-first monorepo: OpenAPI specification drives automated client hooks and backend schema validation" },
            { t: "words", items: [
              ["Contract-First Design", "Defining API specifications (openapi.yaml) prior to coding, serving as the single source of truth for clients and servers."],
              ["Orval", "Code generator that compiles OpenAPI specifications into fully typed TanStack React Query hooks and Zod runtime validators."],
              ["JWT (JSON Web Token)", "Stateless authentication token consisting of Header, Payload, and Signature verified via HMAC-SHA256."],
              ["Socket.IO Rooms", "Server-side socket grouping primitive enabling targeted event broadcasts (e.g. `match:<match_id>`)."],
              ["Matchmaking Queue", "In-memory sorted priority structure pairing users based on minimal ELO rating discrepancy."],
              ["Wandbox API", "Remote sandbox service compiling and executing arbitrary C++ and Java code inside secure isolated disposable containers."]
            ]},
            { t: "steps", title: "Matchmaking & Real-Time Race Flow", items: [
              "**1. Authentication & Security:** User logs in -> password verified via `bcrypt` (work factor: 12) -> signs JWT containing `userId` and `elo` -> stored in client `localStorage`. Express routes protected by JWT middleware and rate limited (10 requests/minute on auth and submission endpoints).",
              "**2. WebSocket Handshake:** Client initiates Socket.IO connection. Handshake auth middleware verifies JWT token. Upon validation, socket automatically joins personalized notification room `user:<userId>`.",
              "**3. Matchmaking Queue (`POST /matchmaking/join`):** User enters in-memory queue. Algorithm sorts queued players by ELO and selects the adjacent pair with the minimum absolute rating difference: `min |ELO_A - ELO_B|`. Sorting guarantees that the closest ELO pair is always adjacent in $O(N \\log N)$ time.",
              "**4. Match Creation:** Server randomly samples a problem from PostgreSQL (`ORDER BY random() LIMIT 1`), inserts records into `matches` and `match_players`, and emits `queue:matched` to both participants' private user rooms.",
              "**5. Room Joining & Live Progress:** Players enter the match page and emit `match:join`. Server validates participation and subscribes sockets to `match:<matchId>`. Whenever a player submits code, evaluation results are broadcast as `match:progress` (e.g. `testsPassed: 7/10`), updating the opponent's progress bar in real time.",
              "**6. Honest Clarification:** The global leaderboard is rendered via standard REST endpoint polling (`GET /leaderboard`), NOT WebSockets. Only in-match race events use real-time sockets."
            ]},
            { t: "code", file: "services/matchmaking.ts (Closest ELO Pair Algorithm)", lang: "ts", code: `interface QueueEntry {
    userId: string;
    socketId: string;
    elo: number;
    joinedAt: number;
}

// O(N log N) closest pair matchmaking algorithm
function findBestMatch(queue: QueueEntry[]): [QueueEntry, QueueEntry] | null {
    if (queue.length < 2) return null;
    
    // Sort queue by ELO rating
    const sorted = [...queue].sort((a, b) => a.elo - b.elo);
    let minDiff = Infinity;
    let bestIndex = 0;
    
    // Closest pair in 1D is guaranteed to be adjacent in sorted order
    for (let i = 0; i < sorted.length - 1; i++) {
        const diff = Math.abs(sorted[i].elo - sorted[i + 1].elo);
        if (diff < minDiff) {
            minDiff = diff;
            bestIndex = i;
        }
    }
    
    return [sorted[bestIndex], sorted[bestIndex + 1]];
}` },
            { t: "callout", kind: "honest", title: "Horizontal Scaling Bottlenecks (Interview Defense)", text: [
              "1. **In-Memory Queue Limitation:** The matchmaking queue and disconnect timers currently reside in single-process memory. If the Node.js server scales to multiple instances, users connected to Server 1 cannot match with users on Server 2. Fix: migrate matchmaking queue to a **Redis Sorted Set (ZSET)** using ELO as score, and distribute socket events via **Redis Pub/Sub Adapter** with sticky sessions.",
              "2. **Leaderboard Architecture:** Leaderboard is computed via SQL queries on PostgreSQL. Under heavy traffic, caching top 100 players in Redis with 30-second TTL is necessary to avoid database read exhaustion."
            ]},
            { t: "followups", items: [
                            ["How would you scale AlgoRace's Socket.IO server to multiple instances?", "Socket.IO instances are stateful. To scale horizontally: (1) attach a Redis Pub/Sub adapter (`@socket.io/redis-adapter`) so events emitted on one node broadcast across all cluster nodes; (2) configure an NGINX / Cloudflare load balancer with sticky sessions (`ip_hash` or cookie-based affinity) to route WebSocket upgrade handshakes to the same instance."],
              ["Why use bcrypt over standard PBKDF2 or Argon2 for user passwords?", "bcrypt is specifically designed for password hashing, with built-in salt generation and a configurable work factor (we set cost=12). Cost 12 takes ~250 ms per verification, which is fast for interactive login but makes offline brute force of stolen hashes computationally prohibitive."],
              ["Why use contract-first OpenAPI instead of writing tRPC?", "tRPC tightly couples frontend and backend into a single TypeScript monorepo. OpenAPI is language-agnostic: if we rewrite our grading backend in Go or expose public APIs to third parties, the OpenAPI contract remains universal. Furthermore, tools like Orval automatically generate typed TanStack React Query hooks, query keys, and Zod validation schemas directly from `openapi.yaml`."],
              ["How do you handle client disconnections during an active race?", "When a player's socket disconnects, the server does not forfeit them immediately. It initiates a **10-second reconnect grace timer**. If the player reconnects within 10 seconds, the timer is cleared and race state is restored. If the timer expires, the match is marked as forfeited, and the remaining player is awarded the win."],
              ["How are test cases kept secure from client inspection?", "Clients only receive sample test cases (the first 2 visible cases) for local debugging. The remaining 8 hidden evaluation test cases reside strictly on the server database. When a submission is triggered, the server constructs the test harness with hidden inputs and dispatches it directly to Wandbox. The client only receives boolean pass/fail status and execution time."]
            ]},
            { t: "remember", items: ["OpenAPI contract-first drives Orval React Query hooks and Zod schemas", "Matchmaking: adjacent pair scan in sorted ELO array in O(N log N)", "10-second disconnect grace period prevents instant accidental forfeits", "Leaderboard is REST; WebSockets are reserved for match rooms"] }
          ]
        },

        {
          id: "a-grade", title: "Grading harness, single-winner transaction, ELO",
          why: "Concurrency bugs and database transactions are top interview topics: race condition me dono players winner declare ho sakte hain agar atomic locking na ho.",
          blocks: [
            { t: "resume", text: "Automated grading with generated C++/Java test harnesses (Wandbox API); settled wins and ELO changes in **one database transaction** that permits a single winner, with a 10-second reconnect grace before forfeit; deployed on Vercel and Render." },
            { t: "words", items: [
              ["Atomic Transaction", "Database operation obeying ACID properties: either all modifications succeed or all are rolled back upon failure."],
              ["Race Condition", "Flaw where system output depends unpredictably on the execution sequence or timing of concurrent threads."],
              ["Check-Then-Act Flaw", "Anti-pattern where a program checks a condition (e.g. `if (winner_id == null)`) and then acts (`UPDATE`), allowing concurrent threads to slip between check and act."],
              ["ELO Rating System", "Zero-sum competitive rating method where score changes depend on expected outcome vs actual match performance."],
              ["Test Harness", "Server-generated wrapper script that bundles user code with hidden test inputs, asserts outputs, and captures execution time and memory."]
            ]},
            { t: "table", title: "Database Concurrency Handling: The Single-Winner Problem", head: ["Approach", "Concurrency Flaw / Mechanism", "Database Impact", "Production Verdict"], rows: [
              ["Naive App Check", "App queries `SELECT winner_id`. If null, runs `UPDATE`.", "Both concurrent requests read null before either writes -> **TWO WINNERS CREATED!**", "Unacceptable (Data Corruption)"],
              ["Pessimistic Lock", "`SELECT winner_id FROM matches FOR UPDATE`", "Acquires exclusive row lock. Works, but risks deadlocks and holds lock across network calls.", "Acceptable but slower"],
              ["**Atomic UPDATE**", "**UPDATE matches SET winner_id = $1 WHERE id = $2 AND winner_id IS NULL**", "**PostgreSQL row-level lock ensures exactly ONE transaction updates row (rowsAffected = 1); concurrent runner gets 0!**", "**Gold Standard Selected Policy**"]
            ]},
            { t: "code", file: "services/grading.ts (Atomic Winner Settlement)", lang: "ts", code: `// Database transaction settling match victory atomically
export async function settleMatchWin(matchId: string, winnerId: string, loserId: string) {
    return await db.transaction(async (tx) => {
        // Atomic conditional update: exactly ONE execution can succeed
        const result = await tx
            .update(matches)
            .set({
                winnerId: winnerId,
                status: 'completed',
                endedAt: new Date()
            })
            .where(and(eq(matches.id, matchId), isNull(matches.winnerId)))
            .returning();
            
        // If rowsAffected is 0, the opponent already claimed victory a millisecond earlier!
        if (result.length === 0) {
            return { won: false, reason: 'Opponent finished first' };
        }
        
        // Calculate new ELO ratings using standard zero-sum formula
        const [winner, loser] = await Promise.all([
            tx.query.users.findFirst({ where: eq(users.id, winnerId) }),
            tx.query.users.findFirst({ where: eq(users.id, loserId) })
        ]);
        
        const { winnerDelta, loserDelta } = calculateEloDelta(winner.elo, loser.elo);
        
        await tx.update(users).set({ elo: winner.elo + winnerDelta }).where(eq(users.id, winnerId));
        await tx.update(users).set({ elo: loser.elo + loserDelta }).where(eq(users.id, loserId));
        
        return { won: true, winnerDelta, loserDelta };
    });
}` },
            { t: "callout", kind: "tip", title: "ELO Rating Formula Derivation & Invariants", text: [
              "**Expected Score Equation:** `E_A = 1 / (1 + 10^{(R_B - R_A) / 400})`",
              "If Player A (1600 ELO) plays Player B (1200 ELO): `ΔR = -400 -> E_A = 1 / (1 + 10^{-1}) = 1 / 1.1 ≈ 0.909` (91% expected win probability).",
              "**Rating Adjustment:** `R'_A = R_A + K · (S_A - E_A)`, where `K = 32` and `S_A = 1` for win, `0` for loss.",
              "**Mathematical Invariant (Zero-Sum):** `E_A + E_B = 1.0` always. Consequently, `ΔR_A + ΔR_B = K(S_A - E_A) + K(S_B - E_B) = K[(S_A + S_B) - (E_A + E_B)] = K[1 - 1] = 0`. Points gained by winner exactly equal points lost by loser!"
            ]},
            { t: "steps", title: "Automated Test Harness Execution Pipeline", items: [
              "**1. Code Ingestion:** User submits solution via Monaco Editor (`POST /matches/:id/submit`).",
              "**2. Test Harness Synthesis:** Backend injects user function into an ephemeral driver script. The driver executes 10 test cases in memory, redirecting stdout/stderr and tracking microsecond execution time.",
              "**3. Sandbox Dispatch:** Driver payload is dispatched via HTTPS to Wandbox execution API (`https://wandbox.org/api/compile.json`).",
              "**4. Sandbox Isolation Parameters:** Wandbox compiles in an isolated sandbox with compiler flags (e.g. `-O3 -std=c++17`), enforcing 5-second CPU timeout and 256 MiB memory cap to prevent infinite loops or memory bombs.",
              "**5. Output Parsing:** Backend parses stdout: validates matching outputs. If all 10 pass, invokes `settleMatchWin()` inside atomic database transaction.",
              "**6. Broadcast:** Emits `match:ended` with winner username and ELO deltas to the Socket.IO match room."
            ]},
            { t: "followups", items: [
                            ["How do you prevent code injection and container escapes in Wandbox execution?", "User code is never executed on our application server. We dispatch it to Wandbox's isolated API, which runs the code inside ephemeral containers with dropped Linux capabilities (`CAP_SYS_ADMIN`), read-only root filesystems, strict `seccomp` system call filtering, 5-second CPU time limits, and 256 MiB memory caps."],
              ["Why is the ELO K-factor set to 32?", "In competitive ranking systems, K determines rating volatility. A higher K (e.g. 64) causes wild swings from single match wins, while a lower K (e.g. 16) requires hundreds of matches to calibrate. K = 32 is the standard chess/competitive gaming standard for rapid calibration of new players while maintaining rating stability."],
              ["What happens if both players submit 100% correct code within 5 milliseconds of each other?", "This is a classic concurrent race condition. Both grading jobs complete and invoke `settleMatchWin()`. The first transaction to reach PostgreSQL acquires the row lock on `matches` row and executes `UPDATE ... WHERE winner_id IS NULL`. It succeeds and returns 1 row. The second transaction attempts the same query, but because `winner_id` is now populated, the `WHERE winner_id IS NULL` clause evaluates to false. It receives 0 affected rows, identifies that it lost the race, and returns gracefully without corrupting ELO."],
              ["Why did you use Wandbox API instead of running Docker containers locally on Render?", "Running untrusted user code on the application server poses severe container breakout and resource exhaustion vulnerabilities (fork bombs, CPU starvation). On free/low-tier hosting like Render, running Docker-in-Docker is unsupported. Wandbox provides an isolated, hardened, remote execution infrastructure without managing our own Kubernetes sandbox cluster."]
            ]},
            { t: "remember", items: ["Atomic UPDATE with WHERE winner_id IS NULL prevents check-then-act race condition", "ELO is zero-sum: points gained by winner strictly equal points lost by loser (K=32)", "Wandbox sandbox executes untrusted code with CPU and memory resource limits"] }
          ]
        }
      ],
      revision: {
        pitch: "AlgoRace is a real-time 1v1 coding race platform with 102 problems and 1,020 test cases. Architected with contract-first OpenAPI, Orval-generated React Query hooks, and Socket.IO rooms. Solved the concurrent winner race condition via an atomic PostgreSQL UPDATE transaction with WHERE winner_id IS NULL, automated grading via Wandbox API, and implemented an ELO matchmaking system.",
        numbers: [["102", "Competitive coding problems"], ["1,020", "Curated test cases"], ["30", "REST endpoints"], ["K = 32", "ELO scale factor"], ["10s", "Disconnect reconnect grace timer"], ["5s / 256MB", "Wandbox execution sandbox limits"]],
        flow: ["Auth (JWT + bcrypt)", "Matchmaking (O(N log N) adjacent scan in sorted ELO array)", "Socket room join (match:id)", "Live race updates (match:progress)", "Wandbox grading harness", "Atomic win settlement (WHERE winner_id IS NULL)", "Zero-sum ELO calculation"],
        traps: ["Single-process in-memory queue cannot scale horizontally across servers without Redis", "Check-then-act winner verification fails under concurrency; atomic UPDATE is mandatory", "Remote Wandbox dependency introduces external latency for code execution"]
      }
    }
  ]
};
