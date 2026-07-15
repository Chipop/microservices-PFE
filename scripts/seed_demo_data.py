#!/usr/bin/env python3
"""
Seed FlowForge with realistic demo data through the service APIs.

Run after the Docker Compose stack is up:
    python3 scripts/seed_demo_data.py

Useful overrides:
    FLOWFORGE_GATEWAY_URL=http://localhost:8080 FLOWFORGE_SEED_PREFIX=demo python3 scripts/seed_demo_data.py
"""

from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any


BASE_URL = os.getenv("FLOWFORGE_GATEWAY_URL", "http://localhost:8080").rstrip("/")
PREFIX = os.getenv("FLOWFORGE_SEED_PREFIX", "demo").strip().lower() or "demo"
PASSWORD = os.getenv("FLOWFORGE_SEED_PASSWORD", "DemoPass1234!")
TIMEOUT_SECONDS = float(os.getenv("FLOWFORGE_SEED_TIMEOUT", "10"))


class ApiError(RuntimeError):
    def __init__(self, method: str, path: str, status: int, body: Any):
        super().__init__(f"{method} {path} returned {status}: {body}")
        self.status = status
        self.body = body


@dataclass
class DemoUser:
    username: str
    email: str
    token: str
    user_id: int


def request(
    method: str,
    path: str,
    *,
    token: str | None = None,
    payload: dict[str, Any] | None = None,
    query: dict[str, Any] | None = None,
    expected: tuple[int, ...] = (200,),
) -> Any:
    url = f"{BASE_URL}{path}"
    if query:
        url = f"{url}?{urllib.parse.urlencode(query)}"
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as response:
            body = response.read().decode("utf-8")
            parsed = json.loads(body) if body else None
            if response.status not in expected:
                raise ApiError(method, path, response.status, parsed)
            return parsed
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            parsed = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            parsed = raw
        if exc.code in expected:
            return parsed
        raise ApiError(method, path, exc.code, parsed) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"Cannot reach {BASE_URL}. Start the stack first, for example: docker compose up -d --build"
        ) from exc


def decode_user_id(access_token: str) -> int:
    parts = access_token.split(".")
    if len(parts) < 2:
        raise RuntimeError("Auth service returned a token that is not a JWT.")
    payload = parts[1] + "=" * (-len(parts[1]) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload.encode("ascii")))
    return int(claims["user_id"])


def register_or_login(username: str, email: str) -> DemoUser:
    register_payload = {"username": username, "email": email, "password": PASSWORD}
    try:
        request("POST", "/api/auth/register/", payload=register_payload, expected=(201,))
        print(f"created user {username}")
    except ApiError as exc:
        if exc.status != 400:
            raise
        print(f"reusing user {username}")

    login = request(
        "POST",
        "/api/auth/login/",
        payload={"username": username, "password": PASSWORD},
        expected=(200,),
    )
    token = login["access"]
    return DemoUser(username=username, email=email, token=token, user_id=decode_user_id(token))


def wait_for_event_consumers(owner: DemoUser) -> None:
    for _ in range(12):
        try:
            request("GET", "/api/profiles/", token=owner.token, expected=(200,))
            request("GET", "/api/workspaces/", token=owner.token, expected=(200,))
            return
        except Exception:
            time.sleep(1)


def find_by_name(items: list[dict[str, Any]], name: str) -> dict[str, Any] | None:
    return next((item for item in items if item.get("name") == name), None)


def ensure_workspace(owner: DemoUser) -> dict[str, Any]:
    name = f"{PREFIX.title()} To Do Lists"
    existing = find_by_name(request("GET", "/api/workspaces/", token=owner.token), name)
    if existing:
        print(f"reusing workspace {name}")
        return existing
    workspace = request(
        "POST",
        "/api/workspaces/",
        token=owner.token,
        payload={
            "name": name,
            "description": "Everyday lists for personal tasks, errands, travel plans, and work reminders.",
            "visibility": "PRIVATE",
            "publicContributionsEnabled": False,
        },
        expected=(201,),
    )
    print(f"created workspace {name}")
    return workspace


def invite_workspace_member(owner: DemoUser, member: DemoUser, workspace_id: int, role: str) -> None:
    invitations = request("GET", f"/api/workspaces/{workspace_id}/invitations", token=owner.token)
    accepted = [invite for invite in invitations if invite.get("email") == member.email and invite.get("status") == "ACCEPTED"]
    if accepted:
        print(f"workspace member already accepted {member.username}")
        return

    invite = request(
        "POST",
        f"/api/workspaces/{workspace_id}/invitations",
        token=owner.token,
        payload={"email": member.email, "role": role},
        expected=(201,),
    )
    token = invite.get("token")
    if token:
        request("POST", f"/api/workspaces/invitations/{token}/accept", token=member.token)
        print(f"added workspace member {member.username} as {role}")


def ensure_category(owner: DemoUser, workspace_id: int, name: str, description: str) -> dict[str, Any]:
    categories = request("GET", "/api/categories/", token=owner.token, query={"workspace_id": workspace_id})
    existing = find_by_name(categories, name)
    if existing:
        print(f"reusing category {name}")
        return existing
    category = request(
        "POST",
        "/api/categories/",
        token=owner.token,
        payload={"workspace_id": workspace_id, "name": name, "description": description},
        expected=(201,),
    )
    print(f"created category {name}")
    return category


def ensure_task(owner: DemoUser, category_id: int, title: str, payload: dict[str, Any]) -> dict[str, Any]:
    tasks = request("GET", "/api/tasks/", token=owner.token, query={"category_id": category_id})
    existing = next((task for task in tasks if task.get("title") == title), None)
    if existing:
        print(f"reusing task {title}")
        return existing
    task = request(
        "POST",
        "/api/tasks/",
        token=owner.token,
        payload={"category_id": category_id, "title": title, **payload},
        expected=(201,),
    )
    print(f"created task {title}")
    return task


def post_optional(method: str, path: str, *, token: str, payload: dict[str, Any], expected: tuple[int, ...] = (200, 201)) -> None:
    try:
        request(method, path, token=token, payload=payload, expected=expected)
    except ApiError as exc:
        if exc.status not in (400, 403, 404, 409):
            raise


def enrich_task(owner: DemoUser, task: dict[str, Any], assignee: DemoUser, tags: list[str], subtasks: list[str]) -> None:
    task_id = int(task["id"])
    post_optional("POST", f"/api/tasks/{task_id}/assignments", token=owner.token, payload={"assignee_user_id": assignee.user_id}, expected=(201, 200))
    for tag in tags:
        post_optional("POST", f"/api/tasks/{task_id}/tags", token=owner.token, payload={"name": tag, "color": "#00a9ad"}, expected=(201, 200))
    for position, title in enumerate(subtasks):
        post_optional("POST", f"/api/tasks/{task_id}/subtasks", token=owner.token, payload={"title": title, "done": position == 0, "position": position}, expected=(201, 200))
    reminder = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    post_optional("POST", f"/api/tasks/{task_id}/reminders", token=owner.token, payload={"remind_at": reminder}, expected=(201, 200))


def ensure_comment(user: DemoUser, task_id: int, body: str) -> None:
    comments = request("GET", "/api/comments/", token=user.token, query={"task_id": task_id})
    if any(comment.get("body") == body for comment in comments):
        return
    request("POST", "/api/comments/", token=user.token, payload={"task_id": task_id, "body": body}, expected=(201,))


def iso_due(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def main() -> int:
    print(f"Seeding {BASE_URL} with prefix {PREFIX!r}")

    users = [
        register_or_login(f"{PREFIX}_alice", f"{PREFIX}_alice@example.com"),
        register_or_login(f"{PREFIX}_bruno", f"{PREFIX}_bruno@example.com"),
        register_or_login(f"{PREFIX}_chloe", f"{PREFIX}_chloe@example.com"),
    ]
    owner, friend, family = users
    wait_for_event_consumers(owner)

    workspace = ensure_workspace(owner)
    workspace_id = int(workspace["id"])
    invite_workspace_member(owner, friend, workspace_id, "MEMBER")
    invite_workspace_member(owner, family, workspace_id, "MEMBER")

    suffix = "" if PREFIX == "demo" else f" ({PREFIX})"

    categories = [
        ensure_category(owner, workspace_id, f"Personal{suffix}", "Private reminders, appointments, and habits."),
        ensure_category(owner, workspace_id, f"Work{suffix}", "Job tasks, follow-ups, and weekly priorities."),
        ensure_category(owner, workspace_id, f"Travel{suffix}", "Trip planning, bookings, packing, and documents."),
        ensure_category(owner, workspace_id, f"Home{suffix}", "Household chores, repairs, shopping, and errands."),
        ensure_category(owner, workspace_id, f"Health{suffix}", "Appointments, medication, exercise, and wellness routines."),
    ]

    task_specs = [
        (
            categories[0],
            "Renew passport photos",
            {"description": "Stop by the photo shop and save the digital copy before submitting the renewal form.", "priority": "high", "status": "in_progress", "due_at": iso_due(3)},
            owner,
            ["personal", "documents"],
            ["Check passport photo requirements", "Take photos", "Upload digital copy"],
        ),
        (
            categories[1],
            "Send weekly status update",
            {"description": "Summarize completed work, blockers, and priorities for next week.", "priority": "normal", "status": "todo", "due_at": iso_due(2)},
            owner,
            ["work", "email"],
            ["List completed items", "Add blockers", "Send before Friday afternoon"],
        ),
        (
            categories[2],
            "Book train tickets for weekend trip",
            {"description": "Compare morning departures, choose seats, and download tickets to the phone.", "priority": "urgent", "status": "todo", "due_at": iso_due(1)},
            owner,
            ["travel", "booking"],
            ["Compare departure times", "Choose seats", "Save tickets offline"],
        ),
        (
            categories[3],
            "Buy groceries for the week",
            {"description": "Pick up basics for breakfast, dinner prep, and lunch snacks.", "priority": "normal", "status": "todo", "due_at": iso_due(1)},
            family,
            ["home", "shopping"],
            ["Check pantry", "Add vegetables and fruit", "Pick up laundry detergent"],
        ),
        (
            categories[4],
            "Schedule annual checkup",
            {"description": "Call the clinic, choose a morning slot, and add the appointment to the calendar.", "priority": "high", "status": "review", "due_at": iso_due(4)},
            owner,
            ["health", "appointment"],
            ["Call clinic", "Confirm insurance details", "Add calendar reminder"],
        ),
        (
            categories[0],
            "Pay electricity bill",
            {"description": "Pay before the due date and save the receipt.", "priority": "normal", "status": "done", "due_at": iso_due(-1), "done": True},
            owner,
            ["personal", "bills"],
            ["Check amount", "Pay online", "Download receipt"],
        ),
        (
            categories[2],
            "Pack carry-on bag",
            {"description": "Prepare documents, charger, toiletries, and a light jacket.", "priority": "low", "status": "todo", "due_at": iso_due(6)},
            friend,
            ["travel", "packing"],
            ["Print booking confirmation", "Pack charger", "Refill travel-size toiletries"],
        ),
    ]

    created_tasks: list[dict[str, Any]] = []
    for category, title, payload, assignee, tags, subtasks in task_specs:
        task = ensure_task(owner, int(category["id"]), title, payload)
        enrich_task(owner, task, assignee, tags, subtasks)
        created_tasks.append(task)

    ensure_comment(owner, int(created_tasks[0]["id"]), "Photo shop closes at 6 PM, so this needs to be done before heading home.")
    ensure_comment(family, int(created_tasks[3]["id"]), "Please add coffee and dish soap if they are not already on the list.")
    ensure_comment(friend, int(created_tasks[6]["id"]), "I can bring the extra phone charger for the trip.")

    print("")
    print("Seed complete.")
    print(f"Demo users: {', '.join(user.username for user in users)}")
    print(f"Password: {PASSWORD}")
    print(f"Workspace: {workspace['name']} (id={workspace_id})")
    print(f"Tasks created/reused: {len(created_tasks)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"\nSeed failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
