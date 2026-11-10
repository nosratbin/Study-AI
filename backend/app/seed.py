"""Seed demo learning content (and optionally demo accounts).

    python -m app.seed                  # demo courses, lessons, assessments and project challenges (idempotent)
    python -m app.seed --demo-users     # also create demo admin/teacher/student

All seeded courses are flagged is_demo=True and shown with a "Demo" label.
No opportunities are seeded: scholarship/competition data must be entered and
verified by an admin from official sources (Phase 3).
Demo account passwords come from SEED_DEMO_PASSWORD or are generated and printed once.
"""

import argparse
import os
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Course, EducationLevel, Lesson, Role, StudentProfile, TeacherProfile, User
from app.seed_assessments import seed_assessments
from app.seed_challenges import seed_challenges

L = EducationLevel

COURSES: list[dict] = [
    # ---------- School (beginner) ----------
    {
        "slug": "what-is-ai-school", "level": L.school, "title": "What is Artificial Intelligence?", "hours": 1.5,
        "category": "ai_fundamentals",
        "description": "A friendly first look at AI: what it is, where you already use it, and how computers learn from examples.",
        "lessons": [
            ("AI around you", "# AI around you\n\nYou already use AI every day:\n\n- **Maps** that find the fastest route\n- **Video apps** that suggest what to watch next\n- **Phone keyboards** that guess your next word\n\n**Big idea:** AI is a computer program that learns patterns from examples instead of following only fixed rules.\n\n**Try it:** List three apps on your family's phone. For each, write one thing it might be *predicting*."),
            ("Learning from examples", "# Learning from examples\n\nImagine teaching a little brother to tell mangoes from bananas. You don't give a rulebook — you show many examples.\n\nComputers learn the same way:\n\n1. Show many labelled examples (photo → \"mango\").\n2. The computer finds patterns (colour, shape).\n3. It guesses labels for new photos.\n\nThis is called **machine learning**."),
            ("Using AI responsibly", "# Using AI responsibly\n\nAI can be wrong. Good AI users:\n\n- **Check** important answers with a teacher or a book.\n- **Protect** personal information — never share passwords or your home address.\n- **Be fair** — AI can learn unfair patterns from unfair examples.\n\n**Discuss:** Why should a doctor double-check an AI's suggestion?"),
        ],
    },
    {
        "slug": "first-steps-coding-school", "level": L.school, "title": "First Steps in Coding", "hours": 2,
        "category": "programming",
        "description": "Learn how computers follow instructions with sequences, loops and decisions — the building blocks of every AI program.",
        "lessons": [
            ("Instructions in order", "# Instructions in order\n\nA program is a list of instructions a computer follows **in order**.\n\nMaking tea as a program:\n\n1. Boil water\n2. Put tea leaves in a cup\n3. Pour water\n4. Wait 3 minutes\n\nChange the order and the result changes!"),
            ("Repeating with loops", "# Repeating with loops\n\nInstead of writing \"clap\" ten times, we say *repeat 10 times: clap*.\n\n```python\nfor i in range(10):\n    print(\"clap\")\n```\n\nLoops save time and reduce mistakes."),
            ("Making decisions", "# Making decisions\n\nPrograms choose what to do with **if**:\n\n```python\nrain = True\nif rain:\n    print(\"Take an umbrella\")\nelse:\n    print(\"Enjoy the sun\")\n```\n\nAI models make decisions too — but they learn the rules from data."),
        ],
    },
    # ---------- College (intermediate) ----------
    {
        "slug": "python-fundamentals-college", "level": L.college, "title": "Python Fundamentals", "hours": 6,
        "category": "programming",
        "description": "Variables, data types, control flow, functions and lists — the Python you need before machine learning.",
        "lessons": [
            ("Variables and types", "# Variables and types\n\n```python\nname = \"Ayesha\"      # str\nage = 17             # int\ngpa = 4.83           # float\npassed = True        # bool\n```\n\nUse `type(x)` to check a value's type. Python is dynamically typed: a variable can hold any type."),
            ("Control flow", "# Control flow\n\n```python\nmarks = 78\nif marks >= 80:\n    grade = \"A+\"\nelif marks >= 70:\n    grade = \"A\"\nelse:\n    grade = \"Below A\"\n```\n\n`for` iterates over sequences; `while` repeats until a condition is false."),
            ("Functions", "# Functions\n\n```python\ndef average(nums: list[float]) -> float:\n    return sum(nums) / len(nums)\n\nprint(average([70, 85, 90]))\n```\n\nFunctions make code reusable and testable. What happens if `nums` is empty? Handle that case."),
            ("Lists and dictionaries", "# Lists and dictionaries\n\n```python\nscores = [70, 85, 90]\nstudent = {\"name\": \"Rafi\", \"scores\": scores}\nprint(student[\"scores\"][1])  # 85\n```\n\nThese two structures hold most of the data you'll feed into ML models."),
        ],
    },
    {
        "slug": "ai-fundamentals-college", "level": L.college, "title": "AI Fundamentals", "hours": 5,
        "category": "ai_fundamentals",
        "description": "Supervised vs unsupervised learning, features and labels, training vs testing, and how to measure accuracy.",
        "lessons": [
            ("Types of machine learning", "# Types of machine learning\n\n- **Supervised:** learn from labelled examples (spam / not spam).\n- **Unsupervised:** find structure without labels (group similar customers).\n- **Reinforcement:** learn by trial, reward and penalty (game-playing agents)."),
            ("Features and labels", "# Features and labels\n\nPredicting house price:\n\n| Feature | Example |\n|---|---|\n| Area (sq ft) | 1200 |\n| Rooms | 3 |\n| Location | Dhanmondi |\n\nThe **label** is the price. A model learns a mapping features → label."),
            ("Train, test, evaluate", "# Train, test, evaluate\n\nSplit data: ~80% **train**, ~20% **test**. Never evaluate on training data — that measures memory, not learning.\n\n**Accuracy** = correct predictions ÷ total predictions. For imbalanced data also look at precision and recall."),
        ],
    },
    # ---------- University (professional) ----------
    {
        "slug": "machine-learning-university", "level": L.university, "title": "Machine Learning with scikit-learn", "hours": 10,
        "category": "machine_learning",
        "description": "Build, validate and tune ML pipelines: regression, classification, cross-validation and avoiding leakage.",
        "lessons": [
            ("Linear and logistic regression", "# Linear and logistic regression\n\n```python\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import train_test_split\n\nX_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)\nclf = LogisticRegression(max_iter=1000).fit(X_tr, y_tr)\nprint(clf.score(X_te, y_te))\n```\n\nLinear regression predicts a number; logistic regression predicts a class probability."),
            ("Pipelines and leakage", "# Pipelines and leakage\n\nFit preprocessing **only on training folds**:\n\n```python\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import StandardScaler\npipe = make_pipeline(StandardScaler(), LogisticRegression())\n```\n\nScaling before splitting leaks test statistics into training and inflates scores."),
            ("Cross-validation and tuning", "# Cross-validation and tuning\n\n```python\nfrom sklearn.model_selection import GridSearchCV\nsearch = GridSearchCV(pipe, {\"logisticregression__C\": [0.1, 1, 10]}, cv=5)\nsearch.fit(X_tr, y_tr)\n```\n\nReport the held-out test score once, after tuning is finished."),
        ],
    },
    {
        "slug": "deep-learning-university", "level": L.university, "title": "Deep Learning Foundations", "hours": 12,
        "category": "deep_learning",
        "description": "Neural networks, backpropagation, CNNs and transfer learning — with practical PyTorch examples.",
        "lessons": [
            ("Neurons and layers", "# Neurons and layers\n\nA neuron computes `activation(w·x + b)`. Stacking layers of neurons lets a network learn non-linear functions. Common activations: ReLU, sigmoid, softmax (output)."),
            ("Backpropagation", "# Backpropagation\n\nTraining loop:\n\n1. Forward pass → prediction\n2. Loss (e.g. cross-entropy)\n3. Backward pass → gradients via chain rule\n4. Optimiser step (SGD / Adam)\n\n```python\nloss = criterion(model(x), y)\noptimizer.zero_grad(); loss.backward(); optimizer.step()\n```"),
            ("Transfer learning", "# Transfer learning\n\nStart from a model pre-trained on a large dataset, replace the final layer, and fine-tune on your data. This works well with small datasets — e.g. classifying local crop diseases from a few hundred photos."),
        ],
    },
]


def seed_courses(db: Session) -> int:
    created = 0
    for i, c in enumerate(COURSES):
        if db.scalar(select(Course).where(Course.slug == c["slug"])):
            continue
        course = Course(
            slug=c["slug"], title=c["title"], description=c["description"], level=c["level"],
            category=c["category"], estimated_hours=c["hours"], is_published=True, is_demo=True, order_index=i,
        )
        for j, (title, md) in enumerate(c["lessons"]):
            course.lessons.append(Lesson(title=title, content_md=md, order_index=j, duration_min=10 + 5 * (j % 3)))
        db.add(course)
        created += 1
    db.commit()
    return created


def seed_demo_users(db: Session) -> None:
    password = os.environ.get("SEED_DEMO_PASSWORD") or secrets.token_urlsafe(10) + "1a"
    users = [
        ("admin@demo.learnai.local", "Demo Admin", Role.admin),
        ("teacher@demo.learnai.local", "Demo Teacher", Role.teacher),
        ("student@demo.learnai.local", "Demo Student", Role.student),
    ]
    for email, name, role in users:
        if db.scalar(select(User).where(User.email == email)):
            print(f"  exists: {email}")
            continue
        u = User(email=email, full_name=name, role=role, password_hash=hash_password(password))
        if role == Role.student:
            u.student_profile = StudentProfile()
        if role == Role.teacher:
            u.teacher_profile = TeacherProfile(is_verified=True, expertise=["python", "machine learning"])
        db.add(u)
        print(f"  created: {email} ({role})")
    db.commit()
    if not os.environ.get("SEED_DEMO_PASSWORD"):
        print(f"  demo password (shown once): {password}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo-users", action="store_true")
    args = parser.parse_args()
    if get_settings().environment == "production" and args.demo_users:
        raise SystemExit("Refusing to create demo accounts in production.")
    with SessionLocal() as db:
        print(f"courses created: {seed_courses(db)}")
        print(f"assessments created: {seed_assessments(db)}")
        print(f"project challenges created: {seed_challenges(db)}")
        if args.demo_users:
            seed_demo_users(db)


if __name__ == "__main__":
    main()
