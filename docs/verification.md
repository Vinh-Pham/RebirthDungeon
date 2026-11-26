# Verification

Use the checks in [web tooling](web-tooling.md) and review the
[implementation status](implementation-status.md) for recorded results.

```sh
pnpm typecheck
pnpm test
pnpm build
```

Run the production browser smoke against `pnpm preview`. Check character
creation, arrival, movement and map picking, inventory, gate registration,
and returning to the same new character after reload. Record the viewport,
browser errors and any unverified flows.
