import { useId } from "react";

export type PipMood = "happy" | "talk" | "think" | "wave" | "cheer";
export type PipAnimation = "bob" | "tilt" | "none";

type Props = {
  mood?: PipMood;
  size?: number;
  animation?: PipAnimation;
  className?: string;
  /** Accessible label. Pass "" to hide Pip from screen readers when purely decorative. */
  label?: string;
};

/**
 * Pip, StudyPilot's study bird. A chubby blue bird drawn in SVG, soft-3D style.
 * Small sizes (< 60px) skip the feather-texture filters to stay cheap.
 */
export function Pip({ mood = "happy", size = 120, animation = "bob", className, label = "Pip, the StudyPilot bird" }: Props) {
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9]/g, "");
  const detailed = size >= 60;
  const u = (name: string) => `url(#${name}-${id})`;
  const n = (name: string) => `${name}-${id}`;

  const eyesClosed = mood === "cheer";
  const lookUp = mood === "think";
  const beakOpen = mood === "talk" || mood === "cheer";
  const rightWingUp = mood === "wave" || mood === "cheer";
  const leftWingUp = mood === "cheer";

  const animClass = animation === "bob" ? "pip-bob" : animation === "tilt" ? "pip-tilt" : "";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={["pip", animClass, className].filter(Boolean).join(" ")}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <radialGradient id={n("body")} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#8EC0FF" />
          <stop offset="45%" stopColor="#3C86F7" />
          <stop offset="85%" stopColor="#1F5FD4" />
          <stop offset="100%" stopColor="#1849B0" />
        </radialGradient>
        <radialGradient id={n("belly")} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#EAF3FF" />
          <stop offset="100%" stopColor="#C9DDFB" />
        </radialGradient>
        <linearGradient id={n("wing")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A8FF8" />
          <stop offset="100%" stopColor="#1B4FC0" />
        </linearGradient>
        <linearGradient id={n("beak")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE27A" />
          <stop offset="60%" stopColor="#FFC226" />
          <stop offset="100%" stopColor="#E59A00" />
        </linearGradient>
        <radialGradient id={n("eye")} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#2A3F7A" />
          <stop offset="100%" stopColor="#0B1638" />
        </radialGradient>
        {detailed && (
          <>
            <filter id={n("feather")} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id={n("texture")} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.08 0.35" numOctaves="2" seed="9" />
              <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.10 0" />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
          </>
        )}
      </defs>

      {/* ground shadow */}
      <ellipse cx="100" cy="188" rx="50" ry="7" fill="#0E1F55" opacity="0.16" />

      {/* tail feathers */}
      <g fill={u("wing")}>
        <path d="M150 150 Q182 150 188 128 Q170 140 152 138 Z" />
        <path d="M148 158 Q184 168 194 146 Q172 156 150 150 Z" opacity="0.9" />
      </g>

      {/* feet */}
      <g fill="#FFC226" stroke="#E59A00" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M78 170 l-8 12 h8 l2-5 l2 5 h8 l-6-12 Z" />
        <path d="M122 170 l-6 12 h8 l2-5 l2 5 h8 l-8-12 Z" />
      </g>

      {/* head tuft (three feathers) */}
      <g fill={u("wing")}>
        <path d="M100 52 Q92 26 100 12 Q108 28 100 52 Z" />
        <path d="M96 54 Q78 36 76 22 Q92 30 98 50 Z" />
        <path d="M104 54 Q122 36 124 22 Q108 30 102 50 Z" />
      </g>

      {/* left wing (behind body when down) */}
      {!leftWingUp && (
        <path d="M44 104 Q18 126 30 156 Q44 150 54 132 Z" fill={u("wing")} />
      )}
      {!rightWingUp && (
        <path d="M156 104 Q182 126 170 156 Q156 150 146 132 Z" fill={u("wing")} />
      )}

      {/* body */}
      <g filter={detailed ? u("feather") : undefined}>
        <ellipse cx="100" cy="110" rx="66" ry="64" fill={u("body")} />
      </g>
      {detailed && <ellipse cx="100" cy="110" rx="66" ry="64" fill="#fff" filter={u("texture")} />}

      {/* belly */}
      <g filter={detailed ? u("feather") : undefined}>
        <ellipse cx="100" cy="138" rx="44" ry="34" fill={u("belly")} />
      </g>

      {/* raised wings (in front) */}
      {leftWingUp && (
        <g className="pip-wing-l">
          <path d="M44 108 Q14 90 16 58 Q34 66 56 96 Z" fill={u("wing")} />
        </g>
      )}
      {rightWingUp && (
        <g className={mood === "wave" ? "pip-wing-wave" : "pip-wing-r"}>
          <path d="M156 108 Q186 90 184 58 Q166 66 144 96 Z" fill={u("wing")} />
        </g>
      )}

      {/* cheeks */}
      <ellipse cx="60" cy="122" rx="11" ry="6.5" fill="#FF8FAB" opacity="0.5" />
      <ellipse cx="140" cy="122" rx="11" ry="6.5" fill="#FF8FAB" opacity="0.5" />

      {/* eyes */}
      {eyesClosed ? (
        <g fill="none" stroke="#0E1F55" strokeWidth="5.5" strokeLinecap="round">
          <path d="M66 102 Q78 88 90 102" />
          <path d="M110 102 Q122 88 134 102" />
        </g>
      ) : (
        <g>
          <ellipse cx="78" cy="100" rx="14" ry="16" fill={u("eye")} />
          <ellipse cx="122" cy="100" rx="14" ry="16" fill={u("eye")} />
          {lookUp ? (
            <g fill="#fff">
              <circle cx="81" cy="89" r="5.5" />
              <circle cx="125" cy="89" r="5.5" />
              <circle cx="75" cy="97" r="2" />
              <circle cx="119" cy="97" r="2" />
            </g>
          ) : (
            <g fill="#fff">
              <circle cx="73" cy="94" r="5.5" />
              <circle cx="117" cy="94" r="5.5" />
              <circle cx="83" cy="106" r="2.4" />
              <circle cx="127" cy="106" r="2.4" />
            </g>
          )}
        </g>
      )}

      {/* beak */}
      {beakOpen ? (
        <g>
          <path d="M88 116 Q100 108 112 116 Q100 121 88 116 Z" fill={u("beak")} />
          <path d="M90 119 Q100 124 110 119 Q106 134 100 135 Q94 134 90 119 Z" fill="#7A1F2E" />
          <path d="M94 128 Q100 124 106 128 Q104 134 100 134 Q96 134 94 128 Z" fill="#FF8FAB" />
          <path d="M92 132 Q100 138 108 132 Q104 140 100 140 Q96 140 92 132 Z" fill={u("beak")} />
        </g>
      ) : (
        <path d="M88 116 Q100 108 112 116 Q106 128 100 130 Q94 128 88 116 Z" fill={u("beak")} stroke="#E59A00" strokeWidth="1" />
      )}
    </svg>
  );
}

/** Just Pip's face, cropped for small tiles (logo, avatars, favicon). */
export function PipFace({ size = 32, className, label = "" }: { size?: number; className?: string; label?: string }) {
  return (
    <span
      className={className}
      style={{ display: "inline-block", width: size, height: size, overflow: "hidden", lineHeight: 0 }}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <Pip mood="happy" size={size * 1.55} animation="none" label="" className="pip-face-crop" />
    </span>
  );
}
