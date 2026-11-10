"""Demo Project Lab challenges (is_demo=True, labelled "Demo" in the UI).

Students build in Google Colab (a blank notebook link, nothing hosted by us) and submit a link plus a write-up.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import EducationLevel, ProjectChallenge

L = EducationLevel
NEW_COLAB = "https://colab.research.google.com/#create=true"

CHALLENGES: list[dict] = [
    {
        "slug": "python-quiz-game", "level": L.school, "title": "Build a Python quiz game", "hours": 2,
        "skills": ["Python basics", "Lists", "Loops"],
        "summary": "Write a small quiz that asks questions, checks answers and shows a score.",
        "brief": """## Goal
Make a quiz game in Python that asks at least 5 questions about a topic you like.

## Steps
1. Open a new Google Colab notebook.
2. Store your questions and answers in a list.
3. Use a `for` loop to ask each question with `input()`.
4. Compare the answer (ignore upper/lower case) and count the score.
5. Print the final score and a friendly message.

## Stretch ideas
- Shuffle the questions with `random.shuffle`.
- Give a hint after a wrong answer.

## What to submit
Your Colab link (set sharing to "Anyone with the link can view") and a short write-up: what your quiz is about,
how the code works, and one thing you found tricky.""",
    },
    {
        "slug": "rule-based-chatbot", "level": L.school, "title": "Make a rule-based chatbot", "hours": 2,
        "skills": ["Python basics", "Conditions", "Strings"],
        "summary": "Create a chatbot that replies using if/else rules, then think about where rules stop working.",
        "brief": """## Goal
Build a chatbot that answers simple questions about your school or a hobby using `if` / `elif` rules.

## Steps
1. Write a `reply(message)` function that lowercases the message.
2. Check for keywords (for example "hello", "time", "homework") and return an answer.
3. Loop: read a message, print the reply, stop when the user types "bye".

## Think about it
Write 3-4 sentences in your write-up: which questions does your bot fail on? How is this different from an AI
model that learns from data?

## What to submit
Your Colab link and the write-up.""",
    },
    {
        "slug": "exam-score-analysis", "level": L.college, "title": "Analyse exam scores with pandas", "hours": 3,
        "skills": ["pandas", "Data cleaning", "Charts"],
        "summary": "Create a small made-up dataset of marks, clean it and find patterns with charts.",
        "brief": """## Goal
Practise data analysis on a small dataset you create yourself (made-up names and marks, never real students).

## Steps
1. Make a table of 20 rows with columns: student, subject, marks, study_hours.
2. Load it into a pandas DataFrame and check for missing or impossible values.
3. Calculate the average mark per subject.
4. Draw a scatter plot of study_hours vs marks with matplotlib.
5. Write what pattern you see, and why a small made-up dataset can mislead.

## What to submit
Your Colab link and a write-up covering the steps, the chart and your conclusion.""",
    },
    {
        "slug": "first-classifier", "level": L.college, "title": "Train your first classifier", "hours": 3,
        "skills": ["scikit-learn", "Train/test split", "Accuracy"],
        "summary": "Train a decision tree on the built-in Iris dataset and explain how well it works.",
        "brief": """## Goal
Train and evaluate a machine learning model end to end.

## Steps
1. Load the Iris dataset from `sklearn.datasets`.
2. Split it into training and test sets (`train_test_split`, test_size=0.2, random_state=42).
3. Train a `DecisionTreeClassifier` and measure accuracy on the test set.
4. Print a confusion matrix and explain one mistake the model makes.
5. Try one change (for example `max_depth=2`) and compare.

## What to submit
Your Colab link and a write-up: results, what the confusion matrix shows, and what you would try next.""",
    },
    {
        "slug": "bangla-sentiment-baseline", "level": L.university, "title": "Bangla sentiment baseline", "hours": 5,
        "skills": ["NLP", "TF-IDF", "Evaluation"],
        "summary": "Build a TF-IDF + logistic regression baseline for sentiment on a public Bangla dataset you find.",
        "brief": """## Goal
Build and honestly evaluate a text classification baseline for Bangla.

## Steps
1. Find a public Bangla sentiment dataset (check its licence and cite the source in your write-up).
2. Clean the text (remove URLs, normalise whitespace). Keep Bangla characters.
3. Vectorise with `TfidfVectorizer` (try character n-grams too) and train `LogisticRegression`.
4. Report precision, recall and F1 per class, not just accuracy.
5. Look at 10 misclassified examples and describe the patterns.

## What to submit
A GitHub repo or Colab link, plus a write-up: dataset source and licence, method, results table, error analysis,
and limitations.""",
    },
    {
        "slug": "rag-study-helper", "level": L.university, "title": "Retrieval demo over your notes", "hours": 6,
        "skills": ["Embeddings", "Vector search", "Evaluation"],
        "summary": "Index your own lecture notes with embeddings and retrieve the most relevant passage for a question.",
        "brief": """## Goal
Understand retrieval, the "R" in RAG, by building it yourself on your own notes.

## Steps
1. Split 3-5 pages of your own notes into chunks of about 200 words.
2. Create embeddings with an open model (for example from `sentence-transformers`).
3. For a question, embed it and return the top 3 chunks by cosine similarity.
4. Write 10 test questions with the chunk that should be found, and measure how often it is in the top 3.
5. Try a different chunk size and compare.

## What to submit
A GitHub repo or Colab link and a write-up with your evaluation table and what you learned.
Do not upload anything you don't have the right to share.""",
    },
]


def seed_challenges(db: Session) -> int:
    created = 0
    for i, c in enumerate(CHALLENGES):
        if db.scalar(select(ProjectChallenge).where(ProjectChallenge.slug == c["slug"])):
            continue
        db.add(ProjectChallenge(
            slug=c["slug"], title=c["title"], level=c["level"], summary=c["summary"], brief_md=c["brief"],
            skills=c["skills"], estimated_hours=c["hours"], starter_url=NEW_COLAB, order_index=i,
            is_published=True, is_demo=True,
        ))
        created += 1
    db.commit()
    return created
