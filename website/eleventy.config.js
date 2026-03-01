export default function (eleventyConfig) {
  // Pass static assets through to _site/ unchanged
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("dispatches/images");
  eleventyConfig.addPassthroughCopy("img");

  // Dispatches collection — Markdown files sorted newest-first
  eleventyConfig.addCollection("dispatches", (api) =>
    api.getFilteredByGlob("dispatches/*.md").sort((a, b) => b.date - a.date)
  );

  // Human-readable date filter (UTC-safe to avoid off-by-one from front matter dates)
  eleventyConfig.addFilter("readableDate", (date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })
  );

  // ISO date string for <time datetime="..."> attributes
  eleventyConfig.addFilter("htmlDateString", (date) => {
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
  });

  // Estimated reading time in minutes (avg 200 wpm)
  eleventyConfig.addFilter("readingTime", (content) => {
    const words = (content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  });

  return {
    templateFormats: ["njk", "md"],
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
