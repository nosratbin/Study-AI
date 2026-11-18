"""Practical projects from the Learning Center plan, as Project Lab challenges (real briefs, not demo content).

Three planned projects already exist as challenges in seed_challenges.py: "Simple AI chatbot" (rule-based-chatbot),
"AI-based quiz application" (python-quiz-game) and "Bangla sentiment analysis" (bangla-sentiment-baseline).
Skills use the same words as course skill tags, so courses can list their related projects.
Health projects are educational prototypes only and say so in the brief.
"""

from app.models import EducationLevel

L = EducationLevel
NEW_COLAB = "https://colab.research.google.com/#create=true"

SUBMIT = """## What to submit
Your Colab or GitHub link (set sharing to "Anyone with the link can view") and a write-up: what you built, how it
works, how you tested it, and one thing you would improve. Only use data you have the right to share."""

PROJECTS: list[dict] = [
    # ---------- School ----------
    {
        "slug": "voice-command-demo", "level": L.school, "title": "Voice command demo", "hours": 2,
        "skills": ["AI basics", "Machine learning", "Audio"],
        "summary": "Train a model in your browser to recognise a few spoken words, then make it control something.",
        "starter": "https://teachablemachine.withgoogle.com/train/audio",
        "brief": f"""## Goal
Teach a computer to recognise 3 spoken commands (for example "left", "right", "stop") and show what it hears.

## Steps
1. Open Teachable Machine and choose **Audio project**.
2. Record background noise, then at least 8 samples of each word. Ask two friends to record too.
3. Train the model and test it with words it has never heard.
4. Export the model, or describe how an app (a game, a light, a robot) could use each command.

## Think about it
Does it work with a different voice, or in a noisy classroom? Why do more varied samples help?

{SUBMIT}""",
    },
    {
        "slug": "image-classifier-school", "level": L.school, "title": "Image classifier: mango, banana or orange?", "hours": 2,
        "skills": ["AI basics", "Machine learning", "Image classification"],
        "summary": "Collect photos, train an image model in the browser and test where it gets confused.",
        "starter": "https://teachablemachine.withgoogle.com/train/image",
        "brief": f"""## Goal
Train an image model that tells three fruits (or three school objects) apart.

## Steps
1. Open Teachable Machine and choose **Image project**.
2. Add 3 classes and capture at least 30 photos per class, from different angles and backgrounds.
3. Train, then test with new photos. Write down every mistake.
4. Add photos to fix the mistakes and train again. Did accuracy improve?

## Think about it
If all your mango photos were taken on a red table, what might the model really be learning?

{SUBMIT}""",
    },
    {
        "slug": "smart-dustbin", "level": L.school, "title": "Smart dustbin (simulated)", "hours": 3,
        "skills": ["Robotics", "IoT", "Electronics"],
        "summary": "Build a dustbin lid that opens when a hand comes near, using a distance sensor and a servo in a simulator.",
        "starter": "https://wokwi.com/projects/new/arduino-uno",
        "brief": f"""## Goal
Make a bin lid open automatically when something is within 20 cm, and close after 3 seconds.

## Steps
1. In Wokwi, add an Arduino Uno, an HC-SR04 ultrasonic sensor and a servo motor.
2. Read the distance from the sensor every 100 ms.
3. If the distance is under 20 cm, turn the servo to 90° (open), wait 3 seconds, then back to 0°.
4. Add an LED that lights while the lid is open.

## Stretch ideas
- Count how many times the bin was used today.
- Add a second sensor that warns when the bin is full.

## What to submit
Your Wokwi project link and a write-up with a photo or sketch of the circuit and how the code decides to open the lid.""",
    },
    # ---------- College ----------
    {
        "slug": "student-performance-prediction", "level": L.college, "title": "Student performance prediction", "hours": 4,
        "skills": ["Python", "pandas", "Machine learning", "Regression"],
        "summary": "Predict final exam marks from study habits with a public dataset, and explain which factors matter.",
        "brief": f"""## Goal
Predict a student's final mark from features such as study time, attendance and past results.

## Steps
1. Load a public dataset, for example the UCI "Student Performance" dataset.
2. Explore it with pandas: missing values, distributions, correlations.
3. Split into train and test sets. Train a linear regression and a decision tree.
4. Compare them with mean absolute error. Which features matter most?

## Think about it
Should a school use a model like this to judge a student? Write 3-4 sentences about fairness and privacy.

{SUBMIT}""",
    },
    {
        "slug": "disease-detection-prototype", "level": L.college, "title": "Disease risk prediction prototype", "hours": 4,
        "skills": ["Machine learning", "Classification", "Evaluation"],
        "summary": "Train a classifier on a public medical dataset and learn why recall matters more than accuracy here.",
        "brief": f"""## Goal
Build a classifier that flags possible diabetes risk from health measurements. This is a learning prototype, never
medical advice.

## Steps
1. Use a public dataset such as the Pima Indians Diabetes dataset (or the breast-cancer dataset built into scikit-learn).
2. Clean impossible values (for example a blood pressure of 0).
3. Train logistic regression and a random forest. Show a confusion matrix for each.
4. Report precision and recall. Which mistake is worse here: a false alarm or a missed case?

## Think about it
Who should make the final decision, and how should the tool explain its prediction?

{SUBMIT}""",
    },
    {
        "slug": "crop-disease-classification", "level": L.college, "title": "Crop disease classification", "hours": 5,
        "skills": ["Deep learning", "Image classification", "Transfer learning"],
        "summary": "Classify leaf photos as healthy or diseased with transfer learning on a public plant dataset.",
        "brief": f"""## Goal
Train an image classifier that recognises common leaf diseases, the kind of tool that could help farmers in Bangladesh.

## Steps
1. Use the public PlantVillage dataset (a subset of 3-5 classes is enough), for example from Kaggle or TensorFlow Datasets.
2. Start from a pre-trained model such as MobileNet and replace the last layer.
3. Train for a few epochs and record validation accuracy.
4. Test with real photos taken outside. What changes compared with the clean dataset images?

## Think about it
What would a farmer need besides a label (advice, Bangla language, offline use)?

{SUBMIT}""",
    },
    {
        "slug": "career-recommender", "level": L.college, "title": "Career recommendation system", "hours": 4,
        "skills": ["Python", "Recommendation", "Data analysis"],
        "summary": "Match students to careers from their interests and skills, and explain every recommendation.",
        "brief": f"""## Goal
Build a small recommender that suggests 3 careers from a student's interests and skills, with a reason for each.

## Steps
1. Make a table of 10-15 careers with the skills and interests each needs.
2. Represent a student as a set of interests and skills.
3. Score each career (for example with Jaccard similarity or a weighted overlap) and return the top 3.
4. Print a reason for each, such as "You like biology and have done 2 data projects".

## Stretch ideas
- Let the student rate suggestions and adjust the weights.
- Compare your rules with a simple ML model.

{SUBMIT}""",
    },
    # ---------- University ----------
    {
        "slug": "bangla-language-model", "level": L.university, "title": "Small Bangla language model", "hours": 10,
        "skills": ["NLP", "LLM", "Transformers", "PyTorch"],
        "summary": "Train a tokenizer and a small GPT-style model on Bangla text, then measure and sample from it.",
        "brief": f"""## Goal
Train a small character- or subword-level transformer language model on openly licensed Bangla text.

## Steps
1. Collect a corpus with a clear licence (for example Bangla Wikipedia dumps). Note its size and source.
2. Train a tokenizer (SentencePiece or Hugging Face `tokenizers`) and look at how it splits Bangla words.
3. Train a small decoder-only transformer (a few million parameters) on a free GPU.
4. Report validation loss or perplexity and generate samples at different temperatures.
5. Optional: fine-tune an existing open multilingual model instead and compare.

## Think about it
What does the model get wrong (grammar, facts, conjuncts)? What would you need for a useful Bangla assistant?

{SUBMIT}""",
    },
    {
        "slug": "healthcare-assistant", "level": L.university, "title": "AI healthcare information assistant", "hours": 8,
        "skills": ["LLM", "RAG", "AI safety", "Evaluation"],
        "summary": "Build a question-answering assistant grounded in trusted health guidance, with strict safety rules.",
        "brief": f"""## Goal
Build an assistant that answers general health questions only from a small set of trusted public documents (for
example WHO fact sheets), cites its sources and refuses to diagnose. Educational prototype only.

## Steps
1. Choose 10-20 trusted documents and split them into chunks.
2. Embed the chunks and retrieve the top matches for each question.
3. Prompt an LLM to answer only from the retrieved text and cite it.
4. Add rules: urgent symptoms get "see a doctor or call emergency services"; no diagnoses, no dosages.
5. Write 20 test questions (including unsafe ones) and score answers for accuracy, citations and refusals.

{SUBMIT}""",
    },
    {
        "slug": "smart-agriculture-prediction", "level": L.university, "title": "Smart agriculture yield prediction", "hours": 8,
        "skills": ["Machine learning", "Data engineering", "Time series"],
        "summary": "Predict crop yield from weather and soil data, and present it as a tool a farmer could use.",
        "brief": f"""## Goal
Predict seasonal crop yield (for example rice) from weather, rainfall and soil features using public data.

## Steps
1. Find public datasets (FAO statistics, NASA POWER weather data, or a Kaggle crop yield dataset). Record the sources.
2. Join and clean the data by region and season.
3. Train a baseline and a gradient-boosted model. Use a time-based split, not a random one.
4. Explain predictions with feature importance or SHAP values.
5. Sketch the interface: what would an extension officer see, and in which language?

{SUBMIT}""",
    },
    {
        "slug": "autonomous-robot-sim", "level": L.university, "title": "Autonomous line-following robot (simulated)", "hours": 8,
        "skills": ["Robotics", "Control", "Computer vision"],
        "summary": "Program a simulated robot to follow a line and avoid obstacles, first with PID, then with a camera.",
        "starter": "https://cyberbotics.com/",
        "brief": f"""## Goal
Make a simulated robot follow a track and stop for obstacles.

## Steps
1. Install the free Webots simulator and open a two-wheeled robot world with a line track.
2. Use ground sensors and a PID controller to follow the line. Tune P, I and D and record lap times.
3. Add a distance sensor so the robot stops or steers around an obstacle.
4. Stretch: replace the ground sensors with the camera and detect the line with OpenCV.

## What to submit
A GitHub repo with your controller code, a short screen recording, and a write-up of how you tuned the controller.""",
    },
    {
        "slug": "traffic-signal-optimisation", "level": L.university, "title": "AI traffic signal management", "hours": 10,
        "skills": ["Reinforcement learning", "Simulation", "Machine learning"],
        "summary": "Simulate a busy junction and compare fixed signal timings with an adaptive or learned controller.",
        "starter": "https://eclipse.dev/sumo/",
        "brief": f"""## Goal
Reduce average waiting time at a simulated four-way junction, the kind of problem Dhaka faces every day.

## Steps
1. Model one junction in the free SUMO traffic simulator with realistic traffic flows.
2. Measure average waiting time and queue length with fixed-time signals.
3. Build an adaptive controller: first a rule (longest queue gets green), then a reinforcement learning agent.
4. Compare all three in a table and a chart across rush hour and off-peak traffic.

{SUBMIT}""",
    },
    {
        "slug": "ai-saas-platform", "level": L.university, "title": "Production-ready AI SaaS app", "hours": 15,
        "skills": ["MLOps", "Deployment", "APIs", "Docker"],
        "summary": "Ship a small AI web service end to end: API, auth, tests, container, deployment and monitoring.",
        "brief": f"""## Goal
Turn one model or LLM feature into a small web service real users could sign up for.

## Steps
1. Pick one useful feature (for example a Bangla summariser or a study-question generator).
2. Build an API with FastAPI: input validation, rate limits, and error messages users understand.
3. Add sign-in and store usage per user in a database.
4. Write tests, package the app with Docker and set up CI to run the tests on every push.
5. Deploy it to a free tier, add logging and a health check, and record cost and latency.

## What to submit
The live URL (if you keep it running), the GitHub repo, and a write-up covering architecture, tests, security
choices and what it costs to run.""",
    },
]
