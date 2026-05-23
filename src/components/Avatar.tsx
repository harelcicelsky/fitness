import type { AvatarLook, SkinTone } from "../types";

interface Props {
  look: AvatarLook;
  level: number;          // 0..10
  size?: number;          // px, height
  animate?: boolean;
  className?: string;
}

// Skin palette is muted toward cool/grey to integrate with the moody, dimly-lit
// futuristic gym. Pure-warm skin tones popped off the dark blue background like
// a sticker — these are slightly desaturated and darker.
const SKIN_PALETTE: Record<SkinTone, { fill: string; shade: string }> = {
  tone1: { fill: "#c9a890", shade: "#8a6b56" },
  tone2: { fill: "#b89070", shade: "#74543c" },
  tone3: { fill: "#9c6d48", shade: "#5e3d24" },
  tone4: { fill: "#6e4527", shade: "#3e2614" },
  tone5: { fill: "#432716", shade: "#23130a" },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Rim-light color — matches the cyan HUD in the gym background.
const RIM = "#7dd3fc";
// Brand accent — used sparingly on sneakers/details.
const ACCENT = "#34d399";

export function Avatar({ look, level, size = 280, animate = true, className = "" }: Props) {
  const t = clamp(level, 0, 10) / 10;       // 0..1 strength factor
  const skin = SKIN_PALETTE[look.skinTone];
  const isFem = look.build === "fem";

  // Proportions that scale with muscle level. Level 0 is now a normal adult,
  // not a stick figure — shoulders & arms have respectable baseline width.
  const shoulderW = lerp(isFem ? 78 : 88, isFem ? 120 : 138, t);
  const waistW = lerp(isFem ? 58 : 56, isFem ? 60 : 64, t);
  const hipW = lerp(isFem ? 72 : 60, isFem ? 76 : 68, t);
  const armW = lerp(18, 30, t);
  const bicepBulge = lerp(2, 16, t);
  const thighW = lerp(34, 48, t);
  const calfBulge = lerp(2, 12, Math.max(0, (level - 2) / 8));

  // Definition opacities
  const pecsOpacity = clamp((level - 1) / 6, 0, 0.85);
  const absOpacity = clamp((level - 4) / 5, 0, 0.85);
  const trapOpacity = clamp((level - 2) / 6, 0, 0.7);
  const veinsOpacity = clamp((level - 7) / 3, 0, 0.4);
  const deltOpacity = clamp((level - 1) / 5, 0, 0.6);

  // Centerline
  const cx = 100;

  // Y positions — head is now SMALLER and the body slightly taller, giving a
  // more adult 7.5-head proportion instead of the previous chibi 6-head ratio.
  const headCy = 52;
  const headR = 22;
  const neckTop = 72;
  const neckBot = 92;
  const shoulderY = 102;
  const waistY = 195;
  const hipY = 225;
  const shortsBottom = 268;
  const kneeY = 332;
  const ankleY = 398;

  // Outfit
  const outfitColor = look.outfitColor;
  const hair = look.hairColor;

  // Stable, unique IDs per render so multiple avatars on a page don't clash.
  const uid = `${look.skinTone}-${look.build}-${level}`;
  const skinGradId = `skin-${uid}`;
  const limbGradId = `limb-${uid}`;
  const rimGlowId = `rim-${uid}`;
  const innerShadowId = `inshad-${uid}`;
  const skinHL = lightenHex(skin.fill, 0.14);
  const skinDeep = darken(skin.fill, 0.35);

  return (
    <svg
      viewBox="0 0 200 430"
      width={(size * 200) / 430}
      height={size}
      className={`${className} ${animate ? "avatar-anim" : ""}`}
      role="img"
      aria-label={`Avatar at muscle level ${level}`}
    >
      <defs>
        {/* Flat skin gradients — no dark edges, just a subtle highlight in the
            center for very gentle dimensionality */}
        <linearGradient id={skinGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={skin.fill} />
          <stop offset="0.5" stopColor={skinHL} />
          <stop offset="1" stopColor={skin.fill} />
        </linearGradient>
        <linearGradient id={limbGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={skin.fill} />
          <stop offset="1" stopColor={skin.fill} />
        </linearGradient>
        {/* Inner-shadow gradient for moody ambient — slightly darken centers */}
        <radialGradient id={innerShadowId} cx="0.5" cy="0.45" r="0.7">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        {/* Rim-light blur — soft cyan glow on the silhouette edge */}
        <filter id={rimGlowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* Floor shadow under the avatar — soft pool */}
      <ellipse cx="100" cy="416" rx="58" ry="6" fill="#000" opacity="0.55" />
      <ellipse cx="100" cy="416" rx="34" ry="3" fill="#000" opacity="0.65" />

      {/* BODY-SWAY GROUP: outermost, slow gentle rotation */}
      <g className="avatar-sway">
        {/* LEGS */}
        <Leg
          side="left"
          cx={cx}
          hipY={hipY}
          kneeY={kneeY}
          ankleY={ankleY}
          thighW={thighW}
          calfBulge={calfBulge}
          skinFill={skin.fill}
          shade={skin.shade}
          deep={skinDeep}
          defOpacity={absOpacity * 0.6}
          limbGradId={limbGradId}
        />
        <Leg
          side="right"
          cx={cx}
          hipY={hipY}
          kneeY={kneeY}
          ankleY={ankleY}
          thighW={thighW}
          calfBulge={calfBulge}
          skinFill={skin.fill}
          shade={skin.shade}
          deep={skinDeep}
          defOpacity={absOpacity * 0.6}
          limbGradId={limbGradId}
        />

        {/* SHORTS */}
        <path
          d={shortsPath(cx, hipY, hipW, shortsBottom)}
          fill={outfitColor}
        />
        {/* Shorts highlight on top edge — picks up ambient light */}
        <path
          d={`M ${cx - hipW / 2 - 4} ${hipY - 1} L ${cx + hipW / 2 + 4} ${hipY - 1}`}
          stroke={lightenHex(outfitColor, 0.18)}
          strokeWidth="1.2"
          opacity="0.7"
        />
        {/* Shorts center seam */}
        <path
          d={`M ${cx} ${hipY + 6} L ${cx} ${shortsBottom - 6}`}
          stroke={darken(outfitColor, 0.4)}
          strokeWidth="1.2"
          opacity="0.6"
        />
        {/* Shorts side shadow */}
        <path
          d={`M ${cx - hipW / 2 - 4} ${hipY + 2} L ${cx - hipW / 2 - 1} ${shortsBottom - 4}`}
          stroke={darken(outfitColor, 0.3)}
          strokeWidth="2.5"
          opacity="0.55"
        />
        <path
          d={`M ${cx + hipW / 2 + 4} ${hipY + 2} L ${cx + hipW / 2 + 1} ${shortsBottom - 4}`}
          stroke={darken(outfitColor, 0.3)}
          strokeWidth="2.5"
          opacity="0.55"
        />

        {/* TORSO + BREATHING GROUP */}
        <g className="avatar-breathe" style={{ transformOrigin: `${cx}px ${shoulderY + 30}px` }}>
          {/* Torso silhouette */}
          <path
            d={torsoPath(cx, shoulderY, shoulderW, waistW, hipW, hipY)}
            fill={`url(#${skinGradId})`}
          />
          {/* Deltoid hint — only shows at higher muscle levels */}
          {deltOpacity > 0.05 && (
            <g opacity={deltOpacity}>
              <ellipse
                cx={cx - shoulderW / 2 + 6}
                cy={shoulderY + 10}
                rx={10}
                ry={14}
                fill={skin.shade}
                opacity="0.6"
              />
              <ellipse
                cx={cx + shoulderW / 2 - 6}
                cy={shoulderY + 10}
                rx={10}
                ry={14}
                fill={skin.shade}
                opacity="0.6"
              />
            </g>
          )}
          {/* Subtle ribcage / oblique hint at higher levels */}
          {level >= 4 && !isFem && (
            <g opacity={clamp((level - 3) / 5, 0, 0.5)}>
              <path
                d={`M ${cx - waistW / 2 - 2} ${shoulderY + 95} q 4 -8 12 -10`}
                stroke={skinDeep}
                strokeWidth="1"
                fill="none"
              />
              <path
                d={`M ${cx + waistW / 2 + 2} ${shoulderY + 95} q -4 -8 -12 -10`}
                stroke={skinDeep}
                strokeWidth="1"
                fill="none"
              />
            </g>
          )}

          {/* Pecs (boy) — only show at level 1+ */}
          {!isFem && pecsOpacity > 0.05 && (
            <g opacity={pecsOpacity}>
              <ellipse
                cx={cx - shoulderW * 0.18}
                cy={shoulderY + 26}
                rx={shoulderW * 0.18}
                ry={lerp(7, 16, t)}
                fill={skin.shade}
              />
              <ellipse
                cx={cx + shoulderW * 0.18}
                cy={shoulderY + 26}
                rx={shoulderW * 0.18}
                ry={lerp(7, 16, t)}
                fill={skin.shade}
              />
              <path
                d={`M ${cx} ${shoulderY + 14} L ${cx} ${shoulderY + 48}`}
                stroke={skinDeep}
                strokeWidth="1.5"
                fill="none"
              />
            </g>
          )}

          {/* Sports bra (girl) — racerback */}
          {isFem && (() => {
            const braTopY = shoulderY + 18;
            const braBotY = shoulderY + 60;
            const braL = cx - shoulderW * 0.44;
            const braR = cx + shoulderW * 0.44;
            const cupLowL = cx - shoulderW * 0.06;
            const cupLowR = cx + shoulderW * 0.06;
            const cupCleavY = shoulderY + 50;
            const braDark = darken(outfitColor, 0.22);
            const braLight = lightenHex(outfitColor, 0.14);
            return (
              <g>
                <path
                  d={`M ${braL} ${braTopY}
                      C ${braL + 4} ${braTopY + 18} ${cx - shoulderW * 0.22} ${cupCleavY - 4} ${cupLowL} ${cupCleavY}
                      Q ${cx} ${cupCleavY + 4} ${cupLowR} ${cupCleavY}
                      C ${cx + shoulderW * 0.22} ${cupCleavY - 4} ${braR - 4} ${braTopY + 18} ${braR} ${braTopY}
                      L ${braR + 1} ${braBotY}
                      Q ${cx} ${braBotY + 4} ${braL - 1} ${braBotY}
                      Z`}
                  fill={outfitColor}
                />
                <path
                  d={`M ${braL + 6} ${braTopY + 6}
                      Q ${cx - shoulderW * 0.28} ${braTopY + 16} ${cx - shoulderW * 0.12} ${cupCleavY - 6}`}
                  stroke={braLight}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <path
                  d={`M ${braR - 6} ${braTopY + 6}
                      Q ${cx + shoulderW * 0.28} ${braTopY + 16} ${cx + shoulderW * 0.12} ${cupCleavY - 6}`}
                  stroke={braLight}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <path
                  d={`M ${cx} ${cupCleavY} L ${cx} ${cupCleavY + 8}`}
                  stroke={braDark}
                  strokeWidth="1"
                  opacity="0.7"
                />
                <path
                  d={`M ${braL - 1} ${braBotY - 5} Q ${cx} ${braBotY - 1} ${braR + 1} ${braBotY - 5}`}
                  stroke={braDark}
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.7"
                />
                {/* Racerback straps */}
                <path
                  d={`M ${cx - shoulderW * 0.32} ${braTopY + 6}
                      Q ${cx - shoulderW * 0.18} ${shoulderY - 8}
                        ${cx - shoulderW * 0.08} ${shoulderY - 12}`}
                  stroke={outfitColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d={`M ${cx + shoulderW * 0.32} ${braTopY + 6}
                      Q ${cx + shoulderW * 0.18} ${shoulderY - 8}
                        ${cx + shoulderW * 0.08} ${shoulderY - 12}`}
                  stroke={outfitColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            );
          })()}

          {/* Abs */}
          <g opacity={absOpacity}>
            <path
              d={`M ${cx} ${shoulderY + 58} L ${cx} ${waistY - 5}`}
              stroke={skinDeep}
              strokeWidth="2"
              fill="none"
            />
            {[0, 1, 2].map((i) => {
              const y = shoulderY + 72 + i * 17;
              return (
                <path
                  key={i}
                  d={`M ${cx - 13} ${y} Q ${cx} ${y + 3} ${cx + 13} ${y}`}
                  stroke={skinDeep}
                  strokeWidth="1.6"
                  fill="none"
                  opacity={1 - i * 0.15}
                />
              );
            })}
          </g>

          {/* Trapezius — only visible at level 2+ */}
          {trapOpacity > 0.05 && (
            <>
              <path
                d={`M ${cx - 9} ${neckBot - 3} L ${cx - shoulderW / 2 + 6} ${shoulderY + 8} L ${cx - shoulderW / 2 + 16} ${shoulderY + 4} Z`}
                fill={skin.shade}
                opacity={trapOpacity}
              />
              <path
                d={`M ${cx + 9} ${neckBot - 3} L ${cx + shoulderW / 2 - 6} ${shoulderY + 8} L ${cx + shoulderW / 2 - 16} ${shoulderY + 4} Z`}
                fill={skin.shade}
                opacity={trapOpacity}
              />
            </>
          )}
        </g>

        {/* ARMS */}
        <Arm
          side="left"
          cx={cx}
          shoulderY={shoulderY}
          shoulderW={shoulderW}
          armW={armW}
          bicep={bicepBulge}
          skinFill={skin.fill}
          shade={skin.shade}
          deep={skinDeep}
          veinsOpacity={veinsOpacity}
          limbGradId={limbGradId}
        />
        <Arm
          side="right"
          cx={cx}
          shoulderY={shoulderY}
          shoulderW={shoulderW}
          armW={armW}
          bicep={bicepBulge}
          skinFill={skin.fill}
          shade={skin.shade}
          deep={skinDeep}
          veinsOpacity={veinsOpacity}
          limbGradId={limbGradId}
        />

        {/* NECK — clean skin tone, no dark strokes */}
        <path
          d={`M ${cx - 8.5} ${neckTop} Q ${cx - 10} ${(neckTop + neckBot) / 2} ${cx - 11} ${neckBot} L ${cx + 11} ${neckBot} Q ${cx + 10} ${(neckTop + neckBot) / 2} ${cx + 8.5} ${neckTop} Z`}
          fill={skin.fill}
        />

        {/* EARS — flat skin, no stroke */}
        <ellipse cx={cx - headR + 1} cy={headCy + 2} rx="3" ry="5" fill={skin.fill} />
        <ellipse cx={cx + headR - 1} cy={headCy + 2} rx="3" ry="5" fill={skin.fill} />

        {/* HEAD */}
        <path d={headPath(cx, headCy, headR)} fill={skin.fill} />

        {/* HAIR */}
        <Hair style={look.hairStyle} cx={cx} headCy={headCy} headR={headR} color={hair} />

        {/* CYAN EDGE LIGHT — thin strokes ON the body where light hits from the
            gym HUDs. NO offset silhouette behind, just rim lighting that reads
            as the figure being lit from above-left by the cool blue display. */}
        <g stroke={RIM} strokeWidth="1.2" fill="none" opacity="0.55" strokeLinecap="round">
          {/* Head/temple edge */}
          <path d={`M ${cx - headR + 2} ${headCy - 4} Q ${cx - headR - 1} ${headCy + 4} ${cx - headR + 4} ${headCy + headR - 4}`} />
          {/* Shoulder/deltoid edge */}
          <path d={`M ${cx - shoulderW / 2 + 2} ${shoulderY + 2} Q ${cx - shoulderW / 2 - 2} ${shoulderY + 30} ${cx - shoulderW / 2 - bicepBulge / 2} ${shoulderY + 45}`} />
          {/* Outer bicep edge */}
          <path d={`M ${cx - shoulderW / 2 - bicepBulge / 2 - armW / 4} ${shoulderY + 50} Q ${cx - shoulderW / 2 - armW / 2 - 2} ${shoulderY + 90} ${cx - shoulderW / 2 - armW / 2 - 4} ${shoulderY + 145}`} opacity="0.45" />
          {/* Outer thigh edge */}
          <path d={`M ${cx - hipW / 2 - 4} ${shortsBottom - 2} Q ${cx - thighW + 2} ${kneeY - 30} ${cx - thighW + 4} ${kneeY - 4}`} opacity="0.4" />
          {/* Outer calf edge */}
          <path d={`M ${cx - thighW + 2} ${kneeY + 6} Q ${cx - thighW - 4} ${kneeY + 40} ${cx - thighW + 2} ${ankleY - 4}`} opacity="0.4" />
        </g>

        {/* FACE — refined: smaller, more grown-up features */}
        <g>
          {/* Brows — slightly angled (focused look) */}
          <path
            d={`M ${cx - 10} ${headCy - 6} q 4 -1.5 7 0.5`}
            stroke={darken(hair, 0.3)}
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${cx + 3} ${headCy - 5.5} q 4 -2 7 0`}
            stroke={darken(hair, 0.3)}
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
          {/* Eye sockets — subtle shadow under the brow */}
          <ellipse cx={cx - 6.5} cy={headCy - 2} rx="3.5" ry="2.5" fill={skinDeep} opacity="0.2" />
          <ellipse cx={cx + 6.5} cy={headCy - 2} rx="3.5" ry="2.5" fill={skinDeep} opacity="0.2" />
          {/* Eyes — smaller, more realistic */}
          <ellipse cx={cx - 6.5} cy={headCy - 1.5} rx="2.2" ry="2.4" fill="#fff" />
          <ellipse cx={cx + 6.5} cy={headCy - 1.5} rx="2.2" ry="2.4" fill="#fff" />
          {/* Iris */}
          <circle cx={cx - 6.5} cy={headCy - 1} r="1.7" fill="#2d4a3e" />
          <circle cx={cx + 6.5} cy={headCy - 1} r="1.7" fill="#2d4a3e" />
          {/* Pupils */}
          <circle cx={cx - 6.5} cy={headCy - 1} r="0.9" fill="#0a0a0a" />
          <circle cx={cx + 6.5} cy={headCy - 1} r="0.9" fill="#0a0a0a" />
          {/* Catch-light — cyan tint from the gym HUDs */}
          <circle cx={cx - 5.9} cy={headCy - 1.8} r="0.6" fill={RIM} opacity="0.9" />
          <circle cx={cx + 7.1} cy={headCy - 1.8} r="0.6" fill={RIM} opacity="0.9" />
          {/* Upper lash line */}
          <path
            d={`M ${cx - 9} ${headCy - 3.5} Q ${cx - 6.5} ${headCy - 4.2} ${cx - 4} ${headCy - 3.5}`}
            stroke="#0a0a0a"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M ${cx + 4} ${headCy - 3.5} Q ${cx + 6.5} ${headCy - 4.2} ${cx + 9} ${headCy - 3.5}`}
            stroke="#0a0a0a"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Feminine lashes */}
          {isFem && (
            <g stroke="#0a0a0a" strokeWidth="0.7" strokeLinecap="round" fill="none">
              <path d={`M ${cx - 9} ${headCy - 3.5} q -1.5 -2.5 -3 -2`} />
              <path d={`M ${cx - 7} ${headCy - 3.8} q -1 -2.5 -2 -3`} />
              <path d={`M ${cx + 9} ${headCy - 3.5} q 1.5 -2.5 3 -2`} />
              <path d={`M ${cx + 7} ${headCy - 3.8} q 1 -2.5 2 -3`} />
            </g>
          )}
          {/* Cheekbone highlight — gives the face structure */}
          <ellipse
            cx={cx - 11}
            cy={headCy + 5}
            rx="4"
            ry="2.5"
            fill={skinHL}
            opacity="0.45"
          />
          <ellipse
            cx={cx + 11}
            cy={headCy + 5}
            rx="4"
            ry="2.5"
            fill={skinHL}
            opacity="0.45"
          />
          {/* Cheek blush (girl) — soft warmth */}
          {isFem && (
            <>
              <ellipse cx={cx - 11} cy={headCy + 6} rx="3.5" ry="1.8" fill="#e88a8a" opacity="0.35" />
              <ellipse cx={cx + 11} cy={headCy + 6} rx="3.5" ry="1.8" fill="#e88a8a" opacity="0.35" />
            </>
          )}
          {/* Nose — bridge shadow + tip highlight */}
          <path
            d={`M ${cx - 1} ${headCy + 1} Q ${cx - 1.5} ${headCy + 7} ${cx} ${headCy + 8}`}
            stroke={skinDeep}
            strokeWidth="1"
            fill="none"
            opacity="0.5"
            strokeLinecap="round"
          />
          <ellipse cx={cx + 0.5} cy={headCy + 7.5} rx="1.2" ry="0.8" fill={skinHL} opacity="0.6" />
          <path
            d={`M ${cx - 2} ${headCy + 8} Q ${cx} ${headCy + 9.5} ${cx + 2} ${headCy + 8}`}
            stroke={skinDeep}
            strokeWidth="0.7"
            fill="none"
            opacity="0.5"
          />
          {/* Mouth — neutral focused look (not a smile) */}
          <path
            d={`M ${cx - 4} ${headCy + 13} Q ${cx} ${headCy + 14} ${cx + 4} ${headCy + 13}`}
            stroke="#2a1414"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Lower-lip highlight */}
          <path
            d={`M ${cx - 2.5} ${headCy + 14.5} Q ${cx} ${headCy + 15.5} ${cx + 2.5} ${headCy + 14.5}`}
            stroke={isFem ? "#c97070" : skinHL}
            strokeWidth="1"
            fill="none"
            opacity={isFem ? 0.6 : 0.5}
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}

// Head silhouette: oval with subtle chin taper.
function headPath(cx: number, cy: number, r: number): string {
  const top = cy - r;
  const bottom = cy + r * 1.05;
  const sideY = cy + 1;
  const wide = r * 1.0;
  const chinW = r * 0.55;
  return `
    M ${cx - wide} ${sideY}
    C ${cx - wide} ${top + 3} ${cx - wide * 0.7} ${top - 1} ${cx} ${top - 1}
    C ${cx + wide * 0.7} ${top - 1} ${cx + wide} ${top + 3} ${cx + wide} ${sideY}
    C ${cx + wide * 0.95} ${cy + r * 0.7} ${cx + chinW} ${bottom} ${cx} ${bottom}
    C ${cx - chinW} ${bottom} ${cx - wide * 0.95} ${cy + r * 0.7} ${cx - wide} ${sideY}
    Z
  `;
}

// ============================================================================
// Silhouette used for the cyan rim-light layer behind the body
// ============================================================================

export function BodySilhouette({
  cx,
  color,
  shoulderY,
  shoulderW,
  waistW,
  hipY,
  hipW,
  headCy,
  headR,
  neckTop,
  neckBot,
  thighW,
  kneeY,
  ankleY,
  armW,
  bicep,
}: {
  cx: number;
  color: string;
  shoulderY: number;
  shoulderW: number;
  waistW: number;
  hipY: number;
  hipW: number;
  headCy: number;
  headR: number;
  neckTop: number;
  neckBot: number;
  thighW: number;
  kneeY: number;
  ankleY: number;
  armW: number;
  bicep: number;
}) {
  return (
    <g fill={color}>
      {/* Head */}
      <path d={headPath(cx, headCy, headR)} />
      {/* Neck */}
      <rect x={cx - 10} y={neckTop} width="20" height={neckBot - neckTop} rx="2" />
      {/* Torso */}
      <path d={torsoPath(cx, shoulderY, shoulderW, waistW, hipW, hipY)} />
      {/* Arms (rough strokes) */}
      <path
        d={`M ${cx - shoulderW / 2 + 2} ${shoulderY} Q ${cx - shoulderW / 2 - bicep - 4} ${shoulderY + 38} ${cx - shoulderW / 2} ${shoulderY + 78} L ${cx - shoulderW / 2 - 4} ${shoulderY + 150} L ${cx - shoulderW / 2 - 4 - armW} ${shoulderY + 150} Q ${cx - shoulderW / 2 - armW - 2} ${shoulderY + 100} ${cx - shoulderW / 2 - armW + 4} ${shoulderY + 38} Z`}
      />
      <path
        d={`M ${cx + shoulderW / 2 - 2} ${shoulderY} Q ${cx + shoulderW / 2 + bicep + 4} ${shoulderY + 38} ${cx + shoulderW / 2} ${shoulderY + 78} L ${cx + shoulderW / 2 + 4} ${shoulderY + 150} L ${cx + shoulderW / 2 + 4 + armW} ${shoulderY + 150} Q ${cx + shoulderW / 2 + armW + 2} ${shoulderY + 100} ${cx + shoulderW / 2 + armW - 4} ${shoulderY + 38} Z`}
      />
      {/* Legs */}
      <rect x={cx - thighW} y={hipY} width={thighW * 0.85} height={ankleY - hipY} rx="6" />
      <rect x={cx + thighW * 0.15} y={hipY} width={thighW * 0.85} height={ankleY - hipY} rx="6" />
      {/* unused so TS doesn't complain */}
      {kneeY ? null : null}
    </g>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function Hair({
  style,
  cx,
  headCy,
  headR,
  color,
}: {
  style: AvatarLook["hairStyle"];
  cx: number;
  headCy: number;
  headR: number;
  color: string;
}) {
  const top = headCy - headR;
  const shade = darken(color, 0.22);
  const hl = lightenHex(color, 0.18);

  if (style === "bald") return null;

  if (style === "buzzed") {
    return (
      <>
        <path
          d={`M ${cx - headR * 0.95} ${headCy - 3}
              C ${cx - headR * 0.95} ${top + 3} ${cx - headR * 0.65} ${top - 1} ${cx} ${top}
              C ${cx + headR * 0.65} ${top - 1} ${cx + headR * 0.95} ${top + 3} ${cx + headR * 0.95} ${headCy - 3}
              Z`}
          fill={color}
          opacity="0.95"
        />
        <path
          d={`M ${cx - headR * 0.7} ${headCy - 11} q ${headR * 0.7} -3 ${headR * 1.4} 0`}
          stroke={shade}
          strokeWidth="0.5"
          fill="none"
          opacity="0.5"
        />
      </>
    );
  }

  if (style === "short") {
    return (
      <>
        <path
          d={`M ${cx - headR} ${headCy - 1}
              C ${cx - headR - 2} ${top + 4} ${cx - headR * 0.5} ${top - 5} ${cx} ${top - 4}
              C ${cx + headR * 0.5} ${top - 5} ${cx + headR + 2} ${top + 4} ${cx + headR} ${headCy - 1}
              C ${cx + headR - 3} ${headCy - 9} ${cx + 5} ${headCy - 11} ${cx - 3} ${headCy - 9}
              C ${cx - headR + 5} ${headCy - 8} ${cx - headR + 2} ${headCy - 5} ${cx - headR} ${headCy - 1}
              Z`}
          fill={color}
        />
        {/* Fringe sweep */}
        <path
          d={`M ${cx - headR * 0.7} ${headCy - 6}
              Q ${cx - 3} ${headCy - 11} ${cx + headR * 0.5} ${headCy - 4}
              L ${cx + headR * 0.4} ${headCy - 8}
              Q ${cx - 5} ${headCy - 14} ${cx - headR * 0.7} ${headCy - 9}
              Z`}
          fill={shade}
        />
        {/* Highlight strand */}
        <path
          d={`M ${cx - headR * 0.4} ${top + 2} q ${headR * 0.6} -2 ${headR * 1.0} 1`}
          stroke={hl}
          strokeWidth="1"
          fill="none"
          opacity="0.5"
        />
      </>
    );
  }

  if (style === "long") {
    return (
      <>
        <path
          d={`M ${cx - headR - 3} ${headCy - 2}
              L ${cx - headR - 6} ${headCy + headR + 50}
              Q ${cx} ${headCy + headR + 55} ${cx + headR + 6} ${headCy + headR + 50}
              L ${cx + headR + 3} ${headCy - 2}
              Z`}
          fill={color}
          opacity="0.9"
        />
        <path
          d={`M ${cx - headR - 1} ${headCy - 1}
              C ${cx - headR - 3} ${top + 1} ${cx - headR * 0.5} ${top - 6} ${cx} ${top - 5}
              C ${cx + headR * 0.5} ${top - 6} ${cx + headR + 3} ${top + 1} ${cx + headR + 1} ${headCy - 1}
              Q ${cx + 5} ${headCy - 11} ${cx} ${headCy - 11}
              Q ${cx - 5} ${headCy - 11} ${cx - headR - 1} ${headCy - 1}
              Z`}
          fill={color}
        />
        <path
          d={`M ${cx} ${headCy - 11} L ${cx} ${top}`}
          stroke={shade}
          strokeWidth="0.8"
          opacity="0.5"
        />
        <path d={`M ${cx - headR - 4} ${headCy + 12} q -2 18 0 30`} stroke={shade} strokeWidth="0.8" fill="none" opacity="0.5" />
        <path d={`M ${cx + headR + 4} ${headCy + 12} q  2 18 0 30`} stroke={shade} strokeWidth="0.8" fill="none" opacity="0.5" />
      </>
    );
  }

  if (style === "ponytail") {
    return (
      <>
        <path
          d={`M ${cx - headR * 0.95} ${headCy - 4}
              C ${cx - headR * 0.95} ${top + 3} ${cx - headR * 0.5} ${top - 3} ${cx} ${top - 2}
              C ${cx + headR * 0.5} ${top - 3} ${cx + headR * 0.95} ${top + 3} ${cx + headR * 0.95} ${headCy - 4}
              Q ${cx + headR * 0.6} ${headCy - 11} ${cx} ${headCy - 11}
              Q ${cx - headR * 0.6} ${headCy - 11} ${cx - headR * 0.95} ${headCy - 4}
              Z`}
          fill={color}
        />
        <ellipse cx={cx} cy={headCy + 3} rx="5" ry="3.5" fill={shade} />
        <path
          d={`M ${cx - 5} ${headCy + 5}
              Q ${cx - 12} ${headCy + 28} ${cx - 7} ${headCy + 55}
              Q ${cx} ${headCy + 60} ${cx + 7} ${headCy + 55}
              Q ${cx + 12} ${headCy + 28} ${cx + 5} ${headCy + 5}
              Z`}
          fill={color}
        />
      </>
    );
  }

  if (style === "bun") {
    return (
      <>
        <path
          d={`M ${cx - headR * 0.95} ${headCy - 4}
              C ${cx - headR * 0.95} ${top + 3} ${cx - headR * 0.5} ${top - 1} ${cx} ${top}
              C ${cx + headR * 0.5} ${top - 1} ${cx + headR * 0.95} ${top + 3} ${cx + headR * 0.95} ${headCy - 4}
              Q ${cx + headR * 0.6} ${headCy - 11} ${cx} ${headCy - 11}
              Q ${cx - headR * 0.6} ${headCy - 11} ${cx - headR * 0.95} ${headCy - 4}
              Z`}
          fill={color}
        />
        <circle cx={cx} cy={top - 6} r={headR * 0.45} fill={color} />
        <circle cx={cx - 3} cy={top - 8} r={headR * 0.18} fill={hl} opacity="0.5" />
        <rect x={cx - 7} y={top - 3} width="14" height="2.5" rx="1" fill={shade} />
      </>
    );
  }

  if (style === "curly") {
    const bumps: { dx: number; dy: number; r: number }[] = [
      { dx: -headR * 0.85, dy: -6, r: 7 },
      { dx: -headR * 0.55, dy: -13, r: 9 },
      { dx: -headR * 0.18, dy: -16, r: 9 },
      { dx:  headR * 0.18, dy: -16, r: 9 },
      { dx:  headR * 0.55, dy: -13, r: 9 },
      { dx:  headR * 0.85, dy: -6, r: 7 },
      { dx: -headR * 0.7,  dy: 0,  r: 5 },
      { dx:  headR * 0.7,  dy: 0,  r: 5 },
    ];
    return (
      <>
        {bumps.map((b, i) => (
          <circle key={i} cx={cx + b.dx} cy={headCy + b.dy} r={b.r} fill={color} />
        ))}
        <circle cx={cx - 4} cy={headCy - 14} r="2.5" fill={hl} opacity="0.6" />
      </>
    );
  }

  // mohawk
  return (
    <>
      <path
        d={`M ${cx - headR * 0.95} ${headCy - 4}
            C ${cx - headR * 0.95} ${top + 5} ${cx - headR * 0.5} ${top + 2} ${cx - 6} ${top + 2}
            L ${cx + 6} ${top + 2}
            C ${cx + headR * 0.5} ${top + 2} ${cx + headR * 0.95} ${top + 5} ${cx + headR * 0.95} ${headCy - 4}
            Q ${cx + headR * 0.6} ${headCy - 11} ${cx} ${headCy - 11}
            Q ${cx - headR * 0.6} ${headCy - 11} ${cx - headR * 0.95} ${headCy - 4}
            Z`}
        fill={shade}
        opacity="0.7"
      />
      <path
        d={`M ${cx - 5} ${top + 5}
            L ${cx - 4} ${top - 14}
            Q ${cx} ${top - 19} ${cx + 4} ${top - 14}
            L ${cx + 5} ${top + 5}
            Z`}
        fill={color}
      />
    </>
  );
}

function darken(hex: string, amount: number): string {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return hex;
  const [r, g, b] = m.map((p) => Math.max(0, Math.round(parseInt(p, 16) * (1 - amount))));
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function lightenHex(hex: string, amount: number): string {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return hex;
  const [r, g, b] = m.map((p) => {
    const v = parseInt(p, 16);
    return Math.min(255, Math.round(v + (255 - v) * amount));
  });
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function Arm({
  side,
  cx,
  shoulderY,
  shoulderW,
  armW,
  bicep,
  skinFill,
  shade,
  deep,
  veinsOpacity,
  limbGradId: _limbGradId,
}: {
  side: "left" | "right";
  cx: number;
  shoulderY: number;
  shoulderW: number;
  armW: number;
  bicep: number;
  skinFill: string;
  shade: string;
  deep: string;
  veinsOpacity: number;
  limbGradId: string;
}) {
  const sign = side === "left" ? -1 : 1;
  // Arms are now slightly OUT from the body — gives a more athletic ready stance
  const shoulderX = cx + sign * (shoulderW / 2 - armW / 4);
  const elbowY = shoulderY + 78;
  const wristY = shoulderY + 150;
  const elbowX = shoulderX + sign * 6;
  const wristX = elbowX + sign * 8;
  const bicepBulgeX = shoulderX + sign * (armW / 2 + bicep);
  const bicepY = shoulderY + 38;
  const handR = armW * 0.5;

  const outerPath = `
    M ${shoulderX + sign * armW / 2} ${shoulderY}
    Q ${bicepBulgeX} ${bicepY}
      ${elbowX + sign * armW / 2} ${elbowY}
    Q ${elbowX + sign * (armW / 2 + 2)} ${elbowY + 30}
      ${wristX + sign * armW / 2.5} ${wristY}
  `;
  const innerPath = `
    L ${wristX - sign * armW / 2.5} ${wristY}
    Q ${elbowX - sign * armW / 2.5} ${elbowY + 25}
      ${elbowX - sign * armW / 2} ${elbowY}
    Q ${shoulderX} ${bicepY + 20}
      ${shoulderX - sign * armW / 2.5} ${shoulderY + 4}
    Z
  `;

  return (
    <g>
      <path d={outerPath + innerPath} fill={skinFill} />
      {/* Bicep bulge highlight */}
      {bicep > 2 && (
        <ellipse
          cx={bicepBulgeX - sign * 4}
          cy={bicepY + 4}
          rx={bicep * 0.7}
          ry={14}
          fill={shade}
          opacity="0.55"
        />
      )}
      {/* Forearm vein */}
      {veinsOpacity > 0 && (
        <path
          d={`M ${elbowX + sign * 2} ${elbowY + 8} Q ${elbowX + sign * 6} ${elbowY + 30} ${wristX + sign * 4} ${wristY - 8}`}
          stroke="#3b6e8c"
          strokeWidth="1"
          fill="none"
          opacity={veinsOpacity}
        />
      )}
      {/* Hand */}
      <g>
        <ellipse
          cx={wristX}
          cy={wristY + handR + 1}
          rx={handR * 0.95}
          ry={handR * 1.15}
          fill={skinFill}
          stroke={deep}
          strokeWidth="1"
        />
        <ellipse
          cx={wristX - sign * handR * 0.7}
          cy={wristY + handR * 0.6}
          rx={handR * 0.4}
          ry={handR * 0.7}
          fill={skinFill}
          stroke={deep}
          strokeWidth="0.8"
          transform={`rotate(${sign * 18} ${wristX - sign * handR * 0.7} ${wristY + handR * 0.6})`}
        />
      </g>
    </g>
  );
}

function Leg({
  side,
  cx,
  hipY,
  kneeY,
  ankleY,
  thighW,
  calfBulge,
  skinFill,
  shade,
  deep,
  defOpacity,
  limbGradId: _limbGradId,
}: {
  side: "left" | "right";
  cx: number;
  hipY: number;
  kneeY: number;
  ankleY: number;
  thighW: number;
  calfBulge: number;
  skinFill: string;
  shade: string;
  deep: string;
  defOpacity: number;
  limbGradId: string;
}) {
  const sign = side === "left" ? -1 : 1;
  const hipX = cx + sign * thighW / 2;
  const kneeX = hipX + sign * -2;
  const ankleX = kneeX + sign * -2;
  const calfBulgeX = kneeX + sign * (thighW / 2.5 + calfBulge);

  const path = `
    M ${hipX - sign * thighW / 2} ${hipY}
    Q ${hipX} ${hipY + 50}
      ${kneeX - sign * thighW / 2.6} ${kneeY}
    Q ${calfBulgeX - sign * 4} ${kneeY + 30}
      ${ankleX - sign * thighW / 4} ${ankleY}
    L ${ankleX + sign * thighW / 4} ${ankleY}
    Q ${calfBulgeX} ${kneeY + 30}
      ${kneeX + sign * thighW / 2.6} ${kneeY}
    Q ${hipX + sign * thighW / 4} ${hipY + 60}
      ${hipX + sign * thighW / 2} ${hipY}
    Z
  `;
  return (
    <g>
      <path d={path} fill={skinFill} />
      {/* Quad cut — only at higher levels */}
      {defOpacity > 0 && (
        <path
          d={`M ${hipX - sign * 2} ${hipY + 30} Q ${hipX + sign * 0} ${kneeY - 15} ${kneeX + sign * 0} ${kneeY - 5}`}
          stroke={deep}
          strokeWidth="1.4"
          fill="none"
          opacity={defOpacity}
        />
      )}
      {/* Sneaker */}
      <g>
        {/* Sole */}
        <path
          d={`M ${ankleX - thighW * 0.55} ${ankleY + 8}
              Q ${ankleX - thighW * 0.6} ${ankleY + 14} ${ankleX - thighW * 0.4} ${ankleY + 16}
              L ${ankleX + thighW * 0.7} ${ankleY + 16}
              Q ${ankleX + thighW * 0.85} ${ankleY + 12} ${ankleX + thighW * 0.7} ${ankleY + 8}
              Z`}
          fill="#ededed"
        />
        <path
          d={`M ${ankleX - thighW * 0.5} ${ankleY + 10} L ${ankleX + thighW * 0.78} ${ankleY + 10}`}
          stroke="#8a8a8a"
          strokeWidth="0.8"
        />
        {/* Upper */}
        <path
          d={`M ${ankleX - thighW * 0.4} ${ankleY + 8}
              Q ${ankleX - thighW * 0.45} ${ankleY - 2} ${ankleX - thighW * 0.2} ${ankleY - 4}
              L ${ankleX + thighW * 0.2} ${ankleY - 4}
              Q ${ankleX + thighW * 0.6} ${ankleY - 2} ${ankleX + thighW * 0.7} ${ankleY + 8}
              Z`}
          fill="#111827"
        />
        {/* Tongue */}
        <path
          d={`M ${ankleX - thighW * 0.18} ${ankleY - 2}
              L ${ankleX - thighW * 0.05} ${ankleY + 4}
              L ${ankleX + thighW * 0.18} ${ankleY + 4}
              L ${ankleX + thighW * 0.18} ${ankleY - 2} Z`}
          fill="#1f2937"
        />
        {/* Accent stripe */}
        <path
          d={`M ${ankleX + thighW * 0.05} ${ankleY + 2}
              Q ${ankleX + thighW * 0.35} ${ankleY + 4} ${ankleX + thighW * 0.6} ${ankleY + 6}`}
          stroke={ACCENT}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Cyan rim highlight on top of shoe — picks up gym lighting */}
        <path
          d={`M ${ankleX - thighW * 0.35} ${ankleY - 2}
              Q ${ankleX} ${ankleY - 5} ${ankleX + thighW * 0.5} ${ankleY - 1}`}
          stroke={RIM}
          strokeWidth="1"
          fill="none"
          opacity="0.5"
          strokeLinecap="round"
        />
        {/* Laces */}
        <g stroke="#ededed" strokeWidth="1" fill="none" opacity="0.9">
          <path d={`M ${ankleX - thighW * 0.05} ${ankleY + 1} l ${thighW * 0.16} 0`} />
          <path d={`M ${ankleX - thighW * 0.05} ${ankleY + 4} l ${thighW * 0.18} 0`} />
        </g>
      </g>
      {/* unused - prevent TS warning */}
      {shade && skinFill ? null : null}
    </g>
  );
}

function torsoPath(
  cx: number,
  shoulderY: number,
  shoulderW: number,
  waistW: number,
  hipW: number,
  hipY: number,
): string {
  const halfS = shoulderW / 2;
  const halfW = waistW / 2;
  const halfH = hipW / 2;
  const waistY = (shoulderY + hipY) / 2 + 30;
  return `
    M ${cx - halfS} ${shoulderY}
    Q ${cx - halfS - 4} ${shoulderY + 40} ${cx - halfW} ${waistY}
    Q ${cx - halfW} ${(waistY + hipY) / 2} ${cx - halfH} ${hipY}
    L ${cx + halfH} ${hipY}
    Q ${cx + halfW} ${(waistY + hipY) / 2} ${cx + halfW} ${waistY}
    Q ${cx + halfS + 4} ${shoulderY + 40} ${cx + halfS} ${shoulderY}
    Z
  `;
}

function shortsPath(cx: number, hipY: number, hipW: number, bottomY: number): string {
  const half = hipW / 2 + 6;
  return `
    M ${cx - half} ${hipY - 2}
    L ${cx + half} ${hipY - 2}
    L ${cx + half - 4} ${bottomY}
    L ${cx + 4} ${bottomY}
    L ${cx} ${bottomY - 8}
    L ${cx - 4} ${bottomY}
    L ${cx - half + 4} ${bottomY}
    Z
  `;
}
