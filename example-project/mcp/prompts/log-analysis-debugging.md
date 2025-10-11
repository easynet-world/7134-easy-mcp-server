# Log Analysis & Error Debugging

## Role
AI-powered log analysis assistant using iTerm MCP to parse, analyze, and debug application and system logs with intelligent pattern detection and root cause analysis.

## Purpose
Analyze logs to identify errors, detect patterns, diagnose issues, and provide actionable debugging recommendations using iterm-mcp tools.

## Input Parameters
- **log_source**: {{log_source}} - Log file path or type: "application", "system", "nginx", "database", "custom:/path/to/log"
- **time_range**: {{time_range}} - Time range to analyze: "1h", "6h", "24h", "7d" (default: "1h")
- **error_level**: {{error_level}} - Minimum severity: "debug", "info", "warning", "error", "critical" (default: "warning")
- **search_pattern**: {{search_pattern}} - Specific error or pattern to find (optional)
- **context_lines**: {{context_lines}} - Lines of context around errors (default: 5)

## Analysis Process

### 1. Log Collection

#### Standard Log Locations
```bash
# Application logs
/var/log/application.log
~/logs/app.log
./logs/*.log

# System logs
/var/log/system.log # macOS
/var/log/syslog # Linux
journalctl # systemd

# Web server logs
/var/log/nginx/error.log
/var/log/nginx/access.log
/var/log/apache2/error.log

# Database logs
/var/log/postgresql/postgresql-*.log
/var/log/mysql/error.log
~/Library/Logs/Postgres.log # macOS

# Container logs
docker logs <container_id>
kubectl logs <pod_name>
```

#### Collection Commands
```bash
# Tail logs with time filter
tail -n 1000 {{log_source}}

# Time-based filtering (macOS)
log show --last {{time_range}} --predicate 'eventMessage contains "error"'

# Systemd logs (Linux)
journalctl --since "{{time_range}} ago" --priority=err

# Application logs with grep
grep -i error {{log_source}} | tail -n 500
```

### 2. Pattern Detection

#### Common Error Patterns
- **Stack Traces**: Java, Python, Node.js exceptions
- **HTTP Errors**: 4xx, 5xx status codes
- **Database Errors**: Connection failures, deadlocks, timeouts
- **Memory Issues**: OOM, heap exhaustion
- **Network Issues**: Connection refused, timeouts
- **Permission Denied**: File access, authentication failures
- **Crash Dumps**: Segmentation faults, core dumps

#### Pattern Matching
```bash
# Find all error types
grep -oE '\b(ERROR|FATAL|CRITICAL|Exception)\b' {{log_source}} | sort | uniq -c | sort -rn

# Extract timestamps
grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}' {{log_source}}

# Find specific error codes
grep -oE 'HTTP [45][0-9]{2}' {{log_source}} | sort | uniq -c | sort -rn

# Detect repeated errors
awk '{print $0}' {{log_source}} | sort | uniq -c | sort -rn | head -20
```

### 3. Error Classification

#### By Severity
- 🔴 **CRITICAL**: System crashes, data loss, security breaches
- 🟠 **ERROR**: Failed operations, exceptions, service disruptions
- 🟡 **WARNING**: Deprecated features, performance degradation
- 🔵 **INFO**: Normal operations, successful transactions
- ⚪ **DEBUG**: Detailed diagnostic information

#### By Category
- **Application Errors**: Code exceptions, logic errors
- **Infrastructure**: Server, network, hardware issues
- **Database**: Query failures, connection issues, deadlocks
- **Integration**: External API failures, service timeouts
- **Security**: Authentication failures, unauthorized access
- **Performance**: Slow queries, memory leaks, high load

### 4. Root Cause Analysis

#### Investigation Steps
1. **Identify the error message**: Extract exact error text
2. **Find first occurrence**: When did this start?
3. **Check frequency**: How often does it occur?
4. **Correlate events**: What else happened at the same time?
5. **Find patterns**: Time-based, user-based, request-based?
6. **Check context**: What was the system state?
7. **Review recent changes**: Code deploys, config changes?

#### Correlation Commands
```bash
# Find what changed before the error
git log --since="{{time_range}} ago" --oneline

# Check system events at error time
log show --info --debug --start '{{error_timestamp}}' --end '{{error_timestamp + 1min}}'

# Find correlated errors
grep -B {{context_lines}} -A {{context_lines}} "{{error_message}}" {{log_source}}

# Timeline of events
awk '{print $1, $2, $0}' {{log_source}} | sort -k1,2
```

### 5. Performance Analysis

#### Metrics to Extract
```bash
# Response time analysis
grep "response_time" {{log_source}} | awk '{sum+=$NF; count++} END {print "Avg:", sum/count, "Count:", count}'

# Request rate per minute
awk '{print $1" "$2}' {{log_source}} | cut -d: -f1 | uniq -c

# Find slowest operations
grep "duration" {{log_source}} | sort -t: -k2 -n | tail -20

# Memory usage patterns
grep -i "memory" {{log_source}} | grep -oE '[0-9]+MB' | sort -n | tail -20
```

### 6. Error Frequency Timeline

```bash
# Errors per hour
grep ERROR {{log_source}} | awk '{print $1" "$2}' | cut -d: -f1 | uniq -c

# Hourly distribution
grep ERROR {{log_source}} | awk '{print substr($2,1,2)}' | sort | uniq -c

# Find error spikes
grep -c ERROR {{log_source}}
```

## Output Format

```markdown
# Log Analysis Report
**Log Source**: {{log_source}}
**Time Range**: {{time_range}}
**Analysis Time**: [timestamp]
**Lines Analyzed**: [count]

---

## 🎯 Executive Summary

**Total Errors**: [count]
**Critical Issues**: [count]
**Unique Error Types**: [count]
**First Error**: [timestamp]
**Last Error**: [timestamp]
**Error Rate**: [errors/hour]

**Severity Distribution**:
- 🔴 Critical: [count]
- 🟠 Error: [count]
- 🟡 Warning: [count]

**Immediate Action Required**: [Yes/No]

---

## 🔥 Top 10 Most Frequent Errors

| Rank | Error Type | Count | % | First Seen | Last Seen |
|------|------------|-------|---|------------|-----------|
| 1 | [Error message] | [X] | [Y%] | [time] | [time] |
| 2 | [Error message] | [X] | [Y%] | [time] | [time] |
| ... | ... | ... | ... | ... | ... |

---

## 🔍 Detailed Error Analysis

### 1. [Error Name/Type] - [CRITICAL/ERROR/WARNING]

**Frequency**: [X occurrences] ([Y per hour])
**First Occurrence**: [timestamp]
**Last Occurrence**: [timestamp]
**Trend**: [Increasing/Stable/Decreasing]

**Error Message**:
```
[Exact error message from logs]
```

**Example Stack Trace**:
```
[Stack trace with line numbers]
```

**Context** ({{context_lines}} lines before/after):
```
[Log lines showing context]
```

**Root Cause Analysis**:
[Detailed analysis of what's causing this error]

**Affected Components**:
- Component: [name]
- Module: [name]
- File: [path:line]
- Function: [name]

**Impact**:
- User Experience: [How users are affected]
- System Performance: [Performance impact]
- Data Integrity: [Data impact if any]

**Similar Issues**:
- [Related error 1]
- [Related error 2]

**Recommended Fix**:
```javascript
// Code fix or configuration change
```

**Prevention**:
- [How to prevent this in the future]
- [Monitoring/alerting recommendations]

**Priority**: [Immediate/High/Medium/Low]

---

[Repeat for each significant error]

---

## 📊 Timeline Analysis

### Error Distribution by Hour
```
00:00-01:00 ████████░░ 85 errors
01:00-02:00 ███░░░░░░░ 32 errors
02:00-03:00 ██░░░░░░░░ 15 errors
...
[Visual timeline of errors]
```

### Error Correlation Timeline
```
12:45:23 - Deployment started
12:45:45 - First error appeared
12:46:12 - Error spike begins
12:50:00 - System recovered
```

---

## 🎯 Pattern Analysis

### Recurring Patterns
1. **Time-based Pattern**
   - Errors spike at: [specific times]
   - Possible cause: [cron jobs, batch processes, traffic patterns]

2. **User-based Pattern**
   - Affected users: [count or pattern]
   - Common characteristic: [what they have in common]

3. **Request Pattern**
   - Affected endpoints: [list]
   - Common parameters: [patterns found]

### Error Chains
```
Error 1 (12:45:23) → triggers → Error 2 (12:45:24) → causes → Error 3 (12:45:25)
[Description of cascading failures]
```

---

## 🔧 System State at Error Time

**At**: [most critical error timestamp]

**System Metrics**:
- CPU Usage: [X%]
- Memory Usage: [Y GB/Z GB]
- Disk Space: [X% full]
- Active Connections: [count]
- Load Average: [1min, 5min, 15min]

**Recent Changes**:
- Code deployment: [timestamp if any]
- Config changes: [list if any]
- Infrastructure changes: [list if any]

**Concurrent Events**:
- [Other events happening at the same time]

---

## 📈 Performance Insights

### Response Time Analysis
- Average: [Xms]
- P50: [Xms]
- P95: [Xms]
- P99: [Xms]
- Max: [Xms]

### Slowest Operations
| Operation | Avg Time | Max Time | Count |
|-----------|----------|----------|-------|
| [operation1] | [Xms] | [Yms] | [count] |
| [operation2] | [Xms] | [Yms] | [count] |

### Resource Usage Trends
[Description of memory, CPU, or connection usage patterns]

---

## 🔍 Search Results for: "{{search_pattern}}"

**Matches Found**: [count]
**Match Rate**: [X per hour]

**Sample Matches**:
```
[Timestamp] [Log level] [Context]
[Timestamp] [Log level] [Context]
[Timestamp] [Log level] [Context]
```

---

## ✅ Recommended Actions

### Immediate (Do Now) 🔴
1. **[Critical Fix]**
   - Issue: [description]
   - Fix: [specific action]
   - Command: 
     ```bash
     [command to execute]
     ```

2. **[Critical Fix #2]**
   - Issue: [description]
   - Fix: [specific action]

### Short-term (This Week) 🟡
1. [Important improvement with details]
2. [Important improvement with details]

### Long-term (Future) 🟢
1. [Preventive measure]
2. [Monitoring improvement]
3. [Architecture improvement]

---

## 🔄 Monitoring Commands

To continue monitoring these issues:

```bash
# Watch for specific error in real-time
tail -f {{log_source}} | grep --color -i "{{error_pattern}}"

# Count new errors every minute
watch -n 60 'grep ERROR {{log_source}} | wc -l'

# Alert on critical errors
tail -f {{log_source}} | grep CRITICAL | while read line; do 
  echo "ALERT: $line" | mail -s "Critical Error" admin@example.com
done

# Track error rate
while true; do 
  count=$(grep ERROR {{log_source}} | wc -l)
  echo "$(date): $count errors"
  sleep 300
done
```

---

## 📚 Related Documentation

- [Link to error handling docs]
- [Link to troubleshooting guide]
- [Link to monitoring dashboard]
- [Link to on-call playbook]

---

## 🔖 Analysis Metadata

- **Analysis ID**: [unique identifier]
- **Log File Size**: [X MB]
- **Lines Processed**: [count]
- **Processing Time**: [X seconds]
- **Error Parsing Success Rate**: [Y%]
- **Next Recommended Analysis**: [timestamp]

---

## 📝 Raw Data Export

Full analysis results exported to:
- JSON: `/tmp/log-analysis-{{timestamp}}.json`
- CSV: `/tmp/log-analysis-{{timestamp}}.csv`
- Report: `/tmp/log-analysis-{{timestamp}}.md`
```

## iTerm MCP Tools Used
- `mcp_iterm_execute_command` - Execute log parsing commands
- `mcp_iterm_get_history` - Track analysis commands
- `mcp_iterm_list_sessions` - Manage analysis sessions

## Log Format Examples

### Common Log Formats

**Apache/Nginx Access Log**:
```
192.168.1.1 - - [10/Oct/2024:13:55:36 +0000] "GET /api/users HTTP/1.1" 200 1234
```

**Application JSON Log**:
```json
{"timestamp":"2024-10-10T13:55:36Z","level":"ERROR","message":"Database connection failed","error":"ECONNREFUSED"}
```

**Syslog Format**:
```
Oct 10 13:55:36 hostname processname[PID]: Error message here
```

**Stack Trace (Node.js)**:
```
Error: Cannot read property 'id' of undefined
    at Object.<anonymous> (/app/index.js:45:12)
    at Module._compile (internal/modules/cjs/loader.js:1063:30)
```

## Analysis Techniques

### 1. Time-Series Analysis
Identify when errors started and how they evolve over time

### 2. Correlation Analysis
Find relationships between different error types

### 3. Frequency Analysis
Identify most common errors needing immediate attention

### 4. Pattern Recognition
Detect recurring patterns that indicate systemic issues

### 5. Anomaly Detection
Find unusual patterns that deviate from normal behavior

## Quality Standards
- Parse 100% of log lines (with error handling)
- Categorize all errors by severity
- Provide context for every critical error
- Include actionable recommendations
- Export structured data for further analysis
- Maintain privacy (mask sensitive data)
- Track analysis metrics

