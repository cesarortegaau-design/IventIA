# Deploy to Production

Stage all modified tracked files, create a commit with the provided message, and push to `origin master` to trigger the Vercel auto-deploy.

## Steps

1. Run `git status` to see what is staged/unstaged.
2. Run `git add` on all files that were modified as part of the current task (prefer specific file paths over `-A` unless the task touched many files).
3. Commit with this exact message format:
   ```
   $ARGUMENTS

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```
4. Run `git push origin master`.
5. Confirm the push succeeded and tell the user that Vercel will auto-deploy in ~1-2 minutes.

## Context

- Remote: `https://github.com/cesarortegaau-design/iventia.git` (may show redirect to `IventIA.git` — that is normal)
- Admin deploys to Vercel: `https://ivent-ia-admin.vercel.app`
- Portal deploys to Vercel: `https://ivent-ia-portal.vercel.app`
- API deploys to Render (auto-deploys on push to master): `https://iventia-api.onrender.com`
- Supplier Portal deploys to Vercel: `https://ivent-ia-supplier-portal.vercel.app`
- If `$ARGUMENTS` is empty, ask the user for a commit message before proceeding.
