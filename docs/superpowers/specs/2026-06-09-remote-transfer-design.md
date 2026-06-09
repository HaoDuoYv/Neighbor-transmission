# Remote Transfer Design

## Summary

Add a first-level "Remote Transfer" entry to the main chat screen sidebar. Selecting it replaces the normal chat content area with an embedded WeChat File Transfer Assistant page at `https://filehelper.weixin.qq.com/`.

The feature is intended for the Electron desktop app first. The embedded experience should be the default in Electron, with a visible external-open action for cases where the user wants or needs to continue in their system browser.

## Requirements

- Add "Remote Transfer" alongside the existing first-level sidebar entries such as Messages, Contacts, and Apps.
- Clicking the entry keeps the user in the main shell and renders the remote transfer content in the right-side chat area.
- The embedded page loads `https://filehelper.weixin.qq.com/` by default.
- Provide an "Open externally" action from the remote transfer panel.
- Keep the existing chat, contacts, app center, AI, theme, profile, and notification flows intact.
- Avoid backend changes unless the frontend cannot safely open external URLs from Electron.

## Constraints

The WeChat File Transfer Assistant page responds with `X-Frame-Options: SAMEORIGIN`, so a standard browser `iframe` is likely to be blocked. The Electron desktop app should use a controlled `<webview>` host instead of an `iframe`.

For non-Electron browser mode, the page should not pretend embedding is reliable. It should show a clear fallback panel with an external-open action.

## Proposed Architecture

### Main Shell State

Extend the main `HomePage.vue` navigation state from `messages | contacts` to include `remote-transfer`.

The left sidebar button changes `activeTab` to `remote-transfer`. This state is stored with the same existing `home-active-tab` local storage key so the user's selected section can persist across refreshes.

### Sidebar Entry

Add a compact icon button below Contacts and before Apps. The active state should match the current sidebar visual pattern. The button label is exposed through a `title` attribute, with text such as `远程传输`.

### Middle Column

When `activeTab` is `remote-transfer`, the middle list column should show a simple section title and a concise status item for WeChat File Transfer Assistant. Search and group-creation controls are hidden because they do not apply to this mode.

### Right Content Area

Add a remote transfer panel in the existing chat content area:

- Header title: `远程传输`
- Subtitle: `微信文件传输助手`
- Actions: refresh embedded page, open externally
- Body: Electron `<webview>` pointing at `https://filehelper.weixin.qq.com/`
- Fallback: if `<webview>` is unavailable, show an empty-state style prompt and an external-open button

The panel should use the current light and dark theme classes and avoid adding a new page route.

### Electron Integration

Enable `webviewTag` in the main BrowserWindow web preferences so the Vue app can render the Electron `<webview>` element.

Expose an `openExternal(url)` IPC helper through preload and handle it in the main process with Electron `shell.openExternal`. The renderer should prefer this helper in Electron and fall back to `window.open` in browser mode.

## Error Handling

- If the embedded page fails to load, show a small inline status message with retry and external-open actions.
- If external open IPC fails, fall back to `window.open`.
- In normal browser mode, do not render an iframe for this URL because the target page rejects cross-origin framing.

## Testing

- Run frontend type checking and build.
- In Electron, verify the sidebar entry appears at the same level as Messages, Contacts, and Apps.
- Click Remote Transfer and confirm the right content area renders the WeChat File Transfer Assistant in an embedded view.
- Use Refresh and confirm the embedded page reloads.
- Use Open externally and confirm the system browser opens `https://filehelper.weixin.qq.com/`.
- Verify returning to Messages and Contacts still shows the original lists and chat content.

## Out Of Scope

- Implementing a custom file-transfer backend.
- Persisting login state beyond what the embedded WeChat page provides.
- Modifying backend application-center data.
