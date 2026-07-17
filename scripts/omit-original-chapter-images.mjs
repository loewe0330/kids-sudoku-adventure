import { rm } from "node:fs/promises";

export const omitOriginalChapterImages = () => ({
  name: "omit-original-chapter-images",
  apply: "build",
  async closeBundle() {
    await Promise.all(
      Array.from({ length: 11 }, (_, index) =>
        rm(new URL(`../dist/assets/adventure/chapter-${index + 1}.png`, import.meta.url), { force: true })
      )
    );
  }
});
