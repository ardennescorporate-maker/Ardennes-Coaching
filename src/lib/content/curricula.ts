/**
 * Course outlines (spec §8.2). Source of truth for the curricula seed migration
 * (scripts/gen-curricula-sql.mjs); the database copy is what the app reads and admins edit.
 */
export type UnitOutline = { title: string; description: string; lessons: string[] };
export type CourseOutline = { subject: string; system: string; yearLevel: string; units: UnitOutline[] };

const u = (title: string, description: string, lessons: string[]): UnitOutline => ({ title, description, lessons });

export const CURRICULA: CourseOutline[] = [
  {
    subject: "Mathematics Advanced",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Functions", "Relations, notation and graphs", ["What is a function?", "Domain and range", "Linear and quadratic graphs", "Transformations of graphs"]),
      u("Trigonometric functions", "Radians, exact values and trig graphs", ["Radians and arc length", "Exact values and the unit circle", "Graphs of sin, cos and tan"]),
      u("Calculus", "Rates of change, derivatives and area", ["The derivative as a gradient", "Differentiation rules", "Stationary points and curve sketching", "Integration and area"]),
      u("Exponentials and logarithms", "e, log laws and growth", ["Index laws and e", "Logarithm laws", "Exponential growth and decay"]),
      u("Statistical analysis", "Probability and distributions", ["Probability rules", "Discrete random variables", "The normal distribution"]),
      u("Financial mathematics", "Sequences, series and loans", ["Arithmetic and geometric sequences", "Annuities and loan repayments"]),
    ],
  },
  {
    subject: "Mathematics Extension 1",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Further functions", "Inverses, polynomials and inequalities", ["Inverse functions", "Polynomials and remainder theorem", "Solving inequalities"]),
      u("Trigonometry", "Compound angles and inverse trig", ["Compound angle formulas", "t-formulas and auxiliary angles", "Inverse trig functions"]),
      u("Calculus", "Related rates, substitution and volumes", ["Related rates of change", "Integration by substitution", "Volumes of revolution", "Differential equations"]),
      u("Combinatorics and proof", "Counting, binomials and induction", ["Permutations and combinations", "The binomial theorem", "Proof by mathematical induction"]),
      u("Vectors and statistics", "Vectors, projectiles and the binomial distribution", ["Introduction to vectors", "Projectile motion", "The binomial distribution"]),
    ],
  },
  {
    subject: "Mathematics Extension 2",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Proof", "Reasoning, inequalities and induction", ["The nature of proof", "Proving inequalities", "Further induction"]),
      u("Complex numbers", "Arithmetic, polar form and roots", ["Complex number arithmetic", "Polar and exponential form", "De Moivre and roots of unity"]),
      u("Further integration", "Parts, partial fractions and recurrences", ["Integration by parts", "Partial fractions", "Recurrence relations"]),
      u("Mechanics", "Motion, resistance and SHM", ["Simple harmonic motion", "Resisted motion", "Projectiles with resistance"]),
      u("Vectors", "Vectors in three dimensions", ["Vectors in three dimensions", "Vector equations of lines"]),
    ],
  },
  {
    subject: "English Advanced",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Common Module: Texts and Human Experiences", "How texts represent human experiences", ["What the Common Module asks", "Analysing a prescribed text", "Writing about human experiences"]),
      u("Module A: Textual Conversations", "Comparing texts across contexts", ["Comparing two texts", "Context and values", "Writing a comparative essay"]),
      u("Module B: Critical Study of Literature", "Close study of a literary text", ["Close reading a key passage", "Building an interpretation", "Using critical perspectives"]),
      u("Module C: The Craft of Writing", "Crafting your own writing", ["Writing techniques that score", "Imaginative writing", "Reflection statements"]),
    ],
  },
  {
    subject: "English Standard",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Common Module", "Texts and human experiences", ["What the Common Module asks", "Analysing language techniques", "Writing a response"]),
      u("Module A: Language, Identity and Culture", "How language shapes identity", ["Language and identity", "Analysing representation", "Extended response structure"]),
      u("Module B: Close Study of Literature", "Studying a text in depth", ["Themes and characters", "Quotes and techniques", "Writing the essay"]),
      u("Module C: The Craft of Writing", "Crafting your own writing", ["Showing not telling", "Imaginative writing", "Persuasive writing"]),
    ],
  },
  {
    subject: "Biology",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Module 5 Heredity", "How traits pass between generations", ["Reproduction strategies", "Cell replication and DNA", "Mendelian inheritance", "Pedigrees and Punnett squares"]),
      u("Module 6 Genetic Change", "Mutation and biotechnology", ["Mutations", "Biotechnology", "Genetic technologies"]),
      u("Module 7 Infectious Disease", "Pathogens and immunity", ["Causes of infectious disease", "Responses to pathogens", "Immunity and vaccination", "Preventing epidemics"]),
      u("Module 8 Non-infectious Disease", "Homeostasis and disorders", ["Homeostasis", "Causes of non-infectious disease", "Epidemiology", "Technologies and disorders"]),
    ],
  },
  {
    subject: "Chemistry",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Module 5 Equilibrium and Acid Reactions", "Reversible reactions and equilibrium", ["Reversible reactions and dynamic equilibrium", "Le Chatelier's principle", "The equilibrium constant (Keq)", "Solubility equilibria"]),
      u("Module 6 Acid/Base Reactions", "Acids, bases and pH", ["Properties of acids and bases", "Brønsted–Lowry theory", "pH calculations", "Titrations and buffers"]),
      u("Module 7 Organic Chemistry", "Carbon compounds and reactions", ["Naming hydrocarbons", "Functional groups", "Reactions of organic compounds", "Polymers"]),
      u("Module 8 Applying Chemical Ideas", "Analysis and synthesis", ["Analysis of inorganic substances", "Analysis of organic substances", "Chemical synthesis and design"]),
    ],
  },
  {
    subject: "Physics",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Module 5 Advanced Mechanics", "Projectiles, circles and orbits", ["Projectile motion", "Circular motion", "Gravitational fields and orbits"]),
      u("Module 6 Electromagnetism", "Fields, forces and induction", ["Charged particles in fields", "The motor effect", "Electromagnetic induction", "Applications: motors and generators"]),
      u("Module 7 The Nature of Light", "Waves, particles and relativity", ["Electromagnetic spectrum", "Light as a wave", "Light as a particle", "Special relativity"]),
      u("Module 8 From the Universe to the Atom", "Stars, atoms and nuclei", ["Origins of the elements", "Structure of the atom", "Quantum model of the atom", "The nucleus and particles"]),
    ],
  },
  {
    subject: "Business Studies",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Operations", "How businesses produce goods and services", ["The role of operations", "Operations processes", "Operations strategies"]),
      u("Marketing", "Reaching and keeping customers", ["The marketing process", "Marketing strategies", "The 4Ps"]),
      u("Finance", "Funding and financial management", ["Sources of finance", "Financial statements and ratios", "Financial management strategies"]),
      u("Human Resources", "Managing people", ["The human resource cycle", "Influences on HR", "HR strategies"]),
    ],
  },
  {
    subject: "Economics",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("The Global Economy", "Globalisation, trade and development", ["What is globalisation?", "International trade", "Development and inequality"]),
      u("Australia's Place in the Global Economy", "Trade, payments and the dollar", ["Australia's trade", "The balance of payments", "Exchange rates"]),
      u("Economic Issues", "Growth, jobs, prices and income", ["Economic growth", "Unemployment", "Inflation", "Distribution of income"]),
      u("Economic Policies and Management", "Fiscal, monetary and micro policy", ["Fiscal policy", "Monetary policy", "Microeconomic policy"]),
    ],
  },
  {
    subject: "Legal Studies",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Crime", "The criminal justice system", ["The nature of crime", "The criminal investigation process", "Sentencing and punishment"]),
      u("Human Rights", "Rights and how they are protected", ["The nature of human rights", "Promoting and enforcing rights", "Human rights in Australia"]),
      u("Family Law", "Law and the family", ["Marriage and divorce", "Parents and children", "Family law reform"]),
      u("Workplace Law", "Law at work", ["Employment contracts", "Workplace rights", "Dispute resolution"]),
    ],
  },
  {
    subject: "Modern History",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Core: Power and Authority 1919–1946", "The interwar world and WWII", ["The aftermath of WWI", "The rise of authoritarian regimes", "World War II"]),
      u("National Study", "One nation in depth", ["Political and social context", "Key individuals and groups", "Evaluating sources"]),
      u("Peace and Conflict", "How conflicts start and end", ["Origins of the conflict", "Key events", "Peace making"]),
      u("Change in the Modern World", "Forces that changed the world", ["Causes of change", "Consequences of change", "Writing extended responses"]),
    ],
  },
  {
    subject: "Geography",
    system: "NSW HSC",
    yearLevel: "Year 12",
    units: [
      u("Ecosystems at Risk", "How ecosystems work and change", ["Ecosystem functioning", "Vulnerability and resilience", "Managing ecosystems"]),
      u("Urban Places", "Cities and how they change", ["World cities", "Urban dynamics", "Urban case studies"]),
      u("People and Economic Activity", "Economic geography", ["Nature of economic activity", "Spatial patterns", "Case study skills"]),
    ],
  },
  {
    subject: "SAT Math",
    system: "SAT",
    yearLevel: "Year 11",
    units: [
      u("Algebra", "Linear equations and systems", ["Linear equations in one variable", "Linear functions", "Systems of equations"]),
      u("Advanced Math", "Quadratics, exponentials and functions", ["Quadratic equations", "Exponential functions", "Function notation and graphs"]),
      u("Problem Solving and Data Analysis", "Ratios, data and statistics", ["Ratios and percentages", "Reading tables and graphs", "Statistics basics"]),
      u("Geometry and Trigonometry", "Shapes, angles and triangles", ["Area and volume", "Angles and triangles", "Right-triangle trigonometry"]),
    ],
  },
  {
    subject: "SAT Reading & Writing",
    system: "SAT",
    yearLevel: "Year 11",
    units: [
      u("Craft and Structure", "How texts are built", ["Words in context", "Text structure and purpose", "Cross-text connections"]),
      u("Information and Ideas", "Reading for meaning", ["Central ideas", "Command of evidence", "Inferences"]),
      u("Standard English Conventions", "Grammar and punctuation", ["Sentence boundaries", "Subject–verb agreement", "Punctuation"]),
      u("Expression of Ideas", "Writing clearly", ["Transitions", "Rhetorical synthesis"]),
    ],
  },
  {
    subject: "AP Calculus AB",
    system: "AP Exams",
    yearLevel: "Year 12",
    units: [
      u("Limits and Continuity", "The foundation of calculus", ["Understanding limits", "Limit techniques", "Continuity"]),
      u("Differentiation", "Derivatives and their rules", ["Definition of the derivative", "Derivative rules", "Chain rule and implicit differentiation"]),
      u("Applications of Derivatives", "Using derivatives", ["Related rates", "Optimisation", "Analysing graphs"]),
      u("Integration", "Accumulation and area", ["Riemann sums", "The Fundamental Theorem", "Applications of integration"]),
      u("Differential Equations", "Modelling change", ["Slope fields", "Separation of variables"]),
    ],
  },
  {
    subject: "AP Biology",
    system: "AP Exams",
    yearLevel: "Year 12",
    units: [
      u("Chemistry of Life", "Water and macromolecules", ["Water and its properties", "Macromolecules"]),
      u("Cells", "Structure and transport", ["Cell structure", "Membrane transport"]),
      u("Energetics", "Enzymes and energy", ["Enzymes", "Cellular respiration", "Photosynthesis"]),
      u("Genetics and Evolution", "Heredity and selection", ["Meiosis and heredity", "Gene expression", "Natural selection"]),
      u("Ecology", "Energy and populations", ["Energy flow", "Population dynamics"]),
    ],
  },
  {
    subject: "GCSE Maths",
    system: "GCSE",
    yearLevel: "Year 10",
    units: [
      u("Number", "Fractions, powers and standard form", ["Fractions and decimals", "Powers and roots", "Standard form"]),
      u("Algebra", "Expressions, equations and graphs", ["Simplifying expressions", "Solving equations", "Straight-line graphs", "Quadratics"]),
      u("Ratio and Proportion", "Ratios and percentages", ["Ratio", "Percentages", "Direct and inverse proportion"]),
      u("Geometry and Measures", "Angles, area and trigonometry", ["Angle rules", "Area and perimeter", "Pythagoras and trigonometry"]),
      u("Probability and Statistics", "Chance and data", ["Probability basics", "Averages and spread"]),
    ],
  },
  {
    subject: "A-Level Chemistry",
    system: "A-Level",
    yearLevel: "Year 12",
    units: [
      u("Physical Chemistry", "Atoms, amounts, energy and rates", ["Atomic structure", "Amount of substance", "Energetics", "Kinetics and equilibria"]),
      u("Inorganic Chemistry", "The periodic table", ["Periodicity", "Group 2", "The halogens"]),
      u("Organic Chemistry", "Carbon chemistry", ["Alkanes and alkenes", "Reaction mechanisms", "Organic analysis"]),
    ],
  },
  {
    subject: "IB Mathematics AA",
    system: "IB Diploma",
    yearLevel: "Year 12",
    units: [
      u("Number and Algebra", "Sequences, logs and proof", ["Sequences and series", "Exponents and logarithms", "Proof"]),
      u("Functions", "Graphs and transformations", ["Functions and graphs", "Transformations", "Rational functions"]),
      u("Geometry and Trigonometry", "Trig and 3D geometry", ["Trigonometric functions", "Identities and equations", "3D geometry"]),
      u("Statistics and Probability", "Data and chance", ["Descriptive statistics", "Probability", "Distributions"]),
      u("Calculus", "Differentiation and integration", ["Differentiation", "Integration", "Kinematics"]),
    ],
  },
];

export function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
