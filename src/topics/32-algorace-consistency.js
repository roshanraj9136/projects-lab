TOPICS.push({
id:'ar-consistency', name:'AlgoRace 3 · Transactions, single winner, ELO, reliability + tough questions', group:'AlgoRace · Real-Time Coding Race Platform', tier:'liab',
intro:`Resume: "settled wins and ELO changes in one database transaction that permits a single winner, with a 10-second reconnect grace before forfeit; deployed on Vercel and Render." Sabse interesting sawal: "dono ek hi millisecond pe solve kar dein to?" Transactions, row locks, ELO math, disconnect timers, ek real crash bug fix, aur scaling ke tough sawal.`,
lessons:[
{
h:`Transactions basics: ACID, isolation, row locks`,
words:[
[`Transaction`,`Kai DB operations ka group: sab hon ya koi nahi.`],
[`ACID`,`Atomicity, Consistency, Isolation, Durability.`],
[`Isolation level`,`Parallel transactions ek doosre ka kitna data dekhein (Postgres default: READ COMMITTED).`],
[`Row lock`,`UPDATE row ko lock karta hai; doosra UPDATE wait karta hai.`],
[`Lost update`,`Do log value padhein, dono apna update likhein, ek ka update gum.`]
],
steps:[
{t:`ACID ek line me`, b:`<ul><li><strong>Atomicity:</strong> winner set + dono ELO update + history — sab ya kuch nahi.</li><li><strong>Consistency:</strong> constraints (FK, unique) hamesha true.</li><li><strong>Isolation:</strong> parallel transactions ek doosre ka adhoora kaam na dekhein.</li><li><strong>Durability:</strong> COMMIT ke baad crash pe bhi data safe.</li></ul>`},
{t:`Lost update ka classic example`, b:`<p>User ki wins = 5. Do matches ek saath jeete:</p><ol><li>Tx1 padhe wins = 5.</li><li>Tx2 padhe wins = 5.</li><li>Tx1 likhe 6. Tx2 likhe 6.</li></ol><p>Final <strong>6</strong>, hona chahiye 7. Fix: <code>SET wins = wins + 1</code> (DB khud atomically badhaye) ya <code>SELECT ... FOR UPDATE</code>.</p>`},
{t:`Postgres READ COMMITTED + UPDATE ka behaviour`, b:`<p>Jab do transactions <strong>same row</strong> UPDATE karein: pehla row lock le leta; doosra <strong>wait</strong> karta. Pehla COMMIT kare to doosra row ka <strong>naya version</strong> dekh ke apni <code>WHERE</code> condition <strong>dobara check</strong> karta hai. Yahi single-winner trick ka base hai.</p>`}
],
say:`A transaction groups operations so they all commit or none do — atomicity — while isolation keeps concurrent transactions from seeing each other's partial work, and durability means committed data survives crashes. A classic bug is the lost update: two transactions read a count, both write count plus one, and one increment disappears; the fix is to increment in SQL or lock the row. In PostgreSQL's default READ COMMITTED level, when two transactions update the same row, the second waits for the first's lock and then re-evaluates its WHERE clause against the newly committed row — which is exactly what makes a conditional update safe for picking a single winner.`,
hook:`ACID. Lost update = read-modify-write. Postgres: same row UPDATE → wait → WHERE re-check on new version.`,
check:[
[`wins 5, do parallel read-modify-write +1 → worst case?`,`6 (ek update lost).`],
[`Lost update ka simplest fix?`,`SET wins = wins + 1 (SQL me increment).`]
]
},
{
h:`Single winner: conditional UPDATE inside a transaction`,
words:[
[`Conditional update`,`UPDATE ... WHERE condition — sirf tab jab condition sach.`],
[`RETURNING`,`UPDATE ne kaunsi rows badli, wapas do.`],
[`Idempotent settle`,`Dobara chale to bhi double win nahi.`]
],
steps:[
{t:`Problem`, b:`<p>A aur B dono ne ek hi moment pe sab tests pass kiye. Naive: "<code>if (match.winnerId === null)</code> → winner set". Dono requests ne pehle hi match padha tha (null) → <strong>dono winner</strong>, dono ko ELO +, dono ko "You won!".</p>`},
{t:`Solution: DB ko referee banao`, d:`winner`},
{t:`Real code`, code:`
if (allPassed && match.winnerId === null) {            // fast path check (race-prone akela)
  const finish = await db.transaction(async (tx) => {
    const updated = await tx.update(matchesTable)
      .set({ winnerId: authReq.userId, status: "finished", endedAt: new Date() })
      .where(and(eq(matchesTable.id, matchId), isNull(matchesTable.winnerId)))   // ← guard
      .returning({ id: matchesTable.id });

    if (updated.length === 0) return null;             // koi aur pehle jeet gaya

    // winner + loser ki ELO padho, computeElo, users update (elo, wins/losses),
    // elo_history me 2 rows insert
    return { loserId, winnerEloChange, loserEloChange };
  });
  if (finish) io.to(\`match:\${matchId}\`).emit("match:finished", { winnerId, eloChanges... });
}`},
{t:`Kyun kaam karta hai`, b:`<ol><li>A ka UPDATE row lock leta, <code>winner_id IS NULL</code> true → 1 row.</li><li>B ka UPDATE lock ka wait karta.</li><li>A ELO update karke COMMIT → lock free.</li><li>B apni WHERE dobara check karta → <code>winner_id</code> ab A → <strong>0 rows</strong> → <code>return null</code> → B ko na win, na ELO change.</li></ol><p><strong>Check aur set ek hi atomic SQL statement me</strong> — "pehle padho, phir likho" ka gap hi nahi.</p>`},
{t:`Honest improvement`, b:`<p>Winner/loser ki <code>wins</code>/<code>losses</code> JS me <code>winnerUser.wins + 1</code> (read-modify-write). Ek user ke do alag matches same time pe settle hon to lost update possible. Fix: <code>sql\`wins + 1\`</code> ya users rows <code>FOR UPDATE</code>.</p>`}
],
say:`If both players pass every test at the same moment, checking winnerId in application code isn't enough — both requests may have read it as null. So inside a transaction I run a conditional update: set the winner and status finished WHERE the match ID matches AND winner_id IS NULL, returning the updated row. The first transaction takes the row lock and matches; the second waits, re-evaluates the WHERE clause after the first commits, updates zero rows and returns without any ELO change. Only the transaction that won the update applies ELO for both players and writes history. One remaining improvement is that win and loss counters are incremented in application code, so I'd move that to SQL to avoid lost updates across simultaneous matches.`,
hook:`UPDATE … WHERE id AND winner_id IS NULL RETURNING → 0 rows = already won. Check + set ek atomic statement. wins+1 JS me = small lost-update risk.`,
check:[
[`updated.length === 0 ka matlab?`,`Koi aur transaction pehle winner set kar chuka.`],
[`App me "if winnerId === null" check kaafi kyun nahi?`,`Dono requests ne purana (null) value padha ho sakta — check aur set ke beech gap.`]
]
},
{
h:`ELO rating math (worked examples)`,
words:[
[`Expected score`,`Rating ke hisaab se jeetne ki probability.`],
[`K-factor`,`Ek match me rating kitni hil sakti (yahan 32).`],
[`Upset`,`Kam rating wala jeet jaaye.`]
],
steps:[
{t:`Formula`, code:`
const K_FACTOR = 32;
export function computeElo(winnerElo, loserElo) {
  const expectedWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const expectedLoser  = 1 - expectedWinner;
  const winnerNewElo = Math.round(winnerElo + K_FACTOR * (1 - expectedWinner));
  const loserNewElo  = Math.max(0, Math.round(loserElo + K_FACTOR * (0 - expectedLoser)));
  return { winnerNewElo, loserNewElo };
}`},
{t:`Example 1: barabar (1200 vs 1200)`, b:`<p>expected = 1/(1+10⁰) = <strong>0.5</strong>. Winner: 32 × (1 − 0.5) = <strong>+16</strong>. Loser: 32 × (0 − 0.5) = <strong>−16</strong>.</p>`},
{t:`Example 2: favourite jeeta (1400 beats 1200)`, b:`<p>expected = 1/(1+10^(−200/400)) = 1/(1+10^−0.5) = 1/(1+0.316) = <strong>0.76</strong>. Winner: 32 × 0.24 = 7.7 → <strong>+8</strong>. Loser: 32 × (0 − 0.24) → <strong>−8</strong>.</p>`},
{t:`Example 3: upset (1200 beats 1400)`, b:`<p>expected = 1/(1+10^(200/400)) = 1/(1+3.16) = <strong>0.24</strong>. Winner: 32 × 0.76 = 24.3 → <strong>+24</strong>. Loser: <strong>−24</strong>.</p><p><strong>Intuition:</strong> umeed ke mutabik jeet = kam points; upset = zyada. Total points (roughly) conserve hote hain. <code>Math.max(0, …)</code> → rating negative nahi.</p>`},
{t:`Kya improve ho sakta`, b:`<ul><li>Naye players ke liye bada K (jaldi sahi rating), purano ke liye chhota.</li><li>Glicko-2: rating uncertainty bhi track.</li><li>Rounding ki wajah se winner +8 aur loser −8 hamesha exactly equal nahi ho sakte.</li></ul>`}
],
say:`ELO computes the winner's expected score as one over one plus ten to the power of the rating difference over 400, and each rating moves by K — 32 here — times actual minus expected. Two 1200 players move plus and minus 16. If a 1400 beats a 1200, the expected score is about 0.76, so the winner gains only about 8; if the 1200 wins that's an upset and gains about 24. Ratings are floored at zero. With more data I'd use a larger K for new players or Glicko-2 to model uncertainty.`,
hook:`E = 1/(1+10^((Rl−Rw)/400)). Δ = 32×(1−E). 1200 vs 1200 ±16 · favourite +8 · upset +24.`,
check:[
[`1300 beats 1300 → change?`,`±16.`],
[`Upset me zyada points kyun?`,`Expected score kam tha, actual 1 → (1 − E) bada.`]
]
},
{
h:`Disconnect grace, emit after commit, aur ek real crash bug`,
words:[
[`Grace period`,`Disconnect ke baad wapas aane ka time.`],
[`Forfeit`,`Match chhodne pe haar.`],
[`Unhandled promise rejection`,`async function ka error kisi ne catch nahi kiya.`],
[`Emit after commit`,`DB me pakka hone ke baad hi clients ko batao.`]
],
steps:[
{t:`Disconnect flow (10 seconds)`, code:`
const DISCONNECT_GRACE_MS = 10_000;
const timers = new Map<string, NodeJS.Timeout>();   // key "matchId:userId"

socket.on("disconnect", () => {
  removeUserFromQueue(userId);
  startDisconnectGrace(userId).catch((err) => logger.error({ err, userId }, "..."));
});
// startDisconnectGrace: user ke active matches (winner NULL) → opponent ko
// "match:opponent_disconnected" {graceMs} → setTimeout(10s) → awardOpponentWin
// wapas "match:join" kiya → cancelDisconnectGrace → clearTimeout + "match:opponent_reconnected"`, after:`<p><code>awardOpponentWin</code> bhi <strong>same <code>winner_id IS NULL</code> guard</strong> use karta hai — agar grace ke dauraan kisi ne solve karke jeet liya to forfeit double-win nahi karega.</p>`},
{t:`Emit after commit (bug jo fix kiya)`, b:`<p>Pehle forfeit path me <code>match:finished</code> event <strong>transaction ke andar</strong> emit hota tha. Transaction fail/rollback ho → clients ko winner dikh gaya jo DB me hai hi nahi. Fix: transaction <code>{winnerEloChange, loserEloChange}</code> ya <code>null</code> return kare; <strong>commit ke baad</strong> hi emit.</p>`},
{t:`Crash bug: ek bad socket event se poora API down`, b:`<ul><li><strong>Symptom (reproduce kiya):</strong> <code>match:leave</code> bina data ke emit → handler <code>data.matchId</code> padhte hi throw → Node process crash → sab users ke matches gaye.</li><li>Socket.IO handler errors khud catch nahi karta; async handlers ki rejections <strong>unhandled</strong>.</li><li><strong>Fix:</strong> <code>if (typeof data?.matchId !== "number") return;</code> guards; <code>match:join</code> me try/catch + logger; <code>startDisconnectGrace(...).catch()</code>, <code>awardOpponentWin(...).catch()</code>; process-level <code>process.on("unhandledRejection", ...)</code> logger.</li><li><strong>Verify:</strong> typecheck + build pass, redeploy ke baad API healthy.</li></ul>`},
{t:`Limits`, b:`<ul><li>Timers process memory me → server restart = pending forfeits gayab.</li><li>User ke 2 tabs: ek tab band → grace shuru ho jaati, jabki doosra connected (sirf <code>match:join</code> cancel karta).</li><li>Fix: timer state Redis me / "disconnectedAt" DB column + periodic sweeper; per-user socket count.</li></ul>`}
],
say:`When a socket disconnects, the server removes the user from the queue, notifies opponents in their active matches and starts a 10-second timer per match; rejoining the match room cancels it, otherwise the opponent is awarded the win through the same winner_id IS NULL guard, so a forfeit can never double-count a real win. Two reliability fixes came from reviewing this code. The forfeit path emitted match:finished inside the transaction, so a rollback could announce a winner that didn't exist; it now emits only after commit. And a malformed socket event could crash the entire API — a match:leave without data threw, and async handlers had unhandled rejections — so I added input guards, try-catch with logging, catches on fire-and-forget promises and a process-level unhandledRejection logger. Timers still live in memory, so a restart drops pending forfeits.`,
hook:`Disconnect → 10 s timer (cancel on match:join) → forfeit via same IS NULL guard. Emit AFTER commit. Crash fix: guards + catch + unhandledRejection logger.`,
check:[
[`Forfeit aur real win ek saath ho to double win kyun nahi?`,`Dono same conditional update (winner_id IS NULL) use karte.`],
[`Emit inside transaction ka risk?`,`Rollback pe clients ko fake winner dikh jaata.`]
]
},
{
h:`Deployment, scaling aur tough questions`,
words:[
[`Horizontal scaling`,`Kai server instances.`],
[`Sticky sessions`,`Ek client hamesha same instance pe (WebSocket ke liye).`],
[`Redis adapter`,`Socket.IO instances ke beech events share karna.`],
[`Cold start`,`Free tier server so jaaye to pehli request slow.`]
],
steps:[
{t:`Deployment`, b:`<ul><li><strong>Frontend:</strong> Vite build → Vercel (static).</li><li><strong>API + Socket.IO:</strong> Render web service (<code>render.yaml</code>); CORS origin env se; <code>trust proxy</code>.</li><li><strong>DB:</strong> PostgreSQL; secrets (JWT_SECRET, DATABASE_URL) env vars.</li><li>Honest: is repo me <strong>CI nahi</strong>, load test numbers nahi.</li></ul>`},
{t:`"Do API servers chalao to kya tootega?"`, d:`scaleOut`, b:`<ul><li>Matchmaking queue alag-alag → players match nahi honge.</li><li>Socket rooms per instance → server 1 ka emit server 2 pe connected player tak nahi.</li><li>Disconnect timers, in-memory rate limiter counts alag.</li></ul><p><strong>Fix:</strong> Redis — shared queue (ZSET), <code>@socket.io/redis-adapter</code>, rate-limit store, timers/sweeper; load balancer pe <strong>sticky sessions</strong> (Socket.IO polling fallback ke liye zaroori).</p>`},
{t:`"How many users can it handle?"`, b:`<p><strong>Mat guess karo.</strong> "I haven't load-tested it. I'd use k6 or Artillery with a Socket.IO scenario — join queue, connect, submit — and watch event-loop lag, DB pool usage, and the external grading latency, which is likely the first bottleneck since every submission waits on Wandbox."</p>`},
{t:`Quick tough follow-ups`, b:`<div class="tbl-wrap"><table><tr><th>Sawal</th><th>Jawab ka core</th></tr><tr><td>Leaderboard real-time kyun nahi?</td><td>Rarely changes; REST + React Query caching; zaroorat ho to finish pe event.</td></tr><tr><td>Submission slow ho (Wandbox 5 s) to server?</td><td>Node async wait → event loop free; lekin concurrent limits/timeouts chahiye → queue.</td></tr><tr><td>User ne 2 tabs se submit kiya?</td><td>Dono grade; winner guard ek hi win deta; rate limit 10/min.</td></tr><tr><td>Hidden tests leak?</td><td>Practice sirf pehle 3; race ke results me har test ka input/expected wapas jaata — hidden tests chahiye to response se hatao.</td></tr><tr><td>Problem data kahan se?</td><td>Seed script: 102 problems, JSONB tests + signature, starter code.</td></tr></table></div>`}
],
say:`The frontend is a static Vite build on Vercel and the API with Socket.IO runs on Render, configured through environment variables, with no CI or load testing in this repo — so I don't quote capacity numbers. Running two API instances would break several things: separate matchmaking queues, socket rooms that don't span instances, and per-instance timers and rate limits. I'd move that state to Redis — a sorted-set queue, the Socket.IO Redis adapter and a shared rate-limit store — and enable sticky sessions. To find real capacity I'd load-test with k6 or Artillery including socket flows; the external grading API is the likely first bottleneck, so a job queue with our own sandbox is the main scaling step.`,
hook:`Vercel (static) + Render (API + sockets). No CI/load tests → numbers mat banao. 2 instances → Redis (queue ZSET, adapter, rate-limit) + sticky sessions. Bottleneck likely grading.`,
check:[
[`Socket.IO multi-instance ke liye 2 cheezein?`,`Redis adapter + sticky sessions.`],
[`"Kitne users handle karega?" — jawab?`,`Load test nahi kiya; k6/Artillery plan + likely bottleneck grading API.`]
]
}
],
cards:[
{q:`What happens if both players solve the problem at the same time?`, s:`Transaction me UPDATE matches SET winner WHERE id AND winner_id IS NULL RETURNING. Pehla lock + commit; doosra wait, WHERE re-check → 0 rows → no win/ELO.`, a:`Both run a conditional update inside a transaction that sets the winner only where winner_id is still null. The first takes the row lock, updates one row, applies ELO and commits; the second waits, re-evaluates the WHERE clause against the committed row, updates zero rows and returns without any rating change.`},
{q:`Why isn't checking winnerId in application code enough?`, s:`Dono requests ne pehle null padha; check aur set ke beech gap. Atomic SQL statement chahiye.`, a:`Both requests may read the match before either writes, so both see null. The check and the set must happen in one atomic statement so the database arbitrates.`},
{q:`Explain ACID.`, s:`Atomicity sab ya kuch nahi; Consistency constraints; Isolation parallel txs alag; Durability commit ke baad safe.`, a:`Atomicity means all operations commit or none do; consistency means constraints always hold; isolation keeps concurrent transactions from seeing each other's partial work; durability means committed data survives crashes.`},
{q:`What is a lost update and where could it happen in AlgoRace?`, s:`Read-modify-write parallel → ek update gum. wins: winnerUser.wins + 1 JS me. Fix: SQL wins + 1 / FOR UPDATE.`, a:`Two transactions read a value and both write a modified version, so one change is lost. AlgoRace increments wins and losses in application code, so simultaneous settlements for the same user could lose one; incrementing in SQL or locking the user row fixes it.`},
{q:`How does PostgreSQL handle two UPDATEs on the same row under READ COMMITTED?`, s:`Doosra lock ka wait; pehla commit → doosra new row version pe WHERE re-evaluate.`, a:`The second update blocks on the first's row lock; after the first commits, it re-evaluates its WHERE condition against the newly committed row version and only updates if it still matches.`},
{q:`Explain your ELO calculation.`, s:`E = 1/(1+10^((Rl−Rw)/400)); Δ = 32(1−E); floor 0. 1200v1200 ±16; 1400 beats 1200 +8; upset +24.`, a:`The winner's expected score is one over one plus ten to the rating difference over 400, and ratings move by K = 32 times actual minus expected, floored at zero. Equal 1200 players move 16 points; a 1400 beating a 1200 gains about 8, while the upset gains about 24.`},
{q:`How does the disconnect grace period work?`, s:`disconnect → queue se hatao, opponent ko notify, 10 s timer per active match; match:join cancel; warna awardOpponentWin (same IS NULL guard).`, a:`On disconnect the user leaves the queue, opponents in active matches are notified, and a 10-second timer starts per match. Rejoining the match room cancels it; otherwise the opponent is awarded the win through the same winner_id IS NULL guard.`},
{q:`Why emit match:finished only after commit?`, s:`Transaction ke andar emit + rollback → clients ko fake winner. Commit ke baad = DB aur UI consistent.`, a:`If the event is emitted inside the transaction and it rolls back or loses the race, clients see a winner the database doesn't have. Emitting after commit keeps the UI consistent with the source of truth.`},
{q:`Tell me about a bug you fixed in AlgoRace.`, s:`match:leave bina data → throw → poora API crash; async handlers unhandled rejections. Fix: guards, try/catch + logger, .catch on promises, unhandledRejection logger; emit after commit.`, a:`A malformed socket event could crash the whole API: match:leave without data threw, and async handlers had unhandled promise rejections. I reproduced it, added input guards, try-catch with logging, catches on fire-and-forget promises and a process-level unhandledRejection logger, and moved the finish event after commit. Type checks and builds passed and the API stayed healthy after redeploying.`},
{q:`What breaks if you run AlgoRace on two API instances?`, s:`Queues alag, socket rooms per instance, timers + rate limits alag. Fix: Redis ZSET queue, Socket.IO Redis adapter, Redis rate-limit store, sticky sessions.`, a:`Matchmaking queues, socket rooms, disconnect timers and rate-limit counters are all per process, so players on different instances wouldn't match or receive events. I'd move them to Redis — a sorted-set queue, the Socket.IO Redis adapter and a shared rate-limit store — with sticky sessions.`},
{q:`How many concurrent users can AlgoRace handle?`, s:`Load test nahi kiya — guess nahi. k6/Artillery + socket scenario; event-loop lag, DB pool, grading latency (likely bottleneck).`, a:`I haven't load-tested it, so I won't guess. I'd use k6 or Artillery with socket scenarios and watch event-loop lag, database pool usage and grading latency — the external code-execution API is the likely first bottleneck.`}
]
});
