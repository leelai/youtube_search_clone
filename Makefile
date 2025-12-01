# YouTube Search Clone - Makefile
# K6 效能測試與資料準備自動化

.PHONY: help seed-1k seed-5k seed-10k seed-20k seed-50k seed-100k seed-200k seed-500k \
        k6-test benchmark-1k benchmark-5k benchmark-10k benchmark-20k benchmark-50k \
        benchmark-100k benchmark-200k benchmark-500k benchmark-all download-data

# Default target
help:
	@echo "╔════════════════════════════════════════════════════════════╗"
	@echo "║       YouTube Search Clone - Benchmark Commands            ║"
	@echo "╠════════════════════════════════════════════════════════════╣"
	@echo "║ Data Seeding:                                              ║"
	@echo "║   make seed-1k      - Seed 1,000 records                   ║"
	@echo "║   make seed-5k      - Seed 5,000 records                   ║"
	@echo "║   make seed-10k     - Seed 10,000 records                  ║"
	@echo "║   make seed-20k     - Seed 20,000 records                  ║"
	@echo "║   make seed-50k     - Seed 50,000 records                  ║"
	@echo "║   make seed-100k    - Seed 100,000 records                 ║"
	@echo "║   make seed-200k    - Seed 200,000 records                 ║"
	@echo "║   make seed-500k    - Seed 500,000 records                 ║"
	@echo "╠════════════════════════════════════════════════════════════╣"
	@echo "║ K6 Testing:                                                ║"
	@echo "║   make k6-test      - Run k6 test (current data)           ║"
	@echo "╠════════════════════════════════════════════════════════════╣"
	@echo "║ Full Benchmarks (seed + test):                             ║"
	@echo "║   make benchmark-1k   - Benchmark with 1K records          ║"
	@echo "║   make benchmark-5k   - Benchmark with 5K records          ║"
	@echo "║   make benchmark-10k  - Benchmark with 10K records         ║"
	@echo "║   make benchmark-20k  - Benchmark with 20K records         ║"
	@echo "║   make benchmark-50k  - Benchmark with 50K records         ║"
	@echo "║   make benchmark-100k - Benchmark with 100K records        ║"
	@echo "║   make benchmark-200k - Benchmark with 200K records        ║"
	@echo "║   make benchmark-500k - Benchmark with 500K records        ║"
	@echo "║   make benchmark-all  - Run all benchmarks sequentially    ║"
	@echo "╠════════════════════════════════════════════════════════════╣"
	@echo "║ Utilities:                                                 ║"
	@echo "║   make download-data - Download AG News dataset            ║"
	@echo "╚════════════════════════════════════════════════════════════╝"

# ============================================================================
# Data Download
# ============================================================================

download-data:
	@echo "⬇️  Downloading AG News dataset..."
	python scripts/seed_agnews_remote.py --download-only

# ============================================================================
# Data Seeding Targets
# ============================================================================

seed-1k:
	@echo "🌱 Seeding 1,000 records..."
	python scripts/seed_agnews_remote.py --limit 1000 --shuffle

seed-5k:
	@echo "🌱 Seeding 5,000 records..."
	python scripts/seed_agnews_remote.py --limit 5000 --shuffle

seed-10k:
	@echo "🌱 Seeding 10,000 records..."
	python scripts/seed_agnews_remote.py --limit 10000 --shuffle

seed-20k:
	@echo "🌱 Seeding 20,000 records..."
	python scripts/seed_agnews_remote.py --limit 20000 --shuffle

seed-50k:
	@echo "🌱 Seeding 50,000 records..."
	python scripts/seed_agnews_remote.py --limit 50000 --shuffle

seed-100k:
	@echo "🌱 Seeding 100,000 records..."
	python scripts/seed_agnews_remote.py --limit 100000 --shuffle

seed-200k:
	@echo "🌱 Seeding 200,000 records..."
	python scripts/seed_agnews_remote.py --limit 200000 --shuffle

seed-500k:
	@echo "🌱 Seeding 500,000 records..."
	python scripts/seed_agnews_remote.py --limit 500000 --shuffle

# ============================================================================
# K6 Test Target
# ============================================================================

# K6 test configuration (can be overridden)
K6_VUS ?= 10
K6_DURATION ?= 30s
K6_BASE_URL ?= http://localhost:8080

k6-test:
	@echo "🚀 Running k6 load test..."
	@echo "   VUs: $(K6_VUS), Duration: $(K6_DURATION)"
	@mkdir -p k6/results
	k6 run \
		--env BASE_URL=$(K6_BASE_URL) \
		--env VUS=$(K6_VUS) \
		--env DURATION=$(K6_DURATION) \
		--out json=k6/results/latest.json \
		--summary-export=k6/results/summary.json \
		k6/search_test.js

# ============================================================================
# Benchmark Targets (Seed + Test)
# ============================================================================

benchmark-1k: seed-1k
	@echo "📊 Running benchmark with 1K records..."
	@$(MAKE) k6-test
	@echo "1000" > k6/results/current_size.txt

benchmark-5k: seed-5k
	@echo "📊 Running benchmark with 5K records..."
	@$(MAKE) k6-test
	@echo "5000" > k6/results/current_size.txt

benchmark-10k: seed-10k
	@echo "📊 Running benchmark with 10K records..."
	@$(MAKE) k6-test
	@echo "10000" > k6/results/current_size.txt

benchmark-20k: seed-20k
	@echo "📊 Running benchmark with 20K records..."
	@$(MAKE) k6-test
	@echo "20000" > k6/results/current_size.txt

benchmark-50k: seed-50k
	@echo "📊 Running benchmark with 50K records..."
	@$(MAKE) k6-test
	@echo "50000" > k6/results/current_size.txt

benchmark-100k: seed-100k
	@echo "📊 Running benchmark with 100K records..."
	@$(MAKE) k6-test
	@echo "100000" > k6/results/current_size.txt

benchmark-200k: seed-200k
	@echo "📊 Running benchmark with 200K records..."
	@$(MAKE) k6-test
	@echo "200000" > k6/results/current_size.txt

benchmark-500k: seed-500k
	@echo "📊 Running benchmark with 500K records..."
	@$(MAKE) k6-test
	@echo "500000" > k6/results/current_size.txt

# ============================================================================
# Full Benchmark Suite
# ============================================================================

benchmark-all:
	@echo "🏁 Starting full benchmark suite..."
	@echo "   This will test: 1K, 5K, 10K, 20K, 50K, 100K, 200K, 500K records"
	@echo ""
	@bash scripts/run_benchmark.sh

