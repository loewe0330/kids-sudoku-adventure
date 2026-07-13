import type { NavigationAdapter } from "../adapters/navigationAdapter";

const normalizeBasePath = (baseUrl: string): string => {
  if (!baseUrl || baseUrl === "/") return "";
  return `/${baseUrl.replace(/^\/+|\/+$/g, "")}`;
};

export const stripWebBasePath = (pathname: string, baseUrl = import.meta.env.BASE_URL): string => {
  const basePath = normalizeBasePath(baseUrl);
  if (!basePath) return pathname || "/";
  if (pathname === basePath || pathname === `${basePath}/`) return "/";
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length);
  return pathname || "/";
};

export const addWebBasePath = (path: string, baseUrl = import.meta.env.BASE_URL): string => {
  const basePath = normalizeBasePath(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}` || "/";
};

export const getWebAppPathname = (): string => stripWebBasePath(window.location.pathname);

export const webNavigationAdapter: NavigationAdapter = {
  goTo(path: string): void {
    window.history.pushState({}, "", addWebBasePath(path));
    window.dispatchEvent(new PopStateEvent("popstate"));
  },
  back(): void {
    window.history.back();
  },
  replace(path: string): void {
    window.history.replaceState({}, "", addWebBasePath(path));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
};
