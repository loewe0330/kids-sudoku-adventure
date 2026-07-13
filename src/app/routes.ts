export const ROUTES = {
  ADMIN_LOGIN: "/admin",
  ADMIN_DASHBOARD: "/admin",
  PARENT_LOGIN: "/login",
  CHILDREN: "/children",
  CHILD_HOME: "/child/:childId/home",
  CHILD_ADVENTURE: "/child/:childId/adventure",
  CHILD_PRACTICE: "/child/:childId/free-practice",
  CHILD_PRACTICE_LEGACY: "/child/:childId/practice",
  CHILD_BANK_LEGACY: "/child/:childId/bank",
  CHILD_GROWTH: "/child/:childId/growth",
  CHILD_SETTINGS: "/child/:childId/settings",
  CHILD_PLAY: "/child/:childId/play",
  CHILD_PRINT: "/child/:childId/print"
} as const;

export const routes = {
  home: ROUTES.PARENT_LOGIN,
  admin: ROUTES.ADMIN_LOGIN,
  children: ROUTES.CHILDREN
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
export type ChildRouteSection = "home" | "adventure" | "practice" | "growth" | "settings" | "play" | "print";
export type PracticeTab = "select" | "bank" | "batch" | "print";

export interface MatchedChildRoute {
  childId: string;
  section: ChildRouteSection;
  practiceTab?: PracticeTab;
  canonicalPath?: string;
}

const childSections = new Set<ChildRouteSection>(["home", "adventure", "practice", "growth", "settings", "play", "print"]);

export const childPath = (childId: string, section: ChildRouteSection): string => {
  const encodedChildId = encodeURIComponent(childId);
  if (section === "practice") return `/child/${encodedChildId}/free-practice`;
  return `/child/${encodedChildId}/${section}`;
};

export const matchChildRoute = (pathname: string): MatchedChildRoute | null => {
  const match = pathname.match(/^\/child\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  const childId = decodeURIComponent(match[1]);
  const encodedChildId = encodeURIComponent(childId);
  const rawSection = match[2];
  if (rawSection === "free-practice") {
    return {
      childId,
      section: "practice",
      practiceTab: "select"
    };
  }
  if (rawSection === "practice") {
    return {
      childId,
      section: "practice",
      practiceTab: "select",
      canonicalPath: `/child/${encodedChildId}/free-practice`
    };
  }
  if (rawSection === "bank") {
    return {
      childId,
      section: "practice",
      practiceTab: "bank",
      canonicalPath: `/child/${encodedChildId}/free-practice`
    };
  }
  const section = rawSection as ChildRouteSection;
  if (!childSections.has(section)) return null;
  return {
    childId,
    section
  };
};
