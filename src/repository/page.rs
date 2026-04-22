use crate::cache::Cache;
use crate::domain::{
    models::{LectureKey, LecturePage, LecturePageContent, MoocsUrl, PageKey, UrlBuilder},
    repository::PageRepository,
};
use crate::error::Result;
use crate::utils::{extract_element_attribute, parse_selector};
use async_trait::async_trait;
use reqwest::Client;
use scraper::Html;
use std::sync::Arc;
use std::time::Duration;

pub struct PageRepositoryImpl {
    client: Arc<Client>,
    url_builder: UrlBuilder,
    page_cache: Cache<LectureKey, Vec<LecturePage>>,
    page_content_cache: Cache<PageKey, LecturePageContent>,
}

impl PageRepositoryImpl {
    pub fn new(client: Arc<Client>) -> Self {
        Self {
            client,
            url_builder: UrlBuilder::default(),
            page_cache: Cache::new(Duration::from_secs(600)), // 10 minutes
            page_content_cache: Cache::new(Duration::from_secs(600)), // 10 minutes
        }
    }

    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        self.url_builder = UrlBuilder::new(base_url);
        self
    }

    async fn fetch_lecture_page(&self, lecture_key: &LectureKey) -> Result<(String, String)> {
        let url = self.url_builder.lecture_url(
            lecture_key.course_key.year.clone(),
            lecture_key.course_key.slug.clone(),
            lecture_key.slug.clone(),
        );

        let response = self.client.get(&url).send().await.map_err(|e| {
            crate::error::CollectError::network("Failed to fetch lecture page", Some(e))
        })?;

        let final_url = response.url().to_string();
        let html = response.text().await.map_err(|e| {
            crate::error::CollectError::network("Failed to read response body", Some(e))
        })?;

        Ok((final_url, html))
    }

    async fn fetch_page_html(&self, page_key: &PageKey) -> Result<String> {
        let url = self.url_builder.page_url(
            page_key.lecture_key.course_key.year.clone(),
            page_key.lecture_key.course_key.slug.clone(),
            page_key.lecture_key.slug.clone(),
            page_key.slug.clone(),
        );

        let response = self.client.get(&url).send().await.map_err(|e| {
            crate::error::CollectError::network("Failed to fetch page content", Some(e))
        })?;

        response.text().await.map_err(|e| {
            crate::error::CollectError::network("Failed to read response body", Some(e))
        })
    }

    fn scrape_pages(
        &self,
        html: &str,
        current_url: &str,
        lecture_key: &LectureKey,
    ) -> Result<Vec<LecturePage>> {
        let document = Html::parse_document(html);
        let pagination_selector = parse_selector("ul.pagination li")?;

        let pagination_items: Vec<_> = document.select(&pagination_selector).collect();

        if pagination_items.len() <= 2 {
            return Ok(vec![]);
        }

        let current_page_key = self.parse_page_key_from_url(current_url, lecture_key)?;
        let mut pages = Vec::new();

        for (index, li) in pagination_items[1..pagination_items.len() - 1]
            .iter()
            .enumerate()
        {
            let page = self.extract_page_from_element(li, lecture_key, &current_page_key, index)?;
            pages.push(page);
        }

        Ok(pages)
    }

    fn extract_page_from_element(
        &self,
        element: &scraper::ElementRef,
        lecture_key: &LectureKey,
        current_page_key: &PageKey,
        index: usize,
    ) -> Result<LecturePage> {
        let title = extract_element_attribute(element, "a", "title")?;
        let href = extract_element_attribute(element, "a", "href")?;

        let page_key = if href == "#" {
            current_page_key.clone()
        } else {
            self.parse_page_key_from_url(&href, lecture_key)?
        };

        let page = LecturePage::new(page_key, title, index);
        Ok(page)
    }

    fn parse_page_key_from_url(&self, url: &str, lecture_key: &LectureKey) -> Result<PageKey> {
        let full_url = if url.starts_with("http") {
            url.to_string()
        } else {
            format!("{}{}", self.url_builder.base_url(), url)
        };

        let moocs_url = MoocsUrl::parse_moocs_url(&full_url)?;
        match moocs_url {
            MoocsUrl::Page { page_key } => {
                if page_key.lecture_key == *lecture_key {
                    Ok(page_key)
                } else {
                    Err(crate::error::CollectError::parse(
                        "Page lecture key mismatch",
                        Some(format!(
                            "Expected: {}, Found: {}",
                            lecture_key, page_key.lecture_key
                        )),
                    ))
                }
            }
            _ => Err(crate::error::CollectError::parse(
                "URL is not a page URL",
                Some(url.to_string()),
            )),
        }
    }

    fn scrape_page_content(&self, html: &str, page_key: &PageKey) -> Result<LecturePageContent> {
        let document = Html::parse_document(html);
        let content_selector = parse_selector("div.markdown-block.mathjax-process")?;

        let mut body_html = Vec::new();
        let mut body_text = Vec::new();

        for block in document.select(&content_selector) {
            body_html.push(block.html());

            let text = self.normalize_block_text(&block.text().collect::<Vec<_>>().join(" "));

            if !text.is_empty() {
                body_text.push(text);
            }
        }

        Ok(LecturePageContent::new(
            page_key.clone(),
            body_html.join("\n"),
            body_text.join("\n\n"),
        ))
    }

    fn normalize_block_text(&self, text: &str) -> String {
        text.split_whitespace().collect::<Vec<_>>().join(" ")
    }
}

#[async_trait]
impl PageRepository for PageRepositoryImpl {
    async fn fetch_pages(&self, lecture_key: &LectureKey) -> Result<Vec<LecturePage>> {
        // Check cache first
        if let Some(cached_pages) = self.page_cache.get(lecture_key) {
            return Ok(cached_pages);
        }

        // Cache miss - fetch from API
        let (current_url, html) = self.fetch_lecture_page(lecture_key).await?;
        let pages = self.scrape_pages(&html, &current_url, lecture_key)?;

        // Cache the result
        self.page_cache.insert(lecture_key.clone(), pages.clone());

        Ok(pages)
    }

    async fn fetch_page(&self, page_key: &PageKey) -> Result<Option<LecturePage>> {
        let pages = self.fetch_pages(&page_key.lecture_key).await?;
        Ok(pages.into_iter().find(|page| page.key == *page_key))
    }

    async fn fetch_page_content(&self, page_key: &PageKey) -> Result<LecturePageContent> {
        if let Some(cached_content) = self.page_content_cache.get(page_key) {
            return Ok(cached_content);
        }

        let html = self.fetch_page_html(page_key).await?;
        let page_content = self.scrape_page_content(&html, page_key)?;

        self.page_content_cache
            .insert(page_key.clone(), page_content.clone());

        Ok(page_content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::models::{CourseKey, CourseSlug, LectureKey, LectureSlug, PageSlug, Year};

    fn build_page_key() -> PageKey {
        let lecture_key = LectureKey::new(
            CourseKey::new(Year::new(2026).unwrap(), CourseSlug::new("cot201").unwrap()),
            LectureSlug::new("cs3-01").unwrap(),
        );

        PageKey::new(lecture_key, PageSlug::new("02").unwrap())
    }

    #[test]
    fn scrape_page_content_extracts_markdown_block_html_and_text() {
        let repository = PageRepositoryImpl::new(Arc::new(Client::new()));
        let page_key = build_page_key();
        let html = r#"
            <section class="content container-fluid">
                <div class="pad-block">
                    <div class="embed-responsive require-3pc embed-responsive-16by9-gslide">
                        <iframe src="https://docs.google.com/presentation/d/e/test/pubembed?start=false"></iframe>
                    </div>
                </div>
                <div class="pad-block">
                    <div class="markdown-block mathjax-process">
                        <p>Society 5.0 - 科学技術政策 - 内閣府</p>
                        <a href="https://www8.cao.go.jp/cstp/society5_0/">https://www8.cao.go.jp/cstp/society5_0/</a>
                    </div>
                </div>
            </section>
        "#;

        let content = repository.scrape_page_content(html, &page_key).unwrap();

        assert_eq!(content.page_key, page_key);
        assert!(content.body_html.contains("markdown-block mathjax-process"));
        assert!(content.body_html.contains("Society 5.0"));
        assert!(content
            .body_text
            .contains("Society 5.0 - 科学技術政策 - 内閣府"));
        assert!(content
            .body_text
            .contains("https://www8.cao.go.jp/cstp/society5_0/"));
        assert!(!content.is_empty());
    }

    #[test]
    fn scrape_page_content_returns_empty_when_markdown_block_is_missing() {
        let repository = PageRepositoryImpl::new(Arc::new(Client::new()));
        let page_key = build_page_key();
        let html = r#"
            <section class="content container-fluid">
                <div class="pad-block">
                    <div class="embed-responsive require-3pc embed-responsive-16by9-gslide">
                        <iframe src="https://docs.google.com/presentation/d/e/test/pubembed?start=false"></iframe>
                    </div>
                </div>
            </section>
        "#;

        let content = repository.scrape_page_content(html, &page_key).unwrap();

        assert!(content.body_html.is_empty());
        assert!(content.body_text.is_empty());
        assert!(content.is_empty());
    }
}
