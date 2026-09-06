import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import HomePage from "../app/page";
import { createLibraryExport, parseLibraryExport } from "../lib/library-export";

vi.mock("../lib/pdf-extraction", () => ({
  extractPdf: vi.fn().mockResolvedValue({
    text: "Extracted book text.",
    pageReferences: [{ page: 1, startWord: 0, endWord: 2 }]
  })
}));

describe("Focus Reader home page", () => {
  beforeEach(() => window.localStorage.clear());

  it("welcomes a new reader and explains how to start", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Read with your eyes in one place." })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your library is ready" })).toBeInTheDocument();
    expect(
      screen.getByText("Paste text or choose a file to begin your first reading session.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import source" })).toBeInTheDocument();
  });

  it("lets a reader review and save pasted Source content", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(
      screen.getByLabelText("Paste text"),
      "A short article worth reading."
    );
    await user.click(screen.getByRole("button", { name: "Review source" }));

    expect(screen.getByRole("heading", { name: "Review your source" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("A short article worth reading.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(screen.getByRole("heading", { name: "Your library" })).toBeInTheDocument();
    expect(screen.getByText("A short article worth reading.")).toBeInTheDocument();
  });

  it("opens a saved source in both reading modes", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(
      screen.getByLabelText("Paste text"),
      "One two three four five six seven eight nine ten."
    );
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));
    await user.click(screen.getByRole("button", { name: "Open Untitled source" }));

    expect(screen.getByText("Conventional Reader")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "One" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Focus Reader" }));
    expect(screen.getByRole("group", { name: "Reading mode" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current word")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("persists the last word position while reading", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(
      screen.getByLabelText("Paste text"),
      "One two three four five six seven eight nine ten."
    );
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));
    await user.click(screen.getByRole("button", { name: "Open Untitled source" }));
    await user.click(screen.getByRole("button", { name: "Focus Reader" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    await new Promise((resolve) => setTimeout(resolve, 900));
    await user.click(screen.getByRole("button", { name: "Pause" }));

    const stored = JSON.parse(window.localStorage.getItem("focus-reader:sources") ?? "[]");
    expect(stored[0].lastPosition).toBeGreaterThan(0);
  });

  it("pauses a Focus Reader when the app leaves the foreground", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(
      screen.getByLabelText("Paste text"),
      "One two three four five six seven eight nine ten."
    );
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));
    await user.click(screen.getByRole("button", { name: "Open Untitled source" }));
    await user.click(screen.getByRole("button", { name: "Focus Reader" }));
    await user.click(screen.getByRole("button", { name: "Play" }));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    });
    fireEvent(document, new Event("visibilitychange"));

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("offers replacement or copy for duplicate imports and deletes a source after confirmation", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    async function importSource() {
      await user.click(screen.getByRole("button", { name: "Import source" }));
      await user.type(screen.getByLabelText("Paste text"), "A repeated source.");
      await user.click(screen.getByRole("button", { name: "Review source" }));
      await user.click(screen.getByRole("button", { name: "Save source" }));
    }

    await importSource();
    expect(screen.getByRole("heading", { name: "Your library" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(screen.getByLabelText("Paste text"), "A repeated source.");
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(screen.getByRole("heading", { name: "What should happen with this import?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create a copy" }));
    expect(screen.getAllByRole("button", { name: /Delete Untitled source/ })).toHaveLength(2);

    window.confirm = () => true;
    await user.click(screen.getAllByRole("button", { name: /Delete Untitled source/ })[0]);
    expect(screen.getAllByRole("button", { name: /Delete Untitled source/ })).toHaveLength(1);
  });

  it("processes a local PDF into an editable preview and preserves page references", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Import source" }));
    const pdf = new File(["pdf bytes"], "book.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Choose a text or PDF file"), pdf);

    expect(await screen.findByDisplayValue("Extracted book text.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));

    const stored = JSON.parse(window.localStorage.getItem("focus-reader:sources") ?? "[]");
    expect(stored[0].originalFileName).toBe("book.pdf");
    expect(stored[0].pageReferences).toEqual([{ page: 1, startWord: 0, endWord: 2 }]);
  });

  it("explains unsupported and oversized file imports without changing the library", async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole("button", { name: "Import source" }));

    const unsupported = new File(["image"], "cover.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose a text or PDF file"), {
      target: { files: [unsupported] }
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Unsupported format");

    const oversized = new File(["small"], "book.txt", { type: "text/plain" });
    Object.defineProperty(oversized, "size", { value: 11 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText("Choose a text or PDF file"), {
      target: { files: [oversized] }
    });
    expect(screen.getByRole("alert")).toHaveTextContent("10 MB local import limit");
    expect(window.localStorage.getItem("focus-reader:sources")).toBeNull();
  });

  it("synchronizes word navigation and saves named bookmarks", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(screen.getByLabelText("Paste text"), "One two three four.");
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));
    await user.click(screen.getByRole("button", { name: "Open Untitled source" }));

    await user.click(screen.getByRole("button", { name: "Focus Reader" }));
    await user.click(screen.getByLabelText("Progress"));
    await user.type(screen.getByLabelText("Bookmark"), "Important");
    await user.click(screen.getByRole("button", { name: "Save bookmark" }));

    expect(screen.getByRole("region", { name: "Named bookmarks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Important" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Conventional" }));
    expect(screen.getByRole("button", { name: "One" })).toBeInTheDocument();
  });

  it("detects confident chapter headings and keeps unstructured text continuous", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(
      screen.getByLabelText("Paste text"),
      "Chapter 1: Beginning\nOne two.\n\nChapter 2: Middle\nThree four."
    );
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));
    await user.click(screen.getByRole("button", { name: "Open Untitled source" }));

    expect(screen.getByLabelText("Chapter")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Chapter 2: Middle" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to library" }));
    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(screen.getByLabelText("Paste text"), "No heading here.");
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));
    const openButtons = screen.getAllByRole("button", { name: "Open Untitled source" });
    await user.click(openButtons[0]);

    expect(screen.queryByLabelText("Chapter")).not.toBeInTheDocument();
  });

  it("exposes accessible reader settings and an optional timing profile", async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(screen.getByLabelText("Paste text"), "One two three.");
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));
    await user.click(screen.getByRole("button", { name: "Open Untitled source" }));
    await user.click(screen.getByRole("button", { name: "Focus Reader" }));

    expect(screen.getByRole("group", { name: "Reading mode" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Light theme" }));
    await user.selectOptions(screen.getByLabelText("Font"), "serif");
    await user.selectOptions(screen.getByLabelText("Timing"), "boundary-aware");
    expect(screen.getByRole("button", { name: "Dark theme" })).toBeInTheDocument();
    expect(screen.getByLabelText("Font")).toHaveValue("serif");
    expect(screen.getByLabelText("Timing")).toHaveValue("boundary-aware");
  });

  it("round-trips a versioned portable library package", () => {
    const source = {
      id: "source-1",
      title: "Book",
      text: "One two.",
      createdAt: "2026-01-01T00:00:00.000Z",
      lastPosition: 1,
      processingStatus: "ready" as const,
      originalFileName: "book.pdf",
      originalFile: { fileName: "book.pdf", mimeType: "application/pdf", base64: "AQI=" },
      bookmarks: [{ id: "bookmark-1", label: "Important", wordIndex: 1 }]
    };

    expect(parseLibraryExport(createLibraryExport([source]))).toEqual([source]);
  });

  it("offers library export and import actions for a populated library", async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(screen.getByLabelText("Paste text"), "Portable source.");
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(screen.getByRole("button", { name: "Export library" })).toBeInTheDocument();
    expect(screen.getByLabelText("Import library")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Untitled source for export" })).toBeInTheDocument();
  });

  it("records local session metrics and an optional self-assessment", async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole("button", { name: "Import source" }));
    await user.type(screen.getByLabelText("Paste text"), "One two three four.");
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));
    await user.click(screen.getByRole("button", { name: "Open Untitled source" }));
    await user.click(screen.getByRole("button", { name: "Focus Reader" }));
    fireEvent.change(screen.getByLabelText("Progress"), { target: { value: "2" } });
    await user.selectOptions(await screen.findByLabelText("Self-assessment"), "4");
    await user.click(screen.getByRole("button", { name: "Finish session" }));

    expect(screen.getByRole("status")).toHaveTextContent("Last session:");
    const stored = JSON.parse(window.localStorage.getItem("focus-reader:sources") ?? "[]");
    expect(stored[0].sessionMetrics[0]).toMatchObject({
      selfAssessment: 4,
      wordsRead: 3,
      pauses: 0
    });
  });

  it("offers explicit cleanup when local library data is malformed", async () => {
    window.localStorage.setItem("focus-reader:sources", JSON.stringify({ broken: true }));
    const user = userEvent.setup();
    render(<HomePage />);

    expect(
      await screen.findByRole("heading", { name: "Your local library needs attention" })
    ).toBeInTheDocument();
    window.confirm = () => true;
    await user.click(screen.getByRole("button", { name: "Clear local library" }));

    expect(window.localStorage.getItem("focus-reader:sources")).toBeNull();
    expect(screen.getByRole("heading", { name: "Your library is ready" })).toBeInTheDocument();
  });
});
