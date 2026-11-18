@module Module 1 · Thinking like a programmer with Scratch
@lesson What is a program? | 15
# What is a program?

A **program** is a list of instructions that a computer follows exactly, one after another. Computers are fast, but they are not clever: they do *exactly* what you say, even when you meant something else.

## Instructions must be precise

Imagine telling a friend how to make a cup of tea:

1. Boil water.
2. Put a tea bag in a cup.
3. Pour the hot water into the cup.
4. Wait three minutes, then remove the tea bag.

A person fills in the gaps ("which cup?", "how much water?"). A computer cannot. Programmers break problems into small, exact steps. This is called an **algorithm**.

## Three ideas in every program

| Idea | Meaning | Everyday example |
|---|---|---|
| **Sequence** | Steps happen in order | Put on socks, then shoes |
| **Repetition** (loops) | Repeat steps | Stir 10 times |
| **Selection** (decisions) | Choose what to do | *If* it rains, take an umbrella |

Every app on your phone, from a game to Google Maps, is built from these three ideas.

## Bugs

When a program does something you did not expect, it has a **bug**. Finding and fixing bugs is called **debugging**. Every programmer writes bugs; good programmers test often so they find them early.

## Practice

1. Write an algorithm (5–8 exact steps) for brushing your teeth.
2. Swap two of your steps. What goes wrong? That is a bug caused by **sequence**.
3. Which of your steps could be a **loop**? Which could be a **decision**?

@lesson Your first Scratch project | 25
# Your first Scratch project

**Scratch** is a free programming language from MIT. You build programs by snapping blocks together, so you can focus on ideas instead of typing. Open it at **scratch.mit.edu** and click **Create**. You don't need an account to try it.

## The Scratch screen

- **Stage** (top right): where your project runs.
- **Sprites** (below the stage): the characters. The cat is a sprite.
- **Block palette** (left): blocks grouped by colour, e.g. *Motion* (blue), *Looks* (purple), *Events* (yellow), *Control* (orange).
- **Code area** (middle): drag blocks here and snap them together.

## Make the cat move and talk

Build this script for the cat:

```
when green flag clicked
say [Hello! I'm learning to code.] for (2) seconds
move (100) steps
play sound (Meow) until done
```

Click the green flag. The blocks run **top to bottom**: that is **sequence**.

## Events start scripts

Yellow **Events** blocks start a script: *when green flag clicked*, *when this sprite clicked*, *when [space] key pressed*. A sprite can have several scripts that start on different events.

Try adding:

```
when [space] key pressed
turn right (15) degrees
```

## Coordinates

The stage is a grid. The centre is **x: 0, y: 0**. x goes from −240 (left) to 240 (right); y goes from −180 (bottom) to 180 (top). The block `go to x: (0) y: (0)` puts a sprite back in the middle, which is useful at the start of every project.

## Practice

1. Make the cat say your name, then glide to the top-right corner with `glide (1) secs to x: (200) y: (150)`.
2. Add a second sprite that says something when it is clicked.
3. Add `go to x: (0) y: (0)` at the start so the project always starts the same way.

@lesson Loops and decisions in Scratch | 25
# Loops and decisions in Scratch

## Loops: repeat without copying

Instead of dragging *move 10 steps* twenty times, use a loop from **Control**:

```
when green flag clicked
repeat (20)
    move (10) steps
    next costume
end
```

`next costume` switches between the cat's two pictures, so it looks like it is walking. **forever** repeats until you press the red stop sign. Games usually run inside a `forever` loop.

## Decisions: if … then

Decisions use **if** blocks with a **condition** (a hexagon-shaped block that is true or false):

```
when green flag clicked
forever
    move (5) steps
    if <touching (edge)?> then
        turn right (180) degrees
    end
end
```

The cat walks until it touches the edge, then turns around.

## Keyboard control

```
when green flag clicked
forever
    if <key (right arrow) pressed?> then
        change x by (10)
    end
    if <key (left arrow) pressed?> then
        change x by (-10)
    end
end
```

## Practice: Catch the apple

1. Add an **Apple** sprite. Make it start at the top: `go to x: (pick random -200 to 200) y: (170)`.
2. In a `forever` loop, make it fall with `change y by (-5)`.
3. If it touches the cat, go back to the top. If its y position is below −170, also go back to the top.
4. Control the cat with the arrow keys.

You have just used sequence, loops and decisions together.

@lesson Variables and a scoring game | 25
# Variables and a scoring game

A **variable** is a named box that stores a value that can change, like a score, a number of lives or a player's name.

## Make a score

1. Go to **Variables** and click **Make a Variable**. Name it `score`.
2. At the start, set it: `set [score] to (0)`.
3. When the cat catches the apple: `change [score] by (1)`.

The score appears on the stage automatically.

## Lives and game over

Make another variable, `lives`:

```
when green flag clicked
set [score] to (0)
set [lives] to (3)
forever
    if <(lives) = (0)> then
        say [Game over!] for (2) seconds
        stop [all]
    end
end
```

In the apple's script, when it falls past the bottom, `change [lives] by (-1)`.

## Speed up as you score

Variables can control other things. Make the apple fall faster as the score grows:

```
change y by ((-3) - (score))
```

## Comparing values

Conditions can compare variables: `(score) > (10)`, `(lives) < (1)`, `(answer) = [yes]`. Combine them with **and**, **or**, **not**.

## Practice

1. Finish the *Catch the apple* game with score and lives.
2. Add a "You win!" message when the score reaches 20.
3. Add a **high score** variable that only changes when the new score is bigger.

@module Module 2 · From blocks to Python
@lesson Hello, Python | 20
# Hello, Python

Scratch is great for learning ideas. Real software is mostly written in **text** languages. **Python** is one of the most popular: it is used for websites, science, data and almost all AI work.

## Where to write Python

- **Google Colab** (colab.research.google.com): runs Python in your browser, free with a Google account.
- **Python on a computer**: install it from python.org and use IDLE, the editor that comes with it.

## Your first program

```python
print("Hello, Bangladesh!")
print("I am learning Python.")
```

`print` shows text on the screen. Text goes inside quotes and is called a **string**.

## Python can calculate

```python
print(7 + 5)      # 12
print(20 - 8)     # 12
print(6 * 7)      # 42
print(15 / 4)     # 3.75
print(15 // 4)    # 3   (whole-number division)
print(15 % 4)     # 3   (remainder)
print(2 ** 10)    # 1024 (power)
```

Anything after `#` is a **comment**: Python ignores it. Comments explain your code to people.

## Scratch blocks in Python

| Scratch | Python |
|---|---|
| `say [Hello]` | `print("Hello")` |
| `set [score] to (0)` | `score = 0` |
| `change [score] by (1)` | `score = score + 1` or `score += 1` |
| `ask [What's your name?] and wait` | `name = input("What's your name? ")` |

## Errors are normal

If you type `print("Hello)` Python shows a **SyntaxError**, because the closing quote is missing. Read the last line of an error message: it usually tells you what is wrong and on which line.

## Practice

1. Print your name, class and favourite subject on three lines.
2. Calculate how many seconds there are in one day.
3. Make an error on purpose, read the message, then fix it.

@lesson Variables, input and types | 25
# Variables, input and types

## Variables

```python
name = "Nusrat"
age = 13
height_m = 1.52
likes_maths = True
```

A variable name should describe what it holds. Use lowercase letters and underscores: `total_marks`, not `tm`.

## Types

Every value has a **type**:

| Type | Example | Meaning |
|---|---|---|
| `int` | `42` | whole number |
| `float` | `3.14` | decimal number |
| `str` | `"Dhaka"` | text (string) |
| `bool` | `True` | true or false |

Check a type with `type(age)`.

## Getting input

`input()` always gives you a **string**, even if the user types a number:

```python
age = input("How old are you? ")
print(age + 1)        # TypeError: can't add a string and a number
```

Convert it first:

```python
age = int(input("How old are you? "))
print("Next year you will be", age + 1)
```

Use `float()` for decimals.

## Building messages with f-strings

```python
name = input("Name: ")
marks = int(input("Marks out of 100: "))
print(f"{name} scored {marks}%. That is {100 - marks} marks from full.")
```

The `f` before the quotes lets you put variables inside `{ }`.

## Practice

1. Ask for the length and width of a rectangle and print its area and perimeter.
2. Ask for a temperature in Celsius and print it in Fahrenheit: `F = C × 9 / 5 + 32`.
3. Ask for the price of an item and the number bought, then print the total in taka.

@lesson Decisions with if, elif and else | 25
# Decisions with if, elif and else

```python
marks = int(input("Marks: "))

if marks >= 80:
    print("A+")
elif marks >= 70:
    print("A")
elif marks >= 60:
    print("A-")
elif marks >= 33:
    print("Pass")
else:
    print("Fail")
```

## Important rules

- The condition ends with a colon `:`.
- The lines inside the `if` are **indented** (4 spaces). Indentation is how Python knows which lines belong to the `if`. In Scratch, blocks inside the `if` were wrapped by its "C" shape; in Python, indentation does that job.
- Python checks the conditions from top to bottom and runs **only the first** one that is true.

## Comparison operators

| Operator | Meaning |
|---|---|
| `==` | equal to (two `=` signs!) |
| `!=` | not equal to |
| `>` `<` | greater than, less than |
| `>=` `<=` | greater or equal, less or equal |

## Combining conditions

```python
age = 15
has_ticket = True

if age >= 12 and has_ticket:
    print("You can enter.")

day = "Friday"
if day == "Friday" or day == "Saturday":
    print("Weekend!")
```

## Practice

1. Ask for a number and say whether it is even or odd. Hint: `number % 2 == 0`.
2. Ask for three marks, compute the average and print the grade using the table above.
3. Write a simple password check: if the user types the right password, print "Welcome", otherwise "Try again".

@lesson Loops in Python | 25
# Loops in Python

## for loops

A `for` loop repeats for each item in a sequence. `range(5)` gives `0, 1, 2, 3, 4`.

```python
for i in range(5):
    print("Clap", i + 1)
```

`range(start, stop, step)`:

```python
for n in range(2, 21, 2):
    print(n)          # 2, 4, ..., 20
```

## Adding things up

A very common pattern: start a total at 0 and add to it inside the loop.

```python
total = 0
for n in range(1, 101):
    total += n
print(total)          # 5050
```

## while loops

A `while` loop repeats **as long as** a condition is true, like Scratch's `repeat until`, but the other way round.

```python
secret = 7
guess = 0
while guess != secret:
    guess = int(input("Guess a number from 1 to 10: "))
print("Correct!")
```

Make sure something inside the loop changes the condition, or the loop never stops. If that happens, stop the program (in Colab, click the stop button).

## Loops with decisions: a guessing game

```python
import random

secret = random.randint(1, 50)
tries = 0
while True:
    guess = int(input("Your guess (1-50): "))
    tries += 1
    if guess < secret:
        print("Too low")
    elif guess > secret:
        print("Too high")
    else:
        print(f"Correct in {tries} tries!")
        break
```

`break` leaves the loop immediately.

## Practice

1. Print the multiplication table for any number the user types (1 to 10).
2. Add up all the numbers from 1 to 1000 that are divisible by 3 or 5.
3. Improve the guessing game: limit the player to 6 tries.

@lesson Lists and functions | 30
# Lists and functions

## Lists

A **list** holds many values in order:

```python
fruits = ["mango", "jackfruit", "lychee"]
print(fruits[0])        # mango (counting starts at 0)
print(len(fruits))      # 3
fruits.append("guava")  # add to the end

for fruit in fruits:
    print("I like", fruit)
```

Useful tools for lists of numbers:

```python
marks = [72, 85, 64, 90]
print(sum(marks), max(marks), min(marks))
print(sum(marks) / len(marks))   # average
```

## Functions

A **function** is a named block of code you can reuse, like a custom block in Scratch (**My Blocks**).

```python
def greet(name):
    print(f"Hello, {name}!")

greet("Arif")
greet("Mitu")
```

Functions can **return** a result:

```python
def average(numbers):
    return sum(numbers) / len(numbers)

def grade(mark):
    if mark >= 80:
        return "A+"
    elif mark >= 70:
        return "A"
    elif mark >= 33:
        return "Pass"
    return "Fail"

marks = [72, 85, 64, 90]
avg = average(marks)
print(round(avg, 1), grade(avg))
```

Why use functions?

- **Reuse**: write once, use many times.
- **Readability**: `grade(avg)` says what it does.
- **Testing**: you can check one small piece at a time.

## Mini project: class report

Store five students' names and marks in two lists, then use a loop and your `grade` function to print a report:

```python
names = ["Ayesha", "Rafi", "Tania", "Sabbir", "Mim"]
marks = [88, 67, 45, 92, 30]

for i in range(len(names)):
    print(f"{names[i]:<8} {marks[i]:>3}  {grade(marks[i])}")

print("Class average:", round(average(marks), 1))
```

## What's next

You now know sequence, loops, decisions, variables, lists and functions: the same building blocks used in AI programs. Try the **Python quiz game** project in the Project Lab, then continue with **AI & Machine Learning Basics**.
