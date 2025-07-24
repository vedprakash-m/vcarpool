"use strict";
/**
 * Continuous Security Scanner
 * Provides runtime security monitoring and vulnerability detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityScanner = void 0;
const logger_1 = require("../utils/logger");
const monitoring_enhanced_1 = require("../utils/monitoring-enhanced");
const monitoringService = monitoring_enhanced_1.MonitoringService.getInstance();
class SecurityScanner {
    threats = [];
    suspiciousPatterns = new Map();
    ipAttempts = new Map();
    userAttempts = new Map();
    constructor() {
        this.initializeSuspiciousPatterns();
        this.startPeriodicScans();
    }
    initializeSuspiciousPatterns() {
        this.suspiciousPatterns.set('sql_injection', /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b.*(\b(FROM|WHERE|INTO)\b|--|\/\*|\*\/|;))/i);
        this.suspiciousPatterns.set('xss', /(<script[^>]*>.*?<\/script>|javascript:|on\w+\s*=|<iframe|<object|<embed)/i);
        this.suspiciousPatterns.set('path_traversal', /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)/i);
        this.suspiciousPatterns.set('command_injection', /(\||&|;|`|\$\(|\${|<|>)/);
        this.suspiciousPatterns.set('data_exfiltration', /(base64|atob|btoa|eval|Function\()/i);
    }
    /**
     * Scan request for security threats
     */
    scanRequest(req) {
        const threats = [];
        const timestamp = new Date();
        const ipAddress = this.getClientIP(req);
        const userId = req.user?.id;
        // Check for suspicious patterns in request data
        const requestData = JSON.stringify({
            url: req.url,
            query: req.query,
            body: req.body,
            headers: req.headers
        });
        for (const [type, pattern] of this.suspiciousPatterns) {
            if (pattern.test(requestData)) {
                threats.push({
                    id: this.generateThreatId(),
                    type: type,
                    severity: this.getSeverityForType(type),
                    source: 'request_scanner',
                    details: {
                        url: req.url,
                        method: req.method,
                        matchedPattern: pattern.source,
                        suspiciousData: this.extractSuspiciousData(requestData, pattern)
                    },
                    timestamp,
                    userId,
                    ipAddress
                });
            }
        }
        // Check for rate limiting violations
        this.checkRateLimit(ipAddress, userId, threats, timestamp);
        // Store threats for analysis
        threats.forEach(threat => this.addThreat(threat));
        return threats;
    }
    /**
     * Scan response for data leakage
     */
    scanResponse(res, data) {
        const threats = [];
        const timestamp = new Date();
        // Check for sensitive data exposure
        const sensitivePatterns = [
            /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email in logs
            /(?:password|pwd|secret|key|token)[\s]*[:=][\s]*[^\s"']+/i // Credentials
        ];
        const responseData = JSON.stringify(data);
        for (const pattern of sensitivePatterns) {
            if (pattern.test(responseData)) {
                threats.push({
                    id: this.generateThreatId(),
                    type: 'data_breach_attempt',
                    severity: 'high',
                    source: 'response_scanner',
                    details: {
                        pattern: pattern.source,
                        responseSize: responseData.length,
                        potentialLeak: true
                    },
                    timestamp
                });
            }
        }
        threats.forEach(threat => this.addThreat(threat));
        return threats;
    }
    /**
     * Perform vulnerability scan on codebase
     */
    async performVulnerabilityScan() {
        const threats = [];
        const timestamp = new Date();
        // Check for common vulnerabilities
        const vulnerabilities = await this.checkCommonVulnerabilities();
        vulnerabilities.forEach(vuln => {
            threats.push({
                id: this.generateThreatId(),
                type: 'suspicious_pattern',
                severity: vuln.severity,
                source: 'vulnerability_scanner',
                details: vuln,
                timestamp
            });
        });
        const riskScore = this.calculateRiskScore(threats);
        const recommendations = this.generateRecommendations(threats);
        return {
            threats,
            riskScore,
            recommendations
        };
    }
    /**
     * Get security metrics
     */
    getSecurityMetrics() {
        const threatsByType = {};
        const threatsBySeverity = {};
        const sourceCount = {};
        this.threats.forEach(threat => {
            threatsByType[threat.type] = (threatsByType[threat.type] || 0) + 1;
            threatsBySeverity[threat.severity] = (threatsBySeverity[threat.severity] || 0) + 1;
            sourceCount[threat.source] = (sourceCount[threat.source] || 0) + 1;
        });
        const topSources = Object.entries(sourceCount)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        // Calculate risk trend for last 24 hours
        const riskTrend = this.calculateRiskTrend();
        return {
            totalThreats: this.threats.length,
            threatsByType,
            threatsBySeverity,
            topSources,
            riskTrend
        };
    }
    checkRateLimit(ipAddress, userId, threats, timestamp) {
        // Check IP-based rate limiting
        const ipAttempts = this.ipAttempts.get(ipAddress) || { count: 0, lastAttempt: new Date(0) };
        const timeDiff = timestamp.getTime() - ipAttempts.lastAttempt.getTime();
        if (timeDiff < 60000) { // Within 1 minute
            ipAttempts.count++;
        }
        else {
            ipAttempts.count = 1;
        }
        ipAttempts.lastAttempt = timestamp;
        this.ipAttempts.set(ipAddress, ipAttempts);
        if (ipAttempts.count > 100) { // More than 100 requests per minute
            threats.push({
                id: this.generateThreatId(),
                type: 'rate_limit_exceeded',
                severity: 'medium',
                source: 'rate_limiter',
                details: {
                    ipAddress,
                    attemptCount: ipAttempts.count,
                    timeWindow: '1 minute'
                },
                timestamp,
                userId,
                ipAddress
            });
        }
        // Check user-based rate limiting if user is authenticated
        if (userId) {
            const userAttempts = this.userAttempts.get(userId) || { count: 0, lastAttempt: new Date(0) };
            const userTimeDiff = timestamp.getTime() - userAttempts.lastAttempt.getTime();
            if (userTimeDiff < 60000) {
                userAttempts.count++;
            }
            else {
                userAttempts.count = 1;
            }
            userAttempts.lastAttempt = timestamp;
            this.userAttempts.set(userId, userAttempts);
            if (userAttempts.count > 200) { // More than 200 requests per minute for authenticated users
                threats.push({
                    id: this.generateThreatId(),
                    type: 'rate_limit_exceeded',
                    severity: 'high',
                    source: 'user_rate_limiter',
                    details: {
                        userId,
                        attemptCount: userAttempts.count,
                        timeWindow: '1 minute'
                    },
                    timestamp,
                    userId,
                    ipAddress
                });
            }
        }
    }
    async checkCommonVulnerabilities() {
        const vulnerabilities = [];
        // Check for hardcoded secrets (simulated)
        const secretPatterns = [
            /(?:password|pwd|secret|key|token)[\s]*[:=][\s]*['"]\w+['"]/i,
            /(?:api_key|apikey|access_token)[\s]*[:=][\s]*['"]\w+['"]/i
        ];
        // In a real implementation, you would scan actual files
        // This is a simplified example
        vulnerabilities.push({
            name: 'Potential Hardcoded Secret',
            description: 'Detected potential hardcoded credentials in configuration',
            severity: 'high'
        });
        return vulnerabilities;
    }
    calculateRiskScore(threats) {
        const severityWeights = { low: 1, medium: 3, high: 7, critical: 10 };
        const totalScore = threats.reduce((sum, threat) => sum + severityWeights[threat.severity], 0);
        return Math.min(100, (totalScore / threats.length) * 10); // Normalize to 0-100
    }
    generateRecommendations(threats) {
        const recommendations = new Set();
        threats.forEach(threat => {
            switch (threat.type) {
                case 'sql_injection':
                    recommendations.add('Implement parameterized queries and input validation');
                    break;
                case 'xss':
                    recommendations.add('Sanitize all user inputs and implement Content Security Policy');
                    break;
                case 'rate_limit_exceeded':
                    recommendations.add('Review and adjust rate limiting policies');
                    break;
                case 'data_breach_attempt':
                    recommendations.add('Review data exposure policies and implement data masking');
                    break;
            }
        });
        return Array.from(recommendations);
    }
    calculateRiskTrend() {
        const now = new Date();
        const trend = [];
        for (let i = 23; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 60 * 60 * 1000);
            const hourThreats = this.threats.filter(threat => {
                const threatHour = new Date(threat.timestamp);
                return threatHour.getHours() === date.getHours() &&
                    threatHour.getDate() === date.getDate();
            });
            trend.push({
                date: date.toISOString(),
                riskScore: this.calculateRiskScore(hourThreats)
            });
        }
        return trend;
    }
    startPeriodicScans() {
        // Run security scans every 5 minutes
        setInterval(async () => {
            try {
                const scanResult = await this.performVulnerabilityScan();
                if (scanResult.riskScore > 70) {
                    logger_1.logger.warn('High security risk detected', {
                        riskScore: scanResult.riskScore,
                        threatCount: scanResult.threats.length
                    });
                    // Log high security risk
                    logger_1.logger.error('High Security Risk Detected', {
                        title: 'High Security Risk Detected',
                        message: `Security risk score: ${scanResult.riskScore}`,
                        severity: 'high',
                        data: { scanResult }
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Security scan failed', { error });
            }
        }, 5 * 60 * 1000);
        // Clean up old threats every hour
        setInterval(() => {
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
            this.threats = this.threats.filter(threat => threat.timestamp > cutoff);
        }, 60 * 60 * 1000);
    }
    addThreat(threat) {
        this.threats.push(threat);
        // Log high and critical threats immediately
        if (threat.severity === 'high' || threat.severity === 'critical') {
            logger_1.logger.warn('Security threat detected', {
                threatId: threat.id,
                type: threat.type,
                severity: threat.severity,
                details: threat.details
            });
        }
    }
    getClientIP(req) {
        return req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            'unknown';
    }
    extractSuspiciousData(data, pattern) {
        const matches = data.match(new RegExp(pattern.source, 'gi'));
        return matches ? matches.slice(0, 3) : []; // Limit to first 3 matches
    }
    getSeverityForType(type) {
        const severityMap = {
            sql_injection: 'critical',
            xss: 'high',
            path_traversal: 'high',
            command_injection: 'critical',
            data_exfiltration: 'critical'
        };
        return severityMap[type] || 'medium';
    }
    generateThreatId() {
        return `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.securityScanner = new SecurityScanner();
