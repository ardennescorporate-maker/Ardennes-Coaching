import type { LessonContent } from "@/lib/domain/lesson";

/** Built-in lessons that work without AI, keyed by "Subject|Lesson title". */
export const BUILTIN_LESSONS: Record<string, LessonContent> = {
  "Mathematics Advanced|What is a function?": {
    hook: "Every time you type a number into a calculator and get exactly one answer back, you're using a function. Let's find out what makes a rule a function!",
    goals: [
      "Explain what a relation and a function are",
      "Use function notation like $f(x)$ to evaluate values",
      "Use the vertical line test to decide if a graph is a function",
    ],
    steps: [
      {
        title: "Relations: pairing inputs with outputs",
        body: "A **relation** is any set of ordered pairs $(x, y)$ that links inputs to outputs. For example, $\\{(1, 2), (2, 4), (3, 6)\\}$ pairs each number with its double.\n\nThe set of inputs is the **domain** and the set of outputs is the **range**. A relation can be shown as a list of pairs, a table, a mapping diagram, an equation or a graph.",
        example: "The relation $\\{(1, 5), (2, 7), (3, 9)\\}$ has domain $\\{1, 2, 3\\}$ and range $\\{5, 7, 9\\}$.",
      },
      {
        title: "Functions: exactly one output",
        body: "A **function** is a special relation where every input gives **exactly one** output. Two inputs may share an output, but one input can never give two different outputs.\n\n- $\\{(1, 3), (2, 3)\\}$ **is** a function (different inputs, same output is fine).\n- $\\{(1, 3), (1, 4)\\}$ is **not** a function (the input 1 gives two outputs).",
      },
      {
        title: "Function notation",
        body: "We name functions with letters like $f$ and write $f(x)$ for \"the output of $f$ when the input is $x$\". To **evaluate**, substitute the input everywhere you see $x$.\n\nWriting $y = f(x)$ reminds us that the output $y$ depends on the input $x$.",
        example: "If $f(x) = 2x^2 - 3$, then $f(4) = 2(4)^2 - 3 = 2(16) - 3 = 29$, and $f(-1) = 2(1) - 3 = -1$.",
      },
      {
        title: "The vertical line test",
        body: "To check if a **graph** is a function, imagine sliding a vertical line across it. If any vertical line crosses the graph **more than once**, some input has two outputs, so it is **not** a function.\n\nA parabola $y = x^2$ passes the test. A circle $x^2 + y^2 = 9$ fails, because the line $x = 0$ hits it at $y = 3$ and $y = -3$.",
      },
    ],
    questions: [
      {
        q: "Which relation is a function?",
        options: ["$\\{(2, 1), (2, 5), (3, 4)\\}$", "$\\{(1, 4), (2, 4), (3, 4)\\}$", "$\\{(0, 0), (0, 1)\\}$", "$\\{(5, 2), (5, 3)\\}$"],
        answer: "B",
        explain: "In B every input (1, 2 and 3) has exactly one output. The others each repeat an input with a different output.",
      },
      {
        q: "If $f(x) = 3x - 7$, what is $f(5)$?",
        options: ["$8$", "$-2$", "$22$", "$15$"],
        answer: "A",
        explain: "Substitute $x = 5$: $f(5) = 3(5) - 7 = 15 - 7 = 8$.",
      },
      {
        q: "Which graph fails the vertical line test?",
        options: ["$y = 2x + 1$", "$y = x^2 - 4$", "$x^2 + y^2 = 16$", "$y = x^3$"],
        answer: "C",
        explain: "$x^2 + y^2 = 16$ is a circle. The vertical line $x = 0$ meets it at $y = 4$ and $y = -4$, so one input has two outputs.",
      },
      {
        q: "For $g(x) = x^2 + 1$, what is $g(-3)$?",
        options: ["$-8$", "$10$", "$-5$", "$7$"],
        answer: "B",
        explain: "$g(-3) = (-3)^2 + 1 = 9 + 1 = 10$. Remember a negative number squared is positive.",
      },
    ],
    summary: [
      "A function gives exactly one output for every input.",
      "$f(x)$ means the output of $f$ when the input is $x$; substitute to evaluate.",
      "A graph is a function if every vertical line crosses it at most once.",
    ],
  },
  "Chemistry|Reversible reactions and dynamic equilibrium": {
    hook: "When you open a fizzy drink, bubbles rush out. Seal it, and the fizz stays. That's a reversible reaction reaching equilibrium right in your hand!",
    goals: [
      "Distinguish reversible and irreversible reactions",
      "Describe dynamic equilibrium in a closed system",
      "Explain why concentrations stay constant while reactions continue",
    ],
    steps: [
      {
        title: "Reversible reactions",
        body: "Most reactions you've seen go one way, like burning methane. A **reversible reaction** can go both forwards and backwards, so products can turn back into reactants. We show this with the double arrow $\\rightleftharpoons$.\n\nExample: $\\text{N}_2\\text{O}_4(g) \\rightleftharpoons 2\\text{NO}_2(g)$. Colourless $\\text{N}_2\\text{O}_4$ forms brown $\\text{NO}_2$, and $\\text{NO}_2$ recombines into $\\text{N}_2\\text{O}_4$.",
      },
      {
        title: "Closed systems",
        body: "Equilibrium can only be reached in a **closed system**, where no matter can enter or leave (energy can still transfer). In an open beaker, a gas product escapes and the reverse reaction can't keep up, so the reaction just runs to completion.\n\nA sealed soft-drink bottle is a closed system: $\\text{CO}_2(g) \\rightleftharpoons \\text{CO}_2(aq)$.",
      },
      {
        title: "Dynamic equilibrium",
        body: "At first, only the forward reaction happens quickly. As products build up, the reverse reaction speeds up. Eventually the **forward rate equals the reverse rate**.\n\nThis is **dynamic equilibrium**: both reactions keep happening, but because they cancel out, the **concentrations of reactants and products stay constant**. Constant does not mean equal!",
        example: "In a sealed flask of $\\text{N}_2\\text{O}_4$ at 25 °C, the brown colour deepens then stops changing. Molecules are still reacting both ways, but $[\\text{NO}_2]$ and $[\\text{N}_2\\text{O}_4]$ no longer change.",
      },
      {
        title: "Showing it on a graph",
        body: "On a **concentration–time graph**, reactant concentration falls and product concentration rises, then both curves go **flat** at equilibrium.\n\nOn a **rate–time graph**, the forward rate falls and the reverse rate rises until the two lines **meet and stay together**. HSC questions often ask you to identify the point where equilibrium is reached: it's where the lines become flat (concentration) or meet (rate).",
      },
    ],
    questions: [
      {
        q: "Which statement best describes dynamic equilibrium?",
        options: ["The reactions have stopped", "Reactant and product concentrations are equal", "Forward and reverse rates are equal", "Only the forward reaction occurs"],
        answer: "C",
        explain: "At dynamic equilibrium both reactions continue at equal rates, so concentrations stay constant. They don't have to be equal to each other.",
      },
      {
        q: "Why is a closed system needed to reach equilibrium?",
        options: ["It keeps the temperature constant", "It stops matter entering or leaving", "It speeds up the forward reaction", "It prevents energy transfer"],
        answer: "B",
        explain: "If products (especially gases) can escape, the reverse reaction can't occur properly, so equilibrium is never established.",
      },
      {
        q: "On a concentration–time graph, how can you tell equilibrium has been reached?",
        options: ["The curves cross", "The curves become horizontal", "The product curve reaches zero", "The reactant curve starts rising"],
        answer: "B",
        explain: "When concentrations stop changing, their curves flatten out. Crossing only means the concentrations happen to be equal at that moment.",
      },
      {
        q: "Which is an example of a reversible reaction?",
        options: ["Burning magnesium in air", "$\\text{N}_2\\text{O}_4(g) \\rightleftharpoons 2\\text{NO}_2(g)$", "Cooking an egg", "Combustion of methane"],
        answer: "B",
        explain: "The double arrow shows the reaction proceeds in both directions. Combustion and cooking an egg are effectively irreversible.",
      },
    ],
    summary: [
      "Reversible reactions go both ways and are written with $\\rightleftharpoons$.",
      "In a closed system, dynamic equilibrium is reached when forward and reverse rates are equal.",
      "At equilibrium, concentrations are constant but not necessarily equal.",
    ],
  },
};

export function builtinLesson(subject: string, title: string): LessonContent | null {
  return BUILTIN_LESSONS[`${subject}|${title}`] ?? null;
}
