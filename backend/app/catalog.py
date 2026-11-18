"""The IccheGhuri course catalogue: 22 courses across school, college and university.

A course whose Markdown file exists in app/content/courses/<slug>.md is seeded with its full lessons (same format as
seed_full_courses.py). Every other course is seeded with its `outline` only and shows as "Coming soon" with the planned
modules, until a teacher or a later content drop adds lessons.

`skills` are lower-case tags shared with project challenges, careers and opportunities.
`resources` is the course's digital library: free, official or openly licensed material only. Each link was checked
when it was added; `scripts/check_library_links.py` re-checks them.
"""

from app.models import EducationLevel

L = EducationLevel


def R(title: str, url: str, source: str, kind: str) -> dict:  # noqa: N802
    return {"title": title, "url": url, "source": source, "kind": kind}


def O(*modules: tuple[str, list[str]]) -> list[dict]:  # noqa: N802, E741
    return [{"module": m, "lessons": lessons} for m, lessons in modules]


CATALOG: list[dict] = [
    # ======================= School (Class 6–10) =======================
    {
        "slug": "computers-digital-literacy-school", "level": L.school, "category": "digital_literacy", "hours": 8,
        "title": "Computers & Digital Literacy",
        "description": "How a computer works, files and the internet, searching well, staying safe online and spotting fake news.",
        "skills": ["digital-literacy", "online-safety"],
        "outline": O(
            ("Module 1 · Inside a computer", ["Input, processing, storage, output", "Hardware and software", "Binary: how computers count"]),
            ("Module 2 · Files and the internet", ["Files, folders and the cloud", "How the internet delivers a web page", "Searching like a researcher"]),
            ("Module 3 · Safe and smart online", ["Strong passwords and two-step sign-in", "Phishing and scams", "Checking facts and spotting fake news",
                                                  "Your digital footprint"]),
        ),
        "resources": [
            R("Be Internet Awesome", "https://beinternetawesome.withgoogle.com/", "Google", "course"),
            R("Computer basics", "https://edu.gcfglobal.org/en/computerbasics/", "GCFGlobal", "course"),
            R("CS Unplugged: binary numbers", "https://www.csunplugged.org/en/topics/binary-numbers/", "University of Canterbury", "activity"),
            R("ICT textbooks (Class 6–10)", "https://nctb.gov.bd/", "NCTB Bangladesh", "book"),
        ],
    },
    {
        "slug": "maths-logic-coding-school", "level": L.school, "category": "mathematics", "hours": 8,
        "title": "Maths & Logic for Coding",
        "description": "Patterns, logic, coordinates and simple algorithms: the maths that makes programming and AI click.",
        "skills": ["maths", "logic", "algorithms"],
        "outline": O(
            ("Module 1 · Thinking in steps", ["What is an algorithm?", "Flowcharts", "Finding and fixing mistakes"]),
            ("Module 2 · Logic", ["True, false, AND, OR, NOT", "Truth tables", "Logic puzzles"]),
            ("Module 3 · Numbers and space", ["Patterns and sequences", "Coordinates and the grid", "Percentages and averages"]),
        ),
        "resources": [
            R("Khan Academy maths", "https://www.khanacademy.org/math", "Khan Academy", "course"),
            R("CS Unplugged activities", "https://www.csunplugged.org/en/", "University of Canterbury", "activity"),
            R("Code.org courses", "https://code.org/", "Code.org", "course"),
        ],
    },
    {
        "slug": "scratch-python-school", "level": L.school, "category": "programming", "hours": 10,
        "title": "Coding with Scratch & Python",
        "description": "Start with Scratch blocks, then write real Python: variables, loops, decisions and functions, with small "
                       "games and projects along the way.",
        "skills": ["scratch", "python", "programming"],
        "resources": [
            R("Scratch", "https://scratch.mit.edu/", "MIT", "tool"),
            R("Scratch ideas and tutorials", "https://scratch.mit.edu/ideas", "MIT", "course"),
            R("The Python tutorial", "https://docs.python.org/3/tutorial/", "Python Software Foundation", "docs"),
            R("Python projects", "https://projects.raspberrypi.org/en/pathways/python-intro", "Raspberry Pi Foundation", "course"),
        ],
    },
    {
        "slug": "data-statistics-charts-school", "level": L.school, "category": "data_science", "hours": 8,
        "title": "Data, Statistics & Charts",
        "description": "Collect data, summarise it with averages and spread, draw honest charts and tell what the numbers say.",
        "skills": ["statistics", "data-analysis", "visualisation"],
        "outline": O(
            ("Module 1 · Collecting data", ["What counts as data?", "Surveys and samples", "Tables and spreadsheets"]),
            ("Module 2 · Summarising", ["Mean, median and mode", "Range and spread", "Probability basics"]),
            ("Module 3 · Charts", ["Bar, line and pie charts", "Misleading charts", "Telling a story with data"]),
        ),
        "resources": [
            R("Statistics and probability", "https://www.khanacademy.org/math/statistics-probability", "Khan Academy", "course"),
            R("CODAP data tool", "https://codap.concord.org/", "Concord Consortium", "tool"),
            R("Our World in Data", "https://ourworldindata.org/", "Our World in Data", "data"),
            R("Bangladesh statistics", "https://bbs.gov.bd/", "Bangladesh Bureau of Statistics", "data"),
        ],
    },
    {
        "slug": "ai-ml-basics-school", "level": L.school, "category": "ai_fundamentals", "hours": 8,
        "title": "AI & Machine Learning Basics",
        "description": "What AI is, how machines learn from examples, training your own model in the browser, and using AI "
                       "fairly, safely and privately.",
        "skills": ["ai-basics", "machine-learning", "ai-ethics"],
        "resources": [
            R("Teachable Machine", "https://teachablemachine.withgoogle.com/", "Google", "tool"),
            R("Machine Learning for Kids", "https://machinelearningforkids.co.uk/", "Dale Lane", "tool"),
            R("Elements of AI", "https://www.elementsofai.com/", "University of Helsinki", "course"),
            R("Day of AI curriculum", "https://dayofai.org/", "MIT RAISE", "course"),
        ],
    },
    {
        "slug": "robotics-iot-school", "level": L.school, "category": "robotics", "hours": 8,
        "title": "Robotics & IoT Basics",
        "description": "Sensors, motors and microcontrollers: build simple circuits in a simulator and program devices that "
                       "react to the world.",
        "skills": ["robotics", "iot", "electronics"],
        "outline": O(
            ("Module 1 · Circuits", ["Voltage, current and resistance", "LEDs, buttons and breadboards", "Simulate a circuit"]),
            ("Module 2 · Microcontrollers", ["What is a microcontroller?", "Blink: your first program", "Reading a sensor"]),
            ("Module 3 · Robots and the Internet of Things", ["Motors and movement", "Smart devices and the cloud", "Project: a plant-watering alarm"]),
        ),
        "resources": [
            R("micro:bit MakeCode", "https://makecode.microbit.org/", "Micro:bit Educational Foundation", "tool"),
            R("Tinkercad Circuits", "https://www.tinkercad.com/circuits", "Autodesk", "tool"),
            R("Wokwi Arduino simulator", "https://wokwi.com/", "Wokwi", "tool"),
            R("Arduino documentation", "https://docs.arduino.cc/", "Arduino", "docs"),
        ],
    },
    # ======================= College (HSC) =======================
    {
        "slug": "python-oop-college", "level": L.college, "category": "programming", "hours": 14,
        "title": "Python Programming & OOP",
        "description": "Python from variables to classes: data structures, functions, files, errors, modules and "
                       "object-oriented design, with exercises in every lesson.",
        "skills": ["python", "programming", "oop"],
        "resources": [
            R("The Python tutorial", "https://docs.python.org/3/tutorial/", "Python Software Foundation", "docs"),
            R("CS50's Introduction to Programming with Python", "https://cs50.harvard.edu/python/", "Harvard", "course"),
            R("Kaggle Learn: Python", "https://www.kaggle.com/learn/python", "Kaggle", "course"),
        ],
    },
    {
        "slug": "maths-for-ml-college", "level": L.college, "category": "mathematics", "hours": 12,
        "title": "Mathematics for Machine Learning",
        "description": "Vectors, matrices, functions, derivatives and probability: the maths behind every model, explained "
                       "with code and pictures.",
        "skills": ["maths", "linear-algebra", "calculus", "probability", "statistics"],
        "outline": O(
            ("Module 1 · Linear algebra", ["Vectors and the dot product", "Matrices and transformations", "Solving systems with matrices"]),
            ("Module 2 · Calculus", ["Functions and slopes", "Derivatives and the chain rule", "Gradients in many dimensions"]),
            ("Module 3 · Probability and statistics", ["Random events and distributions", "Mean, variance and the normal curve",
                                                        "Bayes' rule", "Correlation is not causation"]),
        ),
        "resources": [
            R("Essence of linear algebra", "https://www.3blue1brown.com/topics/linear-algebra", "3Blue1Brown", "video"),
            R("Mathematics for Machine Learning (free book)", "https://mml-book.github.io/", "Deisenroth, Faisal & Ong", "book"),
            R("Khan Academy: linear algebra", "https://www.khanacademy.org/math/linear-algebra", "Khan Academy", "course"),
        ],
    },
    {
        "slug": "data-science-python-college", "level": L.college, "category": "data_science", "hours": 12,
        "title": "Data Science with NumPy, Pandas & Matplotlib",
        "description": "Load, clean, analyse and visualise real datasets with the standard Python data tools.",
        "skills": ["python", "numpy", "pandas", "data-analysis", "visualisation"],
        "outline": O(
            ("Module 1 · NumPy", ["Arrays and shapes", "Vectorised maths", "Indexing and filtering"]),
            ("Module 2 · pandas", ["DataFrames and Series", "Cleaning missing and messy data", "Group, merge and pivot"]),
            ("Module 3 · Visualisation", ["Matplotlib basics", "Choosing the right chart", "A full exploratory analysis"]),
        ),
        "resources": [
            R("NumPy: the absolute basics", "https://numpy.org/doc/stable/user/absolute_beginners.html", "NumPy", "docs"),
            R("10 minutes to pandas", "https://pandas.pydata.org/docs/user_guide/10min.html", "pandas", "docs"),
            R("Matplotlib quick start", "https://matplotlib.org/stable/users/explain/quick_start.html", "Matplotlib", "docs"),
            R("Kaggle Learn: Pandas", "https://www.kaggle.com/learn/pandas", "Kaggle", "course"),
        ],
    },
    {
        "slug": "sql-databases-college", "level": L.college, "category": "databases", "hours": 10,
        "title": "SQL & Databases",
        "description": "Design tables, query them with SQL, join data and understand how apps store information safely.",
        "skills": ["sql", "databases"],
        "outline": O(
            ("Module 1 · Relational databases", ["Tables, rows and keys", "Designing a schema", "Normalisation"]),
            ("Module 2 · Querying", ["SELECT, WHERE and ORDER BY", "Aggregates and GROUP BY", "JOINs"]),
            ("Module 3 · Databases in apps", ["INSERT, UPDATE and transactions", "Indexes and speed", "SQL injection and how to prevent it"]),
        ),
        "resources": [
            R("CS50's Introduction to Databases with SQL", "https://cs50.harvard.edu/sql/", "Harvard", "course"),
            R("PostgreSQL tutorial", "https://www.postgresql.org/docs/current/tutorial.html", "PostgreSQL", "docs"),
            R("Kaggle Learn: Intro to SQL", "https://www.kaggle.com/learn/intro-to-sql", "Kaggle", "course"),
        ],
    },
    {
        "slug": "ml-regression-classification-college", "level": L.college, "category": "machine_learning", "hours": 14,
        "title": "Machine Learning: Regression & Classification",
        "description": "Train and evaluate your first real models with scikit-learn: linear and logistic regression, trees, "
                       "k-nearest neighbours, and honest evaluation.",
        "skills": ["machine-learning", "scikit-learn", "python", "evaluation"],
        "resources": [
            R("Machine Learning Crash Course", "https://developers.google.com/machine-learning/crash-course", "Google", "course"),
            R("scikit-learn user guide", "https://scikit-learn.org/stable/user_guide.html", "scikit-learn", "docs"),
            R("Kaggle Learn: Intro to Machine Learning", "https://www.kaggle.com/learn/intro-to-machine-learning", "Kaggle", "course"),
        ],
    },
    {
        "slug": "deep-learning-nlp-intro-college", "level": L.college, "category": "deep_learning", "hours": 12,
        "title": "Intro to Deep Learning & NLP",
        "description": "Neural networks from a single neuron to a small text classifier, and how computers read language.",
        "skills": ["deep-learning", "neural-networks", "nlp"],
        "outline": O(
            ("Module 1 · Neural networks", ["From a neuron to a network", "Activation functions", "Training with gradient descent"]),
            ("Module 2 · Building with Keras or PyTorch", ["Your first network on digits", "Overfitting and dropout", "Saving and loading models"]),
            ("Module 3 · Language", ["Tokens and vocabularies", "Word embeddings", "A Bangla or English text classifier"]),
        ),
        "resources": [
            R("Neural networks (video series)", "https://www.3blue1brown.com/topics/neural-networks", "3Blue1Brown", "video"),
            R("PyTorch: learn the basics", "https://docs.pytorch.org/tutorials/beginner/basics/intro.html", "PyTorch", "docs"),
            R("Kaggle Learn: Intro to Deep Learning", "https://www.kaggle.com/learn/intro-to-deep-learning", "Kaggle", "course"),
        ],
    },
    {
        "slug": "cybersecurity-ai-safety-college", "level": L.college, "category": "security", "hours": 10,
        "title": "Cybersecurity & AI Safety",
        "description": "How attacks work and how to defend against them, plus the new risks of AI systems: prompt injection, "
                       "data leaks, bias and misuse.",
        "skills": ["cybersecurity", "ai-safety", "ai-ethics"],
        "outline": O(
            ("Module 1 · Security foundations", ["Confidentiality, integrity, availability", "Passwords, hashing and 2FA", "Networks and HTTPS"]),
            ("Module 2 · Common attacks", ["Phishing and social engineering", "Web attacks: XSS and injection", "Malware and backups"]),
            ("Module 3 · AI safety", ["Prompt injection", "Privacy and training data", "Bias and fairness checks", "Responsible AI rules"]),
        ),
        "resources": [
            R("Introduction to Cybersecurity", "https://www.netacad.com/courses/introduction-to-cybersecurity", "Cisco Networking Academy", "course"),
            R("OWASP Top 10", "https://owasp.org/projects/top-ten", "OWASP", "docs"),
            R("OWASP Top 10 for LLM applications", "https://genai.owasp.org/llm-top-10/", "OWASP", "docs"),
            R("AI Risk Management Framework", "https://www.nist.gov/itl/ai-risk-management-framework", "NIST", "docs"),
        ],
    },
    # ======================= University =======================
    {
        "slug": "algorithms-advanced-python-university", "level": L.university, "category": "programming", "hours": 16,
        "title": "Algorithms & Advanced Python",
        "description": "Complexity, data structures, classic algorithms and the Python features professionals use: typing, "
                       "generators, testing and performance.",
        "skills": ["python", "algorithms", "data-structures"],
        "outline": O(
            ("Module 1 · Analysis", ["Big-O and measuring time", "Recursion", "Arrays, hash maps and sets"]),
            ("Module 2 · Classic algorithms", ["Sorting and binary search", "Graphs: BFS, DFS and shortest paths", "Dynamic programming"]),
            ("Module 3 · Professional Python", ["Type hints and dataclasses", "Iterators, generators and context managers", "Testing with pytest",
                                                 "Profiling and speeding up code"]),
        ),
        "resources": [
            R("Introduction to Algorithms (6.006)", "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/", "MIT OpenCourseWare", "course"),
            R("Algorithms for competitive programming", "https://cp-algorithms.com/", "cp-algorithms", "docs"),
            R("Python standard library", "https://docs.python.org/3/library/", "Python Software Foundation", "docs"),
        ],
    },
    {
        "slug": "optimisation-for-ml-university", "level": L.university, "category": "mathematics", "hours": 12,
        "title": "Optimisation for Machine Learning",
        "description": "Loss functions, gradient descent and its variants, convexity and regularisation: how models actually learn.",
        "skills": ["maths", "optimisation", "calculus", "machine-learning"],
        "outline": O(
            ("Module 1 · Foundations", ["Loss functions", "Convex and non-convex problems", "Gradients and Hessians"]),
            ("Module 2 · Gradient methods", ["Gradient descent and learning rates", "Stochastic and mini-batch gradient descent", "Momentum, RMSProp and Adam"]),
            ("Module 3 · In practice", ["Regularisation", "Learning-rate schedules", "Debugging training curves"]),
        ),
        "resources": [
            R("Convex Optimization (free book)", "https://web.stanford.edu/~boyd/cvxbook/", "Boyd & Vandenberghe", "book"),
            R("Dive into Deep Learning: optimisation", "https://d2l.ai/chapter_optimization/index.html", "d2l.ai", "book"),
            R("Mathematics for Machine Learning (free book)", "https://mml-book.github.io/", "Deisenroth, Faisal & Ong", "book"),
        ],
    },
    {
        "slug": "data-engineering-university", "level": L.university, "category": "data_engineering", "hours": 14,
        "title": "Data Engineering",
        "description": "Pipelines that move and clean data reliably: storage formats, SQL at scale, scheduling and data quality.",
        "skills": ["data-engineering", "sql", "python", "pipelines"],
        "outline": O(
            ("Module 1 · Storing data", ["Databases, warehouses and lakes", "CSV, JSON and Parquet", "Modelling data for analysis"]),
            ("Module 2 · Pipelines", ["Extract, transform, load", "Scheduling with Airflow", "Batch versus streaming"]),
            ("Module 3 · Quality and scale", ["Data quality tests", "Containers with Docker", "Cost and privacy"]),
        ),
        "resources": [
            R("Data Engineering Zoomcamp", "https://github.com/DataTalksClub/data-engineering-zoomcamp", "DataTalks.Club", "course"),
            R("Apache Airflow documentation", "https://airflow.apache.org/docs/", "Apache Software Foundation", "docs"),
            R("Docker: get started", "https://docs.docker.com/get-started/", "Docker", "docs"),
        ],
    },
    {
        "slug": "ml-reinforcement-learning-university", "level": L.university, "category": "machine_learning", "hours": 16,
        "title": "Machine Learning & Reinforcement Learning",
        "description": "Ensembles, unsupervised learning and model selection, then agents that learn by trial and reward.",
        "skills": ["machine-learning", "reinforcement-learning", "scikit-learn"],
        "outline": O(
            ("Module 1 · Beyond the basics", ["Decision trees, random forests and boosting", "Clustering and dimensionality reduction",
                                               "Cross-validation and leakage"]),
            ("Module 2 · Reinforcement learning", ["Agents, states, actions and rewards", "Markov decision processes", "Q-learning"]),
            ("Module 3 · Deep RL", ["Deep Q-networks", "Policy gradients", "Training an agent in Gymnasium"]),
        ),
        "resources": [
            R("scikit-learn user guide", "https://scikit-learn.org/stable/user_guide.html", "scikit-learn", "docs"),
            R("Reinforcement Learning: An Introduction (free book)", "http://incompleteideas.net/book/the-book-2nd.html", "Sutton & Barto", "book"),
            R("Deep RL course", "https://huggingface.co/learn/deep-rl-course", "Hugging Face", "course"),
            R("Spinning Up in Deep RL", "https://spinningup.openai.com/", "OpenAI", "docs"),
        ],
    },
    {
        "slug": "cnn-rnn-transformers-university", "level": L.university, "category": "deep_learning", "hours": 16,
        "title": "Deep Learning: CNNs, RNNs & Transformers",
        "description": "Build and train modern neural networks in PyTorch: convolutional networks for vision, recurrent "
                       "networks for sequences, attention and transformers.",
        "skills": ["deep-learning", "pytorch", "computer-vision", "transformers"],
        "resources": [
            R("Dive into Deep Learning", "https://d2l.ai/", "d2l.ai", "book"),
            R("PyTorch tutorials", "https://docs.pytorch.org/tutorials/", "PyTorch", "docs"),
            R("CS231n notes", "https://cs231n.github.io/", "Stanford", "course"),
            R("Neural Networks: Zero to Hero", "https://karpathy.ai/zero-to-hero.html", "Andrej Karpathy", "video"),
        ],
    },
    {
        "slug": "nlp-llms-rag-university", "level": L.university, "category": "nlp", "hours": 14,
        "title": "NLP, Large Language Models & RAG",
        "description": "From tokens and embeddings to large language models: prompting, structured output, retrieval-augmented "
                       "generation and evaluating what you build.",
        "skills": ["nlp", "llm", "rag", "embeddings", "python"],
        "resources": [
            R("LLM course", "https://huggingface.co/learn/llm-course", "Hugging Face", "course"),
            R("CS224N: NLP with Deep Learning", "https://web.stanford.edu/class/cs224n/", "Stanford", "course"),
            R("Gemini API: embeddings", "https://ai.google.dev/gemini-api/docs/embeddings", "Google", "docs"),
            R("pgvector", "https://github.com/pgvector/pgvector", "pgvector", "tool"),
        ],
    },
    {
        "slug": "ai-agents-university", "level": L.university, "category": "ai_agents", "hours": 12,
        "title": "Building AI Agents",
        "description": "LLMs that use tools: function calling, planning loops, memory, the Model Context Protocol and keeping "
                       "agents safe and testable.",
        "skills": ["ai-agents", "llm", "python"],
        "outline": O(
            ("Module 1 · From chatbot to agent", ["What makes an agent", "Function calling", "Workflows versus agents"]),
            ("Module 2 · Building blocks", ["Tools and the Model Context Protocol", "Memory and retrieval", "Planning and reflection"]),
            ("Module 3 · Shipping agents", ["Evaluating agents", "Guardrails and prompt injection", "Project: a study-planner agent"]),
        ),
        "resources": [
            R("Building effective agents", "https://www.anthropic.com/research/building-effective-agents", "Anthropic", "article"),
            R("AI Agents course", "https://huggingface.co/learn/agents-course", "Hugging Face", "course"),
            R("Model Context Protocol", "https://modelcontextprotocol.io/", "MCP", "docs"),
            R("Gemini API: function calling", "https://ai.google.dev/gemini-api/docs/function-calling", "Google", "docs"),
        ],
    },
    {
        "slug": "mlops-deployment-university", "level": L.university, "category": "mlops", "hours": 12,
        "title": "MLOps & Model Deployment",
        "description": "Take a model from notebook to production: APIs, containers, experiment tracking, monitoring and CI.",
        "skills": ["mlops", "deployment", "docker", "python"],
        "outline": O(
            ("Module 1 · Reproducible ML", ["Projects, environments and versions", "Experiment tracking with MLflow", "Data and model versioning"]),
            ("Module 2 · Serving", ["A prediction API with FastAPI", "Containers with Docker", "Deploying to the cloud"]),
            ("Module 3 · Operating", ["Monitoring and drift", "CI/CD for models", "Cost, latency and scaling"]),
        ),
        "resources": [
            R("MLOps Zoomcamp", "https://github.com/DataTalksClub/mlops-zoomcamp", "DataTalks.Club", "course"),
            R("Made With ML", "https://madewithml.com/", "Goku Mohandas", "course"),
            R("FastAPI documentation", "https://fastapi.tiangolo.com/", "FastAPI", "docs"),
            R("MLflow documentation", "https://mlflow.org/docs/latest/index.html", "MLflow", "docs"),
        ],
    },
    {
        "slug": "ai-research-product-university", "level": L.university, "category": "research", "hours": 12,
        "title": "AI Research & Product Building",
        "description": "Read papers, run fair experiments and write them up, then turn a model into a product people use.",
        "skills": ["research", "product", "evaluation", "communication"],
        "outline": O(
            ("Module 1 · Research skills", ["Reading a paper in three passes", "Reproducing a result", "Designing fair experiments"]),
            ("Module 2 · Writing and sharing", ["Writing a short paper", "Figures that explain", "Open-sourcing your code"]),
            ("Module 3 · Building a product", ["Finding a real problem", "Human-centred AI design", "Pitching and measuring impact"]),
        ),
        "resources": [
            R("arXiv", "https://arxiv.org/", "Cornell University", "data"),
            R("People + AI Guidebook", "https://pair.withgoogle.com/guidebook/", "Google PAIR", "docs"),
            R("Full Stack Deep Learning", "https://fullstackdeeplearning.com/", "FSDL", "course"),
        ],
    },
]

# Skill tags and library links for the full courses that predate the catalogue (seed_full_courses.FULL_COURSES).
EXTRA_META: dict[str, dict] = {
    "physics-motion-force-energy-school": {
        "skills": ["physics", "maths"],
        "resources": [
            R("Physics simulations", "https://phet.colorado.edu/en/simulations/filter?subjects=physics", "PhET, University of Colorado", "tool"),
            R("Physics", "https://www.khanacademy.org/science/physics", "Khan Academy", "course"),
            R("SSC Physics textbook", "https://nctb.gov.bd/", "NCTB Bangladesh", "book"),
        ],
    },
    "business-fundamentals-college": {
        "skills": ["business", "entrepreneurship", "communication"],
        "resources": [
            R("Entrepreneurship", "https://www.khanacademy.org/college-careers-more/entrepreneurship2", "Khan Academy", "course"),
            R("Muktopaath", "https://muktopaath.gov.bd/", "a2i, Government of Bangladesh", "course"),
        ],
    },
    "git-github-university": {
        "skills": ["git", "developer-tools", "open-source"],
        "resources": [
            R("Pro Git (free book)", "https://git-scm.com/book/en/v2", "Scott Chacon & Ben Straub", "book"),
            R("GitHub Skills", "https://skills.github.com/", "GitHub", "course"),
            R("GitHub Docs", "https://docs.github.com/", "GitHub", "docs"),
        ],
    },
}

# Demo courses from the first MVP, replaced by the catalogue. They are unpublished (not deleted) so progress survives.
RETIRED_DEMO_SLUGS = [
    "what-is-ai-school", "first-steps-coding-school", "python-fundamentals-college", "ai-fundamentals-college",
    "machine-learning-university", "deep-learning-university",
]
