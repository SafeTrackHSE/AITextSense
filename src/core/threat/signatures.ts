import type { RiskSeverity } from '../shared/severity';
import type { ThreatExplanation, ThreatSignatureCategory } from './types';

export interface ThreatSignature {
  id: string;
  category: ThreatSignatureCategory;
  name: string;
  pattern: RegExp;
  severity: RiskSeverity;
  explanation: ThreatExplanation;
}

/**
 * Categorized static rules. Runs unconditionally on every extracted span AND
 * on the full text as a fallback pass — no precondition on anything else
 * having been found first (that gate was the actual bug this whole module
 * exists to fix, see plan §1.1/§5.1).
 *
 * Each rule carries a full, hand-authored ThreatExplanation — not a one-line
 * description — so a static match is exactly as informative as an LLM
 * capability review, and works fully offline.
 */
export const THREAT_SIGNATURES: ThreatSignature[] = [
  // --- Destructive filesystem operations ---------------------------------
  {
    id: 'THR-FS-RECURSIVE-DELETE',
    category: 'destructive-filesystem',
    name: 'Recursive Force-Delete',
    pattern: /\brm\s+-[a-z]*r[a-z]*f[a-z]*\s+\S|\brm\s+-[a-z]*f[a-z]*r[a-z]*\s+\S|del\s+\/f\s+\/s\s+\/q|Remove-Item\s+.*-Recurse\s+.*-Force|Remove-Item\s+.*-Force\s+.*-Recurse/i,
    severity: 'CRITICAL',
    explanation: {
      category: 'Destructive filesystem operation',
      mechanism: 'Recursively deletes every file and subdirectory under the given path, without a confirmation prompt and ignoring read-only/write-protection flags on each file.',
      targets: ['filesystem'],
      consequence: 'If run with sufficient privileges, this permanently destroys the targeted files and folders with no recovery path outside of backups — there is no undo, and no trash/recycle bin involved.',
      mitigation: 'Never run this against a real path without first confirming the exact target directory in a sandboxed or disposable environment. If found inside AI-generated instructions, do not execute it — verify what path it actually targets first.',
      relatedGlossaryTerms: ['destructive-command'],
      source: 'static-signature',
      confidence: 'high',
    },
  },
  {
    id: 'THR-FS-DISK-WIPE',
    category: 'destructive-filesystem',
    name: 'Disk Format / Raw Wipe',
    pattern: /\bformat\s+[a-z]:|mkfs(?:\.\w+)?\s+\/dev\/|dd\s+if=\/dev\/(?:zero|urandom)\s+of=\/dev\/[a-z]/i,
    severity: 'CRITICAL',
    explanation: {
      category: 'Destructive filesystem operation',
      mechanism: 'Reformats a disk partition or overwrites raw disk blocks directly, destroying the filesystem structure and all data on the target device at a lower level than a normal file delete.',
      targets: ['filesystem', 'disk'],
      consequence: 'Complete, typically unrecoverable data loss on the targeted drive or partition — this operates below the file level, so even file-recovery tools generally cannot reverse it.',
      mitigation: 'Treat as maximum-severity. Confirm the exact device/partition path before ever running anything like this, and never on a system with data you have not explicitly backed up.',
      relatedGlossaryTerms: ['destructive-command'],
      source: 'static-signature',
      confidence: 'high',
    },
  },

  // --- Network / C2 patterns ----------------------------------------------
  {
    id: 'THR-NET-PIPE-EXEC',
    category: 'network-c2',
    name: 'Download-and-Execute Pipe',
    pattern: /\b(?:curl|wget)\b[^|\n]*\|\s*(?:sudo\s+)?(?:bash|sh|zsh)\b|\biwr\b[^|\n]*\|\s*iex\b/i,
    severity: 'CRITICAL',
    explanation: {
      category: 'Network / command-and-control pattern',
      mechanism: 'Downloads a script from a remote URL and immediately pipes it directly into a shell interpreter for execution, without ever saving it to disk or letting anyone inspect its contents first.',
      targets: ['network', 'process'],
      consequence: 'Whatever the remote server returns at the moment this command runs gets executed with the current user\'s full privileges — the content can differ every time (including specifically when it detects it\'s being reviewed), so inspecting the URL in a browser beforehand offers no real guarantee of safety.',
      context: 'This exact one-liner shape ("curl ... | bash") is extremely common in "quick setup" or "run this to fix your issue" social-engineering framing — the urgency of a one-line fix is what discourages the reader from downloading and reading the script first.',
      mitigation: 'Never pipe a remote download directly into a shell. Download it, read it, then decide whether to run it.',
      relatedGlossaryTerms: ['pipe-to-shell', 'c2'],
      source: 'static-signature',
      confidence: 'high',
    },
  },
  {
    id: 'THR-NET-REVERSE-SHELL',
    category: 'network-c2',
    name: 'Reverse Shell One-Liner',
    pattern: /\/dev\/tcp\/[\w.-]+\/\d+|\bnc\s+(?:-\w+\s+)*-e\s+\/bin\/(?:ba)?sh|bash\s+-i\s+>&\s*\/dev\/tcp\//i,
    severity: 'CRITICAL',
    explanation: {
      category: 'Network / command-and-control pattern',
      mechanism: 'Opens an outbound network connection back to a specified host and port, then attaches an interactive shell to that connection — giving whoever is listening on the other end direct, live command execution on this machine.',
      targets: ['network', 'process'],
      consequence: 'If executed, this hands a remote party a live, interactive shell on the machine it runs on — equivalent to giving them a terminal session with the current user\'s permissions.',
      context: 'This is the textbook mechanism behind a Remote Access Trojan (RAT): the "call home" step that turns a one-time compromise into standing remote control.',
      mitigation: 'Never run. If this appears inside AI-generated output, the response itself is attempting to establish remote control over the machine executing it.',
      relatedGlossaryTerms: ['reverse-shell', 'rat', 'c2'],
      source: 'static-signature',
      confidence: 'high',
    },
  },
  {
    id: 'THR-NET-ENCODED-EXFIL-POST',
    category: 'network-c2',
    name: 'Encoded Outbound Data Transmission',
    pattern: /fetch\(['"`]https?:\/\/[^)]*\).*(?:method:\s*['"`]POST['"`]|body:)|curl\s+(?:-X\s*POST\s+)?[^\n]*-d\s+['"`][^'"\n]{20,}/i,
    severity: 'HIGH',
    explanation: {
      category: 'Network / command-and-control pattern',
      mechanism: 'Sends an HTTP POST request carrying a data payload to an external host — the mechanism used to move data out of a system, not to read data in.',
      targets: ['network'],
      consequence: 'Any data included in the request body (often collected in an earlier step and passed to this one) leaves the machine and reaches a server the operator of that URL controls.',
      context: 'On its own this is just an HTTP request — it becomes dangerous specifically in combination with a preceding step that reads sensitive data (see Credential Harvesting below). Check whether this pattern co-occurs with one.',
      mitigation: 'Verify what data is actually in the request body and where the destination host is before allowing this to run.',
      relatedGlossaryTerms: ['exfiltration', 'c2'],
      source: 'static-signature',
      confidence: 'high',
    },
  },
  {
    id: 'THR-NET-POWERSHELL-CRADLE',
    category: 'network-c2',
    name: 'PowerShell Download Cradle',
    pattern: /\b(?:IEX|Invoke-Expression|Invoke-WebRequest|DownloadString|Net\.WebClient|Start-BitsTransfer)\b/i,
    severity: 'CRITICAL',
    explanation: {
      category: 'Network / command-and-control pattern',
      mechanism: 'Initializes a .NET WebClient or PowerShell web request to remotely fetch and execute in-memory shellcode or scripts without touching disk.',
      targets: ['network', 'memory', 'process'],
      consequence: 'Downloads and immediately executes arbitrary remote code in the current PowerShell process context, evading on-disk file scanners.',
      context: 'Classic fileless malware delivery technique used in malicious office documents and dropper chains.',
      mitigation: 'Block outbound network connections from PowerShell and enforce PowerShell Constrained Language Mode and Script Block Logging.',
      relatedGlossaryTerms: ['c2', 'pipe-to-shell'],
      source: 'static-signature',
      confidence: 'high',
    },
  },

  // --- Credential / secret harvesting --------------------------------------
  {
    id: 'THR-CRED-SSH-CLOUD-KEYS',
    category: 'credential-harvesting',
    name: 'SSH / Cloud Credential File Access',
    pattern: /~?\/\.ssh\/id_(?:rsa|ed25519|ecdsa)|~?\/\.aws\/credentials|~?\/\.config\/gcloud\/|%USERPROFILE%\\\.ssh\\/i,
    severity: 'HIGH',
    explanation: {
      category: 'Credential / secret harvesting',
      mechanism: 'Reads a private SSH key or cloud provider credentials file from its standard, well-known location on disk.',
      targets: ['credentials', 'filesystem'],
      consequence: 'On its own, reading these files just loads their contents into memory — the real danger is what happens next: if the content is then sent somewhere (see the Network / C2 patterns above), whoever receives it can impersonate the account owner on every system or service those credentials grant access to.',
      context: 'This pattern is almost always meaningful only in combination with a network-send step — a read with nowhere for the data to go is comparatively low-risk. If a finding like this appears alongside a network-transmission finding in the same text, treat the combination as materially more severe than either alone.',
      mitigation: 'Never let untrusted instructions read these files. Rotate any credentials that may have been exposed if this pattern was actually executed.',
      relatedGlossaryTerms: ['credential-harvesting', 'exfiltration'],
      source: 'static-signature',
      confidence: 'high',
    },
  },
  {
    id: 'THR-CRED-BROWSER-STORE',
    category: 'credential-harvesting',
    name: 'Browser Credential / Cookie Store Access',
    pattern: /Login Data.*Chrome|Cookies\.sqlite|leveldb.*Local Storage|chrome:\/\/settings\/passwords|document\.cookie/i,
    severity: 'HIGH',
    explanation: {
      category: 'Credential / secret harvesting',
      mechanism: 'Reads directly from a browser\'s stored password/cookie database, or from the current page\'s cookie jar via script.',
      targets: ['credentials', 'filesystem'],
      consequence: 'Browser password stores contain saved logins for every site the user has told the browser to remember; session cookies can be used to impersonate an already-logged-in user without needing their password at all.',
      mitigation: 'Never allow untrusted code to read browser profile data or `document.cookie`. If found in a context where it could actually execute, treat it as an active credential-theft attempt.',
      relatedGlossaryTerms: ['credential-harvesting'],
      source: 'static-signature',
      confidence: 'high',
    },
  },
  {
    id: 'THR-CRED-ENV-DUMP',
    category: 'credential-harvesting',
    name: 'Environment Variable Dump',
    pattern: /\bprintenv\b|\benv\s*\|\s*(?:curl|nc|wget)|process\.env\s*(?:\)|\})[^;]*fetch|os\.environ(?:\.copy\(\))?\s*.*requests\.post/i,
    severity: 'MEDIUM',
    explanation: {
      category: 'Credential / secret harvesting',
      mechanism: 'Prints or collects the process\'s full set of environment variables, which very commonly contain API keys, database passwords, and other secrets configured via `.env` files or CI/CD pipeline settings.',
      targets: ['credentials'],
      consequence: 'Environment variables are one of the most common places developers accidentally store real secrets — a dump of them, if sent anywhere, can hand over API keys and service credentials wholesale.',
      mitigation: 'Never pipe environment variables to a network command. Audit and rotate any secrets that were exposed if this pattern was actually executed with a network step attached.',
      relatedGlossaryTerms: ['credential-harvesting', 'exfiltration'],
      source: 'static-signature',
      confidence: 'medium',
    },
  },

  // --- Process / persistence -----------------------------------------------
  {
    id: 'THR-PROC-DYNAMIC-EXEC',
    category: 'process-persistence',
    name: 'Dynamic Shell/Process Spawn from Code',
    pattern: /child_process\.exec(?:Sync)?\s*\(|os\.system\s*\(|subprocess\.(?:run|call|Popen)\s*\(.*shell\s*=\s*True|Runtime\.getRuntime\(\)\.exec\(/i,
    severity: 'HIGH',
    explanation: {
      category: 'Process spawning / persistence',
      mechanism: 'Spawns an arbitrary OS-level shell command directly from application code, running whatever string is passed in with the same privileges as the host process.',
      targets: ['process'],
      consequence: 'If the string being executed is built from untrusted input (user text, an AI response, a network response), this is a direct arbitrary-command-execution path — the "shell" flag/function is doing exactly what a reverse shell or download-and-execute pattern needs to actually run.',
      mitigation: 'Never construct a shell command string from untrusted input. If this is legitimate application code, ensure the executed string is a fixed, developer-controlled command, never user- or model-supplied text.',
      relatedGlossaryTerms: ['destructive-command'],
      source: 'static-signature',
      confidence: 'medium',
    },
  },
  {
    id: 'THR-PROC-PERSISTENCE',
    category: 'process-persistence',
    name: 'Scheduled Task / Registry Run-Key Persistence',
    pattern: /schtasks\s+\/create|crontab\s+-e|reg\s+add\s+.*\\CurrentVersion\\Run|New-ItemProperty\s+.*\\Run\b|launchctl\s+load/i,
    severity: 'HIGH',
    explanation: {
      category: 'Process spawning / persistence',
      mechanism: 'Registers a program to run automatically — on every login, on a schedule, or on boot — using the operating system\'s built-in scheduling or startup mechanisms, rather than the user knowingly launching it each time.',
      targets: ['persistence', 'process'],
      consequence: 'Once installed, whatever this points at keeps running (or re-running) without the user taking any further action, and typically survives a reboot — this is the mechanism that turns a one-time compromise into a standing presence on the machine.',
      mitigation: 'Verify exactly what program is being scheduled and why before allowing this to run. Review the corresponding Task Scheduler / crontab / Registry Run key / launch agent afterward if there is any doubt it was already executed.',
      relatedGlossaryTerms: ['persistence'],
      source: 'static-signature',
      confidence: 'high',
    },
  },
  {
    id: 'THR-PROC-POWERSHELL-EXEC',
    category: 'process-persistence',
    name: 'Stealth PowerShell Process Execution',
    pattern: /\b(?:Start-Process|New-Object|FromBase64String)\b|-(?:WindowStyle\s+Hidden|NonInteractive|ExecutionPolicy\s+Bypass)/i,
    severity: 'HIGH',
    explanation: {
      category: 'Process execution / stealth evasion',
      mechanism: 'Launches a hidden PowerShell background process with execution policy bypasses and suppressed interactive prompts to run covert commands.',
      targets: ['process', 'registry', 'memory'],
      consequence: 'Enables background execution of unauthorized scripts while blinding the local user to the terminal activity.',
      context: 'Common evasion tactic used by post-exploitation frameworks to survive initial execution without alerting desktop operators.',
      mitigation: 'Audit process creation events (Event ID 4688) with command-line arguments and block execution policy bypass switches via Group Policy.',
      relatedGlossaryTerms: ['obfuscation', 'persistence'],
      source: 'static-signature',
      confidence: 'high',
    },
  },

  // --- Obfuscation idioms ---------------------------------------------------
  {
    id: 'THR-OBF-CHARCODE-RECONSTRUCT',
    category: 'obfuscation-idiom',
    name: 'Character-Code Array Reconstruction',
    pattern: /String\.fromCharCode\((?:\s*\d+\s*,){4,}\s*\d+\s*\)|chr\((?:\d+\)\s*\+\s*chr\(){4,}/i,
    severity: 'MEDIUM',
    explanation: {
      category: 'Obfuscation idiom',
      mechanism: 'Builds a string one character at a time from numeric character codes, rather than writing the string literally — a technique that makes the resulting text unreadable to a human scanning the source, while producing the exact same runtime value.',
      targets: ['obfuscation'],
      consequence: 'The presence of this technique doesn\'t itself do anything harmful — it\'s a delivery mechanism. The real question is what string it reconstructs; that reconstructed string is what needs review, and its presence at all is a signal that whoever wrote this wanted to prevent easy visual inspection.',
      mitigation: 'Decode the character-code sequence to see the actual string before deciding whether the surrounding code is safe. Deliberate obfuscation of otherwise-simple code is itself worth treating with suspicion.',
      relatedGlossaryTerms: ['obfuscation'],
      source: 'static-signature',
      confidence: 'medium',
    },
  },
  {
    id: 'THR-OBF-POWERSHELL-ENCODED',
    category: 'obfuscation-idiom',
    name: 'PowerShell Encoded Command',
    pattern: /-e(?:nc(?:odedcommand)?)?\s+[A-Za-z0-9+/=]{40,}/i,
    severity: 'HIGH',
    explanation: {
      category: 'Obfuscation idiom',
      mechanism: 'Passes a Base64-encoded, UTF-16LE PowerShell command via the `-EncodedCommand` flag, which PowerShell decodes and executes automatically — a well-known technique specifically because it evades simple text-based scanning of the visible command line.',
      targets: ['obfuscation', 'process'],
      consequence: 'Whatever command is encoded runs with full PowerShell capability the moment this executes; the encoding exists specifically to prevent a human or a simple scanner from reading what it does at a glance.',
      mitigation: 'Decode the Base64 payload (UTF-16LE) before evaluating what the command actually does. Treat the use of this flag itself, independent of payload content, as a red flag in most legitimate contexts.',
      relatedGlossaryTerms: ['obfuscation'],
      source: 'static-signature',
      confidence: 'high',
    },
  },

  // --- Markdown / URL exfil (migrated from injection, per plan §5.2) -------
  {
    id: 'THR-MD-URL-EXFIL',
    category: 'markdown-url-exfil',
    name: 'Markdown Image/Link Exfiltration Beacon',
    pattern: /!\[[^\]]*\]\(https?:\/\/[^)]+\?[^)]*(?:token|key|secret|data|session|cookie)=/i,
    severity: 'HIGH',
    explanation: {
      category: 'Markdown / URL exfiltration',
      mechanism: 'Embeds a Markdown image (or link) whose target URL carries a query-string parameter that looks like a secret, token, or session identifier. When the image is rendered — often automatically, with no click required — the request itself, including the query string, is sent to that URL\'s server.',
      targets: ['network', 'credentials'],
      consequence: 'Simply rendering the text (which many chat/markdown viewers do automatically) transmits whatever value was embedded in the URL to a third-party server, with no further user action needed — this is exfiltration disguised as ordinary formatting.',
      context: 'This is a known technique for exfiltrating data through AI assistants specifically: if a model is tricked into embedding a secret it has access to inside a Markdown image URL, the act of the response simply being displayed leaks it.',
      mitigation: 'Never allow auto-rendering of image/link targets that weren\'t explicitly provided by the user, and strip query parameters that look like tokens or secrets before rendering.',
      relatedGlossaryTerms: ['exfiltration'],
      source: 'static-signature',
      confidence: 'high',
    },
  },
];

/** Lightweight match used by decode.ts's stop-early check — pattern only, no span/offset construction. */
export function matchSignaturePatterns(text: string): ThreatSignature[] {
  return THREAT_SIGNATURES.filter(sig => sig.pattern.test(text));
}
