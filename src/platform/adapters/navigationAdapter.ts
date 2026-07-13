export interface NavigationAdapter {
  goTo(path: string): void;
  back(): void;
  replace(path: string): void;
}
