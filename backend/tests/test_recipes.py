"""Recipes router tests — b108-2gy."""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import recipes as recipes_module
from theourgia.api.routers.v1.recipes import (
    IngredientIn,
    RecipeCreate,
    RecipeRead,
    RecipeUpdate,
    StepIn,
)


def test_recipe_kinds_are_five() -> None:
    from theourgia.models.recipe import RecipeKind

    assert set(RecipeKind) == {
        RecipeKind.INCENSE,
        RecipeKind.OIL,
        RecipeKind.WASH,
        RecipeKind.PHILTRE,
        RecipeKind.OTHER,
    }


def test_recipe_create_default_visibility_is_personal() -> None:
    r = RecipeCreate(kind="incense", name="Jupiter blend")
    assert r.visibility == "personal"
    assert r.ingredients == []
    assert r.correspondences == {}


def test_recipe_ingredients_can_have_amounts_and_notes() -> None:
    r = RecipeCreate(
        kind="oil",
        name="Venus oil",
        ingredients=[
            IngredientIn(name="rose petals", amount="3 tbsp"),
            IngredientIn(name="jojoba", amount="30 ml", notes="carrier"),
        ],
    )
    assert len(r.ingredients) == 2
    assert r.ingredients[1].notes == "carrier"


def test_recipe_steps_can_have_timing() -> None:
    r = RecipeCreate(
        kind="incense",
        name="Solar suffumigation",
        steps=[
            StepIn(text="grind resins to powder"),
            StepIn(text="steep in wine", duration_minutes=180),
        ],
    )
    assert r.steps[1].duration_minutes == 180


def test_recipe_update_allows_partial() -> None:
    u = RecipeUpdate(name="renamed")
    assert u.name == "renamed"
    assert u.description is None
    assert u.ingredients is None


def test_recipe_read_fields() -> None:
    fields = set(RecipeRead.model_fields.keys())
    for f in (
        "id", "kind", "name", "description", "ingredients",
        "steps", "correspondences", "library_source_ids",
        "entity_ids", "visibility",
    ):
        assert f in fields


def test_router_paths_present() -> None:
    paths_methods = {
        (r.path, m)
        for r in recipes_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/recipes", "GET") in paths_methods
    assert ("/recipes", "POST") in paths_methods
    assert ("/recipes/{recipe_id}", "GET") in paths_methods
    assert ("/recipes/{recipe_id}", "PATCH") in paths_methods
    assert ("/recipes/{recipe_id}", "DELETE") in paths_methods


def test_every_route_requires_auth() -> None:
    for r in recipes_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        names = {getattr(d.call, "__name__", "") for d in r.dependant.dependencies}
        assert "get_current_user" in names, (
            f"{r.path} {r.methods} missing get_current_user"
        )
