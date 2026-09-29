/** Predicted result from a percentage. HSC uses bands; others a grade. */
export function predictedResult(pct: number, system: string): string {
  const p = Math.max(0, Math.min(100, pct));
  switch (system) {
    case "NSW HSC":
      return p >= 90 ? "Band 6" : p >= 80 ? "Band 5" : p >= 70 ? "Band 4" : p >= 60 ? "Band 3" : "Band 2 or below";
    case "VIC VCE":
      return p >= 90 ? "Study score 40+" : p >= 80 ? "Study score 35–39" : p >= 65 ? "Study score 30–34" : p >= 50 ? "Study score 25–29" : "Study score below 25";
    case "QLD QCE":
    case "WA WACE":
    case "SA SACE":
      return p >= 85 ? "A" : p >= 70 ? "B" : p >= 55 ? "C" : p >= 40 ? "D" : "E";
    case "SAT":
      return `≈ ${Math.round((200 + (p / 100) * 600) / 10) * 10} (section)`;
    case "ACT":
      return `≈ ${Math.max(1, Math.round(1 + (p / 100) * 35))}`;
    case "AP Exams":
      return p >= 75 ? "5" : p >= 60 ? "4" : p >= 45 ? "3" : p >= 30 ? "2" : "1";
    case "GCSE":
      return p >= 90 ? "Grade 9" : p >= 80 ? "Grade 8" : p >= 70 ? "Grade 7" : p >= 60 ? "Grade 6" : p >= 50 ? "Grade 5" : p >= 40 ? "Grade 4" : "Grade 3 or below";
    case "A-Level":
      return p >= 90 ? "A*" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : p >= 40 ? "E" : "U";
    case "IB Diploma":
      return p >= 80 ? "7" : p >= 70 ? "6" : p >= 60 ? "5" : p >= 50 ? "4" : p >= 40 ? "3" : p >= 25 ? "2" : "1";
    default:
      return p >= 85 ? "A" : p >= 70 ? "B" : p >= 55 ? "C" : p >= 40 ? "D" : "E";
  }
}

/** Colour for a band/score pill. */
export function scoreTone(pct: number): "good" | "warn" | "bad" {
  return pct >= 70 ? "good" : pct >= 50 ? "warn" : "bad";
}
