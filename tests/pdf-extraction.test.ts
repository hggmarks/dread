import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractPdf } from "../lib/pdf-extraction";

const getDocument = vi.fn();

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument
}));

describe("PDF extraction", () => {
  beforeEach(() => {
    getDocument.mockReset();
    getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: "A readable PDF." }]
          })
        })
      })
    });
  });

  it("configures the PDF.js worker before loading a PDF", async () => {
    const file = new File(["pdf"], "book.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new ArrayBuffer(0)
    });
    await extractPdf(file);

    expect(getDocument).toHaveBeenCalled();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toContain("pdf.worker.mjs");
  });
});
