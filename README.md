# Switch Homebrew Assistant

**Educational companion to switch.hacks.guide for Nintendo Switch homebrew installation**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ⚠️ DISCLAIMER

**This tool is an educational companion to [switch.hacks.guide](https://switch.hacks.guide/). The authors are not responsible for bricked devices. All homebrew software is property of its respective authors. This tool does not circumvent copy protection or facilitate software piracy.**

## Philosophy

- **Education over automation** – Every automated action includes explanatory text
- **Transparency** – All downloads display checksums and sources
- **No black boxes** – Manual option for every step with direct links to official sources

## Features

### ✅ Pre-Flight Guide Acknowledgment
First-launch modal requiring explicit acknowledgment of risks and guide reading

### ✅ Console Compatibility Check
Offline serial number lookup (no external API) to determine hackability

### ✅ Dual Download Workflows
- **Bulk Download**: Automated fetching from official GitHub releases with progress bars and SHA-256 checksums
- **Manual Download**: Expanded cards with descriptions, source URLs, checksums, and SD card paths

### ✅ SD Card Preparation Helper
- Drive detection with size warnings
- Drag-and-drop file copying with automatic path validation
- Filesystem tree visualization

### ✅ Post-Installation Guidance
Links to essential next steps (emuMMC, NAND backup, 90DNS/Exosphere)

### ✅ Logging & Transparency
- All network requests and file operations logged
- Exportable logs for troubleshooting

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Windows, macOS, or Linux

### Build from Source

```bash
# Clone repository
git clone https://github.com/KeiraOMG0/switch-homebrew-assistant.git
cd switch-homebrew-assistant

# Install dependencies
npm install

# Run the application
npm start

# Build distributable (optional)
npm run dist
```

### Platform-Specific Notes

## Usage Guide

1. **Read the official guide** – The app requires acknowledgment before enabling features
2. **Check your console** – Enter serial number to determine exploit path
3. **Download components** – Use bulk or manual mode
4. **Prepare SD card** – Format FAT32, copy files to correct paths
5. **Follow post-installation** – Set up emuMMC and telemetry blocking

## Anti-Features (Conspicuously Absent)

- ❌ No "one-click hack" button
- ❌ No bundled Nintendo copyrighted material
- ❌ No automated sigpatches installation without explicit warning
- ❌ No "anti-ban" guarantees
- ❌ No software exploits for patched/Mariko units (redirects to modchip professionals)

## Troubleshooting

**Download Failures**
- GitHub API rate limits: Wait or use manual mode
- Verify network connectivity

**SD Card Copy Errors**
- Ensure card is FAT32 formatted
- Check write protection switch

## Contributing

Contributions focused on educational improvements, transparency enhancements, and bug fixes are welcome. **No features that reduce user understanding or automate without explanation will be accepted.**

## License

MIT License – See [LICENSE](LICENSE) file

## Acknowledgments

- [switch.hacks.guide](https://switch.hacks.guide/) – The definitive guide
- Atmosphere-NX, CTCaer, switchbrew – Homebrew ecosystem
- All open-source contributors

---

**Remember: Understanding the process is more important than the result. Read the guide first.**
```
This complete application provides a fully functional Electron-based assistant that respects the educational philosophy, with all required features including serial-based compatibility checking, dual download workflows, SD card preparation, and comprehensive logging. The interface is dark-themed, responsive, and includes all safety warnings and manual bypass options as specified.
```