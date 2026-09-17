TOPICS.push({
id:'ml-front', name:'MiniLang 1 · Compiler basics, lexer, parser, AST', group:'MiniLang · Compiler, Bytecode VM & Browser IDE', tier:'crit',
intro:`Resume: "Engineered a compiler and virtual machine from scratch in 7,000+ lines of C++17 for a statically typed, C++-style language with functions, recursion, pointers, and vector/queue/stack containers. Implemented a lexer, recursive-descent parser (13 precedence levels, panic-mode error recovery)..." Pehle zero se samjho compiler kya hota hai, phir lexer aur parser ka har step real code ke saath.`,
lessons:[
{
h:`Project ek nazar me + 45 second story`,
words:[
[`Compiler`,`Program jo source code ko doosri form (bytecode / machine code) me badalta hai.`],
[`Virtual Machine (VM)`,`Software CPU jo bytecode instructions ek-ek karke chalata hai.`],
[`Bytecode`,`Chhoti, simple instructions (PUSH, ADD, JUMP...) — machine code jaisa, lekin VM ke liye.`],
[`WebAssembly (WASM)`,`Browser me fast chalne wala binary format. C++ ko isme compile kar sakte ho.`]
],
steps:[
{t:`MiniLang kya hai`, b:`<p>Ek <strong>C++ jaisi dikhne wali</strong> statically typed language — aur uska <strong>poora compiler + VM</strong>, C++17 me, scratch se (~7,000+ lines in <code>src/</code>). Language me: <code>int</code>, <code>float</code>, <code>bool</code>, <code>string</code>, functions, recursion, if/while/for/do-while/switch, <strong>pointers</strong> (<code>&amp;a</code>, <code>*p</code>), <code>vector</code>/<code>queue</code>/<code>stack</code> containers, <code>const</code>, <code>as</code> casts.</p>`, code:`
#include <iostream>
using namespace std;

void swap(int* p1, int* p2) {
    int temp = *p1;
    *p1 = *p2;
    *p2 = temp;
}

int main() {
    int a = 10;
    int b = 20;
    swap(&a, &b);
    cout << a << endl;   // 20
    return 0;
}`, after:`<p>Ye <code>tests/08_pointers.ml</code> hai — dikhne me C++ jaisa, lekin chalta hai MiniLang ke apne compiler + VM pe.</p>`},
{t:`Pipeline`, d:`mlPipeline`, b:`<p>Source → <strong>Lexer</strong> (tokens) → <strong>Parser</strong> (AST) → <strong>Semantic analyzer</strong> (types, scopes) → <strong>Optimizer</strong> (folding, propagation, DCE) → <strong>Codegen</strong> (bytecode) → <strong>VM</strong> (60 opcodes). Wahi C++ code Emscripten se <strong>WebAssembly</strong> ban ke browser IDE me chalta hai. Bonus: <code>minilang compile</code> AST ko C++ me transpile karke <code>g++ -O3</code> se native binary.</p>`},
{t:`4 numbers yaad karo`, b:`<div class="tbl-wrap"><table><tr><th>Number</th><th>Kya</th></tr><tr><td><strong>7,000+</strong></td><td>lines C++17</td></tr><tr><td><strong>13</strong></td><td>precedence levels in parser</td></tr><tr><td><strong>60</strong></td><td>VM opcodes</td></tr><tr><td><strong>14</strong></td><td>end-to-end tests, GitHub Actions CI</td></tr></table></div>`},
{t:`Live demo`, b:`<p><strong>minilang-one.vercel.app</strong> — Monaco editor me code likho, Run karo, ya Debug me ek-ek bytecode instruction step karke stack aur variables dekho. Sab browser me, koi server nahi.</p>`}
],
say:`MiniLang is a compiler and virtual machine I built from scratch in C++17, about seven thousand lines, for a statically typed C++-style language with functions, recursion, pointers and vector, queue and stack containers. Source goes through a lexer, a hand-written recursive-descent parser with 13 precedence levels and panic-mode error recovery, a semantic analyzer with scoped symbol tables and type checking, and an optimizer that does constant folding, propagation and dead-code elimination. The code generator emits bytecode for a stack-based VM with 60 opcodes. The same C++ compiles to WebAssembly, so it runs in a browser IDE with a step-through debugger, and 14 end-to-end tests run in CI.`,
hook:`Lexer → Parser → Semantic → Optimizer → Codegen → VM → WASM. 7,000+ · 13 · 60 · 14.`,
check:[
[`VM kya hai?`,`Software CPU jo bytecode instructions chalata hai.`],
[`MiniLang browser me kaise chalta hai?`,`Same C++ Emscripten se WebAssembly me compile hota hai.`]
]
},
{
h:`Compiler vs interpreter vs VM vs transpiler`,
words:[
[`Interpreter`,`Code ko seedha (line by line / tree walk) chalata hai, pehle poora translate nahi karta.`],
[`AOT compiler`,`Pehle poora machine code bana deta hai (g++, clang).`],
[`Bytecode VM`,`Pehle bytecode me compile, phir VM usse chalata hai (Java JVM, Python CPython, Lua).`],
[`Transpiler`,`Ek high-level language se doosri high-level language (MiniLang → C++).`]
],
steps:[
{t:`Chaar tarike, ek table`, b:`<div class="tbl-wrap"><table><tr><th>Approach</th><th>Kaise</th><th>Example</th><th>MiniLang me?</th></tr><tr><td>Tree-walking interpreter</td><td>AST nodes pe recursion se chalao</td><td>simple scripting</td><td>Nahi</td></tr><tr><td>Bytecode VM</td><td>AST → bytecode → VM loop</td><td>JVM, CPython, Lua</td><td><strong>Haan (main)</strong></td></tr><tr><td>AOT native</td><td>machine code</td><td>g++, rustc</td><td>transpiler ke through</td></tr><tr><td>Transpiler</td><td>language → language</td><td>TypeScript → JS</td><td><strong>Haan</strong> (MiniLang → C++)</td></tr></table></div>`},
{t:`Bytecode VM kyun chuna?`, b:`<ul><li><strong>Tree-walk se fast:</strong> flat instruction array, pointer-chasing kam.</li><li><strong>Portable:</strong> bytecode + VM C++ me → WASM me bhi same chalta.</li><li><strong>Debugger aasaan:</strong> "ek instruction step karo, stack dikhao" natural hai.</li><li>Machine code generate karna (x86 registers, calling conventions) bahut zyada kaam.</li></ul>`},
{t:`Front end vs back end`, b:`<p><strong>Front end</strong> (lexer, parser, semantic) = program ko <em>samajhna</em>. <strong>Back end</strong> (optimizer, codegen, VM) = program ko <em>chalana</em>. Beech ka common language = <strong>AST</strong>. Isi wajah se ek hi AST se bytecode bhi bana aur C++ transpile bhi hua.</p>`}
],
say:`A tree-walking interpreter executes the syntax tree directly, an ahead-of-time compiler produces machine code, a transpiler turns one high-level language into another, and a bytecode VM compiles to a compact instruction set that a virtual machine runs. MiniLang's main path is a bytecode VM, like CPython or Lua: it's faster than walking the tree, portable enough to compile to WebAssembly unchanged, and it makes a step-by-step debugger natural. Because everything shares one AST, I could also add a transpiler that emits C++ and builds a native binary with g++.`,
hook:`Tree-walk = AST pe chalao. Bytecode VM = flat instructions (MiniLang). Transpiler = MiniLang → C++ → g++.`,
check:[
[`Python kis category me?`,`Bytecode VM (CPython).`],
[`AST front end aur back end ke beech kyun important?`,`Ek hi AST se kai back ends (bytecode, C++ transpile) ban sakte hain.`]
]
},
{
h:`Lexer: characters se tokens`,
words:[
[`Token`,`Meaningful tukda + type: keyword, identifier, number, operator.`],
[`Lexeme`,`Token ka asli text, jaise <code>total</code>.`],
[`Maximal munch`,`Jitna lamba valid token ban sake, utna lo: <code>&gt;=</code> ek token.`],
[`Peek`,`Agla character dekho bina aage badhe.`]
],
steps:[
{t:`Example`, d:`tokens`},
{t:`Lexer loop kaise chalta hai`, b:`<ol><li><code>peek()</code> se current character dekho.</li><li>Whitespace/newline → skip (newline pe <code>line++</code>, <code>column = 1</code>).</li><li>Digit → poora number padho (int ya float).</li><li>Letter/_ → poora word padho → keyword table me hai? (<code>int</code>, <code>while</code>, <code>return</code>...) → keyword token, warna IDENT.</li><li><code>"</code> → string literal.</li><li>Operator → do-character check pehle: <code>&gt;</code> ke baad <code>=</code>? → <code>GREATER_EQUAL</code>; <code>&gt;</code> ke baad <code>&gt;</code>? → <code>GREATER_GREATER</code>.</li><li>Kuch samajh na aaye → <code>TOKEN_ERROR</code> with line/column.</li></ol>`},
{t:`Comments aur #include`, code:`
case '#':                                   // #include <iostream> jaisi line
    while (!is_at_end() && peek() != '\\n') advance();
    break;
case '/':
    if (peek_next() == '/') { /* line comment: newline tak skip */ }
    else if (peek_next() == '*') { /* block comment: */ /* tak, newlines count karo */ }`, after:`<p>MiniLang files C++ jaisi dikhein isliye <code>#include</code> aur <code>using namespace std;</code> allow — lexer <code>#</code> wali line skip karta hai.</p>`},
{t:`Tricky case: <code>&gt;&gt;</code>`, b:`<p><code>x &gt;&gt; 2</code> me <code>&gt;&gt;</code> shift operator hai. Lekin <code>vector&lt;vector&lt;int&gt;&gt;</code> me wahi <code>&gt;&gt;</code> <strong>do closing brackets</strong> hain. Lexer ko context nahi pata, woh <code>GREATER_GREATER</code> deta hai. <strong>Parser</strong> type padhte waqt (flag <code>allow_split_greater_greater_</code>) us token ko do <code>&gt;</code> maan leta hai. (C++ compilers ko bhi yahi karna padta hai.)</p>`}
],
say:`The lexer turns characters into tokens with a type, the lexeme, and a line and column for error messages. It skips whitespace, comments and preprocessor lines like #include, reads numbers, identifiers and strings, checks identifiers against a keyword table, and uses maximal munch so greater-or-equal is one token. One subtle case is the shift operator versus nested generics like vector of vector of int: the lexer can't know the context, so it emits a shift token and the parser splits it into two closing angle brackets when it's parsing a type.`,
hook:`Characters → tokens (+line/col). Maximal munch. # line skip. >> ko parser type context me split karta hai.`,
check:[
[`"a>=b" me kitne tokens?`,`3: IDENT, GREATER_EQUAL, IDENT.`],
[`vector<vector<int>> ka >> kaun handle karta hai?`,`Parser — type context me GREATER_GREATER ko do > me split.`]
]
},
{
h:`Parser: grammar, precedence aur recursive descent`,
words:[
[`Grammar`,`Rules jo batate hain valid code kaisa dikhta hai.`],
[`Precedence`,`Kaunsa operator pehle bandhega: <code>*</code> &gt; <code>+</code>.`],
[`Associativity`,`Same level pe left se ya right se: <code>a - b - c</code> = <code>(a - b) - c</code>.`],
[`Recursive descent`,`Har grammar rule = ek C++ function; functions ek doosre ko call karte hain.`]
],
steps:[
{t:`13 levels ki seedhi`, d:`precedence`},
{t:`Ek level ka code (sab levels isi pattern pe)`, code:`
ExprPtr Parser::parse_term() {                  // + -
    ExprPtr expr = parse_factor();               // pehle higher level (* / %)
    while (match(TokenType::PLUS) || match(TokenType::MINUS)) {
        TokenType op = previous().type;
        ExprPtr right = parse_factor();
        expr = make_binary(previous().line, op, std::move(expr), std::move(right));
    }
    return expr;
}`, after:`<ul><li><strong>Higher level pehle call</strong> → <code>*</code> ke operands pehle ban jaate hain → precedence apne aap sahi.</li><li><strong>while loop</strong> → <code>1 - 2 - 3</code> = <code>(1 - 2) - 3</code> → <strong>left-associative</strong>.</li></ul>`},
{t:`Walkthrough: 1 + 2 * 3`, b:`<ol><li><code>parse_term</code> → <code>parse_factor</code> → ... → primary: <strong>1</strong>.</li><li>factor me <code>*</code> nahi (agla token <code>+</code>) → 1 wapas term tak.</li><li>term me <code>+</code> match → right ke liye <code>parse_factor</code>.</li><li>factor: primary <strong>2</strong>, phir <code>*</code> match → primary <strong>3</strong> → <code>Binary(*, 2, 3)</code>.</li><li>term: <code>Binary(+, 1, Binary(*, 2, 3))</code> ✓</li></ol>`},
{t:`Assignment right-associative`, code:`
ExprPtr Parser::parse_expression() {
    ExprPtr expr = parse_ternary();
    if (match(TokenType::EQUAL)) {
        ExprPtr value = parse_expression();      // recursion → a = (b = c)
        return make_assign(line, std::move(expr), std::move(value));
    }
    // += -= *= /= %= → compound assign, same idea
    return expr;
}`, after:`<p>Loop nahi, <strong>recursion</strong> → <code>a = b = c</code> = <code>a = (b = c)</code>. Ternary <code>c ? x : y</code> bhi apna level hai.</p>`},
{t:`Parser generator (yacc/ANTLR) kyun nahi?`, b:`<ul><li>Hand-written = <strong>error messages aur recovery</strong> pe full control.</li><li>C++ quirks (<code>&gt;&gt;</code> split) aasaani se.</li><li>Debug karna aasaan — normal C++ functions.</li><li>Trade-off: grammar badi ho to zyada code.</li></ul>`}
],
say:`The parser is hand-written recursive descent. Each of the 13 precedence levels — from assignment and ternary down through logical, bitwise, equality, comparison, shift, additive, multiplicative, unary, call and primary — is a function that first calls the next tighter level for its operands, so precedence falls out naturally. A while loop inside each level builds left-associative trees, so one minus two minus three groups from the left, while assignment calls parse_expression recursively on its right side, making it right-associative. I chose hand-written parsing over a generator for control over error messages and recovery and to handle C++-style quirks.`,
hook:`Level function → pehle tighter level call → while = left-assoc, recursion = right-assoc.`,
check:[
[`2 * 3 + 4 ka tree?`,`Binary(+, Binary(*, 2, 3), 4).`],
[`a = b = c kaise group hota hai?`,`a = (b = c) — right-associative (recursion).`],
[`Naya operator ** (power) add karna ho to?`,`Unary aur factor ke beech naya level function; right-associative ke liye recursion.`]
]
},
{
h:`AST: std::variant + unique_ptr design`,
words:[
[`AST`,`Abstract Syntax Tree — brackets/semicolons hata ke sirf structure.`],
[`std::variant`,`Type-safe union: value in kai types me se exactly ek.`],
[`std::visit`,`Variant ke andar jo type hai, us type ke liye code chalao.`],
[`unique_ptr`,`Ek hi maalik wala smart pointer; maalik khatam → memory free.`]
],
steps:[
{t:`Tree ka shape`, d:`ast`},
{t:`Nodes kaise banaye`, code:`
using ExprPtr = std::unique_ptr<Expr>;

struct LiteralIntExpr { int64_t value; };
struct BinaryExpr     { TokenType op; ExprPtr left; ExprPtr right; };
struct VarRefExpr     { std::string name; };
struct AssignExpr     { ExprPtr lhs; ExprPtr value; };
struct CallExpr       { std::string callee; std::vector<ExprPtr> args; };
// ... more node structs

using ExprNode = std::variant<LiteralIntExpr, BinaryExpr, VarRefExpr, AssignExpr, CallExpr /* , ... */>;
struct Expr { ExprNode node; int line; };`},
{t:`Nodes pe kaam: std::visit`, code:`
std::visit([&](auto&& arg) {
    using T = std::decay_t<decltype(arg)>;
    if constexpr (std::is_same_v<T, BinaryExpr>)      { /* ... */ }
    else if constexpr (std::is_same_v<T, VarRefExpr>) { /* ... */ }
}, expr->node);`},
{t:`Variant vs inheritance (classic OOP)`, b:`<div class="tbl-wrap"><table><tr><th></th><th>std::variant</th><th>Base class + virtual</th></tr><tr><td>Memory</td><td>node inline, heap alloc kam</td><td>har node alag heap object</td></tr><tr><td>Naya pass (optimizer, codegen)</td><td>aasaan: ek aur visit</td><td>har class me virtual method ya Visitor pattern</td></tr><tr><td>Naya node type</td><td>saare visits update (compiler yaad dilata)</td><td>ek class add</td></tr></table></div><p>Compiler me node types kam badalte hain, passes zyada → variant fit.</p>`},
{t:`Ownership`, b:`<p>Har parent apne children ka <strong>unique_ptr</strong> se maalik. Root (statements vector) scope se bahar → poora tree apne aap free (RAII). Optimizer nodes <strong>move</strong> karke replace karta hai (<code>optimize_expr(std::move(a))</code>) — copy nahi.</p>`}
],
say:`AST nodes are structs held in a std::variant, with child nodes owned through unique_ptr, so the whole tree is freed automatically when the root goes out of scope. Passes like semantic analysis, optimisation and code generation use std::visit to dispatch on the node type. I chose variant over a class hierarchy because a compiler adds passes more often than node types: each pass is just another visit, and the compiler checks that I handle every alternative. The optimiser rewrites the tree by moving nodes rather than copying them.`,
hook:`variant = node types, unique_ptr = ownership (RAII), std::visit = har pass.`,
check:[
[`unique_ptr kyun, shared_ptr kyun nahi?`,`Har node ka ek hi parent/maalik; shared_ptr ka refcount overhead bekaar.`],
[`Naya optimization pass add karna — variant me kitna kaam?`,`Ek aur std::visit function.`]
]
},
{
h:`Error recovery: panic mode (synchronize)`,
words:[
[`Syntax error`,`Code grammar tod raha hai, jaise missing semicolon.`],
[`Cascading errors`,`Ek galti ki wajah se aage ke saare galat errors.`],
[`Synchronization point`,`Jagah jahan se parsing dobara bharose se shuru ho sake.`]
],
steps:[
{t:`Problem`, b:`<p>Pehli error pe ruk jao to user ko ek-ek karke errors theek karne padenge. Chalte raho to ek galti se 20 fake errors. Beech ka raasta: <strong>panic mode</strong>.</p>`},
{t:`synchronize() ka code`, code:`
void Parser::synchronize() {
    advance();
    while (!is_at_end()) {
        if (previous().type == TokenType::SEMICOLON) return;   // statement khatam
        switch (peek().type) {
            case TokenType::KW_FN:   case TokenType::KW_LET:  case TokenType::KW_IF:
            case TokenType::KW_WHILE: case TokenType::KW_FOR: case TokenType::KW_RETURN:
            case TokenType::KW_PRINT: case TokenType::KW_STRUCT: case TokenType::KW_ENUM:
            case TokenType::KW_SWITCH: case TokenType::KW_DO: case TokenType::KW_CONST:
                return;                                          // naya statement shuru
            default: advance();                                  // skip
        }
    }
}`},
{t:`Example`, code:`
int main() {
    int a = 10          // ; missing
    int b = ;           // expression missing
    return a + b;
}`, after:`<ol><li><code>int a = 10</code> ke baad <code>;</code> expected → error (line 2, column) → synchronize → tokens skip jab tak <code>;</code> ya statement keyword.</li><li>Agle statement se parsing wapas → <code>int b = ;</code> pe doosri <strong>real</strong> error.</li><li>Ek run me dono errors, fake cascade nahi.</li></ol>`},
{t:`Error message format`, b:`<p>ErrorReporter source line dikhata hai + line/column + message, jaise <code>Expected ';' after variable declaration at 'int'</code>. Browser IDE me yahi text output panel me.</p>`}
],
say:`When the parser hits a syntax error it reports it with line and column, then enters panic mode: synchronize skips tokens until it passes a semicolon or sees a keyword that starts a new statement, such as if, while, return or const, and parsing resumes there. That lets one run report several independent errors without a cascade of bogus ones caused by the first mistake.`,
hook:`Error → report → skip till ; ya statement keyword → continue. Kai real errors, cascade nahi.`,
check:[
[`Panic mode ka fayda?`,`Ek run me kai independent errors, bina fake cascade.`],
[`Synchronization points kya hain?`,`Semicolon ke baad, ya fn/let/if/while/for/return/print/struct/enum/switch/do/const keyword.`]
]
}
],
cards:[
{q:`Walk me through MiniLang's architecture.`, s:`Lexer → recursive-descent parser (13 levels, panic mode) → semantic (scopes, types) → optimizer (fold/propagate/DCE) → codegen → 60-opcode stack VM → WASM IDE; + C++ transpiler.`, a:`A lexer produces tokens, a recursive-descent parser builds an AST, a semantic analyzer checks scopes and types, an optimizer folds constants and removes dead code, and a code generator emits bytecode for a 60-opcode stack VM. The same C++ compiles to WebAssembly for a browser IDE with a debugger, and a transpiler can also emit C++ for a native build.`},
{q:`Compiler vs interpreter vs bytecode VM?`, s:`Interpreter AST seedha chalata. AOT compiler machine code. Bytecode VM: compile → bytecode → VM loop (JVM/CPython). MiniLang = bytecode VM.`, a:`An interpreter executes source or the syntax tree directly, an ahead-of-time compiler produces machine code, and a bytecode VM compiles to a compact instruction set run by a virtual machine, like the JVM or CPython. MiniLang uses a bytecode VM.`},
{q:`Why a bytecode VM instead of a tree-walking interpreter?`, s:`Flat instructions → fast; portable → WASM; debugger step natural; native codegen se kam kaam.`, a:`A flat bytecode array is faster to execute than walking pointers through a tree, it's portable enough to compile to WebAssembly unchanged, and it makes a step-by-step debugger natural — with far less work than generating native machine code.`},
{q:`What does the lexer do? What's maximal munch?`, s:`Characters → tokens + line/col, keywords table, comments/# skip. Maximal munch: >= ek token.`, a:`It scans characters into typed tokens with line and column, recognising keywords, identifiers, numbers, strings and operators, and skipping whitespace, comments and preprocessor lines. Maximal munch means taking the longest valid token, so greater-or-equal is one token, not two.`},
{q:`How do you handle '>>' in vector<vector<int>>?`, s:`Lexer GREATER_GREATER deta; parser type context me use do > me split karta.`, a:`The lexer can't know context, so it emits a shift token. When the parser is reading a type, it's allowed to split that token into two closing angle brackets — the same trick C++ compilers use.`},
{q:`How does your parser handle precedence and associativity?`, s:`13 level functions; har function pehle tighter level call; while loop = left-assoc; assignment recursion = right-assoc.`, a:`Each of the 13 precedence levels is a function that calls the next tighter level for its operands, so tighter operators bind first. A loop within each level makes binary operators left-associative, and assignment recurses on its right side, making it right-associative.`},
{q:`Parse 1 + 2 * 3 step by step.`, s:`term → factor → 1; + match; factor → 2, * match, 3 → Binary(*,2,3); result Binary(+,1,Binary(*,2,3)).`, a:`parse_term asks parse_factor for the left operand, which returns 1 because the next token is plus. parse_term matches plus and calls parse_factor again, which reads 2, matches star, reads 3 and returns 2 times 3. The result is 1 plus the product.`},
{q:`Why hand-write the parser instead of using a generator?`, s:`Error messages + recovery control, C++ quirks, debug aasaan. Trade-off: zyada code.`, a:`Hand-written recursive descent gives full control over error messages and recovery, handles C++-style quirks like splitting shift tokens, and is easy to debug as ordinary functions. The trade-off is more code as the grammar grows.`},
{q:`How is the AST represented?`, s:`Node structs std::variant me, children unique_ptr (RAII free), passes std::visit.`, a:`Each node kind is a struct inside a std::variant, children are owned by unique_ptr so the tree frees itself, and every pass — semantic analysis, optimisation, codegen — dispatches with std::visit.`},
{q:`Why std::variant instead of a class hierarchy for AST nodes?`, s:`Passes zyada, node types kam badalte. Naya pass = ek visit; compiler missing cases pakadta; heap allocs kam.`, a:`Compilers add passes more often than node types. With variant, a new pass is just another visit and the compiler flags unhandled alternatives, with fewer allocations. A hierarchy makes adding node types easy but every pass needs virtual methods or a visitor.`},
{q:`What happens on a syntax error?`, s:`Report line/col → synchronize: skip till ; ya statement keyword → continue → kai real errors, cascade nahi.`, a:`The parser reports the error with line and column, then synchronize skips tokens until a semicolon or a statement-starting keyword, and parsing continues. One run reports multiple independent errors without a cascade caused by the first one.`}
]
});
