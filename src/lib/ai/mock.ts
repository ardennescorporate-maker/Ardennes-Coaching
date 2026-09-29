/** Canned tutor replies for mock mode. Streams in small chunks like the real thing. */
export async function* mockTutorStream(question: string): AsyncGenerator<string> {
  const q = question.trim().slice(0, 120);
  const text = `G'day! Great question${q ? ` about **${q.replace(/[*_`]/g, "")}**` : ""}. Let's take off, one step at a time.

**1. Start with the idea.** Name the key concept and what it's used for. For example, a derivative tells you the gradient of a curve at a point.

**2. Work an example.** Differentiate $y = 3x^2 - 5x$:

$$\\frac{dy}{dx} = 6x - 5$$

**3. Check it.** At $x = 1$, the gradient is $6(1) - 5 = 1$, which matches a gentle upward slope.

> _I'm running in demo mode, so this is a sample answer. Connect an Anthropic API key for real tutoring._

**Quick check:** what is $\\frac{dy}{dx}$ for $y = x^3$?`;
  for (let i = 0; i < text.length; i += 24) {
    yield text.slice(i, i + 24);
    await new Promise((r) => setTimeout(r, 15));
  }
}
