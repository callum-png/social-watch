Deploy changes to production. This is the ONLY way code goes live.

Follow every step exactly. Do NOT skip any step.

## Step 1: Pull latest code
Run `git pull` in the project root.
- If there are merge conflicts: show the user which files conflict, attempt to resolve them automatically, and ask the user to verify before continuing.
- If pull fails for any reason: STOP and tell the user what happened.

## Step 2: Check for uncommitted changes
Run `git status`.
- If there are uncommitted changes: stage them, create a descriptive commit, and continue.
- If clean: continue.

## Step 3: Build check
Run `npx next build`.
- If the build fails: STOP. Show the user the error. Fix it if you can, then re-run the build. Do NOT continue until the build passes.

## Step 4: Push to GitHub
Run `git push`.
- If push fails due to remote changes: run `git pull --rebase` then `git push` again.
- If push still fails: STOP and tell the user.

## Step 5: Deploy to Vercel
Run `npx vercel --prod` from the project root.
- If deploy fails: STOP and show the error. Attempt to fix and retry once.

## Step 6: Post-deploy verification (all 5 must pass)
Run ALL of these checks in parallel:

1. **Login works**: `curl -s -X POST https://social-watch-mu.vercel.app/api/auth/login -H "Content-Type: application/json" -d '{"password":"shownmedia2026"}'` — must return `{"success":true,...}`
2. **Social Watch loads**: `curl -s -o /dev/null -w "%{http_code}" https://social-watch-mu.vercel.app/dashboard` — must return 200 or 307
3. **Post Tracker loads**: `curl -s -o /dev/null -w "%{http_code}" https://social-watch-mu.vercel.app/post-tracker` — must return 200 or 307
4. **PT backend alive**: `curl -s https://backend-production-3069.up.railway.app/api/health` — must return `{"status":"healthy",...}`
5. **No deploy errors**: `npx vercel inspect <deployment-url> --logs | tail -5` — must show `● Ready`

## Step 7: Report
Show a summary table:
- Each check: pass/fail
- Deployment URL
- What changed (commit message)

If ANY check fails: warn the user and offer to rollback with `vercel redeploy <previous-url>`.
