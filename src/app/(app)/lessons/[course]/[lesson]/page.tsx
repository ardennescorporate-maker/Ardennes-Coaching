import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireViewer } from "@/lib/viewer";
import { lessonContext } from "@/lib/server/lessons";
import { LessonPlayer } from "./LessonPlayer";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage({ params }: PageProps<"/lessons/[course]/[lesson]">) {
  await requireViewer();
  const { course, lesson } = await params;
  const ctx = await lessonContext(course, lesson);
  if (!ctx) notFound();
  if (!ctx.unlocked) redirect(`/lessons?course=${course}`);
  return (
    <LessonPlayer
      courseSlug={course}
      lessonSlug={lesson}
      subject={ctx.course.subject}
      unitTitle={ctx.unit.title}
      title={ctx.lesson.title}
      next={ctx.next ? { slug: ctx.next.slug, title: ctx.next.title } : null}
    />
  );
}
