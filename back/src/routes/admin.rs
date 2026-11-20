use axum::{
    Json,
    extract::{Path, Query, State},
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{
    auth_user::AdminUser,
    errors::{AppError, ErrorBody},
    state::AppState,
};

const GRADES: &[&str] = &[
    "Consumer Grade",
    "Industrial Grade",
    "Mil-Spec",
    "Restricted",
    "Classified",
    "Covert",
    "Contraband",
];

const EXTERIORS: &[&str] = &["FN", "MW", "FT", "WW", "BS"];

#[derive(Deserialize, IntoParams)]
pub struct ItemQuery {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub search: Option<String>,
    pub grade: Option<String>,
}

#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct Item {
    pub id: Uuid,
    pub name: String,
    pub image_url: Option<String>,
    pub grade: Option<String>,
    pub exterior: Option<String>,
    pub stattrak: bool,
    pub value: i64,
    pub rarity: String,
}

#[derive(Serialize, ToSchema)]
pub struct ItemList {
    pub items: Vec<Item>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

#[utoipa::path(
    get,
    path = "/admin/items",
    tag = "admin",
    security(("session" = [])),
    params(ItemQuery),
    responses(
        (status = 200, body = ItemList),
        (status = 401, body = ErrorBody),
        (status = 403, body = ErrorBody)
    )
)]
pub async fn list(
    State(state): State<AppState>,
    _admin: AdminUser,
    Query(q): Query<ItemQuery>,
) -> Result<Json<ItemList>, AppError> {
    let page = q.page.unwrap_or(1).max(1);
    let per_page = q.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * per_page;

    if let Some(grade) = &q.grade
        && !GRADES.contains(&grade.as_str())
    {
        return Err(AppError::BadRequest("Grade invalide".into()));
    }

    let search = q.search.unwrap_or_default();
    let items = sqlx::query_as::<_, Item>(
        r#"SELECT id, name, image_url, grade, exterior, stattrak,
                  value, rarity::text AS rarity
           FROM items
           WHERE name ILIKE '%' || $1 || '%'
             AND ($2::text IS NULL OR grade = $2)
           ORDER BY name
           LIMIT $3 OFFSET $4"#,
    )
    .bind(&search)
    .bind(&q.grade)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*)
           FROM items
           WHERE name ILIKE '%' || $1 || '%'
             AND ($2::text IS NULL OR grade = $2)"#,
    )
    .bind(&search)
    .bind(&q.grade)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(ItemList {
        items,
        total,
        page,
        per_page,
    }))
}

#[derive(Deserialize, ToSchema)]
pub struct ItemInput {
    pub name: String,
    pub image_url: Option<String>,
    pub grade: String,
    pub exterior: Option<String>,
    pub stattrak: bool,
    pub value: i64,
    pub rarity: String,
}

fn validate(input: &ItemInput) -> Result<(), AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("Le nom est obligatoire".into()));
    }
    if !GRADES.contains(&input.grade.as_str()) {
        return Err(AppError::BadRequest("Grade invalide".into()));
    }
    if input
        .exterior
        .as_ref()
        .is_some_and(|e| !EXTERIORS.contains(&e.as_str()))
    {
        return Err(AppError::BadRequest("Usure invalide".into()));
    }
    if input.value < 0 {
        return Err(AppError::BadRequest(
            "La valeur doit être positive ou nulle".into(),
        ));
    }
    if !["common", "rare", "epic", "legendary", "mythic"].contains(&input.rarity.as_str()) {
        return Err(AppError::BadRequest("Rareté invalide".into()));
    }
    Ok(())
}

#[utoipa::path(
    post,
    path = "/admin/items",
    tag = "admin",
    security(("session" = [])),
    request_body = ItemInput,
    responses(
        (status = 201, body = Item),
        (status = 400, body = ErrorBody),
        (status = 401, body = ErrorBody),
        (status = 403, body = ErrorBody)
    )
)]
pub async fn create(
    State(state): State<AppState>,
    _admin: AdminUser,
    Json(input): Json<ItemInput>,
) -> Result<(axum::http::StatusCode, Json<Item>), AppError> {
    validate(&input)?;

    let item = sqlx::query_as::<_, Item>(
        r#"INSERT INTO items (name, image_url, grade, exterior, stattrak, value, rarity)
           VALUES ($1, $2, $3, $4, $5, $6, $7::text::item_rarity)
           RETURNING id, name, image_url, grade, exterior, stattrak,
                     value, rarity::text AS rarity"#,
    )
    .bind(input.name.trim())
    .bind(&input.image_url)
    .bind(&input.grade)
    .bind(&input.exterior)
    .bind(input.stattrak)
    .bind(input.value)
    .bind(&input.rarity)
    .fetch_one(&state.pool)
    .await?;

    Ok((axum::http::StatusCode::CREATED, Json(item)))
}

#[utoipa::path(
    put,
    path = "/admin/items/{id}",
    tag = "admin",
    security(("session" = [])),
    params(("id" = Uuid, Path)),
    request_body = ItemInput,
    responses(
        (status = 200, body = Item),
        (status = 400, body = ErrorBody),
        (status = 404, body = ErrorBody),
        (status = 401, body = ErrorBody),
        (status = 403, body = ErrorBody)
    )
)]
pub async fn update(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(id): Path<Uuid>,
    Json(input): Json<ItemInput>,
) -> Result<Json<Item>, AppError> {
    validate(&input)?;

    let item = sqlx::query_as::<_, Item>(
        r#"UPDATE items
           SET name = $1, image_url = $2, grade = $3, exterior = $4,
               stattrak = $5, value = $6, rarity = $7::text::item_rarity
           WHERE id = $8
           RETURNING id, name, image_url, grade, exterior, stattrak,
                     value, rarity::text AS rarity"#,
    )
    .bind(input.name.trim())
    .bind(&input.image_url)
    .bind(&input.grade)
    .bind(&input.exterior)
    .bind(input.stattrak)
    .bind(input.value)
    .bind(&input.rarity)
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Objet introuvable".into()))?;

    Ok(Json(item))
}
