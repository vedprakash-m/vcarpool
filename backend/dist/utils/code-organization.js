"use strict";
/**
 * Code Organization and Architecture Utilities
 * Provides tools for maintaining clean code organization and architectural compliance
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
class CodeOrganizationManager {
    rules = [];
    projectRoot;
    excludePatterns = [
        /node_modules/,
        /\.git/,
        /dist/,
        /build/,
        /coverage/,
        /\.next/
    ];
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.initializeRules();
    }
    /**
     * Analyze project architecture and generate compliance report
     */
    async analyzeArchitecture() {
        logger_1.logger.info('Starting architecture analysis');
        const violations = [];
        const metrics = await this.calculateCodeMetrics();
        // Scan all TypeScript and JavaScript files
        const files = await this.getSourceFiles();
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                for (const rule of this.rules) {
                    const ruleViolations = await rule.check(file, content);
                    violations.push(...ruleViolations);
                }
            }
            catch (error) {
                logger_1.logger.warn(`Failed to analyze file: ${file}`, { error });
            }
        }
        const compliance = this.calculateCompliance(violations, metrics);
        const trends = await this.getComplianceTrends();
        logger_1.logger.info('Architecture analysis completed', {
            violations: violations.length,
            score: compliance.score,
            grade: compliance.grade
        });
        return {
            violations,
            metrics,
            compliance,
            trends
        };
    }
    /**
     * Fix auto-fixable architecture violations
     */
    async fixViolations(violations) {
        const results = {
            fixed: 0,
            failed: 0,
            details: []
        };
        for (const violation of violations) {
            try {
                const fixed = await this.attemptFix(violation);
                if (fixed) {
                    results.fixed++;
                    results.details.push({
                        file: violation.file,
                        ruleId: violation.ruleId,
                        success: true
                    });
                }
            }
            catch (error) {
                results.failed++;
                results.details.push({
                    file: violation.file,
                    ruleId: violation.ruleId,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return results;
    }
    /**
     * Generate code organization recommendations
     */
    generateRecommendations(report) {
        const recommendations = [];
        // Structure recommendations
        if (report.violations.filter(v => v.ruleId.includes('structure')).length > 0) {
            recommendations.push('Consider reorganizing files according to feature-based structure');
            recommendations.push('Move shared utilities to common directories');
        }
        // Naming recommendations
        if (report.violations.filter(v => v.ruleId.includes('naming')).length > 0) {
            recommendations.push('Adopt consistent naming conventions across the codebase');
            recommendations.push('Use descriptive names for functions and variables');
        }
        // Dependency recommendations
        if (report.metrics.dependencies.circular.length > 0) {
            recommendations.push('Resolve circular dependencies to improve modularity');
            recommendations.push('Consider dependency injection to reduce coupling');
        }
        // Performance recommendations
        if (report.metrics.complexity > 10) {
            recommendations.push('Reduce code complexity by breaking down large functions');
            recommendations.push('Extract complex logic into separate modules');
        }
        // Test coverage recommendations
        if (report.metrics.testCoverage < 80) {
            recommendations.push('Increase test coverage to at least 80%');
            recommendations.push('Add unit tests for critical business logic');
        }
        return recommendations;
    }
    initializeRules() {
        this.rules = [
            {
                id: 'structure_feature_based',
                name: 'Feature-based Structure',
                description: 'Files should be organized by feature rather than type',
                category: 'structure',
                severity: 'warning',
                check: async (filePath, content) => {
                    const violations = [];
                    // Check if files are organized by type instead of feature
                    if (filePath.includes('/controllers/') || filePath.includes('/models/') || filePath.includes('/views/')) {
                        violations.push({
                            ruleId: 'structure_feature_based',
                            file: filePath,
                            message: 'Consider organizing files by feature instead of type',
                            severity: 'warning',
                            suggestion: 'Move files to feature-based directories like /user/, /trip/, etc.'
                        });
                    }
                    return violations;
                }
            },
            {
                id: 'naming_function_convention',
                name: 'Function Naming Convention',
                description: 'Functions should use camelCase and be descriptive',
                category: 'naming',
                severity: 'warning',
                pattern: /function\s+([A-Z][a-zA-Z0-9]*)|const\s+([A-Z][a-zA-Z0-9]*)\s*=/,
                check: async (filePath, content) => {
                    const violations = [];
                    const lines = content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const match = line.match(/(?:function\s+|const\s+)([A-Z][a-zA-Z0-9]*)/);
                        if (match) {
                            violations.push({
                                ruleId: 'naming_function_convention',
                                file: filePath,
                                line: i + 1,
                                message: `Function '${match[1]}' should use camelCase naming`,
                                severity: 'warning',
                                suggestion: `Rename to '${match[1].charAt(0).toLowerCase() + match[1].slice(1)}'`
                            });
                        }
                    }
                    return violations;
                }
            },
            {
                id: 'dependency_circular',
                name: 'Circular Dependencies',
                description: 'Avoid circular dependencies between modules',
                category: 'dependency',
                severity: 'error',
                check: async (filePath, content) => {
                    const violations = [];
                    // This would require a more sophisticated dependency graph analysis
                    // For now, we'll check for obvious patterns
                    const imports = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
                    const relativePaths = imports.filter(imp => imp.includes('../'));
                    if (relativePaths.length > 5) {
                        violations.push({
                            ruleId: 'dependency_circular',
                            file: filePath,
                            message: 'Too many relative imports may indicate circular dependencies',
                            severity: 'warning',
                            suggestion: 'Consider using absolute imports or restructuring modules'
                        });
                    }
                    return violations;
                }
            },
            {
                id: 'security_hardcoded_secrets',
                name: 'Hardcoded Secrets',
                description: 'Avoid hardcoded secrets in source code',
                category: 'security',
                severity: 'error',
                pattern: /(password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/i,
                check: async (filePath, content) => {
                    const violations = [];
                    const lines = content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const match = line.match(/(password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/i);
                        if (match && !line.includes('process.env') && !line.includes('example')) {
                            violations.push({
                                ruleId: 'security_hardcoded_secrets',
                                file: filePath,
                                line: i + 1,
                                message: 'Potential hardcoded secret detected',
                                severity: 'error',
                                suggestion: 'Use environment variables instead'
                            });
                        }
                    }
                    return violations;
                }
            },
            {
                id: 'performance_large_function',
                name: 'Large Functions',
                description: 'Functions should not exceed 50 lines',
                category: 'performance',
                severity: 'warning',
                check: async (filePath, content) => {
                    const violations = [];
                    const lines = content.split('\n');
                    let currentFunction = null;
                    let braceCount = 0;
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        // Detect function start
                        const functionMatch = line.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|\w+\s*\([^)]*\)\s*[{:])/);
                        if (functionMatch && line.includes('{')) {
                            currentFunction = {
                                name: functionMatch[1] || functionMatch[2] || 'anonymous',
                                start: i + 1
                            };
                            braceCount = 1;
                        }
                        else if (currentFunction) {
                            // Count braces to find function end
                            braceCount += (line.match(/{/g) || []).length;
                            braceCount -= (line.match(/}/g) || []).length;
                            if (braceCount === 0) {
                                const functionLength = i - currentFunction.start + 1;
                                if (functionLength > 50) {
                                    violations.push({
                                        ruleId: 'performance_large_function',
                                        file: filePath,
                                        line: currentFunction.start,
                                        message: `Function '${currentFunction.name}' is ${functionLength} lines long`,
                                        severity: 'warning',
                                        suggestion: 'Consider breaking down into smaller functions'
                                    });
                                }
                                currentFunction = null;
                            }
                        }
                    }
                    return violations;
                }
            },
            {
                id: 'structure_file_size',
                name: 'File Size Limit',
                description: 'Source files should not exceed 500 lines',
                category: 'structure',
                severity: 'warning',
                check: async (filePath, content) => {
                    const violations = [];
                    const lineCount = content.split('\n').length;
                    if (lineCount > 500) {
                        violations.push({
                            ruleId: 'structure_file_size',
                            file: filePath,
                            message: `File has ${lineCount} lines, exceeds 500 line limit`,
                            severity: 'warning',
                            suggestion: 'Consider splitting into multiple files'
                        });
                    }
                    return violations;
                }
            }
        ];
    }
    async getSourceFiles() {
        const files = [];
        const scanDirectory = async (dir) => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (this.excludePatterns.some(pattern => pattern.test(fullPath))) {
                        continue;
                    }
                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);
                    }
                    else if (entry.isFile() && /\.(ts|js|tsx|jsx)$/.test(entry.name)) {
                        files.push(fullPath);
                    }
                }
            }
            catch (error) {
                logger_1.logger.warn(`Failed to scan directory: ${dir}`, { error });
            }
        };
        await scanDirectory(this.projectRoot);
        return files;
    }
    async calculateCodeMetrics() {
        const files = await this.getSourceFiles();
        let totalLines = 0;
        let totalFunctions = 0;
        let totalClasses = 0;
        let totalComplexity = 0;
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                const lines = content.split('\n').length;
                totalLines += lines;
                // Count functions
                const functionMatches = content.match(/(?:function\s+\w+|const\s+\w+\s*=|\w+\s*\([^)]*\)\s*=>)/g) || [];
                totalFunctions += functionMatches.length;
                // Count classes
                const classMatches = content.match(/class\s+\w+/g) || [];
                totalClasses += classMatches.length;
                // Calculate cyclomatic complexity (simplified)
                const complexityKeywords = content.match(/\b(if|else|while|for|switch|case|catch|&&|\|\|)\b/g) || [];
                totalComplexity += complexityKeywords.length;
            }
            catch (error) {
                logger_1.logger.warn(`Failed to analyze file metrics: ${file}`, { error });
            }
        }
        const averageComplexity = totalFunctions > 0 ? totalComplexity / totalFunctions : 0;
        const maintainabilityIndex = Math.max(0, 171 - 5.2 * Math.log(totalLines) - 0.23 * averageComplexity);
        return {
            files: files.length,
            lines: totalLines,
            functions: totalFunctions,
            classes: totalClasses,
            complexity: averageComplexity,
            maintainabilityIndex,
            testCoverage: 85, // Would come from test runner
            dependencies: {
                internal: 50, // Would be calculated from imports
                external: 25, // Would be calculated from package.json
                circular: [] // Would be detected by dependency analysis
            }
        };
    }
    calculateCompliance(violations, metrics) {
        let score = 100;
        // Deduct points for violations
        const errorViolations = violations.filter(v => v.severity === 'error').length;
        const warningViolations = violations.filter(v => v.severity === 'warning').length;
        score -= errorViolations * 5;
        score -= warningViolations * 2;
        // Deduct points for poor metrics
        if (metrics.complexity > 10)
            score -= 10;
        if (metrics.maintainabilityIndex < 70)
            score -= 15;
        if (metrics.testCoverage < 80)
            score -= 20;
        score = Math.max(0, score);
        let grade;
        if (score >= 90)
            grade = 'A';
        else if (score >= 80)
            grade = 'B';
        else if (score >= 70)
            grade = 'C';
        else if (score >= 60)
            grade = 'D';
        else
            grade = 'F';
        const recommendations = this.generateRecommendations({ violations, metrics });
        return { score, grade, recommendations };
    }
    async getComplianceTrends() {
        // In a real implementation, this would load historical data
        // For now, return simulated trend data
        const trends = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            trends.push({
                date: date.toISOString().split('T')[0],
                score: 85 + Math.random() * 10,
                violations: Math.floor(Math.random() * 20)
            });
        }
        return trends;
    }
    async attemptFix(violation) {
        // Only attempt to fix simple naming violations for demonstration
        if (violation.ruleId === 'naming_function_convention' && violation.suggestion) {
            try {
                const content = await fs.readFile(violation.file, 'utf-8');
                const lines = content.split('\n');
                if (violation.line && violation.line <= lines.length) {
                    // This is a simplified fix - in reality, you'd need more sophisticated parsing
                    const oldName = violation.message.match(/'([^']+)'/)[1];
                    const newName = violation.suggestion.match(/'([^']+)'/)[1];
                    lines[violation.line - 1] = lines[violation.line - 1].replace(oldName, newName);
                    await fs.writeFile(violation.file, lines.join('\n'));
                    return true;
                }
            }
            catch (error) {
                logger_1.logger.warn(`Failed to fix violation in ${violation.file}`, { error });
            }
        }
        return false;
    }
}
exports.default = CodeOrganizationManager;
//# sourceMappingURL=code-organization.js.map