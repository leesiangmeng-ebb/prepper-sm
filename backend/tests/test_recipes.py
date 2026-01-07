"""Tests for recipe endpoints."""

from fastapi.testclient import TestClient


def test_create_recipe(client: TestClient):
    """Test creating a new recipe."""
    response = client.post(
        "/api/v1/recipes",
        json={
            "name": "Chocolate Cake",
            "yield_quantity": 12,
            "yield_unit": "portion",
            "created_by":"234",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Chocolate Cake"
    assert data["yield_quantity"] == 12
    assert data["status"] == "draft"
    assert data["created_by"] == "234"


def test_update_recipe_status(client: TestClient):
    """Test updating recipe status."""
    # Create recipe
    create_response = client.post(
        "/api/v1/recipes",
        json={"name": "Test Recipe", "yield_quantity": 1, "yield_unit": "portion"},
    )
    recipe_id = create_response.json()["id"]

    # Update status
    response = client.patch(
        f"/api/v1/recipes/{recipe_id}/status",
        json={"status": "active"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "active"


def test_soft_delete_recipe(client: TestClient):
    """Test soft-deleting a recipe."""
    # Create recipe
    create_response = client.post(
        "/api/v1/recipes",
        json={"name": "To Delete", "yield_quantity": 1, "yield_unit": "portion"},
    )
    recipe_id = create_response.json()["id"]

    # Delete
    response = client.delete(f"/api/v1/recipes/{recipe_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "archived"


# ============ Fork Recipe Tests ============


def test_fork_recipe_basic(client: TestClient):
    """Test forking a recipe creates a copy with correct metadata."""
    # Create original recipe
    create_response = client.post(
        "/api/v1/recipes",
        json={
            "name": "Original Recipe",
            "yield_quantity": 4,
            "yield_unit": "servings",
            "owner_id": "user123",
        },
    )
    assert create_response.status_code == 201
    original = create_response.json()

    # Fork the recipe
    fork_response = client.post(f"/api/v1/recipes/{original['id']}/fork")
    assert fork_response.status_code == 201
    forked = fork_response.json()

    # Verify forked recipe has correct properties
    assert forked["name"] == "Original Recipe (Fork)"
    assert forked["yield_quantity"] == 4
    assert forked["yield_unit"] == "servings"
    assert forked["status"] == "draft"
    assert forked["is_public"] is False
    assert forked["id"] != original["id"]


def test_fork_recipe_with_new_owner(client: TestClient):
    """Test forking a recipe with a new owner ID."""
    # Create original recipe
    create_response = client.post(
        "/api/v1/recipes",
        json={
            "name": "Shared Recipe",
            "yield_quantity": 2,
            "yield_unit": "portion",
            "owner_id": "original_owner",
        },
    )
    original = create_response.json()

    # Fork with new owner
    fork_response = client.post(
        f"/api/v1/recipes/{original['id']}/fork",
        json={"new_owner_id": "new_owner"},
    )
    assert fork_response.status_code == 201
    forked = fork_response.json()

    assert forked["owner_id"] == "new_owner"
    assert forked["created_by"] == "new_owner"


def test_fork_recipe_copies_instructions(client: TestClient):
    """Test that forking copies raw and structured instructions."""
    # Create recipe
    create_response = client.post(
        "/api/v1/recipes",
        json={"name": "Recipe with Instructions", "yield_quantity": 1, "yield_unit": "batch"},
    )
    recipe_id = create_response.json()["id"]

    # Add raw instructions
    instructions_raw = "1. Mix ingredients\n2. Bake at 350F"
    client.post(
        f"/api/v1/recipes/{recipe_id}/instructions/raw",
        json={"instructions_raw": instructions_raw},
    )

    # Get updated recipe
    get_response = client.get(f"/api/v1/recipes/{recipe_id}")
    original = get_response.json()

    # Fork the recipe
    fork_response = client.post(f"/api/v1/recipes/{recipe_id}/fork")
    forked = fork_response.json()

    assert forked["instructions_raw"] == original["instructions_raw"]


def test_fork_recipe_copies_ingredients(client: TestClient):
    """Test that forking copies all recipe ingredients."""
    # Create an ingredient first
    ingredient_response = client.post(
        "/api/v1/ingredients",
        json={"name": "Flour", "base_unit": "g", "cost_per_base_unit": 0.002},
    )
    ingredient_id = ingredient_response.json()["id"]

    # Create recipe
    recipe_response = client.post(
        "/api/v1/recipes",
        json={"name": "Recipe with Ingredients", "yield_quantity": 1, "yield_unit": "loaf"},
    )
    recipe_id = recipe_response.json()["id"]

    # Add ingredient to recipe
    client.post(
        f"/api/v1/recipes/{recipe_id}/ingredients",
        json={"ingredient_id": ingredient_id, "quantity": 500, "unit": "g"},
    )

    # Get original recipe ingredients
    original_ingredients_response = client.get(f"/api/v1/recipes/{recipe_id}/ingredients")
    original_ingredients = original_ingredients_response.json()
    assert len(original_ingredients) == 1

    # Fork the recipe
    fork_response = client.post(f"/api/v1/recipes/{recipe_id}/fork")
    forked_id = fork_response.json()["id"]

    # Get forked recipe ingredients
    forked_ingredients_response = client.get(f"/api/v1/recipes/{forked_id}/ingredients")
    forked_ingredients = forked_ingredients_response.json()

    assert len(forked_ingredients) == 1
    assert forked_ingredients[0]["ingredient_id"] == ingredient_id
    assert forked_ingredients[0]["quantity"] == 500
    assert forked_ingredients[0]["unit"] == "g"
    assert forked_ingredients[0]["recipe_id"] == forked_id


def test_fork_recipe_not_found(client: TestClient):
    """Test forking a non-existent recipe returns 404."""
    response = client.post("/api/v1/recipes/99999/fork")
    assert response.status_code == 404
    assert response.json()["detail"] == "Recipe not found"


def test_fork_recipe_preserves_selling_price(client: TestClient):
    """Test that forking preserves the selling price estimate."""
    # Create recipe with selling price
    create_response = client.post(
        "/api/v1/recipes",
        json={"name": "Priced Recipe", "yield_quantity": 1, "yield_unit": "portion"},
    )
    recipe_id = create_response.json()["id"]

    # Update selling price
    client.patch(
        f"/api/v1/recipes/{recipe_id}",
        json={"selling_price_est": 25.50},
    )

    # Get updated recipe
    get_response = client.get(f"/api/v1/recipes/{recipe_id}")
    original = get_response.json()

    # Fork the recipe
    fork_response = client.post(f"/api/v1/recipes/{recipe_id}/fork")
    forked = fork_response.json()

    assert forked["selling_price_est"] == original["selling_price_est"]


def test_fork_recipe_multiple_ingredients_preserves_order(client: TestClient):
    """Test that forking preserves ingredient sort order."""
    # Create ingredients
    ing1 = client.post(
        "/api/v1/ingredients",
        json={"name": "Ingredient A", "base_unit": "g", "cost_per_base_unit": 0.01},
    ).json()
    ing2 = client.post(
        "/api/v1/ingredients",
        json={"name": "Ingredient B", "base_unit": "ml", "cost_per_base_unit": 0.02},
    ).json()
    ing3 = client.post(
        "/api/v1/ingredients",
        json={"name": "Ingredient C", "base_unit": "g", "cost_per_base_unit": 0.03},
    ).json()

    # Create recipe
    recipe = client.post(
        "/api/v1/recipes",
        json={"name": "Multi-ingredient Recipe", "yield_quantity": 1, "yield_unit": "batch"},
    ).json()

    # Add ingredients in order
    client.post(
        f"/api/v1/recipes/{recipe['id']}/ingredients",
        json={"ingredient_id": ing1["id"], "quantity": 100, "unit": "g"},
    )
    client.post(
        f"/api/v1/recipes/{recipe['id']}/ingredients",
        json={"ingredient_id": ing2["id"], "quantity": 200, "unit": "ml"},
    )
    client.post(
        f"/api/v1/recipes/{recipe['id']}/ingredients",
        json={"ingredient_id": ing3["id"], "quantity": 50, "unit": "g"},
    )

    # Fork the recipe
    forked = client.post(f"/api/v1/recipes/{recipe['id']}/fork").json()

    # Get forked ingredients
    forked_ingredients = client.get(f"/api/v1/recipes/{forked['id']}/ingredients").json()

    # Verify order is preserved
    assert len(forked_ingredients) == 3
    assert forked_ingredients[0]["ingredient_id"] == ing1["id"]
    assert forked_ingredients[1]["ingredient_id"] == ing2["id"]
    assert forked_ingredients[2]["ingredient_id"] == ing3["id"]
