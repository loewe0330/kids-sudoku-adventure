import type { NavigationAdapter } from "../adapters/navigationAdapter";

export const webNavigationAdapter: NavigationAdapter = {
  goTo(path: string): void {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  },
  back(): void {
    window.history.back();
  },
  replace(path: string): void {
    window.history.replaceState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
};
