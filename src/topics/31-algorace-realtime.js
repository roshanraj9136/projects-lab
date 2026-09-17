TOPICS.push({
id:'ar-realtime', name:'AlgoRace 2 · Real-time (Socket.IO), matchmaking, grading harness', group:'AlgoRace · Real-Time Coding Race Platform', tier:'mod',
intro:`Resume: "players are paired by ELO rating, race on the same problem, and see live opponent progress over Socket.IO rooms" aur "Automated grading with generated C++/Java test harnesses (Wandbox API)". Yahan real-time ke basics (polling vs WebSocket), rooms aur events, matchmaking algorithm aur uske race conditions, aur code grading kaise hoti hai — cheating risk ke saath.`,
lessons:[
{
h:`Real-time basics: polling vs WebSocket vs Socket.IO`,
words:[
[`Polling`,`Client har N second poochhe "kuch naya?"`],
[`Long polling`,`Server response tab tak rokta jab tak kuch naya na ho.`],
[`WebSocket`,`Ek persistent two-way connection; server kabhi bhi push kar sake.`],
[`SSE`,`Server-Sent Events: sirf server → client stream.`],
[`Socket.IO`,`WebSocket ke upar library: auto-reconnect, rooms, fallback to polling, events.`]
],
steps:[
{t:`Comparison`, b:`<div class="tbl-wrap"><table><tr><th>Method</th><th>Direction</th><th>Latency</th><th>Cost</th></tr><tr><td>Polling (har 2 s)</td><td>client pull</td><td>≤ 2 s delay</td><td>bahut bekaar requests</td></tr><tr><td>Long polling</td><td>pull (held)</td><td>low</td><td>har message ke baad reconnect</td></tr><tr><td>SSE</td><td>server → client</td><td>low</td><td>one-way</td></tr><tr><td><strong>WebSocket / Socket.IO</strong></td><td>dono taraf</td><td>low</td><td>ek connection per client</td></tr></table></div>`},
{t:`Race ke liye Socket.IO kyun`, b:`<ul><li>Opponent ka progress <strong>turant</strong> dikhna chahiye (poll delay race ka maza khatam).</li><li>Server ko push karna hai: matched, progress, finished, opponent disconnected.</li><li>Socket.IO: <strong>auto-reconnect</strong> (mobile network), <strong>rooms</strong> (sirf us match ke 2 players ko bhejo), agar WebSocket block ho to HTTP long-polling fallback.</li></ul>`},
{t:`Rooms`, b:`<ul><li><code>user:&lt;id&gt;</code> — connect hote hi join. Personal events: <code>queue:matched</code>, <code>friend:request</code>, <code>friend:challenge</code>.</li><li><code>match:&lt;id&gt;</code> — race page pe <code>match:join</code> (participant check ke baad). Events: <code>match:progress</code>, <code>match:finished</code>, <code>match:opponent_disconnected</code>, <code>match:opponent_reconnected</code>.</li></ul><p>User ke 2 tabs = 2 sockets, dono <code>user:&lt;id&gt;</code> room me → dono ko event.</p>`},
{t:`Socket auth`, code:`
const io = new SocketServer(httpServer, { path: "/ws", cors: { origin: corsOrigin, credentials: true } });

io.use((socket, next) => {
  const token = socket.handshake.auth.token ?? socket.handshake.query.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const payload = verifyToken(token);
    socket.data = { userId: payload.userId, email: payload.email };
    next();
  } catch { next(new Error("Invalid token")); }
});`}
],
say:`Polling adds delay and wasted requests, server-sent events are one-way, and WebSockets give a persistent two-way connection. I used Socket.IO on top of WebSockets because a race needs instant pushes — matched, opponent progress, finished, disconnected — plus automatic reconnection and a polling fallback. Each connection is authenticated in a middleware that verifies the JWT from the handshake, then joins a personal user room for events like queue matches and friend challenges. On the race page the client joins a match room after the server checks in the database that the user is a participant, so progress events only reach the two players.`,
hook:`Polling slow, SSE one-way, WebSocket two-way. Socket.IO: reconnect + rooms + fallback. Rooms: user:<id>, match:<id>. Handshake JWT.`,
check:[
[`Leaderboard ke liye WebSocket zaroori?`,`Nahi — kabhi-kabhi badalta hai; REST + cache kaafi (isliye REST hai).`],
[`match room join karne se pehle kya check?`,`DB me user us match ka player1 ya player2 hai.`]
]
},
{
h:`Race ka poora event flow`,
words:[[`Event`,`Named message: <code>socket.emit("match:progress", data)</code>.`],[`Emit to room`,`<code>io.to("match:42").emit(...)</code> — room ke sab sockets ko.`]],
steps:[
{t:`Sequence`, d:`raceSeq`},
{t:`Code: match milne pe dono ko notify`, code:`
router.post("/join", requireAuth, async (req, res) => {
  await joinQueue(authReq.userId);
  const result = await tryMatchPlayers();
  if (result) {
    for (const playerId of result.playerIds) {
      io?.to(\`user:\${playerId}\`).emit("queue:matched", { matchId: result.matchId });
    }
    return res.json({ inQueue: false, queueSize: getQueueSize(), matchId: result.matchId });
  }
  res.json({ inQueue: true, queueSize: getQueueSize(), matchId: null });
});`},
{t:`Friend challenge / invite`, b:`<ul><li><code>POST /matches</code> → status <code>waiting</code> + 8-char <strong>invite code</strong> (nanoid).</li><li><code>POST /matches/join/:code</code> → conditional update <code>WHERE id = ? AND status = 'waiting'</code> → do log ek saath join karein to sirf ek (0 rows → 409).</li><li><code>POST /friends/:userId/challenge</code> → sirf accepted friend ko → <code>friend:challenge</code> event with invite code.</li></ul>`}
],
say:`When a player joins the queue over REST, the server tries to match immediately; on a match it creates the match rows and emits queue:matched to both players' personal rooms. Each client opens the race page and emits match:join to enter the match room. Every submission is graded and the server emits match:progress with tests passed, so the opponent sees it live, and when someone passes everything the server commits the win and then emits match:finished with ELO changes. Friend challenges create a waiting match with an invite code, and joining uses a conditional update on status waiting so two people can't both take the second seat.`,
hook:`join (REST) → queue:matched (user rooms) → match:join → submit → match:progress → COMMIT → match:finished. Invite join = WHERE status='waiting'.`,
check:[
[`queue:matched kis room me jaata hai?`,`Har player ke user:<id> room me.`],
[`Invite code se do log ek saath join kare to?`,`Conditional update sirf ek ko 1 row deta; doosre ko 409.`]
]
},
{
h:`Matchmaking algorithm + race conditions`,
words:[
[`Queue`,`Match ke intezaar me players ki list.`],
[`Closest pair`,`Sabse kam ELO difference wala pair.`],
[`Node event loop`,`Single thread; lekin <code>await</code> pe doosra code beech me chal sakta.`],
[`Race condition`,`Do operations ka order result badal de.`]
],
steps:[
{t:`Algorithm`, d:`closestPair`, code:`
function pickClosestPair() {
  if (queue.length < 2) return null;
  const sorted = [...queue].sort((a, b) => a.elo - b.elo);     // O(n log n)
  let bestI = 0, bestDiff = Infinity;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = Math.abs(sorted[i].elo - sorted[i + 1].elo);  // sirf adjacent
    if (diff < bestDiff) { bestDiff = diff; bestI = i; }
  }
  return [sorted[bestI], sorted[bestI + 1]];
}`},
{t:`Proof: adjacent kaafi kyun`, b:`<p>Sorted a ≤ b ≤ c. <code>c − a = (c − b) + (b − a)</code> ≥ dono me se har ek. Toh non-adjacent pair ka difference kabhi adjacent pairs se chhota nahi ho sakta → sirf n−1 adjacent pairs check karo. Brute force O(n²) ki jagah <strong>O(n log n)</strong>.</p>`},
{t:`"Node single-threaded hai, race kaise?"`, b:`<p>JavaScript ek thread pe chalti hai, lekin har <code>await</code> pe function <strong>ruk</strong> jaata aur doosri request ka code chal jaata. <code>doMatch</code> me <code>await getRandomProblem()</code>, <code>await db.insert(...)</code> hain. Do <code>/join</code> requests ek saath → dono matching shuru kar sakti thi → ek player do matches me. Isliye:</p>`, code:`
let matching = false;
export async function tryMatchPlayers() {
  if (matching) return null;       // doosra run chal raha → skip
  matching = true;
  try { return await doMatch(); }
  finally { matching = false; }    // error pe bhi reset
}
// doMatch: pair pick karte hi leaveQueue(first), leaveQueue(second) — await se PEHLE`},
{t:`Honest limitations`, b:`<div class="tbl-wrap"><table><tr><th>Issue</th><th>Asar</th><th>Fix</th></tr><tr><td>Queue process memory me</td><td>restart pe queue gayab; 2 servers = 2 alag queues</td><td>Redis sorted set (score = ELO)</td></tr><tr><td>Matching sirf <code>/join</code> pe trigger; <code>matching</code> busy tha to skip</td><td>2 log queue me baithe reh sakte jab tak koi teesra join na kare</td><td>periodic matcher (har 1 s) / loop until no pair</td></tr><tr><td>Max ELO gap nahi</td><td>1000 vs 1800 match ho sakta</td><td>window jo wait time ke saath badhe</td></tr><tr><td><code>joinQueue</code>: <code>isInQueue</code> check → <code>await</code> DB (ELO) → push</td><td>double-click → same user do baar queue me → khud se match possible</td><td>await se pehle sync Set me mark; pair me same userId reject</td></tr><tr><td>doMatch throw kare (e.g. no problems)</td><td>dono players queue se hat chuke → atak gaye</td><td>failure pe wapas queue me daalo</td></tr></table></div>`}
],
say:`Waiting players sit in an in-memory queue with their ELO. To match, I sort by ELO and scan adjacent pairs for the smallest difference — in a sorted list the closest pair is always adjacent, so it's O(n log n) instead of checking every pair. Node is single-threaded, but awaits let other requests interleave, so a matching flag prevents overlapping runs and the chosen players leave the queue before any await. The limitations are real: the queue is lost on restart and can't be shared across instances, matching only runs when someone joins, there's no maximum rating gap, a double-click race could enqueue a user twice, and a failed match creation strands both players. I'd move the queue to a Redis sorted set with a periodic matcher and a widening rating window.`,
hook:`Sort by ELO → min adjacent diff (proof: c−a ≥ c−b). matching flag (await interleaving). Limits: in-memory, join-triggered, no max gap, double-join race.`,
check:[
[`ELOs 1000, 1100, 1120, 1400 → pair?`,`1100 vs 1120 (diff 20).`],
[`Single thread me race kaise hua?`,`await pe dusri request ka code chal jaata hai (interleaving).`],
[`Queue ko multi-server kaise banaoge?`,`Redis sorted set (score ELO) + periodic matcher.`]
]
},
{
h:`Grading: generated test harness + Wandbox`,
words:[
[`Test harness`,`Wrapper code jo user function ko test inputs se call kare aur output check kare.`],
[`Signature`,`Function ka naam, return type, parameter types (problem ke saath stored).`],
[`Serialize`,`Value ko comparable string me badalna (e.g. vector → "[1,2,3]").`],
[`Wandbox`,`Public online compiler API (gcc-head, openjdk).`]
],
steps:[
{t:`Problem: user sirf function likhta hai`, b:`<p>LeetCode style: user <code>int maxProfit(vector&lt;int&gt;&amp; prices)</code> likhta, <code>main()</code> nahi. Tests ke inputs strings me stored hain. Toh server ko <strong>ek poora program generate</strong> karna padta hai.</p>`},
{t:`Generated program ka structure`, d:`harness`},
{t:`Generator code (short)`, code:`
function buildCppRunner(userCode, testCases, sig) {
  const tests = testCases.map(tc => \`    {"\${esc(tc.input)}", "\${esc(tc.expectedOutput)}"}\`).join(",\\n");
  const parseLines = sig.params.map(p => cppParseCall(p.name, p.type)).join("\\n");   // type se parser
  return \`#include <bits/stdc++.h>
\${CPP_HELPERS}
\${userCode}
int main() {
    string tests[][2] = {\${tests}};
    for (int i = 0; i < n; i++) {
        try {
            \${parseLines}
            auto _result = \${sig.fn}(\${callArgs});
            actual = \${serialize(sig.ret, "_result")};
            passed = (actual == expected);
        } catch (exception& e) { error = e.what(); }
        cout << "{\\\\"passed\\\\":" << ... ;          // JSON array
    }
}\`;
}`, after:`<p>Java ke liye bhi same (<code>buildJavaRunner</code>). Type maps: <code>CPP_TYPE</code>/<code>JAVA_TYPE</code> — e.g. "int[]" → <code>vector&lt;int&gt;</code> / <code>int[]</code>.</p>`},
{t:`Ek run, sab tests`, code:`
const res = await fetch("https://wandbox.org/api/compile.json", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: runnerCode, compiler: "gcc-head" /* or openjdk-jdk-22+36 */, options: "" }),
});
// compiler_error → saare tests fail with compile message
// non-zero exit → saare fail with stderr
// warna stdout JSON.parse → har test ka {passed, actual, error}`, after:`<p><strong>Ek program me saare tests kyun?</strong> 10 tests = 10 alag compiles/API calls → bahut slow + rate limits. Ek compile + ek run → fast. Har test apna try/catch → ek test ka exception baaki ko nahi rokta. (Infinite loop / segfault poore run ko fail kar dega — trade-off.)</p>`},
{t:`Practice vs race`, b:`<p>Practice run (<code>/problems/:id/run</code>) sirf <strong>pehle 3 test cases</strong> pe; race submission <strong>saare</strong> tests pe. Code limit 50 KB, languages sirf cpp/java.</p>`}
],
say:`Users only write the function, so for each submission the server generates a complete program: helper functions for parsing and JSON serialisation, the user's code, and a main that embeds every test's input and expected output, parses arguments according to the problem's stored signature, calls the function inside a try-catch, serialises the result and prints a JSON array of pass, actual and error for each test. It sends that one program to the Wandbox API — gcc-head for C++ or OpenJDK 22 for Java — and parses stdout, treating compile errors or a non-zero exit as failing every test. One compile and run for all tests is far faster and gentler on API limits than one per test, though a crash or infinite loop fails the whole run.`,
hook:`Signature → generated main (parse → call → serialize → compare, try/catch) → 1 Wandbox run → JSON array. Practice = first 3 tests.`,
check:[
[`Har test ke liye alag Wandbox call kyun nahi?`,`N compiles/calls → slow + rate limits.`],
[`Ek test me segfault ho to?`,`Poora run non-zero exit → saare tests fail.`]
]
},
{
h:`Cheating aur sandboxing (security interviewer sawal)`,
words:[
[`Sandbox`,`Isolated environment jahan untrusted code limited permissions ke saath chale.`],
[`seccomp`,`Linux filter: process kaunse system calls kar sakta.`],
[`nsjail / isolate`,`Sandboxing tools (competitive programming judges use karte).`],
[`Nonce`,`Ek baar use hone wala random value.`]
],
steps:[
{t:`Kya ek player cheat kar sakta hai? — Haan (honest)`, b:`<p>User ka code <strong>usi program</strong> me hai jo results print karta hai aur jisme <strong>expected outputs</strong> bhi likhe hain. Ek static initializer (jo <code>main()</code> se pehle chalta) fake <code>[{"passed":true,...}]</code> print karke <code>exit(0)</code> kar sakta hai → server "all passed" padhega.</p>`},
{t:`Fix`, b:`<ol><li><strong>Expected outputs program me mat daalo</strong> — sirf inputs.</li><li>Program sirf <strong>actual outputs</strong> print kare, ek <strong>random nonce delimiter</strong> ke saath (user ko pata nahi).</li><li><strong>Comparison server pe.</strong></li><li>Output count/format strict check.</li></ol>`},
{t:`Wandbox dependency ke risks`, b:`<ul><li>Third-party: <strong>SLA nahi</strong>, rate limits, downtime → race ruk jaaye.</li><li><code>fetch</code> pe <strong>timeout nahi</strong> → Wandbox hang ho to request hang. Fix: <code>AbortSignal.timeout(15000)</code>.</li><li>User code bahar ke service pe jaata (privacy).</li><li>Time/memory limits hamare control me nahi.</li></ul>`},
{t:`Apna judge kaise banaoge`, b:`<ul><li><strong>Judge0</strong> self-host, ya containers + <strong>nsjail/isolate</strong>/gVisor.</li><li>Limits: CPU time, wall time, memory, process count, output size; <strong>network off</strong>; read-only filesystem; seccomp.</li><li><strong>Job queue</strong> (BullMQ/Redis) + worker pool → burst me server nahi girega.</li><li>Per-test time limit + verdicts (AC, WA, TLE, RE, CE).</li></ul>`}
],
say:`In the current design a player could cheat: their code runs in the same process that prints results and contains the expected outputs, so a static initialiser could print a fake all-passed JSON array and exit before main runs. The fix is to keep expected outputs on the server, have the program print only actual outputs separated by a random nonce, and compare on the server. Relying on Wandbox also means no SLA, rate limits, no control over time and memory limits, and my fetch call has no timeout, so a hung request would hang the submission. A production judge would run code in our own sandbox — Judge0 or nsjail with CPU, memory and output limits, no network and seccomp — behind a job queue with per-test verdicts.`,
hook:`Cheat: same process + expected outputs → fake JSON. Fix: expected server pe, nonce delimiter, server compare. Wandbox: no SLA, no fetch timeout. Own judge: nsjail/Judge0 + limits + queue.`,
check:[
[`Cheat ka root cause ek line me?`,`Untrusted code usi process me hai jo results aur expected outputs rakhta hai.`],
[`fetch pe timeout kaise lagaoge?`,`AbortSignal.timeout(ms) pass karke.`]
]
}
],
cards:[
{q:`Why Socket.IO instead of polling?`, s:`Race = instant push (matched/progress/finished). Polling delay + waste. Socket.IO: two-way, reconnect, rooms, fallback.`, a:`A race needs instant server pushes for matches, opponent progress and results. Polling adds delay and wasted requests, while Socket.IO gives a persistent two-way connection with automatic reconnection, rooms and a long-polling fallback.`},
{q:`How do you use Socket.IO rooms?`, s:`user:<id> (connect pe) → queue:matched, friend events. match:<id> (participant check ke baad) → progress, finished, disconnect events.`, a:`Every socket joins a user room on connect for personal events like queue matches and friend challenges. On the race page it joins a match room after the server verifies participation, and progress, finish and disconnect events go only to that room.`},
{q:`How are WebSocket connections authenticated?`, s:`io.use middleware: handshake auth/query token → verifyToken → socket.data.userId; fail → Error.`, a:`A Socket.IO middleware reads the JWT from the handshake, verifies it and stores the user ID on the socket; connections without a valid token are rejected before any events are handled.`},
{q:`Walk me through a race's event flow.`, s:`join REST → match → queue:matched (user rooms) → match:join → submit → match:progress → commit → match:finished.`, a:`A player joins the queue over REST; on a match the server emits queue:matched to both user rooms. Clients join the match room, each graded submission emits match:progress, and once a player passes everything the server commits the win and emits match:finished with ELO changes.`},
{q:`How does matchmaking pick opponents, and why is it efficient?`, s:`Sort by ELO, min adjacent diff. Sorted list me closest pair adjacent (c−a ≥ c−b). O(n log n).`, a:`It sorts waiting players by ELO and picks the adjacent pair with the smallest difference. In a sorted list the closest pair is always adjacent, because a wider pair's difference is the sum of the adjacent differences, so it's O(n log n) rather than O(n²).`},
{q:`Node is single-threaded — how can matchmaking race?`, s:`await pe interleaving: doosri request ka code chal jaata. matching flag + await se pehle queue se remove.`, a:`Each await yields to the event loop, so another request's matching code can run midway. A matching flag prevents overlapping runs, and the chosen players are removed from the queue before any await.`},
{q:`What are the limitations of your matchmaking?`, s:`In-memory (restart/multi-instance), join pe hi trigger, no max ELO gap, double-join race, failure pe players stranded. Fix: Redis ZSET + periodic matcher + widening window.`, a:`The queue lives in process memory so it's lost on restart and can't span instances, matching only triggers on joins, there's no maximum rating gap, a double-click can enqueue a user twice, and a failed match creation strands players. A Redis sorted set with a periodic matcher and a widening rating window would fix these.`},
{q:`How does your code grading work?`, s:`Signature se generated program: helpers + user code + main (embedded tests, parse, call, serialize, try/catch) → JSON array → ek Wandbox run → parse.`, a:`For each submission the server generates a full C++ or Java program containing helpers, the user's function and a main that parses every test input by the stored signature, calls the function in a try-catch, serialises the result and prints a JSON array. It runs once on the Wandbox API and the server parses the results.`},
{q:`Why run all test cases in one program?`, s:`1 compile + 1 run vs N → fast, API limits safe. Trade-off: crash/infinite loop sab fail.`, a:`One compile and run is much faster and gentler on the external API's limits than one per test. The trade-off is that a crash or infinite loop fails the entire run.`},
{q:`Can a player cheat your grader? How would you fix it?`, s:`Haan: same process me expected outputs + result print → fake JSON + exit. Fix: expected server pe, sirf actual outputs + random nonce, server compare, sandbox.`, a:`Yes in principle: user code runs in the process that prints results and embeds expected outputs, so it could print a fake passing result and exit early. I'd keep expected outputs on the server, print only actual outputs with a random delimiter, compare server-side, and run code in our own sandbox.`},
{q:`What are the risks of depending on Wandbox?`, s:`No SLA, rate limits, downtime, no fetch timeout (hang), code bahar jaata, limits control nahi.`, a:`No SLA, rate limits and possible downtime, no control over time and memory limits, user code leaving our infrastructure, and in my implementation no request timeout, so a hung call would hang the submission.`},
{q:`How would you build your own code execution service?`, s:`Judge0 / nsjail/isolate/gVisor; CPU/wall/memory/output limits, network off, seccomp; job queue + workers; verdicts AC/WA/TLE/RE/CE.`, a:`Self-host Judge0 or run code in containers with nsjail, isolate or gVisor, enforcing CPU, wall-time, memory and output limits with no network and seccomp filters, behind a job queue with a worker pool, returning per-test verdicts.`}
]
});
