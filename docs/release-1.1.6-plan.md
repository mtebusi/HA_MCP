# Release v1.1.6 Plan - Workflow Stability & Optimization

## Release Overview
**Version**: 1.1.6  
**Priority**: HIGH - Critical workflow fixes  
**Target Date**: Immediate  
**Type**: Patch Release (Workflow & Build Improvements)

## Issues Addressed

### 🔴 Critical Issues
1. **Multi-architecture builds incomplete** - Only amd64 available in v1.1.5
2. **Workflow conflicts** - Multiple overlapping workflows causing failures
3. **Manifest creation errors** - Docker manifest conflicts preventing proper multi-arch support

### ⚠️ Performance Issues
1. **Build time inefficiency** - Redundant builds across workflows
2. **Cache management** - Suboptimal caching strategy
3. **Resource waste** - Multiple workflows doing same work

## Completed Actions ✅

### Workflow Consolidation
- [x] Disabled 4 redundant workflows:
  - `build-multiarch.yml` → `.bak`
  - `docker-multiarch.yml` → `.bak`
  - `ha-builder-fixed.yml` → `.bak`
  - `builder.yaml` → `.bak`

### Build Improvements
- [x] Enhanced `ha-addon-build.yml` → `Unified Build & Deploy`
- [x] Added manifest purge flags to prevent conflicts
- [x] Implemented wait time for image propagation
- [x] Enhanced caching with registry cache + GHA cache
- [x] Added buildkit optimizations

### Cache Strategy
- [x] Dual cache system:
  - GitHub Actions cache (scoped per architecture)
  - Registry cache (persistent across builds)
- [x] BuildKit optimizations for faster builds

## Pending Actions 📋

### Version Updates
- [ ] Update `mcp-server/config.yaml` to version 1.1.6
- [ ] Update `mcp-server/package.json` version
- [ ] Update workflow default versions

### Testing & Validation
- [ ] Run full multi-arch build test
- [ ] Verify all architectures present in manifest
- [ ] Test installation on:
  - Raspberry Pi (ARM)
  - Intel NUC (amd64)
  - Virtual environment

### Documentation
- [ ] Update CHANGELOG.md
- [ ] Document workflow consolidation
- [ ] Add troubleshooting guide for build issues

## Technical Changes

### Workflow Improvements
```yaml
# Before: Multiple conflicting workflows
- build-multiarch.yml
- docker-multiarch.yml  
- ha-addon-build.yml
- ha-builder-fixed.yml
- builder.yaml

# After: Single unified workflow
- ha-addon-build.yml (renamed to "Unified Build & Deploy")
```

### Manifest Creation Fix
```bash
# Added to prevent conflicts:
1. Remove existing manifests before creation
2. Wait for image propagation (30s)
3. Use --purge flag on push
4. Verify images exist before manifest creation
```

### Enhanced Caching
```yaml
cache-from: |
  type=gha,scope=${{ matrix.arch }}
  type=registry,ref=ghcr.io/.../buildcache-${{ matrix.arch }}
cache-to: |
  type=gha,scope=${{ matrix.arch }},mode=max
  type=registry,ref=ghcr.io/.../buildcache-${{ matrix.arch }},mode=max
```

## Success Metrics

| Metric | Target | Priority |
|--------|--------|----------|
| All architectures built | 100% | 🔴 Critical |
| Build time | <5 min | ⚠️ Medium |
| Workflow success rate | >95% | 🔴 Critical |
| Cache hit rate | >80% | 🟢 Low |
| Manifest creation success | 100% | 🔴 Critical |

## Risk Mitigation

### Rollback Plan
If v1.1.6 fails:
1. Revert workflow changes
2. Re-enable previous working workflow
3. Manual multi-arch build if needed

### Testing Strategy
1. Test workflow in PR first
2. Verify on test branch before main
3. Monitor first 2 hours after release

## Release Checklist

### Pre-Release
- [x] Consolidate workflows
- [x] Fix manifest creation
- [x] Optimize caching
- [ ] Update version numbers
- [ ] Test build workflow
- [ ] Update documentation

### Release
- [ ] Create git tag v1.1.6
- [ ] Trigger unified workflow
- [ ] Verify all architectures
- [ ] Create GitHub release
- [ ] Update add-on repository

### Post-Release
- [ ] Monitor build status
- [ ] Check user feedback
- [ ] Verify Docker Hub images
- [ ] Update project board

## Command Sequence

```bash
# 1. Update versions
./scripts/update-version.sh 1.1.6

# 2. Test workflow
gh workflow run ha-addon-build.yml --ref test-1.1.6

# 3. Create release
git tag -a v1.1.6 -m "Release v1.1.6: Workflow stability and optimization"
git push origin v1.1.6

# 4. Monitor
gh run watch
gh release view v1.1.6
```

## Expected Outcomes

### Immediate (0-2 hours)
- All 5 architectures successfully built
- Manifest properly created
- Images available on GHCR

### Short-term (2-24 hours)
- Users can install on all platforms
- No "exec format error" reports
- Reduced build times

### Long-term (1 week)
- Stable CI/CD pipeline
- Consistent releases
- Improved developer experience

## Notes

- v1.1.5 partially works (amd64 only) but needs full multi-arch support
- Workflow consolidation reduces complexity and prevents conflicts
- Enhanced caching should reduce build times by 30-50%
- Registry cache persists between workflow runs

---

**Status**: Ready for implementation  
**Next Step**: Update version numbers and trigger test build