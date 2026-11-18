@module Module 1 · The machine learning workflow
@lesson What a model really learns | 20
# What a model really learns

In **supervised learning** we have examples of inputs **X** (features) and correct outputs **y** (labels), and we want a function *f* so that *f(X) ≈ y* for **new** examples, not just the ones we trained on.

| Task | Output | Example |
|---|---|---|
| **Regression** | a number | Predict a flat's rent from its size and area |
| **Classification** | a category | Predict whether a loan will be repaid (yes/no) |

## The workflow

1. **Define the problem**: what exactly are we predicting, and how will the prediction be used?
2. **Get data** and understand it.
3. **Split** into training and test sets.
4. **Prepare** features (clean, encode, scale).
5. **Train** a simple baseline, then better models.
6. **Evaluate** on data the model has never seen.
7. **Improve**, then evaluate on the test set **once** at the end.

## Generalisation

A model that memorises the training data can score 100% there and still fail on new data. This is **overfitting**. A model too simple to capture the pattern is **underfitting**.

| | Training score | Test score |
|---|---|---|
| Underfitting | low | low |
| Good fit | high | high (a bit lower) |
| Overfitting | very high | much lower |

## Tools

We'll use **scikit-learn** (`sklearn`), the standard Python library for classic machine learning, plus **pandas** for data. Every scikit-learn model has the same interface:

```python
model.fit(X_train, y_train)     # learn
model.predict(X_test)           # predict
model.score(X_test, y_test)     # default metric
```

## Practice

1. Is each task regression or classification? (a) next month's electricity bill, (b) whether a mango is ripe, (c) a student's HSC GPA, (d) which of 10 diseases a leaf has.
2. A model scores 99% on training data and 61% on test data. What is happening, and what would you try?

@lesson Exploring data with pandas | 25
# Exploring data with pandas

Before training anything, **look at the data**. Most problems in machine learning come from data, not algorithms.

We'll use the California housing dataset that comes with scikit-learn (house values by district, from the 1990 US census) so everyone has the same data:

```python
import pandas as pd
from sklearn.datasets import fetch_california_housing

data = fetch_california_housing(as_frame=True)
df = data.frame
df.head()
```

## First questions to ask

```python
df.shape              # (20640, 9): rows, columns
df.info()             # column types and missing values
df.describe()         # count, mean, std, min, quartiles, max
df.isna().sum()       # missing values per column
```

The target column is `MedHouseVal` (median house value in units of $100,000).

## Distributions and relationships

```python
import matplotlib.pyplot as plt

df["MedHouseVal"].hist(bins=50)
plt.title("Median house value"); plt.show()

df.corr(numeric_only=True)["MedHouseVal"].sort_values(ascending=False)
```

`MedInc` (median income) has the strongest correlation with house value (about 0.69). Correlation measures a **linear** relationship and does **not** prove cause.

```python
df.plot.scatter(x="MedInc", y="MedHouseVal", alpha=0.1)
```

Notice a horizontal line at the top of the plot: values were **capped** at 5.0. A model can never learn to predict above it. Spotting things like this is why we explore first.

## Data problems to look for

- Missing values, duplicates, impossible values (age −3, marks 105).
- Capped or rounded values.
- Columns that **leak** the answer (e.g. "final grade" when predicting "will pass").
- Very different scales (income in thousands, rooms in single digits).

## Practice

1. Which three features correlate most with `MedHouseVal`?
2. Plot `AveRooms`. Are there extreme values? How might they affect a model?
3. Write two sentences describing what a single row in this dataset represents.

@lesson Train/test split and baselines | 20
# Train/test split and baselines

## Split first

```python
from sklearn.model_selection import train_test_split

X = df.drop(columns="MedHouseVal")
y = df["MedHouseVal"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
```

- `test_size=0.2` keeps 20% aside.
- `random_state` makes the split repeatable.
- For classification add `stratify=y` so both sets have the same class proportions.

From now on, **don't look at the test set** while making decisions. If you tune your model against it, the test score stops being an honest estimate.

## Always start with a baseline

A **baseline** is the simplest possible prediction. If your model can't beat it, something is wrong.

```python
from sklearn.dummy import DummyRegressor
from sklearn.metrics import mean_absolute_error

base = DummyRegressor(strategy="mean").fit(X_train, y_train)
print(mean_absolute_error(y_test, base.predict(X_test)))   # about 0.91
```

Predicting the average price for every district is wrong by about 0.91 (≈ $91,000) on average. Now we have a number to beat.

For classification, the baseline is "always predict the most common class": `DummyClassifier(strategy="most_frequent")`.

## Validation sets and cross-validation

To compare models *without* touching the test set, split the training data again, or better, use **k-fold cross-validation**: train on k−1 parts, validate on the remaining part, rotate, and average.

```python
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LinearRegression

scores = cross_val_score(LinearRegression(), X_train, y_train, cv=5, scoring="neg_mean_absolute_error")
print(-scores.mean())
```

(scikit-learn maximises scores, so error metrics are negated.)

## Practice

1. Run the baseline and record its MAE.
2. Run 5-fold cross-validation for `LinearRegression`. Does it beat the baseline?
3. Why would splitting **after** scaling the whole dataset be a mistake?

@module Module 2 · Regression
@lesson Linear regression | 30
# Linear regression

Linear regression predicts with a weighted sum of the features:

> ŷ = w₁x₁ + w₂x₂ + … + wₙxₙ + b

Training finds the weights **w** and bias **b** that minimise the **mean squared error** on the training data:

> MSE = (1/n) Σ (yᵢ − ŷᵢ)²

Squaring makes every error positive and punishes big errors more.

## In scikit-learn

```python
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

lin = LinearRegression().fit(X_train, y_train)
pred = lin.predict(X_test)

print("MAE ", mean_absolute_error(y_test, pred))      # about 0.53
print("RMSE", root_mean_squared_error(y_test, pred))  # about 0.75
print("R²  ", r2_score(y_test, pred))                 # about 0.58
```

(`root_mean_squared_error` is in scikit-learn 1.4+. In older versions use `mean_squared_error(y_test, pred) ** 0.5`.)

## Regression metrics

| Metric | Meaning | Note |
|---|---|---|
| **MAE** | average absolute error | in the target's units; easy to explain |
| **RMSE** | square root of MSE | punishes large errors more |
| **R²** | share of variance explained | 1 is perfect; 0 = as good as predicting the mean |

Our MAE dropped from 0.91 (baseline) to about 0.53: a real improvement.

## Reading the weights

```python
pd.Series(lin.coef_, index=X.columns).sort_values()
```

A positive weight means "higher feature → higher prediction, **holding the others fixed**". Be careful: if features are correlated (rooms and bedrooms) weights can be misleading, and they still don't prove causation.

## Feature scaling

Features on very different scales don't change plain linear regression's predictions, but they matter for regularised models, gradient descent, k-NN and SVMs. Standardise with `StandardScaler` (mean 0, standard deviation 1), fitted **only on the training data**. The next lesson shows how pipelines do this safely.

## Regularisation

**Ridge** (L2) and **Lasso** (L1) add a penalty on large weights to reduce overfitting:

```python
from sklearn.linear_model import Ridge
Ridge(alpha=1.0).fit(X_train, y_train)
```

A larger `alpha` means a stronger penalty and a simpler model. Lasso can push some weights to exactly zero, which selects features.

## Practice

1. Train `LinearRegression` and report MAE, RMSE and R² on the test set.
2. Which feature has the largest positive weight? Does that make sense?
3. Try `Ridge` with `alpha` in `[0.1, 1, 10, 100]` using cross-validation on the training set.

@lesson Pipelines, categorical data and trees | 30
# Pipelines, categorical data and trees

## Pipelines prevent leakage

A **pipeline** chains preprocessing and a model, so preprocessing is learned from the training folds only, and the whole thing behaves like one model.

```python
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge

pipe = make_pipeline(StandardScaler(), Ridge(alpha=1.0))
pipe.fit(X_train, y_train)
pipe.score(X_test, y_test)
```

Inside cross-validation, the scaler is re-fitted on each training fold automatically.

## Categorical features

Models need numbers. For a column like `district = ["Dhaka", "Sylhet", ...]`, use **one-hot encoding**: one 0/1 column per category.

```python
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer

numeric = ["area_sqft", "rooms", "floor"]
categorical = ["district", "furnished"]

prep = ColumnTransformer([
    ("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), numeric),
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
])
model = make_pipeline(prep, Ridge())
```

`handle_unknown="ignore"` stops the model from crashing on a district it never saw in training. `SimpleImputer` fills missing values using statistics from the training data.

## Decision trees

A **decision tree** learns a flowchart of yes/no questions:

```
MedInc <= 5.0?
├── yes: AveOccup <= 2.5? ...
└── no:  MedInc <= 7.5? ...
```

```python
from sklearn.tree import DecisionTreeRegressor
tree = DecisionTreeRegressor(max_depth=6, random_state=42).fit(X_train, y_train)
```

- Trees need no scaling and handle non-linear patterns.
- A deep tree memorises the training data (overfits). Limit `max_depth` or `min_samples_leaf`.

## Ensembles: many trees are better than one

- **Random forest**: many trees, each trained on a random sample of rows and features; their predictions are averaged.
- **Gradient boosting**: trees added one at a time, each fixing the errors of the previous ones.

```python
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor

rf = RandomForestRegressor(n_estimators=200, n_jobs=-1, random_state=42).fit(X_train, y_train)
gb = HistGradientBoostingRegressor(random_state=42).fit(X_train, y_train)
```

On California housing, both cut the MAE well below linear regression (to roughly 0.3–0.35). Ensembles of trees are often the strongest choice for tables of data.

## Practice

1. Compare linear regression, a depth-6 tree, a random forest and gradient boosting with 5-fold cross-validation. Make a table of MAE.
2. Plot the training and validation MAE of a decision tree for `max_depth` from 1 to 20. Where does overfitting start?
3. Look at `rf.feature_importances_`. Which features matter most?

@module Module 3 · Classification
@lesson Logistic regression and k-nearest neighbours | 30
# Logistic regression and k-nearest neighbours

We'll use the breast-cancer dataset built into scikit-learn: 569 tumour samples, 30 measurements each, labelled malignant (0) or benign (1). It's a learning dataset; real medical tools need far more validation and regulatory approval.

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split

X, y = load_breast_cancer(return_X_y=True, as_frame=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
```

## Logistic regression

Despite the name, it's a **classifier**. It computes a weighted sum like linear regression, then squashes it into a probability between 0 and 1 with the **sigmoid** function:

> p = 1 / (1 + e^(−(w·x + b)))

If p ≥ 0.5 it predicts class 1. Training minimises **log loss**, which heavily punishes confident wrong answers.

```python
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

logreg = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)).fit(X_train, y_train)
print(logreg.score(X_test, y_test))           # accuracy, about 0.97–0.99
print(logreg.predict_proba(X_test[:3]))       # probabilities for each class
```

## k-nearest neighbours (k-NN)

To classify a new point, find the **k** most similar training examples and take a majority vote. There's no training step beyond storing the data.

```python
from sklearn.neighbors import KNeighborsClassifier
knn = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5)).fit(X_train, y_train)
```

- Scaling is essential: distance would otherwise be dominated by the largest feature.
- Small k → wiggly boundary that overfits; large k → smooth boundary that may underfit.
- Prediction is slow on large datasets, because it compares against every stored example.

## Multi-class

Both models handle more than two classes directly, e.g. the iris dataset (3 flower species) or handwritten digits (10 classes): `load_digits()`.

## Practice

1. Train logistic regression and k-NN (k = 1, 5, 15) and compare test accuracy.
2. Show the five test samples where logistic regression was least confident (probability closest to 0.5).
3. Train logistic regression on `load_digits()`. Which digits get confused most?

@lesson Evaluating classifiers honestly | 30
# Evaluating classifiers honestly

Accuracy alone can mislead, especially when one class is rare.

## The confusion matrix

For a "positive" class (say *disease*):

| | Predicted positive | Predicted negative |
|---|---|---|
| **Actually positive** | True positive (TP) | False negative (FN) |
| **Actually negative** | False positive (FP) | True negative (TN) |

```python
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, classification_report

pred = logreg.predict(X_test)
print(confusion_matrix(y_test, pred))
ConfusionMatrixDisplay.from_predictions(y_test, pred)
print(classification_report(y_test, pred))
```

## Precision, recall and F1

- **Precision** = TP / (TP + FP): of everything we flagged, how much was right?
- **Recall** = TP / (TP + FN): of all real positives, how many did we catch?
- **F1** = harmonic mean of precision and recall: one number that's only high when both are.

Which matters more depends on the cost of each mistake:

| Problem | Worse mistake | Prioritise |
|---|---|---|
| Cancer screening | missing a case (FN) | recall |
| Spam filter | losing a real email (FP) | precision |
| Fraud alerts | both are costly | F1, plus human review |

## Thresholds

`predict` uses a 0.5 probability threshold. You can move it:

```python
proba = logreg.predict_proba(X_test)[:, 0]           # probability of malignant (class 0)
flag_malignant = proba >= 0.2                        # more cautious: higher recall for malignant
```

Lowering the threshold catches more positives (higher recall) but raises more false alarms (lower precision). The **ROC curve** and **precision–recall curve** show this trade-off across all thresholds; **ROC AUC** summarises it in one number (0.5 = random guessing, 1 = perfect).

```python
from sklearn.metrics import RocCurveDisplay
RocCurveDisplay.from_estimator(logreg, X_test, y_test)
```

## Imbalanced data

If only 2% of transactions are fraud, a model that never predicts fraud is 98% accurate and useless. Use precision/recall/F1, a **stratified** split, and consider `class_weight="balanced"` in the model.

## Fairness check

Compute your metrics separately for each relevant group (for example by gender or district) when the data allows it. A good average can hide a group where the model fails badly.

## Practice

1. For logistic regression on the breast-cancer data, report precision and recall for the malignant class.
2. Choose a threshold that gives at least 98% recall for malignant tumours. What happens to precision?
3. Explain to a non-technical friend, in three sentences, why a 95% accurate model might still be bad.

@lesson Tuning and finishing a project | 25
# Tuning and finishing a project

## Hyperparameters

**Parameters** are learned from data (weights, tree splits). **Hyperparameters** are choices you make before training (`max_depth`, `alpha`, `n_neighbors`). Tune them with cross-validation on the **training set only**:

```python
from sklearn.model_selection import GridSearchCV

pipe = make_pipeline(StandardScaler(), KNeighborsClassifier())
grid = GridSearchCV(pipe, {"kneighborsclassifier__n_neighbors": [1, 3, 5, 9, 15, 25]},
                    cv=5, scoring="f1")
grid.fit(X_train, y_train)
print(grid.best_params_, grid.best_score_)
```

For many hyperparameters, `RandomizedSearchCV` tries random combinations and is usually much faster for the same quality.

## The final test

After choosing the model and its settings:

1. Retrain on the full training set (`GridSearchCV` does this automatically with `refit=True`).
2. Evaluate **once** on the test set.
3. Report that number, along with the baseline, and don't go back to tune further. If you do, the test set is no longer honest.

## Save and reuse a model

```python
import joblib
joblib.dump(grid.best_estimator_, "model.joblib")
model = joblib.load("model.joblib")
```

Because it's a pipeline, the saved file includes the scaler, so new data is processed exactly as in training. Only load model files you created or trust: loading a joblib/pickle file can run code.

## A checklist for every ML project

- [ ] The problem and how predictions will be used are written down.
- [ ] Data explored: missing values, outliers, leakage checked.
- [ ] Train/test split made before any fitting; stratified for classification.
- [ ] A baseline score recorded.
- [ ] Preprocessing inside a pipeline.
- [ ] Models compared with cross-validation.
- [ ] Metrics chosen for the real cost of mistakes, checked per group where relevant.
- [ ] Test set used once; final results reported honestly, including limitations.

## What's next

Apply this to the **Student performance prediction** and **Disease risk prediction prototype** projects in the Project Lab. Then continue with **Intro to Deep Learning & NLP**, or at university, **Deep Learning: CNNs, RNNs & Transformers**.
