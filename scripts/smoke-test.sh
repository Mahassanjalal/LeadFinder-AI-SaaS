#!/usr/bin/env bash
# LeadFinder API smoke tests.
#
# Verifies the behaviors that were previously broken or missing:
#   * anonymous callers cannot read or mutate tenant data (401)
#   * role permissions are enforced server-side (403 for viewer/analyst)
#   * data is scoped to the caller's organization (foreign ids -> 404)
#   * usage/credit records are actually written (foreign-key fix)
#
# Usage:  scripts/smoke-test.sh            (dev server must run on :3000)
#         BASE_URL=http://localhost:3000 scripts/smoke-test.sh
set -uo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
DB_PATH="${DB_PATH:-prisma/data/jobs.db}"

PASS=0
FAIL=0
FAILED_NAMES=()

GREEN=$'\033[32m'; RED=$'\033[31m'; RESET=$'\033[0m'

check() { # check <name> <expected> <actual>
  local name="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    PASS=$((PASS + 1)); printf '%s✓%s %s (%s)\n' "$GREEN" "$RESET" "$name" "$actual"
  else
    FAIL=$((FAIL + 1)); FAILED_NAMES+=("$name")
    printf '%s✗%s %s — expected %s, got %s\n' "$RED" "$RESET" "$name" "$expected" "$actual"
  fi
}

status_of() { # status_of <jar> <method> <url> [json-body]
  local jar="$1" method="$2" url="$3"; shift 3
  if [[ $# -gt 0 ]]; then
    curl -s -o /dev/null -w '%{http_code}' -b "$jar" -c "$jar" -X "$method" "$url" \
      -H 'Content-Type: application/json' -d "$*"
  else
    curl -s -o /dev/null -w '%{http_code}' -b "$jar" -c "$jar" -X "$method" "$url"
  fi
}

body_of() { # body_of <jar> <method> <url> [json-body]
  local jar="$1" method="$2" url="$3"; shift 3
  if [[ $# -gt 0 ]]; then
    curl -s -b "$jar" -c "$jar" -X "$method" "$url" -H 'Content-Type: application/json' -d "$*"
  else
    curl -s -b "$jar" -c "$jar" -X "$method" "$url"
  fi
}

json_field() { # json_field <json> <js-expression over j>
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(eval(process.argv[1])??'')}catch(e){console.log('')}})" "$2" <<<"$1" 2>/dev/null
}

login() { # login <jar> <email> <password>
  local jar="$1" email="$2" password="$3"
  local csrf
  csrf=$(curl -s -c "$jar" -b "$jar" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -s -c "$jar" -b "$jar" -X POST "$BASE/api/auth/callback/credentials" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$csrf" \
    --data-urlencode "email=$email" \
    --data-urlencode "password=$password" \
    --data-urlencode "json=true" > /dev/null
}

usage_count() {
  node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('$DB_PATH');console.log(db.prepare('select count(*) c from UsageRecord').get().c)" 2>/dev/null
}

credits_used() {
  node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('$DB_PATH');console.log(db.prepare(\"select creditsUsed c from Subscription where status='active' order by createdAt desc limit 1\").get().c)" 2>/dev/null
}

ANON=$(mktemp); OWNER=$(mktemp); ANALYST=$(mktemp); VIEWER=$(mktemp); OTHER=$(mktemp)
trap 'rm -f "$ANON" "$OWNER" "$ANALYST" "$VIEWER" "$OTHER"' EXIT

# Captured before any request so cleanup can undo exactly what this run changed.
START_TS=$(node -e 'console.log(Date.now())')
CREDITS_AT_START=$(credits_used)

echo "== LeadFinder smoke tests against $BASE =="
echo

echo "-- anonymous access --"
check "GET /api/leads is 401"            401 "$(status_of "$ANON" GET  "$BASE/api/leads")"
check "POST /api/leads is 401"           401 "$(status_of "$ANON" POST "$BASE/api/leads" '{"companyName":"X"}')"
check "GET /api/analytics is 401"        401 "$(status_of "$ANON" GET  "$BASE/api/analytics")"
check "GET /api/export is 401"           401 "$(status_of "$ANON" GET  "$BASE/api/export?format=csv")"
check "GET /api/billing is 401"          401 "$(status_of "$ANON" GET  "$BASE/api/billing")"
check "GET /api/organizations is 401"    401 "$(status_of "$ANON" GET  "$BASE/api/organizations")"
check "POST /api/teams/invite is 401"    401 "$(status_of "$ANON" POST "$BASE/api/teams/invite" '{"email":"x@y.co"}')"
check "GET /api/ai/recommendations 401"  401 "$(status_of "$ANON" GET  "$BASE/api/ai/recommendations")"
check "GET /api/saved-searches is 401"   401 "$(status_of "$ANON" GET  "$BASE/api/saved-searches")"

echo
echo "-- owner session --"
login "$OWNER" "admin@leadfinder.ai" "demo1234"
LEADS_JSON=$(body_of "$OWNER" GET "$BASE/api/leads")
LEAD_COUNT=$(json_field "$LEADS_JSON" 'j.length')
ORG_JSON=$(body_of "$OWNER" GET "$BASE/api/organizations")
OWNER_ORG_ID=$(json_field "$ORG_JSON" 'j.id')
DB_LEAD_COUNT=$(node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('$DB_PATH');console.log(db.prepare('select count(*) c from \"Lead\" where orgId = ?').get('$OWNER_ORG_ID').c)" 2>/dev/null)
check "GET /api/leads matches the org's leads in the DB" "$DB_LEAD_COUNT" "$LEAD_COUNT"
check "every returned lead belongs to the caller org" "0" \
  "$(json_field "$LEADS_JSON" "j.filter(l=>l.orgId!==\"$OWNER_ORG_ID\").length")"
check "GET /api/analytics is 200"           200 "$(status_of "$OWNER" GET "$BASE/api/analytics")"
check "GET /api/organizations is 200"       "yes" "$([[ -n "$OWNER_ORG_ID" ]] && echo yes || echo no)"
check "GET /api/billing is 200"             200 "$(status_of "$OWNER" GET "$BASE/api/billing")"
check "GET /api/ai/recommendations is 200"  200 "$(status_of "$OWNER" GET "$BASE/api/ai/recommendations")"

CREATED_LEAD_ID=$(json_field "$(body_of "$OWNER" POST "$BASE/api/leads" '{"companyName":"Smoke Test Co","industry":"Technology"}')" 'j.id')
check "POST /api/leads creates a lead" "yes" "$([[ -n "$CREATED_LEAD_ID" ]] && echo yes || echo no)"

INJECT_JSON=$(body_of "$OWNER" POST "$BASE/api/leads" '{"companyName":"Injection Co","industry":"Technology","orgId":"attacker-org","id":"forced-id","createdBy":"someone"}')
check "POST /api/leads ignores orgId/id injection" "$OWNER_ORG_ID" "$(json_field "$INJECT_JSON" 'j.orgId')"
check "POST /api/leads assigns creator" "yes" "$([[ -n "$(json_field "$INJECT_JSON" 'j.createdBy')" ]] && echo yes || echo no)"
check "POST /api/leads without industry is 400" 400 "$(status_of "$OWNER" POST "$BASE/api/leads" '{"companyName":"No Industry Inc"}')"

echo
echo "-- credit tracking (foreign-key fix) --"
U_BEFORE=$(usage_count); C_BEFORE=$(credits_used)
status_of "$OWNER" GET "$BASE/api/export?format=csv" > /dev/null
status_of "$OWNER" GET "$BASE/api/export?format=json" > /dev/null
U_AFTER=$(usage_count); C_AFTER=$(credits_used)
check "CSV+JSON export adds 2 usage records" "$((U_BEFORE + 2))" "$U_AFTER"
check "exports increment subscription credits" "$((C_BEFORE + 2))" "$C_AFTER"

echo
echo "-- viewer role (read-only) --"
login "$VIEWER" "viewer@leadfinder.ai" "demo1234"
check "viewer GET /api/leads is 200"        200 "$(status_of "$VIEWER" GET "$BASE/api/leads")"
check "viewer GET /api/analytics is 200"    200 "$(status_of "$VIEWER" GET "$BASE/api/analytics")"
check "viewer POST /api/leads is 403"       403 "$(status_of "$VIEWER" POST "$BASE/api/leads" '{"companyName":"Nope Inc"}')"
check "viewer PATCH lead is 403"            403 "$(status_of "$VIEWER" PATCH "$BASE/api/leads/$CREATED_LEAD_ID" '{"pipelineStage":"Won"}')"
check "viewer DELETE lead is 403"           403 "$(status_of "$VIEWER" DELETE "$BASE/api/leads/$CREATED_LEAD_ID")"
check "viewer POST note is 403"             403 "$(status_of "$VIEWER" POST "$BASE/api/leads/$CREATED_LEAD_ID/notes" '{"content":"hi"}')"
check "viewer POST invite is 403"           403 "$(status_of "$VIEWER" POST "$BASE/api/teams/invite" '{"email":"x@y.co"}')"
check "viewer PATCH organization is 403"    403 "$(status_of "$VIEWER" PATCH "$BASE/api/organizations" '{"name":"Hijacked"}')"

echo
echo "-- analyst role --"
login "$ANALYST" "analyst@leadfinder.ai" "demo1234"
check "analyst GET /api/leads is 200"      200 "$(status_of "$ANALYST" GET "$BASE/api/leads")"
ANALYST_LEAD_ID=$(json_field "$(body_of "$ANALYST" POST "$BASE/api/leads" '{"companyName":"Analyst Co","industry":"Finance"}')" 'j.id')
check "analyst POST /api/leads creates lead" "yes" "$([[ -n "$ANALYST_LEAD_ID" ]] && echo yes || echo no)"
check "analyst DELETE lead is 403"         403 "$(status_of "$ANALYST" DELETE "$BASE/api/leads/$CREATED_LEAD_ID")"
check "analyst POST invite is 403"         403 "$(status_of "$ANALYST" POST "$BASE/api/teams/invite" '{"email":"x@y.co"}')"
check "analyst POST billing plan is 403"   403 "$(status_of "$ANALYST" POST "$BASE/api/billing" '{"plan":"free"}')"
check "analyst POST saved search is 201"   201 "$(status_of "$ANALYST" POST "$BASE/api/saved-searches" '{"name":"smoke-search","params":{"industry":"Tech"}}')"

echo
echo "-- cross-tenant isolation --"
RAND_EMAIL="smoke-$(date +%s)@example.com"
REG=$(body_of "$ANON" POST "$BASE/api/auth/register" "{\"name\":\"Smoke Tenant\",\"email\":\"$RAND_EMAIL\",\"password\":\"password123\",\"orgName\":\"Smoke Tenant Org\"}")
OTHER_ORG_ID=$(json_field "$REG" 'j.organization && j.organization.id')
check "register creates a second org" "yes" "$([[ -n "$OTHER_ORG_ID" ]] && echo yes || echo no)"
login "$OTHER" "$RAND_EMAIL" "password123"
check "other org sees 0 leads" "0" "$(json_field "$(body_of "$OTHER" GET "$BASE/api/leads")" 'j.length')"
check "other org GET foreign lead is 404"    404 "$(status_of "$OTHER" GET "$BASE/api/leads/$CREATED_LEAD_ID")"
check "other org PATCH foreign lead is 404"  404 "$(status_of "$OTHER" PATCH "$BASE/api/leads/$CREATED_LEAD_ID" '{"pipelineStage":"Won"}')"
check "other org DELETE foreign lead is 404" 404 "$(status_of "$OTHER" DELETE "$BASE/api/leads/$CREATED_LEAD_ID")"
check "other org POST note on foreign lead"  404 "$(status_of "$OTHER" POST "$BASE/api/leads/$CREATED_LEAD_ID/notes" '{"content":"cross"}')"
check "other org GET foreign activities 404" 404 "$(status_of "$OTHER" GET "$BASE/api/leads/$CREATED_LEAD_ID/activities")"
check "other org GET foreign membership 404" 404 "$(status_of "$OTHER" PATCH "$BASE/api/organizations/members/$(json_field "$ORG_JSON" 'j.members[0].id')" '{"role":"viewer"}')"

echo
echo "-- membership management --"
OWNER_MEMBERSHIP_ID=$(json_field "$ORG_JSON" "(j.members.find(m=>m.role==='owner')||{}).id")
check "owner cannot demote the owner membership" 403 \
  "$(status_of "$OWNER" PATCH "$BASE/api/organizations/members/$OWNER_MEMBERSHIP_ID" '{"role":"viewer"}')"
NON_OWNER_MEMBER_ID=$(json_field "$ORG_JSON" "(j.members.find(m=>m.role!=='owner')||{}).id")
NON_OWNER_MEMBER_ROLE=$(json_field "$ORG_JSON" "(j.members.find(m=>m.role!=='owner')||{}).role")
check "owner can update a non-owner member role" 200 \
  "$(status_of "$OWNER" PATCH "$BASE/api/organizations/members/$NON_OWNER_MEMBER_ID" "{\"role\":\"$NON_OWNER_MEMBER_ROLE\"}")"
INVITE_JSON=$(body_of "$OWNER" POST "$BASE/api/teams/invite" '{"email":"smoke-invite@example.com","role":"analyst"}')
INVITE_TOKEN=$(json_field "$INVITE_JSON" 'j.token')
check "owner can create an invite" "yes" "$([[ -n "$INVITE_TOKEN" ]] && echo yes || echo no)"
check "invite link is publicly readable" 200 "$(status_of "$ANON" GET "$BASE/api/invites/$INVITE_TOKEN")"
check "duplicate invite is rejected" 409 \
  "$(status_of "$OWNER" POST "$BASE/api/teams/invite" '{"email":"smoke-invite@example.com","role":"analyst"}')"

echo
echo "-- cleanup (restore seeded data) --"
check "cleanup: delete created lead" 200 "$(status_of "$OWNER" DELETE "$BASE/api/leads/$CREATED_LEAD_ID")"
node -e "
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('$DB_PATH');
const run=(sql,...args)=>{ try { db.prepare(sql).run(...args); } catch (e) { console.error('cleanup skipped:', e.message); } };
run(\"DELETE FROM Lead WHERE companyName IN ('Smoke Test Co','Injection Co','Analyst Co','Second Co','No Industry Inc')\");
run('DELETE FROM Invite WHERE email = ?', 'smoke-invite@example.com');
run(\"DELETE FROM SavedSearch WHERE name = 'smoke-search'\");
const cutoff = Number(process.argv[1]);
run(\"DELETE FROM UsageRecord WHERE type='export' AND createdAt > ?\", cutoff);
run('DELETE FROM Organization WHERE name = ?', 'Smoke Tenant Org');
run('DELETE FROM User WHERE email LIKE ?', 'smoke-%@example.com');
if (process.argv[2]) {
  try {
    db.prepare(\"UPDATE Subscription SET creditsUsed = ? WHERE status='active'\").run(Number(process.argv[2]));
  } catch (e) { console.error('credits restore skipped:', e.message); }
}
console.log('cleanup: smoke data removed, credits restored');
" "$START_TS" "$CREDITS_AT_START" 2>/dev/null

echo
if [[ $FAIL -eq 0 ]]; then
  printf '%sAll %d checks passed.%s\n' "$GREEN" "$PASS" "$RESET"
  exit 0
else
  printf '%s%d passed, %d failed:%s\n' "$RED" "$PASS" "$FAIL" "$RESET"
  printf ' - %s\n' "${FAILED_NAMES[@]}"
  exit 1
fi
