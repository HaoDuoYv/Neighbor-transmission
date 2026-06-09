# Startup Loading Design

## Summary

Improve the Electron startup loading screen shown before the login page. The current startup state in `ServerSelectPage.vue` uses a static dark background, a gradient icon, and a simple spinner. Replace it with a more polished animated loading experience while keeping the existing server startup and redirect behavior unchanged.

## Scope

- Target only the startup state where `isStarting && !isConnecting` is true.
- Keep the server detection, local server startup, fallback server selection, and login redirect logic unchanged.
- Do not change backend behavior or Electron process startup behavior.
- Keep the normal server selection UI available when startup fails or auto-connect cannot complete.

## Visual Direction

Use a quiet "connection launch bay" style that fits the app's minimal desktop UI:

- Dark, focused full-screen background.
- Central chat/network mark.
- Three small animated nodes orbiting or pulsing around the mark.
- A subtle animated progress line under the title.
- Rotating short status phrases to make waiting feel alive.

The design should feel refined and purposeful, not like a marketing splash screen. Avoid heavy gradients, oversized decorative blobs, and distracting background effects.

## Content

Primary title:

- `WebSocket Chat`

Status text cycles through:

- `检查上次连接`
- `启动本机服务`
- `准备进入登录`

Supporting text:

- `正在准备聊天环境，请稍候`

## Interaction

The loading screen is not interactive. It should not expose buttons because the startup flow is automatic. If the startup flow falls back to manual selection, the existing choose/create/join interface appears as it does today.

## Implementation Notes

- Implement the animated loader with HTML and scoped CSS inside `ServerSelectPage.vue`.
- Use CSS keyframes for the orbiting nodes, progress line, and subtle entrance animation.
- Prefer stable dimensions so the layout does not shift while status text changes.
- Keep animation lightweight and CSS-only.

## Testing

- Run `npm run build` in `frontend`.
- Run `node electron/build.mjs` in `frontend`.
- Verify the startup loading state still appears while `isStarting && !isConnecting` is true.
- Verify fallback server selection still appears when auto startup does not redirect.
- Verify no route or backend startup logic changes are introduced.
