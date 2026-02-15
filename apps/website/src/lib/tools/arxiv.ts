import { tool } from "ai";
import { z } from "zod";

const arxivPaperSchema = z.object({
  arxivId: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  abstract: z.string(),
  link: z.string(),
  published: z.string(),
  categories: z.array(z.string()),
});

export type ArxivPaper = z.infer<typeof arxivPaperSchema>;

/**
 * Parse an Atom XML response from the arxiv API into structured paper objects.
 */
function parseArxivAtom(xml: string): ArxivPaper[] {
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];

  return entries.map((raw) => {
    const entry = raw.replace(/<\/?entry>/g, "");

    const id = entry.match(/<id>(.*?)<\/id>/)?.[1] ?? "";
    const arxivId = id.replace("http://arxiv.org/abs/", "").replace(/v\d+$/, "");

    const rawTitle = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
    const title = rawTitle.replace(/\s+/g, " ").trim();

    const authors = (entry.match(/<author>\s*<name>(.*?)<\/name>/g) ?? []).map((a) =>
      (a.match(/<name>(.*?)<\/name>/)?.[1] ?? "").trim(),
    );

    const rawAbstract = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? "";
    const abstract = rawAbstract.replace(/\s+/g, " ").trim().slice(0, 400);

    const link =
      entry.match(/<link[^>]*title="pdf"[^>]*href="(.*?)"/)?.[1] ??
      `https://arxiv.org/abs/${arxivId}`;

    const published = entry.match(/<published>(.*?)<\/published>/)?.[1] ?? "";

    const categories = (entry.match(/<category[^>]*term="(.*?)"/g) ?? []).map(
      (c) => c.match(/term="(.*?)"/)?.[1] ?? "",
    );

    return { arxivId, title, authors, abstract, link, published, categories };
  });
}

export const searchArxiv = tool({
  description:
    "Search arxiv.org for academic research papers. Use this when the user asks about " +
    "scientific papers, recent research, preprints, or wants to find academic literature. " +
    "Returns paper titles, authors, abstracts, and links.",
  inputSchema: z.object({
    query: z.string().describe("Search query for arxiv papers"),
    maxResults: z
      .number()
      .optional()
      .describe("Maximum number of results to return, between 1 and 10. Defaults to 5."),
    category: z
      .string()
      .optional()
      .describe("Optional arxiv category filter, e.g. 'cs.AI', 'q-bio.BM', 'cond-mat'"),
  }),
  execute: async ({ query, maxResults, category }) => {
    const limit = Math.min(10, Math.max(1, maxResults ?? 5));
    const searchTerms = category ? `cat:${category}+AND+all:${encodeURIComponent(query)}` : `all:${encodeURIComponent(query)}`;

    const url = `https://export.arxiv.org/api/query?search_query=${searchTerms}&start=0&max_results=${limit}&sortBy=relevance&sortOrder=descending`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`arxiv API returned ${res.status}`);
    }

    const xml = await res.text();
    const papers = parseArxivAtom(xml);

    return { papers, query, totalResults: papers.length };
  },
});
