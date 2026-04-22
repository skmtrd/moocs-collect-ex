use collect::{CourseKey, CourseSlug, Year};
use sqlx::Row;
use tauri::State;

use crate::state::{CollectState, DbState};

#[derive(Debug, thiserror::Error)]
pub enum RecordedLecturesError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}

impl serde::Serialize for RecordedLecturesError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordedLecture {
    pub year: u32,
    pub course_slug: String,
    pub slug: String,
    pub name: String,
    pub index: u32,
    pub group_name: String,
    pub group_index: u32,
}

#[tauri::command]
pub async fn get_recorded_lectures(
    year: u32,
    course_slug: String,
    collect_state: State<'_, CollectState>,
    db_state: State<'_, DbState>,
) -> Result<Vec<RecordedLecture>, RecordedLecturesError> {
    {
        let db_pool = db_state.0.read().await;
        if has_missing_lecture_groups(&db_pool, year, &course_slug).await? {
            drop(db_pool);
            sync_lecture_groups(&collect_state, &db_state, year, &course_slug).await?;
        }
    }

    let db_pool = db_state.0.read().await;
    let rows = sqlx::query(
        r#"
        SELECT
            courses.year AS year,
            courses.slug AS course_slug,
            lectures.slug AS lecture_slug,
            lectures.name AS lecture_name,
            lectures.sort_index AS lecture_index,
            lectures.group_name AS lecture_group_name,
            lectures.group_index AS lecture_group_index
        FROM lectures
        INNER JOIN courses ON courses.id = lectures.course_id
        WHERE courses.year = ? AND courses.slug = ?
        ORDER BY lectures.group_index ASC, lectures.sort_index ASC
        "#,
    )
    .bind(year as i64)
    .bind(&course_slug)
    .fetch_all(&*db_pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| RecordedLecture {
            year: row.get::<i64, _>("year") as u32,
            course_slug: row.get::<String, _>("course_slug"),
            slug: row.get::<String, _>("lecture_slug"),
            name: row.get::<String, _>("lecture_name"),
            index: row.get::<i64, _>("lecture_index") as u32,
            group_name: row.get::<String, _>("lecture_group_name"),
            group_index: row.get::<i64, _>("lecture_group_index") as u32,
        })
        .collect())
}

async fn has_missing_lecture_groups(
    pool: &sqlx::SqlitePool,
    year: u32,
    course_slug: &str,
) -> Result<bool, sqlx::Error> {
    let missing_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM lectures
        INNER JOIN courses ON courses.id = lectures.course_id
        WHERE courses.year = ? AND courses.slug = ? AND lectures.group_name = ''
        "#,
    )
    .bind(year as i64)
    .bind(course_slug)
    .fetch_one(pool)
    .await?;

    Ok(missing_count > 0)
}

async fn sync_lecture_groups(
    collect_state: &State<'_, CollectState>,
    db_state: &State<'_, DbState>,
    year: u32,
    course_slug: &str,
) -> Result<(), sqlx::Error> {
    let year = match Year::new(year) {
        Ok(year) => year,
        Err(err) => {
            log::warn!("Failed to build course year for lecture sync: {}", err);
            return Ok(());
        }
    };
    let course_slug_value = match CourseSlug::new(course_slug.to_string()) {
        Ok(course_slug_value) => course_slug_value,
        Err(err) => {
            log::warn!("Failed to build course slug for lecture sync: {}", err);
            return Ok(());
        }
    };
    let course_key = CourseKey::new(year, course_slug_value);
    let lecture_groups = match collect_state.collect.get_lecture_groups(&course_key).await {
        Ok(lecture_groups) => lecture_groups,
        Err(err) => {
            log::warn!("Failed to sync lecture groups for {}: {}", course_key, err);
            return Ok(());
        }
    };

    let db_pool = db_state.0.read().await;
    let Some(course_id) =
        sqlx::query_scalar::<_, i64>("SELECT id FROM courses WHERE year = ? AND slug = ?")
            .bind(course_key.year.value() as i64)
            .bind(course_key.slug.value())
            .fetch_optional(&*db_pool)
            .await?
    else {
        return Ok(());
    };

    let mut tx = db_pool.begin().await?;
    for group in lecture_groups {
        let group_name = group.display_name().to_string();
        let group_index = group.index as i64;

        for lecture in group.lectures {
            sqlx::query(
                "UPDATE lectures SET group_name = ?, group_index = ?, updated_at = unixepoch() WHERE course_id = ? AND slug = ?",
            )
            .bind(&group_name)
            .bind(group_index)
            .bind(course_id)
            .bind(lecture.key.slug.value())
            .execute(&mut *tx)
            .await?;
        }
    }
    tx.commit().await?;

    Ok(())
}
