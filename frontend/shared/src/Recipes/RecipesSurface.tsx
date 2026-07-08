/**
 * Recipes surface — list + edit incense / oil / wash / philtre recipes.
 *
 * FEATURES §10 · "Recipes — herbs, oils, incense, formulas". Backend
 * shipped in b108-2gy; this surface completes the flow.
 *
 * Layout: kind-filter chips + recipe list on the left, editor on
 * the right with ingredients + steps + correspondences editors.
 */

import { type CSSProperties, useState } from "react";

export type RecipeKind = "incense" | "oil" | "wash" | "philtre" | "other";

export interface RecipeIngredient {
  name: string;
  amount?: string | null;
  notes?: string | null;
}

export interface RecipeStep {
  text: string;
  duration_minutes?: number | null;
}

export interface RecipeSummary {
  id: string;
  kind: RecipeKind;
  name: string;
  description: string | null;
}

export interface RecipeDetail extends RecipeSummary {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  correspondences: Record<string, unknown>;
  library_source_ids: string[];
  entity_ids: string[];
  visibility: string;
}

export interface RecipesSurfaceProps {
  recipes: RecipeSummary[];
  activeRecipe: RecipeDetail | null;
  kindFilter: RecipeKind | "all";
  onKindFilterChange: (k: RecipeKind | "all") => void;
  onSelectRecipe: (id: string) => void;
  onCreateRecipe: () => void;
  onDeleteRecipe: (id: string) => void;
  onSaveRecipe: (patch: Partial<RecipeDetail>) => void;
  className?: string;
  style?: CSSProperties;
}

const KIND_LABEL: Record<RecipeKind, string> = {
  incense: "Incense",
  oil: "Oil",
  wash: "Wash",
  philtre: "Philtre",
  other: "Other",
};

const KIND_ORDER: RecipeKind[] = [
  "incense",
  "oil",
  "wash",
  "philtre",
  "other",
];

export function RecipesSurface({
  recipes,
  activeRecipe,
  kindFilter,
  onKindFilterChange,
  onSelectRecipe,
  onCreateRecipe,
  onDeleteRecipe,
  onSaveRecipe,
  className,
  style,
}: RecipesSurfaceProps) {
  return (
    <div
      className={className}
      data-component="recipes"
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: "var(--space-4)",
        ...style,
      }}
    >
      <aside data-role="recipe-list">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-2)",
          }}
        >
          <h3 style={{ font: "var(--type-eyebrow)", color: "var(--muted)" }}>
            Recipes
          </h3>
          <button type="button" onClick={onCreateRecipe} style={smallPrimary}>
            New
          </button>
        </div>
        <nav
          data-role="kind-chips"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginBottom: "var(--space-2)",
          }}
        >
          {(["all", ...KIND_ORDER] as const).map((k) => (
            <button
              key={k}
              type="button"
              data-active={kindFilter === k}
              onClick={() => onKindFilterChange(k)}
              style={chipStyle(kindFilter === k)}
            >
              {k === "all" ? "All" : KIND_LABEL[k]}
            </button>
          ))}
        </nav>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {recipes.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                data-active={r.id === activeRecipe?.id}
                onClick={() => onSelectRecipe(r.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-2)",
                  marginBottom: "var(--space-1)",
                  background:
                    r.id === activeRecipe?.id ? "var(--bg-2)" : "transparent",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  font: "var(--type-body)",
                }}
              >
                <div>{r.name}</div>
                <div
                  style={{
                    font: "var(--type-caption)",
                    color: "var(--muted)",
                  }}
                >
                  {KIND_LABEL[r.kind]}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section data-role="recipe-editor">
        {activeRecipe ? (
          <RecipeEditor
            recipe={activeRecipe}
            onSave={onSaveRecipe}
            onDelete={() => onDeleteRecipe(activeRecipe.id)}
          />
        ) : (
          <p style={{ color: "var(--muted)" }}>
            Choose a recipe or create a new one.
          </p>
        )}
      </section>
    </div>
  );
}

interface RecipeEditorProps {
  recipe: RecipeDetail;
  onSave: (patch: Partial<RecipeDetail>) => void;
  onDelete: () => void;
}

function RecipeEditor({ recipe, onSave, onDelete }: RecipeEditorProps) {
  const [name, setName] = useState<string>(recipe.name);
  const [description, setDescription] = useState<string>(
    recipe.description ?? "",
  );
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe.ingredients,
  );
  const [steps, setSteps] = useState<RecipeStep[]>(recipe.steps);

  const commit = (): void => {
    onSave({ name, description, ingredients, steps });
  };

  const updateIngredient = (
    index: number,
    patch: Partial<RecipeIngredient>,
  ): void => {
    setIngredients(
      ingredients.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  };

  const updateStep = (index: number, patch: Partial<RecipeStep>): void => {
    setSteps(steps.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  return (
    <div data-role="recipe-form">
      <h2 style={{ font: "var(--type-title)", marginBottom: "var(--space-2)" }}>
        {recipe.name}
      </h2>
      <label style={{ display: "block", font: "var(--type-label)" }}>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", font: "var(--type-label)" }}>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{ ...inputStyle, fontFamily: "var(--font-ui)" }}
        />
      </label>

      <fieldset data-role="ingredients" style={fieldsetStyle}>
        <legend style={legendStyle}>Ingredients</legend>
        {ingredients.map((ing, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr auto",
              gap: 4,
              marginBottom: 4,
            }}
          >
            <input
              type="text"
              placeholder="Name (e.g. frankincense)"
              value={ing.name}
              onChange={(e) => updateIngredient(i, { name: e.target.value })}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Amount"
              value={ing.amount ?? ""}
              onChange={(e) =>
                updateIngredient(i, { amount: e.target.value })
              }
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() =>
                setIngredients(ingredients.filter((_, j) => j !== i))
              }
              style={smallStyle}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setIngredients([...ingredients, { name: "", amount: "" }])
          }
          style={dashedButton}
        >
          Add ingredient
        </button>
      </fieldset>

      <fieldset data-role="steps" style={fieldsetStyle}>
        <legend style={legendStyle}>Steps</legend>
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 100px auto",
              gap: 4,
              marginBottom: 4,
            }}
          >
            <input
              type="text"
              placeholder={`Step ${i + 1}`}
              value={step.text}
              onChange={(e) => updateStep(i, { text: e.target.value })}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="min"
              value={step.duration_minutes ?? ""}
              onChange={(e) =>
                updateStep(i, {
                  duration_minutes:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              style={inputStyle}
              min={0}
            />
            <button
              type="button"
              onClick={() => setSteps(steps.filter((_, j) => j !== i))}
              style={smallStyle}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSteps([...steps, { text: "" }])}
          style={dashedButton}
        >
          Add step
        </button>
      </fieldset>

      <div style={{ display: "flex", gap: 8, marginTop: "var(--space-3)" }}>
        <button type="button" onClick={commit} style={primaryStyle}>
          Save recipe
        </button>
        <button type="button" onClick={onDelete} style={destructiveStyle}>
          Delete
        </button>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "var(--space-2)",
  marginBottom: "var(--space-2)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-sm)",
};

const fieldsetStyle: CSSProperties = {
  border: "1px solid var(--line-2)",
  padding: "var(--space-3)",
  marginBottom: "var(--space-3)",
  borderRadius: "var(--radius-sm)",
};

const legendStyle: CSSProperties = {
  font: "var(--type-label)",
  color: "var(--muted)",
};

const smallPrimary: CSSProperties = {
  padding: "var(--space-1) var(--space-2)",
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};

const smallStyle: CSSProperties = {
  padding: "var(--space-1) var(--space-2)",
  background: "transparent",
  color: "var(--muted)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};

const primaryStyle: CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};

const destructiveStyle: CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  background: "transparent",
  color: "var(--care)",
  border: "1px solid var(--care)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};

const dashedButton: CSSProperties = {
  padding: "var(--space-2)",
  width: "100%",
  background: "transparent",
  color: "var(--accent)",
  border: "1px dashed var(--accent)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  font: "var(--type-label)",
};

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: "2px 8px",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--bg)" : "var(--ink)",
    border: "1px solid var(--line-2)",
    borderRadius: "var(--radius-pill)",
    cursor: "pointer",
    font: "var(--type-caption)",
  };
}
