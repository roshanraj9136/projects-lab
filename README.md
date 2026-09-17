# Projects Lab

**Live:** https://projects-lab-roan.vercel.app

Hinglish interview prep for the **Projects** section of my résumé, in the same format as Interview Lab: step-by-step lessons (Naye words → steps with diagrams and code → "Interview me bolo" → Yaad rakho → Khud check karo) and spaced-repetition flashcards.

## Topics

**MiniLang — compiler, bytecode VM and browser IDE**
1. Compiler basics, lexer, recursive-descent parser, AST, panic-mode recovery
2. Semantic analysis (scopes, type rules) and the optimizer (safe folding, propagation, DCE) with real bytecode
3. Bytecode format, jumps and backpatching, the VM, call frames, pointers and arrays, WebAssembly IDE, tests, limitations

**Fault-tolerant HTTP load balancer (Go)**
1. Networking and load-balancing basics, reverse proxies, Go concurrency
2. Code deep dive: request lifecycle, least-connections selection, health checks, retry safety, backend write path, replication
3. The OOM investigation (cgroups, Go GC, fixes, verification), benchmarks and scaling questions

**AlgoRace — real-time coding race**
1. Architecture, contract-first OpenAPI, Drizzle schema, authentication and authorization
2. Socket.IO real-time flow, matchmaking and its race conditions, the grading harness and cheating risks
3. Transactions and the single-winner update, ELO math, disconnect handling, reliability fixes, scaling

Every number and code excerpt comes from the project repositories, their READMEs and the live builds.

## Build

Content lives in `src/topics/*.js` and `src/diagrams.js`; `src/base.html` is the Interview Lab template.

```bash
node build.js   # writes index.html
```

Progress is stored in the browser's localStorage.
