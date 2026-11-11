"""Demo careers for the Career Navigator (flagged is_demo and labelled "Demo" in the UI).

General descriptions only: no salaries, admission rules, institutions or deadlines, which would need verified sources.
Run: python -m app.seed_careers
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Career

S = lambda name, *tags: {"name": name, "tags": list(tags)}  # noqa: E731

CAREERS = [
    {
        "slug": "ai-ml-engineer", "title": "AI / Machine Learning Engineer", "field": "Technology",
        "summary": "Builds and improves systems that learn from data, from recommendation engines to Bangla language tools.",
        "interests": ["ai", "machine learning", "python", "data science", "mathematics", "research"],
        "skills": [S("Python programming", "python", "programming", "python-fundamentals-college", "first-steps-coding-school"),
                   S("AI fundamentals", "ai_fundamentals", "ai-fundamentals-college", "what-is-ai-school"),
                   S("Machine learning", "machine_learning", "machine-learning-university"),
                   S("Deep learning", "deep_learning", "deep-learning-university"),
                   S("Maths & statistics", "data", "mathematics", "statistics", "math")],
        "education_paths": ["Bachelor's in Computer Science and Engineering (CSE)", "Bachelor's in Mathematics or Statistics, plus self-study in ML",
                            "Online courses and a portfolio of ML projects"],
        "course_slugs": ["python-fundamentals-college", "ai-fundamentals-college", "machine-learning-university", "deep-learning-university"],
        "opportunity_categories": ["ai_olympiad", "hackathon", "research", "internship"],
        "description_md": "## What they do\n- Prepare data and train models\n- Measure how well models work and fix mistakes\n"
                          "- Put models into apps people use\n\n## A day might include\nCleaning a dataset, running experiments in a "
                          "notebook, and discussing results with a team.\n\n## Why it matters in Bangladesh\nAI can help with Bangla "
                          "language technology, agriculture, health and education.",
    },
    {
        "slug": "data-analyst", "title": "Data Analyst", "field": "Technology & Business",
        "summary": "Turns numbers into answers that help organisations decide what to do next.",
        "interests": ["data science", "mathematics", "python", "entrepreneurship"],
        "skills": [S("Spreadsheets & data cleaning", "data", "excel", "spreadsheet"), S("Python for data", "python", "programming"),
                   S("Statistics", "data", "statistics", "mathematics"), S("Data visualisation", "visualisation", "visualization", "dashboard"),
                   S("Clear communication", "presentation", "debate", "leadership")],
        "education_paths": ["Bachelor's in Statistics, Economics, CSE or Business", "Short courses in data analysis plus a project portfolio"],
        "course_slugs": ["python-fundamentals-college", "machine-learning-university"],
        "opportunity_categories": ["internship", "hackathon", "national_competition"],
        "description_md": "## What they do\n- Collect and clean data\n- Find patterns and trends\n- Build charts and reports for decisions",
    },
    {
        "slug": "software-developer", "title": "Software Developer", "field": "Technology",
        "summary": "Designs, writes and tests the apps and websites people use every day.",
        "interests": ["web development", "python", "competitions", "entrepreneurship"],
        "skills": [S("Programming basics", "programming", "python", "first-steps-coding-school", "python-fundamentals-college"),
                   S("Problem solving", "programming", "competitive programming", "olympiad"), S("Web development", "web", "html", "javascript"),
                   S("Version control (Git)", "git", "github"), S("Teamwork", "leadership", "volunteering", "team")],
        "education_paths": ["Bachelor's in CSE or Software Engineering", "Diploma in Computer Technology", "Self-taught with a strong project portfolio"],
        "course_slugs": ["first-steps-coding-school", "python-fundamentals-college"],
        "opportunity_categories": ["hackathon", "national_competition", "international_competition", "internship"],
        "description_md": "## What they do\n- Turn ideas into working software\n- Fix bugs and improve performance\n- Work in teams with designers and testers",
    },
    {
        "slug": "robotics-engineer", "title": "Robotics Engineer", "field": "Engineering",
        "summary": "Builds machines that sense, think and move: from factory robots to rescue drones.",
        "interests": ["robotics", "mathematics", "ai", "competitions"],
        "skills": [S("Programming", "programming", "python"), S("Electronics & sensors", "electronics", "arduino", "robotics"),
                   S("Maths & physics", "mathematics", "physics", "math"), S("AI fundamentals", "ai_fundamentals", "what-is-ai-school"),
                   S("Building & testing prototypes", "robotics", "project", "olympiad")],
        "education_paths": ["Bachelor's in EEE, Mechatronics or Mechanical Engineering", "Diploma in Engineering, plus robotics clubs and competitions"],
        "course_slugs": ["what-is-ai-school", "first-steps-coding-school", "python-fundamentals-college", "ai-fundamentals-college"],
        "opportunity_categories": ["national_competition", "international_competition", "ai_olympiad"],
        "description_md": "## What they do\n- Design robot parts and circuits\n- Program robots to sense and act\n- Test robots safely in the real world",
    },
    {
        "slug": "ux-designer", "title": "UX / Product Designer", "field": "Design",
        "summary": "Makes apps and services easy and pleasant to use by understanding people first.",
        "interests": ["design", "web development", "research", "culture"],
        "skills": [S("User research", "research", "survey", "interview"), S("Visual design", "design", "art", "drawing"),
                   S("Prototyping", "figma", "prototype", "design"), S("Basic web knowledge", "web", "html", "programming"),
                   S("Communication", "presentation", "debate", "cultural")],
        "education_paths": ["Bachelor's in Fine Arts, Architecture or CSE with design projects", "Design courses plus a portfolio of case studies"],
        "course_slugs": ["what-is-ai-school", "first-steps-coding-school"],
        "opportunity_categories": ["hackathon", "cultural", "internship"],
        "description_md": "## What they do\n- Talk to users about their needs\n- Sketch and test ideas quickly\n- Work with developers to build the final design",
    },
    {
        "slug": "cybersecurity-analyst", "title": "Cybersecurity Analyst", "field": "Technology",
        "summary": "Protects people and organisations from hackers, scams and data leaks.",
        "interests": ["python", "competitions", "web development", "mathematics"],
        "skills": [S("Networking basics", "network", "networking"), S("Programming & scripting", "programming", "python"),
                   S("Security fundamentals", "security", "cyber", "ctf"), S("Careful problem solving", "olympiad", "competitive programming", "ctf"),
                   S("Responsible AI & ethics", "ethics")],
        "education_paths": ["Bachelor's in CSE", "Security certifications and capture-the-flag (CTF) practice"],
        "course_slugs": ["first-steps-coding-school", "python-fundamentals-college"],
        "opportunity_categories": ["hackathon", "national_competition", "international_competition"],
        "description_md": "## What they do\n- Watch systems for attacks\n- Find and fix weaknesses before attackers do\n- Teach others to stay safe online",
    },
    {
        "slug": "ai-researcher", "title": "AI Researcher", "field": "Research & Academia",
        "summary": "Asks new questions about intelligence and machines, and publishes answers others can build on.",
        "interests": ["research", "ai", "mathematics", "machine learning", "study abroad"],
        "skills": [S("Mathematics", "mathematics", "data", "statistics"), S("Machine learning", "machine_learning", "machine-learning-university"),
                   S("Deep learning", "deep_learning", "deep-learning-university"), S("Scientific writing", "research", "paper", "writing"),
                   S("Python programming", "python", "programming")],
        "education_paths": ["Bachelor's in CSE, Mathematics or Physics", "Master's and PhD (often with scholarships at home or abroad)"],
        "course_slugs": ["ai-fundamentals-college", "machine-learning-university", "deep-learning-university"],
        "opportunity_categories": ["research", "study_abroad", "merit_scholarship", "ai_olympiad"],
        "description_md": "## What they do\n- Read and run experiments on new ideas\n- Write papers and share code\n- Teach and mentor students",
    },
    {
        "slug": "digital-entrepreneur", "title": "Tech Entrepreneur", "field": "Business",
        "summary": "Starts a business that uses technology to solve a real local problem.",
        "interests": ["entrepreneurship", "design", "web development", "ai"],
        "skills": [S("Understanding customers", "research", "survey", "entrepreneurship"), S("Basic programming", "programming", "python"),
                   S("AI awareness", "ai_fundamentals", "what-is-ai-school", "ai-fundamentals-college"),
                   S("Leadership & teamwork", "leadership", "volunteering"), S("Pitching ideas", "presentation", "debate", "competition")],
        "education_paths": ["Any degree; Business (BBA) or CSE are common", "Startup competitions, incubators and mentors"],
        "course_slugs": ["what-is-ai-school", "ai-fundamentals-college", "python-fundamentals-college"],
        "opportunity_categories": ["national_competition", "hackathon", "financial_assistance"],
        "description_md": "## What they do\n- Find a problem worth solving\n- Build a simple first version and test it\n- Grow a team and a business",
    },
]


def seed_careers(db: Session) -> int:
    added = 0
    for i, c in enumerate(CAREERS):
        if db.scalar(select(Career.id).where(Career.slug == c["slug"])):
            continue
        db.add(Career(**c, is_published=True, is_demo=True, order_index=i))
        added += 1
    db.commit()
    return added


if __name__ == "__main__":
    from app.db.session import SessionLocal

    with SessionLocal() as s:
        print(f"Added {seed_careers(s)} demo careers")
