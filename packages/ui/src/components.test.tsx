// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { Button } from "./button.js";
import { Card } from "./card.js";
import { Feedback, LoadingIndicator } from "./feedback.js";
import { TextField } from "./text-field.js";

describe("accessible component foundation", () => {
  it("has no automated accessibility violations in representative states", async () => {
    const { container } = render(
      <main>
        <Card title="Post a job">
          <TextField error="Please describe the service." id="service" label="Service needed" />
          <Button isLoading type="button">Submit request</Button>
        </Card>
        <Feedback kind="error" title="Request not sent">Try again.</Feedback>
        <LoadingIndicator label="Loading nearby providers" />
      </main>,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });

  it("connects labels and errors and disables non-repeatable loading actions", () => {
    render(
      <>
        <TextField error="Required" id="service" label="Service needed" />
        <Button isLoading>Continue</Button>
      </>,
    );

    expect(screen.getByLabelText("Service needed").getAttribute("aria-describedby")).toBe("service-error");
    const button = screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
});
