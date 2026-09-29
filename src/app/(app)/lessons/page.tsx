import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/viewer";
import { courseSummaries, getCourseTree } from "@/lib/server/lessons";
import { Pip } from "@/components/pip/Pip";
import { ProgressBar } from "@/components/ui/XpBar";
import { AddCourse } from "./AddCourse";
import { LessonPath } from "./LessonPath";

export const metadata: Metadata = { title: "Lessons" };

export default async function LessonsPage({ searchParams }: PageProps<"/lessons">) {
  const v = await requireViewer();
  const sp = await searchParams;
  const { mine, others } = await courseSummaries(v.profile.subjects);
  const slug = (typeof sp.course === "string" && [...mine, ...others].some((c) => c.slug === sp.course) ? sp.course : mine[0]?.slug) ?? others[0]?.slug;
  const course = slug ? await getCourseTree(slug) : null;
  const all = course?.units.flatMap((u) => u.lessons) ?? [];
  const current = all.find((l) => l.seq === course?.currentSeq);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="scroll-x -mx-4 flex flex-1 gap-2 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Your courses">
          {mine.map((c) => (
            <Link key={c.slug} href={`/lessons?course=${c.slug}`} role="tab" aria-selected={c.slug === slug} className={`chip ${c.slug === slug ? "is-selected" : ""}`}>
              {c.subject}
              <span className="num text-xs opacity-80">
                {c.done}/{c.total}
              </span>
            </Link>
          ))}
        </div>
        <AddCourse options={others.map((o) => o.subject)} />
      </div>

      {course && (
        <>
          <section className="card card-pad flex flex-col gap-4 sm:flex-row sm:items-center">
            <Pip mood={current ? "talk" : "cheer"} size={110} />
            <div className="min-w-0 flex-1">
              <p className="micro text-ink-3">
                {v.profile.system ?? course.system} · {v.profile.year_level ?? course.year_level}
              </p>
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{course.subject}</h2>
              <div className="mt-2 flex items-center gap-3">
                <ProgressBar className="flex-1" value={course.done} max={course.total} label="Course progress" />
                <span className="num text-sm font-bold text-ink-2">
                  {course.done}/{course.total} lessons
                </span>
              </div>
              <p className="bubble bubble-left mt-3 text-sm">
                {current ? <>Next up: <strong>{current.title}</strong>. I&apos;ll teach it step by step, then check you&apos;ve got it.</> : "You've finished every lesson in this course. Smooth landing! Replay any lesson to earn more stars."}
              </p>
            </div>
            {current && (
              <Link href={`/lessons/${course.slug}/${current.slug}`} className="btn btn-primary btn-lg self-start sm:self-center">
                {course.done === 0 ? "Start course" : "Continue"}
              </Link>
            )}
          </section>
          <LessonPath course={course} />
        </>
      )}
    </div>
  );
}
