use collect::{
    Collect, CourseKey, CourseSlug, Credentials, LectureKey, LectureSlug, PageKey, PageSlug, Year,
};
use std::env;
use std::error::Error;

fn usage(program: &str) -> ! {
    eprintln!(
        "usage: {program} <year> <course_slug> <lecture_slug> <page_slug>\n\
         requires env: MOOCS_USERNAME, MOOCS_PASSWORD"
    );
    std::process::exit(2);
}

fn required_env(name: &str) -> Result<String, Box<dyn Error>> {
    env::var(name).map_err(|_| format!("missing environment variable: {name}").into())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() != 5 {
        usage(&args[0]);
    }

    let year = Year::new(args[1].parse()?)?;
    let course_key = CourseKey::new(year, CourseSlug::new(&args[2])?);
    let lecture_key = LectureKey::new(course_key, LectureSlug::new(&args[3])?);
    let page_key = PageKey::new(lecture_key, PageSlug::new(&args[4])?);

    let credentials = Credentials {
        username: required_env("MOOCS_USERNAME")?,
        password: required_env("MOOCS_PASSWORD")?,
    };

    let collect = Collect::default();
    collect.authenticate(&credentials).await?;

    let page = collect.get_page_info(&page_key).await?;
    let slides = collect.get_slides(&page_key).await?;
    let content = collect.get_page_content(&page_key).await?;

    println!("page_key: {}", page.key);
    println!("page_name: {}", page.display_name());
    println!("slide_count: {}", slides.len());
    println!("body_html_bytes: {}", content.body_html.len());
    println!("body_text_chars: {}", content.body_text.chars().count());
    println!("body_text:");

    if content.is_empty() {
        println!("<empty>");
    } else {
        println!("{}", content.body_text);
    }

    Ok(())
}
