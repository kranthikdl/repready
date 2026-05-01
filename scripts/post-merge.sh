#!/bin/bash
# Post-merge hook executed by Replit after `git pull` / merge.
# Callsite: `.replit` `[postMerge].path = "scripts/post-merge.sh"`.
# Reinstalls deps and pushes any new Drizzle schema changes to the database.
set -e
npm install
npm run db:push
