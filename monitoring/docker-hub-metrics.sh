#!/bin/bash
# Docker Hub Metrics Collector for Claude AI MCP Bridge
# Collects and displays metrics from Docker Hub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOCKERHUB_REPO="mtebusi/ha-claude-ai-mcp"
DOCKERHUB_USER="mtebusi"
API_BASE="https://hub.docker.com/v2"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to format numbers with commas
format_number() {
    echo "$1" | sed ':a;s/\B[0-9]\{3\}\>/,&/;ta'
}

# Function to get repository info
get_repo_info() {
    local repo_path="${DOCKERHUB_USER}/${DOCKERHUB_REPO#*/}"
    local response=$(curl -s "${API_BASE}/repositories/${repo_path}/")
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        echo "$response"
    else
        print_color "$RED" "Failed to fetch repository information"
        return 1
    fi
}

# Function to get tag information
get_tags_info() {
    local repo_path="${DOCKERHUB_USER}/${DOCKERHUB_REPO#*/}"
    local response=$(curl -s "${API_BASE}/repositories/${repo_path}/tags/?page_size=100")
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        echo "$response"
    else
        print_color "$RED" "Failed to fetch tags information"
        return 1
    fi
}

# Function to get rate limit info
get_rate_limit() {
    local token=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | jq -r .token)
    local headers=$(curl -s -I -H "Authorization: Bearer $token" https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest)
    
    local limit=$(echo "$headers" | grep -i "ratelimit-limit" | cut -d' ' -f2 | tr -d '\r')
    local remaining=$(echo "$headers" | grep -i "ratelimit-remaining" | cut -d' ' -f2 | tr -d '\r')
    
    echo "${limit:-unknown}|${remaining:-unknown}"
}

# Function to display repository metrics
display_repo_metrics() {
    print_color "$CYAN" "\n=== Repository Metrics ==="
    
    local repo_info=$(get_repo_info)
    
    if [ -n "$repo_info" ] && command -v jq &> /dev/null; then
        local name=$(echo "$repo_info" | jq -r .name)
        local description=$(echo "$repo_info" | jq -r .description)
        local stars=$(echo "$repo_info" | jq -r .star_count)
        local pulls=$(echo "$repo_info" | jq -r .pull_count)
        local last_updated=$(echo "$repo_info" | jq -r .last_updated)
        local is_private=$(echo "$repo_info" | jq -r .is_private)
        
        print_color "$GREEN" "Repository: $name"
        print_color "$BLUE" "Description: $description"
        print_color "$YELLOW" "Stars: $(format_number $stars)"
        print_color "$YELLOW" "Total Pulls: $(format_number $pulls)"
        print_color "$BLUE" "Visibility: $([ "$is_private" = "true" ] && echo "Private" || echo "Public")"
        print_color "$BLUE" "Last Updated: $(date -d "$last_updated" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$last_updated")"
    else
        print_color "$YELLOW" "Unable to parse repository metrics (jq required)"
    fi
}

# Function to display tag metrics
display_tag_metrics() {
    print_color "$CYAN" "\n=== Tag Metrics ==="
    
    local tags_info=$(get_tags_info)
    
    if [ -n "$tags_info" ] && command -v jq &> /dev/null; then
        local count=$(echo "$tags_info" | jq -r .count)
        print_color "$GREEN" "Total Tags: $count"
        
        print_color "$BLUE" "\nTop 10 Tags by Size:"
        echo "$tags_info" | jq -r '.results | sort_by(.full_size) | reverse | .[0:10] | .[] | "\(.name): \(.full_size/1048576 | floor) MB"' | while IFS= read -r line; do
            echo "  - $line"
        done
        
        print_color "$BLUE" "\nArchitecture Coverage:"
        local architectures=("amd64" "arm64" "armv7" "armhf" "i386")
        for arch in "${architectures[@]}"; do
            if echo "$tags_info" | jq -r '.results[].name' | grep -q "^${arch}$"; then
                print_color "$GREEN" "  ✓ $arch"
            else
                print_color "$RED" "  ✗ $arch"
            fi
        done
    else
        print_color "$YELLOW" "Unable to parse tag metrics (jq required)"
    fi
}

# Function to display rate limit metrics
display_rate_limits() {
    print_color "$CYAN" "\n=== Rate Limit Status ==="
    
    local rate_info=$(get_rate_limit)
    local limit=$(echo "$rate_info" | cut -d'|' -f1)
    local remaining=$(echo "$rate_info" | cut -d'|' -f2)
    
    if [ "$limit" != "unknown" ] && [ "$remaining" != "unknown" ]; then
        local used=$((limit - remaining))
        local percent=$((used * 100 / limit))
        
        print_color "$BLUE" "Rate Limit: $limit pulls/6hr"
        print_color "$GREEN" "Remaining: $remaining"
        print_color "$YELLOW" "Used: $used ($percent%)"
        
        # Visual progress bar
        local bar_length=30
        local filled=$((percent * bar_length / 100))
        local empty=$((bar_length - filled))
        
        printf "  ["
        printf "%${filled}s" | tr ' ' '='
        printf "%${empty}s" | tr ' ' '-'
        printf "]\n"
    else
        print_color "$YELLOW" "Rate limit information not available (may be authenticated)"
    fi
}

# Function to collect Prometheus metrics
generate_prometheus_metrics() {
    print_color "$CYAN" "\n=== Prometheus Metrics ==="
    
    local timestamp=$(date +%s%3N)
    local repo_info=$(get_repo_info)
    
    if [ -n "$repo_info" ] && command -v jq &> /dev/null; then
        local pulls=$(echo "$repo_info" | jq -r .pull_count)
        local stars=$(echo "$repo_info" | jq -r .star_count)
        
        echo "# HELP dockerhub_pulls_total Total number of pulls from Docker Hub"
        echo "# TYPE dockerhub_pulls_total counter"
        echo "dockerhub_pulls_total{repository=\"${DOCKERHUB_REPO}\"} $pulls $timestamp"
        
        echo "# HELP dockerhub_stars_total Total number of stars on Docker Hub"
        echo "# TYPE dockerhub_stars_total gauge"
        echo "dockerhub_stars_total{repository=\"${DOCKERHUB_REPO}\"} $stars $timestamp"
    fi
    
    local rate_info=$(get_rate_limit)
    local limit=$(echo "$rate_info" | cut -d'|' -f1)
    local remaining=$(echo "$rate_info" | cut -d'|' -f2)
    
    if [ "$limit" != "unknown" ] && [ "$remaining" != "unknown" ]; then
        echo "# HELP dockerhub_rate_limit_total Docker Hub rate limit"
        echo "# TYPE dockerhub_rate_limit_total gauge"
        echo "dockerhub_rate_limit_total $limit $timestamp"
        
        echo "# HELP dockerhub_rate_limit_remaining Docker Hub rate limit remaining"
        echo "# TYPE dockerhub_rate_limit_remaining gauge"
        echo "dockerhub_rate_limit_remaining $remaining $timestamp"
    fi
}

# Function to export metrics to file
export_metrics() {
    local output_file="$1"
    
    {
        echo "# Docker Hub Metrics Report"
        echo "# Generated: $(date)"
        echo "# Repository: $DOCKERHUB_REPO"
        echo ""
        
        get_repo_info | jq '.' 2>/dev/null || echo "Repository info not available"
        echo ""
        
        get_tags_info | jq '.results | map({name: .name, size: .full_size, last_updated: .last_updated})' 2>/dev/null || echo "Tags info not available"
        echo ""
        
        echo "Rate Limit: $(get_rate_limit)"
    } > "$output_file"
    
    print_color "$GREEN" "\nMetrics exported to: $output_file"
}

# Main function
main() {
    print_color "$GREEN" "=== Docker Hub Metrics Collector ==="
    print_color "$YELLOW" "Repository: $DOCKERHUB_REPO\n"
    
    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        print_color "$RED" "Error: curl is not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_color "$YELLOW" "Warning: jq is not installed, some features will be limited"
    fi
    
    # Parse arguments
    case "${1:-}" in
        --prometheus)
            generate_prometheus_metrics
            ;;
        --export)
            if [ -z "$2" ]; then
                print_color "$RED" "Error: Output file required"
                echo "Usage: $0 --export <output_file>"
                exit 1
            fi
            export_metrics "$2"
            ;;
        --watch)
            while true; do
                clear
                display_repo_metrics
                display_tag_metrics
                display_rate_limits
                print_color "$YELLOW" "\nRefreshing in 60 seconds... (Press Ctrl+C to exit)"
                sleep 60
            done
            ;;
        *)
            display_repo_metrics
            display_tag_metrics
            display_rate_limits
            
            print_color "$CYAN" "\n=== Available Options ==="
            echo "  $0              - Display metrics once"
            echo "  $0 --watch      - Continuously monitor metrics"
            echo "  $0 --prometheus - Output Prometheus-compatible metrics"
            echo "  $0 --export <file> - Export metrics to file"
            ;;
    esac
}

# Run main function
main "$@"