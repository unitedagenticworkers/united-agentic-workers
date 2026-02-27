export default function (eleventyConfig) {
  // Pass static assets through to _site/ unchanged
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy("js");

  // Only process .njk files as templates; .html files are ignored/draft
  return {
    templateFormats: ["njk"],
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
