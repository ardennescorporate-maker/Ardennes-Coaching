const STEPS = ["Account", "Verify", "Invite", "Profile"];

export function Stepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="mb-5">
      <p className="micro mb-2 text-ink-3">
        Step {step} of 4 · {STEPS[step - 1]}
      </p>
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Sign-up progress">
        {STEPS.map((s, i) => (
          <li key={s} className={`h-2 rounded-full ${i < step ? "bg-blue" : "bg-surface-2"}`} aria-current={i === step - 1 ? "step" : undefined}>
            <span className="sr-only">
              {s}
              {i < step - 1 ? " (done)" : i === step - 1 ? " (current)" : ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
