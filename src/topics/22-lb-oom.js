TOPICS.push({
id:'lb-oom', name:'Load Balancer 3 · OOM debugging story, Go memory, scaling + tough questions', group:'Fault-Tolerant HTTP Load Balancer (Go)', tier:'liab',
intro:`Resume: "Traced an 18% error rate to OOM kills (cgroup memory events); cut memory via snapshot caching, sync.Pool buffers, and GOMEMLIMIT/GOGC tuning: 0 errors over 60,000 requests at up to 2,500 concurrent users." Ye tumhari sabse strong engineering story hai. Pehle memory basics (cgroups, Go GC), phir investigation isi order me jaise hua, phir fixes, verification aur scaling ke tough sawal.`,
lessons:[
{
h:`Basics: container memory limit, cgroups, OOM killer`,
words:[
[`cgroup`,`Linux feature jo process group ka CPU/memory limit lagata hai. Containers isi pe chalte hain.`],
[`memory.max`,`cgroup v2 file: max memory (yahan 536870912 bytes = 512 MiB).`],
[`memory.events`,`File jisme counters: <code>max</code> (limit hit), <code>oom_kill</code> (kitne processes maare).`],
[`OOM killer`,`Memory limit cross → kernel process ko SIGKILL karta hai (koi warning/log nahi app me).`],
[`RSS`,`Process ki asli RAM usage.`]
],
steps:[
{t:`Container ke andar memory me kya-kya ginta hai`, b:`<ul><li>Go <strong>heap</strong> (objects, buffers).</li><li>Goroutine stacks, Go runtime overhead.</li><li><strong>Kernel socket buffers</strong> — har TCP connection ke send/receive buffers; cgroup inko bhi container ki 512 MiB me ginta hai, lekin Go ka heap profiler inhe <strong>nahi dekhta</strong>.</li><li>Page cache (files).</li></ul>`},
{t:`OOM kill kaisa dikhta hai`, b:`<p>Process achanak mar jaata hai — <strong>koi Go panic nahi, koi error log nahi</strong> (SIGKILL pakda nahi ja sakta). Supervisor script restart karta hai. Bahar se sirf "kuch der service gayab" dikhta hai.</p>`},
{t:`Kaise confirm karein`, code:`
cat /sys/fs/cgroup/memory.max        # 536870912  (512 MiB)
cat /sys/fs/cgroup/memory.events     # ... max <N>  oom_kill <N>
cat /sys/fs/cgroup/cpu.max           # 100000 100000  (1 CPU)`, after:`<p>Ye files container ke <strong>andar</strong> se padho. Laptop pe load test se ye bug reproduce nahi hota — wahan 512 MiB limit hi nahi.</p>`}
],
say:`Containers enforce limits through Linux cgroups. Here each container had memory.max of 512 MiB and cpu.max of exactly one CPU. Everything counts toward that memory limit — the Go heap, goroutine stacks, and kernel socket buffers for every TCP connection, which Go's own heap profiling doesn't show. When the limit is exceeded the kernel's OOM killer sends SIGKILL, so the process dies with no panic or log line. The evidence lives in the cgroup's memory.events file, which counts limit hits and OOM kills, and you have to read it inside the container because a dev machine without the limit never reproduces it.`,
hook:`512 MiB me heap + stacks + kernel socket buffers. OOM = SIGKILL, koi log nahi. Proof: memory.events → oom_kill.`,
check:[
[`OOM kill hone pe app log me panic kyun nahi?`,`SIGKILL catch nahi hota; kernel seedha maar deta hai.`],
[`Laptop pe reproduce kyun nahi hua?`,`Wahan container ki 512 MiB limit nahi.`]
]
},
{
h:`Go memory basics: GC, GOGC, GOMEMLIMIT, sync.Pool`,
words:[
[`Garbage collector (GC)`,`Unused objects ki memory apne aap wapas lena.`],
[`Live heap`,`Abhi use ho rahe objects ki memory.`],
[`GOGC`,`Heap live heap se kitna % badhe tab GC chale. Default 100 (= double hone pe).`],
[`GOMEMLIMIT`,`Go runtime ko soft memory limit — paas aate hi GC zyada chalata hai.`],
[`Allocation rate`,`Har second kitni nayi memory maangi.`]
],
steps:[
{t:`GOGC ka math`, b:`<p>Live heap = 100 MB.</p><ul><li><code>GOGC=100</code> → GC tab jab heap ~<strong>200 MB</strong>.</li><li><code>GOGC=400</code> → ~<strong>500 MB</strong> (512 MiB container me khatarnaak!).</li><li><code>GOGC=80</code> → ~<strong>180 MB</strong>.</li></ul><p>Kam GOGC = kam peak memory, lekin GC zyada baar = zyada CPU (aur yahan sirf 1 CPU).</p>`},
{t:`GOMEMLIMIT kyun zaroori`, b:`<p>GOGC sirf "relative" hai — container limit ka pata nahi. <code>GOMEMLIMIT=240MiB</code> (LB) bolta hai: "is total ke paas aao to GC aggressive karo". Limit <strong>512 se kaafi neeche</strong> rakha kyunki kernel socket buffers aur baaki overhead Go ke hisaab se bahar hain.</p><div class="tbl-wrap"><table><tr><th>Process</th><th>GOMAXPROCS</th><th>GOMEMLIMIT</th><th>GOGC</th></tr><tr><td>Load balancer</td><td>1</td><td>240MiB</td><td>80</td></tr><tr><td>Backends</td><td>1</td><td>256MiB</td><td>80</td></tr></table></div><p>(Final README config.) <code>GOMAXPROCS=1</code> kyunki container me exactly 1 CPU.</p>`},
{t:`sync.Pool: garbage hi kam banao`, code:`
// BEFORE: har request pe naya slice → garbage
body, _ := io.ReadAll(r.Body)

// AFTER: pool se buffer lo, kaam ke baad wapas
bodyBuf := bodyPool.Get().(*[]byte)
defer bodyPool.Put(bodyBuf)
b, err := readAllInto((*bodyBuf)[:0], io.LimitReader(r.Body, maxRetryBody+1))`, after:`<p>Hazaaron requests/sec × naya buffer = allocation rate itna ki GC peeche reh jaata, heap limit tak phool jaata. Pool se buffers reuse → allocation rate aur peak heap dono kam.</p>`}
],
say:`Go's garbage collector runs when the heap grows by GOGC percent over the live heap — at the default of 100, a 100 MB live heap can reach 200 MB before collection, and a high GOGC like 400 is dangerous in a 512 MiB container. GOGC knows nothing about container limits, so GOMEMLIMIT gives the runtime a soft budget and it collects more aggressively near it; I set it well below 512 MiB because kernel socket buffers also count against the container. The other lever is producing less garbage: sync.Pool reuses request buffers instead of allocating one per request. Lower GOGC costs CPU, which matters on a single core, so I combined a moderate GOGC with a memory limit.`,
hook:`GOGC=100 → heap 2× live. GOMEMLIMIT = soft budget (512 se neeche, sockets ke liye jagah). sync.Pool = garbage kam.`,
check:[
[`Live heap 150 MB, GOGC 100 → GC kab?`,`~300 MB pe.`],
[`GOMEMLIMIT 512MiB kyun nahi rakha?`,`Kernel socket buffers aur overhead bhi container limit me ginte hain.`]
]
},
{
h:`Investigation: 18% errors se root cause tak (story order)`,
words:[
[`Hypothesis`,`Andaza jo evidence se test karo.`],
[`Masking`,`Ek cheez doosri problem ko chhupa de.`]
],
steps:[
{t:`1. Symptom padho, guess mat karo`, b:`<ul><li>Error rate ~<strong>18%</strong>.</li><li>Jo requests successful thi unki latency <strong>achhi</strong>.</li><li>Errors har naye load stage ke <strong>pehle kuch seconds</strong> me cluster.</li><li><strong>Zero timeouts</strong> — sab instant failures.</li></ul>`},
{t:`2. Inference`, b:`<p>Overload hota to latency badhti aur <strong>timeouts</strong> aate. Instant failures + fast successes = kuch moments pe <strong>koi listen hi nahi kar raha</strong> → process mar raha/restart ho raha.</p>`, d:`oomLoop`},
{t:`3. Evidence`, b:`<ul><li>LB container: <code>memory.events</code> → <strong>oom_kill 121</strong>, limit hit bahut baar.</li><li>Supervisor restart script: crash ke baad <code>sleep 1</code> → har crash = <strong>1 second</strong> tak connection refused.</li><li>Stage start pe hazaaron clients ek saath connect → naye connections + buffers → memory spike → kill. Isliye clustering.</li></ul>`},
{t:`4. Kyun chhupa raha`, b:`<p>Correctness metric (feed integrity) <strong>100%</strong> dikhta tha — kyunki backends restart pe Postgres se feed rebuild kar lete the. <strong>Green metric ne crash mask kar diya.</strong> Isliye "sab theek dikh raha" pe bharosa nahi kiya, error pattern follow kiya.</p>`},
{t:`5. Doosra memory hog (backend)`, b:`<p><code>/feed</code> har request pe <strong>poora feed copy</strong> karta tha (run ke end me tens of MB) aur wo copy <strong>write lock</strong> ke andar hoti thi jo <code>/message</code> ko bhi chahiye. Har message feed ko "dirty" karta → har feed request dobara full copy. Heap churn + write path stall.</p>`}
],
say:`The pattern mattered more than the number. About 18% of requests failed, but successful requests were fast, errors clustered in the first seconds of each load stage, and there were zero timeouts. Overload would have produced slow responses and timeouts; instant failures meant nothing was listening at those moments. Reading memory.events inside the load balancer's container showed 121 OOM kills, and the supervisor waited a full second before restarting, so every kill meant a second of refused connections, triggered by connection bursts at stage starts. It had stayed hidden because feed integrity still read 100% — backends rebuilt their feeds from Postgres after restarts. I also found the backends copying the entire feed under the write lock on every feed request.`,
hook:`Fast successes + clustered instant errors + 0 timeouts → process dead → memory.events oom_kill 121 → sleep 1 s restart. Feed 100% ne mask kiya.`,
check:[
[`"Zero timeouts" se kya conclude kiya?`,`Slowness nahi, process available hi nahi tha (refusals).`],
[`Crash kyun chhupa raha?`,`Feed integrity 100% — backends Postgres se rebuild karte the.`]
]
},
{
h:`Fixes, verification aur result`,
words:[
[`Resident memory`,`Jo memory poore run me occupied rehti hai (pools, caches).`],
[`Reservoir`,`Fixed-size sample collection.`],
[`Verification`,`Fix sach me kaam kiya — measure karke prove karna.`]
],
steps:[
{t:`Fixes table`, b:`<div class="tbl-wrap"><table><tr><th>Change</th><th>Kyun</th></tr><tr><td>Request bodies <code>sync.Pool</code> buffer (har request <code>io.ReadAll</code> nahi)</td><td>per-request heap churn khatam</td></tr><tr><td>Outbound pool 3×600 sockets @ 8 KiB → 3×512 @ 4 KiB</td><td>permanently resident memory ~17 MiB kam</td></tr><tr><td>Latency samples 200,000 → 8,192</td><td>bounded memory</td></tr><tr><td>Warmup connections 256 → 64 per backend</td><td>startup spike kam</td></tr><tr><td><code>GOMEMLIMIT</code> + <code>GOGC=80</code> har node</td><td>heap limit se door, socket buffers ke liye jagah</td></tr><tr><td>Backend <code>snapshotFresh(maxAge)</code></td><td>load me har feed request pe full copy nahi</td></tr><tr><td>Restart delay 1 s → 50 ms</td><td>bacha hua crash bhi sirf ms ka refusal</td></tr></table></div>`},
{t:`Verification`, b:`<ul><li><strong>Do graded runs back to back</strong> (bina reset): static ladder + breakpoint ramp = <strong>60,000 requests</strong>, 2,500 users tak.</li><li>Errors: <strong>0</strong>.</li><li><code>memory.events</code>: <strong>koi naya oom_kill nahi</strong>.</li><li>LB peak memory: <strong>364 MB of 512</strong>.</li><li>Teeno backends ka feed identical: <strong>57,490 messages</strong>, dropped = 0.</li></ul>`},
{t:`Restart delay kam karna "cheating" nahi?`, b:`<p>Accha sawal. Asli fix <strong>memory</strong> tha (kill hi band hue — zero new oom_kill). Restart delay <strong>defense in depth</strong> hai: agar kabhi crash ho to 1 s ki jagah 50 ms impact. Dono saath bolo, sirf delay wala fix kabhi nahi.</p>`},
{t:`Learning (1 line)`, b:`<p><strong>"Symptom ki shape se layer pehchano, aur resource limit wale bugs usi environment me measure karo — ek green correctness metric crashes chhupa sakta hai."</strong></p>`}
],
say:`The fixes all targeted memory. Request bodies went into pooled buffers, the outbound connection pool shrank from 600 sockets at 8 KiB buffers per backend to 512 at 4 KiB, saving about 17 MiB of resident memory, the latency sample reservoir dropped from 200,000 to 8,192, warmup connections went from 256 to 64, every node got GOMEMLIMIT with GOGC 80, and backends reused a fresh feed snapshot instead of copying the whole feed per request. As defence in depth, the restart delay went from one second to 50 milliseconds. Two back-to-back graded runs then had zero errors over 60,000 requests up to 2,500 users, no new OOM kills, peak load-balancer memory of 364 of 512 MB, and identical 57,490-message feeds on all three backends.`,
hook:`Pool bodies · 3×512@4KiB (~17 MiB) · samples 8,192 · warmup 64 · GOMEMLIMIT+GOGC 80 · snapshotFresh · restart 50 ms → 0/60,000, 364/512 MB, 57,490 feed.`,
check:[
[`Asli fix kaunsa, defense-in-depth kaunsa?`,`Asli: memory reduction (no OOM). Defense: restart delay 50 ms.`],
[`Verification me kaunse 4 numbers?`,`0 errors / 60,000 requests, no new oom_kill, 364/512 MB peak, 57,490 identical feed.`]
]
},
{
h:`Benchmarks, bottleneck aur scaling / tough questions`,
words:[
[`Throughput`,`Requests per second.`],
[`p99 latency`,`99% requests isse tez.`],
[`Bottleneck`,`Sabse dheema hissa jo poore system ko rokta hai.`],
[`SPOF`,`Single point of failure.`],
[`Horizontal scaling`,`Zyada machines jodna.`]
],
steps:[
{t:`Repo ke load generator benchmarks (sab 1 CPU)`, b:`<div class="tbl-wrap"><table><tr><th>Run</th><th>Requests</th><th>Concurrency</th><th>Failed</th><th>Throughput</th><th>p50</th><th>p99</th></tr><tr><td>1 backend</td><td>5,000</td><td>40</td><td>0</td><td>504 req/s</td><td>96.7 ms</td><td>201.6 ms</td></tr><tr><td>3 backends</td><td>5,000</td><td>40</td><td>0</td><td>516 req/s</td><td>95.9 ms</td><td>201.7 ms</td></tr><tr><td>1 backend</td><td>10,000</td><td>100</td><td>0</td><td>497 req/s</td><td>197.1 ms</td><td>488.3 ms</td></tr><tr><td>3 backends</td><td>10,000</td><td>100</td><td>0</td><td>478 req/s</td><td>198.1 ms</td><td>500.0 ms</td></tr></table></div>`},
{t:`"3 backends se throughput kyun nahi badha?"`, b:`<p><strong>Honest answer:</strong> 1 → 3 backends pe throughput ~flat (~500 req/s). Matlab bottleneck backends nahi — <strong>single-CPU load balancer</strong> (ya load generator/client pacing) hai. Load balancing ka fayda tab dikhega jab backends saturate hon. Next: LB ka CPU profile (<code>pprof</code>), LB ko zyada CPU / multiple LB instances.</p>`},
{t:`"LB single point of failure hai?"`, b:`<p>Haan. Fix: <strong>2+ LB instances</strong> + floating virtual IP (keepalived/VRRP) ya DNS/cloud LB aage. LB ki state (health, counters) local hai, har instance khud rebuild kar leta. Postgres bhi SPOF → streaming replica + failover.</p>`},
{t:`"10× traffic kaise handle karoge?"`, b:`<ol><li>Measure first: pprof, bottleneck confirm (abhi LB CPU).</li><li>LB horizontally scale (multiple instances) ya proven proxy (Envoy/HAProxy) with more cores.</li><li>Backends add (least-conn already handles).</li><li>DB: batching already hai; read path memory se; write volume badhe to partitioning / queue (Kafka) + consumers.</li><li>Feed read: pagination / since-cursor instead of full feed.</li><li>Rate limiting + backpressure at LB.</li></ol>`},
{t:`Aur quick follow-ups`, b:`<ul><li><strong>TLS?</strong> Nahi hai (lab internal). Prod me LB pe TLS termination.</li><li><strong>HTTP/2?</strong> Backend transport me off (<code>ForceAttemptHTTP2: false</code>); simple HTTP/1.1 keep-alive pools.</li><li><strong>Observability?</strong> <code>/lb/metrics</code>: throughput, errors, mean/p50/p95/p99; <code>/lb/status</code>; HTML status page.</li><li><strong>Admin reset security?</strong> <code>POST /lb/reset</code> sirf <code>X-Reset-Key</code> env key se, constant-time compare; key unset → route disabled.</li><li><strong>CI?</strong> GitHub Actions: gofmt, build, vet, staticcheck, govulncheck.</li></ul>`}
],
say:`In the repo's benchmarks, all on one CPU, throughput stayed around 500 requests per second whether there was one backend or three, with p99 around 200 milliseconds at 40 concurrency and 500 at 100. That tells me the single-CPU load balancer, not backend capacity, was the bottleneck at those loads, so the next step would be profiling it. The load balancer and the single Postgres instance are single points of failure; I'd run multiple load balancers behind a floating IP and add a database replica with failover. For ten times the traffic I'd measure first, scale out the proxy tier or use Envoy, add backends, paginate the feed, and add rate limiting and backpressure.`,
hook:`1→3 backends ~flat 500 rps → LB CPU bottleneck. SPOF: LB + Postgres → multiple LBs + VIP, replica. 10×: measure → scale proxy → paginate → backpressure.`,
check:[
[`Flat throughput ka conclusion?`,`Bottleneck single-CPU LB (ya client), backends nahi.`],
[`LB SPOF kaise hataoge?`,`Multiple LB instances + floating VIP (keepalived) / DNS / cloud LB.`]
]
}
],
cards:[
{q:`Tell me about the hardest bug you debugged.`, s:`18% errors; fast successes, clustered at stage start, 0 timeouts → refusals → memory.events oom_kill 121, sleep 1 s restart; feed 100% masked it → memory fixes → 0/60,000.`, a:`Under graded load my Go load balancer failed about 18% of requests. Successful requests were fast, errors clustered at the start of each load stage and there were no timeouts, which pointed to refused connections rather than overload. The container's memory.events showed 121 OOM kills, and the supervisor waited a second before restarting. Feed integrity still looked perfect because backends rebuilt from Postgres, which had masked it. I cut memory with pooled buffers, smaller connection buffers, bounded samples, GOMEMLIMIT and GOGC, and snapshot caching, and got zero errors over 60,000 requests at up to 2,500 users.`},
{q:`What is a cgroup and how did you use it to debug?`, s:`Linux resource limits for containers. memory.max 512 MiB, cpu.max 1 CPU; memory.events oom_kill count = proof.`, a:`Cgroups are the Linux mechanism containers use to limit resources. Reading memory.max and cpu.max confirmed 512 MiB and one CPU, and memory.events counted limit hits and 121 OOM kills, which proved the process was being killed.`},
{q:`Why did zero timeouts matter?`, s:`Overload → slow + timeouts. Instant failures + fast successes → koi listen nahi → process dead.`, a:`Overload would have produced slow responses and timeouts. Instant failures alongside fast successful requests meant nothing was listening at those moments — the process was dying and restarting.`},
{q:`What counts toward a container's memory limit?`, s:`Go heap, stacks, runtime, kernel socket buffers (pprof me nahi), page cache.`, a:`Everything the cgroup charges: the Go heap, goroutine stacks and runtime overhead, kernel socket buffers for every connection — which Go's heap profile doesn't show — and page cache.`},
{q:`Explain GOGC and GOMEMLIMIT.`, s:`GOGC: heap live se kitna % badhe tab GC (100 = 2×). GOMEMLIMIT: soft total budget, paas aane pe aggressive GC.`, a:`GOGC sets how much the heap may grow over the live heap before a collection — 100 means it can double. GOMEMLIMIT is a soft total memory budget; near it the runtime collects more aggressively, which is what makes Go respect container limits.`},
{q:`Why set GOMEMLIMIT well below 512 MiB?`, s:`Kernel socket buffers + non-heap overhead container me ginte; Go unhe manage nahi karta. LB 240MiB.`, a:`Kernel socket buffers and other non-heap memory also count against the container but aren't controlled by the Go runtime, so the heap budget — 240 MiB for the load balancer — leaves room for them.`},
{q:`How does sync.Pool reduce memory pressure?`, s:`Har request naya buffer = high allocation rate → GC peeche → heap spike. Pool reuse → allocations kam.`, a:`Allocating a new buffer per request creates garbage faster than the collector reclaims it under load, inflating the heap. A pool reuses buffers across requests, cutting the allocation rate and peak heap.`},
{q:`List the memory fixes you made.`, s:`Pool bodies; conn pool 3×600@8KiB → 3×512@4KiB (~17 MiB); samples 200k → 8,192; warmup 256 → 64; GOMEMLIMIT + GOGC 80; snapshotFresh; restart 1 s → 50 ms.`, a:`Pooled request buffers, a smaller outbound connection pool with 4 KiB buffers saving about 17 MiB, a latency reservoir cut from 200,000 to 8,192 samples, fewer warmup connections, GOMEMLIMIT with GOGC 80 on every node, and cached feed snapshots on the backends — plus a 50-millisecond restart delay as defence in depth.`},
{q:`Isn't shortening the restart delay just hiding crashes?`, s:`Asli fix memory (zero new oom_kill). Delay sirf defense in depth.`, a:`It would be if that were the fix. The real fix was memory reduction — verified by zero new OOM kills — and the shorter delay only limits the impact if a crash ever happens again.`},
{q:`How did you verify the fix?`, s:`2 graded runs back-to-back, 60,000 requests to 2,500 users: 0 errors, no new oom_kill, LB peak 364/512 MB, 3 backends same 57,490 feed.`, a:`Two back-to-back graded runs totalling 60,000 requests up to 2,500 users had zero errors, no new OOM kills, a peak load-balancer memory of 364 of 512 MB, and all three backends reporting the same 57,490-message feed.`},
{q:`Why didn't adding backends increase throughput in your benchmarks?`, s:`~500 rps flat 1 vs 3 backends → single-CPU LB (ya client) bottleneck. Next: pprof.`, a:`Throughput stayed around 500 requests per second with one or three backends, so the single-CPU load balancer or client pacing was the bottleneck, not backend capacity. The next step would be profiling the load balancer.`},
{q:`How would you remove single points of failure?`, s:`Multiple LBs + floating VIP (keepalived/VRRP) / DNS / cloud LB; Postgres replica + failover.`, a:`Run multiple load balancers behind a floating virtual IP with keepalived, or behind DNS or a cloud load balancer, and add a PostgreSQL streaming replica with failover.`},
{q:`How would you scale to 10× traffic?`, s:`Measure (pprof) → scale proxy tier / Envoy → more backends → feed pagination → queue for writes → rate limit + backpressure.`, a:`Measure first to confirm the bottleneck, scale out the proxy tier or use a proven proxy with more cores, add backends, paginate feed reads, move writes through a durable queue if volume demands, and add rate limiting and backpressure at the edge.`}
]
});
