TOPICS.push({
id:'ar-basics', name:'AlgoRace 1 · Architecture, OpenAPI contract, database, auth', group:'AlgoRace · Real-Time Coding Race Platform', tier:'crit',
intro:`Resume: "Built a 1v1 coding race platform with 102 problems and 1,020 test cases... Architected 30 REST endpoints from an OpenAPI spec with generated type-safe React Query hooks and Zod validators; secured with JWT, bcrypt, and rate limiting; PostgreSQL schema via Drizzle ORM." Full-stack interviewer yahan architecture, REST, type safety, schema, aur auth ke basics se deep tak jaata hai.`,
lessons:[
{
h:`Project ek nazar me + 60 second story`,
words:[
[`1v1 race`,`Do players same problem, jo pehle saare tests pass kare woh jeete.`],
[`ELO`,`Chess wala rating system — jeetne/haarne pe rating badalti hai.`],
[`Socket.IO`,`Real-time events library (WebSocket ke upar).`],
[`Monorepo`,`Ek repo me frontend, backend, shared libraries.`]
],
steps:[
{t:`User flow`, b:`<ol><li>Signup/login.</li><li>Lobby: <strong>Quick match</strong> (ELO se opponent) ya friend ko <strong>challenge</strong> / invite code.</li><li>Race page: problem + <strong>Monaco</strong> editor (C++ ya Java).</li><li>Submit → server tests chalata → opponent ko live <strong>"7/10 tests passed"</strong> dikhta.</li><li>Pehla jo sab pass kare → winner, ELO update, history.</li><li>Practice mode: problem ke pehle 3 test cases pe run.</li><li>Leaderboard, profile, ELO history, friends.</li></ol>`},
{t:`Architecture`, d:`arArch`},
{t:`Numbers`, b:`<div class="tbl-wrap"><table><tr><th>Number</th><th>Kya</th></tr><tr><td>102</td><td>problems</td></tr><tr><td>1,020</td><td>test cases (average 10 per problem)</td></tr><tr><td>30</td><td>REST endpoints (OpenAPI operationIds)</td></tr><tr><td>K = 32, start 1200</td><td>ELO</td></tr><tr><td>10 s</td><td>reconnect grace before forfeit</td></tr></table></div>`},
{t:`Kya claim NAHI karna`, b:`<p>"real-time leaderboard" (leaderboard REST hai), "50+ concurrent users", "sub-100ms", "99.5% uptime", "CI/CD" (is repo me CI nahi), "own sandbox" (code Wandbox API pe chalta) — ye measured/true nahi. Pooche to: "I haven't load-tested it; here's how I would."</p>`}
],
say:`AlgoRace is a real-time one-versus-one coding race. Players are matched by ELO rating or challenge a friend, solve the same problem in a Monaco editor in C++ or Java, and see each other's test progress live over Socket.IO; the first to pass every test wins and both ratings update. It has 102 problems with 1,020 test cases. The React frontend is on Vercel and an Express API with Socket.IO is on Render, backed by PostgreSQL through Drizzle; code runs through generated test harnesses on the Wandbox API. The API is contract-first — 30 endpoints defined in OpenAPI with generated React Query hooks and Zod validators — and wins are settled in a single database transaction that allows only one winner.`,
hook:`Match (ELO/friend) → same problem → live progress (Socket.IO) → first all-pass wins → ELO. 102 · 1,020 · 30.`,
check:[
[`Leaderboard real-time hai?`,`Nahi, REST. Sirf match events sockets pe.`],
[`Code kahan execute hota hai?`,`Wandbox API pe (apna sandbox nahi).`]
]
},
{
h:`REST + OpenAPI contract-first + Orval + React Query + Zod`,
words:[
[`REST`,`Resources + HTTP methods: GET /problems, POST /submissions.`],
[`OpenAPI`,`API ka machine-readable spec (YAML): paths, params, request/response schemas.`],
[`Contract-first`,`Pehle spec likho, code usse generate/validate.`],
[`Orval`,`OpenAPI se TypeScript client code generator.`],
[`React Query`,`Server data fetch + cache + refetch + mutations ki library.`],
[`Zod`,`Runtime schema validation library (TypeScript types bhi).`]
],
steps:[
{t:`Flow`, d:`contract`},
{t:`Kyun contract-first`, b:`<p>Bina contract: backend ne field <code>eloChange</code> ka naam badla, frontend <code>undefined</code> padhta rahega — bug production me pata chalega. Contract-first: spec badlo → Orval regenerate → frontend <strong>TypeScript compile error</strong>. Aur Zod schemas se backend runtime pe bhi request shape check kar sakta hai.</p>`},
{t:`Generated hook ka use (frontend)`, code:`
// orval.config.ts → client: "react-query", mode: "split", baseUrl: "/api",
//                   custom mutator: customFetch (auth token lagata hai)
const { data: problems, isLoading } = useListProblems();
const submit = useSubmitCode();
submit.mutate({ data: { matchId, language: 'cpp', code } });`, after:`<p>React Query: caching (same data dobara fetch nahi), loading/error states, mutation ke baad invalidate → fresh data. Token <code>setAuthTokenGetter(() =&gt; localStorage.getItem(TOKEN_KEY))</code> se custom fetch me lagta hai.</p>`},
{t:`30 endpoints (groups)`, b:`<div class="tbl-wrap"><table><tr><th>Group</th><th>Endpoints</th></tr><tr><td>Health</td><td>/healthz</td></tr><tr><td>Auth</td><td>register, login, logout, me</td></tr><tr><td>Problems</td><td>list, featured, get, run (practice)</td></tr><tr><td>Matches</td><td>list mine, create (invite code), get, join by code</td></tr><tr><td>Submissions</td><td>submit code</td></tr><tr><td>Leaderboard / Profile</td><td>leaderboard, profile, ELO history, user matches</td></tr><tr><td>Matchmaking</td><td>join, leave, status</td></tr><tr><td>Friends</td><td>list, requests, send, accept, decline, search, remove, challenge</td></tr><tr><td>Stats</td><td>active</td></tr></table></div>`}
],
say:`The API is contract-first. An OpenAPI spec defines all 30 operations, and Orval generates two packages: typed React Query hooks for the frontend and Zod schemas for runtime validation. If an endpoint changes, regenerating makes mismatches show up as TypeScript errors instead of production bugs. React Query handles caching, loading and error states and refetching after mutations, and a custom fetch attaches the JWT. The endpoints cover auth, problems and practice runs, matches and invite codes, submissions, leaderboard and profiles, matchmaking, friends and stats.`,
hook:`openapi.yaml → Orval → hooks (React Query) + Zod. Spec badla → compile error. 30 ops.`,
check:[
[`Contract-first ka main fayda?`,`Frontend-backend mismatch compile time pe pakda jaata hai.`],
[`React Query kya deta hai?`,`Caching, loading/error states, refetch/invalidation, mutations.`]
]
},
{
h:`Database: schema, Drizzle ORM, monorepo`,
words:[
[`Schema`,`Tables, columns, types, relations.`],
[`Foreign key`,`Column jo doosri table ki row ko point kare.`],
[`ORM`,`Code me typed objects/queries → SQL.`],
[`Drizzle`,`TypeScript ORM: schema TS me, queries SQL jaisi, types auto.`],
[`JSONB`,`Postgres me JSON column.`]
],
steps:[
{t:`Tables`, b:`<div class="tbl-wrap"><table><tr><th>Table</th><th>Important columns</th></tr><tr><td>users</td><td>id, email (unique), name, password_hash, <strong>elo</strong> (default 1200), wins, losses</td></tr><tr><td>problems</td><td>id, title, slug, description, difficulty (easy/medium/hard), tags, constraints, examples (JSONB), <strong>test_cases</strong> (JSONB), <strong>signature</strong> (JSONB: fn, ret, params), starter code C++/Java</td></tr><tr><td>matches</td><td>id, problem_id, player1_id, player2_id, <strong>winner_id</strong>, status (waiting/active/finished/abandoned), invite_code (unique), started_at, ended_at</td></tr><tr><td>match_players</td><td>match_id, user_id, language, final_code, tests_passed_count, total_tests, submitted_at</td></tr><tr><td>elo_history</td><td>user_id, match_id, old_elo, new_elo</td></tr><tr><td>friendships</td><td>requester_id, addressee_id, status (pending/accepted), unique pair index</td></tr></table></div>`},
{t:`Drizzle schema (real)`, code:`
export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  problemId: integer("problem_id").notNull().references(() => problemsTable.id),
  player1Id: integer("player1_id").notNull().references(() => usersTable.id),
  player2Id: integer("player2_id").references(() => usersTable.id),
  winnerId: integer("winner_id").references(() => usersTable.id),
  status: text("status", { enum: ["waiting", "active", "finished", "abandoned"] })
    .notNull().default("waiting"),
  inviteCode: text("invite_code").unique(),
  ...
});`},
{t:`Drizzle kyun (raw SQL / Prisma vs)`, b:`<ul><li>Schema TypeScript me → query results <strong>typed</strong>.</li><li>SQL jaisi API (<code>db.select().from().where(and(eq(...), isNull(...)))</code>) → jo SQL banega woh predictable, transactions/conditional updates aasaan.</li><li>Lightweight, codegen step nahi.</li></ul>`},
{t:`Indexes jo main add karta (honest improvement)`, b:`<ul><li><code>matches(player1_id)</code>, <code>matches(player2_id)</code> + status — "active matches of user" (disconnect grace) query.</li><li><code>match_players(match_id, user_id)</code> unique.</li><li><code>elo_history(user_id)</code>.</li><li><code>users(elo)</code> leaderboard sort ke liye.</li><li>Random problem <code>ORDER BY random()</code> badi table pe slow → random offset / TABLESAMPLE.</li></ul>`}
],
say:`The schema has users with email, password hash, ELO defaulting to 1200 and win-loss counts; problems with descriptions, test cases and a function signature stored as JSONB; matches with both players, a nullable winner, a status of waiting, active, finished or abandoned, and a unique invite code; per-player submission results; ELO history; and friendships. It's defined with Drizzle, a TypeScript ORM, so queries are typed while staying close to SQL, which makes transactions and conditional updates straightforward. With more scale I'd add indexes on match participants and status, ELO for the leaderboard, and replace ORDER BY random() for problem selection.`,
hook:`users(elo 1200) · problems(test_cases, signature) · matches(winner_id nullable, status, invite_code) · match_players · elo_history · friendships. Drizzle = typed + SQL-like.`,
check:[
[`matches.winner_id nullable kyun?`,`Match chalte waqt winner nahi hota — NULL; single-winner update isi pe depend.`],
[`ORDER BY random() ka problem?`,`Badi table pe poori table scan + sort.`]
]
},
{
h:`Auth & security: bcrypt, JWT, rate limiting, authorization`,
words:[
[`Authentication`,`Tum kaun ho? (login)`],
[`Authorization`,`Tumhe ye karne ki permission hai? (participant check)`],
[`bcrypt`,`Slow password hash with built-in salt; cost factor.`],
[`JWT`,`Signed token: header.payload.signature.`],
[`Rate limiting`,`Ek client kitni requests per time window.`],
[`CORS`,`Browser ko batana kaunsi origins API call kar sakti.`]
],
steps:[
{t:`Password: bcrypt cost 12`, code:`
const passwordHash = await bcrypt.hash(password, 12);   // register
const valid = await bcrypt.compare(password, user.passwordHash);   // login`, after:`<p>Cost 12 = 2¹² rounds → har hash jaan-boojh ke slow → leaked DB pe brute force mehenga. Salt hash ke andar store hota hai. Async version → event loop block nahi.</p>`},
{t:`JWT`, d:`jwt`, b:`<ul><li>Login pe server <code>jwt.sign({userId, email}, JWT_SECRET, {expiresIn: '7d'})</code>.</li><li>Frontend <strong>localStorage</strong> me rakhta, har request <code>Authorization: Bearer</code>.</li><li><code>requireAuth</code> middleware verify → <code>req.userId</code>.</li><li>Production me <code>JWT_SECRET</code> set na ho to server <strong>start hi nahi</strong> hota (dev me random secret + warning).</li></ul>`},
{t:`Rate limiting + proxy`, code:`
const authLimiter = rateLimit({ windowMs: 60_000, limit: 10 });        // login/register
const executionLimiter = rateLimit({ windowMs: 60_000, limit: 10,
  message: { error: "Too many submissions, please try again later" } });
app.set("trust proxy", 1);   // Render ke proxy ke peeche asli client IP`, after:`<p><strong>trust proxy kyun:</strong> Render ka proxy aage hai; bina iske saare users ka IP proxy ka dikhega → sab ek hi bucket me limit ho jaate.</p>`},
{t:`Authorization checks (submission route)`, b:`<ul><li>matchId, language, code required → 400.</li><li>Code &lt; 50 KB, language sirf cpp/java.</li><li>Match exist → warna 404.</li><li>User <strong>participant</strong> hai? → warna <strong>403</strong>.</li><li>Match <code>active</code>? → warna 409.</li></ul><p>Socket <code>match:join</code> pe bhi DB se participant check — koi doosre ka match room join karke progress nahi dekh sakta.</p>`},
{t:`Trade-offs / improvements`, b:`<div class="tbl-wrap"><table><tr><th>Choice</th><th>Risk</th><th>Better</th></tr><tr><td>JWT in localStorage</td><td>XSS se token chori</td><td>httpOnly cookie + CSRF protection</td></tr><tr><td>7-day JWT, no revocation</td><td>chori token 7 din valid; logout server-side kuch nahi</td><td>short access token + refresh token / denylist</td></tr><tr><td>In-memory rate limiter</td><td>multiple instances pe alag counts</td><td>Redis store</td></tr></table></div>`}
],
say:`Passwords are hashed with bcrypt at cost 12, which is deliberately slow and salted. Login issues a JWT signed with a server secret that expires in seven days; the client stores it in localStorage and sends it as a bearer token, and a middleware verifies it — in production the server refuses to start without the secret. Auth and submission routes are rate-limited to ten requests a minute per client, with trust proxy set so Render's proxy doesn't make every user share one IP. Authorisation is separate: submitting requires being a participant in an active match, and joining a match's socket room re-checks that in the database. The trade-offs are that localStorage tokens are exposed to XSS and JWTs can't be revoked before expiry; httpOnly cookies and short-lived access tokens with refresh would be stronger.`,
hook:`bcrypt 12 · JWT 7d (localStorage) · rate limit 10/min (auth + submit) · trust proxy · 400/403/404/409 checks. Risks: XSS, no revocation.`,
check:[
[`Authentication vs authorization example?`,`Login = authN; "tum is match ke participant ho?" = authZ.`],
[`trust proxy na lagaya to rate limiter pe asar?`,`Sab requests proxy IP se dikhengi → sab users ek limit share.`],
[`JWT localStorage ka risk?`,`XSS script token padh sakta hai.`]
]
}
],
cards:[
{q:`Give me a 60-second overview of AlgoRace.`, s:`1v1 race: ELO/friend match, same problem, Monaco C++/Java, live progress Socket.IO, first all-pass wins + ELO. 102 problems, 1,020 tests, 30 OpenAPI endpoints, Wandbox harness, single-winner transaction. Vercel + Render.`, a:`AlgoRace is a real-time one-versus-one coding race. Players are matched by ELO or challenge friends, solve the same problem in C++ or Java, and see each other's progress live over Socket.IO; the first to pass all tests wins and ratings update. It has 102 problems and 1,020 test cases, a contract-first API of 30 endpoints, grading via generated harnesses on the Wandbox API, and a single transaction that guarantees one winner. The frontend is on Vercel and the API on Render.`},
{q:`What does contract-first API design mean and why use it?`, s:`OpenAPI spec pehle → Orval se typed React Query hooks + Zod. Mismatch = compile error.`, a:`You define the API in an OpenAPI spec first and generate code from it. Orval produced typed React Query hooks and Zod validators, so any mismatch between frontend and backend shows up as a TypeScript error rather than a runtime bug.`},
{q:`What does React Query give you over plain fetch?`, s:`Caching, dedup, loading/error states, background refetch, mutations + invalidation.`, a:`Caching and request deduplication, loading and error states, background refetching, and mutations that invalidate cached queries so the UI shows fresh data.`},
{q:`Describe your database schema.`, s:`users (elo 1200, wins/losses), problems (test_cases, signature), matches (players, nullable winner_id, status, invite_code), match_players, elo_history, friendships. Drizzle.`, a:`Users with ELO and win-loss counts; problems with test cases and a function signature; matches with both players, a nullable winner, status and a unique invite code; per-player submission results; ELO history; and friendships — defined with Drizzle ORM.`},
{q:`Why Drizzle?`, s:`TS schema → typed queries; SQL jaisa predictable; transactions + conditional updates aasaan; lightweight.`, a:`The schema lives in TypeScript so queries are typed, the API stays close to SQL so generated queries are predictable, and transactions and conditional updates like WHERE winner_id IS NULL are easy to express.`},
{q:`How are passwords stored?`, s:`bcrypt cost 12: slow + salted; compare on login. Async.`, a:`With bcrypt at cost 12, which is deliberately slow and salts each hash; login uses bcrypt.compare.`},
{q:`How does authentication work end to end?`, s:`Login → JWT {userId,email} 7d signed JWT_SECRET → localStorage → Bearer header → requireAuth verify. Socket handshake me bhi token.`, a:`On login the server signs a JWT containing the user ID and email with a server secret, valid for seven days. The client stores it and sends it as a bearer token; middleware verifies it on protected routes, and the Socket.IO handshake verifies it too.`},
{q:`Authentication vs authorization in AlgoRace?`, s:`AuthN: JWT verify. AuthZ: submission/match:join pe participant check (403), match active (409).`, a:`Authentication verifies the JWT. Authorisation checks what that user may do — for example, submitting code requires being a participant in an active match, otherwise 403 or 409, and joining a match room re-checks participation.`},
{q:`How did you implement rate limiting?`, s:`express-rate-limit 10/min on auth + submissions; trust proxy 1 (Render). Multi-instance → Redis store.`, a:`express-rate-limit allows ten requests per minute on auth and submission routes, with trust proxy set so Render's proxy doesn't collapse all clients into one IP. With multiple instances I'd use a shared Redis store.`},
{q:`What are the weaknesses of your JWT approach?`, s:`localStorage → XSS chori; 7-day token revoke nahi. Better: httpOnly cookie + CSRF, short access + refresh.`, a:`Tokens in localStorage can be stolen by XSS, and a seven-day JWT can't be revoked before it expires. httpOnly cookies with CSRF protection and short-lived access tokens with refresh tokens would be stronger.`}
]
});
