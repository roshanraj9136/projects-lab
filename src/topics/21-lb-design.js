TOPICS.push({
id:'lb-design', name:'Load Balancer 2 · Code deep dive: routing, health, retry, backends, replication', group:'Fault-Tolerant HTTP Load Balancer (Go)', tier:'mod',
intro:`Ab real code: ek request LB me kaise ghoomti hai, least-connections function line by line, health check state machine, retry kab safe hai, backend message ko kaise fast accept karke background me DB me likhta hai, aur teen backends ek jaisa feed kaise dikhate hain. Har trade-off honestly.`,
lessons:[
{
h:`Request lifecycle: proxyHandler step by step`,
words:[
[`Buffer`,`Body ko memory me poora padh lena (taaki dobara bhej sakein).`],
[`RoundTrip`,`Transport ka low-level "ek request bhejo, response lao".`],
[`Committed`,`Headers client ko bhej diye — ab wapas nahi le sakte.`]
],
steps:[
{t:`Overview`, d:`lifecycle`},
{t:`Step 1: body buffer (max 1 MiB)`, code:`
const maxRetryBody = 1 << 20                     // 1 MiB

bodyBuf := bodyPool.Get().(*[]byte)             // pool se buffer
defer bodyPool.Put(bodyBuf)
b, err := readAllInto((*bodyBuf)[:0], io.LimitReader(r.Body, maxRetryBody+1))
if len(b) > maxRetryBody {
    http.Error(w, "request body too large", http.StatusRequestEntityTooLarge)  // 413
    return
}`, after:`<p><strong>+1 trick:</strong> limit se ek byte zyada padho — agar wo byte aaya to body badi hai. Pehle bada body chupchaap truncate hota tha; maine 413 bana diya (galat data forward karne se better).</p>`},
{t:`Step 2–3: select + forward`, code:`
tried := make(map[*Backend]bool, len(lb.backends))
for attempt := 0; attempt < len(lb.backends); attempt++ {
    backend := lb.selectBackendExcluding(tried)
    if backend == nil { break }
    tried[backend] = true

    req, _ := http.NewRequestWithContext(r.Context(), r.Method, outURL.String(), bytes.NewReader(body))
    // copy headers, strip hop-by-hop, set ContentLength
    backend.InFlight.Add(1)
    resp, err := backend.Transport.RoundTrip(req)`},
{t:`Step 4: fail → retry, success → commit`, code:`
    if err != nil || resp.StatusCode >= 500 {
        backend.InFlight.Add(-1)
        if resp != nil { io.Copy(io.Discard, resp.Body); resp.Body.Close() }   // connection reuse
        backend.TotalErrors.Add(1)
        continue                                   // client ko kuch nahi gaya → retry
    }
    // Committed: headers go out, no further retry is possible.
    copy headers; w.WriteHeader(resp.StatusCode)
    io.CopyBuffer(w, resp.Body, pooledBuf)
    backend.InFlight.Add(-1)
    backend.ConsecutiveErrors.Store(0); backend.Alive.Store(true)
    return
}
http.Error(w, "all backends failed", http.StatusBadGateway)   // 502`, after:`<ul><li><strong>Discard body</strong> fail hone pe bhi — warna keep-alive connection reuse nahi hota.</li><li><code>r.Context()</code> → client disconnect ho jaaye to backend request bhi cancel.</li><li>Successful response = passive health signal (<code>Alive=true</code>).</li><li>Latency sample har 64th request pe, max 8,192 samples (bounded memory).</li></ul>`}
],
say:`For each request, the load balancer reads the body into a pooled buffer with a 1 MiB limit — reading one extra byte to detect oversize and returning 413. It then loops over backends: pick the least-loaded untried one, forward with the client's context and cleaned headers, and increment in-flight. On a transport error or 5xx it drains and closes the response so the connection can be reused, marks the backend tried and continues — safe because nothing has reached the client yet. On success it copies headers and streams the body, which commits the response, updates health and returns. If every backend fails, the client gets 502.`,
hook:`Pool buffer ≤1 MiB (413) → least untried → RoundTrip → err/5xx: drain + retry → OK: commit + stream → sab fail: 502.`,
check:[
[`LimitReader me maxRetryBody+1 kyun?`,`Ek extra byte aaya matlab body limit se badi → 413.`],
[`Failed response body discard kyun?`,`Keep-alive connection reuse ke liye.`]
]
},
{
h:`Least-connections function line by line`,
words:[
[`Tie`,`Do backends ka load barabar.`],
[`Deprioritize`,`Kam preference dena, poori tarah hataana nahi.`],
[`1 &lt;&lt; 20`,`2²⁰ = 1,048,576 — bahut bada penalty number.`]
],
steps:[
{t:`Code`, code:`
func (lb *LoadBalancer) selectBackendExcluding(tried map[*Backend]bool) *Backend {
    n := len(lb.backends)
    startIdx := int(lb.currIndex.Add(1))        // har call pe start aage
    var best *Backend
    var bestLoad int64
    for i := 0; i < n; i++ {
        b := lb.backends[(startIdx+i)%n]
        if tried[b] { continue }               // is request ke liye try ho chuka
        load := b.InFlight.Load()
        if !b.Alive.Load() {
            load += 1 << 20                    // down: last resort
        }
        if best == nil || load < bestLoad {    // strictly less → pehla min jeetta
            best, bestLoad = b, load
        }
    }
    return best
}`},
{t:`Example`, b:`<p>In-flight: B1=3, B2=3, B3=3 (sab alive). <code>startIdx</code> 7 → scan order B2, B3, B1 → sabka load 3 → <code>&lt;</code> strictly less, isliye <strong>pehla (B2)</strong> jeetta. Agli request startIdx 8 → B3 pehle → B3. Isliye ties <strong>baari-baari</strong>.</p><p>B2 down (in-flight 0): load = 0 + 1,048,576 → sirf tab chunega jab B1, B3 dono tried/unavailable hon.</p>`},
{t:`Down backend ko exclude kyun nahi kiya?`, b:`<p>Health check galat bhi ho sakta hai (e.g. <code>/health</code> overload se slow). Agar saare "down" mark ho gaye aur hum sabko exclude karein → <strong>total outage</strong> apni hi galti se. Penalty rakhne se: healthy available ho to wahi; koi na ho to phir bhi koshish.</p>`},
{t:`Concurrency note`, b:`<p>Do goroutines ek hi moment pe same backend chun sakti hain (dono ne load 3 padha). Ye <strong>approximate</strong> hai — chalega, kyunki agla decision updated count dekhega. Perfect ke liye lock lagana har request pe contention badhata.</p>`}
],
say:`selectBackendExcluding increments an atomic counter to get a rotating start index, then scans every backend once from there. It skips backends already tried for this request, reads each one's in-flight count, adds a penalty of two to the twentieth for backends marked down, and keeps the first strictly smaller load. Because the scan start rotates, equally loaded backends take turns. Down backends are penalised rather than excluded, so a faulty health check can't turn into a total outage. Two concurrent requests may occasionally pick the same backend, which is an acceptable approximation versus locking on every request.`,
hook:`Rotating start → skip tried → InFlight (+2²⁰ if down) → strictly less wins. Down = last resort, excluded nahi.`,
check:[
[`Loads 2, 5, 2 aur start index B3 se — kaun?`,`B3 (pehla minimum scan order me).`],
[`Down backend ko hata kyun nahi dete?`,`Health check galat ho to sab exclude → self-inflicted outage.`]
]
},
{
h:`Health checks: active + passive`,
words:[
[`Active health check`,`LB khud periodically <code>/health</code> ping kare.`],
[`Passive health check`,`Real traffic ke results se health samjho.`],
[`Flapping`,`Server baar-baar up/down hota dikhe.`],
[`Threshold`,`Kitni failures ke baad down maano.`]
],
steps:[
{t:`State machine`, d:`health`},
{t:`Code`, code:`
func (lb *LoadBalancer) healthLoop() {
    ticker := time.NewTicker(lb.healthInterval)          // flag, default 1s
    for range ticker.C {
        for _, b := range lb.backends {
            go func(backend *Backend) {
                ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
                defer cancel()
                resp, err := lb.healthClient.Do(GET backend/health)
                if err == nil && resp.StatusCode == http.StatusOK {
                    backend.Alive.Store(true)
                    backend.ConsecutiveErrors.Store(0)
                    return
                }
                if backend.ConsecutiveErrors.Add(1) >= 3 {
                    backend.Alive.Store(false)
                }
            }(b)
        }
    }
}`},
{t:`Design choices`, b:`<ul><li><strong>3 failures</strong> → ek network blip pe backend "down" nahi (flapping kam).</li><li><strong>1 success</strong> → turant up (fast recovery). Trade-off: flaky backend jaldi wapas aa jaata.</li><li>Har backend ka probe <strong>parallel goroutine</strong> → ek slow backend baaki checks nahi rokta.</li><li><strong>Passive:</strong> successful proxied request bhi <code>Alive=true</code> set karta hai.</li></ul>`},
{t:`Honest improvements`, b:`<ul><li>Interval 1 s aur timeout 2 s → slow backend pe probes <strong>overlap</strong> ho sakte (purana abhi chal raha, naya shuru). Fix: per-backend "probe in progress" flag.</li><li>Recovery ke liye bhi threshold (e.g. 2 successes) → flapping kam.</li><li>Passive failures (5xx) ko bhi ConsecutiveErrors me ginna (abhi TotalErrors badhta hai).</li><li>Circuit breaker: bahut errors pe thodi der ke liye traffic rok ke half-open test.</li></ul>`}
],
say:`Every health interval — one second by default — the load balancer probes each backend's /health endpoint in its own goroutine with a two-second timeout. A 200 marks the backend alive and resets its failure count; three consecutive failures mark it down. A successful proxied request also marks it alive, which is a passive signal. Requiring three failures avoids flapping on a single blip, while one success brings a backend back quickly. I'd improve it by preventing overlapping probes when a backend is slow, requiring more than one success to recover, and counting live 5xx responses toward health, or adding a circuit breaker.`,
hook:`Probe har 1 s (flag), timeout 2 s, parallel. 3 fail → down, 1 success → up. Passive: successful request = alive.`,
check:[
[`Sirf 1 failure pe down kyun nahi?`,`Network blip pe flapping hoti.`],
[`Probe overlap kab ho sakta?`,`Timeout (2 s) interval (1 s) se bada hai aur backend slow hai.`]
]
},
{
h:`Retry: kab safe hai, idempotency, retry storms`,
words:[
[`Idempotent`,`Dobara karne pe effect ek hi baar (GET, PUT; POST aam taur pe nahi).`],
[`Idempotency key`,`Client ka unique ID jisse server duplicate pehchaane.`],
[`Retry storm`,`Failures pe sab retry → load aur badhe → aur failures.`],
[`Retry budget`,`Retries total traffic ke kuch % tak limit.`]
],
steps:[
{t:`Retry ki do conditions`, b:`<ol><li><strong>Client ko abhi kuch nahi gaya</strong> (headers commit nahi). Stream shuru ho gaya to aadha response + naya response = corrupt.</li><li><strong>Operation dobara karna safe ho.</strong> POST /message do backends pe gaya to duplicate message ban sakta hai!</li></ol>`},
{t:`Duplicate kaise nahi bante`, d:`writePath`, b:`<ul><li>Client har message ke saath <strong>message ID</strong> bhejta hai.</li><li>Backend: <code>seenIDs.LoadOrStore(id)</code> → pehle dekha to <code>duplicate_ignored</code> ack.</li><li>DB: <code>id</code> PRIMARY KEY + <code>INSERT ... ON CONFLICT (id) DO NOTHING</code> → alag backends pe gaya retry bhi ek row.</li><li>Feed store: id pehle se hai to add nahi.</li></ul>`},
{t:`Gap (honest)`, b:`<p>Client ID na bheje to backend <code>newMessageID()</code> khud banata hai (counter + time). Retry pe doosra backend <strong>naya ID</strong> banayega → <strong>duplicate possible</strong>. Fix: LB request pe ID assign kare (header) taaki retries same ID le jaayein, ya client ID required karo.</p>`},
{t:`Retry storms se bachav`, b:`<ul><li>Max attempts = backends count (3) aur <strong>untried</strong> hi → ek request max 3 tries.</li><li>Production me aur: retry budget (e.g. ≤10% extra), exponential backoff + jitter, deadline propagate.</li></ul>`}
],
say:`Retrying is only safe before anything reaches the client and when repeating the operation is harmless. Message POSTs aren't naturally idempotent, so safety comes from message IDs: each backend deduplicates with a sync.Map of seen IDs, the database uses the ID as primary key with ON CONFLICT DO NOTHING, and the feed skips known IDs — so a message retried on a different backend is stored once. The gap is that when a client omits the ID, each backend generates its own, so a retry could duplicate; the load balancer should assign the ID. Retries are bounded to one attempt per backend, and in production I'd add a retry budget and backoff to avoid retry storms.`,
hook:`Retry safe = kuch nahi bheja + idempotent. Message ID → seenIDs + PK ON CONFLICT. Client ID na de → gap.`,
check:[
[`Response stream shuru hone ke baad retry kyun nahi?`,`Client ko aadha response ja chuka — mix/corrupt ho jaayega.`],
[`Alag backends pe retry hua message DB me ek kaise?`,`id PRIMARY KEY + ON CONFLICT DO NOTHING.`]
]
},
{
h:`Backend design: fast accept, batched writes, fast feed`,
words:[
[`Batching`,`Kai rows ek INSERT me.`],
[`Write-behind`,`Pehle memory, DB me baad me.`],
[`AES-GCM`,`Authenticated encryption (confidentiality + tamper detection).`],
[`Ed25519`,`Fast digital signature algorithm.`],
[`Pre-rendered`,`Response pehle se bana ke rakhna.`]
],
steps:[
{t:`POST /message path`, code:`
if _, loaded := a.seenIDs.LoadOrStore(msgID, struct{}{}); loaded {
    a.writeAck(w, "duplicate_ignored", msgID, clientName); return
}
a.feed.add(msgID, clientName, msg, a.name, now)      // "Feed first: correctness never waits on the database."
select {
case a.msgChan <- &rawMessage{...}:                  // 131,072 capacity
default:
    a.dropped.Add(1)                                  // queue full → DB write drop!
}
a.writeAck(w, "success", msgID, clientName)`},
{t:`Writer goroutine: 500 rows ya 25 ms`, code:`
sb.WriteString("INSERT INTO messages (id, client_name, ciphertext, nonce, signature, created_at) VALUES ")
for i, m := range batch {
    // ($1,$2,...,$6),($7,...)   — parameterized, SQL injection safe
    cipherB64, nonceB64 := a.encrypt(m.plaintext)      // AES-GCM
    sig := a.sign(priv, m.clientName, cipherB64, nonceB64)   // Ed25519, per-client key
}
sb.WriteString(" ON CONFLICT (id) DO NOTHING")`, after:`<p><strong>Kyun batch?</strong> 500 alag INSERTs = 500 round trips + 500 commits. Ek multi-row INSERT = ek round trip. Encryption/signing bhi request path se <strong>bahar</strong> → request fast.</p>`},
{t:`GET /feed: scan nahi, ready buffer`, b:`<ul><li>Feed memory me <strong>pre-rendered JSON array</strong> (append pe hi JSON bytes jodte hain) → GET = buffer write, DB scan + decrypt nahi.</li><li><strong>Snapshot:</strong> immutable copy jo lock ke bina likhi ja sake; <code>snapshotFresh(250ms)</code> load me baar-baar poora copy nahi.</li><li>Body &gt; 4 KB aur client gzip accept kare → <strong>cached gzip</strong> (chat text ~8× compress, code comment ke hisaab se).</li><li>Bahut concurrent feed calls → sirf recent tail (throughput reads); akela end-of-run read → exact full feed.</li></ul>`},
{t:`Trade-offs (zaroor bolo)`, b:`<div class="tbl-wrap"><table><tr><th>Choice</th><th>Fayda</th><th>Risk</th></tr><tr><td>Ack before DB commit</td><td>low latency</td><td>crash pe batch me pade messages lost</td></tr><tr><td>Queue full → drop DB write</td><td>request block nahi</td><td>durability loss (counter track karta)</td></tr><tr><td><code>UNLOGGED</code> table</td><td>WAL skip → fast inserts</td><td>Postgres crash pe data jaa sakta</td></tr><tr><td><code>seenIDs</code> sync.Map</td><td>fast dedupe</td><td>unbounded growth</td></tr><tr><td>AES key source me</td><td>lab spec</td><td>prod me KMS/env secret</td></tr></table></div><p>Benchmark data disposable tha, isliye ye trade-offs lab ke liye theek the. Real chat app ke liye: commit ke baad ack ya durable log (Kafka/WAL) pehle.</p>`}
],
say:`The backend accepts a message by deduplicating on its ID, appending it to an in-memory feed, queueing it for the database and acknowledging immediately — the code comment says correctness never waits on the database. A single writer goroutine batches up to 500 messages or 25 milliseconds into one parameterised multi-row INSERT with ON CONFLICT DO NOTHING, doing AES-GCM encryption and Ed25519 signing off the request path. The feed is kept as a pre-rendered JSON buffer with cached snapshots and gzip, so reads never scan or decrypt the table. The trade-offs are real: acknowledging before commit, dropping database writes when the queue is full, and an unlogged table all risk losing data on a crash, which was acceptable for disposable benchmark data but not for a real chat system.`,
hook:`Dedupe → feed.add → chan → ack. Writer: 500/25ms multi-row INSERT + crypto. Feed = pre-rendered JSON + gzip. Ack-before-commit, drop-on-full, UNLOGGED = risks.`,
check:[
[`Batch insert ka main fayda?`,`Kam round trips/commits → zyada throughput.`],
[`UNLOGGED table ka risk?`,`WAL nahi → Postgres crash pe data loss.`]
]
},
{
h:`Replication aur consistency: teen backends ek feed kaise`,
words:[
[`Replication`,`Same data kai nodes pe.`],
[`Monotonic sequence`,`Hamesha badhne wala number (bigserial).`],
[`Eventual consistency`,`Thodi der ke liye nodes alag, phir same.`],
[`CAP`,`Network partition pe Consistency vs Availability me se choose.`],
[`Watermark`,`"Yahan tak dekh liya" wala marker.`]
],
steps:[
{t:`Problem`, b:`<p>LB message ko kisi bhi backend pe bhejta hai. User <code>GET /feed</code> kisi aur backend se kare to usme <strong>saare</strong> messages hone chahiye.</p>`},
{t:`Solution: shared Postgres + seq pull`, code:`
// har 300 ms
rows := SELECT id, client_name, ciphertext, nonce, created_at, seq
        FROM messages WHERE seq > $1 ORDER BY seq ASC      // $1 = lastSync
for each row: if !feed.has(id) { decrypt; feed.add(...) }
lastSync = newest - seqSafety   // 2000 peeche rakho`, after:`<ul><li><code>seq bigserial</code> + index → sirf naye rows (O(new rows)), poori table nahi.</li><li><strong>Overlap (seqSafety 2000) kyun?</strong> Batches alag-alag backends se <strong>out of order commit</strong> hote: seq 105 commit ho gaya, 101 abhi transaction me. Watermark exact 105 pe rakha to 101 kabhi nahi padhega. Overlap re-read karta hai; known IDs decrypt se pehle skip → sasta.</li><li><strong>Reconcile (har 3 s):</strong> DB <code>count(*)</code> &gt; feed count → <code>seqRepair</code> 5000 peeche se scan.</li></ul>`},
{t:`Authoritative read`, b:`<p>Completeness wale feed read se pehle <code>refreshFeed()</code>: peers ko <code>POST /peer/flush</code> (unki queue + in-flight batch commit), khud <code>drainLocal()</code>, phir sync + reconcile. Bahut concurrent callers ek hi in-flight refresh share karte (coalescing) — code comment ke hisaab se per-request refresh ne 500 users pe throughput 738 → 200 rps gira diya tha.</p>`},
{t:`Consistency model (interview language)`, b:`<ul><li><strong>Eventually consistent</strong> feed: ~300 ms sync window; flush se read-your-writes jaisa behaviour authoritative read pe.</li><li>Postgres <strong>single node</strong> = shared source of truth aur <strong>single point of failure</strong>.</li><li>"Replicated" = har backend ke paas feed ki poori in-memory copy; DB level replication nahi.</li><li>CAP: partition me backend apni memory se serve karta (available) lekin stale ho sakta.</li></ul>`}
],
say:`Any backend may receive a message, but any backend must serve the complete feed. They share PostgreSQL: every 300 milliseconds each node pulls rows with a sequence number above its watermark, skipping IDs it already holds. Because batches from different nodes can commit out of order, the watermark is held 2,000 sequence numbers behind the newest row so late commits are still picked up, and a reconcile every three seconds compares the row count and rescans a wider window. Before an authoritative read, a node asks peers to flush their write queues and coalesces concurrent refreshes. So the feed is eventually consistent within about one sync interval, and the single Postgres instance is both the source of truth and a single point of failure.`,
hook:`seq > watermark har 300 ms. Watermark 2000 peeche (out-of-order commits). Reconcile 3 s. Peer flush before authoritative read. Eventual consistency; Postgres SPOF.`,
check:[
[`Watermark exact newest seq pe rakhne me kya bug?`,`Out-of-order commit wale chhote seq rows kabhi nahi padhe jaate.`],
[`"3 replicated backends" ka asli matlab?`,`Har backend ke paas poora feed memory me; shared Postgres se sync. DB replicated nahi.`]
]
}
],
cards:[
{q:`Walk me through a request in your load balancer.`, s:`Pool buffer (≤1 MiB, 413) → least untried backend → RoundTrip → err/5xx drain + retry → success commit + stream → 502 if all fail.`, a:`It buffers the body up to 1 MiB, returning 413 if larger, picks the least-loaded untried backend, and forwards with cleaned headers. On a transport error or 5xx it drains the response and retries another backend; on success it copies headers and streams the body, which commits the response. If every backend fails, it returns 502.`},
{q:`Explain your least-connections selection code.`, s:`Rotating start (atomic), skip tried, load = InFlight (+2²⁰ if down), strictly smaller wins → ties rotate.`, a:`An atomic counter gives a rotating start index; the scan skips backends already tried, uses each in-flight count plus a huge penalty if marked down, and keeps the first strictly smaller load, so ties rotate across backends.`},
{q:`Why penalise down backends instead of excluding them?`, s:`Health check galat ho sakta; sab exclude = self-inflicted outage. Last resort.`, a:`A health check can be wrong — for example an overloaded health endpoint. Excluding all flagged backends could cause a total outage, so they're only used when nothing healthier is available.`},
{q:`How do your health checks work?`, s:`Har interval (default 1 s) parallel GET /health, 2 s timeout. 3 consecutive fail → down; 1 success → up. Successful request = passive alive.`, a:`Each interval, one second by default, a goroutine per backend probes /health with a two-second timeout. Three consecutive failures mark a backend down and one success marks it up; successful proxied requests also mark it alive.`},
{q:`How would you improve the health checking?`, s:`Overlapping probes rokna, recovery threshold, live 5xx count karna, circuit breaker.`, a:`Prevent overlapping probes on slow backends, require multiple successes before marking a backend up, count live 5xx responses toward health, and add a circuit breaker with half-open testing.`},
{q:`When is it safe to retry a request?`, s:`Client ko kuch nahi gaya + operation idempotent. Message ID dedupe (seenIDs + PK ON CONFLICT).`, a:`Only before any response bytes reach the client, and only if repeating it is harmless. For message POSTs, safety comes from client message IDs: backends deduplicate in memory and the database uses the ID as a primary key with ON CONFLICT DO NOTHING.`},
{q:`Where can retries still create duplicates?`, s:`Client ID na bheje → har backend naya ID → duplicate. Fix: LB ID assign kare.`, a:`If a client omits the message ID, each backend generates its own, so a retried message could be stored twice. The fix is for the load balancer to assign an ID before the first attempt, or to require one.`},
{q:`How do you avoid retry storms?`, s:`Max 1 try per backend (3 total). Prod: retry budget, backoff + jitter, deadlines.`, a:`Each request tries each backend at most once. In production I'd add a retry budget capping retries as a share of traffic, exponential backoff with jitter, and deadline propagation.`},
{q:`How does the backend handle writes efficiently?`, s:`Dedupe → in-memory feed → channel → ack. Writer goroutine 500 rows / 25 ms multi-row INSERT, crypto off request path.`, a:`It deduplicates, appends to an in-memory feed, queues the message and acknowledges. One writer goroutine batches up to 500 messages or 25 milliseconds into a single parameterised multi-row insert, with encryption and signing done off the request path.`},
{q:`What durability trade-offs did you make?`, s:`Ack before commit, queue full → drop DB write, UNLOGGED table, unbounded seenIDs. Lab ke liye theek; prod me commit-then-ack / durable log.`, a:`Acknowledging before commit, dropping database writes when the queue is full, and using an unlogged table all risk data loss on a crash, and the seen-ID map grows without bound. That was acceptable for disposable benchmark data; a real system would acknowledge after commit or write to a durable log first.`},
{q:`How is GET /feed fast?`, s:`Pre-rendered JSON buffer, snapshot cache (250 ms under load), cached gzip > 4 KB, concurrent readers tail.`, a:`The feed is maintained as a pre-rendered JSON buffer, served from a cached snapshot and a cached gzip copy for larger bodies, so reads never scan or decrypt the table; heavily concurrent reads get a recent tail.`},
{q:`How do the three backends stay consistent?`, s:`Shared Postgres, har 300 ms seq > watermark pull, watermark 2000 peeche, reconcile 3 s, peer flush before authoritative read. Eventual.`, a:`Each node pulls rows above a sequence watermark from the shared database every 300 milliseconds, keeping the watermark 2,000 behind to catch out-of-order commits, reconciles counts every three seconds, and asks peers to flush before an authoritative read. It's eventually consistent within about one sync interval.`},
{q:`Why hold the sync watermark behind the newest sequence?`, s:`Batches out of order commit: 105 commit, 101 abhi pending. Exact watermark → 101 miss. Overlap re-read; known IDs skip.`, a:`Batches from different nodes commit out of order, so a lower sequence number can appear after a higher one is visible. Holding the watermark back re-reads a bounded overlap, and already-known IDs are skipped cheaply.`}
]
});
