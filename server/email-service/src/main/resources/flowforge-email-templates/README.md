# FlowForge Email Templates

This package contains standalone HTML email templates styled with the FlowForge palette.

## Included

Welcome, email verification, password reset, password changed, task assignment, workspace invitation, task update, deadline reminder, comments, mentions, completion, role changes, attachments, login alerts, ownership transfer, and a generic future-use template.

## Logo handling

For local previews, templates reference `../assets/flowforge-logo.png`.

For real emails, relative paths do not work in recipients' mail clients. Use a public HTTPS URL, attach the logo with a CID and use `src="cid:flowforge-logo"`, or inject a `{{logo_url}}` variable.

## Variables

Templates use double-brace placeholders such as `{{user_name}}`, `{{task_title}}`, and `{{action_url}}`. Replace them with Thymeleaf, FreeMarker, Mustache, Pebble, or your chosen Java template engine.

## Compatibility

The layouts use tables, inline styles, and a small responsive style block for broad Gmail, Outlook, Apple Mail, and mobile support. Modern CSS in email remains a small rebellion against civilization, so the templates deliberately use the reliable old machinery.

## Production checklist

- Replace the relative logo path with HTTPS or CID.
- Add a legal business address where required.
- Add notification preference or unsubscribe links for optional emails.
- Escape user-generated values before injection.
- Send both HTML and plain-text MIME versions.
