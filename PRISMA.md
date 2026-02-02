# Prisma Schema - Production Deployment

This project uses a **shared Prisma schema** from the `aura` project to avoid duplication and sync issues.

## Development

The schema is located at: `../aura/prisma/schema.prisma`

When you run `pnpm install`, it automatically generates the Prisma client from the shared schema.

## Production Deployment

### Build Process

The build process handles both monorepo and separate deployments:

1. **prebuild**: Copies the schema from `../aura/prisma/schema.prisma` to `./prisma/schema.prisma`
   - If the aura project is available (monorepo), it copies the schema
   - If not available (separate deployment), it uses the existing local copy

2. **build**: Generates Prisma client and builds the TypeScript code

### Deployment Options

#### Option 1: Monorepo (Recommended)

Deploy both `aura` and `node-socket-io` from the same repository:

```bash
pnpm run build  # Automatically copies schema and builds
```

#### Option 2: Separate Repositories

If deploying from separate repos, ensure you have a copy of `schema.prisma` in this project's `prisma/` directory before deploying.

To create a local copy:

```bash
mkdir -p prisma
cp ../aura/prisma/schema.prisma prisma/schema.prisma
```

Then commit this file to your repository.

### Environment Variables

Make sure your production environment has:

- `DATABASE_URL` - MongoDB connection string
- All other required environment variables from `.env.example`

## Updating the Schema

1. Update the schema in `../aura/prisma/schema.prisma`
2. Run `pnpm run db:generate` to regenerate the Prisma client
3. Restart the dev server

For production, the build process will automatically pick up the changes.
