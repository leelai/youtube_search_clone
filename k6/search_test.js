/**
 * K6 Load Test Script for YouTube Search Clone
 * 
 * Tests the search suggestions API endpoint with various keywords.
 * 
 * Usage:
 *   k6 run k6/search_test.js
 *   k6 run --env VUS=20 --env DURATION=60s k6/search_test.js
 *   k6 run --env BASE_URL=http://localhost:8080 k6/search_test.js
 * 
 * Environment Variables:
 *   BASE_URL  - API base URL (default: http://localhost:8080)
 *   VUS       - Number of virtual users (default: 10)
 *   DURATION  - Test duration (default: 30s)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const suggestionLatency = new Trend('suggestion_latency', true);

// Configuration from environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const VUS = parseInt(__ENV.VUS) || 10;
const DURATION = __ENV.DURATION || '30s';

// Test options
export const options = {
    vus: VUS,
    duration: DURATION,
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% < 500ms, 99% < 1s
        errors: ['rate<0.1'],                            // Error rate < 10%
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)'],
};

// Sample search keywords for testing
// These simulate real user search patterns
const SEARCH_KEYWORDS = [
    // Single characters (autocomplete start)
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    's', 't', 'w', 'm', 'n', 'p', 'r', 'l',
    
    // Two character prefixes
    'th', 'an', 'in', 'to', 'of', 'is', 'it', 'be', 'as', 'at',
    'so', 'we', 'he', 'by', 'or', 'on', 'do', 'if', 'me', 'my',
    'up', 'go', 'no', 'us', 'am',
    
    // Three character prefixes
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'new', 'has', 'get', 'see', 'now',
    'way', 'may', 'day', 'too', 'any',
    
    // Common words
    'world', 'news', 'today', 'business', 'sports', 'tech', 'science',
    'market', 'stock', 'trade', 'company', 'report', 'update',
    'president', 'government', 'election', 'policy', 'economy',
    
    // Longer phrases
    'breaking news', 'stock market', 'world news', 'sports news',
    'technology update', 'business report', 'science discovery',
];

/**
 * Get a random search keyword
 */
function getRandomKeyword() {
    return SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
}

/**
 * Simulate typing behavior - returns partial keyword
 */
function simulateTyping(keyword) {
    const typingProgress = Math.random();
    if (typingProgress < 0.3) {
        // 30% chance: just started typing (1-2 chars)
        return keyword.substring(0, Math.min(2, keyword.length));
    } else if (typingProgress < 0.6) {
        // 30% chance: mid-typing (3-5 chars)
        return keyword.substring(0, Math.min(5, keyword.length));
    } else {
        // 40% chance: full keyword
        return keyword;
    }
}

/**
 * Main test function - called for each VU iteration
 */
export default function() {
    const keyword = getRandomKeyword();
    const searchTerm = simulateTyping(keyword);
    
    const url = `${BASE_URL}/api/search/suggestions?keyword=${encodeURIComponent(searchTerm)}`;
    
    const startTime = Date.now();
    const response = http.get(url, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        tags: { name: 'suggestions' },
    });
    const latency = Date.now() - startTime;
    
    // Record custom metrics
    suggestionLatency.add(latency);
    
    // Validate response
    const success = check(response, {
        'status is 200': (r) => r.status === 200,
        'response has body': (r) => r.body && r.body.length > 0,
        'response is JSON': (r) => {
            try {
                JSON.parse(r.body);
                return true;
            } catch (e) {
                return false;
            }
        },
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!success);
    
    // Simulate user think time between requests (100-500ms)
    sleep(0.1 + Math.random() * 0.4);
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
    console.log(`\n🚀 Starting K6 Load Test`);
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   Virtual Users: ${VUS}`);
    console.log(`   Duration: ${DURATION}`);
    console.log(`   Keywords pool: ${SEARCH_KEYWORDS.length} keywords\n`);
    
    // Verify API is accessible
    const healthCheck = http.get(`${BASE_URL}/api/search/suggestions?keyword=test`);
    if (healthCheck.status !== 200) {
        console.error(`❌ API health check failed! Status: ${healthCheck.status}`);
        console.error(`   Make sure the backend is running at ${BASE_URL}`);
    } else {
        console.log(`✅ API health check passed\n`);
    }
    
    return { startTime: Date.now() };
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
    const duration = (Date.now() - data.startTime) / 1000;
    console.log(`\n✅ Test completed in ${duration.toFixed(2)} seconds`);
}

/**
 * Custom summary handler for better output formatting
 */
export function handleSummary(data) {
    // Extract key metrics
    const metrics = {
        http_req_duration: data.metrics.http_req_duration,
        http_reqs: data.metrics.http_reqs,
        errors: data.metrics.errors,
        suggestion_latency: data.metrics.suggestion_latency,
    };
    
    // Console output
    let summary = '\n';
    summary += '╔════════════════════════════════════════════════════════════╗\n';
    summary += '║              K6 Load Test Summary                          ║\n';
    summary += '╠════════════════════════════════════════════════════════════╣\n';
    
    if (metrics.http_req_duration) {
        const dur = metrics.http_req_duration.values;
        summary += `║ Response Time:                                             ║\n`;
        summary += `║   Average: ${(dur.avg || 0).toFixed(2).padStart(8)}ms                                   ║\n`;
        summary += `║   Median:  ${(dur.med || 0).toFixed(2).padStart(8)}ms                                   ║\n`;
        summary += `║   p(95):   ${(dur['p(95)'] || 0).toFixed(2).padStart(8)}ms                                   ║\n`;
        summary += `║   p(99):   ${(dur['p(99)'] || 0).toFixed(2).padStart(8)}ms                                   ║\n`;
        summary += `║   Max:     ${(dur.max || 0).toFixed(2).padStart(8)}ms                                   ║\n`;
    }
    
    if (metrics.http_reqs) {
        const reqs = metrics.http_reqs.values;
        summary += '╠════════════════════════════════════════════════════════════╣\n';
        summary += `║ Throughput:                                                ║\n`;
        summary += `║   Total Requests: ${(reqs.count || 0).toString().padStart(8)}                            ║\n`;
        summary += `║   Requests/sec:   ${(reqs.rate || 0).toFixed(2).padStart(8)}                            ║\n`;
    }
    
    if (metrics.errors) {
        const errRate = (metrics.errors.values.rate || 0) * 100;
        summary += '╠════════════════════════════════════════════════════════════╣\n';
        summary += `║ Error Rate: ${errRate.toFixed(2).padStart(6)}%                                       ║\n`;
    }
    
    summary += '╚════════════════════════════════════════════════════════════╝\n';
    
    console.log(summary);
    
    // Return outputs for file export
    return {
        'stdout': summary,
        'k6/results/summary.json': JSON.stringify(data, null, 2),
    };
}

