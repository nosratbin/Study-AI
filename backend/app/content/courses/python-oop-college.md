@module Module 1 · Python foundations
@lesson Setting up and running Python | 15
# Setting up and running Python

Python is the main language of data science and AI because it is readable, has a huge ecosystem (NumPy, pandas, scikit-learn, PyTorch) and runs everywhere.

## Two ways to work

1. **Google Colab** (colab.research.google.com): free notebooks in the browser, with GPUs for later AI work. A notebook mixes code cells and text cells; run a cell with **Shift + Enter**.
2. **Local Python**: install Python 3 from python.org, then use an editor such as VS Code. Run a file with `python my_script.py`.

## Scripts versus notebooks

| Notebook | Script (`.py` file) |
|---|---|
| Great for exploring and showing results | Great for programs you run again and again |
| Cells can run out of order (a common source of bugs) | Runs top to bottom every time |

A useful habit in notebooks: **Runtime → Restart and run all** before you share, to make sure the notebook works from a clean start.

## The interactive prompt

Type `python` in a terminal to get `>>>`. It's a quick calculator and experiment space:

```python
>>> 2 ** 16
65536
>>> "Dhaka".upper()
'DHAKA'
>>> help(len)
```

## Installing packages

```bash
pip install numpy pandas
```

In Colab most packages are already installed; use `!pip install name` inside a cell for others.

## Practice

1. Open a Colab notebook, add a text cell with your name and a code cell that prints `2 ** 100`.
2. Use `help(str.split)` to find out what `split` does, then try `"a,b,c".split(",")`.

@lesson Types, operators and strings | 25
# Types, operators and strings

## Core types

```python
count = 42            # int (any size: 2 ** 200 works)
price = 199.50        # float
name = "Rahim"        # str
ok = True             # bool
nothing = None        # NoneType: "no value"
```

Python is **dynamically typed**: a variable can refer to any type, and the type belongs to the value, not the name.

## Conversions

```python
int("42") + 1        # 43
float("3.5") * 2     # 7.0
str(2026) + "!"      # '2026!'
int(3.99)            # 3 (truncates)
round(3.99)          # 4
```

## Floats are approximate

```python
0.1 + 0.2            # 0.30000000000000004
```

Computers store floats in binary, so some decimals can't be stored exactly. Compare floats with a tolerance: `abs(a - b) < 1e-9`, or `math.isclose(a, b)`. For money, work in whole paisa (integers) or use `decimal.Decimal`.

## Strings

```python
s = "Machine Learning"
len(s)               # 16
s[0], s[-1]          # 'M', 'g'
s[0:7]               # 'Machine'   (slice: start included, stop excluded)
s.lower()            # 'machine learning'
s.replace(" ", "_")  # 'Machine_Learning'
"learn" in s.lower() # True
s.split()            # ['Machine', 'Learning']
"-".join(["2026", "11", "19"])   # '2026-11-19'
```

Strings are **immutable**: methods return a new string; they never change the original.

## f-strings and formatting

```python
gpa = 4.8333
print(f"GPA: {gpa:.2f}")          # GPA: 4.83
print(f"{'Name':<10}|{'Marks':>6}")
print(f"{1234567:,}")             # 1,234,567
```

## Boolean logic and truthiness

`and`, `or`, `not` work as expected. Empty values are "falsy": `0`, `0.0`, `""`, `[]`, `{}`, `None`. Everything else is "truthy":

```python
name = input("Name: ").strip()
if not name:
    print("Please type a name")
```

## Practice

1. Ask for a full name and print the initials in capitals (`"nusrat jahan"` → `"NJ"`).
2. Check whether a word is a palindrome (`"level"`). Hint: `word[::-1]` reverses a string.
3. Print a receipt line for an item with name, quantity and price aligned in columns.

@lesson Control flow and loops | 25
# Control flow and loops

## if / elif / else

```python
def gpa_point(marks: int) -> float:
    if marks >= 80:
        return 5.0
    elif marks >= 70:
        return 4.0
    elif marks >= 60:
        return 3.5
    elif marks >= 50:
        return 3.0
    elif marks >= 40:
        return 2.0
    elif marks >= 33:
        return 1.0
    return 0.0
```

Python also has a compact **conditional expression**: `status = "pass" if marks >= 33 else "fail"`.

## for loops over anything iterable

```python
for ch in "AI":
    print(ch)

for i, subject in enumerate(["Physics", "Chemistry", "Maths"], start=1):
    print(i, subject)

names = ["Ayesha", "Rafi"]
marks = [91, 78]
for name, mark in zip(names, marks):
    print(name, mark)
```

`enumerate` gives the position and the item; `zip` walks through several lists together.

## while, break and continue

```python
while True:
    text = input("Number (or 'q'): ")
    if text == "q":
        break                 # leave the loop
    if not text.isdigit():
        print("Numbers only")
        continue              # skip to the next round
    print(int(text) ** 2)
```

## Nested loops

```python
for row in range(1, 4):
    for col in range(1, 4):
        print(row * col, end="\t")
    print()
```

## Practice

1. Write `gpa_point` and use it to compute the GPA (average of points) for a list of 6 subject marks.
2. Print all prime numbers below 100. (A number is prime if no number from 2 up to its square root divides it.)
3. FizzBuzz: for 1 to 50 print "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for both, otherwise the number.

@module Module 2 · Data structures and functions
@lesson Lists, tuples, sets and dictionaries | 30
# Lists, tuples, sets and dictionaries

| Structure | Syntax | Ordered | Changeable | Duplicates | Use for |
|---|---|---|---|---|---|
| list | `[1, 2, 3]` | yes | yes | yes | a sequence of items |
| tuple | `(1, 2, 3)` | yes | no | yes | fixed records, e.g. `(lat, lon)` |
| set | `{1, 2, 3}` | no | yes | no | unique items, fast membership |
| dict | `{"a": 1}` | yes (insertion) | yes | keys unique | look up values by key |

## Lists

```python
scores = [72, 85, 64]
scores.append(90)
scores.insert(0, 55)
scores.remove(64)
scores.sort(reverse=True)
top3 = scores[:3]
```

**List comprehensions** build lists in one readable line:

```python
squares = [n * n for n in range(10)]
passed = [s for s in scores if s >= 33]
```

## Dictionaries

```python
student = {"name": "Tania", "class": 11, "marks": {"physics": 82, "maths": 91}}
student["district"] = "Khulna"
print(student["marks"]["maths"])           # 91
print(student.get("email", "not given"))   # default if missing

for subject, mark in student["marks"].items():
    print(subject, mark)
```

Counting with a dictionary is a pattern you will use constantly:

```python
text = "the cat and the hat"
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1
# {'the': 2, 'cat': 1, 'and': 1, 'hat': 1}
```

(The standard library's `collections.Counter` does this for you.)

## Sets

```python
a = {"python", "maths", "physics"}
b = {"python", "biology"}
a & b      # {'python'}         intersection
a | b      # union
a - b      # {'maths', 'physics'}
```

## Copying: a common bug

```python
x = [1, 2, 3]
y = x          # y is the SAME list, not a copy
y.append(4)
print(x)       # [1, 2, 3, 4]
z = x.copy()   # a real (shallow) copy
```

## Practice

1. Store 5 students as a list of dictionaries with name and marks, then print them sorted by marks: `sorted(students, key=lambda s: s["marks"], reverse=True)`.
2. Count how often each letter appears in a sentence, ignoring spaces and case.
3. Given two lists of course codes, print the ones both students take.

@lesson Functions done well | 25
# Functions done well

## Parameters, defaults and keywords

```python
def bmi(weight_kg: float, height_m: float, digits: int = 1) -> float:
    """Body-mass index: weight divided by height squared."""
    return round(weight_kg / height_m ** 2, digits)

bmi(60, 1.65)                 # 22.0
bmi(height_m=1.65, weight_kg=60, digits=2)
```

- **Type hints** (`: float`, `-> float`) document what goes in and out. Python doesn't enforce them, but editors and tools use them.
- The **docstring** (first string in the function) explains what it does; `help(bmi)` shows it.
- **Default values** make parameters optional. Never use a mutable default like `def f(items=[])`, because the same list is shared between calls; use `items=None` and create the list inside.

## Returning several values

```python
def stats(numbers: list[float]) -> tuple[float, float, float]:
    return min(numbers), max(numbers), sum(numbers) / len(numbers)

low, high, mean = stats([3, 8, 4])
```

## Scope

Variables created inside a function exist only inside it. A function should get what it needs through **parameters** and give results back with **return**, not by changing global variables.

## *args and **kwargs

```python
def total(*amounts: float) -> float:
    return sum(amounts)

total(10, 20, 30)   # 60
```

## Functions are values

```python
def shout(s): return s.upper() + "!"
actions = [str.lower, shout]
for f in actions:
    print(f("Hello"))

words = ["kiwi", "banana", "fig"]
sorted(words, key=len)      # ['fig', 'kiwi', 'banana']
```

`lambda` creates small unnamed functions: `key=lambda w: w[-1]`.

## Writing good functions

1. One job per function, with a name that says what it does (a verb: `load_marks`, `compute_gpa`).
2. Keep them short enough to read without scrolling.
3. Test them with normal, edge and wrong inputs: what does `stats([])` do? Decide, then handle it.

## Practice

1. Write `compute_gpa(marks: dict[str, int]) -> float` using the `gpa_point` function from earlier.
2. Make `stats` raise a clear error for an empty list: `raise ValueError("need at least one number")`.
3. Sort a list of `(name, gpa)` tuples by GPA, highest first, then by name.

@lesson Files, errors and modules | 25
# Files, errors and modules

## Reading and writing files

```python
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("আমি পাইথন শিখছি\n")
    f.write("I am learning Python\n")

with open("notes.txt", encoding="utf-8") as f:
    for line in f:
        print(line.strip())
```

`with` closes the file automatically, even if an error happens. Always pass `encoding="utf-8"`, especially for Bangla text.

## CSV files

```python
import csv

with open("marks.csv", newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))     # each row is a dict: {'name': 'Rafi', 'marks': '78'}

total = sum(int(r["marks"]) for r in rows)
```

Values from CSV files are **strings**; convert them.

## Handling errors

```python
def read_marks(text: str) -> int:
    try:
        value = int(text)
    except ValueError:
        raise ValueError(f"'{text}' is not a whole number") from None
    if not 0 <= value <= 100:
        raise ValueError("marks must be between 0 and 100")
    return value
```

- `try / except` catches errors you expect and can handle.
- Catch **specific** errors (`ValueError`, `FileNotFoundError`), never a bare `except:` that hides bugs.
- `raise` signals a problem to the caller with a clear message.
- `finally` runs no matter what; `with` usually does that job for files.

## Modules and imports

```python
import math
from statistics import mean, median
from pathlib import Path
import random as rnd

math.sqrt(2)
mean([1, 2, 3])
Path("data").mkdir(exist_ok=True)
```

Your own `.py` file is a module too: put `compute_gpa` in `grades.py` and write `from grades import compute_gpa`.

Put code that should run only when the file is executed directly under:

```python
if __name__ == "__main__":
    main()
```

## Practice

1. Write a CSV of 6 students' marks by hand, then read it and print the class average and the top student.
2. Make the program print a friendly message instead of crashing when the file doesn't exist.
3. Move your grade functions into `grades.py` and import them.

@module Module 3 · Object-oriented programming
@lesson Classes and objects | 30
# Classes and objects

So far data (dicts) and behaviour (functions) have been separate. **Object-oriented programming (OOP)** bundles them together into **objects**.

A **class** is a blueprint; an **object** (instance) is one thing built from it.

```python
class Student:
    def __init__(self, name: str, roll: int):
        self.name = name          # attributes: data stored on the object
        self.roll = roll
        self.marks: dict[str, int] = {}

    def add_mark(self, subject: str, mark: int) -> None:   # methods: behaviour
        if not 0 <= mark <= 100:
            raise ValueError("mark must be 0-100")
        self.marks[subject] = mark

    def average(self) -> float:
        return sum(self.marks.values()) / len(self.marks) if self.marks else 0.0

    def __repr__(self) -> str:
        return f"Student({self.name!r}, roll={self.roll})"


a = Student("Ayesha", 7)
a.add_mark("physics", 88)
a.add_mark("maths", 94)
print(a, a.average())          # Student('Ayesha', roll=7) 91.0
```

- `__init__` runs when you create an object and sets up its attributes.
- `self` is the object the method is working on. `a.average()` is really `Student.average(a)`.
- `__repr__` controls how the object prints, which makes debugging easier.

## Why bother?

- **Encapsulation**: the rule "marks must be 0–100" lives in one place, `add_mark`, so every part of the program respects it.
- **Readable code**: `a.average()` reads like the problem.
- **Many objects, one blueprint**: a class of 40 students is a list of 40 `Student` objects.

## Class attributes

```python
class Student:
    school = "Notre Dame College"     # shared by all students
```

## Dataclasses for simple records

When a class mainly holds data, `dataclasses` writes `__init__` and `__repr__` for you:

```python
from dataclasses import dataclass, field

@dataclass
class Course:
    code: str
    title: str
    credits: float = 3.0
    tags: list[str] = field(default_factory=list)

Course("CSE101", "Intro to Programming")
```

## Practice

1. Write a `BankAccount` class with `deposit`, `withdraw` (refuse to go below 0) and `balance`.
2. Create a `Classroom` class that holds a list of `Student` objects and has `top_student()` and `average()` methods.
3. Rewrite `Course` as a dataclass and create three courses.

@lesson Inheritance, polymorphism and design | 30
# Inheritance, polymorphism and design

## Inheritance: "is a"

A **subclass** gets everything from its **parent class** and can add or change behaviour.

```python
class Person:
    def __init__(self, name: str):
        self.name = name

    def describe(self) -> str:
        return f"{self.name}"


class Student(Person):
    def __init__(self, name: str, level: str):
        super().__init__(name)        # run the parent's setup
        self.level = level

    def describe(self) -> str:        # override
        return f"{self.name}, {self.level} student"


class Teacher(Person):
    def __init__(self, name: str, subject: str):
        super().__init__(name)
        self.subject = subject

    def describe(self) -> str:
        return f"{self.name}, teaches {self.subject}"
```

## Polymorphism: same call, different behaviour

```python
people = [Student("Mitu", "college"), Teacher("Mr. Karim", "Physics")]
for p in people:
    print(p.describe())
```

The loop doesn't care what kind of person each object is; each one knows how to describe itself.

## Composition: "has a"

Inheritance is not the only tool. Often it's simpler for an object to **contain** other objects:

```python
class Course:
    def __init__(self, title: str, teacher: Teacher):
        self.title = title
        self.teacher = teacher        # a Course HAS a Teacher
        self.students: list[Student] = []

    def enrol(self, s: Student) -> None:
        self.students.append(s)
```

Rule of thumb: use inheritance for a true "is a" relationship (a `Student` *is a* `Person`) and composition for "has a" (a `Course` *has* students). Deep inheritance trees are hard to change.

## Special methods

Classes can work with Python's built-in operations:

```python
@dataclass
class Vector:
    x: float
    y: float

    def __add__(self, other: "Vector") -> "Vector":
        return Vector(self.x + other.x, self.y + other.y)

    def __len__(self) -> int:
        return 2

Vector(1, 2) + Vector(3, 4)      # Vector(x=4, y=6)
```

This is exactly how NumPy arrays and PyTorch tensors make `a + b` work.

## Design checklist

1. Each class has one clear responsibility.
2. Objects protect their own rules (validation in methods, not scattered everywhere).
3. Prefer composition; use inheritance when the "is a" test is true.
4. Names describe the real-world thing: `Course`, `enrol`, not `Data2`, `doStuff`.

## Mini project: a library system

Build `Book`, `Member` and `Library` classes. A library has books and members; members can borrow up to 3 books; a borrowed book can't be borrowed again until it's returned. Print a report of who has which book.

## What's next

You now know the Python used throughout data science and AI. Continue with **Machine Learning: Regression & Classification**, and try the **Career recommendation system** project in the Project Lab.
