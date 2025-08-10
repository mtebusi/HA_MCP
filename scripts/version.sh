#!/bin/bash

# Comprehensive Version Synchronization Script
# Ensures version consistency across ALL files in the repository
# GitHub releases are the single source of truth

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$REPO_ROOT/VERSION"
CURRENT_VERSION=""
NEW_VERSION=""
DRY_RUN=false
AUTO_COMMIT=false
CREATE_TAG=false
BUMP_TYPE="patch"  # Default to patch

# Files that contain version numbers (relative to repo root)
VERSION_FILES=(
    "VERSION"
    "mcp-server/config.yaml"
    "mcp-server/package.json"
    "mcp-server/package-lock.json"
    "mcp-server/Dockerfile"
    "mcp-server/CHANGELOG.md"
    "mcp-server/run.sh"
    "mcp-server/DOCS.md"
    "mcp-server/README.md"
    "mcp-server/RELEASE_NOTES.md"
    "README.md"
    "CONTRIBUTING.md"
    "repository.json"
    ".github/workflows/release.yml"
    ".github/workflows/docker-build.yml"
    "scripts/update-version.sh"
    "scripts/package-claude.sh"
    "package.sh"
)

# Function to get the latest GitHub release version
get_github_release_version() {
    echo -e "${BLUE}Fetching latest GitHub release...${NC}"
    
    # Try to get the latest release from GitHub
    if command -v gh &> /dev/null; then
        # Use GitHub CLI if available
        local latest_release=$(gh release view --json tagName --jq '.tagName' 2>/dev/null || echo "")
        if [ -n "$latest_release" ]; then
            echo "${latest_release#v}"  # Remove 'v' prefix if present
            return
        fi
    fi
    
    # Fallback to git tags
    local latest_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    if [ -n "$latest_tag" ]; then
        echo "${latest_tag#v}"  # Remove 'v' prefix if present
        return
    fi
    
    # No release found, use default
    echo "1.0.0"
}

# Function to get current version from VERSION file or config.yaml
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE" | tr -d '[:space:]'
    elif [ -f "$REPO_ROOT/mcp-server/config.yaml" ]; then
        grep "^version:" "$REPO_ROOT/mcp-server/config.yaml" | awk '{print $2}' | tr -d '"'
    else
        echo "1.0.0"
    fi
}

# Function to validate semantic version
validate_version() {
    local version=$1
    if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$ ]]; then
        echo -e "${RED}Error: Invalid version format: $version${NC}"
        echo "Version must follow semantic versioning (e.g., 1.0.5, 2.0.0-beta.1)"
        return 1
    fi
    return 0
}

# Function to bump version
bump_version() {
    local current=$1
    local bump_type=$2
    
    # Parse version (handle pre-release and build metadata)
    local base_version=${current%%-*}
    local pre_release=""
    local build_meta=""
    
    if [[ "$current" == *"-"* ]]; then
        pre_release="-${current#*-}"
        pre_release=${pre_release%%+*}
    fi
    
    if [[ "$current" == *"+"* ]]; then
        build_meta="+${current#*+}"
    fi
    
    # Parse base version
    IFS='.' read -ra VERSION_PARTS <<< "$base_version"
    local major=${VERSION_PARTS[0]:-0}
    local minor=${VERSION_PARTS[1]:-0}
    local patch=${VERSION_PARTS[2]:-0}
    
    # Bump based on type
    case "$bump_type" in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            pre_release=""  # Clear pre-release on major bump
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            pre_release=""  # Clear pre-release on minor bump
            ;;
        patch|auto)
            patch=$((patch + 1))
            pre_release=""  # Clear pre-release on patch bump
            ;;
        *)
            echo -e "${RED}Invalid bump type: $bump_type${NC}"
            return 1
            ;;
    esac
    
    echo "${major}.${minor}.${patch}${pre_release}${build_meta}"
}

# Function to update version in a specific file
update_file_version() {
    local file=$1
    local old_version=$2
    local new_version=$3
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}  ⚠ File not found: $file${NC}"
        return
    fi
    
    local filename=$(basename "$file")
    local updated=false
    
    case "$filename" in
        VERSION)
            echo "$new_version" > "$file"
            updated=true
            ;;
            
        config.yaml|config.yml)
            sed -i.bak "s/^version: .*/version: $new_version/" "$file"
            updated=true
            ;;
            
        package.json)
            if command -v jq &> /dev/null; then
                jq ".version = \"$new_version\"" "$file" > "${file}.tmp"
                mv "${file}.tmp" "$file"
            else
                sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$file"
            fi
            updated=true
            ;;
            
        package-lock.json)
            if command -v jq &> /dev/null; then
                jq ".version = \"$new_version\" | .packages[\"\"].version = \"$new_version\"" "$file" > "${file}.tmp"
                mv "${file}.tmp" "$file"
            else
                # Update both root version and packages."".version
                sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$file"
            fi
            updated=true
            ;;
            
        Dockerfile)
            # Update LABEL versions
            sed -i.bak "s/io\.hass\.version=\"[^\"]*\"/io.hass.version=\"$new_version\"/" "$file"
            sed -i.bak "s/org\.opencontainers\.image\.version=\"[^\"]*\"/org.opencontainers.image.version=\"$new_version\"/" "$file"
            updated=true
            ;;
            
        repository.json)
            if command -v jq &> /dev/null; then
                jq ".version = \"$new_version\"" "$file" > "${file}.tmp" 2>/dev/null || echo "{}" | jq ".version = \"$new_version\"" > "${file}.tmp"
                mv "${file}.tmp" "$file"
            else
                sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$file"
            fi
            updated=true
            ;;
            
        *.md)
            # Update version badges
            sed -i.bak "s/v${old_version}/v${new_version}/g" "$file"
            sed -i.bak "s/version-${old_version}/version-${new_version}/g" "$file"
            sed -i.bak "s/Version ${old_version}/Version ${new_version}/g" "$file"
            sed -i.bak "s/version ${old_version}/version ${new_version}/g" "$file"
            sed -i.bak "s/${old_version}/${new_version}/g" "$file"
            updated=true
            ;;
            
        *.sh)
            # Update version in shell scripts
            sed -i.bak "s/VERSION=\"${old_version}\"/VERSION=\"${new_version}\"/g" "$file"
            sed -i.bak "s/version=${old_version}/version=${new_version}/g" "$file"
            sed -i.bak "s/${old_version}/${new_version}/g" "$file"
            updated=true
            ;;
            
        *.yaml|*.yml)
            # Generic YAML update
            sed -i.bak "s/${old_version}/${new_version}/g" "$file"
            updated=true
            ;;
            
        *)
            # Generic replacement for other files
            sed -i.bak "s/${old_version}/${new_version}/g" "$file"
            updated=true
            ;;
    esac
    
    # Clean up backup files
    rm -f "${file}.bak"
    
    if [ "$updated" = true ]; then
        echo -e "${GREEN}  ✓ Updated: $file${NC}"
    else
        echo -e "${YELLOW}  ⚠ Skipped: $file${NC}"
    fi
}

# Function to sync version across all files
sync_all_versions() {
    local old_version=$1
    local new_version=$2
    
    echo -e "${BLUE}Syncing version from $old_version to $new_version${NC}"
    echo ""
    
    for file in "${VERSION_FILES[@]}"; do
        local full_path="$REPO_ROOT/$file"
        update_file_version "$full_path" "$old_version" "$new_version"
    done
    
    # Also check for any other files that might contain the version
    echo ""
    echo -e "${BLUE}Checking for additional files containing version...${NC}"
    
    # Find all files containing the old version (excluding git and node_modules)
    local additional_files=$(grep -r "$old_version" "$REPO_ROOT" \
        --exclude-dir=.git \
        --exclude-dir=node_modules \
        --exclude-dir=dist \
        --exclude-dir=.github \
        --exclude="*.log" \
        --exclude="*.bak" \
        -l 2>/dev/null | head -20 || true)
    
    for file in $additional_files; do
        # Skip if already processed
        local relative_path=${file#$REPO_ROOT/}
        if [[ " ${VERSION_FILES[@]} " =~ " ${relative_path} " ]]; then
            continue
        fi
        
        echo -e "${YELLOW}  Found version in: $relative_path${NC}"
        if [ "$DRY_RUN" = false ]; then
            read -p "    Update this file? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                update_file_version "$file" "$old_version" "$new_version"
            fi
        fi
    done
}

# Function to create comprehensive changelog entry
create_changelog_entry() {
    local version=$1
    local date=$(date +"%Y-%m-%d")
    local changelog_file="$REPO_ROOT/mcp-server/CHANGELOG.md"
    
    echo -e "${BLUE}Generating changelog entry...${NC}"
    
    # Get commits since last tag
    local last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    local commits=""
    
    if [ -z "$last_tag" ]; then
        commits=$(git log --pretty=format:"%s|%h" --no-merges | head -50)
    else
        commits=$(git log "${last_tag}..HEAD" --pretty=format:"%s|%h" --no-merges)
    fi
    
    # Categorize commits
    local features=""
    local fixes=""
    local changes=""
    local docs=""
    local other=""
    
    while IFS='|' read -r message hash; do
        if [[ "$message" =~ ^(feat|feature|add): ]]; then
            features="${features}- ${message} (${hash})\n"
        elif [[ "$message" =~ ^(fix|bugfix): ]]; then
            fixes="${fixes}- ${message} (${hash})\n"
        elif [[ "$message" =~ ^(change|update|refactor|perf): ]]; then
            changes="${changes}- ${message} (${hash})\n"
        elif [[ "$message" =~ ^(docs|doc): ]]; then
            docs="${docs}- ${message} (${hash})\n"
        else
            other="${other}- ${message} (${hash})\n"
        fi
    done <<< "$commits"
    
    # Create changelog entry
    local entry="## [${version}] - ${date}

### 🎉 Features
$([ -n "$features" ] && echo -e "$features" || echo "- No new features")

### 🐛 Bug Fixes
$([ -n "$fixes" ] && echo -e "$fixes" || echo "- No bug fixes")

### 🔄 Changes
$([ -n "$changes" ] && echo -e "$changes" || echo "- No changes")

### 📚 Documentation
$([ -n "$docs" ] && echo -e "$docs" || echo "- No documentation updates")

### 🔧 Other
$([ -n "$other" ] && echo -e "$other" || echo "- No other changes")

---
"
    
    # Update or create changelog
    if [ -f "$changelog_file" ]; then
        # Backup existing changelog
        cp "$changelog_file" "${changelog_file}.bak"
        
        # Create new changelog with entry at top
        echo "# Changelog" > "${changelog_file}.tmp"
        echo "" >> "${changelog_file}.tmp"
        echo "All notable changes to the HomeAssistant MCP Add-on will be documented in this file." >> "${changelog_file}.tmp"
        echo "" >> "${changelog_file}.tmp"
        echo "$entry" >> "${changelog_file}.tmp"
        
        # Append existing entries (skip header)
        tail -n +5 "$changelog_file" >> "${changelog_file}.tmp" 2>/dev/null || true
        
        mv "${changelog_file}.tmp" "$changelog_file"
        rm -f "${changelog_file}.bak"
    else
        echo "# Changelog" > "$changelog_file"
        echo "" >> "$changelog_file"
        echo "All notable changes to the HomeAssistant MCP Add-on will be documented in this file." >> "$changelog_file"
        echo "" >> "$changelog_file"
        echo "$entry" >> "$changelog_file"
    fi
    
    echo -e "${GREEN}  ✓ Updated CHANGELOG.md${NC}"
}

# Function to validate all versions are in sync
validate_versions() {
    echo -e "${BLUE}Validating version consistency across all files...${NC}"
    echo ""
    
    local versions=()
    local all_match=true
    
    for file in "${VERSION_FILES[@]}"; do
        local full_path="$REPO_ROOT/$file"
        if [ ! -f "$full_path" ]; then
            continue
        fi
        
        local version=""
        local filename=$(basename "$file")
        
        case "$filename" in
            VERSION)
                version=$(cat "$full_path" 2>/dev/null | tr -d '[:space:]')
                ;;
            config.yaml|config.yml)
                version=$(grep "^version:" "$full_path" 2>/dev/null | awk '{print $2}' | tr -d '"')
                ;;
            package.json|repository.json)
                if command -v jq &> /dev/null; then
                    version=$(jq -r '.version' "$full_path" 2>/dev/null)
                else
                    version=$(grep '"version"' "$full_path" 2>/dev/null | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')
                fi
                ;;
        esac
        
        if [ -n "$version" ] && [ "$version" != "null" ]; then
            versions+=("$file:$version")
            echo -e "  $file: ${YELLOW}$version${NC}"
        fi
    done
    
    # Check if all versions match
    local first_version=""
    for entry in "${versions[@]}"; do
        local version="${entry#*:}"
        if [ -z "$first_version" ]; then
            first_version="$version"
        elif [ "$version" != "$first_version" ]; then
            all_match=false
            echo -e "${RED}    ⚠ Version mismatch detected!${NC}"
        fi
    done
    
    echo ""
    if [ "$all_match" = true ]; then
        echo -e "${GREEN}✅ All versions are in sync: $first_version${NC}"
        return 0
    else
        echo -e "${RED}❌ Version mismatch detected! Files have different versions.${NC}"
        return 1
    fi
}

# Function to commit changes
commit_version_changes() {
    local version=$1
    local bump_type=$2
    
    echo -e "${BLUE}Committing version changes...${NC}"
    
    git add -A
    git commit -m "chore: bump version to ${version}

- Automated version bump (${bump_type})
- Updated all version references across the repository
- Synchronized version in all configuration files
- Updated changelog with latest changes

[skip ci]" || {
        echo -e "${RED}Failed to commit changes${NC}"
        return 1
    }
    
    echo -e "${GREEN}  ✓ Changes committed${NC}"
}

# Function to create and push tag
create_version_tag() {
    local version=$1
    local tag_name="v${version}"
    
    echo -e "${BLUE}Creating git tag: ${tag_name}${NC}"
    
    # Check if tag already exists
    if git rev-parse "$tag_name" >/dev/null 2>&1; then
        echo -e "${YELLOW}  ⚠ Tag ${tag_name} already exists${NC}"
        return 1
    fi
    
    # Create annotated tag
    git tag -a "$tag_name" -m "Release version ${version}

Automated release for version ${version}
See CHANGELOG.md for details" || {
        echo -e "${RED}Failed to create tag${NC}"
        return 1
    }
    
    echo -e "${GREEN}  ✓ Tag created: ${tag_name}${NC}"
    
    # Push tag if not in dry run
    if [ "$DRY_RUN" = false ]; then
        read -p "Push tag to origin? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push origin "$tag_name"
            echo -e "${GREEN}  ✓ Tag pushed to origin${NC}"
        fi
    fi
}

# Main function
main() {
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║     HomeAssistant MCP Add-on Version Manager      ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                echo -e "${YELLOW}Running in DRY RUN mode - no changes will be made${NC}"
                shift
                ;;
            --commit)
                AUTO_COMMIT=true
                shift
                ;;
            --tag)
                CREATE_TAG=true
                shift
                ;;
            --major)
                BUMP_TYPE="major"
                shift
                ;;
            --minor)
                BUMP_TYPE="minor"
                shift
                ;;
            --patch)
                BUMP_TYPE="patch"
                shift
                ;;
            --validate)
                validate_versions
                exit $?
                ;;
            --sync)
                # Just sync to current version
                CURRENT_VERSION=$(get_current_version)
                sync_all_versions "$CURRENT_VERSION" "$CURRENT_VERSION"
                echo -e "${GREEN}✅ Version sync complete${NC}"
                exit 0
                ;;
            --set)
                shift
                if [ -z "$1" ]; then
                    echo -e "${RED}Error: --set requires a version number${NC}"
                    exit 1
                fi
                NEW_VERSION="$1"
                validate_version "$NEW_VERSION" || exit 1
                CURRENT_VERSION=$(get_current_version)
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --patch         Bump patch version (0.0.1) [default]"
                echo "  --minor         Bump minor version (0.1.0)"
                echo "  --major         Bump major version (1.0.0)"
                echo "  --set VERSION   Set specific version"
                echo "  --sync          Sync current version across all files"
                echo "  --validate      Validate version consistency"
                echo "  --commit        Auto-commit changes"
                echo "  --tag           Create and push git tag"
                echo "  --dry-run       Preview changes without applying"
                echo "  --help          Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                          # Bump patch version"
                echo "  $0 --minor --commit --tag   # Bump minor, commit, and tag"
                echo "  $0 --set 2.0.0 --commit     # Set specific version and commit"
                echo "  $0 --validate               # Check version consistency"
                echo "  $0 --sync                   # Sync versions across all files"
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Get current version if not already set
    if [ -z "$CURRENT_VERSION" ]; then
        CURRENT_VERSION=$(get_current_version)
    fi
    
    echo -e "Current version: ${YELLOW}${CURRENT_VERSION}${NC}"
    
    # Calculate new version if not explicitly set
    if [ -z "$NEW_VERSION" ]; then
        NEW_VERSION=$(bump_version "$CURRENT_VERSION" "$BUMP_TYPE")
    fi
    
    echo -e "New version: ${GREEN}${NEW_VERSION}${NC}"
    echo -e "Bump type: ${BLUE}${BUMP_TYPE}${NC}"
    echo ""
    
    # Sync all versions
    if [ "$DRY_RUN" = false ]; then
        sync_all_versions "$CURRENT_VERSION" "$NEW_VERSION"
        
        # Create changelog entry
        echo ""
        create_changelog_entry "$NEW_VERSION"
        
        # Validate all versions are now in sync
        echo ""
        validate_versions || {
            echo -e "${RED}Version sync failed! Please check the files manually.${NC}"
            exit 1
        }
        
        # Commit if requested
        if [ "$AUTO_COMMIT" = true ]; then
            echo ""
            commit_version_changes "$NEW_VERSION" "$BUMP_TYPE"
        fi
        
        # Create tag if requested
        if [ "$CREATE_TAG" = true ]; then
            echo ""
            create_version_tag "$NEW_VERSION"
        fi
        
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║         Version Update Complete! 🎉                ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
        echo -e "Version updated to: ${GREEN}${NEW_VERSION}${NC}"
        
        # Output for GitHub Actions
        if [ -n "$GITHUB_OUTPUT" ]; then
            echo "version=$NEW_VERSION" >> "$GITHUB_OUTPUT"
            echo "previous_version=$CURRENT_VERSION" >> "$GITHUB_OUTPUT"
            echo "bump_type=$BUMP_TYPE" >> "$GITHUB_OUTPUT"
        fi
    else
        echo -e "${YELLOW}DRY RUN COMPLETE - No changes were made${NC}"
    fi
}

# Run main function
main "$@"