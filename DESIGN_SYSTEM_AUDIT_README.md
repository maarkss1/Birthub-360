# Birth Hub 360° — Design System Audit Tool

## Overview

A comprehensive automated tool for discovering, documenting, and analyzing the visual design system of Birth Hub 360°. This tool performs reverse engineering of the codebase to create a complete visual inventory without modifying the original project.

## What It Does

The audit tool automatically:

1. **Scans Project Structure** - Identifies configuration files, source directories, and project setup
2. **Extracts Design Tokens** - Parses CSS custom properties from `globals.css` (colors, typography, spacing, shadows, etc.)
3. **Inventories Fonts** - Detects all font families, weights, and their origins (self-hosted vs Google Fonts)
4. **Discovers Components** - Uses regex-based analysis to find all React components in the codebase
5. **Classifies Components** - Automatically categorizes components into: buttons, cards, icons, forms, navigation, tables, modals, etc.
6. **Generates Documentation** - Creates both human-readable Markdown and machine-readable JSON inventories

## Usage

### Basic Usage

```bash
npm run audit:design-system
```

### Advanced Options

```bash
node scripts/design-system-audit.js [options]
```

**Available Options:**
- `--viewport=1440x900` - Set viewport size for screenshots (future feature)
- `--output=prints-design-system` - Set output directory name
- `--category=buttons` - Audit specific category only
- `--component=Button` - Audit specific component only
- `--debug` - Keep temporary files for debugging
- `--no-cleanup` - Don't remove temporary files after completion
- `--help` - Show help message

## Output Structure

The tool generates the following structure:

```
prints-design-system/
├── design-system.md          # Human-readable documentation
├── design-system.json        # Machine-readable inventory
├── button/                  # Button component screenshots (future)
├── card/                    # Card component screenshots (future)
├── icon/                    # Icon component screenshots (future)
├── form/                    # Form component screenshots (future)
├── navigation/              # Navigation component screenshots (future)
├── table/                   # Table component screenshots (future)
├── modal/                   # Modal component screenshots (future)
├── layout/                  # Layout component screenshots (future)
├── badge/                   # Badge component screenshots (future)
├── input/                   # Input component screenshots (future)
└── other/                   # Other component screenshots (future)
```

## Current Results

Based on the latest audit run:

- **Total Components:** 457
- **Design Tokens:** 210
  - Colors: 154
  - Typography: 4
  - Shadows: 13
  - Radius: 3
- **Font Families:** 13
  - Self-hosted: Cabin, IBM Plex Mono, Sora, Inter, Bodoni Moda
  - Google Fonts: Playfair Display

## Component Categories

The tool automatically classifies components into:

- **button** - Button components and variants
- **card** - Card, metric, KPI, and dashboard cards
- **icon** - Icon components and brand icons
- **badge** - Badge and status indicators
- **input** - Input fields and text areas
- **form** - Form components (select, checkbox, etc.)
- **navigation** - Navigation, sidebar, header components
- **table** - Table and data grid components
- **modal** - Modal, dialog, and drawer components
- **layout** - Layout containers and wrappers
- **other** - Components that don't fit other categories

## Design Tokens Detected

The tool extracts CSS custom properties from `src/styles/globals.css`:

### Color Tokens
- Background colors: `--bg`, `--surface`, `--surface-2`, etc.
- Brand colors: `--brand`, `--brand-2`, `--gold`, etc.
- Semantic colors: `--ok`, `--warn`, `--critical`, `--info`, etc.
- Navigation colors: `--nav-c-gold`, `--nav-c-iris`, etc.
- Accent colors: `--accent-violet`, `--accent-cyan`, `--pulse`, etc.

### Typography Tokens
- Font families: `--font-brand-sans`, `--font-brand-display`, `--font-brand-serif`
- Font weights and styles for IBM Plex Mono, Cabin, Sora, Inter, Bodoni Moda

### Shadow Tokens
- Card shadows: `--shadow-card-value`, `--shadow-card-hover-value`
- Glow effects: `--shadow-glow-pulse-value`, `--shadow-neon-cyan`, etc.
- Animation effects: `--animate-pulse-glow`

### Radius Tokens
- Card radius: `--radius-card`, `--radius-card-lg`
- Control radius: `--radius-control`

## Dependencies

The tool requires:

- **Node.js** >= 20.0.0
- **glob** - For file pattern matching (already in project)
- **puppeteer** - For screenshot capture (installed but not currently used)

## Limitations

### Current Limitations

1. **Screenshot Capture** - Browser automation (Puppeteer) is implemented but currently disabled due to:
   - Complex setup requirements for Windows environment
   - Need for proper Vite server configuration
   - Component dependencies and mocking complexity

2. **Component Props Analysis** - The tool uses regex-based discovery instead of full TypeScript AST analysis to avoid memory issues with large projects. This means:
   - Props are not extracted from component interfaces
   - Mock generation is simplified
   - Some edge cases in component detection may occur

3. **Component Dependencies** - Components that require:
   - Context providers
   - React Router
   - External APIs
   - Complex state management
   May not render correctly in isolation

### Future Enhancements

1. **Enhanced Screenshot Capture** - Implement proper browser automation with:
   - Component isolation wrappers
   - Mock providers for contexts
   - Dependency injection for external services
   - Error boundary handling

2. **Improved Component Analysis** - Add:
   - TypeScript interface parsing for props
   - Mock generation based on prop types
   - Component variant detection
   - State enumeration

3. **Visual Regression Testing** - Add:
   - Baseline screenshot comparison
   - Visual diff reporting
   - Automatic regression detection

## Documentation Output

### design-system.md

The Markdown documentation includes:
- Executive summary with statistics
- Project stack information
- Complete design token inventory
- Font family inventory
- Component catalog by category
- Component → source file mapping
- Render error reporting

### design-system.json

The JSON inventory includes:
- Project metadata
- Stack information
- Complete token definitions
- Font inventory
- Component inventory with metadata
- Screenshot references
- Error reporting
- Statistics

## Integration with CI/CD

The tool can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Design System Audit
  run: npm run audit:design-system

- name: Upload Documentation
  uses: actions/upload-artifact@v3
  with:
    name: design-system-audit
    path: prints-design-system/
```

## Troubleshooting

### Memory Issues

If you encounter memory issues during component discovery:
- The tool already uses regex-based discovery to minimize memory usage
- Ensure Node.js has sufficient heap space: `NODE_OPTIONS="--max-old-space-size=4096"`

### Temporary Files

Use `--debug` or `--no-cleanup` flags to preserve temporary files for debugging:
```bash
node scripts/design-system-audit.js --debug --no-cleanup
```

Temporary files are created in `.tmp/design-system-audit/`

### Port Conflicts

If Vite port 5173 is in use, the tool will automatically try the next available port.

## Technical Implementation

The tool is implemented as a single Node.js script (`scripts/design-system-audit.js`) with the following architecture:

1. **Project Discovery** - Scans for config files and directory structure
2. **Token Extraction** - Regex-based CSS custom property parsing
3. **Font Detection** - Parses `@font-face` and Google Fonts imports
4. **Component Discovery** - Regex-based component export detection
5. **Classification** - Heuristic-based component categorization
6. **Documentation Generation** - Markdown and JSON output generation

## Contribution Guidelines

When modifying the audit tool:

1. Test with `--debug --no-cleanup` flags
2. Verify output structure consistency
3. Update this README for new features
4. Ensure cross-platform compatibility (Windows/Linux/macOS)
5. Test with the actual Birth Hub 360° codebase

## License

This tool is part of the Birth Hub 360° project and follows the same license terms.

---

**Generated:** 2026-09-26  
**Version:** 1.0.0  
**Status:** Production Ready (Core Features)
