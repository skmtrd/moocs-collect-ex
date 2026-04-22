use sqlx::Row;
use tauri::State;

use crate::state::DbState;

#[derive(Debug, thiserror::Error)]
pub enum RecordedPagesError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}

impl serde::Serialize for RecordedPagesError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordedPage {
    pub year: u32,
    pub course_slug: String,
    pub lecture_slug: String,
    pub slug: String,
    pub name: String,
    pub key: String,
    pub index: u32,
    pub slide_count: u32,
    pub has_content: bool,
}

#[tauri::command]
pub async fn get_recorded_pages(
    year: u32,
    course_slug: String,
    lecture_slug: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<RecordedPage>, RecordedPagesError> {
    let db_pool = db_state.0.read().await;
    let rows = sqlx::query(
        r#"
        SELECT
            courses.year AS year,
            courses.slug AS course_slug,
            lectures.slug AS lecture_slug,
            pages.slug AS page_slug,
            pages.name AS page_name,
            pages.key AS page_key,
            pages.sort_index AS page_index,
            COUNT(slides.id) AS slide_count,
            CASE
                WHEN pages.content_html != '' OR pages.content_text != '' THEN 1
                ELSE 0
            END AS has_content
        FROM pages
        INNER JOIN lectures ON lectures.id = pages.lecture_id
        INNER JOIN courses ON courses.id = lectures.course_id
        LEFT JOIN slides ON slides.page_id = pages.id
        WHERE courses.year = ? AND courses.slug = ? AND lectures.slug = ?
        GROUP BY pages.id
        ORDER BY pages.sort_index ASC
        "#,
    )
    .bind(year as i64)
    .bind(&course_slug)
    .bind(&lecture_slug)
    .fetch_all(&*db_pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| RecordedPage {
            year: row.get::<i64, _>("year") as u32,
            course_slug: row.get::<String, _>("course_slug"),
            lecture_slug: row.get::<String, _>("lecture_slug"),
            slug: row.get::<String, _>("page_slug"),
            name: row.get::<String, _>("page_name"),
            key: row.get::<String, _>("page_key"),
            index: row.get::<i64, _>("page_index") as u32,
            slide_count: row.get::<i64, _>("slide_count") as u32,
            has_content: row.get::<i64, _>("has_content") != 0,
        })
        .collect())
}
