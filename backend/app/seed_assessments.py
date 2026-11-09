"""Demo assessments with answer keys (seeded by `python -m app.seed`).

Each question: (prompt, options, correct_index, explanation, topic_tag, difficulty).
Answer keys were checked by hand; code-output questions were verified by running the code.
Placement difficulty: 1 = school, 2 = college, 3 = university.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Assessment, AssessmentQuestion, EducationLevel

L = EducationLevel

ASSESSMENTS: list[dict] = [
    {
        "title": "Placement Test: Where should I start?", "topic": "placement", "level": None, "placement": True,
        "minutes": 15,
        "questions": [
            ("Which of these is an everyday example of AI?",
             ["A calculator adding two numbers", "A video app suggesting what to watch next", "A light switch",
              "A printed textbook"],
             1, "Recommendation systems learn from what you watched before to predict what you'll like next.",
             "ai_fundamentals", 1),
            ("In programming, what does a loop do?",
             ["Stops the program", "Repeats a set of instructions", "Deletes data", "Draws a circle"],
             1, "A loop repeats instructions, e.g. `for i in range(10):` runs its body 10 times.", "programming", 1),
            ("A computer learns to tell mangoes from bananas by studying many labelled photos. This is called:",
             ["Machine learning", "Typing", "Web browsing", "Hardware repair"],
             0, "Learning patterns from labelled examples is machine learning.", "ai_fundamentals", 1),
            ("What will this print?\n\n```python\nx = 3\nif x > 5:\n    print(\"big\")\nelse:\n    print(\"small\")\n```",
             ["big", "small", "3", "Nothing"],
             1, "3 is not greater than 5, so the else branch runs.", "programming", 1),
            ("What is the output of `print(len([4, 7, 1]))`?", ["3", "4", "12", "7"],
             0, "len() counts the items in the list: there are 3.", "programming", 2),
            ("Learning from labelled examples (e.g. emails marked spam / not spam) is called:",
             ["Unsupervised learning", "Supervised learning", "Reinforcement learning", "Compilation"],
             1, "Supervised learning uses examples that come with the correct answer (label).", "ai_fundamentals", 2),
            ("Why do we keep a separate test set?",
             ["To make training faster", "To measure how well the model works on data it hasn't seen",
              "To store extra copies of the data", "To reduce file size"],
             1, "The test set estimates performance on new, unseen data.", "ai_fundamentals", 2),
            ("What does `f([2, 4, 6])` return?\n\n```python\ndef f(nums):\n    return sum(nums) / len(nums)\n```",
             ["12", "4.0", "6", "3"],
             1, "sum is 12, len is 3, and `/` always gives a float in Python 3: 12 / 3 = 4.0.", "programming", 2),
            ("Fitting a StandardScaler on the full dataset before the train/test split mainly causes:",
             ["Underfitting", "Data leakage that makes test scores look better than they really are",
              "Faster convergence", "Class imbalance"],
             1, "The scaler learns statistics from test rows, leaking information into training.", "machine_learning", 3),
            ("Which technique gives a more reliable performance estimate on a small dataset?",
             ["k-fold cross-validation", "Evaluating on the training set", "Training for more epochs",
              "Raising the learning rate"],
             0, "Cross-validation averages results over several train/validation splits.", "machine_learning", 3),
            ("During backpropagation, gradients are computed using:",
             ["The chain rule of calculus", "Random guessing", "Sorting the weights", "The softmax of the input"],
             0, "Backpropagation applies the chain rule layer by layer from the loss backwards.", "deep_learning", 3),
            ("A dataset has 95% negative and 5% positive cases. A model that always predicts \"negative\" gets 95% "
             "accuracy. Which metric best reveals that it never finds positives?",
             ["Accuracy", "Recall on the positive class", "Training loss", "Number of features"],
             1, "Recall = found positives / actual positives; here it is 0.", "machine_learning", 3),
        ],
    },
    {
        "title": "AI & Coding Basics", "topic": "ai_fundamentals", "level": L.school, "minutes": 8,
        "questions": [
            ("Which of these uses AI?",
             ["A phone keyboard that guesses your next word", "A wooden ruler", "A paper notebook", "A plain wall clock"],
             0, "Word prediction learns from lots of text to guess what you'll type next.", "ai_fundamentals", 1),
            ("How does a computer learn to recognise mangoes in photos?",
             ["By looking at many labelled examples", "By being shaken", "By being switched off and on",
              "It can never learn"],
             0, "Showing many labelled examples lets the computer find patterns like colour and shape.",
             "ai_fundamentals", 1),
            ("What is a program?",
             ["A list of instructions a computer follows in order", "A type of keyboard", "A computer screen",
              "An internet cable"],
             0, "A program is a sequence of instructions.", "programming", 1),
            ("What does this code do?\n\n```python\nfor i in range(3):\n    print(\"clap\")\n```",
             ["Prints \"clap\" once", "Prints \"clap\" three times", "Prints \"clap\" four times", "Prints nothing"],
             1, "range(3) gives 0, 1, 2 — three repetitions.", "programming", 1),
            ("Why should you check important AI answers with a teacher or a book?",
             ["AI can make mistakes", "AI is always slow", "Books are newer than AI", "Teachers don't like AI"],
             0, "AI learns from data and can be wrong, so important answers should be checked.", "ethics", 1),
            ("What should you never share with an AI app or website?",
             ["Your password", "Your favourite fruit", "A maths question", "A question about plants"],
             0, "Passwords and other private information must stay private.", "ethics", 1),
        ],
    },
    {
        "title": "Python Basics", "topic": "programming", "level": L.college, "minutes": 10,
        "questions": [
            ("What is the type of `4.83` in Python?", ["int", "float", "str", "bool"],
             1, "Numbers with a decimal point are floats.", "python", 1),
            ("What does this print?\n\n```python\nscores = [70, 85, 90]\nprint(scores[1])\n```",
             ["70", "85", "90", "Error"],
             1, "Indexing starts at 0, so index 1 is the second item.", "python", 1),
            ("Looping over `range(3)` gives which values?", ["1, 2, 3", "0, 1, 2", "0, 1, 2, 3", "3"],
             1, "range(3) starts at 0 and stops before 3.", "python", 1),
            ("What does this print?\n\n```python\nstudent = {\"name\": \"Rafi\", \"age\": 17}\nprint(student[\"age\"])\n```",
             ["name", "Rafi", "17", "Error"],
             2, "A dictionary returns the value stored under the key \"age\".", "python", 1),
            ("What is the value of `7 // 2` in Python 3?", ["3.5", "3", "4", "1"],
             1, "`//` is floor division: it drops the fractional part.", "python", 2),
            ("What does this print?\n\n```python\ntotal = 0\nfor n in [1, 2, 3, 4]:\n    if n % 2 == 0:\n"
             "        total += n\nprint(total)\n```",
             ["10", "4", "6", "2"],
             2, "Only the even numbers 2 and 4 are added: 2 + 4 = 6.", "python", 2),
            ("Which keyword defines a function in Python?", ["func", "def", "function", "define"],
             1, "Functions are defined with `def name(params):`.", "python", 1),
            ("Given `def average(nums): return sum(nums) / len(nums)`, what happens when you call `average([])`?",
             ["It returns 0", "It returns None", "It raises ZeroDivisionError", "It returns an empty list"],
             2, "len([]) is 0 and dividing by zero raises ZeroDivisionError — handle the empty case first.", "python", 2),
        ],
    },
    {
        "title": "AI Fundamentals Check", "topic": "ai_fundamentals", "level": L.college, "minutes": 10,
        "questions": [
            ("Grouping customers by similar buying habits, without any labels, is an example of:",
             ["Supervised learning", "Unsupervised learning", "Reinforcement learning", "Data entry"],
             1, "Finding structure in unlabelled data is unsupervised learning.", "ai_fundamentals", 1),
            ("When predicting a house's price from its area and number of rooms, the price is the:",
             ["Feature", "Label", "Algorithm", "Test set"],
             1, "The label is the value the model learns to predict.", "ai_fundamentals", 1),
            ("A game-playing agent that learns from rewards and penalties uses:",
             ["Reinforcement learning", "Unsupervised learning", "Linear regression", "Data cleaning"],
             0, "Reinforcement learning optimises actions to maximise reward.", "ai_fundamentals", 1),
            ("A model made 100 predictions and 85 were correct. Its accuracy is:", ["15%", "85%", "100%", "0.85%"],
             1, "Accuracy = correct ÷ total = 85 ÷ 100 = 85%.", "ai_fundamentals", 1),
            ("Why should you not evaluate a model on its training data?",
             ["It is slower", "It measures memorisation, not how well the model generalises",
              "Training data can't be read twice", "It changes the labels"],
             1, "A model can memorise training examples; only unseen data shows real performance.",
             "ai_fundamentals", 2),
            ("Which split is a common default for training and testing?",
             ["80% train / 20% test", "20% train / 80% test", "100% train / 0% test", "0% train / 100% test"],
             0, "Most data is used for training while a smaller part is held out for testing.", "ai_fundamentals", 1),
            ("Which of these is a responsible-AI concern?",
             ["A model learning unfair patterns from biased data", "Using a fast computer",
              "Writing comments in code", "Saving files often"],
             0, "Biased training data can lead to unfair decisions.", "ethics", 1),
            ("Area, number of rooms and location, used to predict a house price, are called:",
             ["Labels", "Features", "Outputs", "Epochs"],
             1, "Features are the inputs the model uses.", "ai_fundamentals", 1),
        ],
    },
    {
        "title": "Machine Learning Essentials", "topic": "machine_learning", "level": L.university, "minutes": 12,
        "questions": [
            ("Logistic regression is mainly used for:",
             ["Predicting a continuous number", "Classification (predicting class probabilities)", "Clustering",
              "Dimensionality reduction"],
             1, "Despite its name, logistic regression is a classification model.", "machine_learning", 2),
            ("In `train_test_split(X, y, test_size=0.2, stratify=y)`, what does `stratify=y` do?",
             ["Shuffles the features only", "Keeps class proportions similar in the train and test sets",
              "Removes outliers", "Scales the data"],
             1, "Stratification preserves the label distribution in both splits.", "machine_learning", 2),
            ("Why put a scaler and a model inside one scikit-learn Pipeline when using cross-validation?",
             ["It makes the model bigger", "Preprocessing is fit only on each training fold, preventing leakage",
              "It disables cross-validation", "It increases the test-set size"],
             1, "The pipeline refits the scaler inside every training fold.", "machine_learning", 3),
            ("For `make_pipeline(StandardScaler(), LogisticRegression())`, which GridSearchCV parameter name tunes C?",
             ["C", "logisticregression__C", "LogisticRegression.C", "model_C"],
             1, "make_pipeline names steps by their lowercase class name; parameters use step__param.",
             "machine_learning", 3),
            ("A model scores 99% on training data but 70% on test data. This most likely indicates:",
             ["Underfitting", "Overfitting", "Perfect generalisation", "Too little training"],
             1, "A large train–test gap means the model memorised the training data.", "machine_learning", 2),
            ("Precision answers which question?",
             ["Of all actual positives, how many did we find?",
              "Of all predicted positives, how many were actually positive?",
              "How many predictions were made?", "How fast is the model?"],
             1, "Precision = true positives ÷ predicted positives. (The first option describes recall.)",
             "machine_learning", 2),
            ("When should you report the held-out test score?",
             ["After every hyperparameter change", "Once, after model selection and tuning are finished", "Never",
              "Before training"],
             1, "Using the test set during tuning leaks information and inflates the score.", "machine_learning", 3),
            ("In scikit-learn's LogisticRegression, making C smaller generally:",
             ["Makes the model more complex",
              "Strengthens regularisation, giving a simpler model that can overfit less",
              "Removes the need for data", "Always increases training accuracy"],
             1, "C is the inverse of regularisation strength: smaller C means stronger regularisation.",
             "machine_learning", 3),
        ],
    },
    {
        "title": "Deep Learning Basics", "topic": "deep_learning", "level": L.university, "minutes": 10,
        "questions": [
            ("A single artificial neuron computes:",
             ["activation(w·x + b)", "w + x + b only", "Always the average of its inputs", "sort(x)"],
             0, "A weighted sum plus bias, passed through an activation function.", "deep_learning", 2),
            ("Which activation is commonly used in the output layer for multi-class classification?",
             ["ReLU", "Softmax", "Linear", "Leaky ReLU"],
             1, "Softmax turns scores into probabilities that sum to 1.", "deep_learning", 2),
            ("In PyTorch, why call `optimizer.zero_grad()` before `loss.backward()`?",
             ["To reset the model weights", "Because gradients accumulate by default",
              "To speed up the forward pass", "To change the learning rate"],
             1, "backward() adds to existing .grad values, so they must be cleared each step.", "deep_learning", 3),
            ("What is the correct order of one training step?",
             ["Backward → forward → loss → step", "Forward → loss → backward → optimiser step",
              "Optimiser step → forward → loss → backward", "Loss → forward → step → backward"],
             1, "Predict, measure the error, compute gradients, then update the weights.", "deep_learning", 2),
            ("Transfer learning is especially useful when:",
             ["You have a huge labelled dataset for your exact task",
              "You have a small dataset and a model pre-trained on a large related dataset",
              "You don't want to use any data", "Your model has no layers"],
             1, "Pre-trained features let small datasets reach good accuracy.", "deep_learning", 2),
            ("Without non-linear activation functions, a deep stack of linear layers is equivalent to:",
             ["A single linear layer", "A convolutional network", "A decision tree", "A random model"],
             0, "Composing linear maps gives another linear map.", "deep_learning", 3),
        ],
    },
]


def rotate(options: list[str], correct: int, r: int) -> tuple[list[str], int]:
    """Vary where the right answer sits; the key is recomputed from the original, never hand-edited."""
    r %= len(options)
    return options[r:] + options[:r], (correct - r) % len(options)


def seed_assessments(db: Session) -> int:
    created = 0
    for i, a in enumerate(ASSESSMENTS):
        if db.scalar(select(Assessment).where(Assessment.title == a["title"])):
            continue
        assessment = Assessment(
            title=a["title"], topic=a["topic"], level=a["level"], time_limit_min=a["minutes"],
            is_placement=a.get("placement", False), is_published=True, is_demo=True,
        )
        for j, (prompt, options, correct, explanation, tag, difficulty) in enumerate(a["questions"]):
            if not (len(options) == 4 and 0 <= correct < 4 and len(set(options)) == 4):
                raise ValueError(f"bad question: {prompt[:50]}")
            opts, key = rotate(options, correct, i * 3 + j * 5)
            assessment.questions.append(AssessmentQuestion(
                prompt=prompt, options=opts, correct_option=key, explanation=explanation,
                topic_tag=tag, difficulty=difficulty, order_index=j,
            ))
        db.add(assessment)
        created += 1
    db.commit()
    return created
