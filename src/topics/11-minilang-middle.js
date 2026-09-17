TOPICS.push({
id:'ml-middle', name:'MiniLang 2 · Semantic analysis + optimizer', group:'MiniLang · Compiler, Bytecode VM & Browser IDE', tier:'mod',
intro:`Resume: "semantic analyzer (scoped symbol tables, type checking), and AST optimizer (constant folding/propagation, dead-code elimination)". Parser sirf grammar check karta hai; "ye variable exist karta hai?", "int me string jod rahe ho?" semantic analyzer pakadta hai. Optimizer phir safe tareeke se kaam compile time pe hi kar deta hai. Real bytecode ke saath before/after dekho.`,
lessons:[
{
h:`Semantic analysis kya pakadta hai (parser kya nahi)`,
words:[
[`Syntax`,`Grammar sahi hai? (parser)`],
[`Semantics`,`Matlab sahi hai? Types, declarations, scopes (semantic analyzer).`],
[`Static typing`,`Type errors compile time pe, program chalne se pehle.`],
[`lvalue`,`Jisko assign kar sakte ho (variable, <code>*p</code>, <code>a[i]</code>). <code>5 = x</code> galat.`]
],
steps:[
{t:`Grammar sahi, matlab galat — examples`, code:`
int x = "hello";        // type mismatch: declared int
y = 5;                  // Undefined variable 'y'
if (x) { }              // If condition must be a boolean expression
break;                  // Cannot use 'break' outside of a loop
const int K = 3; K = 4; // Cannot assign to constant variable 'K'
int f(int a) { return a; }  f(1, 2);   // f expects 1 argument`, after:`<p>Ye sab parser ke liye <strong>valid grammar</strong> hai. Semantic analyzer inhe clear message ke saath rokta hai — VM tak galat program pahunchta hi nahi.</p>`},
{t:`Two-pass: pehle functions register`, code:`
void SemanticAnalyzer::analyze(std::vector<StmtPtr>& statements) {
    for (auto& stmt : statements)                 // pass 1: sirf signatures
        if (auto fn = std::get_if<FnDeclStmt>(&stmt->node)) {
            fn_signatures_[fn->name] = fn->params;
            fn_return_types_[fn->name] = fn->return_type;
        }
    for (auto& stmt : statements) analyze_stmt(*stmt);   // pass 2: bodies
}`, after:`<p><strong>Kyun:</strong> <code>main()</code> upar ho aur <code>helper()</code> neeche defined ho, ya do functions ek doosre ko call karein (mutual recursion) — pass 1 ke baad sab signatures pata hain.</p>`},
{t:`Kya-kya check hota hai`, b:`<ul><li>Variable declared hai? Same scope me dobara declare to error.</li><li>Assignment / initialization types match.</li><li>Function call: exist karta, argument count, argument types; return type match.</li><li><code>break</code>/<code>continue</code> loop ke andar (<code>loop_depth_</code> counter).</li><li><code>const</code> variable pe assign/compound-assign error.</li><li><code>&amp;</code> sirf lvalue ka; <code>*</code> sirf pointer pe; array index int; <code>len</code> sirf array/string.</li></ul>`}
],
say:`The parser only checks grammar; the semantic analyzer checks meaning. It runs two passes: first it registers every function's signature and return type, so functions can be called before they're defined or recursively call each other, then it walks every body. It reports undefined or redeclared variables, type mismatches, wrong argument counts or types, non-boolean conditions, break or continue outside a loop, assignments to const variables, and invalid address-of or dereference, so invalid programs never reach the VM.`,
hook:`Parser = grammar. Semantic = matlab (types, scopes, calls, const, break). 2 pass: signatures pehle.`,
check:[
[`int x = "hi" parser pakdega ya semantic?`,`Semantic (grammar valid hai).`],
[`Two-pass kyun?`,`Functions ko definition se pehle / mutual recursion me call kar sakein.`]
]
},
{
h:`Symbol table aur scopes`,
words:[
[`Symbol table`,`Naam → info (type, depth) ka map.`],
[`Scope`,`<code>{ }</code> ka area jahan naam valid hai.`],
[`Shadowing`,`Andar ke scope me same naam ka naya variable — bahar wala chhup jaata hai.`]
],
steps:[
{t:`Data structure`, code:`
struct Symbol { std::string name; DataType type; int depth; };
std::vector<std::unordered_map<std::string, Symbol>> scopes_;   // stack of maps`, after:`<p>Block me enter → <code>push_back</code> naya map. Exit → <code>pop_back</code>. Har map ek scope.</p>`},
{t:`Example`, d:`scopes`},
{t:`define aur lookup`, code:`
void SemanticAnalyzer::define(const std::string& name, DataType type, int line) {
    auto& current_scope = scopes_.back();
    if (current_scope.find(name) != current_scope.end())
        error("Redefinition of variable '" + name + "' in same scope");
    current_scope[name] = Symbol{name, type, (int)scopes_.size() - 1};
}

std::optional<Symbol> SemanticAnalyzer::lookup(const std::string& name) {
    for (auto it = scopes_.rbegin(); it != scopes_.rend(); ++it)   // andar se bahar
        if (auto f = it->find(name); f != it->end()) return f->second;
    return std::nullopt;                                           // undefined
}`},
{t:`unordered_map kyun, map kyun nahi?`, b:`<p>Sirf exact naam se dhoondhna hai, sorted order nahi chahiye → <code>unordered_map</code> average <strong>O(1)</strong> vs <code>map</code> O(log n). Lookup cost = O(depth) maps × O(1).</p>`}
],
say:`Scopes are a stack of hash maps from name to symbol, holding the type and nesting depth. Entering a block pushes a map and leaving pops it. Defining a name checks only the innermost map, so redeclaring in the same scope is an error but shadowing an outer variable is allowed. Lookup walks from the innermost scope outward and returns the first match. I used unordered_map because lookups are by exact name and ordering doesn't matter.`,
hook:`vector<unordered_map> = scope stack. define = top map. lookup = top se bottom.`,
check:[
[`Inner block ka x aur global x — kaunsa milega?`,`Inner (lookup andar se bahar).`],
[`Same scope me int a; int a; ?`,`Error: redefinition in same scope.`]
]
},
{
h:`Type checking rules`,
words:[
[`Implicit conversion`,`Compiler khud type badal de (C++ me int → float).`],
[`Explicit cast`,`Programmer likhe: <code>x as float</code>.`],
[`Strict typing`,`Implicit conversion nahi — types exactly match.`]
],
steps:[
{t:`MiniLang ke rules (C++ se zyada strict)`, b:`<div class="tbl-wrap"><table><tr><th>Expression</th><th>Rule</th></tr><tr><td><code>a + b</code></td><td>dono int, dono float, ya dono string (concat)</td></tr><tr><td><code>- * /</code></td><td>numeric</td></tr><tr><td><code>%</code></td><td>sirf int</td></tr><tr><td><code>&amp; | ^ &lt;&lt; &gt;&gt; ~</code></td><td>sirf int</td></tr><tr><td><code>&amp;&amp; || !</code></td><td>sirf bool</td></tr><tr><td><code>if/while/for</code> condition</td><td><strong>bool hi chahiye</strong> (<code>if (x)</code> with int = error)</td></tr><tr><td><code>*p</code></td><td>p pointer hona chahiye</td></tr><tr><td>int ↔ float</td><td>sirf <code>as</code> cast se</td></tr></table></div>`},
{t:`Strict kyun?`, b:`<ul><li>C/C++ ki common bugs (<code>if (x = 5)</code>, int/float silent truncation) compile time pe ruk jaati hain.</li><li>VM simple: ADD ko sirf same-type operands handle karne hain.</li><li>Trade-off: user ko <code>as</code> likhna padta hai.</li></ul>`},
{t:`Runtime pe bhi check`, b:`<p>VM me bhi type checks hain (e.g. <code>JUMP_IF_FALSE</code> non-bool pe runtime error, <code>ADD</code> invalid operands pe) — defense in depth, agar kabhi compiler bug se galat bytecode bane.</p>`}
],
say:`MiniLang's type rules are stricter than C++. Addition needs both operands to be int, both float or both string; modulo and bitwise operators need ints; logical operators need bools; and conditions in if, while and for must be boolean, so if on an int is an error. There are no implicit int–float conversions — you write an explicit as cast. That catches common C bugs at compile time and keeps VM instructions simple, at the cost of a bit more typing. The VM still type-checks operands at runtime as a safety net.`,
hook:`+ same type (int/float/string). % & | ^ int. && || bool. Condition = bool. int↔float sirf "as".`,
check:[
[`int x = 3; float f = x; valid?`,`Nahi — "x as float" chahiye.`],
[`while (n) jahan n int hai?`,`Error: condition bool honi chahiye.`]
]
},
{
h:`Constant folding (overflow-safe)`,
words:[
[`Constant folding`,`Compile time pe <code>5 + 10 * 2</code> ko <code>25</code> bana dena.`],
[`int64 overflow`,`Result 64-bit range (±9.2×10¹⁸) se bahar.`],
[`Undefined behavior (UB)`,`C++ me signed overflow ka result undefined — compiler kuch bhi kar sakta hai.`]
],
steps:[
{t:`Idea`, b:`<p>Dono operands literal hain to runtime pe ADD karne ki kya zaroorat? Optimizer AST me <code>Binary(+, Int 5, Int 20)</code> ko <code>Int 25</code> se replace karta hai. Bottom-up: pehle children optimize, phir parent — isliye <code>5 + 10 * 2</code> poora fold.</p><p>Test <code>11_constant_folding.ml</code>: int, float, bool, string concat (<code>"hello " + "world"</code>), unary (<code>-5</code>, <code>~0</code>, <code>!true</code>), ternary, casts (<code>3.14 as int</code>).</p>`},
{t:`Galti ka khatra: overflow`, b:`<p>Optimizer C++ me chalta hai. Agar woh <code>INT64_MAX + 1</code> ko seedha C++ me jode to <strong>UB</strong> — compiler khud crash ya galat value de sakta hai. Isliye pehle check:</p>`, code:`
case TokenType::PLUS:
    if ((r_val > 0 && l_val > INT64_MAX - r_val) ||
        (r_val < 0 && l_val < INT64_MIN - r_val)) {
        break;                                   // fold mat karo
    }
    return make_int_literal(expr->line, l_val + r_val);

case TokenType::SLASH:
    if (r_val != 0) {
        if (l_val == INT64_MIN && r_val == -1) break;   // overflow
        return make_int_literal(expr->line, l_val / r_val);
    }
    break;                                       // /0 → runtime error rehne do`},
{t:`Math samjho: overflow check`, b:`<p><code>l + r &gt; MAX</code> check karne ke liye <code>l + r</code> compute nahi kar sakte (wahi overflow!). Rearrange: <code>l &gt; MAX − r</code> (jab r &gt; 0). <code>MAX − r</code> kabhi overflow nahi hota. Same trick minus, multiply (division se) ke liye.</p><p><code>INT64_MIN / −1</code> = +9.22×10¹⁸ jo MAX se 1 zyada → overflow. <code>-INT64_MIN</code> negation bhi guard.</p>`},
{t:`Golden rule: optimization behaviour nahi badalta`, b:`<p><code>10 / 0</code> fold karke compile crash ya koi value daal dena galat hoga — program ko runtime pe "division by zero" error dena chahiye. Isliye jo fold unsafe hai, <strong>chhod do</strong>, VM ko handle karne do.</p>`}
],
say:`Constant folding evaluates expressions with literal operands at compile time, bottom-up, so five plus ten times two becomes twenty-five, including float, boolean, string concatenation, unary, ternary and cast expressions. The optimizer itself is C++, so folding an overflowing int64 expression would be undefined behavior in the compiler. Before folding I check overflow without computing it — for addition, left greater than INT64_MAX minus right — and I skip division by zero and INT64_MIN divided by minus one. Those stay in the bytecode so the program still produces its runtime error: optimisation must never change behaviour.`,
hook:`Fold bottom-up. Overflow check: l > MAX − r (compute kiye bina). /0 aur MIN/−1 fold nahi → runtime error preserve.`,
check:[
[`l + r overflow ko l + r compute karke kyun check nahi karte?`,`Wahi computation overflow/UB karega.`],
[`10 / 0 ko compile time pe kya karte ho?`,`Fold nahi; runtime pe division-by-zero error aata hai.`]
]
},
{
h:`Constant propagation + dead-code elimination (real bytecode)`,
words:[
[`Constant propagation`,`<code>const int SIZE = 4;</code> → baad me <code>SIZE</code> ki jagah <code>4</code>.`],
[`Dead code`,`Jo kabhi chal hi nahi sakta: <code>if (false) {...}</code>.`],
[`Data-flow analysis`,`Har path pe variable ki value track karna.`]
],
steps:[
{t:`Program`, code:`
int main() {
    const int SIZE = 4;
    int x = SIZE * 2 + 1;
    if (false) {
        cout << "never" << endl;
    }
    cout << x << endl;
    return 0;
}`},
{t:`Live WASM build ka real bytecode`, code:`
0000  PUSH_INT      0 (4)        // SIZE ka slot abhi bhi hai
0003  PUSH_INT      1 (9)        // SIZE*2+1 → 4*2+1 → 9  (propagate + fold)
0006  LOAD_LOCAL    1 (x)
0009  WRITE
0010  PUSH_STRING   2 ("\\n")
0013  WRITE
0014  PUSH_INT      3 (0)
0017  RETURN
// if (false) { ... } ka koi bytecode nahi  → dead-code elimination`},
{t:`Propagation sirf const literal ka kyun?`, b:`<p><code>const int SIZE = 4;</code> kabhi nahi badal sakta (semantic analyzer assign rokta hai) → replace <strong>hamesha safe</strong>.</p><p>Normal <code>int n = 4;</code> ko propagate karne ke liye prove karna padta ki <strong>har path pe</strong> (loops, if, pointers <code>*p = ...</code> se bhi!) n nahi badla → <strong>data-flow analysis</strong> chahiye. Wo nahi banaya → isliye conservative. Constants ka scope <strong>har function ke liye reset</strong>.</p>`},
{t:`DCE kaise`, b:`<ul><li><code>if (true) A else B</code> → sirf A.</li><li><code>if (false) A else B</code> → sirf B (ya kuch nahi).</li><li><code>while (false) {...}</code> → hata do.</li></ul><p>Condition fold hone ke baad literal bool ban jaata hai → DCE usko pakadta hai. Tests: <code>12_constant_propagation</code>, <code>13_dead_code_elimination</code>.</p>`},
{t:`Kya nahi kiya (honest + next steps)`, b:`<ul><li>General propagation (data-flow / SSA form).</li><li>Common subexpression elimination, loop-invariant code motion.</li><li>Unused variable slot removal (<code>SIZE</code> ka slot abhi bhi push hota hai — upar bytecode me dikh raha).</li><li>Function inlining.</li></ul>`}
],
say:`Constant propagation replaces uses of const variables initialised with literals by their value, then folding simplifies further — in the live build, SIZE times two plus one compiles to a single push of nine. I only propagate const literals because they provably never change; propagating ordinary variables needs data-flow analysis across loops, branches and pointer writes, which I didn't build. Dead-code elimination drops if and while statements whose condition folds to a constant, so an if-false block emits no bytecode at all. Next steps would be SSA-based propagation, common subexpression elimination and removing unused slots — you can see SIZE's slot is still pushed.`,
hook:`const literal → replace → fold → PUSH 9. if(false) → no bytecode. Normal vars propagate nahi (data-flow chahiye).`,
check:[
[`int n = 4; (non-const) propagate kyun nahi?`,`Kisi path pe (loop, pointer) badal sakta hai; prove karne ke liye data-flow analysis chahiye.`],
[`Upar bytecode me optimizer ne kya miss kiya?`,`Unused SIZE ka slot abhi bhi PUSH hota hai.`]
]
}
],
cards:[
{q:`What does the semantic analyzer check that the parser doesn't?`, s:`Undefined/redeclared vars, type mismatch, call arity/types, return types, bool conditions, break outside loop, const assign, lvalue/pointer rules.`, a:`Meaning rather than grammar: undefined or redeclared variables, type mismatches, function argument counts and types, return types, non-boolean conditions, break or continue outside loops, assignments to const, and invalid address-of or dereference.`},
{q:`Why does semantic analysis run in two passes?`, s:`Pass 1 saare function signatures; pass 2 bodies. Definition se pehle call + mutual recursion possible.`, a:`The first pass records every function's signature and return type; the second analyses bodies. That allows calling functions defined later in the file and mutual recursion.`},
{q:`How are scopes implemented?`, s:`vector<unordered_map<string,Symbol>> stack. Block enter push, exit pop. define top map me; lookup andar se bahar.`, a:`As a stack of hash maps. Entering a block pushes a map, leaving pops it. Definitions go into the innermost map — so redeclaration in the same scope is an error but shadowing is allowed — and lookup searches from innermost to outermost.`},
{q:`Why unordered_map for the symbol table?`, s:`Exact name lookup, order nahi chahiye → O(1) avg vs map O(log n).`, a:`Lookups are by exact name and ordering doesn't matter, so a hash map's average O(1) beats a tree map's O(log n).`},
{q:`What are MiniLang's type rules?`, s:`+ same type (int/float/string), % bitwise int, logical bool, conditions bool, no implicit int↔float (as cast).`, a:`Arithmetic needs matching numeric types and plus also concatenates strings; modulo and bitwise operators need ints; logical operators need bools; conditions must be boolean; and int–float conversion requires an explicit as cast.`},
{q:`How does constant folding avoid integer overflow?`, s:`Compute kiye bina check: l > INT64_MAX − r. MIN / −1 aur /0 fold nahi.`, a:`It checks before computing — for addition, whether left exceeds INT64_MAX minus right — because overflowing in the optimizer would be undefined behavior in C++. It also skips division by zero and INT64_MIN divided by minus one, leaving them to fail at runtime.`},
{q:`Why not fold 10 / 0 at compile time?`, s:`Optimization behaviour nahi badalna chahiye; runtime pe division by zero error aana chahiye.`, a:`Optimisations must preserve behaviour. The program should raise a division-by-zero error at runtime, so the optimizer leaves that expression in the bytecode.`},
{q:`Why only propagate const variables?`, s:`const literal kabhi nahi badalta → safe. Normal vars ke liye data-flow analysis (loops, branches, pointer writes).`, a:`A const initialised with a literal can never change, so replacing it is always safe. Propagating ordinary variables requires data-flow analysis to prove no path — loops, branches or pointer writes — modifies them, which I didn't implement.`},
{q:`Show an optimisation in real bytecode.`, s:`const SIZE=4; x = SIZE*2+1 → PUSH_INT 9. if(false) → koi bytecode nahi. SIZE slot abhi bhi push (missed).`, a:`With const SIZE equal to 4, x equals SIZE times two plus one compiles to a single PUSH_INT 9, and an if-false block emits nothing. SIZE's slot is still pushed, which a future unused-variable pass could remove.`},
{q:`What optimisations would you add next?`, s:`SSA/data-flow propagation, CSE, loop-invariant motion, unused slot removal, inlining.`, a:`Data-flow or SSA-based constant propagation, common subexpression elimination, loop-invariant code motion, removing unused variable slots, and function inlining.`}
]
});
