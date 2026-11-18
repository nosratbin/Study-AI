@module Module 1 · Getting started
@lesson Why version control? | 15
# Why version control?

Have you ever had folders like `project_final`, `project_final2`, `project_final_REAL`? Version control replaces that mess with a clean, searchable history.

## What a version control system (VCS) does

- **Records snapshots** of your project over time, each with a message explaining *why* it changed.
- **Lets you go back** to any earlier state if something breaks.
- **Lets many people work in parallel** without overwriting each other's work.
- **Shows who changed what and when**, which is invaluable when debugging.

## Git vs GitHub

| | Git | GitHub |
|---|---|---|
| What it is | A version control **program** | A **website/service** that hosts Git repositories |
| Runs where | On your computer | In the cloud |
| Works offline? | Yes | No |
| Alternatives | Mercurial, SVN | GitLab, Bitbucket, Codeberg |

Git was created by Linus Torvalds in 2005 to manage the Linux kernel. It is **distributed**: every developer has a full copy of the history, not just the latest files.

## Key vocabulary

- **Repository (repo):** a project folder tracked by Git, including its full history (stored in a hidden `.git` folder).
- **Commit:** a saved snapshot of the project, with an author, a date and a message.
- **Branch:** an independent line of development.
- **Remote:** a copy of the repository hosted somewhere else (e.g. on GitHub).

## Check your understanding

1. Can you use Git without GitHub? *(Yes. Git works entirely on your own computer.)*
2. Why is "distributed" useful if GitHub goes down? *(Everyone still has the full history locally and can keep committing.)*

**Key takeaway:** Git tracks history; GitHub hosts and shares it.

@lesson Installing and configuring Git | 15
# Installing and configuring Git

## Install

- **Windows:** download Git for Windows from git-scm.com. It includes *Git Bash*, a terminal that understands Unix commands.
- **macOS:** run `git --version`. If Git is missing, macOS offers to install the Command Line Tools. Or use Homebrew: `brew install git`.
- **Linux (Ubuntu/Debian):** `sudo apt install git`.

Check it worked:

```bash
git --version
```

## Tell Git who you are

Every commit records an author. Set your name and email once per computer:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Use the same email as your GitHub account so commits link to your profile. If you want to keep your email private, GitHub gives you a `noreply` address in **Settings → Emails**.

## Useful defaults

```bash
git config --global init.defaultBranch main   # new repos start on "main"
git config --global core.editor "code --wait" # use VS Code for commit messages
git config --global pull.rebase false         # "git pull" merges (explained later)
```

On Windows, line endings differ from macOS/Linux. A safe setting is:

```bash
git config --global core.autocrlf true   # Windows
git config --global core.autocrlf input  # macOS/Linux
```

## Where settings live

| Level | Flag | Applies to |
|---|---|---|
| System | `--system` | every user on the computer |
| Global | `--global` | you, in every repo |
| Local | `--local` (default) | this one repository |

Local overrides global, which overrides system. See everything with `git config --list --show-origin`.

## Getting help

```bash
git help commit      # full manual page
git commit -h        # short summary of options
```

**Practice:** Install Git, set your name and email, then run `git config --global --list` and confirm both values appear.

@lesson Your first repository | 20
# Your first repository

## Create a repository

```bash
mkdir my-notes
cd my-notes
git init
```

`git init` creates a hidden `.git` folder. That folder **is** the repository: delete it and the history is gone.

## The basic cycle: edit → stage → commit

```bash
echo "# My Notes" > README.md
git status            # README.md is "untracked"
git add README.md     # stage it
git status            # now "Changes to be committed"
git commit -m "Add README"
```

## View history

```bash
git log                 # full details
git log --oneline       # one line per commit
git log --oneline --graph --all   # with branch structure
```

Each commit has an ID (a SHA-1 hash) like `3f2a9c1e...`. You usually only need the first 7 characters.

## Writing good commit messages

A good message completes the sentence *"If applied, this commit will…"*

| Weak | Strong |
|---|---|
| `fixed stuff` | `Fix crash when the marks list is empty` |
| `update` | `Add Bangla translation for the login page` |
| `asdf` | `Remove unused image assets` |

Conventions:

- Short summary line (about 50 characters), imperative mood ("Add", not "Added").
- Leave a blank line, then explain *why* in the body if needed.
- One logical change per commit: easier to review and to undo.

## Practice

1. Create a repo called `practice-git`.
2. Add a file `todo.txt` with three tasks and commit it.
3. Edit one task, commit again with a clear message.
4. Run `git log --oneline` and confirm you see two commits.

@module Module 2 · Everyday Git
@lesson The three areas: working tree, staging area, repository | 20
# The three areas

Git moves changes through three places:

```text
Working tree  --git add-->  Staging area (index)  --git commit-->  Repository (.git)
```

- **Working tree:** the files you see and edit.
- **Staging area:** a draft of your next commit. You choose exactly what goes in.
- **Repository:** the permanent history of commits.

## Why have a staging area?

Suppose you fixed a bug **and** reformatted a file. You can commit them separately:

```bash
git add bugfix.py
git commit -m "Fix rounding error in GPA calculation"
git add style.css
git commit -m "Reformat stylesheet"
```

You can even stage **part** of a file:

```bash
git add -p app.py   # Git shows each change ("hunk") and asks y/n
```

## Seeing differences

| Command | Compares |
|---|---|
| `git diff` | working tree vs staging area (unstaged changes) |
| `git diff --staged` | staging area vs last commit (what will be committed) |
| `git diff HEAD` | working tree vs last commit (everything) |
| `git diff abc123 def456` | two commits |

## File states

`git status` reports each file as one of:

- **Untracked:** Git has never seen it.
- **Modified:** changed but not staged.
- **Staged:** will be in the next commit.
- **Unmodified:** matches the last commit.

Tip: `git status -s` gives a compact view (`M` modified, `A` added, `??` untracked).

## Moving and deleting

```bash
git mv old.txt new.txt   # rename and stage in one step
git rm secret.txt        # delete and stage the deletion
git rm --cached big.log  # stop tracking but keep the file on disk
```

**Practice:** Change two different files, stage only one, then run `git diff` and `git diff --staged` to see the difference.

@lesson Ignoring files with .gitignore | 15
# Ignoring files with .gitignore

Some files should **never** be committed:

- Build output: `node_modules/`, `dist/`, `__pycache__/`
- Secrets: `.env`, API keys, private keys
- Personal editor/OS files: `.vscode/`, `.DS_Store`, `Thumbs.db`
- Large data files and logs

## Writing a .gitignore

Create a file named `.gitignore` in the repo root:

```gitignore
# dependencies
node_modules/
.venv/

# secrets
.env
*.pem

# build output
dist/
*.log

# but keep this one example file
!.env.example
```

Pattern rules:

| Pattern | Matches |
|---|---|
| `*.log` | any file ending in .log, in any folder |
| `build/` | a folder called build, anywhere |
| `/build/` | only the build folder at the repo root |
| `docs/**/*.pdf` | PDFs at any depth under docs |
| `!keep.log` | un-ignore a file matched earlier |

Commit the `.gitignore` itself so the whole team shares it. GitHub's `github/gitignore` repository has ready-made templates for most languages.

## "I already committed it!"

`.gitignore` only affects **untracked** files. If a file is already tracked:

```bash
git rm --cached .env
echo ".env" >> .gitignore
git commit -m "Stop tracking .env"
```

**Important:** if that file contained a password or API key, it is still in the history. Treat the secret as leaked: **revoke it and create a new one**. Removing it from history (covered later) is not enough on its own, because others may already have copied it.

## Checking

```bash
git check-ignore -v somefile.txt   # shows which rule ignores it
git status --ignored               # lists ignored files
```

@lesson Undoing changes safely | 25
# Undoing changes safely

Mistakes happen. Git can undo almost anything if you pick the right tool.

## Discard changes in the working tree

```bash
git restore app.py          # throw away unstaged edits to app.py (cannot be undone!)
```

## Unstage a file

```bash
git restore --staged app.py # keep your edits, just remove them from the staging area
```

## Fix the last commit

Forgot a file or made a typo in the message?

```bash
git add forgotten.py
git commit --amend -m "Add login form validation"
```

`--amend` **replaces** the last commit with a new one. Only amend commits you have **not pushed** yet.

## Undo a commit that is already shared: `git revert`

```bash
git revert a1b2c3d
```

This creates a **new** commit that does the opposite of `a1b2c3d`. History is preserved, so it is safe on shared branches.

## Move the branch back: `git reset`

| Command | Commits after target | Staging area | Working tree |
|---|---|---|---|
| `git reset --soft HEAD~1` | removed | changes kept, staged | kept |
| `git reset --mixed HEAD~1` (default) | removed | cleared | changes kept |
| `git reset --hard HEAD~1` | removed | cleared | **changes deleted** |

`HEAD~1` means "one commit before the current one". `HEAD~3` means three back.

## Decision guide

- Not committed yet? → `git restore`
- Committed, **not pushed**? → `git commit --amend` or `git reset`
- Committed **and pushed**? → `git revert`

## Get an old version of one file

```bash
git restore --source=HEAD~2 report.md   # report.md as it was two commits ago
```

**Practice:** Make a commit with a deliberate mistake. Undo it once with `git revert`, then (in a fresh practice repo) undo it with `git reset --soft HEAD~1`. Compare `git log --oneline` after each.

@module Module 3 · Branching and merging
@lesson Branches | 20
# Branches

A **branch** is a movable pointer to a commit. Creating one is instant and cheap, so Git users branch often.

## Why branch?

- Develop a feature without breaking working code on `main`.
- Try an experiment and throw it away if it fails.
- Work on several tasks at once.

## Commands

```bash
git branch                  # list branches (* marks the current one)
git branch feature-login    # create
git switch feature-login    # move to it
git switch -c feature-quiz  # create and switch in one step
git branch -d feature-quiz  # delete (only if merged)
git branch -D feature-quiz  # force delete
git branch -m old new       # rename
```

(Older tutorials use `git checkout`; `git switch` and `git restore` are its clearer modern replacements.)

## What is HEAD?

`HEAD` points to the branch you are on. When you commit, the current branch moves forward to the new commit and `HEAD` moves with it.

```text
main:          A---B---C
                        \
feature-login:           D---E   <- HEAD
```

## Detached HEAD

If you `git switch --detach a1b2c3d` (or check out a tag), `HEAD` points straight at a commit, not a branch. You can look around safely, but new commits there belong to no branch. To keep them:

```bash
git switch -c rescue-branch
```

## Naming conventions

Use short, descriptive names, often with a prefix: `feature/quiz-timer`, `fix/login-crash`, `docs/readme-setup`.

**Practice:** Create `feature/about-page`, add a file and commit. Switch back to `main` and notice the file disappears. Switch back and it returns.

@lesson Merging and resolving conflicts | 25
# Merging and resolving conflicts

Merging brings the work from one branch into another.

```bash
git switch main
git merge feature-login
```

## Two kinds of merge

**Fast-forward:** `main` has no new commits since the branch started, so Git just moves the `main` pointer forward. No merge commit.

```text
Before: main A---B          After: main A---B---C---D
                 \
         feature  C---D
```

**Three-way merge:** both branches have new commits. Git combines them and creates a **merge commit** with two parents.

```text
main     A---B---E-------M
              \         /
feature        C---D---
```

Use `git merge --no-ff feature` to always create a merge commit, which keeps a visible record that a feature was merged.

## Merge conflicts

A conflict happens when both branches changed **the same lines** of the same file. Git stops and marks the file:

```text
<<<<<<< HEAD
Welcome to our school portal!
=======
Welcome to the IccheGhuri student portal!
>>>>>>> feature-login
```

- Between `<<<<<<<` and `=======`: your current branch's version.
- Between `=======` and `>>>>>>>`: the incoming branch's version.

## Resolving

1. Run `git status` to see which files conflict.
2. Open each file, decide on the final text, and **delete all three marker lines**.
3. Stage the fixed file: `git add index.html`
4. Finish: `git commit` (Git suggests a message).

Changed your mind? `git merge --abort` returns to the state before the merge.

VS Code shows **Accept Current / Accept Incoming / Accept Both** buttons above each conflict, which makes this easier.

## Avoiding painful conflicts

- Merge `main` into your branch (or rebase) often, so differences stay small.
- Keep branches short-lived.
- Talk to teammates before large reformatting changes.

**Practice:** On two branches, edit the same line of `README.md` differently. Merge one into the other, resolve the conflict, and commit.

@lesson Rebasing | 25
# Rebasing

`git rebase` is another way to combine branches. Instead of a merge commit, it **replays** your commits on top of another branch.

```text
Before:
main     A---B---E
              \
feature        C---D

git switch feature
git rebase main

After:
main     A---B---E
                  \
feature            C'--D'
```

`C'` and `D'` are **new** commits with the same changes but new IDs. Now `main` can fast-forward to include them, giving a straight, linear history.

## Merge vs rebase

| | Merge | Rebase |
|---|---|---|
| History | true record, with merge commits | clean, linear |
| Rewrites commits? | no | yes (new IDs) |
| Safe on shared branches? | yes | **no** |
| Conflict handling | once, at the end | possibly once per commit |

## The golden rule

**Never rebase commits that other people have already pulled.** Rebasing rewrites history; anyone who built on the old commits will get confusing duplicates.

Rebasing your **own** local feature branch onto the latest `main` before opening a pull request is common and safe.

## Conflicts during a rebase

Git pauses at each conflicting commit:

```bash
# fix the files, then
git add fixed-file.py
git rebase --continue
# or skip this commit:   git rebase --skip
# or give up entirely:   git rebase --abort
```

## Pull with rebase

`git pull` = `git fetch` + `git merge`. To rebase your local commits on top of the remote instead:

```bash
git pull --rebase
```

This avoids lots of small "Merge branch 'main' of github.com/..." commits.

**Practice:** Create a feature branch with two commits, add a commit to `main`, then rebase the feature onto `main`. Compare `git log --oneline --graph --all` before and after.

@module Module 4 · Working with GitHub
@lesson Remotes, push, pull and authentication | 25
# Remotes, push, pull and authentication

## Create a repository on GitHub

On github.com click **New repository**, give it a name, and choose public or private. If you already have a local repo, **don't** tick "Add a README", so the histories don't clash.

## Connect your local repo

```bash
git remote add origin https://github.com/<your-username>/my-notes.git
git branch -M main
git push -u origin main
```

- `origin` is the conventional name for your main remote.
- `-u` sets **upstream tracking**, so afterwards plain `git push` and `git pull` know where to go.

## Clone an existing repository

```bash
git clone https://github.com/<owner>/<repo>.git
```

This downloads the whole history and sets up `origin` automatically.

## Fetch, pull, push

| Command | What it does |
|---|---|
| `git fetch` | download new commits, but don't change your files |
| `git pull` | fetch **and** merge into your current branch |
| `git push` | upload your commits to the remote |

If `git push` is rejected with *"Updates were rejected because the remote contains work that you do not have"*, someone pushed first. Run `git pull` (or `git pull --rebase`), fix any conflicts, then push again.

`origin/main` is a **remote-tracking branch**: your local record of where `main` was on GitHub at your last fetch.

## Authentication

GitHub does **not** accept your account password for Git operations. Use one of:

1. **Git Credential Manager** (bundled with Git for Windows): a browser window opens and you sign in once.
2. **Personal access token (PAT):** created in Settings → Developer settings. Use a *fine-grained* token with access only to the repos you need and an expiry date.
3. **SSH keys:**

```bash
ssh-keygen -t ed25519 -C "you@example.com"
# copy the contents of ~/.ssh/id_ed25519.pub into GitHub → Settings → SSH and GPG keys
ssh -T git@github.com    # test the connection
git remote set-url origin git@github.com:<your-username>/my-notes.git
```

Never share your private key (the file **without** `.pub`) or paste tokens into code.

**Practice:** Push your `practice-git` repo to GitHub, edit a file on the GitHub website, then bring that change down with `git pull`.

@lesson Pull requests and code review | 25
# Pull requests and code review

A **pull request (PR)** asks to merge one branch into another, and gives the team a place to discuss and review the change first.

## The workflow

```bash
git switch -c feature/dark-mode
# ...edit, commit...
git push -u origin feature/dark-mode
```

On GitHub, click **Compare & pull request**. Then:

1. Write a clear **title** and **description**: what changed, why, and how to test it. Add screenshots for UI changes.
2. Link the issue: writing `Closes #42` closes issue 42 automatically when the PR merges.
3. Request **reviewers**.
4. Push more commits to the same branch to address feedback; the PR updates automatically.
5. Once approved and checks pass, **merge**, then delete the branch.

Use a **draft PR** to share early work and get feedback before it is ready.

## Merge options on GitHub

| Option | Result |
|---|---|
| Create a merge commit | keeps every commit, plus a merge commit |
| Squash and merge | combines all PR commits into one commit on main |
| Rebase and merge | replays each commit onto main, no merge commit |

Many teams use **squash** so `main` has one tidy commit per feature.

## Reviewing well

As a reviewer:

- Check correctness first, then readability, tests and edge cases.
- Comment on the **code**, not the person. Ask questions: *"What happens if the list is empty?"*
- Use **suggestions** (the ± button) to propose exact replacement lines.
- Finish with **Approve**, **Comment** or **Request changes**.

As an author:

- Keep PRs small: under a few hundred lines is far easier to review.
- Review your own diff before requesting others.
- Reply to every comment, even just "Done".

**Practice:** With a friend (or a second account), open a PR to each other's repo, leave one suggestion, and merge it with "Squash and merge".

@lesson Forks and contributing to open source | 25
# Forks and contributing to open source

You can't push directly to someone else's repository. Instead you **fork** it: GitHub makes your own copy under your account.

## The fork workflow

```bash
# 1. Click "Fork" on GitHub, then clone YOUR fork
git clone https://github.com/<you>/<project>.git
cd <project>

# 2. Add the original repo as "upstream"
git remote add upstream https://github.com/<owner>/<project>.git
git remote -v

# 3. Work on a branch
git switch -c fix/typo-in-docs
# ...edit, commit...
git push -u origin fix/typo-in-docs
```

4. On GitHub, open a pull request **from your fork's branch to the original repo's `main`**.

## Keeping your fork up to date

```bash
git switch main
git fetch upstream
git merge upstream/main   # or: git rebase upstream/main
git push origin main
```

GitHub also has a **Sync fork** button on your fork's page.

## Finding your first contribution

- Look for issues labelled `good first issue` or `help wanted`.
- Read `README.md`, `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` first. They explain how the project wants contributions.
- Comment on the issue before starting, so two people don't do the same work.
- Documentation fixes, translations (for example into Bangla) and tests are excellent first contributions.

## Licences

Open-source projects have a `LICENSE` file that says what you may do with the code. MIT and Apache-2.0 are permissive; GPL requires derived work to stay open source. Code on GitHub with **no** licence is not automatically free to reuse.

## Etiquette

- Be patient: maintainers are often volunteers.
- Follow the project's style and tests.
- Accept "no" gracefully; not every change fits a project's goals.

**Practice:** Fork a beginner-friendly repository, fix a typo or improve a sentence in its docs, and open a pull request.

@lesson Issues, README and GitHub project tools | 20
# Issues, README and GitHub project tools

## README.md

The README is your project's front page. A good one answers:

1. **What** is this? (one paragraph, maybe a screenshot)
2. **How do I install and run it?**
3. **How do I use it?** (example commands or code)
4. **How do I contribute?**
5. **What licence** is it under?

GitHub renders Markdown:

```markdown
# Project name
**Bold**, *italic*, `inline code`
- bullet list
1. numbered list
[link text](https://example.com)
![screenshot](docs/screenshot.png)
```

Your GitHub **profile README** comes from a public repo named exactly after your username.

## Issues

Issues track bugs, ideas and tasks. A good bug report includes steps to reproduce, the expected result, the actual result, and the environment (OS, browser, version).

- **Labels:** `bug`, `enhancement`, `documentation`, `good first issue`.
- **Assignees:** who is working on it.
- **Milestones:** group issues for a release.
- **Issue templates** (`.github/ISSUE_TEMPLATE/`) prompt reporters for the right details.

Reference issues anywhere with `#number`, and mention people with `@username`.

## GitHub Projects

A board/table view to plan work across issues and PRs, with columns such as *Todo → In progress → Done*. Good for team and class projects.

## Other useful features

- **Discussions:** Q&A and ideas that are not tasks.
- **Wiki:** longer documentation.
- **GitHub Pages:** free static website hosting straight from a repo (Settings → Pages). Great for a portfolio.
- **Releases:** packaged versions with notes (covered in Module 5).

**Practice:** Write a proper README for one of your repos, and create three issues with labels for planned improvements.

@module Module 5 · Advanced Git
@lesson Rewriting history with interactive rebase | 25
# Rewriting history with interactive rebase

Before opening a pull request you can tidy your local commits: combine "fix typo" commits, reword messages, reorder or drop commits.

```bash
git rebase -i HEAD~4    # edit the last 4 commits
```

Git opens an editor:

```text
pick 1a2b3c4 Add quiz page
pick 5d6e7f8 fix typo
pick 9a8b7c6 Add timer to quiz
pick 3c4d5e6 oops forgot file
```

Change the word at the start of each line:

| Command | Effect |
|---|---|
| `pick` | keep the commit as it is |
| `reword` | keep it but edit the message |
| `edit` | stop so you can change the commit's content |
| `squash` | merge into the previous commit, combining messages |
| `fixup` | merge into the previous commit, discarding this message |
| `drop` | delete the commit |

Reordering the lines reorders the commits. Example result:

```text
pick 1a2b3c4 Add quiz page
fixup 5d6e7f8 fix typo
pick 9a8b7c6 Add timer to quiz
fixup 3c4d5e6 oops forgot file
```

Now you have two clean commits.

## Fixup commits automatically

```bash
git commit --fixup 1a2b3c4      # marks this commit as a fix for 1a2b3c4
git rebase -i --autosquash main # Git arranges the fixups for you
```

## Pushing rewritten history

Because commit IDs changed, a normal push is rejected. Use:

```bash
git push --force-with-lease
```

`--force-with-lease` refuses to overwrite the remote if someone else pushed in the meantime, which makes it much safer than `--force`.

**Remember the golden rule:** only rewrite commits on branches that nobody else is building on.

## Removing a secret from all history

Tools like `git filter-repo` can rewrite every commit to remove a file. But anyone who cloned earlier still has it, so **always revoke the secret first**.

@lesson Stash, cherry-pick, bisect and reflog | 30
# Stash, cherry-pick, bisect and reflog

## git stash: put work aside

You're mid-change and need to switch branches urgently:

```bash
git stash push -m "half-done navbar"
git switch main      # fix the urgent thing
git switch -        # back to the previous branch
git stash pop        # bring your changes back
```

```bash
git stash list
git stash apply stash@{1}   # apply but keep it in the list
git stash drop stash@{1}
git stash -u                # include untracked files
```

## git cherry-pick: copy one commit

A bug fix was committed on `develop` but you need it on `main` now:

```bash
git switch main
git cherry-pick 4f5e6d7
```

This creates a new commit on `main` with the same change.

## git bisect: find the commit that broke something

Something worked last month and is broken now, with 200 commits in between. Bisect uses binary search, so about 8 steps find the culprit (2⁸ = 256).

```bash
git bisect start
git bisect bad              # current commit is broken
git bisect good v1.2.0      # this old version worked
# Git checks out a middle commit. Test it, then say:
git bisect good   # or: git bisect bad
# ...repeat until Git prints "<sha> is the first bad commit"
git bisect reset
```

Automate it with a test script that exits 0 for good and non-zero for bad:

```bash
git bisect run python -m pytest tests/test_grades.py
```

## git reflog: your safety net

The reflog records every position `HEAD` has been at, including after resets and rebases. It is how you recover "lost" commits.

```bash
git reflog
# a1b2c3d HEAD@{0}: reset: moving to HEAD~3
# 9f8e7d6 HEAD@{1}: commit: Add results page   <- the work you thought you lost
git branch recovered 9f8e7d6
```

Reflog entries are local and kept for about 90 days by default. As long as you **committed** the work, you can almost always get it back.

## git blame and log search

```bash
git blame app.py              # who last changed each line
git log -S "calculate_gpa"    # commits that added/removed this text
git log --author="Rafi" --since="2 weeks ago"
```

**Practice:** Run `git reset --hard HEAD~2` in a practice repo, then use `git reflog` to recover the two commits.

@lesson Tags, releases and semantic versioning | 20
# Tags, releases and semantic versioning

A **tag** is a permanent name for a specific commit, usually a release version.

## Creating tags

```bash
git tag -a v1.0.0 -m "First stable release"   # annotated tag (recommended)
git tag v1.0.0-light                           # lightweight tag (just a pointer)
git tag                                        # list
git show v1.0.0
```

Annotated tags store the tagger, date and message, and can be signed. Use them for releases.

Tags are **not** pushed automatically:

```bash
git push origin v1.0.0
git push origin --tags      # push all tags
```

Tag an older commit with `git tag -a v0.9.0 a1b2c3d -m "Beta"`.

## Semantic versioning (SemVer)

Versions look like **MAJOR.MINOR.PATCH**, e.g. `2.4.1`:

| Part | Increase when you… | Example |
|---|---|---|
| MAJOR | make a breaking change | 1.4.2 → 2.0.0 |
| MINOR | add a backwards-compatible feature | 1.4.2 → 1.5.0 |
| PATCH | fix a bug without changing the API | 1.4.2 → 1.4.3 |

Pre-releases: `2.0.0-beta.1`. Version `0.y.z` means "still in early development; anything may change".

## GitHub Releases

On GitHub: **Releases → Draft a new release**, choose a tag, write release notes (or click *Generate release notes* to list merged PRs), and attach files such as installers or APKs.

## Changelogs

Keep a `CHANGELOG.md` with sections per version: **Added, Changed, Fixed, Removed**. Users read it to decide whether to upgrade.

## Conventional Commits

Some teams use structured messages so tools can generate changelogs and version numbers:

```text
feat: add Bangla language toggle
fix: prevent crash when no courses exist
docs: explain local setup
feat!: drop support for Python 3.9   (the ! marks a breaking change)
```

**Practice:** Tag your practice repo `v0.1.0`, push the tag, and create a GitHub release with notes.

@lesson Branching strategies for teams | 20
# Branching strategies for teams

A team needs agreed rules for how branches are used. Three common strategies:

## GitHub flow (simple, popular)

1. `main` is always deployable.
2. Create a short-lived branch for every change.
3. Open a pull request, get review, pass CI.
4. Merge to `main` and deploy.

Best for: web apps and small-to-medium teams that deploy often.

## Trunk-based development

Everyone integrates into `main` (the "trunk") at least daily, using very small branches or direct commits. Unfinished features hide behind **feature flags** (if-statements switched by configuration).

Best for: experienced teams with strong automated tests and continuous deployment.

## Git flow (structured, heavier)

- `main`: released code only, tagged with versions.
- `develop`: integration branch for the next release.
- `feature/*` branch from `develop`.
- `release/*` for preparing a version; `hotfix/*` for urgent production fixes.

Best for: software with scheduled, versioned releases (desktop or mobile apps), or supporting several versions at once. Many web teams find it too heavy.

## Comparison

| | GitHub flow | Trunk-based | Git flow |
|---|---|---|---|
| Long-lived branches | main | main | main, develop |
| Complexity | low | low (needs discipline) | high |
| Release style | continuous | continuous | scheduled versions |

## Protecting main

Whatever the strategy, protect `main` on GitHub (**Settings → Branches/Rules**):

- Require a pull request before merging.
- Require at least one approving review.
- Require status checks (CI) to pass.
- Block force pushes and deletion.

## Monorepo vs multiple repos

One repository for many projects (monorepo) makes shared changes easy; separate repos give clearer ownership. Either works with any branching strategy.

**Discuss:** Your team of four is building a university club website, deployed whenever something is ready. Which strategy would you choose, and why? *(GitHub flow fits well: simple, continuous deployment, little overhead.)*

@lesson How Git works inside | 25
# How Git works inside

Understanding Git's internals makes its behaviour much less mysterious.

## Everything is an object

The `.git/objects` folder stores four kinds of object, each named by the hash of its content:

| Object | Stores |
|---|---|
| **blob** | the contents of one file (no name) |
| **tree** | a folder: names → blobs and other trees |
| **commit** | a tree (the snapshot), parent commit(s), author, message |
| **tag** | an annotated tag pointing at a commit |

Because names are hashes of content, the same file content is stored only once, and any change to history would change every later hash. This makes tampering detectable.

## Snapshots, not differences

Each commit points at a **complete tree** of the project. Unchanged files simply reuse the same blobs, so this is space-efficient. (Git also compresses objects into *packfiles*.)

## Exploring with plumbing commands

```bash
git cat-file -t HEAD            # -> commit
git cat-file -p HEAD            # shows tree, parent, author, message
git cat-file -p HEAD^{tree}     # lists files and their blob hashes
git hash-object README.md       # the hash Git would give this file
```

## Branches are tiny files

```bash
cat .git/HEAD                 # ref: refs/heads/main
cat .git/refs/heads/main      # a 40-character commit hash
```

A branch is just a file containing a commit hash. This is why creating a branch is instant.

## Putting it together

- `git add` writes blobs and updates the **index** (`.git/index`).
- `git commit` writes tree objects from the index, then a commit object, then moves the branch file to the new commit.
- `git merge`/`rebase` create new commits; old ones remain in the object store until garbage collection (`git gc`) removes unreachable ones, which is why the reflog can rescue them.

## SHA-1 and SHA-256

Git has traditionally used SHA-1 hashes; newer versions also support SHA-256 repositories. For everyday use, treat the hash simply as a unique ID.

**Practice:** In a practice repo, run `git cat-file -p HEAD`, then follow the tree hash and a blob hash until you see a file's contents.

@module Module 6 · Automation and security
@lesson Continuous integration with GitHub Actions | 30
# Continuous integration with GitHub Actions

**Continuous integration (CI)** automatically builds and tests every push and pull request, so problems are caught before they reach `main`.

## Concepts

- **Workflow:** a YAML file in `.github/workflows/`.
- **Event (trigger):** what starts it (`push`, `pull_request`, `schedule`, `workflow_dispatch` for a manual button).
- **Job:** a set of steps that runs on a fresh virtual machine (a **runner**).
- **Step:** a shell command (`run`) or a reusable **action** (`uses`).

## A Python test workflow

Create `.github/workflows/tests.yml`:

```yaml
name: tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install -r requirements.txt
      - run: python -m pytest
```

The **matrix** runs the job once per Python version, in parallel.

## A Node.js example

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: npm
  - run: npm ci
  - run: npm test
```

## Using results

- Each PR shows ✅ or ❌ next to its checks; click **Details** for logs.
- Make the check **required** in branch protection so failing code cannot be merged.
- Add a status badge to your README from the workflow's page.

## Secrets in workflows

Store keys in **Settings → Secrets and variables → Actions**, then use them as `${{ secrets.MY_API_KEY }}`. They are masked in logs. Secrets are not given to workflows triggered by pull requests from forks, which protects you from malicious PRs.

## Cost

Public repositories get free Actions minutes on standard runners; private repositories have a monthly free quota. Check current limits on GitHub's billing page.

**Practice:** Add the workflow above (adapted to your language) to a repo with at least one test, open a PR, and watch the check run.

@lesson Securing your repositories | 25
# Securing your repositories

## Protect your account

- Turn on **two-factor authentication (2FA)**: Settings → Password and authentication. Use an authenticator app or a passkey/security key.
- Use fine-grained tokens with expiry dates and the smallest permissions possible.
- Review **Settings → Applications** and remove apps you no longer use.

## Never commit secrets

- Keep keys in environment variables or a `.env` file listed in `.gitignore`.
- Commit an `.env.example` with placeholder values so others know what to set.
- GitHub **secret scanning** and **push protection** can block pushes containing known key formats. Enable them in the repo's security settings where available.
- If a secret leaks: **revoke and rotate it immediately**, then clean history if needed.

## Keep dependencies safe

- **Dependabot alerts** warn you when a dependency has a known vulnerability.
- **Dependabot version updates** open PRs to upgrade dependencies. Configure with `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
```

- Commit lock files (`package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`) so everyone installs the same versions.

## Protect important branches

Use branch protection or rulesets on `main`: require reviews, require passing checks, block force pushes. Add a `CODEOWNERS` file so the right people are automatically asked to review changes to sensitive folders:

```text
/backend/  @backend-team
*.yml      @devops-lead
```

## Signed commits

Anyone can set any name in `git config`, so commit authorship can be faked. Signing proves who made a commit:

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

Add the same public key on GitHub as a **Signing key**; your commits then show **Verified**.

## Security policy

Add a `SECURITY.md` explaining how to report vulnerabilities privately rather than in public issues.

**Checklist:** 2FA on ✅ · no secrets in repo ✅ · Dependabot on ✅ · main protected ✅

@lesson Capstone: a team project from start to release | 40
# Capstone: a team project from start to release

Put the whole course together by building a small project with one to three teammates. Suggested idea: a **study-group website** (HTML/CSS or any framework) listing members, a weekly schedule and resources.

## Part 1: Set up (one person)

1. Create a GitHub repo with a README, a `.gitignore` for your language and an MIT licence.
2. Add teammates as collaborators (Settings → Collaborators).
3. Protect `main`: require a pull request and one approval.
4. Create a GitHub Project board and at least six issues (e.g. *Home page*, *Schedule page*, *Dark mode*, *Contact form*, *CI tests*, *Deploy to Pages*), with labels and assignees.

## Part 2: Develop (everyone)

For each issue:

```bash
git switch main && git pull
git switch -c feature/schedule-page
# ...work, with small commits and clear messages...
git rebase -i main          # tidy commits before review
git push -u origin feature/schedule-page
```

Open a PR that says `Closes #<issue>`, request a review, respond to comments, and squash-merge.

Deliberately have two people edit the same file so you practise **resolving a merge conflict**.

## Part 3: Automate

- Add a GitHub Actions workflow that runs a check on every PR (tests, or a linter such as an HTML validator).
- Make the check required in branch protection.
- Enable Dependabot if you have dependencies.

## Part 4: Release

1. Tag `v1.0.0` with an annotated tag and push it.
2. Publish a GitHub Release with generated notes.
3. Deploy the site with **GitHub Pages**.

## Part 5: Reflect

Write a short `RETROSPECTIVE.md`:

- Which Git command saved you the most time?
- Describe one conflict and how you resolved it.
- What would you change about your branching or review process?

## Self-check: you have mastered this course if you can…

- [ ] explain the working tree, staging area and repository
- [ ] undo changes with restore, reset and revert, and know which to use
- [ ] branch, merge, rebase and resolve conflicts confidently
- [ ] collaborate through forks, pull requests and code review
- [ ] clean up history with interactive rebase and recover work with reflog
- [ ] find a bug-introducing commit with bisect
- [ ] tag releases using semantic versioning
- [ ] set up CI with GitHub Actions and secure a repository

Congratulations: add the finished repo to your Skill Passport and your CV!
