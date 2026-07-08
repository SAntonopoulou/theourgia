import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

import { RecipesSurface, type RecipeDetail } from "./RecipesSurface.js";

const recipes = [
  {
    id: "r1",
    kind: "incense" as const,
    name: "Solar Incense",
    description: null,
  },
  {
    id: "r2",
    kind: "oil" as const,
    name: "Anointing Oil",
    description: null,
  },
];

const activeRecipe: RecipeDetail = {
  id: "r1",
  kind: "incense",
  name: "Solar Incense",
  description: "for solar hours",
  ingredients: [
    { name: "frankincense", amount: "3 parts" },
    { name: "myrrh", amount: "1 part" },
  ],
  steps: [
    { text: "grind resins", duration_minutes: 5 },
    { text: "burn on charcoal", duration_minutes: null },
  ],
  correspondences: {},
  library_source_ids: [],
  entity_ids: [],
  visibility: "personal",
};

describe("RecipesSurface", () => {
  it("renders one entry per recipe", () => {
    const { container } = render(
      <RecipesSurface
        recipes={recipes}
        activeRecipe={null}
        kindFilter="all"
        onKindFilterChange={vi.fn()}
        onSelectRecipe={vi.fn()}
        onCreateRecipe={vi.fn()}
        onDeleteRecipe={vi.fn()}
        onSaveRecipe={vi.fn()}
      />,
    );
    const items = container.querySelectorAll(
      '[data-role="recipe-list"] ul button',
    );
    expect(items).toHaveLength(recipes.length);
  });

  it("marks the active kind chip", () => {
    const { container } = render(
      <RecipesSurface
        recipes={recipes}
        activeRecipe={null}
        kindFilter="oil"
        onKindFilterChange={vi.fn()}
        onSelectRecipe={vi.fn()}
        onCreateRecipe={vi.fn()}
        onDeleteRecipe={vi.fn()}
        onSaveRecipe={vi.fn()}
      />,
    );
    const active = container.querySelector(
      '[data-role="kind-chips"] button[data-active="true"]',
    );
    expect(active?.textContent).toBe("Oil");
  });

  it("onKindFilterChange fires when a chip is clicked", () => {
    const onKindFilterChange = vi.fn();
    const { container } = render(
      <RecipesSurface
        recipes={recipes}
        activeRecipe={null}
        kindFilter="all"
        onKindFilterChange={onKindFilterChange}
        onSelectRecipe={vi.fn()}
        onCreateRecipe={vi.fn()}
        onDeleteRecipe={vi.fn()}
        onSaveRecipe={vi.fn()}
      />,
    );
    const oilChip = Array.from(
      container.querySelectorAll('[data-role="kind-chips"] button'),
    ).find((b) => b.textContent === "Oil") as HTMLButtonElement;
    fireEvent.click(oilChip);
    expect(onKindFilterChange).toHaveBeenCalledWith("oil");
  });

  it("renders the ingredient rows of the active recipe", () => {
    const { container } = render(
      <RecipesSurface
        recipes={recipes}
        activeRecipe={activeRecipe}
        kindFilter="all"
        onKindFilterChange={vi.fn()}
        onSelectRecipe={vi.fn()}
        onCreateRecipe={vi.fn()}
        onDeleteRecipe={vi.fn()}
        onSaveRecipe={vi.fn()}
      />,
    );
    const names = container.querySelectorAll(
      '[data-role="ingredients"] input[placeholder^="Name"]',
    );
    expect(names).toHaveLength(activeRecipe.ingredients.length);
  });

  it("onSaveRecipe fires with the composed patch when Save is clicked", () => {
    const onSaveRecipe = vi.fn();
    const { container } = render(
      <RecipesSurface
        recipes={recipes}
        activeRecipe={activeRecipe}
        kindFilter="all"
        onKindFilterChange={vi.fn()}
        onSelectRecipe={vi.fn()}
        onCreateRecipe={vi.fn()}
        onDeleteRecipe={vi.fn()}
        onSaveRecipe={onSaveRecipe}
      />,
    );
    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Save recipe",
    ) as HTMLButtonElement;
    fireEvent.click(saveBtn);
    expect(onSaveRecipe).toHaveBeenCalledTimes(1);
    const patch = onSaveRecipe.mock.calls[0]![0];
    expect(patch.name).toBe(activeRecipe.name);
    expect(patch.ingredients).toHaveLength(activeRecipe.ingredients.length);
  });

  it("adding an ingredient increases the row count", () => {
    const { container } = render(
      <RecipesSurface
        recipes={recipes}
        activeRecipe={activeRecipe}
        kindFilter="all"
        onKindFilterChange={vi.fn()}
        onSelectRecipe={vi.fn()}
        onCreateRecipe={vi.fn()}
        onDeleteRecipe={vi.fn()}
        onSaveRecipe={vi.fn()}
      />,
    );
    const addBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Add ingredient",
    ) as HTMLButtonElement;
    fireEvent.click(addBtn);
    const rows = container.querySelectorAll(
      '[data-role="ingredients"] input[placeholder^="Name"]',
    );
    expect(rows).toHaveLength(activeRecipe.ingredients.length + 1);
  });
});
