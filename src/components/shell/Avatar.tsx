import { avatarInk } from "@/lib/domain/catalog";

export function Avatar({ name, colour, url, size = 36 }: { name: string; colour: string; url?: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="flex-none rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="font-display grid flex-none place-items-center rounded-full font-extrabold"
      style={{ width: size, height: size, background: colour, color: avatarInk(colour), fontSize: size * 0.42 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
