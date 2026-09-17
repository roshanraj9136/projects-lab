TOPICS.push({
id:'ml-back', name:'MiniLang 3 · Bytecode, VM, WebAssembly + tough questions', group:'MiniLang · Compiler, Bytecode VM & Browser IDE', tier:'liab',
intro:`Resume: "Designed a stack-based VM with 60 opcodes and call frames; compiled it to WebAssembly for a client-side IDE (Monaco) with a step-through debugger for bytecode, stack, and locals; 14 end-to-end tests in GitHub Actions CI." Systems interviewer ka favourite: "function call VM me kaise hota hai?", "jumps kaise patch hote hain?", "pointer kya hai tumhare VM me?". Sab bytecode live WASM build se nikala hai.`,
lessons:[
{
h:`Bytecode format + expressions ka codegen`,
words:[
[`Opcode`,`Instruction ka type, 1 byte (PUSH_INT, ADD, CALL...).`],
[`Operand`,`Instruction ka extra data (constant index, slot number, jump target).`],
[`Constant pool`,`Chunk ki list jisme literal values (numbers, strings) rehti hain.`],
[`Chunk`,`Ek function ka bytecode + constants + line numbers.`],
[`Stack machine`,`Operands stack pe; instruction pop karke result push.`],
[`Slot`,`Local variable ka stack me fixed position.`]
],
steps:[
{t:`Instruction encoding`, b:`<p><strong>1 byte opcode</strong> + zarurat ho to operands. Constant index / slot / jump target = <strong>2 bytes (16-bit, big-endian)</strong>.</p>`, code:`
uint16_t VM::read_short() {
    uint8_t high = read_byte();
    uint8_t low  = read_byte();
    return (high << 8) | low;
}
// struct Chunk { vector<uint8_t> code; vector<Value> constants; vector<int> lines; };`, after:`<p>Isliye disassembly me offsets 0000, 0003, 0006... (1 + 2 bytes per PUSH_INT). <code>lines</code> har byte ka source line → runtime error me line number.</p>`},
{t:`Expression = postfix order`, b:`<p>Tree ko <strong>post-order</strong> me chalo: pehle left, phir right, phir operator. <code>a + b * 2</code> →</p>`, code:`
LOAD_LOCAL 0 (a)
LOAD_LOCAL 1 (b)
PUSH_INT   k (2)
MUL
ADD`},
{t:`Locals = stack slots`, b:`<p>Real bytecode me <code>int i = 0;</code> sirf <code>PUSH_INT 0</code> hai — <strong>pushed value hi slot 0 ban jaati hai</strong>. Codegen compile time pe har local ka slot number yaad rakhta hai; runtime pe <code>LOAD_LOCAL 0</code> = <code>stack[base + 0]</code>. Block khatam → uske locals ke liye <code>POP</code>.</p>`},
{t:`Assignment ek expression hai`, code:`
i = i + 1;
// LOAD_LOCAL 0 · PUSH_INT 1 · ADD · STORE_LOCAL 0 · POP`, after:`<p><code>STORE_LOCAL</code> value stack pe chhod deta hai (taaki <code>a = b = c</code> chale). Statement ke end pe wo value bekaar → <code>POP</code>.</p>`}
],
say:`Each function compiles to a chunk: a byte array of instructions, a constant pool and per-byte line numbers. An instruction is a one-byte opcode, and operands such as constant indexes, local slots and jump targets are 16-bit big-endian. Expressions are emitted in post-order, so a plus b times two becomes load a, load b, push two, multiply, add. Locals live in stack slots — declaring a variable just pushes its initial value, which becomes the slot — and because assignment is an expression that leaves its value on the stack, an expression statement ends with a POP.`,
hook:`1-byte opcode + 16-bit operands. Post-order emit. Local = stack slot. Assignment value → POP.`,
check:[
[`PUSH_INT kitne bytes?`,`3 (opcode + 16-bit constant index).`],
[`x * (y + 1) ka bytecode order?`,`LOAD x, LOAD y, PUSH 1, ADD, MUL.`]
]
},
{
h:`Control flow: jumps aur backpatching (real while loop)`,
words:[
[`Jump`,`ip (instruction pointer) ko kisi aur offset pe set karna.`],
[`Conditional jump`,`JUMP_IF_FALSE: top value false ho to jump.`],
[`Backpatching`,`Target baad me pata chalta hai → abhi placeholder, baad me bharo.`],
[`Absolute jump`,`Target = exact offset (relative = kitna aage/peeche).`]
],
steps:[
{t:`while (i < 3) { i = i + 1; } — live bytecode`, d:`whileLayout`},
{t:`Codegen ka code`, code:`
void CodeGenerator::generate_while(const WhileStmt& stmt, int line) {
    int loop_start = current_chunk_->code.size();
    loop_stack_.push_back({{}, {}});                       // break/continue lists

    generate_expr(*stmt.condition);
    int exit_jump = current_chunk_->emit_jump(OpCode::JUMP_IF_FALSE, line);  // 0xFFFF
    generate_stmt(*stmt.body);
    current_chunk_->emit_op_with_arg(OpCode::JUMP, loop_start, line);         // back
    current_chunk_->patch_jump(exit_jump);                                     // fill exit

    for (int j : loop_stack_.back().break_jumps)    current_chunk_->patch_jump(j);
    for (int j : loop_stack_.back().continue_jumps) current_chunk_->patch_jump_to(j, loop_start);
    loop_stack_.pop_back();
}`},
{t:`emit_jump + patch_jump`, code:`
int Chunk::emit_jump(OpCode op, int line) {
    emit_op(op, line);
    emit_byte(0xFF, line); emit_byte(0xFF, line);   // placeholder
    return code.size() - 2;                         // placeholder ka offset
}
void Chunk::patch_jump_to(int offset, int target) {
    code[offset]     = (target >> 8) & 0xFF;
    code[offset + 1] = target & 0xFF;
}
void Chunk::patch_jump(int offset) { patch_jump_to(offset, code.size()); }  // "yahan tak"`},
{t:`if/else, for, break, continue`, b:`<ul><li><strong>if/else:</strong> cond → JUMP_IF_FALSE(else) → then → JUMP(end) → patch else → else → patch end.</li><li><strong>for:</strong> init → cond → JUMP_IF_FALSE(exit) → body → <em>update</em> → JUMP(cond). <code>continue</code> <strong>update</strong> pe jaata hai (while me condition pe).</li><li><strong>break/continue:</strong> JUMP placeholder → <code>loop_stack_</code> ki list me → loop end pe patch. Nested loops me stack ka top = innermost loop.</li></ul>`},
{t:`Limit (interview me pooch sakte)`, b:`<p>Targets <strong>16-bit absolute</strong> → ek function ka bytecode max ~65,535 bytes. Constant index bhi 16-bit → 65,536 constants per chunk. Bade functions ke liye: 32-bit operands ya "wide" instruction variants.</p>`}
],
say:`For a while loop, the generator records the loop start, compiles the condition, and emits JUMP_IF_FALSE with a 0xFFFF placeholder because the exit address isn't known yet. It compiles the body, emits an unconditional jump back to the start, then backpatches the placeholder with the current offset. Break and continue emit placeholder jumps that are collected on a loop stack and patched when the loop ends — break to the exit, continue to the condition, or to the update step in a for loop. Jump targets are absolute 16-bit offsets, so a single function is limited to about 65 KB of bytecode.`,
hook:`Placeholder 0xFFFF → body → patch. break → exit, continue → start/update. 16-bit = ~65 KB/function.`,
check:[
[`JUMP_IF_FALSE ka target turant kyun nahi likh sakte?`,`Body kitni lambi hogi pata nahi — isliye placeholder + backpatch.`],
[`for loop me continue kahan jump karta hai?`,`Update expression pe.`]
]
},
{
h:`VM internals: dispatch loop aur Value`,
words:[
[`Dispatch loop`,`<code>while</code>: byte padho → switch → handler chalao.`],
[`ip`,`Instruction pointer — agla byte kaunsa.`],
[`std::variant Value`,`Ek value jo int/float/bool/string/pointer/array me se ek.`],
[`Runtime error`,`Chalte waqt galti: division by zero, bad pointer.`]
],
steps:[
{t:`Value type`, code:`
struct PointerValue { uint32_t index; };                  // stack index
using ArrayValue = std::shared_ptr<std::vector<Value>>;

struct Value {
    std::variant<int64_t, double, bool, std::string, PointerValue, ArrayValue> data;
};`},
{t:`Dispatch loop`, code:`
uint8_t instruction = read_byte();
switch (static_cast<OpCode>(instruction)) {
    case OpCode::PUSH_INT: { uint16_t idx = read_short(); push(current_chunk().constants[idx]); break; }
    case OpCode::ADD: {
        Value b = pop(); Value a = pop();
        if (a.is_int() && b.is_int())           push(Value::make_int(a.as_int() + b.as_int()));
        else if (a.is_float() && b.is_float())   push(Value::make_float(a.as_float() + b.as_float()));
        else if (a.is_string() && b.is_string()) push(Value::make_string(a.as_string() + b.as_string()));
        else { runtime_error("invalid operands for ADD"); return VMStepResult::RUNTIME_ERROR; }
        break;
    }
    case OpCode::DIV: { /* ... */ if (b.as_int() == 0) { runtime_error("division by zero"); ... } }
    ...
}`, after:`<p>Ek step = ek instruction. Isliye debugger <code>wasm_debug_step()</code> ek baar ye loop chala ke ruk sakta hai.</p>`},
{t:`Stack VM vs register VM`, b:`<div class="tbl-wrap"><table><tr><th></th><th>Stack VM (MiniLang, JVM, CPython)</th><th>Register VM (Lua 5, Dalvik)</th></tr><tr><td>Instructions</td><td>chhote, zyada count</td><td>bade, kam count</td></tr><tr><td>Compiler</td><td>simple</td><td>register allocation chahiye</td></tr><tr><td>Speed</td><td>push/pop overhead</td><td>aam taur pe faster</td></tr></table></div>`},
{t:`Speed ideas (poocha jaaye to)`, b:`<ul><li><code>switch</code> ki jagah <strong>computed goto</strong> (threaded dispatch) → branch prediction better.</li><li><code>std::variant</code> + <code>std::string</code> copy ki jagah <strong>tagged union / NaN-boxing</strong>, strings interned.</li><li>Superinstructions (LOAD_LOCAL + PUSH_INT + ADD jod ke ek).</li><li>Honest: maine performance benchmark nahi kiya — number mat banana.</li></ul>`}
],
say:`The VM is a loop that reads an opcode byte, switches on it and runs the handler, popping operands from a value stack and pushing results. A Value is a std::variant of int64, double, bool, string, a pointer — which is a stack index — and an array held by shared_ptr. Handlers type-check at runtime, so dividing by zero or adding mismatched types produces a runtime error with a line number rather than undefined behaviour. I chose a stack VM for its simple code generator; register VMs execute fewer instructions. If performance mattered, I'd start with computed-goto dispatch and a more compact value representation — I haven't benchmarked it.`,
hook:`read byte → switch → pop/push. Value = variant(int64, double, bool, string, ptr index, shared_ptr array).`,
check:[
[`Debugger ka step VM me kya hai?`,`Dispatch loop ka ek iteration — ek instruction.`],
[`Stack VM ka main fayda?`,`Code generator simple; register allocation nahi.`]
]
},
{
h:`Function calls: CALL, RETURN, call frames (stack walkthrough)`,
words:[
[`Call frame`,`Ek function call ka record: {fn_index, ip, base_pointer}.`],
[`Base pointer`,`Stack me is function ke locals kahan se shuru.`],
[`Recursion`,`Function khud ko call kare — har call ka naya frame.`]
],
steps:[
{t:`Frame struct`, code:`
struct CallFrame {
    int fn_index;      // program.functions me index
    int ip;            // is function me agla byte
    int base_pointer;  // stack me locals ka start
};`},
{t:`Real bytecode: int r = add(2, 3);`, code:`
=== Function: add (arity 2) ===
0000  LOAD_LOCAL    0 (a)
0003  LOAD_LOCAL    1 (b)
0006  ADD
0007  RETURN

=== Function: main (arity 0) ===
0000  PUSH_INT      0 (2)
0003  PUSH_INT      1 (3)
0006  CALL          fn_idx:0 argc:2
0010  LOAD_LOCAL    0 (r)`},
{t:`CALL aur RETURN handlers`, code:`
case OpCode::CALL: {
    uint16_t fn_index = read_short();
    uint8_t argc = read_byte();
    CallFrame frame;
    frame.fn_index = fn_index;
    frame.ip = 0;
    frame.base_pointer = stack_.size() - argc;     // args = callee ke pehle locals
    call_frames_.push_back(frame);
    break;
}
case OpCode::RETURN: {
    Value result = pop();
    int base = current_frame().base_pointer;
    call_frames_.pop_back();
    stack_.resize(base);                           // callee ke saare locals gayab
    if (call_frames_.empty()) return VMStepResult::HALTED;
    push(result);                                  // caller ke liye result
    break;
}`},
{t:`Stack walkthrough`, d:`callFrames`, b:`<p><strong>Magic:</strong> args copy nahi hote — jo stack pe pushed the wahi <code>a</code> aur <code>b</code> ban gaye. RETURN ke baad result <strong>exactly us slot</strong> pe aata hai jo main ka local <code>r</code> hai → <code>LOAD_LOCAL 0 (r)</code> kaam karta hai.</p>`},
{t:`Recursion (fib)`, b:`<p><code>fib(10)</code> → har call naya frame, apna base pointer → har level ka <code>n</code> alag slot. Test <code>14_recursion.ml</code> → 55. <strong>Void function</strong> bhi RETURN se pehle dummy <code>PUSH_INT 0</code> karta hai, caller <code>POP</code> karta hai (bytecode me dikhta hai).</p>`}
],
say:`Calls use a stack of frames, each holding the function index, its instruction pointer and a base pointer. For add of two and three, main pushes both arguments; CALL pushes a frame whose base is the stack size minus the argument count, so the arguments become the callee's first two locals without copying. Locals are addressed as base plus slot. RETURN pops the result, pops the frame, truncates the stack back to the base — discarding the callee's locals — and pushes the result, which lands exactly in the slot of main's local r. Recursion just stacks more frames; void functions push a dummy zero that the caller pops.`,
hook:`CALL: base = size − argc (args = locals). RETURN: pop result, resize(base), push result.`,
check:[
[`Stack size 5 hai, CALL argc 2 → base?`,`3.`],
[`Args copy kyun nahi karne padte?`,`Pushed args hi callee ke local slots ban jaate hain (base pointer se).`]
]
},
{
h:`Pointers aur arrays VM me`,
words:[
[`Pointer`,`Yahan: VM stack ka index (asli RAM address nahi).`],
[`Dangling pointer`,`Aisa pointer jo khatam ho chuke slot ko point kare.`],
[`Aliasing`,`Do naam same data ko point karein.`]
],
steps:[
{t:`Real bytecode: inc(&a)`, code:`
=== Function: inc (arity 1) ===         // void inc(int* p) { *p = *p + 1; }
0000  LOAD_LOCAL    0 (p)
0003  LOAD_DEREF                          // stack[p.index] padho
0004  PUSH_INT      0 (1)
0007  ADD
0008  LOAD_LOCAL    0 (p)
0011  STORE_DEREF                         // stack[p.index] = value
0012  POP
0013  PUSH_INT      1 (0)                 // void → dummy return
0016  RETURN

=== Function: main ===
0000  PUSH_INT      0 (5)                 // int a = 5  (slot 0)
0003  LOAD_LOCAL_ADDR 0 (a)               // &a → PointerValue{base+0}
0006  CALL          fn_idx:0 argc:1
0010  POP`},
{t:`Safety check`, code:`
case OpCode::LOAD_DEREF: {
    Value ptr = pop();
    if (!ptr.is_pointer()) { runtime_error("Expected pointer for dereference load"); ... }
    uint32_t addr = ptr.as_pointer();
    if (addr >= stack_.size()) { runtime_error("Dangling or out-of-bounds pointer read"); ... }
    push(stack_[addr]);
}`, after:`<p><strong>Limitation:</strong> sirf out-of-bounds pakda jaata hai. Function return hua, uska slot kisi naye call ne reuse kar liya → purana pointer <strong>galat value</strong> padhega, error nahi. Fix idea: har frame ka generation ID pointer me rakho aur deref pe match karo.</p>`},
{t:`Arrays / vector`, b:`<ul><li><code>NEW_ARRAY</code> → <code>make_shared&lt;vector&lt;Value&gt;&gt;(size, default)</code>; negative size = runtime error.</li><li><code>ARRAY_LOAD</code>/<code>ARRAY_STORE</code> index check karte hain.</li><li>Value me array <strong>shared_ptr</strong> hai → copy karne pe same vector share hota hai (reference-like). C++ <code>vector</code> copy pe deep copy karta hai — ye semantic farak honestly accept karo. <code>FILL_ARRAY</code> nested arrays ko deep copy karta hai taaki 2D grid ki rows alias na hon.</li><li>Memory: shared_ptr refcount → last reference jaate hi free (GC nahi chahiye; cycles possible nahi kyunki array khud ko contain nahi kar sakta).</li></ul>`}
],
say:`A pointer in MiniLang is an index into the VM stack: taking the address of a local pushes its absolute slot, and LOAD_DEREF and STORE_DEREF read and write through it after checking the index is in bounds. That catches wild pointers but not a stale pointer into a slot that's been reused after a return; tagging pointers with a frame generation would fix that. Arrays are shared_ptr to a vector of values, so they're freed by reference counting, but copying an array shares it rather than deep-copying like C++ vector — except FILL_ARRAY, which deep-copies nested rows so a 2D grid doesn't alias.`,
hook:`Pointer = stack index. Bounds check ✓, stale slot ✗. Array = shared_ptr (copy = share), FILL_ARRAY deep copy.`,
check:[
[`&a VM me kya push karta hai?`,`PointerValue{base + slot} — stack index.`],
[`Kaunsa pointer bug VM nahi pakadta?`,`Reuse ho chuke slot ko point karta stale pointer.`]
]
},
{
h:`WebAssembly IDE, debugger, tests, CI`,
words:[
[`Emscripten`,`C/C++ ko WebAssembly + JS glue me compile karne ka toolchain (em++).`],
[`ccall`,`JS se exported C function call karna.`],
[`Monaco`,`VS Code wala editor component, browser me.`],
[`Golden test`,`Program chalao, output ko saved .expected file se compare.`],
[`CI`,`Har push pe automatic build + tests (GitHub Actions).`]
],
steps:[
{t:`Architecture`, d:`wasm`},
{t:`JS side`, code:`
const compileErr = Module.ccall('wasm_compile', 'string', ['string'], [code]);
if (compileErr) showErrors(compileErr);
else output.textContent = Module.ccall('wasm_run', 'string', [], []);

// debugger
Module.ccall('wasm_debug_start', 'number', [], []);
Module.ccall('wasm_debug_step', 'number', [], []);
const stack = Module.ccall('wasm_debug_stack', 'string', [], []);`, after:`<p>C++ side: <code>EMSCRIPTEN_KEEPALIVE extern "C"</code> functions, output ek static <code>std::string</code> buffer me, uska <code>c_str()</code> return (next call tak valid). Makefile: <code>EXPORTED_FUNCTIONS</code> list + <code>ccall/cwrap</code> runtime methods.</p>`},
{t:`Tests`, b:`<p><code>tests/</code> me <strong>14</strong> programs: hello, arithmetic, if/else, for, while, functions, vectors, pointers, nested loops, strings, constant folding, propagation, DCE, recursion. <code>run_tests.sh</code>: <code>minilang run file.ml</code> ka stdout <code>.expected</code> se match + exit code 0 → PASS. GitHub Actions har push pe build + tests.</p>`},
{t:`Bug story: live IDE purana tha`, b:`<ol><li><strong>Symptom:</strong> local tests pass, lekin live IDE me constant-folding test fail aur debugger panel crash.</li><li><strong>Root cause:</strong> committed <code>web/minilang.wasm</code> optimizer banne se <em>pehle</em> ka build tha — native aur WASM alag code chala rahe the.</li><li><strong>Fix:</strong> GitHub Actions workflow jo pinned Emscripten container (<code>emscripten/emsdk:6.0.9</code>) me <code>make -B wasm</code> karke artifact banaye; Makefile fix (<code>em++</code>, unused <code>_main</code> export hataya). Debugger ka apna adhoora bytecode decoder hata ke <strong>disassembler reuse</strong>.</li><li><strong>Verify:</strong> Node me WASM se 14/14 tests, IDE examples same output, phir deploy.</li><li><strong>Learning:</strong> build artifacts source se generate + CI me — haath se commit ki hui binary drift karti hai.</li></ol>`},
{t:`Main thread limitation`, b:`<p>WASM <strong>main thread</strong> pe chalta hai aur run poora hone tak return nahi karta → <code>while(true)</code> program <strong>tab freeze</strong>. Fix: Web Worker me run + instruction budget (har N instructions pe check / cancel). Debug mode me ye problem nahi (step-by-step).</p>`}
],
say:`The browser IDE runs the same compiler and VM compiled to WebAssembly with Emscripten. JavaScript calls exported C functions through Module.ccall — compile, run, and debugger calls to start, step and read the stack, variables and current bytecode — and Monaco provides the editor, so everything runs client-side. Fourteen golden tests compare program output with expected files in GitHub Actions. One bug I fixed: the deployed wasm predated the optimizer, so constant folding failed only in the browser; I added a CI workflow that rebuilds wasm in a pinned Emscripten container, verified all 14 tests through wasm in Node, and made the debugger reuse the real disassembler. A remaining limitation is that runs happen on the main thread, so an infinite loop freezes the tab — a Web Worker with an instruction budget would fix it.`,
hook:`em++ → .wasm; JS ccall exports. 14 golden tests in CI. Stale wasm bug → CI rebuild. Infinite loop = tab freeze (worker fix).`,
check:[
[`Stale WASM bug ka root cause?`,`Committed wasm optimizer se pehle ka build tha.`],
[`Infinite loop se tab kyun freeze?`,`WASM main thread pe synchronously chalta hai.`]
]
},
{
h:`Tough questions + honest limitations`,
words:[[`Trade-off`,`Ek fayda lene ke liye doosra chhodna.`],[`Fuzzing`,`Random/garbage inputs de ke crashes dhoondhna.`]],
steps:[
{t:`"What was the hardest part?"`, b:`<p>Achha answer: <strong>function calls + stack layout</strong> (base pointer, args as locals, return value landing in the right slot) ya <strong>overflow-safe folding</strong>. Ek specific cheez chuno aur detail me samjhao — generic "sab mushkil tha" mat bolo.</p>`},
{t:`Limitations list (ready)`, b:`<div class="tbl-wrap"><table><tr><th>Limitation</th><th>Fix</th></tr><tr><td>Stale pointer detect nahi</td><td>frame generation tags</td></tr><tr><td>Runtime int overflow check nahi (C++ UB)</td><td><code>__builtin_add_overflow</code> etc.</td></tr><tr><td>Recursion depth limit nahi</td><td>max frames → "stack overflow" runtime error</td></tr><tr><td>Infinite loop tab freeze</td><td>Web Worker + instruction budget</td></tr><tr><td>Array copy = share</td><td>copy-on-assign / copy-on-write</td></tr><tr><td>16-bit jumps/constants</td><td>wide operands</td></tr><tr><td>Performance measured nahi</td><td>benchmarks, computed goto</td></tr><tr><td>Sirf end-to-end tests</td><td>lexer/parser unit tests, fuzzing, error-message tests</td></tr></table></div>`},
{t:`"Did you use AI to build this?"`, b:`<p>Honest: "I used AI assistants to speed up implementation, but I own the design and can walk through any part — for example how CALL sets the base pointer, or why folding skips INT64_MIN divided by minus one." Phir turant ek deep example do. <strong>Is lab ke lessons isi liye hain.</strong></p>`},
{t:`"How would you add closures / garbage collection?"`, b:`<ul><li><strong>Closures:</strong> captured variables ko stack se heap "upvalues" me move karo (Lua/clox approach); function value = code + upvalues.</li><li><strong>GC:</strong> abhi shared_ptr refcount kaafi (cycles nahi ban sakte). Structs/objects jo ek doosre ko point karein → cycles → mark-and-sweep chahiye.</li></ul>`}
],
say:`The honest limits are: pointers can't detect a stale slot, integer overflow isn't checked at runtime, there's no recursion depth limit, the browser run can freeze on an infinite loop, copying an array shares it, jump targets are 16-bit, I haven't benchmarked performance, and tests are end-to-end only. For each I know the fix — generation-tagged pointers, checked arithmetic, a frame limit, a Web Worker with an instruction budget, copy-on-write arrays, wider operands, benchmarks with computed-goto dispatch, and unit tests plus fuzzing. The part I found hardest and most interesting was the call-frame layout, where arguments become the callee's locals and the return value lands in the caller's slot.`,
hook:`Limits + fix pair me bolo. Hardest part = ek specific cheez (call frames / safe folding).`,
check:[
[`Recursion bina limit ke WASM me kya hoga?`,`Stack vector badhta rahega → memory khatam → crash/abort.`],
[`Closures kaise add karoge?`,`Captured variables heap upvalues me; function value = code + upvalues.`]
]
}
],
cards:[
{q:`How is bytecode encoded in MiniLang?`, s:`1-byte opcode + 16-bit big-endian operands (constant index, slot, jump target). Chunk = code + constants + lines.`, a:`Each function is a chunk with a byte array, a constant pool and per-byte line numbers. Instructions are a one-byte opcode followed by 16-bit big-endian operands such as constant indexes, local slots or jump targets.`},
{q:`How are local variables stored?`, s:`Stack slots. Declaration ki pushed value hi slot. LOAD_LOCAL n = stack[base + n]. Block end POP.`, a:`As stack slots relative to the frame's base pointer. Declaring a variable pushes its initial value, which becomes the slot; LOAD_LOCAL and STORE_LOCAL index base plus slot, and leaving a block pops its locals.`},
{q:`How do you compile a while loop?`, s:`loop_start; cond; JUMP_IF_FALSE placeholder; body; JUMP loop_start; patch exit; break→exit, continue→start.`, a:`Record the loop start, compile the condition, emit JUMP_IF_FALSE with a placeholder, compile the body, jump back to the start, then patch the placeholder to the current offset. Break jumps are patched to the exit and continue jumps to the start.`},
{q:`What is backpatching?`, s:`Forward jump ka target pata nahi → 0xFFFF placeholder, offset yaad; baad me real target likho.`, a:`When emitting a forward jump, the target isn't known yet, so you write a placeholder, remember its offset, and fill in the real address once the code after it has been generated.`},
{q:`How do function calls work in your VM?`, s:`CALL: frame {fn_index, ip 0, base = size − argc}; args = locals. RETURN: pop result, pop frame, resize(base), push result.`, a:`Arguments are pushed, then CALL pushes a frame with the function index, ip zero and a base pointer equal to stack size minus argument count, so the arguments become the callee's first locals. RETURN pops the result, pops the frame, truncates the stack to the base and pushes the result for the caller.`},
{q:`What does a Value look like in the VM?`, s:`std::variant<int64, double, bool, string, PointerValue(stack index), shared_ptr<vector<Value>>>.`, a:`A std::variant of int64, double, bool, string, a pointer that stores a stack index, and an array held by shared_ptr to a vector of values.`},
{q:`How are pointers implemented and what can go wrong?`, s:`Pointer = stack index. LOAD/STORE_DEREF bounds check. Stale slot (reused after return) detect nahi → generation tag fix.`, a:`A pointer is a stack index; dereferencing checks it's in bounds. It can't detect a stale pointer into a slot reused after the function returned — tagging pointers with a frame generation would fix that.`},
{q:`Stack VM vs register VM?`, s:`Stack: simple compiler, chhote instructions, zyada push/pop. Register: kam instructions, faster, register allocation chahiye.`, a:`A stack VM has a simpler compiler and compact instructions but more push and pop work. A register VM, like Lua's, executes fewer instructions and is usually faster but needs register allocation.`},
{q:`How does the browser IDE run C++ code?`, s:`Emscripten em++ → wasm + JS glue. JS Module.ccall exported functions (compile, run, debug_step, stack...). Monaco editor. Client-side.`, a:`Emscripten compiles the compiler and VM to WebAssembly. JavaScript calls exported C functions through Module.ccall — compile, run, step the debugger and read the stack, variables and bytecode — with Monaco as the editor, all client-side.`},
{q:`How is MiniLang tested?`, s:`14 golden end-to-end tests (.ml vs .expected, exit 0) via run_tests.sh in GitHub Actions. Missing: unit tests, fuzzing.`, a:`Fourteen end-to-end golden tests run each program and compare stdout with an expected file, in GitHub Actions. I'd add lexer and parser unit tests, error-message tests and fuzzing.`},
{q:`Tell me about a bug you fixed in MiniLang.`, s:`Live IDE me folding test fail + debugger crash → committed wasm optimizer se purana → CI me pinned emsdk rebuild, 14/14 via WASM, debugger disassembler reuse.`, a:`Constant folding failed and the debugger crashed only in the live IDE. The committed wasm predated the optimizer. I added a CI workflow that rebuilds wasm in a pinned Emscripten container, verified all 14 tests through wasm in Node, and made the debugger reuse the real disassembler.`},
{q:`What are MiniLang's main limitations?`, s:`Stale pointers, no runtime overflow check, no recursion limit, main-thread freeze, array copy shares, 16-bit jumps, no benchmarks, only e2e tests.`, a:`Stale pointers aren't detected, runtime integer overflow isn't checked, recursion has no depth limit, an infinite loop freezes the browser tab, array copies share storage, jumps are 16-bit, performance isn't benchmarked, and tests are end-to-end only — each with a known fix.`},
{q:`How would you stop an infinite loop from freezing the IDE?`, s:`Web Worker me run + instruction budget/cancel; main thread free.`, a:`Run the VM in a Web Worker so the page stays responsive, and add an instruction budget that yields or lets the user cancel after a set number of steps.`}
]
});
