# Known Issues

## RESOLVED: Node.js v24 Compatibility Issue

### ✅ Resolution Implemented
The build system has been updated to use CommonJS module format, which resolves the hanging issues with Node.js v24. The following changes were made:

1. **Removed `"type": "module"`** from package.json
2. **Configured TypeScript to output CommonJS** (`"module": "commonjs"`)
3. **Updated all imports** to remove `.js` extensions
4. **Fixed module detection** in source files

### Current Status
- **Build**: ✅ Working natively with `npm run build`
- **TypeScript**: ✅ No errors, compiles successfully
- **Tests**: ⚠️ Vitest has Node v24 compatibility issues (use Node v20 for tests)
- **Production**: ✅ Fully functional
- **GitHub Actions**: ✅ Uses Node v20, fully compatible

### Original Node.js v24 Compatibility Issue

### Problem
The project experiences hanging/freezing issues with Node.js v24.x due to incompatibilities between:
- Node v24's stricter ESM module handling
- TypeScript's CommonJS-based tooling
- Vitest/Rollup's mixed module formats

### Symptoms
- `npm run build` hangs after successful compilation
- `npm test` hangs or fails with package.json errors
- TypeScript compiles files but the process never exits

### Root Cause
Node.js v24 introduced breaking changes in how it handles:
1. Mixed ESM/CommonJS modules in the same project
2. Package.json `"type": "module"` with CommonJS dependencies
3. Nested package.json files with different module types

### Workarounds Implemented

#### Build Workaround
The build script (`scripts/build.sh`) now:
1. Runs TypeScript compilation in the background
2. Monitors for output files to appear
3. Force-kills the hanging tsc process after files are emitted
4. Successfully completes the build

#### Test Workaround
Tests currently fail due to Rollup package.json incompatibility with Node v24.

### Solutions

#### Option 1: Use Node.js v20 LTS (Recommended)
```bash
# Using nvm
nvm install 20
nvm use 20

# Or using fnm
fnm install 20
fnm use 20

# Verify
node --version  # Should show v20.x.x
```

#### Option 2: Use the Workaround Scripts
```bash
# Build works with workaround
npm run build

# Tests require Node v20 or earlier
nvm use 20 && npm test
```

#### Option 3: Wait for Updates
- TypeScript team is aware of Node v24 issues
- Vitest/Rollup updates are in progress
- Node v24 may receive patches for compatibility

### GitHub Actions
The GitHub Actions workflows use Node v20 LTS and are not affected by this issue.

### Status
- Build: ✅ Working with workaround
- Tests: ⚠️ Requires Node v20 or earlier
- Production: ✅ Not affected (runs compiled JS)

### References
- [Node.js v24 ESM Changes](https://github.com/nodejs/node/issues)
- [TypeScript Issue Tracker](https://github.com/microsoft/TypeScript/issues)
- [Vitest Compatibility](https://github.com/vitest-dev/vitest/issues)