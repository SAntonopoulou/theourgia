import { describe, expect, it } from "vitest";

import { focusNext, focusPrevious, focusableWithin } from "./focusTrap.js";

function mount(html: string): HTMLDivElement {
  const div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

describe("focusTrap", () => {
  it("focusableWithin finds buttons, inputs, links, [tabindex] entries", () => {
    const root = mount(`
      <button id="a">a</button>
      <input id="b" />
      <a id="c" href="#">c</a>
      <span id="d" tabindex="0">d</span>
      <button id="e" disabled>e</button>
      <span tabindex="-1">skipped</span>
    `);
    const ids = focusableWithin(root).map((el) => el.id);
    expect(ids).toEqual(["a", "b", "c", "d"]);
    document.body.removeChild(root);
  });

  it("focusNext wraps from the last focusable to the first", () => {
    const root = mount('<button id="a">a</button><button id="b">b</button>');
    const a = root.querySelector<HTMLElement>("#a");
    const b = root.querySelector<HTMLElement>("#b");
    b?.focus();
    focusNext(root, document.activeElement);
    expect(document.activeElement).toBe(a);
    document.body.removeChild(root);
  });

  it("focusPrevious wraps from the first focusable to the last", () => {
    const root = mount('<button id="a">a</button><button id="b">b</button>');
    const a = root.querySelector<HTMLElement>("#a");
    const b = root.querySelector<HTMLElement>("#b");
    a?.focus();
    focusPrevious(root, document.activeElement);
    expect(document.activeElement).toBe(b);
    document.body.removeChild(root);
  });

  it("focusNext / Previous return null when no focusables exist", () => {
    const root = mount("<span>nothing focusable here</span>");
    expect(focusNext(root, null)).toBeNull();
    expect(focusPrevious(root, null)).toBeNull();
    document.body.removeChild(root);
  });
});
