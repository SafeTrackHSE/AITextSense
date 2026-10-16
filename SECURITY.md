# Security Policy

## Supported Versions

AI TextSense commits to proactive vulnerability management and security maintenance for the following release branches:

| Version | Supported          |
| ------- | ------------------ |
| 3.0.x   | :white_check_mark: |
| 2.x.x   | :x:                |
| < 2.0   | :x:                |

## Reporting a Vulnerability

The AI TextSense team takes the security of our application, our users, and untrusted document pipelines seriously.

If you believe you have found a security vulnerability in AI TextSense (including bypasses for injection detection, steganography parsers, or local code execution vectors):

1. **Do not disclose the issue publicly** on GitHub Issues, pull requests, or social media.
2. Please report the issue via GitHub's [Private Vulnerability Reporting](https://github.com/SafeTrackHSE/AITextSense/security/advisories/new) or directly contact the maintainers with:
   - A detailed description of the vulnerability.
   - Exact steps or minimal proof-of-concept (PoC) payload to reproduce the behavior.
   - The potential impact and attack vector severity.
   - Operating system and environment details (Desktop Tauri vs Web preview).

### Response Timeline

- **Initial Acknowledgment**: Within 48 hours of report receipt.
- **Vulnerability Assessment**: Within 5 business days, including triage and severity determination.
- **Fix & Advisory Release**: Coordinated disclosure within 30 days or sooner for critical findings.

## Security Principles & Architecture

- **Air-Gapped Privacy First**: AI TextSense is designed to run 100% offline. On-device models (`Transformers.js` / WebGPU / WASM) process text locally on your hardware. No text leaves your machine unless you explicitly configure an external cloud provider.
- **Local IPC Isolation**: The Tauri backend communicates over strict, serialized IPC channels with zero raw system shell access from untrusted webviews.
- **Zero Ingestion of Host Secrets**: The application never reads, persists, or transmits system credentials, environment variables, or private keys.

