@module Module 1 · What is AI?
@lesson AI is all around you | 15
# AI is all around you

**Artificial intelligence (AI)** is the ability of a computer program to do tasks that normally need human intelligence: recognising faces, understanding speech, translating languages or suggesting what to watch next.

## You already use AI

| Where | What the AI does |
|---|---|
| Google Maps | Predicts traffic and finds the fastest route |
| YouTube / Facebook | Predicts which videos or posts you will like |
| Phone keyboard | Predicts your next word |
| Phone camera | Finds faces and sharpens photos |
| Google Translate | Translates Bangla to English and back |
| Bank SMS alerts | Spots payments that look like fraud |

Notice the word **predict**. Most AI today makes predictions from patterns it has seen before.

## AI is not magic, and it is not a person

AI systems do not "think" or "feel" like humans. A chatbot that writes a friendly reply has learned patterns of language from huge amounts of text. It can sound confident and still be wrong.

## Narrow AI and general AI

- **Narrow AI** does one kind of task well: playing chess, recognising speech, recommending songs. All AI you use today is narrow AI.
- **General AI** would be able to learn and do almost any task a human can. It does not exist yet, and experts disagree about when, or whether, it will.

## Rules versus learning

There are two ways to make a computer do something "smart":

1. **Write rules**: *if the message contains "lottery winner", mark it as spam.* Simple, but people find ways around rules, and there are too many cases to write by hand.
2. **Learn from examples**: show the computer thousands of messages labelled *spam* or *not spam*, and let it find the patterns itself. This is **machine learning**, the main way AI is built today.

## Practice

1. List five apps you or your family use. For each, write what it might be predicting.
2. Write three rules that would detect a spam SMS. Then think of a spam message that would break all three rules.

@lesson How machines learn from examples | 20
# How machines learn from examples

Imagine teaching a younger cousin to tell mangoes from oranges. You don't give a rulebook. You show them many fruits and say the name each time. Soon they can name fruits they have never seen.

Machine learning works the same way.

## The three ingredients

1. **Data**: lots of examples (photos, numbers, text, sounds).
2. **Labels**: the right answer for each example ("mango", "orange").
3. **A learning algorithm**: a method that adjusts the model until its guesses match the labels.

The result is a **model**: a program that can make predictions on new examples.

## Features

The details the model uses to decide are called **features**.

| Fruit | Colour | Shape | Skin | Label |
|---|---|---|---|---|
| 1 | yellow-green | oval | smooth | mango |
| 2 | orange | round | bumpy | orange |
| 3 | green | oval | smooth | mango |

From examples like these, the model might learn: *oval and smooth → probably mango*.

## Training and testing

We split the examples into two groups:

- **Training data** (around 80%): the model learns from these.
- **Test data** (around 20%): kept hidden during learning, then used to check how well the model works on examples it has **never seen**.

Testing on the training data is like a student who memorised the answers to last year's paper. It tells you nothing about whether they understand.

## Three kinds of machine learning

| Kind | How it learns | Example |
|---|---|---|
| **Supervised** | from labelled examples | Is this email spam? |
| **Unsupervised** | finds groups without labels | Group customers who buy similar things |
| **Reinforcement** | by trial, reward and penalty | A program learning to play a game |

## Practice

1. Choose a problem: "Is this photo a cat or a dog?" What would the data, labels and features be?
2. Why do we keep some data hidden for testing?
3. Which kind of machine learning would you use to teach a robot to walk? Why?

@lesson Train your own model | 30
# Train your own model

You can train a real machine learning model in your browser with **Teachable Machine** (teachablemachine.withgoogle.com), a free tool from Google. Nothing to install and no code needed.

## Build an image model

1. Open Teachable Machine and click **Get started → Image project → Standard image model**.
2. Rename *Class 1* and *Class 2*, for example to **Pen** and **Pencil**. Add a third class: **Nothing** (just the background).
3. Use the **Webcam** button to record about 50 pictures for each class. Move the object around: different angles, near and far, different hands.
4. Click **Train model** and wait.
5. In the **Preview** panel, hold up each object. The bars show how confident the model is for each class.

## Test it fairly

Now test with things the model has not seen:

- A different pen, or a pen of a different colour.
- A darker room, or a different background.
- A friend's hand instead of yours.

Write down every mistake. Most mistakes happen because the training pictures were **not varied enough**.

## Improve it

Add more varied pictures to the classes that get confused and train again. This loop is what AI engineers do every day:

> collect data → train → test → find mistakes → collect better data → train again

## Confidence is not correctness

The model always picks the class it thinks is most likely, even for an object it was never trained on. Hold up your phone: it may say "Pen: 80%". That is why real systems need a "none of these" class and humans checking important decisions.

## Practice

1. Train a model with three classes of your choice and test it with five new objects.
2. Record how many it got right before and after adding more varied photos.
3. Try an **Audio project**: teach it to tell a clap from a whistle.

@module Module 2 · How AI makes decisions
@lesson Patterns, predictions and mistakes | 20
# Patterns, predictions and mistakes

## A model is a pattern-finder

Suppose we record hours studied and exam marks for 8 students:

| Hours studied | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Marks | 35 | 42 | 50 | 55 | 63 | 70 | 76 | 84 |

The pattern: about **7 extra marks for each extra hour**, starting from about 28. A simple model is:

> marks ≈ 28 + 7 × hours

For 9 hours it predicts 28 + 63 = **91**. This kind of model, a straight line through the data, is called **linear regression**. Machine learning finds the best line automatically from the data.

## Predictions are guesses

Real data is messy. A student who studied 5 hours might score 50 because they were ill. A model gives the **most likely** answer, not a guaranteed one.

## Measuring accuracy

For a yes/no model (for example, "Will it rain tomorrow?"):

> **Accuracy** = correct predictions ÷ total predictions

If a model is right 45 times out of 50, its accuracy is 45 ÷ 50 = **90%**.

## When accuracy fools you

Imagine only 2 out of 100 patients have a rare disease. A lazy model that always says "healthy" is **98% accurate**, yet it misses every sick patient. So we also ask:

- Of the people who were really sick, how many did the model catch?
- Of the people the model flagged, how many were really sick?

Which mistake is worse depends on the problem. Missing a sick patient is worse than a false alarm.

## Practice

1. Use the model *marks ≈ 28 + 7 × hours* to predict the marks for 0 hours and 10 hours. Do both answers make sense?
2. A spam filter checked 200 messages and got 180 right. What is its accuracy?
3. For a fire alarm, which is worse: a false alarm or a missed fire? Explain.

@lesson Neural networks in plain words | 20
# Neural networks in plain words

Many powerful AI systems, from face recognition to chatbots, use **neural networks**, loosely inspired by the brain.

## A single artificial neuron

A neuron takes some numbers in, gives each one a **weight** (how important it is), adds them up, and decides how strongly to "fire".

Example: should you go outside to play football?

| Input | Value | Weight |
|---|---|---|
| Is it sunny? | 1 (yes) | +3 |
| Is homework finished? | 0 (no) | +4 |
| Is it raining? | 0 (no) | −5 |

Score = 1×3 + 0×4 + 0×(−5) = **3**. If the score is above a threshold, say 5, the neuron says "go". Here 3 < 5, so: stay in and finish homework.

**Learning** means adjusting the weights. If the network makes a mistake, the weights are nudged a little so it would do better next time. After thousands of examples, the weights capture the pattern.

## Layers

A neural network connects many neurons in **layers**:

- The **input layer** takes the raw data, for example the brightness of every pixel in a photo.
- **Hidden layers** find patterns: early layers find edges, later ones find shapes like eyes or wheels.
- The **output layer** gives the answer, for example "cat 92%, dog 8%".

Networks with many hidden layers are called **deep learning**.

## Large language models

Chatbots like Gemini or ChatGPT are very large neural networks trained on huge amounts of text to predict **the next word**. Doing that well lets them answer questions, write and translate. But because they predict likely words, they can also produce confident answers that are false. This is called **hallucination**. Always check important facts.

## Practice

1. Change the weights in the football example so that the neuron says "go" even when homework is not finished. Is that a good decision-maker?
2. Ask an AI chatbot a question you know the answer to (for example about your district). Did it make any mistakes?

@module Module 3 · Using AI well
@lesson Fairness and bias | 20
# Fairness and bias

AI learns from data. If the data is unfair or incomplete, the AI becomes unfair too. This is called **bias**.

## How bias gets in

- **Missing people**: a face-recognition system trained mostly on light-skinned faces works worse on darker skin.
- **Old unfair decisions**: if a company hired mostly men in the past and an AI learns from those decisions, it may prefer men.
- **Language gaps**: AI tools usually work better in English than in Bangla, because there is far more English text online.

## Real example

Research in 2018 tested commercial face-analysis systems. They were almost always right for lighter-skinned men but made far more errors for darker-skinned women. The companies improved their systems after the results were published.

## How to make AI fairer

1. **Collect diverse data**: different ages, skin tones, accents, regions, rural and urban.
2. **Test on every group**, not just the average. A 95% average can hide a group where the model fails.
3. **Keep humans involved** in important decisions like jobs, loans or exam results.
4. **Be open**: explain what the AI is used for and how people can complain.

## Practice

1. You are building a model to recognise Bangla handwriting. Whose handwriting should you collect? List at least four kinds of variety.
2. Think of one place where an unfair AI could harm a student. What check would you add?

@lesson Privacy, safety and honest use | 20
# Privacy, safety and honest use

## Protect personal information

Many AI tools save what you type and may use it to improve their systems. Before you type, ask: *would I be happy for a stranger to read this?*

Never share with an AI chatbot or any app you don't trust:

- Passwords, PINs or one-time codes (OTPs)
- Your home address or phone number
- Photos of your NID, birth certificate or bank card
- Private details about friends or family

## Deepfakes and fake news

AI can create realistic fake photos, voices and videos (**deepfakes**). Before you share something surprising:

1. **Check the source**: is it a known news outlet or official page?
2. **Look for other sources** reporting the same thing.
3. **Look closely**: strange hands, blurry teeth, odd lighting, or a voice with no breathing can be signs of AI.
4. **Pause**: if a message makes you very angry or scared, it may be designed to.

## Using AI for schoolwork honestly

AI can be a great study partner, if you use it to **learn**, not to avoid learning.

| Good use | Not honest |
|---|---|
| "Explain photosynthesis in simple words" | Copying an AI answer as your own homework |
| "Give me 5 practice questions on fractions" | Using AI in a test when it isn't allowed |
| "Check my essay for grammar mistakes" | Submitting an AI-written essay as yours |

When you use AI help, say so, and always check the facts.

## Your AI checklist

- Is this information correct? (Check it.)
- Is this fair to everyone it affects?
- Am I protecting my and others' privacy?
- Would I be comfortable telling my teacher how I used AI?

## What's next

Try the **Image classifier** and **Voice command demo** projects in the Project Lab, and the **AI & Coding Basics** assessment. When you are ready, continue to **Coding with Scratch & Python** if you haven't, or to the college-level **Python Programming & OOP** course.
