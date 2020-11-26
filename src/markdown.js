import md from "markdown-it";

const parser = md({
  linkify: true,
});

export const toHTML = (text) => parser.render(text || "");
