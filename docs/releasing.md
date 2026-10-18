# Releasing Andes NG

How the four npm packages (`@andes-ng/tokens`, `@andes-ng/primitives`, `@andes-ng/ui`, `@andes-ng/testing`) get from `develop` to the public npm registry: what the pipeline does, how to use it, and why it is built this way. The decision record is [ADR 0009](adr/0009-lockstep-versions-and-release-candidates.md); this page is the manual.

## At a glance

- The four packages share **one version**. A release is `X.Y.Z`, tagged `vX.Y.Z`.
- You start a release by creating a branch named after the version: `release/X.Y.Z` (or `hotfix/X.Y.Z`).
- Every push to that branch publishes a **release candidate** `X.Y.Z-rc.N` to npm under the `rc` dist-tag, installs it from npm in an empty project, and opens (or updates) the pull request `release/X.Y.Z → main`.
- Merging that pull request publishes the **final** `X.Y.Z` under `latest`, after a manual approval, tags it, creates the GitHub Release and opens the back-merge into `develop`.
- Nothing is published until the repository variable `ENABLE_ANDES_PUBLISH` is `true`.

```
develop ──► release/0.2.0 ──push──► CI ─► build ─► publish 0.2.0-rc.1 (tag rc) ─► install from npm ─► PR → main
                │                                                                                       │
                └──fix, push──► 0.2.0-rc.2 ... (PR updated)                                       merge (merge commit)
                                                                                                        │
main ◄──────────────────────────────────────────────────────────────────────────────────────────────────┘
  │  find verified candidate with the same tree ─► approval (environment npm) ─► rebuild ─► publish 0.2.0 (tag latest)
  └──► tag v0.2.0 + GitHub Release ─► back-merge PR main → develop (auto-merge)
```

## Using it

### Cut a release

```bash
git switch develop && git pull
git switch -c release/0.2.0          # the branch name is the version
pnpm release:prepare                  # changelog from the version plans; plans are removed; one commit
git push -u origin release/0.2.0
```

What happens next, with nothing else to do:

1. `CI` runs on the branch.
2. `0.2.0-rc.1` is published under the `rc` dist-tag and recorded as the GitHub pre-release `v0.2.0-rc.1`.
3. A clean project installs the four packages at that version from npm; all four must resolve to it.
4. The pull request `release/0.2.0 → main` is opened by the release bot, with the candidate, commit and tree in its description.

Try the candidate anywhere with `npm i @andes-ng/ui@rc` (or `@0.2.0-rc.1`).

### Fix something found in the candidate

Commit to the same `release/0.2.0` branch and push. The next candidate is `0.2.0-rc.2`; the pull request is updated. Pushing the same commit again reuses its existing number instead of publishing a new one.

### Ship it

Merge the pull request into `main` **with a merge commit** (not a squash: the tree check below depends on `main` having the release's exact content). Then:

1. The `Release` workflow looks up the verified candidate whose tree hash equals the tree of `main`. If there is none (someone changed `main` after the last candidate), it fails.
2. The job `Publish the final release` waits for approval in the `npm` environment (you, as required reviewer). Approve it in the Actions run.
3. It rebuilds, publishes `0.2.0` under `latest`, creates tag `v0.2.0` and its GitHub Release, and the back-merge pull request `main → develop` opens with auto-merge on. Merge it with a merge commit if auto-merge is not available.

### Hotfix

Branch `hotfix/0.2.1` from `main`, commit the fix and a version plan (`pnpm nx release plan`), run `pnpm release:prepare`, push. The flow is identical; the pull request targets `main` and the back-merge brings the fix into `develop`.

### Roll back

Run the `Rollback` workflow (Actions → Rollback → Run workflow, from `main`) with the version that should be `latest` again, and optionally the bad version to deprecate. It moves the `latest` dist-tag of the four packages and approves through the `npm` environment. It does not delete anything: npm versions are immutable. Fix forward with a `hotfix`.

### Choosing the version

The version is the branch name; nothing infers it. Version plans (`pnpm nx release plan`) feed the changelog and keep contributors honest about which package changed, but you decide `0.2.0` vs `0.1.1`. Use semver: breaking public API or token change → major (minor while `0.x`), new component or capability → minor, fixes → patch.

## What runs

### `ci.yml` (CI)

| Job       | Runs                                                                                                               | Notes                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `quality` | pull requests (except from `release/**`, `hotfix/**` and `main`), pushes to `develop`, and when `Release` calls it | `format:check`, then lint and test. On pull requests only the affected projects (`nx affected`); on pushes everything.                          |
| `build`   | after `quality`                                                                                                    | Builds the packages and the Storybook.                                                                                                          |
| `verify`  | after both                                                                                                         | Does nothing itself. It is the **single required check** for branch protection, so the list of real jobs can change without touching the rules. |

It is also a reusable workflow (`workflow_call`): `Release` calls it so a candidate is only ever published from a commit that passed CI.

### Which workflows run when

| Event                                                                  | Runs                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pull request to `develop`                                              | CI (affected lint and tests, build, Storybook), CodeQL, all four security scans, plan-check                                                                                                                                        |
| Merge into `develop`                                                   | CI in full (catches breakage from combining pull requests)                                                                                                                                                                         |
| Push to `release/**` or `hotfix/**`                                    | `Release` only; it calls CI once before publishing                                                                                                                                                                                 |
| Pull request `release/**`, `hotfix/**` → `main`, or `main` → `develop` | The two dependency scans only. CI, CodeQL, Gitleaks and Semgrep are skipped: that tree was already tested by the candidate and scanned in the pull requests that built it. A skipped job counts as passed for the required checks. |
| Merge into `main`                                                      | `Release` only (the promotion). No CI, no CodeQL, no scans.                                                                                                                                                                        |
| Schedule                                                               | CodeQL (Mondays, also the baseline for `main`), dependency re-check (daily), stale-branch cleanup (Mondays)                                                                                                                        |

Tests must run on every pull request to `develop`, on `develop` after each merge, and once on the release branch right before a candidate is published. They never run on `main`: the promotion only publishes what a verified candidate already proved.

### `release.yml` (Release)

One file on purpose: npm lets a package trust exactly one workflow file for tokenless publishing (see decisions).

| Job          | When                     | What it does                                                                                                                                                                                                                                          |
| ------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prepare`    | every push               | Decides the mode (`candidate` on `release/**`/`hotfix/**`, `promote` on `main`), derives the version from the branch (or, on `main`, from the head branch of the merged pull request), numbers the candidate, reads `ENABLE_ANDES_PUBLISH`.           |
| `ci`         | candidate                | Calls `ci.yml`.                                                                                                                                                                                                                                       |
| `candidate`  | candidate, publishing on | Environment `npm-rc`. Builds once, records a hash of the files to publish, stamps `X.Y.Z-rc.N` on the packages (in the runner only, nothing is committed), publishes under `rc`, and records the candidate as a GitHub pre-release.                   |
| `verify`     | candidate                | In an empty project: installs the four packages at the candidate version from npm, checks each resolves to exactly that version, runs `npm audit signatures`.                                                                                         |
| `ready`      | candidate                | Marks the candidate `verified` and opens or updates the release pull request as the release bot.                                                                                                                                                      |
| `promote`    | `main`, publishing on    | Environment `npm` (approval, `main` only). Finds the verified candidate by tree hash, rebuilds, compares the file hash with the candidate's (a mismatch is a warning), stamps `X.Y.Z`, publishes under `latest`, tags and creates the GitHub Release. |
| `back-merge` | after `promote`          | Opens `main → develop` as the release bot and turns auto-merge on.                                                                                                                                                                                    |

### `rollback.yml` (Rollback)

Manual. Moves `latest` back and optionally deprecates a version. Environment `npm`.

### Scripts (`.github/scripts`)

| Script               | Purpose                                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `candidate.sh`       | The bookkeeping of candidates through `gh`: `branch` (version from a branch name), `next` (next rc number, or the one already built from this commit), `create`/`mark`/`find`/`final` (the pre-release records), `pr`/`automerge` (pull requests). |
| `content-hash.sh`    | One hash over every file the four packages would publish, ignoring `package.json` (the only file that carries the version).                                                                                                                        |
| `release-prepare.sh` | `pnpm release:prepare`: writes the changelog entries from the version plans, removes the consumed plans, commits `chore(release): prepare X.Y.Z`.                                                                                                  |

### How a candidate is recorded

The GitHub pre-release `vX.Y.Z-rc.N` carries a JSON block in its body: version, candidate, commit, **tree hash**, file hash, build number, run URL and a `stage` (`pending` until the install check passes, then `verified`). The promotion reads it back; there is no other state.

## Guarantees

- A candidate is built only from a commit that passed CI.
- Only a **verified** candidate can be promoted, and only if `main` has exactly its tree. If anything else landed on `main`, the promotion fails instead of shipping unverified content.
- Publishing the final version needs a human approval (`npm` environment, `main` only).
- Packages are published with provenance (the npm page links to the commit and workflow that built them).
- The rc and final jobs use different environments, so the rc job can only run from `release/**` and `hotfix/**` and the final one only from `main`.
- Versions on npm are immutable; a rollback is a dist-tag move.

## Decisions

| Decision                                                                                | Why                                                                                                                                                                                                                                                                                                          | Alternatives rejected                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **One version for all four packages**, tags `vX.Y.Z`                                    | `ui` needs tokens and primitives of the same generation; a visual change usually touches several; consumers get one number instead of a compatibility matrix. Established component libraries release this way.                                                                                              | Independent versions per package (the previous ADR 0006): a release branch cannot be named, tags need the package name, and cross-package ranges break on pre-releases.                                                                                            |
| **Exact versions between our packages** (`ui` depends on `0.2.0`, not `>=0.0.1 <1.0.0`) | A range like `>=0.0.1 <1.0.0` does not match `0.2.0-rc.1`, so a candidate would not install.                                                                                                                                                                                                                 | Ranges with a `-0` lower bound: fragile and still lets `ui` resolve a different sibling.                                                                                                                                                                           |
| **Version = branch name**                                                               | One source of truth that a human chooses; no commit on the release branch to bump files; the same name drives candidates, tags and the pull request.                                                                                                                                                         | Letting `nx release` infer the bump from plans or commits: surprising, and impossible to name the branch up front.                                                                                                                                                 |
| **Candidates are real npm versions under the `rc` dist-tag**                            | You can install exactly what will ship, from the real registry, before it ships. `latest` never moves for a candidate.                                                                                                                                                                                       | Packing tarballs as CI artifacts (not installable by consumers); a private registry (see below).                                                                                                                                                                   |
| **Final = rebuild of the same tree, not a promotion of the candidate tarball**          | An npm tarball carries its version inside `package.json`, so `0.2.0-rc.3` cannot become `0.2.0` without changing the artifact. The tree hash proves the sources are identical, and the file hash (identical in tests) proves the output is.                                                                  | Re-tagging the candidate as `latest` (would ship a `-rc` version string as the stable release).                                                                                                                                                                    |
| **The file-hash mismatch is a warning, not an error**                                   | The tree hash is the real gate; a non-deterministic build tool should not block a release.                                                                                                                                                                                                                   | Failing hard: safer if the build is deterministic, but a false alarm blocks a release. Flip it in `release.yml` if you prefer.                                                                                                                                     |
| **One workflow file for rc and final**                                                  | npm trusted publishing binds a package to exactly one workflow file.                                                                                                                                                                                                                                         | Separate `candidate.yml`/`promote.yml`: only one of them could publish tokenless.                                                                                                                                                                                  |
| **Two environments** `npm-rc` and `npm`                                                 | Different branch rules and different approval: rc publishing is automatic from release branches, final needs a person, from `main`.                                                                                                                                                                          | A single environment: either the rc waits for approval on every push, or the final one has no gate.                                                                                                                                                                |
| **`verify` as the single required check**                                               | Branch protection names one check; adding or renaming CI jobs never breaks the rules.                                                                                                                                                                                                                        | Requiring each job: every CI change touches the ruleset.                                                                                                                                                                                                           |
| **Release bot (GitHub App) opens the pull requests**                                    | Pull requests opened with `GITHUB_TOKEN` do not start workflows, so their checks would never run.                                                                                                                                                                                                            | A personal token (tied to one person, broader scope).                                                                                                                                                                                                              |
| **Merge commits, not squash**                                                           | The promotion compares tree hashes; stacked component branches keep their history; back-merges stay trivial.                                                                                                                                                                                                 | Squash merges.                                                                                                                                                                                                                                                     |
| **Public npm registry (`@andes-ng`)**                                                   | The packages are MIT and public already; provenance and tokenless publishing need the public registry.                                                                                                                                                                                                       | GitHub Packages (scopes must equal the owner, which would force renaming to `@tamci-soft`); Verdaccio (operations for no gain). To keep the code private later, make the npm org private and set `publishConfig.access` to `restricted`; the pipeline is the same. |
| **`./node_modules/.bin/nx` after stamping the version**                                 | `pnpm exec` re-validates the workspace first, and after the version is stamped the manifests no longer match the lockfile, so it tries to reinstall and fails. Found by running the flow against a local registry.                                                                                           | Stamping and publishing in separate jobs.                                                                                                                                                                                                                          |
| **Reading the registry tags into a variable before looping**                            | A failing `gh` call in a process substitution is ignored by `set -e` and would number the candidate `rc.1` again. Found with a mocked `gh` that fails.                                                                                                                                                       | None.                                                                                                                                                                                                                                                              |
| **npm 11 installed into a temporary prefix and put on `PATH`**                          | Tokenless publishing and provenance need npm 11.5 or newer. A global install (`npm i -g`) needs write access to the runner's global directory, which hosted runners do not give; a prefix inside `RUNNER_TEMP` always works. Found with `act`, where `npm` was not even on `PATH` after the pnpm setup step. | `npm i -g npm@11`, `actions/setup-node`.                                                                                                                                                                                                                           |
| **Version plan check skipped on release, hotfix and back-merge pull requests**          | Those branches carry changes whose plans were already consumed, so the check could never pass.                                                                                                                                                                                                               | Keeping plans until after the release.                                                                                                                                                                                                                             |

## Configuration (already created)

Everything below exists in the repository settings; the values marked _placeholder_ are random and must be replaced with the real ones.

### Environments

| Environment | Used by                       | Deployment branches       | Protection                                           | Secrets                     |
| ----------- | ----------------------------- | ------------------------- | ---------------------------------------------------- | --------------------------- |
| `npm-rc`    | job `candidate`               | `release/**`, `hotfix/**` | none (automatic)                                     | `NPM_TOKEN` _(placeholder)_ |
| `npm`       | jobs `promote` and `Rollback` | `main`                    | required reviewer: `jhosepmyr` (self-review allowed) | `NPM_TOKEN` _(placeholder)_ |

### Variables and secrets (repository)

| Name                      | Kind                         | Value now     | What to put                                                                                      |
| ------------------------- | ---------------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| `ENABLE_ANDES_PUBLISH`    | variable                     | `false`       | `true` when the setup below is done. While `false`, CI runs and nothing is published or tagged.  |
| `RELEASE_APP_ID`          | variable                     | _placeholder_ | App ID of the release GitHub App.                                                                |
| `RELEASE_APP_PRIVATE_KEY` | secret                       | _placeholder_ | The App's private key (PEM).                                                                     |
| `NPM_TOKEN`               | secret, in both environments | _placeholder_ | A granular npm access token, publish rights on the `@andes-ng` scope, bypass 2FA for automation. |

### Rulesets

| Ruleset                             | Branches                  | Rules                                                                                                                                                                   |
| ----------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Protect main and develop            | `main`, `develop`         | No deletion, no force push, pull request required (merge commits only), required checks `verify` and `plan-check`. Repository admins can bypass through a pull request. |
| Protect release and hotfix branches | `release/**`, `hotfix/**` | No deletion, no force push (admins can bypass, e.g. to delete a finished release branch).                                                                               |

The repository also has _Allow auto-merge_ on (the back-merge needs it).

## One-time setup you still have to do

1. **npm organization.** Create the `andes-ng` organization on npmjs.com (the scope must exist before the first publish).
2. **Release GitHub App.** Create a GitHub App owned by the `andes-ng` organization with repository permissions _Contents: read & write_, _Pull requests: read & write_, _Workflows: read & write_; install it on this repository. Put its App ID in `RELEASE_APP_ID` and a generated private key in `RELEASE_APP_PRIVATE_KEY`.
3. **npm token.** Create a granular access token that can publish `@andes-ng/*` and replace `NPM_TOKEN` in **both** environments (Settings → Environments → each → secrets).
4. **First publish.** Set `ENABLE_ANDES_PUBLISH` to `true` and run a first release. The first publish of each package has to use the token because a package must exist before a trusted publisher can be attached to it.
5. **Tokenless publishing (after the first publish).** For each of the four packages on npmjs.com: Settings → Trusted Publisher → GitHub Actions → organization `andes-ng`, repository `andes`, workflow `release.yml`, leave the environment empty. Then delete `NPM_TOKEN` from both environments: with no token the workflow writes no npm credentials and npm exchanges the job's OIDC identity instead. Keep a token only if you want `Rollback` to work (dist-tag changes are not covered by trusted publishing).
6. **Check the rules.** If you want an approval from someone else, add them to the `npm` environment and enable _prevent self-review_; to require reviews on `main`/`develop`, raise the required approvals in the ruleset (a sole maintainer cannot approve their own pull request).

## When something fails

| Symptom                                                                                   | Cause                                                          | Fix                                                                                                                                |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `prepare` fails with `branch '...' must be release/X.Y.Z`                                 | Branch name is not a semver.                                   | Rename the branch.                                                                                                                 |
| Candidate job is skipped                                                                  | `ENABLE_ANDES_PUBLISH` is not `true`.                          | Set it.                                                                                                                            |
| `Release bot not configured`                                                              | `RELEASE_APP_ID` or `RELEASE_APP_PRIVATE_KEY` is empty.        | Fill them in.                                                                                                                      |
| Publish fails with `E401`/`ENEEDAUTH`                                                     | `NPM_TOKEN` is the placeholder or expired.                     | Replace it in the environment, re-run the failed job.                                                                              |
| Publish fails with `E403` and `You cannot publish over the previously published versions` | The version already exists on npm.                             | A re-run after a partial publish: the candidate step reuses an existing candidate, but for a final version publish the next patch. |
| `no verified candidate of X.Y.Z has tree ...`                                             | `main` has different content than the last verified candidate. | Push to the release branch again, wait for the new candidate, merge the updated pull request.                                      |
| `verify` fails on `npm audit signatures`                                                  | Provenance or registry signatures not available yet.           | Re-run after a minute; if it persists, check that `id-token: write` is granted and the repository is public.                       |
| Promotion waits forever                                                                   | Nobody approved the `npm` environment.                         | Open the run → _Review deployments_ → approve.                                                                                     |
| A bad candidate was published                                                             | —                                                              | Push a fix (the next `rc.N`), or `npm deprecate`; versions cannot be deleted after 72 hours.                                       |

Re-running failed jobs keeps the same candidate number and skips the publish step when that version is already on npm.

## How it was tested

The workflows were not only linted. They were exercised in these ways, and these limits remain:

- **`actionlint` and `shellcheck`** over every workflow and script.
- **`act`** running `prepare` on a simulated push to `release/0.1.0` (derives version `0.1.0`, candidate `0.1.0-rc.1`, publishing off) and the `CI` workflow on a simulated pull request (format, lint and the tests of most projects passed; `primitives:test` failed once in the container and passed 3 of 3 times in the same image outside `act`, and the same workflow is green on GitHub, so it is treated as an environment flake). `act` also showed that `gh` is missing from its image and that git worktrees do not work inside it (use a normal clone). The same workflow runs for real on every pull request.
- **A local npm registry (Verdaccio)** running the real commands of the candidate and final jobs: build, stamp `0.1.0-rc.1`, publish under `rc`, install from the registry in an empty project (all four resolve to the same version, `ui` pins the exact siblings), rebuild from a clean tree (the file hash was identical), stamp `0.1.0`, publish under `latest`, then the rollback script (rejects `-rc` versions, moves `latest`, deprecates).
- **A mocked `gh`** running every `candidate.sh` command: numbering, reuse of a number for the same commit, pending vs verified, lookup by tree, final release, pull request create/update/skip, auto-merge on/off, and failure when `gh` fails (23 checks).
- **`release:prepare`** on a throwaway release branch: changelogs written, plans removed, one commit.

Not covered, because they need the real services: the GitHub App token, publishing to npmjs.com (token, OIDC, provenance), `npm audit signatures` against npm's signatures, the environment approval, and the pull request and release API calls with real tokens. The first real release is the final test: use a throwaway version first (for example `release/0.0.2`) with `ENABLE_ANDES_PUBLISH` on, and check each job.

To repeat the local-registry test: start Verdaccio with an open `@andes-ng/*` policy, point `NPM_CONFIG_USERCONFIG` at a file with `registry=http://localhost:4873/` and a dummy `_authToken`, set `NPM_CONFIG_PROVENANCE=false`, and run the commands of the `candidate` job by hand.
