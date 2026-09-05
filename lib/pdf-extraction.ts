export type ExtractedPdf = {
  text: string;
  pageReferences: Array<{ page: number; startWord: number; endWord: number }>;
};

export async function extractPdf(file: File): Promise<ExtractedPdf> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  const pageReferences: ExtractedPdf["pageReferences"] = [];
  let wordCount = 0;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!pageText) continue;
    const pageWords = pageText.split(/\s+/).length;
    pageReferences.push({
      page: pageNumber,
      startWord: wordCount,
      endWord: wordCount + pageWords - 1
    });
    wordCount += pageWords;
    pages.push(pageText);
  }

  const text = pages.join("\n\n").trim();
  if (!text) {
    throw new Error("This PDF did not contain readable text.");
  }

  return { text, pageReferences };
}
