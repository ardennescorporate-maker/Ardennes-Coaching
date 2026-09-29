"use client";
import { Plus } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCourseAction } from "./actions";

export function AddCourse({ options }: { options: string[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!options.length) return null;
  return (
    <label className="relative">
      <span className="sr-only">Add a course</span>
      <span className="btn btn-secondary btn-sm pointer-events-none">
        <Plus size={16} /> {pending ? "Adding…" : "Add a course"}
      </span>
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value=""
        onChange={(e) => {
          const subject = e.target.value;
          if (!subject) return;
          start(async () => {
            await addCourseAction(subject);
            router.refresh();
          });
        }}
      >
        <option value="">Add a course</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
