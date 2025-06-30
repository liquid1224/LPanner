# LPanner VST3 Plugin

**Version:** 1.1.2b 
**Developer:** liquid1224

![screenshot](/Readme.assets/screenshot.png)

## Overview

LPanner is a stereo imaging and rotation plugin built with JUCE framework. This plugin provides stereo field manipulation capabilities with both classic and modern algorithms, allowing you to control the width, positioning, and spatial characteristics of your audio.

## Features

### Stereo Image Control

- **Classic Mode**: Traditional stereo width control using mid/side processing
- **Modern Mode**: Advanced algorithm with delay-based stereo enhancement
- **Stereo Width**: Adjustable from 0% to 200% (100% = original width)
- **Delay Time**: Configurable delay (1-20ms) for Modern mode processing

### Spatial Processing

- **Rotation**: Rotate the stereo field from -50° to +50°

### Others

- **Bypass**: Complete plugin bypass for A/B comparison

### User Interface

- Web-based interface built with React and Ant Design
- Intuitive controls
- Real-time parameter adjustment

## Installation

### Windows

1. Download the plugin from the releases page

2. Copy 

   ```
   LPanner.vst3
   ```

    to your VST3 plugins directory:

   ```
   C:/Program Files/Common Files/VST3/
   ```

3. Restart your DAW and the plugin will appear in the FX list

### System Requirements

- Windows 10/11 (64-bit)
- VST3 compatible DAW
- WebView2 runtime (usually pre-installed on modern Windows)

## Usage

### Basic Operation

1. Load LPanner on an audio track
2. Choose between **Classic** or **Modern** stereo processing mode
   - Classic is for stereo tracks (No effect on mono track)
   - Modern is usable for both stereo and mono tracks
     - If Modern, you can adjust delay time to fine tune
3. Adjust the **Stereo** slider to control width (100% = original)
4. Use **Rotation** to pan the stereo field left or right
   - Recommend to narrow down stereo image before rotating

### Parameters

- **Stereo Image Mode**: Toggle between Classic and Modern algorithms
- **Stereo Width**: 0-200% (0% = mono, 100% = original, 200% = extra wide)
- **Delay Time**: 1-20ms (Modern mode only) - controls the delay offset for enhanced stereo effect
- **Rotation**: -50° to +50° - rotates the stereo field
- **Bypass**: On/Off - bypasses all processing

### Tips

- Start with Classic mode for traditional stereo widening
- Use Modern mode for more complex spatial effects
- Subtle rotation adjustments (±10°) often work best
- Monitor in mono to check phase relationships
- Use bypass frequently to compare processed vs. original audio

## Technical Details

- **Sample Rate Support**: Up to 192kHz
- **Bit Depth**: 32-bit float and 64-bit double precision
- **Latency**: Minimal (delay buffer based on delay time setting)
- **CPU Usage**: Very low

## Building from Source

This plugin is built using the JUCE framework with a React-based web interface. The build process requires:

- JUCE 8.x
- Visual Studio 2022 (Windows)
- Node.js and npm (for web interface)

## License

MIT

## Support

Create new issue for support, bug reports, or feature requests.

## Changelog

### 1.1.2b

- Fixed some layouts

### 1.1.2

- Number display of delay knob can now accept numerical input

- Support input parameters up to one decimal place
  - Displayed value may be rounded to whole numbers
- Added some transition animations to sliders and knobs

- Replaced some hard coded values with variables

### 1.1.1

- Refactored front-end components
  - Improved readability
  - Reduced and optimized some processes
  - Deleted some CSS files
- Improved visualization of rotation slider

### 1.1.0

- Refactored `PluginProcessor.h` and `PluginProcessor.css`
  - Improved readability
  - Theoretically faster processing

### 1.0.1

- Added "Bypass" button
- Refactor `App.tsx`
- Adjusted hover lock duration (0.3s -> 0.5s)

### 1.0.0

- Initial release

------

*LPanner by liquid1224(華力発電所 FLOPP)*