/**
 * Safe scientific-calculator evaluator (recursive descent; never uses eval).
 * Supports + − × ÷ ^, parentheses, implicit multiplication, sin cos tan ln log √, π, e and ANS.
 */
export type AngleMode = "DEG" | "RAD";

type Tok = { t: "num"; v: number } | { t: "op"; v: string } | { t: "fn"; v: string } | { t: "lp" } | { t: "rp" } | { t: "const"; v: number };

const FNS = ["sin", "cos", "tan", "ln", "log", "√", "sqrt"];

function tokenize(src: string, ans: number): Tok[] {
  const s = src.replace(/\s+/g, "").replace(/\*/g, "×").replace(/\//g, "÷").replace(/−/g, "-");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
      if (!m) throw new Error("Bad number");
      out.push({ t: "num", v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if ("+-×÷^".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      out.push({ t: "lp" });
      i++;
      continue;
    }
    if (c === ")") {
      out.push({ t: "rp" });
      i++;
      continue;
    }
    if (c === "π") {
      out.push({ t: "const", v: Math.PI });
      i++;
      continue;
    }
    if (s.startsWith("pi", i)) {
      out.push({ t: "const", v: Math.PI });
      i += 2;
      continue;
    }
    if (s.startsWith("ANS", i)) {
      out.push({ t: "const", v: ans });
      i += 3;
      continue;
    }
    const fn = FNS.find((f) => s.startsWith(f, i));
    if (fn) {
      out.push({ t: "fn", v: fn === "sqrt" ? "√" : fn });
      i += fn.length;
      continue;
    }
    if (c === "e") {
      out.push({ t: "const", v: Math.E });
      i++;
      continue;
    }
    throw new Error(`Unexpected "${c}"`);
  }
  return out;
}

export function evaluate(src: string, mode: AngleMode = "DEG", ans = 0): number {
  const toks = tokenize(src, ans);
  let p = 0;
  const peek = () => toks[p];
  const toRad = (x: number) => (mode === "DEG" ? (x * Math.PI) / 180 : x);
  const startsPrimary = (t?: Tok) => !!t && (t.t === "num" || t.t === "const" || t.t === "fn" || t.t === "lp");

  function expr(): number {
    let v = term();
    for (let t = peek(); t && t.t === "op" && (t.v === "+" || t.v === "-"); t = peek()) {
      p++;
      v = t.v === "+" ? v + term() : v - term();
    }
    return v;
  }
  function term(): number {
    let v = unary();
    for (;;) {
      const t = peek();
      if (t && t.t === "op" && (t.v === "×" || t.v === "÷")) {
        p++;
        const r = unary();
        if (t.v === "÷" && r === 0) throw new Error("Can't divide by zero");
        v = t.v === "×" ? v * r : v / r;
      } else if (startsPrimary(t)) v *= power(); // implicit multiplication: 2π, 3(4), 2sin30
      else return v;
    }
  }
  // Unary minus binds looser than ^, so -2^2 = -4.
  function unary(): number {
    const t = peek();
    if (t && t.t === "op" && (t.v === "-" || t.v === "+")) {
      p++;
      const v = unary();
      return t.v === "-" ? -v : v;
    }
    return power();
  }
  function power(): number {
    const b = primary();
    const t = peek();
    if (t && t.t === "op" && t.v === "^") {
      p++;
      return Math.pow(b, unary()); // right-associative; allows 2^-1
    }
    return b;
  }
  function primary(): number {
    const t = toks[p++];
    if (!t) throw new Error("Incomplete expression");
    if (t.t === "num" || t.t === "const") return t.v;
    if (t.t === "lp") {
      const v = expr();
      if (peek()?.t === "rp") p++; // tolerate a missing final ")"
      return v;
    }
    if (t.t === "fn") {
      const x = t.v === "√" ? unary() : primary();
      switch (t.v) {
        case "sin":
          return round(Math.sin(toRad(x)));
        case "cos":
          return round(Math.cos(toRad(x)));
        case "tan": {
          const c = Math.cos(toRad(x));
          if (Math.abs(c) < 1e-12) throw new Error("tan is undefined here");
          return round(Math.tan(toRad(x)));
        }
        case "ln":
          if (x <= 0) throw new Error("ln needs a positive number");
          return Math.log(x);
        case "log":
          if (x <= 0) throw new Error("log needs a positive number");
          return Math.log10(x);
        case "√":
          if (x < 0) throw new Error("√ needs a non-negative number");
          return Math.sqrt(x);
      }
    }
    throw new Error("Syntax error");
  }

  const v = expr();
  if (p < toks.length) throw new Error("Syntax error");
  if (!Number.isFinite(v)) throw new Error("Result is too large");
  return v;
}

/** Clean up floating-point noise like sin(180°) = 1.2e-16. */
function round(x: number) {
  return Math.abs(x) < 1e-12 ? 0 : Math.round(x * 1e12) / 1e12;
}

export function format(x: number): string {
  if (Number.isInteger(x) && Math.abs(x) < 1e15) return String(x);
  const s = Number(x.toPrecision(12)).toString();
  return s.includes("e") ? x.toExponential(8) : s;
}
