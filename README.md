# Projects Lab

**Live Site:** https://projects-lab-roan.vercel.app

Hinglish interview prep site dedicated to every bullet point under **Projects** on my résumé. Includes 60-second pitches, architecture diagrams, deep dives, tough follow-ups, and spaced-repetition flashcards.

## What's Inside

1. **MiniLang: Compiler, Bytecode VM & Browser IDE**
   - **Frontend & Parsing:** 7,000+ lines C++17, recursive-descent parser with 13 precedence levels, panic-mode error recovery (`synchronize`), scoped symbol tables, strict type checking.
   - **Optimizer & Backend:** AST-level constant folding, constant propagation, dead code elimination (`if (false)` pruning), bytecode emitter with 60 opcodes.
   - **Virtual Machine & WASM:** Stack-based virtual machine with call frames, compiled to WebAssembly via Emscripten, integrated with Monaco Editor and step-through debugger, 14 E2E tests in GitHub Actions CI.

2. **Fault-Tolerant HTTP Load Balancer (Go)**
   - **Reverse Proxy Architecture:** Least-connections routing with rotating tie-breaker, active health checks (probe every 2s, mark down on 3 consecutive failures), automatic request retry on an untried healthy backend.
   - **OOM Root Cause Analysis:** Under 2,500 concurrent users on 4 resource-constrained containers (1 CPU / 512 MiB), an 18% error rate was traced to Linux kernel cgroup OOM-kills.
   - **Memory Tuning & Optimization:** Snapshot caching, buffer pooling via `sync.Pool`, and `GOMEMLIMIT`/`GOGC` tuning achieving **0 errors over 60,000 requests**.

3. **AlgoRace: Real-Time 1v1 Coding Race Platform**
   - **System Architecture:** 102 problems, 1,020 test cases, OpenAPI contract-first design with Orval-generated React Query hooks and Zod runtime schema validation.
   - **Real-Time & Security:** Socket.IO rooms for race state and opponent progress, JWT authentication with bcrypt password hashing and rate limiting.
   - **Grading & Race Condition Settlement:** Generated test harnesses executed via Wandbox API. Single-winner race condition resolved via atomic PostgreSQL transaction with `WHERE winner_id IS NULL`, with a 10-second reconnect grace period before forfeit.

## How to Run

- Open `index.html` in any modern web browser. Zero build step, zero dependencies.
- Progress (completed lessons, flashcard spaced repetition intervals, mock scores) is persisted in browser `localStorage`.
