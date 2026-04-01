The greenhouse module remains on the existing legacy entity-based routes in `server/index.js`.

It is intentionally left functionally unchanged and treated as the locked module while poultry and goat modules use dedicated Prisma-backed routers under `server/modules/`.
