'use client';

import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

// Base wrapper for consistent sizing
const IconWrapper = ({ size = 24, className = '', children, ...props }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

// === PEOPLE & COMMUNITY ICONS ===

// Community Circle - represents gathering, not generic silhouettes
export const CommunityCircle = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Central fire/gathering point */}
    <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.6" />
    {/* People as dots around circle - like sitting around a fire */}
    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
    <circle cx="17.5" cy="8" r="1.5" fill="currentColor" />
    <circle cx="17.5" cy="16" r="1.5" fill="currentColor" />
    <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    <circle cx="6.5" cy="16" r="1.5" fill="currentColor" />
    <circle cx="6.5" cy="8" r="1.5" fill="currentColor" />
    {/* Connecting lines - like a yarn circle */}
    <path d="M12 5 L17.5 8 L17.5 16 L12 19 L6.5 16 L6.5 8 Z" strokeDasharray="2 2" opacity="0.4" />
  </IconWrapper>
);

// Yarning Circle - conversation, stories, deep listening
export const YarningCircle = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Outer circle representing the gathering */}
    <circle cx="12" cy="12" r="9" strokeDasharray="4 2" opacity="0.4" />
    {/* Inner sacred space */}
    <circle cx="12" cy="12" r="4" opacity="0.6" />
    {/* Speech/story lines emanating */}
    <path d="M8 8 C6 5 4 6 3 4" opacity="0.8" />
    <path d="M16 8 C18 5 20 6 21 4" opacity="0.8" />
    <path d="M8 16 C6 19 4 18 3 20" opacity="0.8" />
    <path d="M16 16 C18 19 20 18 21 20" opacity="0.8" />
  </IconWrapper>
);

// Connection Web - like mycelium network, not corporate handshake
export const ConnectionWeb = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Central node */}
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    {/* Organic connection lines branching out */}
    <path d="M12 10 Q10 6 6 4" />
    <path d="M12 10 Q14 6 18 4" />
    <path d="M14 12 Q18 11 21 8" />
    <path d="M14 12 Q18 14 20 18" />
    <path d="M12 14 Q14 18 18 20" />
    <path d="M12 14 Q10 18 6 20" />
    <path d="M10 12 Q6 14 4 18" />
    <path d="M10 12 Q6 10 3 6" />
    {/* End nodes */}
    <circle cx="6" cy="4" r="1" fill="currentColor" />
    <circle cx="18" cy="4" r="1" fill="currentColor" />
    <circle cx="21" cy="8" r="1" fill="currentColor" />
    <circle cx="20" cy="18" r="1" fill="currentColor" />
    <circle cx="18" cy="20" r="1" fill="currentColor" />
    <circle cx="6" cy="20" r="1" fill="currentColor" />
    <circle cx="4" cy="18" r="1" fill="currentColor" />
    <circle cx="3" cy="6" r="1" fill="currentColor" />
  </IconWrapper>
);

// Heartland - heart made of land/country shapes
export const Heartland = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Heart shape with land texture lines inside */}
    <path
      d="M12 21 C12 21 4 14 4 9.5 C4 6.5 6.5 4 9.5 4 C10.9 4 12 5 12 5 C12 5 13.1 4 14.5 4 C17.5 4 20 6.5 20 9.5 C20 14 12 21 12 21Z"
      fill="none"
    />
    {/* Contour lines like topographic map */}
    <path d="M8 10 Q10 8 12 10 Q14 12 16 10" opacity="0.5" />
    <path d="M9 13 Q11 11 13 13 Q14 14 15 13" opacity="0.4" />
    <path d="M10 16 Q11 15 12 16 Q13 17 14 16" opacity="0.3" />
  </IconWrapper>
);

// === LAND & COUNTRY ICONS ===

// CountryLines - representing connection to land
export const CountryLines = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Horizon line */}
    <path d="M2 16 Q7 14 12 16 Q17 18 22 16" />
    {/* Land contours */}
    <path d="M4 12 Q8 10 12 12 Q16 14 20 12" opacity="0.7" />
    <path d="M6 8 Q9 6 12 8 Q15 10 18 8" opacity="0.5" />
    {/* Sky dots - like stars or rain */}
    <circle cx="6" cy="4" r="0.5" fill="currentColor" />
    <circle cx="12" cy="3" r="0.5" fill="currentColor" />
    <circle cx="18" cy="4" r="0.5" fill="currentColor" />
    <circle cx="9" cy="5" r="0.5" fill="currentColor" />
    <circle cx="15" cy="5" r="0.5" fill="currentColor" />
  </IconWrapper>
);

// Sprout with roots - growth from country
export const RootedSprout = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Stem */}
    <path d="M12 12 L12 18" />
    {/* Leaves - like boomerang shapes */}
    <path d="M12 10 C8 8 7 4 9 3 C11 2 12 6 12 10" fill="currentColor" opacity="0.3" />
    <path d="M12 10 C16 8 17 4 15 3 C13 2 12 6 12 10" fill="currentColor" opacity="0.3" />
    <path d="M12 10 C8 8 7 4 9 3 C11 2 12 6 12 10" />
    <path d="M12 10 C16 8 17 4 15 3 C13 2 12 6 12 10" />
    {/* Roots spreading underground */}
    <path d="M12 18 Q10 19 8 21" opacity="0.6" />
    <path d="M12 18 L12 21" opacity="0.6" />
    <path d="M12 18 Q14 19 16 21" opacity="0.6" />
    <path d="M10 19 Q9 20 7 20" opacity="0.4" />
    <path d="M14 19 Q15 20 17 20" opacity="0.4" />
    {/* Ground line */}
    <path d="M6 18 L18 18" strokeDasharray="2 2" opacity="0.3" />
  </IconWrapper>
);

// === WORK & PROGRESS ICONS ===

// Tractor simplified - the ACT signature
export const TractorMini = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Body */}
    <rect x="6" y="8" width="10" height="6" rx="1" />
    {/* Cabin */}
    <path d="M8 8 L8 5 L12 5 L12 8" />
    {/* Big back wheel */}
    <circle cx="7" cy="16" r="3" />
    <circle cx="7" cy="16" r="1" fill="currentColor" />
    {/* Small front wheel */}
    <circle cx="16" cy="16" r="2" />
    <circle cx="16" cy="16" r="0.5" fill="currentColor" />
    {/* Exhaust/curiosity spark */}
    <path d="M10 5 Q9 3 10 2" opacity="0.6" />
  </IconWrapper>
);

// Plowing/Working - showing progress
export const PlowLines = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Furrow lines - work being done */}
    <path d="M3 8 Q12 6 21 8" />
    <path d="M3 12 Q12 10 21 12" />
    <path d="M3 16 Q12 14 21 16" />
    {/* Seeds/dots showing what's planted */}
    <circle cx="6" cy="9" r="0.5" fill="currentColor" opacity="0.6" />
    <circle cx="12" cy="7" r="0.5" fill="currentColor" opacity="0.6" />
    <circle cx="18" cy="9" r="0.5" fill="currentColor" opacity="0.6" />
    <circle cx="9" cy="11" r="0.5" fill="currentColor" opacity="0.6" />
    <circle cx="15" cy="11" r="0.5" fill="currentColor" opacity="0.6" />
  </IconWrapper>
);

// === CREATIVE & CULTURE ICONS ===

// Boomerang - returning, indigenous culture
export const Boomerang = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    <path
      d="M4 8 C4 4 8 3 12 6 C16 9 18 8 20 4 C22 8 20 12 16 12 C12 12 8 14 6 18 C2 14 4 10 4 8Z"
      fill="currentColor"
      opacity="0.2"
    />
    <path d="M4 8 C4 4 8 3 12 6 C16 9 18 8 20 4 C22 8 20 12 16 12 C12 12 8 14 6 18 C2 14 4 10 4 8Z" />
    {/* Motion lines */}
    <path d="M2 6 L4 8" opacity="0.4" />
    <path d="M5 19 L6 17" opacity="0.4" />
  </IconWrapper>
);

// Story Circle - capturing narratives
export const StorySpiral = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Spiral representing ongoing story */}
    <path d="M12 12 C12 10 14 10 14 12 C14 14 10 14 10 12 C10 9 16 9 16 12 C16 15 8 15 8 12 C8 8 18 8 18 12 C18 16 6 16 6 12" fill="none" />
    {/* Story dots */}
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </IconWrapper>
);

// Campfire - warmth, gathering, late nights
export const Campfire = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Flames */}
    <path d="M12 4 C14 7 15 9 14 12 C13 14 11 14 10 12 C9 9 10 7 12 4Z" fill="currentColor" opacity="0.3" />
    <path d="M12 4 C14 7 15 9 14 12 C13 14 11 14 10 12 C9 9 10 7 12 4Z" />
    <path d="M10 7 C8 9 8 11 9 13" opacity="0.6" />
    <path d="M14 7 C16 9 16 11 15 13" opacity="0.6" />
    {/* Logs */}
    <path d="M6 18 L11 14" strokeWidth="2" />
    <path d="M18 18 L13 14" strokeWidth="2" />
    {/* Sparks */}
    <circle cx="9" cy="5" r="0.5" fill="currentColor" opacity="0.5" />
    <circle cx="15" cy="6" r="0.5" fill="currentColor" opacity="0.5" />
  </IconWrapper>
);

// Night Sky - late nights, dreaming
export const NightSky = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Moon crescent */}
    <path d="M16 4 C12 4 9 8 9 12 C9 16 12 20 16 20 C12 18 10 15 10 12 C10 9 12 6 16 4Z" fill="currentColor" opacity="0.3" />
    <path d="M16 4 C12 4 9 8 9 12 C9 16 12 20 16 20 C12 18 10 15 10 12 C10 9 12 6 16 4Z" />
    {/* Stars */}
    <circle cx="4" cy="8" r="0.5" fill="currentColor" />
    <circle cx="7" cy="4" r="0.75" fill="currentColor" />
    <circle cx="20" cy="10" r="0.5" fill="currentColor" />
    <circle cx="18" cy="6" r="0.5" fill="currentColor" />
    <circle cx="5" cy="16" r="0.5" fill="currentColor" />
    {/* Southern cross hint */}
    <circle cx="20" cy="14" r="0.5" fill="currentColor" />
    <circle cx="21" cy="16" r="0.5" fill="currentColor" />
    <circle cx="19" cy="17" r="0.5" fill="currentColor" />
    <circle cx="21" cy="18" r="0.5" fill="currentColor" />
  </IconWrapper>
);

// Dawn/Sunrise - new beginnings
export const DawnRays = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Horizon */}
    <path d="M2 16 L22 16" />
    {/* Sun rising */}
    <path d="M6 16 Q12 10 18 16" fill="currentColor" opacity="0.2" />
    <path d="M6 16 Q12 10 18 16" />
    {/* Rays */}
    <path d="M12 8 L12 5" />
    <path d="M8 9 L6 6" />
    <path d="M16 9 L18 6" />
    <path d="M5 12 L3 11" />
    <path d="M19 12 L21 11" />
    {/* Ground texture */}
    <path d="M4 19 Q8 18 12 19 Q16 20 20 19" opacity="0.4" />
  </IconWrapper>
);

// === JOURNEY & MOVEMENT ICONS ===

// Journey Path - organic travel line
export const JourneyPath = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Winding path */}
    <path d="M4 20 Q8 16 6 12 Q4 8 8 6 Q12 4 16 6 Q20 8 20 4" strokeDasharray="4 2" />
    {/* Markers along the way */}
    <circle cx="4" cy="20" r="1.5" fill="currentColor" />
    <circle cx="7" cy="11" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="12" cy="5" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="20" cy="4" r="1.5" fill="currentColor" />
  </IconWrapper>
);

// Globe with dotted path
export const WorldPath = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Globe outline */}
    <circle cx="12" cy="12" r="9" />
    {/* Latitude lines */}
    <ellipse cx="12" cy="12" rx="9" ry="4" />
    <path d="M12 3 L12 21" opacity="0.4" />
    {/* Journey arc across globe */}
    <path d="M5 10 Q12 6 19 10" strokeWidth="2" opacity="0.8" />
    {/* Destination dots */}
    <circle cx="5" cy="10" r="1.5" fill="currentColor" />
    <circle cx="12" cy="7" r="1" fill="currentColor" />
    <circle cx="19" cy="10" r="1.5" fill="currentColor" />
  </IconWrapper>
);

// === MUSIC & CULTURE ICONS ===

// Songlines - music connected to country
export const Songlines = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Waveform that looks like landscape */}
    <path d="M2 12 Q4 8 6 12 Q8 16 10 12 Q12 6 14 12 Q16 18 18 12 Q20 8 22 12" />
    {/* Dots representing song/story points */}
    <circle cx="6" cy="12" r="1" fill="currentColor" />
    <circle cx="10" cy="12" r="1" fill="currentColor" />
    <circle cx="14" cy="12" r="1" fill="currentColor" />
    <circle cx="18" cy="12" r="1" fill="currentColor" />
    {/* Ground reference */}
    <path d="M4 18 L20 18" strokeDasharray="2 2" opacity="0.3" />
  </IconWrapper>
);

// Concert/Live Music
export const LiveMusic = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Stage/platform */}
    <path d="M4 16 L20 16" strokeWidth="2" />
    {/* Performer figure - abstract */}
    <circle cx="12" cy="10" r="2" fill="currentColor" opacity="0.4" />
    <path d="M12 12 L12 16" />
    {/* Sound waves */}
    <path d="M6 8 Q4 10 6 12" opacity="0.5" />
    <path d="M4 6 Q1 10 4 14" opacity="0.3" />
    <path d="M18 8 Q20 10 18 12" opacity="0.5" />
    <path d="M20 6 Q23 10 20 14" opacity="0.3" />
    {/* Crowd dots */}
    <circle cx="6" cy="20" r="1" fill="currentColor" opacity="0.4" />
    <circle cx="10" cy="19" r="1" fill="currentColor" opacity="0.4" />
    <circle cx="14" cy="20" r="1" fill="currentColor" opacity="0.4" />
    <circle cx="18" cy="19" r="1" fill="currentColor" opacity="0.4" />
  </IconWrapper>
);

// === BEHIND THE SCENES ICONS ===

// Brew Cup - tea/coffee, warmth, sustenance
export const BrewCup = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Cup body */}
    <path d="M5 8 L5 16 Q5 19 8 19 L14 19 Q17 19 17 16 L17 8" />
    {/* Handle */}
    <path d="M17 10 Q20 10 20 13 Q20 16 17 16" />
    {/* Steam wisps */}
    <path d="M8 5 Q9 3 8 1" opacity="0.5" />
    <path d="M11 6 Q12 4 11 2" opacity="0.4" />
    <path d="M14 5 Q15 3 14 1" opacity="0.5" />
  </IconWrapper>
);

// Flight Path - travel, international connections
export const FlightPath = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Plane silhouette - simple bird-like */}
    <path d="M3 12 L9 10 L12 4 L13 4 L12 10 L18 9 L19 7 L20 7 L19 10 L21 11 L21 12 L19 12 L20 15 L19 15 L18 13 L12 12 L13 18 L12 18 L9 12 L3 14 L3 12Z" fill="currentColor" opacity="0.3" />
    <path d="M3 12 L9 10 L12 4 L13 4 L12 10 L18 9 L19 7 L20 7 L19 10 L21 11 L21 12 L19 12 L20 15 L19 15 L18 13 L12 12 L13 18 L12 18 L9 12 L3 14 L3 12Z" />
    {/* Dotted trail */}
    <circle cx="1" cy="13" r="0.5" fill="currentColor" opacity="0.3" />
    <circle cx="-1" cy="14" r="0.5" fill="currentColor" opacity="0.2" />
  </IconWrapper>
);

// Globe Marker - destination, international
export const GlobeMarker = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Globe */}
    <circle cx="12" cy="12" r="9" opacity="0.6" />
    <ellipse cx="12" cy="12" rx="4" ry="9" opacity="0.4" />
    <path d="M3 12 L21 12" opacity="0.3" />
    <path d="M4 8 L20 8" opacity="0.2" />
    <path d="M4 16 L20 16" opacity="0.2" />
    {/* Location pin on globe */}
    <circle cx="15" cy="8" r="2" fill="currentColor" />
    <path d="M15 10 L15 12" strokeWidth="2" />
  </IconWrapper>
);

// Ticket Stub - concerts, events
export const TicketStub = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Ticket shape with torn edge */}
    <path d="M4 6 L4 10 Q6 10 6 12 Q6 14 4 14 L4 18 L20 18 L20 14 Q18 14 18 12 Q18 10 20 10 L20 6 Z" />
    {/* Perforation line */}
    <path d="M14 6 L14 18" strokeDasharray="2 2" opacity="0.5" />
    {/* Star/music note hint */}
    <circle cx="9" cy="12" r="2" fill="currentColor" opacity="0.3" />
  </IconWrapper>
);

// Heart Hands - family, love, connection
export const HeartHands = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Heart */}
    <path d="M12 20 C12 20 5 14 5 10 C5 7 7 5 10 5 C11 5 12 6 12 6 C12 6 13 5 14 5 C17 5 19 7 19 10 C19 14 12 20 12 20Z" fill="currentColor" opacity="0.2" />
    <path d="M12 20 C12 20 5 14 5 10 C5 7 7 5 10 5 C11 5 12 6 12 6 C12 6 13 5 14 5 C17 5 19 7 19 10 C19 14 12 20 12 20Z" />
    {/* Embracing curve hints */}
    <path d="M3 12 Q4 8 5 10" opacity="0.4" />
    <path d="M21 12 Q20 8 19 10" opacity="0.4" />
  </IconWrapper>
);

// === UTILITY ICONS ===

// External link - arrow but organic
export const OutwardArrow = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    <path d="M8 16 Q12 12 16 8" />
    <path d="M10 8 L16 8 L16 14" />
  </IconWrapper>
);

// Play button - simple
export const PlayTriangle = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    <path d="M8 5 L19 12 L8 19 Z" fill="currentColor" opacity="0.2" />
    <path d="M8 5 L19 12 L8 19 Z" />
  </IconWrapper>
);

// Sparkle/magic - simple star burst
export const Sparkle = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12" />
    <path d="M5.5 5.5 L8 8 M16 16 L18.5 18.5 M18.5 5.5 L16 8 M8 16 L5.5 18.5" opacity="0.6" />
  </IconWrapper>
);

// Location pin - but like a seed dropping
export const PlaceSeed = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Seed/drop shape */}
    <path d="M12 2 C8 2 5 6 5 10 C5 14 12 22 12 22 C12 22 19 14 19 10 C19 6 16 2 12 2Z" />
    {/* Inner circle */}
    <circle cx="12" cy="9" r="2" fill="currentColor" opacity="0.4" />
    {/* Root hint at bottom */}
    <path d="M12 22 L12 24" opacity="0.4" strokeDasharray="1 1" />
  </IconWrapper>
);

// Calendar but more organic
export const SeasonMarker = ({ size, className, ...props }: IconProps) => (
  <IconWrapper size={size} className={className} {...props}>
    {/* Circular calendar */}
    <circle cx="12" cy="12" r="9" />
    {/* Season quadrants */}
    <path d="M12 3 L12 12 L21 12" opacity="0.4" />
    <path d="M12 12 L12 21" opacity="0.4" />
    <path d="M12 12 L3 12" opacity="0.4" />
    {/* Current marker */}
    <circle cx="16" cy="6" r="2" fill="currentColor" />
  </IconWrapper>
);

// Export all icons as a collection for easy access
export const ACTIcons = {
  CommunityCircle,
  YarningCircle,
  ConnectionWeb,
  Heartland,
  CountryLines,
  RootedSprout,
  TractorMini,
  PlowLines,
  Boomerang,
  StorySpiral,
  Campfire,
  NightSky,
  DawnRays,
  JourneyPath,
  WorldPath,
  Songlines,
  LiveMusic,
  BrewCup,
  FlightPath,
  GlobeMarker,
  TicketStub,
  HeartHands,
  OutwardArrow,
  PlayTriangle,
  Sparkle,
  PlaceSeed,
  SeasonMarker,
};

export default ACTIcons;
