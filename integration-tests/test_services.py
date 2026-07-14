#!/usr/bin/env python3
"""
End-to-end test for the task microservice platform.

Walks the real cross-service flow:
  Auth (register -> login -> JWT)  ->  Tasks / Workspaces (JWT-scoped)  ->  Profiles

Run from anywhere that can reach the host ports:
    pip install requests
    python test_platform.py

Each check prints PASS / FAIL. Exit code is non-zero if anything fails,
so you can wire this into CI later if you want.
"""

import sys
import uuid
import requests

# ---------------------------------------------------------------------------
# Config — match your docker-compose host ports and the secrets you set.
# ---------------------------------------------------------------------------
AUTH     = "http://localhost:8002/api/auth"
PROFILES = "http://localhost:8001/api/profiles"
TASKS    = "http://localhost:8003/api/tasks"
WORKSPACES = "http://localhost:8004/api/workspaces"
NOTIFICATIONS = "http://localhost:8006/api/notifications"

INTERNAL_KEY = "INTERNAL-CHANGE-ME"   # must equal INTERNAL_API_KEY in compose

TIMEOUT = 5

# ---------------------------------------------------------------------------
# Tiny test harness — no framework, just counts and colored-ish output.
# ---------------------------------------------------------------------------
_passed = 0
_failed = 0

def check(label, condition, detail=""):
    global _passed, _failed
    if condition:
        _passed += 1
        print(f"  [PASS] {label}")
    else:
        _failed += 1
        print(f"  [FAIL] {label}" + (f"  -> {detail}" if detail else ""))

def section(title):
    print(f"\n=== {title} ===")

def safe(method, url, **kw):
    """Call requests but turn connection errors into a readable failure
    instead of a traceback (so a service being down doesn't kill the run)."""
    try:
        return getattr(requests, method)(url, timeout=TIMEOUT, **kw)
    except requests.RequestException as e:
        print(f"  [ERROR] {method.upper()} {url} -> {e}")
        return None

# ---------------------------------------------------------------------------
# Unique identity per run so re-running doesn't collide on the unique username.
# ---------------------------------------------------------------------------
SUFFIX   = uuid.uuid4().hex[:8]
USERNAME = f"alice_{SUFFIX}"
PASSWORD = "pass1234"
EMAIL    = f"{USERNAME}@test.com"


def main():
    # -----------------------------------------------------------------------
    section("1. AUTH — register")
    # -----------------------------------------------------------------------
    r = safe("post", f"{AUTH}/register/",
             json={"username": USERNAME, "email": EMAIL, "password": PASSWORD})
    check("register returns 201", r is not None and r.status_code == 201,
          detail=f"got {r.status_code if r else 'no response'}: {r.text if r else ''}")

    # -----------------------------------------------------------------------
    section("2. AUTH — login issues a JWT")
    # -----------------------------------------------------------------------
    r = safe("post", f"{AUTH}/login/",
             json={"username": USERNAME, "password": PASSWORD})
    ok = r is not None and r.status_code == 200 and "access" in r.json()
    check("login returns 200 with access token", ok,
          detail=f"got {r.status_code if r else 'no response'}: {r.text if r else ''}")
    if not ok:
        print("\nCannot continue without a token — stopping.")
        return finish()

    access = r.json()["access"]
    auth_header = {"Authorization": f"Bearer {access}"}

    # also check wrong password is rejected
    r = safe("post", f"{AUTH}/login/",
             json={"username": USERNAME, "password": "WRONG"})
    check("login with wrong password is rejected (401)",
          r is not None and r.status_code == 401,
          detail=f"got {r.status_code if r else 'no response'}")

    # -----------------------------------------------------------------------
    section("3. TASKS / NOTIFICATIONS — JWT is required")
    # -----------------------------------------------------------------------
    # No token -> must be rejected
    r = safe("post", f"{TASKS}/", json={"title": "should fail"})
    check("create task WITHOUT token is rejected (401)",
          r is not None and r.status_code == 401,
          detail=f"got {r.status_code if r else 'no response'}")

    r = safe("get", f"{NOTIFICATIONS}")
    check("list notifications WITHOUT token is rejected (401)",
          r is not None and r.status_code == 401,
          detail=f"got {r.status_code if r else 'no response'}")

    r = safe("get", f"{NOTIFICATIONS}/unread-count", headers=auth_header)
    check("notification unread count WITH token returns 200",
          r is not None and r.status_code == 200 and "count" in r.json(),
          detail=f"got {r.status_code if r else 'no response'}: {r.text if r else ''}")

    # With token -> created, scoped to this user
    r = safe("post", f"{TASKS}/", headers=auth_header, json={"title": "first task"})
    ok = r is not None and r.status_code == 201
    check("create task WITH token returns 201", ok,
          detail=f"got {r.status_code if r else 'no response'}: {r.text if r else ''}")
    task_id = r.json().get("id") if ok else None

    if task_id:
        r = safe("patch", f"{TASKS}/{task_id}/", headers=auth_header, json={"done": True})
        check("complete task through done compatibility returns 200",
              r is not None and r.status_code == 200 and r.json().get("done") is True,
              detail=f"got {r.status_code if r else 'no response'}: {r.text if r else ''}")

    # List -> should contain the task we just made
    r = safe("get", f"{TASKS}/", headers=auth_header)
    titles = [t.get("title") for t in r.json()] if (r and r.status_code == 200) else []
    check("list tasks returns our task", "first task" in titles,
          detail=f"got {titles}")

    # -----------------------------------------------------------------------
    section("4. TASKS — scoping: a second user can't see the first user's tasks")
    # -----------------------------------------------------------------------
    bob = f"bob_{SUFFIX}"
    safe("post", f"{AUTH}/register/",
         json={"username": bob, "email": f"{bob}@test.com", "password": PASSWORD})
    r = safe("post", f"{AUTH}/login/", json={"username": bob, "password": PASSWORD})
    if r and r.status_code == 200:
        bob_header = {"Authorization": f"Bearer {r.json()['access']}"}
        r = safe("get", f"{TASKS}/", headers=bob_header)
        bob_titles = [t.get("title") for t in r.json()] if (r and r.status_code == 200) else []
        check("second user does NOT see first user's tasks",
              "first task" not in bob_titles,
              detail=f"bob saw {bob_titles}")

        # -------------------------------------------------------------------
        section("5. WORKSPACES — create, invite, accept, and list members")
        # -------------------------------------------------------------------
        r = safe("post", f"{WORKSPACES}/",
                 headers=auth_header,
                 json={"name": f"workspace_{SUFFIX}", "description": "integration test"})
        ok = r is not None and r.status_code == 201 and r.json().get("currentUserRole") == "OWNER"
        check("create workspace returns 201 and owner role", ok,
              detail=f"got {r.status_code if r else 'no response'}: {r.text if r else ''}")
        workspace_id = r.json().get("id") if ok else None

        invitation_token = None
        if workspace_id:
            r = safe("post", f"{WORKSPACES}/{workspace_id}/invitations",
                     headers=auth_header,
                     json={"email": f"{bob}@test.com", "role": "MEMBER"})
            ok = r is not None and r.status_code == 201 and r.json().get("token")
            check("invite workspace member returns a token", ok,
                  detail=f"got {r.status_code if r else 'no response'}: {r.text if r else ''}")
            invitation_token = r.json().get("token") if ok else None

        if invitation_token:
            r = safe("post", f"{WORKSPACES}/invitations/{invitation_token}/accept", headers=bob_header)
            check("second user accepts workspace invitation",
                  r is not None and r.status_code == 200 and r.json().get("status") == "ACCEPTED",
                  detail=f"got {r.status_code if r else 'no response'}: {r.text if r else ''}")

        if workspace_id:
            r = safe("get", f"{WORKSPACES}/{workspace_id}/members", headers=auth_header)
            member_ids = [m.get("userId") for m in r.json().get("members", [])] if (r and r.status_code == 200) else []
            check("workspace member list includes owner and accepted member",
                  len(member_ids) >= 2,
                  detail=f"got {member_ids}")
    else:
        check("second user login (for scoping test)", False, detail="could not log in bob")

    # -----------------------------------------------------------------------
    section("6. PROFILES — réception: profile was auto-created on registration")
    # -----------------------------------------------------------------------
    # When alice registered, Auth should have POSTed her profile to Profiles.
    # Reading with alice's own JWT should return exactly her profile.
    r = safe("get", f"{PROFILES}/", headers=auth_header)
    if r is not None and r.status_code == 200:
        usernames = [p.get("username") for p in r.json()]
        check("alice's profile exists (Auth's réception worked)",
              USERNAME in usernames, detail=f"got {usernames}")
        check("alice sees ONLY her own profile (scoped)",
              usernames == [USERNAME], detail=f"got {usernames}")
    else:
        check("read profiles with JWT returns 200", False,
              detail=f"got {r.status_code if r else 'no response'} "
                     f"(if 401, profiles JWT auth isn't wired; if 200 but empty, réception didn't fire)")

    # -----------------------------------------------------------------------
    section("7. PROFILES — guards: create needs the internal key, not a user JWT")
    # -----------------------------------------------------------------------
    # A normal user JWT must NOT be allowed to create a profile directly.
    r = safe("post", f"{PROFILES}/", headers=auth_header,
             json={"auth_user_id": 999, "username": "intruder", "email": "x@x.com"})
    check("create profile with USER jwt is forbidden (401/403)",
          r is not None and r.status_code in (401, 403),
          detail=f"got {r.status_code if r else 'no response'}")

    # Wrong internal key -> forbidden
    r = safe("post", f"{PROFILES}/",
             headers={"X-Internal-Key": "WRONG-KEY"},
             json={"auth_user_id": 998, "username": "nope", "email": "n@n.com"})
    check("create profile with WRONG internal key is forbidden (401/403)",
          r is not None and r.status_code in (401, 403),
          detail=f"got {r.status_code if r else 'no response'}")

    # Correct internal key -> allowed (this is what Auth does internally)
    r = safe("post", f"{PROFILES}/",
             headers={"X-Internal-Key": INTERNAL_KEY},
             json={"auth_user_id": 997, "username": f"svc_{SUFFIX}", "email": "s@s.com"})
    check("create profile with CORRECT internal key returns 201",
          r is not None and r.status_code == 201,
          detail=f"got {r.status_code if r else 'no response'}: {r.text if r else ''}")

    finish()


def finish():
    print("\n" + "-" * 50)
    print(f"  {_passed} passed, {_failed} failed")
    print("-" * 50)
    sys.exit(1 if _failed else 0)


if __name__ == "__main__":
    main()
