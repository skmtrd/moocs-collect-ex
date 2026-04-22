use sqlx::Row;
use tauri::State;

use crate::state::DbState;

#[derive(Debug, thiserror::Error)]
pub enum RecordedPageError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Page not found")]
    NotFound,
}

impl serde::Serialize for RecordedPageError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordedSlide {
    pub index: u32,
    pub pdf_path: String,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordedPageDetail {
    pub year: u32,
    pub course_slug: String,
    pub course_name: String,
    pub lecture_slug: String,
    pub lecture_name: String,
    pub page_slug: String,
    pub page_name: String,
    pub page_key: String,
    pub content_html: String,
    pub content_text: String,
    pub slides: Vec<RecordedSlide>,
}

#[tauri::command]
pub async fn get_recorded_page(
    year: u32,
    course_slug: String,
    lecture_slug: String,
    page_slug: String,
    db_state: State<'_, DbState>,
) -> Result<RecordedPageDetail, RecordedPageError> {
    let db_pool = db_state.0.read().await;
    let row = sqlx::query(
        r#"
        SELECT
            pages.id AS page_id,
            courses.year AS course_year,
            courses.slug AS course_slug,
            courses.name AS course_name,
            lectures.slug AS lecture_slug,
            lectures.name AS lecture_name,
            pages.slug AS page_slug,
            pages.name AS page_name,
            pages.key AS page_key,
            pages.content_html AS content_html,
            pages.content_text AS content_text
        FROM pages
        INNER JOIN lectures ON lectures.id = pages.lecture_id
        INNER JOIN courses ON courses.id = lectures.course_id
        WHERE courses.year = ? AND courses.slug = ? AND lectures.slug = ? AND pages.slug = ?
        "#,
    )
    .bind(year as i64)
    .bind(&course_slug)
    .bind(&lecture_slug)
    .bind(&page_slug)
    .fetch_optional(&*db_pool)
    .await?;

    let row = row.ok_or(RecordedPageError::NotFound)?;
    let page_id = row.get::<i64, _>("page_id");

    let slides = sqlx::query(
        r#"
        SELECT idx, pdf_path
        FROM slides
        WHERE page_id = ? AND pdf_path IS NOT NULL AND pdf_path != ''
        ORDER BY idx ASC
        "#,
    )
    .bind(page_id)
    .fetch_all(&*db_pool)
    .await?
    .into_iter()
    .map(|slide_row| RecordedSlide {
        index: slide_row.get::<i64, _>("idx") as u32,
        pdf_path: slide_row.get::<String, _>("pdf_path"),
    })
    .collect();

    Ok(RecordedPageDetail {
        year: row.get::<i64, _>("course_year") as u32,
        course_slug: row.get::<String, _>("course_slug"),
        course_name: row.get::<String, _>("course_name"),
        lecture_slug: row.get::<String, _>("lecture_slug"),
        lecture_name: row.get::<String, _>("lecture_name"),
        page_slug: row.get::<String, _>("page_slug"),
        page_name: row.get::<String, _>("page_name"),
        page_key: row.get::<String, _>("page_key"),
        content_html: row.get::<String, _>("content_html"),
        content_text: row.get::<String, _>("content_text"),
        slides,
    })
}
