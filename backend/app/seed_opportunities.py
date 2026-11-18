"""Opportunities checked against their official pages, seeded as verified.

Every entry here was read on its official page on the date in `CHECKED`, and its `source_note` says what the page
showed. Only facts stated on those pages are used; dates that were not announced are left as `deadline=None`
(rolling / not announced) and the description says so. Re-check before each academic cycle: admins can edit these in
the Opportunity Hub admin, and any edit sends them back to review.

Seeding is idempotent and never overwrites an admin's edits: an entry is only created if no opportunity with the same
official URL exists.
"""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Opportunity
from app.models.enums import OpportunityCategory as C
from app.models.enums import VerificationStatus

CHECKED = datetime(2026, 11, 19, tzinfo=UTC)

OPPORTUNITIES: list[dict] = [
    {
        "title": "Bangladesh Mathematical Olympiad: Ganit Utsav 2027",
        "category": C.national_competition, "provider": "Bangladesh Mathematical Olympiad Committee",
        "description": "The national maths olympiad for school and college students. Registration for Ganit Utsav 2027 is "
                       "open on the official site. The festival season usually runs from December to February, with "
                       "regional rounds leading to the national round and selection for the International Mathematical "
                       "Olympiad. Check the site for your regional venue and dates.",
        "eligibility": "School and college students up to Class XII.",
        "education_levels": ["school", "college"],
        "official_url": "https://matholympiad.org.bd/register",
        "tags": ["maths", "mathematics", "logic", "algorithms"],
        "source_note": "matholympiad.org.bd/home, checked 2026-11-19: banner says Ganit Utsav 2027 registration has "
                       "started; eligibility up to Class XII. No closing date stated.",
    },
    {
        "title": "Bangladesh AI Olympiad 2027 (route to IOAI 2027, Singapore)",
        "category": C.ai_olympiad, "provider": "Bangladesh Open Source Network (BdOSN)",
        "description": "The national AI olympiad, run by BdOSN with IIT, University of Dhaka as knowledge partner. It "
                       "selects Bangladesh's teams for the International Olympiad in AI (IOAI 2027, Singapore, 4–10 July "
                       "2027) and the International AI Olympiad. The official site says registration for the 2027 cycle "
                       "opens soon, with an IOAI selection round planned for March 2027 (tentative). The AI Quiz is free.",
        "eligibility": "Students from Class 6 to Class 12 or equivalent, all streams including madrasa, and polytechnic "
                       "students up to the 4th semester.",
        "education_levels": ["school", "college"],
        "official_url": "https://bdaio.org/olympiad/participate",
        "tags": ["ai-basics", "ai-fundamentals", "machine-learning", "python"],
        "source_note": "bdaio.org, checked 2026-11-19: 'Registration for the 2027 cycle opens soon'; eligibility Class 6–12; "
                       "AI Quiz free; season dates marked tentative. ioai-official.org: IOAI 2027 in Singapore, 4–10 July 2027.",
    },
    {
        "title": "Google Summer of Code (open-source contributor programme)",
        "category": C.internship, "provider": "Google",
        "description": "A paid, remote programme where new contributors spend the summer working on an open-source project "
                       "with mentors from the project. Dates for 2027 have not been announced yet. In 2026, contributor "
                       "applications ran from 16 to 31 March, after organisations were announced. Start now by choosing "
                       "an organisation and making small contributions to its code.",
        "eligibility": "See the official rules for age and open-source experience requirements before applying.",
        "education_levels": ["university"],
        "official_url": "https://summerofcode.withgoogle.com/",
        "tags": ["python", "programming", "open-source", "git"],
        "source_note": "developers.google.com/open-source/gsoc/timeline, checked 2026-11-19: only the 2026 timeline is "
                       "published (contributor applications 16–31 March 2026); page notes the timeline shifts each year.",
    },
    {
        "title": "Erasmus Mundus Joint Master's scholarships (2027 intake)",
        "category": C.study_abroad, "provider": "European Commission (EACEA)",
        "description": "Fully integrated master's programmes run by consortia of universities in several countries, many "
                       "of them in AI, data science and computer science. Many programmes offer Erasmus Mundus "
                       "scholarships for outstanding students; some do not. Most programmes take applications between "
                       "October and January for courses starting the next academic year, and each sets its own deadline, "
                       "so check the programme's own website.",
        "eligibility": "Master's-level applicants from any country, usually with a completed bachelor's degree. Each "
                       "programme sets its own entry and language requirements.",
        "education_levels": ["university"],
        "official_url": "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en",
        "tags": ["machine-learning", "deep-learning", "data-science", "research"],
        "source_note": "EACEA Erasmus Mundus catalogue, checked 2026-11-19: 'Master's level students from all over the "
                       "world can apply'; most programmes take applications October–January; deadlines per programme.",
    },
]


def seed_opportunities(db: Session) -> int:
    created = 0
    for item in OPPORTUNITIES:
        if db.scalar(select(Opportunity).where(Opportunity.official_url == item["official_url"])):
            continue
        db.add(Opportunity(**item, deadline=None, required_documents=[], verification_status=VerificationStatus.verified,
                           verified_at=CHECKED))
        created += 1
    db.commit()
    return created
