import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import HomePage from "../app/page";

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
    expect(screen.getByText("One two three four five six seven eight nine ten.")).toBeInTheDocument();

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
});
