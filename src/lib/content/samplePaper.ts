import type { Paper, PaperConfig } from "@/lib/domain/paper";

/** Built-in sample HSC Mathematics Advanced paper (25 min, 8 marks). Works without AI. */
export const SAMPLE_PAPER: Paper = {
  title: "Mathematics Advanced — Sample Practice Paper",
  timeMinutes: 25,
  instructions: [
    "Reading time: 2 minutes (included in working time)",
    "Working time: 25 minutes",
    "Write using black pen",
    "Calculators approved by NESA may be used",
    "For questions in Section II, show relevant mathematical reasoning and/or calculations",
  ],
  sections: [
    {
      name: "Section I — Multiple choice (3 marks)",
      questions: [
        {
          id: "1",
          type: "mcq",
          topic: "Differentiation rules",
          prompt: "What is the derivative of $f(x) = 3x^2 - 5x + 2$?",
          marks: 1,
          options: ["$6x - 5$", "$3x - 5$", "$6x + 2$", "$6x^2 - 5$"],
          answer: "A",
          criteria: "1 mark: A",
          sample: "Using the power rule, $f'(x) = 2 \\times 3x - 5 = 6x - 5$. The answer is A.",
        },
        {
          id: "2",
          type: "mcq",
          topic: "Domain and range",
          prompt: "What is the domain of $y = \\sqrt{x - 4}$?",
          marks: 1,
          options: ["$x > 4$", "$x \\geq 4$", "$x \\geq 0$", "All real $x$"],
          answer: "B",
          criteria: "1 mark: B",
          sample: "The expression under the square root must be non-negative: $x - 4 \\geq 0$, so $x \\geq 4$. The answer is B.",
        },
        {
          id: "3",
          type: "mcq",
          topic: "Logarithm laws",
          prompt: "Which expression is equal to $\\log_2 8 + \\log_2 4$?",
          marks: 1,
          options: ["$\\log_2 12$", "$6$", "$5$", "$\\log_2 32 - 1$"],
          answer: "C",
          criteria: "1 mark: C",
          sample: "$\\log_2 8 + \\log_2 4 = \\log_2 32 = 5$. The answer is C.",
        },
      ],
    },
    {
      name: "Section II — Written response (5 marks)",
      questions: [
        {
          id: "4",
          type: "short",
          topic: "Stationary points and curve sketching",
          prompt: "Find the coordinates of the stationary point of $y = x^2 - 6x + 11$ and determine its nature.",
          marks: 3,
          criteria:
            "1 mark: finds dy/dx = 2x − 6 and solves dy/dx = 0 to get x = 3.\n1 mark: finds y = 2, giving the point (3, 2).\n1 mark: justifies it is a minimum (second derivative 2 > 0, or a table of gradients).",
          sample:
            "$\\frac{dy}{dx} = 2x - 6$. Setting $2x - 6 = 0$ gives $x = 3$.\n\nWhen $x = 3$, $y = 9 - 18 + 11 = 2$, so the stationary point is $(3, 2)$.\n\n$\\frac{d^2y}{dx^2} = 2 > 0$, so the curve is concave up and $(3, 2)$ is a **minimum** turning point.",
        },
        {
          id: "5",
          type: "short",
          topic: "Exponential growth and decay",
          prompt: "A population of bacteria grows according to $P = 500e^{0.2t}$, where $t$ is in hours. Find how long it takes for the population to double. Give your answer correct to one decimal place.",
          marks: 2,
          criteria: "1 mark: sets up 1000 = 500e^{0.2t} (or e^{0.2t} = 2) and takes logs.\n1 mark: t = ln 2 / 0.2 ≈ 3.5 hours.",
          sample: "$1000 = 500e^{0.2t} \\Rightarrow e^{0.2t} = 2 \\Rightarrow 0.2t = \\ln 2 \\Rightarrow t = \\frac{\\ln 2}{0.2} \\approx 3.5$ hours.",
        },
      ],
    },
  ],
};

export const SAMPLE_CONFIG: PaperConfig = {
  exam: "NSW HSC",
  subject: "Mathematics Advanced",
  year: "Year 12",
  difficulty: "Exam standard",
  topics: "Sample paper",
  timeMinutes: 25,
  counts: { mcq: 3, short: 2, extended: 0, essay: 0 },
};
