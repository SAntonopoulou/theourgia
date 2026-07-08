/**
 * Recipes admin route — b108-2he.
 *
 * Wires RecipesSurface to the backend endpoints shipped in b108-2gy.
 */

import {
  ConfirmDialog,
  PromptDialog,
  RecipesSurface,
  type RecipeDetail,
  type RecipeKind,
  type RecipeSummary,
  Skeleton,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";

function toastOk(title: string): void {
  Toast.push({ tone: "success", title });
}

function toastError(title: string, body: unknown): void {
  Toast.push({
    tone: "warning",
    title,
    body: body instanceof Error ? body.message : String(body ?? ""),
  });
}

export function RecipesRoute() {
  useTopbar(
    () => ({
      title: "Recipes",
      subtitle: "Incense, oil, wash, philtre — your formularies",
    }),
    [],
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<RecipeDetail | null>(null);
  const [kindFilter, setKindFilter] = useState<RecipeKind | "all">("all");

  const [creating, setCreating] = useState<{ open: boolean; kind: RecipeKind }>(
    { open: false, kind: "incense" },
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRecipes = useCallback(
    async (filter: RecipeKind | "all") => {
      try {
        const rows = (await apiMethods.listRecipes(
          filter === "all" ? undefined : filter,
        )) as unknown as RecipeSummary[];
        setRecipes(rows);
      } catch (e) {
        toastError("Could not load recipes", e);
      }
    },
    [],
  );

  const loadRecipeDetail = useCallback(async (id: string) => {
    try {
      const row = (await apiMethods.getRecipe(id)) as unknown as RecipeDetail;
      setActiveRecipe(row);
    } catch (e) {
      toastError("Could not load recipe", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadRecipes(kindFilter).finally(() => setLoading(false));
  }, [kindFilter, loadRecipes]);

  const handleCreateSubmit = useCallback(
    async (name: string) => {
      const kind = creating.kind;
      setCreating({ open: false, kind });
      try {
        const created = (await apiMethods.createRecipe({
          kind,
          name,
        })) as unknown as RecipeDetail;
        await loadRecipes(kindFilter);
        setActiveRecipe(created);
        toastOk("Recipe created");
      } catch (e) {
        toastError("Could not create recipe", e);
      }
    },
    [creating.kind, kindFilter, loadRecipes],
  );

  const confirmDelete = useCallback(async () => {
    if (!deletingId) return;
    const id = deletingId;
    setDeletingId(null);
    try {
      await apiMethods.deleteRecipe(id);
      await loadRecipes(kindFilter);
      if (activeRecipe?.id === id) setActiveRecipe(null);
      toastOk("Recipe deleted");
    } catch (e) {
      toastError("Could not delete", e);
    }
  }, [activeRecipe, deletingId, kindFilter, loadRecipes]);

  const handleSave = useCallback(
    async (patch: Partial<RecipeDetail>) => {
      if (!activeRecipe) return;
      try {
        await apiMethods.updateRecipe(
          activeRecipe.id,
          patch as Record<string, unknown>,
        );
        await loadRecipeDetail(activeRecipe.id);
        await loadRecipes(kindFilter);
        toastOk("Recipe saved");
      } catch (e) {
        toastError("Could not save", e);
      }
    },
    [activeRecipe, kindFilter, loadRecipeDetail, loadRecipes],
  );

  if (loading) {
    return (
      <div style={{ padding: "var(--space-4)" }}>
        <Skeleton kind="text" width="60%" />
        <Skeleton kind="text" width="80%" />
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-4)" }} data-route="recipes">
      <RecipesSurface
        recipes={recipes}
        activeRecipe={activeRecipe}
        kindFilter={kindFilter}
        onKindFilterChange={setKindFilter}
        onSelectRecipe={(id) => void loadRecipeDetail(id)}
        onCreateRecipe={() =>
          setCreating({
            open: true,
            kind: kindFilter === "all" ? "incense" : kindFilter,
          })
        }
        onDeleteRecipe={(id) => setDeletingId(id)}
        onSaveRecipe={(p) => void handleSave(p)}
      />

      <PromptDialog
        open={creating.open}
        title={`New ${creating.kind} recipe`}
        label="Name"
        placeholder="e.g. Sunrise Incense"
        confirmLabel="Create"
        validate={(v) => (v.trim().length < 1 ? "Name required." : null)}
        onSubmit={(v) => void handleCreateSubmit(v.trim())}
        onCancel={() => setCreating({ open: false, kind: creating.kind })}
      />
      <ConfirmDialog
        open={deletingId !== null}
        tone="destructive"
        title="Delete this recipe?"
        body="This action can't be undone."
        confirmLabel="Delete recipe"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
