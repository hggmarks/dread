import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import HomePage from "../app/page";

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
    await user.type(screen.getByLabelText("Paste text"), "One two three.");
    await user.click(screen.getByRole("button", { name: "Review source" }));
    await user.click(screen.getByRole("button", { name: "Save source" }));
    await user.click(screen.getByRole("button", { name: /Untitled source/ }));

    expect(screen.getByText("Conventional Reader")).toBeInTheDocument();
    expect(screen.getByText("One two three.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Focus Reader" }));
    expect(screen.getByRole("group", { name: "Reading mode" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current word")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });
});
