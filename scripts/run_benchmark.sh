#!/bin/bash
#
# run_benchmark.sh - Full benchmark suite for YouTube Search Clone
#
# Runs k6 load tests across multiple data sizes and generates
# a visual ASCII report comparing performance metrics.
#
# Usage:
#   ./scripts/run_benchmark.sh              # Run all benchmarks
#   ./scripts/run_benchmark.sh 1k 5k 10k    # Run specific sizes only
#
# Requirements:
#   - k6 installed (https://k6.io/docs/getting-started/installation/)
#   - Python 3 with psycopg2
#   - PostgreSQL running with worlds_db
#   - Backend API running at localhost:8080
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$PROJECT_DIR/k6/results"
K6_SCRIPT="$PROJECT_DIR/k6/search_test.js"

# Test configuration
K6_VUS="${K6_VUS:-10}"
K6_DURATION="${K6_DURATION:-30s}"
K6_BASE_URL="${K6_BASE_URL:-http://localhost:8081}"

# Data sizes to test (can be overridden via command line args)
if [ $# -gt 0 ]; then
    SIZES=("$@")
else
    SIZES=("1k" "5k" "10k" "20k" "50k" "100k" "200k" "500k")
fi

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Arrays to store results
declare -a RESULT_SIZES
declare -a RESULT_P50
declare -a RESULT_P95
declare -a RESULT_P99
declare -a RESULT_RPS
declare -a RESULT_ERRORS

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Convert size string to number (e.g., "5k" -> 5000)
size_to_number() {
    local size=$1
    case $size in
        *k) echo $((${size%k} * 1000)) ;;
        *K) echo $((${size%K} * 1000)) ;;
        *) echo "$size" ;;
    esac
}

# Format number with commas
format_number() {
    printf "%'d" "$1"
}

# Seed database with specified size
seed_database() {
    local size=$1
    local count=$(size_to_number "$size")
    
    log_info "Seeding database with $(format_number $count) records..."
    
    cd "$PROJECT_DIR"
    python scripts/seed_agnews_remote.py --limit "$count" --shuffle 2>&1 | while read line; do
        echo "    $line"
    done
    
    log_success "Database seeded with $(format_number $count) records"
}

# Run k6 test and capture results
run_k6_test() {
    local size=$1
    local output_file="$RESULTS_DIR/result_${size}.json"
    
    log_info "Running k6 load test (VUs: $K6_VUS, Duration: $K6_DURATION)..."
    
    # Run k6 and capture output
    k6 run \
        --env BASE_URL="$K6_BASE_URL" \
        --env VUS="$K6_VUS" \
        --env DURATION="$K6_DURATION" \
        --summary-export="$output_file" \
        --quiet \
        "$K6_SCRIPT" 2>&1 | while read line; do
        echo "    $line"
    done
    
    # Parse results from JSON
    if [ -f "$output_file" ]; then
        local p50=$(jq -r '.metrics.http_req_duration.values["p(50)"] // 0' "$output_file")
        local p95=$(jq -r '.metrics.http_req_duration.values["p(95)"] // 0' "$output_file")
        local p99=$(jq -r '.metrics.http_req_duration.values["p(99)"] // 0' "$output_file")
        local rps=$(jq -r '.metrics.http_reqs.values.rate // 0' "$output_file")
        local error_rate=$(jq -r '.metrics.errors.values.rate // 0' "$output_file")
        
        # Store results
        RESULT_SIZES+=("$size")
        RESULT_P50+=("$p50")
        RESULT_P95+=("$p95")
        RESULT_P99+=("$p99")
        RESULT_RPS+=("$rps")
        RESULT_ERRORS+=("$error_rate")
        
        log_success "Test completed: p95=${p95}ms, RPS=${rps}"
    else
        log_error "Failed to get results for size $size"
        RESULT_SIZES+=("$size")
        RESULT_P50+=("0")
        RESULT_P95+=("0")
        RESULT_P99+=("0")
        RESULT_RPS+=("0")
        RESULT_ERRORS+=("1")
    fi
}

# Generate ASCII bar
generate_bar() {
    local value=$1
    local max_value=$2
    local bar_width=${3:-20}
    
    if [ "$max_value" == "0" ] || [ -z "$max_value" ]; then
        max_value=1
    fi
    
    local filled=$(echo "scale=0; $value * $bar_width / $max_value" | bc)
    local empty=$((bar_width - filled))
    
    local bar=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++)); do bar+="░"; done
    
    echo "$bar"
}

# Get status based on p95 latency
get_status() {
    local p95=$1
    local p95_int=${p95%.*}
    
    if [ "$p95_int" -lt 100 ]; then
        echo -e "${GREEN}OK${NC}"
    elif [ "$p95_int" -lt 300 ]; then
        echo -e "${YELLOW}WARN${NC}"
    else
        echo -e "${RED}SLOW${NC}"
    fi
}

# Print the visual report
print_report() {
    local num_results=${#RESULT_SIZES[@]}
    
    if [ "$num_results" -eq 0 ]; then
        log_error "No results to display"
        return
    fi
    
    # Find max values for scaling bars
    local max_p95=0
    local max_rps=0
    for i in "${!RESULT_P95[@]}"; do
        local p95_int=${RESULT_P95[$i]%.*}
        local rps_int=${RESULT_RPS[$i]%.*}
        [ "$p95_int" -gt "$max_p95" ] && max_p95=$p95_int
        [ "$rps_int" -gt "$max_rps" ] && max_rps=$rps_int
    done
    [ "$max_p95" -eq 0 ] && max_p95=1
    [ "$max_rps" -eq 0 ] && max_rps=1
    
    echo ""
    echo -e "${BOLD}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║                    Search API Benchmark Results                           ║${NC}"
    echo -e "${BOLD}╠═══════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}║ Configuration: VUs=${K6_VUS}, Duration=${K6_DURATION}, URL=${K6_BASE_URL}${NC}"
    echo -e "${BOLD}╠═══════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}║   Size   │   p50    │   p95    │   p99    │   RPS    │ Status            ║${NC}"
    echo -e "${BOLD}╠══════════╪══════════╪══════════╪══════════╪══════════╪═══════════════════╣${NC}"
    
    for i in "${!RESULT_SIZES[@]}"; do
        local size="${RESULT_SIZES[$i]}"
        local p50=$(printf "%.1f" "${RESULT_P50[$i]}")
        local p95=$(printf "%.1f" "${RESULT_P95[$i]}")
        local p99=$(printf "%.1f" "${RESULT_P99[$i]}")
        local rps=$(printf "%.1f" "${RESULT_RPS[$i]}")
        local status=$(get_status "${RESULT_P95[$i]}")
        
        # Format size with padding
        local size_display=$(printf "%8s" "$size")
        
        printf "║ %s │ %7sms │ %7sms │ %7sms │ %8s │ %-18b║\n" \
            "$size_display" "$p50" "$p95" "$p99" "$rps" "$status"
    done
    
    echo -e "${BOLD}╚══════════╧══════════╧══════════╧══════════╧══════════╧═══════════════════╝${NC}"
    
    # Print bar chart for p95 latency
    echo ""
    echo -e "${BOLD}Response Time (p95) by Data Size:${NC}"
    echo ""
    
    for i in "${!RESULT_SIZES[@]}"; do
        local size="${RESULT_SIZES[$i]}"
        local p95="${RESULT_P95[$i]}"
        local p95_int=${p95%.*}
        local bar=$(generate_bar "$p95_int" "$max_p95" 30)
        
        printf "  %6s │ %s %6.1fms\n" "$size" "$bar" "$p95"
    done
    
    # Print bar chart for RPS
    echo ""
    echo -e "${BOLD}Requests Per Second (RPS) by Data Size:${NC}"
    echo ""
    
    for i in "${!RESULT_SIZES[@]}"; do
        local size="${RESULT_SIZES[$i]}"
        local rps="${RESULT_RPS[$i]}"
        local rps_int=${rps%.*}
        local bar=$(generate_bar "$rps_int" "$max_rps" 30)
        
        printf "  %6s │ %s %6.1f/s\n" "$size" "$bar" "$rps"
    done
    
    echo ""
}

# Save results to CSV
save_csv() {
    local csv_file="$RESULTS_DIR/benchmark_results.csv"
    
    echo "size,p50_ms,p95_ms,p99_ms,rps,error_rate" > "$csv_file"
    
    for i in "${!RESULT_SIZES[@]}"; do
        echo "${RESULT_SIZES[$i]},${RESULT_P50[$i]},${RESULT_P95[$i]},${RESULT_P99[$i]},${RESULT_RPS[$i]},${RESULT_ERRORS[$i]}" >> "$csv_file"
    done
    
    log_success "Results saved to $csv_file"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check k6
    if ! command -v k6 &> /dev/null; then
        log_error "k6 is not installed. Please install it from https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it: brew install jq (macOS) or apt install jq (Linux)"
        exit 1
    fi
    
    # Check bc
    if ! command -v bc &> /dev/null; then
        log_error "bc is not installed. Please install it: brew install bc (macOS) or apt install bc (Linux)"
        exit 1
    fi
    
    # Check Python
    if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
        log_error "Python is not installed"
        exit 1
    fi
    
    # Check if API is running
    if ! curl -s "$K6_BASE_URL/api/search/suggestions?keyword=test" > /dev/null 2>&1; then
        log_warning "API at $K6_BASE_URL may not be running. Tests might fail."
    fi
    
    log_success "Prerequisites check passed"
}

# Main execution
main() {
    echo ""
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║       YouTube Search Clone - Benchmark Suite               ║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Check prerequisites
    check_prerequisites
    
    echo ""
    log_info "Starting benchmark suite with sizes: ${SIZES[*]}"
    log_info "VUs: $K6_VUS, Duration: $K6_DURATION"
    echo ""
    
    local start_time=$(date +%s)
    
    # Run benchmarks for each size
    for size in "${SIZES[@]}"; do
        echo ""
        echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BOLD}  Benchmark: $size records${NC}"
        echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        
        # Seed database
        seed_database "$size"
        
        # Wait a moment for database to settle
        sleep 2
        
        # Run k6 test
        run_k6_test "$size"
    done
    
    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))
    
    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  Benchmark Complete! Total time: ${total_time}s${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Print visual report
    print_report
    
    # Save CSV
    save_csv
    
    echo ""
    log_success "All benchmarks completed!"
    echo ""
}

# Run main function
main

