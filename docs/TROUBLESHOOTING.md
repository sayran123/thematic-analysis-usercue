# Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting procedures for common issues encountered in the Thematic Analysis Pipeline. Each section includes symptoms, root causes, and step-by-step solutions.

## Quick Diagnostic Commands

Before diving into specific issues, run these diagnostic commands:

```bash
# System health check
npm run health-check

# Environment validation
npm run validate:env

# Basic connectivity test
node -e "console.log('Node.js:', process.version, 'Platform:', process.platform)"

# LLM API connectivity test
npm run test:config
```

## Common Issues and Solutions

### 1. Environment and Configuration Issues

#### Issue: "Missing required environment variables"
**Symptoms:**
- Error during startup: `Missing required environment variables: OPENAI_API_KEY`
- Health check fails

**Root Causes:**
- `.env` file missing or incomplete
- Environment variables not properly loaded
- API key invalid or expired

**Solutions:**
```bash
# Step 1: Check if .env file exists
ls -la .env

# Step 2: Verify .env content
cat .env | grep OPENAI_API_KEY

# Step 3: Test API key validity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models | head -20

# Step 4: Recreate .env if necessary
cp .env.example .env
# Edit .env with valid API key

# Step 5: Reload and test
source .env
npm run validate:env
```

#### Issue: "Configuration validation failed"
**Symptoms:**
- System fails during initialization
- Invalid configuration errors

**Solutions:**
```bash
# Check configuration structure
npm run validate

# Test with default configuration
node -e "
  import('./src/utils/config/constants.js')
    .then(m => console.log('Config:', JSON.stringify(m.getConfig(), null, 2)))
    .catch(e => console.error('Config error:', e.message))
"

# Reset to default configuration if corrupted
git checkout src/utils/config/constants.js
```

### 2. Data Input Issues

#### Issue: "Excel file not found" or "File access denied"
**Symptoms:**
- Error: `ENOENT: no such file or directory, open 'inputs/data.xlsx'`
- File permission errors

**Solutions:**
```bash
# Step 1: Verify file exists
ls -la inputs/

# Step 2: Check file permissions
chmod 644 inputs/data.xlsx
chmod 644 inputs/project_background.txt

# Step 3: Verify file is valid Excel format
file inputs/data.xlsx  # Should show "Microsoft Excel"

# Step 4: Test file access
node -e "
  import fs from 'fs';
  try {
    const stats = fs.statSync('inputs/data.xlsx');
    console.log('File size:', stats.size, 'bytes');
    console.log('Readable:', fs.constants.R_OK);
  } catch (e) {
    console.error('File access error:', e.message);
  }
"
```

#### Issue: "Invalid Excel format" or "No data extracted"
**Symptoms:**
- Empty dataset after extraction
- Format validation errors
- No questions detected

**Solutions:**
```bash
# Step 1: Validate Excel structure
npm run test:basic

# Step 2: Check Excel format manually
# Open inputs/data.xlsx and verify:
# - Column A: Participant IDs
# - Columns B+: Question data
# - Cell format: "assistant: question user: response"

# Step 3: Test extraction manually
node -e "
  import { extractDataFromExcel } from './src/data/extractors/excel-extractor.js';
  
  extractDataFromExcel('inputs/data.xlsx', 'inputs/project_background.txt')
    .then(result => {
      if (result.error) {
        console.error('Extraction error:', result.error);
      } else {
        console.log('Questions found:', result.data.questions.length);
        console.log('Responses found:', result.data.participantResponses.length);
        console.log('Participants:', result.data.metadata.totalParticipants);
      }
    })
    .catch(e => console.error('Failed:', e.message));
"
```

### 3. LLM Integration Issues

#### Issue: "LLM API timeout" or "Rate limit exceeded"
**Symptoms:**
- Timeout errors during theme generation or classification
- Rate limit warnings
- Network connection failures

**Solutions:**
```bash
# Step 1: Check internet connectivity
ping -c 3 api.openai.com

# Step 2: Verify API status
curl -s https://status.openai.com/api/v2/status.json | jq '.status.description'

# Step 3: Test API connectivity
npm run test:config

# Step 4: Check API usage and limits
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/usage

# Step 5: Implement temporary fixes
# Increase timeout in .env
echo "OPENAI_API_TIMEOUT=120000" >> .env

# Reduce batch size temporarily
# Edit src/analysis/agents/classifier.js
# Change BATCH_SIZE from 25 to 10
```

#### Issue: "Classification batch failures" or "Quote validation errors"
**Symptoms:**
- Incomplete classifications
- Quote hallucination detection failures
- Partial analysis results

**Solutions:**
```bash
# Step 1: Check LLM response quality
node -e "
  import { classifyResponses } from './src/analysis/agents/classifier.js';
  console.log('Testing classification agent...');
  // Manual test with small dataset
"

# Step 2: Review batch processing logs
grep -r "batch.*failed" outputs/

# Step 3: Test quote validation
npm run test:integration

# Step 4: Reduce batch size for reliability
# Edit src/analysis/agents/classifier.js
# Reduce BATCH_SIZE if experiencing failures

# Step 5: Check retry logic
# Verify retry attempts in logs
grep -r "retry.*attempt" outputs/
```

### 4. Performance Issues

#### Issue: "Execution time exceeds expected performance"
**Symptoms:**
- Analysis takes > 10 minutes
- High memory usage
- System becomes unresponsive

**Solutions:**
```bash
# Step 1: Run performance benchmark
npm run test:performance

# Step 2: Monitor resource usage
# Linux:
top -p $(pgrep -f "node.*main.js")
# macOS:
top -pid $(pgrep -f "node.*main.js")

# Step 3: Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm start

# Step 4: Check for memory leaks
node --inspect src/main.js
# Connect Chrome DevTools to monitor memory

# Step 5: Optimize parallel processing
# Reduce concurrent questions if necessary
# Edit src/analysis/workflows/parallel-orchestrator.js
```

#### Issue: "Memory limit exceeded" or "Out of memory"
**Symptoms:**
- `JavaScript heap out of memory` errors
- Process killed by system
- Gradual memory increase

**Solutions:**
```bash
# Step 1: Increase memory limit
node --max-old-space-size=8192 src/main.js

# Step 2: Monitor memory usage
npm run test:performance

# Step 3: Check for memory leaks
# Enable memory monitoring
NODE_OPTIONS="--expose-gc" npm start

# Step 4: Process smaller batches
# Reduce dataset size temporarily
# Process questions individually if needed

# Step 5: System-level optimization
# Linux: Increase swap space
sudo swapon --show
sudo fallocate -l 2G /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 5. Output Generation Issues

#### Issue: "Output files not generated" or "Incomplete outputs"
**Symptoms:**
- Missing JSON, Excel, or Markdown files
- Partial output generation
- File format errors

**Solutions:**
```bash
# Step 1: Check output directory permissions
ls -la outputs/
chmod 755 outputs/

# Step 2: Verify disk space
df -h .

# Step 3: Test output generators individually
node -e "
  import { generateMainResults } from './src/outputs/generators/json-generator.js';
  console.log('Testing JSON generator...');
  // Test with mock data
"

# Step 4: Check for file corruption
find outputs/ -name "*.json" -exec json_verify {} \;

# Step 5: Regenerate outputs
rm -rf outputs/test-*
npm run test:production
```

#### Issue: "Excel file generation errors"
**Symptoms:**
- Corrupted Excel files
- Excel files cannot be opened
- Missing worksheets

**Solutions:**
```bash
# Step 1: Verify ExcelJS installation
npm list exceljs

# Step 2: Test Excel generation
node -e "
  import ExcelJS from 'exceljs';
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test');
  worksheet.getCell('A1').value = 'Test';
  console.log('ExcelJS working correctly');
"

# Step 3: Check file permissions
chmod 644 outputs/*.xlsx

# Step 4: Validate Excel structure
# Use external tool to verify:
file outputs/*_classifications.xlsx
```

### 6. Deployment Issues

#### Issue: "Docker container fails to start"
**Symptoms:**
- Container exits immediately
- Mount volume errors
- Environment variable issues

**Solutions:**
```bash
# Step 1: Check Docker logs
docker logs <container_id>

# Step 2: Test basic container
docker run -it node:18-alpine sh

# Step 3: Verify volume mounts
docker run -v $(pwd)/inputs:/app/inputs -it node:18-alpine ls -la /app/inputs

# Step 4: Test environment variables
docker run -e OPENAI_API_KEY=test -it node:18-alpine env | grep OPENAI

# Step 5: Debug container build
docker build --no-cache -t thematic-analysis .
```

#### Issue: "PM2 process crashes" or "Service fails to restart"
**Symptoms:**
- PM2 shows stopped status
- Process restarts continuously
- Memory restart loops

**Solutions:**
```bash
# Step 1: Check PM2 logs
pm2 logs thematic-analysis

# Step 2: Verify PM2 configuration
cat ecosystem.config.js

# Step 3: Test manual start
pm2 delete thematic-analysis
node src/main.js  # Test manually first

# Step 4: Adjust memory limits
# Edit ecosystem.config.js
max_memory_restart: '4G'

# Step 5: Monitor restart behavior
pm2 monit
```

## Error Message Reference

### Common Error Patterns

| Error Message | Category | Typical Cause |
|---------------|----------|---------------|
| `ENOENT: no such file` | File System | Missing input files |
| `ReferenceError: fetch is not defined` | Environment | Node.js version < 18 |
| `API key is invalid` | Authentication | Wrong/expired API key |
| `Rate limit exceeded` | API | Too many requests |
| `JavaScript heap out of memory` | Performance | Insufficient memory |
| `JSON.parse unexpected token` | Data | Corrupted response |
| `Classification batch failed` | LLM | API response issues |
| `Quote validation failed` | Validation | Hallucinated quotes |

### Emergency Recovery Procedures

#### Complete System Reset
```bash
# 1. Stop all processes
pm2 stop all  # If using PM2
killall node  # Kill any running Node processes

# 2. Clean all temporary data
npm run clean
rm -rf node_modules
rm -rf outputs/test-*

# 3. Fresh installation
npm install
npm run validate:env

# 4. Test with minimal data
# Create test dataset with 1 question, 5 responses
npm run test:basic

# 5. Gradual scale-up
npm run test:integration
npm run test:production
```

#### Data Recovery from Partial Run
```bash
# 1. Check for partial outputs
ls -la outputs/*/

# 2. Identify completed questions
find outputs/ -name "*_classifications.xlsx" | wc -l

# 3. Resume from specific point
# Manual intervention may be required
# Contact support for complex recovery scenarios
```

## Debug Mode and Logging

### Enable Debug Logging
```bash
# Set debug environment
export DEBUG=thematic-analysis:*
export NODE_ENV=development

# Run with verbose logging
npm run dev

# Specific component debugging
export DEBUG=thematic-analysis:llm
export DEBUG=thematic-analysis:extraction
export DEBUG=thematic-analysis:validation
```

### Performance Profiling
```bash
# CPU profiling
node --prof src/main.js
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect --inspect-brk src/main.js
# Connect Chrome DevTools for memory analysis
```

## Getting Help

### Information to Collect Before Requesting Support

1. **System Information:**
   ```bash
   npm run health-check > system-info.txt
   cat system-info.txt
   ```

2. **Error Logs:**
   ```bash
   # Recent errors
   grep -r "ERROR\|Failed\|Exception" outputs/ > error-log.txt
   ```

3. **Configuration:**
   ```bash
   # Sanitized configuration (remove API keys)
   npm run validate > config-info.txt
   ```

4. **Performance Data:**
   ```bash
   npm run test:performance > performance-info.txt
   ```

### Support Escalation

| Issue Severity | Response Time | Contact Method |
|----------------|---------------|----------------|
| **Critical** (System down) | Immediate | Direct contact |
| **High** (Degraded performance) | 4 hours | Issue tracker |
| **Medium** (Minor bugs) | 1 business day | Documentation first |
| **Low** (Questions) | 3 business days | Community forum |

### Self-Service Resources

1. **Documentation**: Check [DEPLOYMENT.md](./DEPLOYMENT.md) and [PERFORMANCE.md](./PERFORMANCE.md)
2. **Test Suite**: Run `npm run test:all` for comprehensive diagnostics
3. **Performance Analysis**: Use `npm run benchmark` for detailed metrics
4. **Community**: Search existing issues and discussions

---

**Quick Recovery Checklist:**
- [ ] Check system requirements
- [ ] Verify environment variables
- [ ] Test LLM API connectivity
- [ ] Validate input data format
- [ ] Check disk space and permissions
- [ ] Monitor memory usage
- [ ] Review error logs
- [ ] Test with minimal dataset
- [ ] Contact support if needed

**Emergency Contact:** For critical production issues, follow the escalation procedures above.
