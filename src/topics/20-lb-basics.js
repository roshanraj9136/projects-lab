TOPICS.push({
id:'lb-basics', name:'Load Balancer 1 · Basics: networking, load balancing, Go concurrency', group:'Fault-Tolerant HTTP Load Balancer (Go)', tier:'crit',
intro:`Resume: "Developed a Go reverse-proxy load balancer with least-connections routing, active health checks, and retry on another backend, in front of 3 replicated Go backends and PostgreSQL on 4 containers capped at 1 CPU / 512 MiB." Backend/infra interview ki neev: TCP, HTTP, keep-alive, reverse proxy, algorithms, goroutines. Pehle ye pakka karo, phir code.`,
lessons:[
{
h:`Project ek nazar me + 60 second story`,
words:[
[`Load balancer (LB)`,`Traffic ko kai servers me baantne wala server.`],
[`Backend`,`Asli kaam karne wala server (yahan message service).`],
[`Container`,`Isolated process environment (Docker jaisa) jiski CPU/memory limit set.`],
[`Distributed Systems Lab`,`IIT Bhilai ka lab course jiske graded leaderboard ke liye ye bana.`]
],
steps:[
{t:`Kya banaya`, d:`lbTopology`, b:`<ul><li><strong>Load balancer</strong> (Go): least-connections routing, active health checks, retry on untried backend, metrics.</li><li><strong>3 backends</strong> (Go): chat message service — <code>POST /message</code>, <code>GET /feed</code>; in-memory feed, batched PostgreSQL writes, peer sync.</li><li><strong>Load generator</strong> (Go client): latency p50/p95/p99, throughput.</li><li>Sab plain Go standard library + <code>lib/pq</code>.</li></ul>`},
{t:`Constraint jo har decision chalata tha`, b:`<p>4 Linux containers, har ek <strong>exactly 1 CPU aur 512 MiB memory</strong> (cgroup limits). Graded harness load <strong>2,500 concurrent users</strong> tak le jaata tha. Ranking: feed correctness → error % → latency.</p>`},
{t:`Story (2 hisse)`, b:`<ol><li><strong>Design:</strong> least-connections LB + fault tolerance (health checks, retry).</li><li><strong>Debugging:</strong> graded run me <strong>~18% errors</strong> → root cause <strong>OOM kills</strong> (container memory limit) → memory fixes → <strong>0 errors over 60,000 requests</strong> up to 2,500 users.</li></ol>`},
{t:`Numbers`, b:`<div class="tbl-wrap"><table><tr><th>Number</th><th>Kya</th></tr><tr><td>1 CPU / 512 MiB</td><td>per container (4 containers)</td></tr><tr><td>18% → 0</td><td>error rate</td></tr><tr><td>60,000</td><td>requests (2 graded runs)</td></tr><tr><td>2,500</td><td>max concurrent users</td></tr><tr><td>121</td><td>oom_kill events mile</td></tr><tr><td>364 / 512 MB</td><td>LB peak memory after fix</td></tr></table></div>`}
],
say:`For my Distributed Systems Lab I built a load balancer in Go in front of three Go backends that serve a chat feed backed by PostgreSQL, running on four containers each capped at one CPU and 512 MiB. The load balancer uses least-connections routing, active health checks, and retries a failed request on a backend it hasn't tried. Under the graded load test the system first failed about 18% of requests; I traced that to the load balancer being OOM-killed by its container memory limit, cut memory use, and got to zero errors over 60,000 requests at up to 2,500 concurrent users.`,
hook:`LB + 3 backends + Postgres · 1 CPU/512 MiB · 18% → 0 over 60,000 · 2,500 users · 121 OOM kills.`,
check:[
[`Container limits kya the?`,`1 CPU, 512 MiB memory each.`],
[`18% errors ka root cause?`,`LB process container memory limit pe OOM-kill ho raha tha.`]
]
},
{
h:`Networking basics: TCP, HTTP, keep-alive, status codes`,
words:[
[`TCP`,`Reliable connection protocol. Shuru me 3-way handshake (SYN, SYN-ACK, ACK).`],
[`HTTP`,`TCP ke upar request/response protocol: method, path, headers, body.`],
[`Keep-alive`,`Ek TCP connection pe kai HTTP requests (baar-baar handshake nahi).`],
[`Connection refused`,`Us port pe koi process listen nahi kar raha → turant fail.`],
[`Timeout`,`Response itni der me nahi aaya.`]
],
steps:[
{t:`Ek HTTP request ka safar`, b:`<ol><li>DNS/IP → TCP connect (handshake).</li><li>HTTP request bhejo: <code>POST /message</code> + headers + JSON body.</li><li>Server response: status code + headers + body.</li><li>Connection band ya <strong>reuse</strong> (keep-alive).</li></ol>`},
{t:`Keep-alive kyun important`, d:`keepalive`, b:`<p>LB → backend har request pe naya TCP connection banaye to handshake cost × hazaaron requests. Go ka <code>http.Transport</code> connections <strong>pool</strong> me rakhta hai. Is project me: backend ke liye max 512 connections, 256 idle, startup pe <strong>warmup</strong> (64 connections per backend pre-open).</p>`},
{t:`Status codes jo is project me aate hain`, b:`<div class="tbl-wrap"><table><tr><th>Code</th><th>Matlab</th><th>Yahan kab</th></tr><tr><td>200</td><td>OK</td><td>message accepted / feed</td></tr><tr><td>400</td><td>Bad request</td><td>body read error</td></tr><tr><td>405</td><td>Method not allowed</td><td>GET /message</td></tr><tr><td>413</td><td>Payload too large</td><td>body &gt; 1 MiB (LB)</td></tr><tr><td>502</td><td>Bad gateway</td><td>LB: saare backends fail</td></tr><tr><td>5xx from backend</td><td>server error</td><td>LB retry trigger</td></tr></table></div>`},
{t:`Refused vs timeout — debugging clue`, b:`<p><strong>Timeout</strong> = server hai lekin slow/overloaded. <strong>Connection refused</strong> = us waqt koi listen hi nahi kar raha (process mar gaya / restart ho raha). OOM story me "zero timeouts + instant errors" ne yahi clue diya ki process <strong>mar</strong> raha tha.</p>`}
],
say:`An HTTP request rides on a TCP connection that needs a handshake before any data flows. Keep-alive reuses connections for many requests, so the load balancer keeps a pool per backend — up to 512 connections with 256 idle — and warms it up at start to avoid a handshake stampede. The status codes that matter here are 413 for oversized bodies, 502 when every backend fails, and backend 5xx responses, which trigger a retry. Distinguishing refusals from timeouts was key in debugging: refusals mean nothing is listening, timeouts mean something is slow.`,
hook:`Handshake mehenga → keep-alive pool (512/256, warmup). 413 bada body, 502 sab fail. Refused = process nahi, timeout = slow.`,
check:[
[`Connection refused ka matlab?`,`Port pe koi process listen nahi kar raha.`],
[`Keep-alive ka fayda?`,`Har request pe TCP handshake nahi → kam latency, kam CPU.`]
]
},
{
h:`Reverse proxy, L4 vs L7, hop-by-hop headers`,
words:[
[`Forward proxy`,`Client ki taraf se internet pe jaata (office proxy).`],
[`Reverse proxy`,`Servers ke aage baitha; client ko lagta wahi server hai (nginx, ye LB).`],
[`L4 LB`,`TCP/UDP level pe routing — HTTP content nahi dekhta.`],
[`L7 LB`,`HTTP level — path, headers, status code dekh sakta.`],
[`Hop-by-hop header`,`Sirf ek connection ke liye (Connection, Keep-Alive, Transfer-Encoding...) — aage forward nahi karte.`]
],
steps:[
{t:`Ye LB L7 hai`, b:`<p>Hamara LB HTTP request poori padhta hai (body buffer), response ka <strong>status code</strong> dekhta hai (5xx pe retry). Ye sab <strong>L7</strong> capabilities hain. L4 LB (jaise TCP-level) fast hota hai lekin 5xx pe retry nahi kar sakta.</p>`},
{t:`Headers copy, hop-by-hop hatao`, code:`
var hopHeaders = []string{
    "Connection", "Proxy-Connection", "Keep-Alive", "Proxy-Authenticate",
    "Proxy-Authorization", "Te", "Trailer", "Transfer-Encoding", "Upgrade",
}
for k, vv := range r.Header { req.Header[k] = vv }
for _, h := range hopHeaders { req.Header.Del(h) }`, after:`<p>Client–LB connection ke headers LB–backend connection pe lagu nahi hote. Forward kar diye to galat framing / connection behaviour ho sakta hai. RFC 7230 yahi kehta hai.</p>`},
{t:`Nginx/HAProxy/Envoy kyun nahi use kiya?`, b:`<p><strong>Lab ka goal</strong> load balancer khud banana aur samajhna tha. Production me main battle-tested proxy (nginx, HAProxy, Envoy) hi lunga — TLS, HTTP/2, observability, config reloads sab ready. Ye honest answer interviewer ko achha lagta hai.</p>`}
],
say:`The load balancer is a layer-7 reverse proxy: clients talk to it as if it were the server, and it reads the full HTTP request, forwards it to a backend and inspects the response status, which is what lets it retry on 5xx — a layer-4 balancer couldn't. It copies end-to-end headers but strips hop-by-hop ones like Connection, Keep-Alive and Transfer-Encoding, which only apply to a single connection. I built it to learn the internals for the lab; in production I'd use nginx, HAProxy or Envoy.`,
hook:`Reverse proxy, L7 (status dekh ke retry). Hop-by-hop headers strip. Prod me nginx/HAProxy/Envoy.`,
check:[
[`5xx pe retry L4 LB kar sakta hai?`,`Nahi — status code HTTP (L7) ki cheez hai.`],
[`Transfer-Encoding forward kyun nahi?`,`Hop-by-hop header hai, sirf ek connection ke liye.`]
]
},
{
h:`Load balancing algorithms: kab kaunsa`,
words:[
[`Round robin`,`Baari-baari: B1, B2, B3, B1...`],
[`Weighted`,`Taakatwar server ko zyada share.`],
[`Least connections`,`Jis pe abhi sabse kam active requests.`],
[`Consistent hashing`,`Key (user/session) se hamesha same server; server add/remove pe kam reshuffle.`],
[`Power of two choices`,`Random 2 pick, unme se kam loaded.`]
],
steps:[
{t:`Comparison`, d:`algos`, b:`<div class="tbl-wrap"><table><tr><th>Algorithm</th><th>Achha kab</th><th>Problem</th></tr><tr><td>Round robin</td><td>requests same cost</td><td>slow request wale server pe pile-up</td></tr><tr><td>Weighted RR</td><td>servers alag size</td><td>live load nahi dekhta</td></tr><tr><td><strong>Least connections</strong></td><td>requests alag duration</td><td>har decision pe state chahiye</td></tr><tr><td>IP/consistent hash</td><td>sticky sessions, caches</td><td>hot keys uneven</td></tr><tr><td>Power of two</td><td>bahut servers, cheap</td><td>thoda approximate</td></tr></table></div>`},
{t:`Yahan least-connections kyun`, b:`<p>Workload mixed: <code>POST /message</code> fast, <code>GET /feed</code> bada response (MBs tak). Round robin slow feed wale backend pe bhi barabar bhejta → queue. <strong>In-flight count</strong> live load ka seedha signal hai. Ties pe <strong>rotating start index</strong> → equal load wale backends baari-baari.</p>`},
{t:`Honest correction (yaad rakho)`, b:`<p>Purane README/resume me "round-robin + least-in-flight fallback" likha tha — <strong>galat</strong> tha; code least-connections karta hai. Ab sab jagah least-connections. Kabhi "round robin" mat bolna.</p>`}
],
say:`Round robin assumes requests cost the same, weighted round robin accounts for server size, hashing gives stickiness, power-of-two-choices is a cheap approximation at large scale, and least-connections routes to the server with the fewest in-flight requests. I used least-connections because the workload mixes fast message writes with feed reads that can return megabytes, so in-flight count is a direct signal of real load. Ties are broken with a rotating start index so equally loaded backends take turns.`,
hook:`Mixed request durations → least-connections. Ties → rotating start. "Round robin" kabhi mat bolna.`,
check:[
[`Sticky sessions chahiye to kaunsa algorithm?`,`IP/consistent hashing.`],
[`Round robin yahan kyun kharab?`,`Feed requests lambi; slow backend pe bhi barabar requests → pile-up.`]
]
},
{
h:`Go concurrency basics jo code me hain`,
words:[
[`Goroutine`,`Go ka lightweight thread (chhota stack, runtime schedule karta hai).`],
[`Channel`,`Goroutines ke beech data bhejne ki pipe.`],
[`select`,`Kai channel operations me se jo ready ho woh chalao.`],
[`atomic`,`Lock ke bina thread-safe counter operations.`],
[`sync.Pool`,`Temporary objects reuse karne ka pool.`],
[`context`,`Timeout/cancellation request ke saath pass karna.`]
],
steps:[
{t:`net/http: har request ek goroutine`, b:`<p>Go ka HTTP server har incoming request ko <strong>alag goroutine</strong> me handle karta hai. 2,500 users = hazaaron goroutines — sasta, kyunki goroutine KBs se shuru hoti hai (OS thread MBs). Lekin shared state (counters, maps) <strong>race-safe</strong> honi chahiye.</p>`},
{t:`atomic counters`, code:`
type Backend struct {
    Alive             atomic.Bool
    InFlight          atomic.Int64
    TotalReqs         atomic.Uint64
    ConsecutiveErrors atomic.Int64
    ...
}
backend.InFlight.Add(1)     // lock nahi chahiye
load := b.InFlight.Load()`, after:`<p>Mutex ki jagah atomic: bahut chhote operations, har request pe — lock contention nahi.</p>`},
{t:`Channel + select (backend writer)`, code:`
for {
    select {
    case msg := <-a.msgChan:          // naya message
        batch = append(batch, msg)
        // ... 500 ho gaye to insert
    case <-ticker.C:                  // har 25 ms
        if len(batch) > 0 { a.insertBatch(batch); batch = batch[:0] }
    case done := <-a.flushReq:        // koi "abhi flush karo" bole
        // drain + insert, close(done)
    }
}`},
{t:`sync.Pool, sync.Map, context`, b:`<ul><li><strong>sync.Pool:</strong> request body buffers reuse → har request pe naya allocation nahi (OOM fix ka hissa).</li><li><strong>sync.Map:</strong> <code>seenIDs</code> (duplicate message IDs) — concurrent read-heavy map.</li><li><strong>context.WithTimeout:</strong> health probe 2 s, DB query timeouts — atke hue calls goroutines leak na karein.</li></ul>`}
],
say:`Go's HTTP server runs each request in its own goroutine, which is cheap enough for thousands of concurrent users, so shared state must be safe. Per-backend counters like in-flight requests and health are atomics, avoiding lock contention on the hot path. The backend's writer goroutine uses select over a message channel, a 25-millisecond ticker and a flush-request channel to batch database inserts. sync.Pool reuses request buffers, sync.Map tracks seen message IDs, and contexts put timeouts on health probes and database queries so stuck calls don't leak goroutines.`,
hook:`Goroutine per request. atomic counters. select(msgChan, ticker, flushReq). Pool buffers. sync.Map seenIDs. context timeouts.`,
check:[
[`InFlight ke liye mutex ki jagah atomic kyun?`,`Chhota operation har request pe — lock contention se bachne.`],
[`select me ticker case ka kaam?`,`500 na bhi hon to har 25 ms batch flush.`]
]
}
],
cards:[
{q:`Give me a 60-second overview of your load balancer project.`, s:`Go LB (least-conn, health, retry) + 3 Go backends + Postgres, 4 containers 1 CPU/512 MiB. 18% errors → OOM kills → memory fixes → 0 / 60,000 at 2,500 users.`, a:`For my Distributed Systems Lab I built a Go load balancer with least-connections routing, active health checks and retries, in front of three Go backends and PostgreSQL on four containers capped at one CPU and 512 MiB. The graded load test initially failed about 18% of requests; I traced that to OOM kills of the load balancer, reduced memory, and reached zero errors over 60,000 requests at up to 2,500 users.`},
{q:`Why does connection reuse matter for a load balancer?`, s:`TCP handshake har request pe mehenga. Pool (512 max, 256 idle) + warmup → latency flat.`, a:`Every new TCP connection costs a handshake, which adds latency and CPU at thousands of requests per second. Keeping a pool of up to 512 connections per backend, 256 idle, and warming it at startup keeps latency flat.`},
{q:`Connection refused vs timeout — what does each tell you?`, s:`Refused = koi listen nahi (process dead/restarting). Timeout = server hai par slow.`, a:`A refusal means nothing is listening on that port — the process is down or restarting. A timeout means something accepted or is reachable but is too slow. That distinction pointed me to crashes in the OOM investigation.`},
{q:`Is your load balancer L4 or L7? Why does it matter?`, s:`L7: HTTP body buffer, status dekh ke 5xx retry, headers handle. L4 ye nahi kar sakta.`, a:`Layer 7. It reads full HTTP requests and inspects response status codes, which is what enables retrying on 5xx and rejecting oversized bodies with 413. A layer-4 balancer only sees TCP streams.`},
{q:`What are hop-by-hop headers?`, s:`Connection, Keep-Alive, Transfer-Encoding, Upgrade, TE, Trailer, Proxy-*: ek connection ke liye; proxy strip karta hai.`, a:`Headers like Connection, Keep-Alive, Transfer-Encoding, Upgrade and the Proxy headers apply to a single connection, so a proxy must strip them rather than forward them to the next hop.`},
{q:`Compare load-balancing algorithms.`, s:`RR same-cost; weighted size; least-conn variable duration; hash stickiness; power-of-two cheap at scale.`, a:`Round robin suits equal-cost requests, weighted round robin handles unequal servers, least-connections adapts to variable request durations, hashing provides stickiness, and power-of-two-choices approximates least-load cheaply at large scale.`},
{q:`Why least-connections for this project?`, s:`Fast writes + slow multi-MB feed reads mix → in-flight count = live load. Ties rotating start.`, a:`The workload mixed quick message writes with feed reads that could return megabytes, so request durations varied widely. In-flight count reflects actual load, and a rotating start index breaks ties fairly.`},
{q:`Why use nginx or Envoy in production instead of your own?`, s:`Battle-tested: TLS, HTTP/2, observability, hot reload. Mine lab me internals seekhne ke liye.`, a:`They're battle-tested and provide TLS, HTTP/2, rich observability and safe config reloads. I built mine to learn the internals for the lab; in production I'd use a proven proxy.`},
{q:`How does Go handle thousands of concurrent requests?`, s:`net/http har request goroutine; goroutines KB stack, runtime M:N scheduling. Shared state atomic/sync.`, a:`net/http serves each request in a goroutine, which starts with a small growable stack and is multiplexed onto OS threads by the runtime, so thousands are cheap. Shared state uses atomics, sync primitives or channels.`},
{q:`Where did you use channels and select?`, s:`Backend writeLoop: select msgChan / 25 ms ticker / flushReq → batch insert.`, a:`In the backend's writer goroutine: a select over the message channel, a 25-millisecond ticker and a flush-request channel collects messages into batches of up to 500 and inserts them into PostgreSQL.`}
]
});
