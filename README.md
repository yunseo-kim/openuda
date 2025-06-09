# OpenUda

OpenUda: Yagi-Uda Antenna Design, Analysis, and Optimization Web App

[![OpenUda Tests](https://github.com/yunseo-kim/openuda/actions/workflows/test-and-deploy.yml/badge.svg)](https://github.com/yunseo-kim/openuda/actions/workflows/test-and-deploy.yml)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)

## Overview

OpenUda is a modern web application that enables users to design, analyze, and optimize Yagi-Uda antennas entirely in the browser. Built with React, TypeScript, and WebAssembly, it provides an intuitive interface and powerful simulation engine so that both hobbyists and engineers can easily tweak antenna parameters and immediately see performance results.

## 🚀 Features

- **Real-time 3D Visualization**: Interactive antenna design with Three.js
- **WebAssembly Performance**: NEC2C engine compiled to WASM for fast calculations
- **Progressive Web App**: Works offline and can be installed on any device
- **Multi-language Support**: Available in Korean and English
- **Modern UI**: Built with NextUI and Tailwind CSS for a beautiful, responsive interface
- **File Format Support**: Import/export YagiCAD (.yc6), NEC (.nec), and JSON formats

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **UI Components**: NextUI v2 + Tailwind CSS
- **3D Graphics**: Three.js + React Three Fiber
- **Charts**: Chart.js + Plotly.js
- **State Management**: Zustand
- **Internationalization**: i18next
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier + Husky

## 📦 Installation

### Prerequisites

- Node.js 18.0 or higher
- npm, yarn, or pnpm

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/yunseo-kim/openuda.git
cd openuda
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🧪 Testing

Run tests:

```bash
npm test
```

Run tests with UI:

```bash
npm run test:ui
```

Run tests with coverage:

```bash
npm run test:coverage
```

## 📝 Development

### Code Style

This project uses ESLint and Prettier for code formatting. Pre-commit hooks are set up with Husky to ensure code quality.

Format code:

```bash
npm run format
```

Lint code:

```bash
npm run lint
```

Type check:

```bash
npm run typecheck
```

### Commit Message Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification. For detailed guidelines, see:

- [📋 Quick Commit Checklist](.cursor/rules/commit-checklist.md) - Essential checks before committing
- [📝 Complete Commit Guidelines](.cursor/rules/commit-message-guidelines.md) - Comprehensive guide
- [🎯 OpenUda-Specific Conventions](.cursor/rules/openuda-commit-conventions.md) - Project-specific rules

**Quick Reference:**

```bash
feat(engine): add antenna optimization algorithm
fix(ui): resolve mobile layout issue
docs: update installation guide
test(core): add simulation accuracy tests
```

### Project Structure

```
openuda/
├── src/
│   ├── components/     # React components
│   │   ├── ui/        # Reusable UI components
│   │   ├── layout/    # Layout components
│   │   ├── antenna/   # Antenna-specific components
│   │   ├── charts/    # Chart components
│   │   └── tabs/      # Tab content components
│   ├── hooks/         # Custom React hooks
│   ├── stores/        # Zustand stores
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   ├── assets/        # Static assets
│   └── test/          # Test utilities
├── public/            # Public assets
├── emsdk/            # Emscripten SDK for WASM
└── src/nec2c/        # NEC2C source code
```

## 🌐 Deployment

The application is automatically deployed to GitHub Pages when changes are pushed to the main branch.

Live Demo: [https://yunseo-kim.github.io/openuda/](https://yunseo-kim.github.io/openuda/)

---

## User Interface and Experience

The OpenUda UI is organized with a top navigation bar that divides the app into four main tabs, each targeting a specific aspect of the design process:

- Main Tab (Design) – This is the start screen and primary design interface. Users can begin by selecting a preset Uda design or by importing an existing antenna file. The app supports industry-standard file formats like YagiCAD's .YC6 and NEC's .nec, as well as a custom JSON format for saving and loading designs. Users may also input antenna parameters (element lengths, spacing, diameter, etc.) manually. As parameters are adjusted, an interactive sketch of the antenna updates in real time, giving a visual indication of the geometry (reflector, driven element, directors) and relative dimensions. This immediate feedback makes the design process intuitive. Once a design is set up, the user can initiate an optimization routine to automatically fine-tune multiple parameters at once. Clicking the "Optimize" button runs a multivariable optimization algorithm to maximize desired performance (for example, peak gain or F/B ratio), and the optimized result is then reflected in the antenna model and ready for analysis.

- Line Chart Tab (Performance vs. Frequency) – This tab provides detailed plots of the antenna's performance over the target frequency range. Using Chart.js to render interactive graphs, OpenUda displays key parameters across the band in separate subplots. The default plots include Gain (in dBi), Front/Back Ratio (F/B in dB), Input Impedance (real and imaginary, Zi/Zr in Ω), Effective Gain (accounting for efficiency, in dBi), and VSWR. These metrics are computed around the user-defined center frequency and give insight into the antenna's bandwidth and tuning. For example, users can observe how gain or SWR changes if the operating frequency deviates from the design frequency. Such frequency sweep graphs are a standard output of antenna modeling software, and OpenUda generates them on the fly after each design change or optimization. The charts help identify the antenna's 2:1 VSWR bandwidth, optimal match frequency, and any trade-offs (e.g. a design might have very high gain at the center frequency but quickly degrading SWR off-center). Interactive tooltips and zooming make it easy to inspect exact values on these plots.

- Pattern Analysis Tab (Radiation Patterns) – In this tab, users can analyze the antenna's radiation pattern in both 2D and 3D. OpenUda computes the far-field radiation pattern of the Yagi-Uda design and visualizes it using two polar plots (for the principal planes) and a 3D model. The 2D plots show the antenna gain pattern in the vertical plane and horizontal plane, respectively (often called the E-plane and H-plane patterns). These polar charts illustrate the main lobe, side lobes, and back lobe of the antenna. The 3D pattern is rendered with Three.js (WebGL) to provide an interactive three-dimensional view of the antenna's radiation intensity. Users can rotate and zoom the 3D plot to examine the shape of the radiation lobes from any angle, which is useful for understanding the antenna's directivity. For example, a well-designed Uda should show a strong single main lobe in the forward direction and much smaller lobes elsewhere. The pattern visualization in OpenUda mirrors what one would expect from professional antenna tools – e.g. a 5-element Uda might show about 10–12 dBi forward gain with a narrow beam and a high front-to-back ratio, which would be evident in these plots. By providing both 2D and 3D views, the app helps users verify that the radiation pattern meets their requirements (such as beamwidth or sidelobe levels) before building the antenna.

- About OpenUda Tab (Documentation) – This section contains background information and resources for the user. It includes an overview of the project, explaining the theory behind Yagi-Uda antennas and the analysis algorithms used. Users can find a quick summary of how Yagi-Uda antennas work and definitions of terms like gain, VSWR, and front-to-back ratio. The About tab also provides information on the open-source license and credits for the OpenUda project. For those interested in the technical underpinnings, it might link to the NEC engine details or the math formulas (e.g. Uda element length formulas or approximation equations) used for initial quick calculations. Essentially, this tab ensures transparency and gives users learning resources to understand antenna design principles, making the app educational as well as functional.

The overall UI is designed for a smooth user experience, employing responsive design and clear visuals. Lengthy computations are indicated with progress spinners or status messages, so the user is always informed about what's happening. Thanks to the separation of concerns (with heavy calculations offloaded to workers), the interface remains responsive—users can navigate between tabs, adjust inputs, or read documentation even while a simulation or optimization is running in the background.

## Features and Implementation Details

### Input and File Support

OpenUda provides flexible options for starting an antenna design. Users can choose from built-in presets (e.g. common Uda designs for HF, VHF, UHF bands with different element counts) to jump-start their work. These presets load predefined element lengths and spacings for typical designs. Users can also load antenna files to continue working on existing designs. The app supports YagiCAD v6 (.yc6) files and NEC format (.nec) files directly, ensuring compatibility with other antenna modeling tools. (For example, a design created in YagiCAD or 4NEC2 can be imported into OpenUda for further analysis, and vice versa.) Additionally, OpenUda can import/export a JSON representation of the antenna. The JSON format is a human-readable schema that captures the antenna parameters and can be used for version control or sharing designs in a web-friendly way. Users can save their work at any time in any of these formats, enabling a smooth workflow between OpenUda and desktop applications or simply for backup.

Crucially, the app's input fields for design parameters are all interactive and linked to the simulation. Whenever the user edits a parameter (such as changing an element length or spacing), the change is immediately reflected: the on-screen antenna diagram updates and a new analysis can be run. OpenUda can perform a quick re-calculation in the background to update key outputs in real time as tweaks are made. This might be done by first using fast empirical formulas to give instant approximate feedback, then running a full simulation for accuracy (see next section). This responsive design loop encourages experimentation, as the user can "tune" the antenna in real time and see the effect on performance graphs without needing to restart the simulation from scratch each time.

Another major feature is the Optimization capability. Designing an Uda often involves balancing multiple variables (element lengths, spacing, etc.) to achieve an optimal result. OpenUda includes a built-in multivariable optimization engine that automates this process. When the user clicks the Optimize button, the app will algorithmically adjust the design parameters through many iterations to find a configuration that best meets a specified goal. For instance, the user could choose to maximize gain at the target frequency while keeping the impedance close to 50 Ω, or to maximize bandwidth (low VSWR across a range). The optimizer uses techniques such as gradient-based algorithms or genetic algorithms to navigate the design space. During optimization, the current trial's performance can be computed using the fast NEC engine in the background. Once completed, the optimal set of parameters is applied to the model and the improved performance is displayed. This feature saves users from tedious manual trial-and-error. It is similar to the optimizer modules found in traditional antenna software (for example, the 4NEC2 program provides an optimizer to tune for gain, SWR, etc.), bringing that power into the web app. Users can thus quickly obtain a high-performance design that meets their criteria and then fine-tune or export it as needed.

### Analysis Engine and Performance Optimization

At the core of OpenUda is its analysis engine, which computes how the antenna will perform. Under the hood, OpenUda uses the Numerical Electromagnetics Code (NEC), a well-established algorithm for antenna modeling. NEC-2 (and NEC-4) are widely used programs for simulating wire antennas – they calculate parameters like input impedance and radiation patterns by solving electromagnetic equations for the antenna structure. Traditionally, running NEC required desktop software, but OpenUda brings this capability to the browser by compiling the NEC solver to WebAssembly (WASM). WebAssembly is a low-level bytecode that runs in the browser at near-native speed. The original Fortran/C NEC code is converted into WebAssembly, allowing the client's device (PC, tablet, etc.) to execute the antenna calculations locally. This means once the web app is loaded, all computations occur on the client side – no server round-trips or cloud processing needed. The result is not only faster feedback (thanks to eliminating network latency) but also enhanced privacy, as the user's antenna data doesn't need to leave their machine. The NEC-2 engine in WASM can rapidly compute the antenna's feed point impedance, gain, radiation pattern, etc., for a given design. For more advanced cases, NEC-4 (which handles more complex or thick wire elements) can be similarly compiled to WASM, and users with a NEC-4 license could plug that in for improved accuracy on certain designs.

To further ensure the UI remains smooth, OpenUda employs Web Workers for heavy computations. Web Workers run scripts on a background thread separate from the main UI thread. When a user starts a frequency sweep or an optimization, the app spawns a worker that loads the WebAssembly NEC module and performs the number-crunching in parallel. This design prevents the browser UI from freezing during, say, a sweep of 100 frequency points or an optimization loop. The main thread remains free to update graphics or respond to user input, while the worker thread computes results and then sends them back when ready. By combining WebAssembly for raw performance and Web Workers for concurrency, OpenUda achieves a responsive application even during intensive tasks. This approach is known to yield near-native execution speeds in web apps while keeping the interface fluid.

Performance optimization is also considered in providing quick feedback. Upon any change, OpenUda can first use basic approximation formulas for Uda antennas to instantly update the on-screen results. For example, there are empirical formulas or lookup tables for Uda gain based on number of elements and spacing that can give a rough answer. The app can use these to show an initial estimated gain, bandwidth, or impedance almost immediately. Meanwhile, the NEC-based calculation runs and, once complete, replaces the estimates with precise results. This two-stage approach (fast estimate followed by detailed analysis) gives the user the best of both worlds: speed and accuracy. It's especially useful when using the slider-like real-time adjustments in design – as you drag an element length, you see the gain ticking up or down without delay, and a moment later the exact simulation confirms the value.

Finally, the NEC simulation includes support for both NEC-2 and NEC-4 algorithms. NEC-2 is public domain and sufficient for most hobby designs, so it's the default engine in OpenUda. For users interested in more advanced modeling (e.g., tapering elements, insulated elements, or very low-frequency ground effects), the app could offer an option to use a NEC-4 engine (provided licensing issues are addressed). All the computational heavy lifting happens client-side, ensuring that the application can be deployed as a static site without server dependencies.

### Output and Visualization

OpenUda's results are presented in a clear, informative manner across the UI tabs:

- On the Main tab, after running an analysis, the app highlights the key performance metrics at the target (center) frequency. These include the antenna's maximum gain in dBi, the feed point impedance (real part in Ohms, and possibly the reactance if non-zero), the front-to-back ratio in dB, and the efficiency or effective gain. Efficiency here denotes how much of the input power is radiated – for a well-designed Uda this could be quite high (above 90%), but the app will show it so that users know if any significant losses or impedance mismatch might be occurring. By summarizing these critical figures, the Main tab gives a quick assessment of whether the design meets the user's goals (e.g. does it have the required gain and a reasonable impedance match at the chosen frequency). If the user runs the optimizer, these values update to reflect the improved design. In essence, the Main tab serves as a dashboard for the antenna's primary specs, much like a summary sheet one would see in other tools.
- The Line Chart tab provides the frequency-domain performance plots as described earlier. Each subplot is clearly labeled (for example, "Gain (dBi) vs Frequency") and the x-axis spans the frequency range of interest (which the user can specify, e.g. target freq ± 10% or a specific bandwidth). The plots are generated using Chart.js, which means they are not just static images – they are interactive. Users can hover over points to see exact numeric values, and if multiple datasets are overlaid (say, SWR and a threshold line), a legend highlights them. The app might also allow toggling which curves to display (for instance, hide the imaginary impedance plot if the user is only concerned with VSWR). These graphs enable fine analysis of bandwidth: for instance, the user can see the 2:1 VSWR bandwidth (the range of frequencies where VSWR stays below 2), or how quickly gain drops off if frequency moves away from center. Such analysis is important in antenna design to ensure the antenna will perform across the desired range (e.g. an Uda for 144 MHz might need to cover 144–148 MHz ham band with acceptable SWR). OpenUda effectively automates this by computing the antenna at many frequency points and plotting the results. This functionality emulates what traditional software does when it produces SWR or gain curves, thus users get professional-grade insight from the web app.
- The Pattern Analysis tab displays the radiation patterns. The 2D patterns (polar plots) typically show gain (or relative field strength) in dB on a circular graph where 0° corresponds to the antenna's forward direction. For the vertical plane pattern, the plot might represent an elevation cut (showing how the antenna radiates above and below the horizon, assuming the antenna is oriented horizontally), whereas the horizontal plane pattern is an azimuth cut (showing the beamwidth and sidelobes in the horizontal plane). These plots help identify the antenna's beamwidth (the angular width of the main lobe between -3 dB points) and check the sidelobe levels or backlobe level. The 3D pattern adds a full spatial perspective: it is essentially a lobed shape (often looking like a stretched balloon or teardrop shape in the case of an Uda) that can be rotated. Using Three.js, the app renders this 3D plot with color or intensity indicating gain. The user can interact with this model as if inspecting a real radiation pattern in an anechoic chamber. This visualization is powered by WebGL for smooth rendering, even for fine angular resolution of the pattern. It's an impressive feature usually found in desktop applications – for example, 4NEC2 can display 3D patterns for designs. Now available in the browser via OpenUda. Furthermore, the user can capture or download these plots if needed (for inclusion in reports or comparison between designs).

All numeric results and charts can be exported or saved. OpenUda could allow exporting the chart data as CSV or the plots as images. This way, users not only interact with the results online but can also document their designs. The emphasis is on delivering professional-quality output: the goal is that a user could use OpenUda to design an antenna and then present the results (gain, SWR curves, pattern plots) just as they would if they had used a traditional PC application. The app's high-fidelity output makes it suitable for real engineering use, education, or hobbyist experimentation alike.

## Automated Testing and Deployment System

To ensure code quality for the Yagi-Uda Antenna Optimization System (OpenUda), we have implemented a comprehensive automated testing framework and CI/CD pipeline using GitHub Actions.

### Testing Framework

The testing system focuses on validating critical components of the application:

1. **Calculator Module**: Tests that verify the accuracy of antenna performance calculations, including:

   - Radiation pattern generation
   - VSWR (Voltage Standing Wave Ratio) calculations
   - Impedance analysis

2. **Optimizer Module**: Tests that validate the genetic algorithm implementation for antenna optimization, ensuring correct handling of parameters such as:

   - Population size: 30
   - Maximum generations: 20
   - Mutation rate: 0.15
   - Crossover rate: 0.8
   - Elitism: 2 (best individuals preserved)

3. **Error Handling**: Tests that ensure the application properly handles edge cases and invalid inputs.

This testing framework is implemented as Node.js modules that can run in both browser and server environments, supporting both local development testing and integration with automated CI pipelines.

### GitHub Actions Workflow

The CI/CD pipeline automatically:

1. Runs all tests on every push to the main branch and pull requests
2. Generates test reports for analysis
3. Creates an optimized production build excluding test code
4. Deploys to GitHub Pages automatically when tests pass successfully

This ensures that:

- Test code is included in the repository but excluded from production builds
- All changes are validated before deployment
- Code quality is maintained through a continuous integration process

### Running Tests Locally

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test modules
node tests/run-tests.js --module=calculator
```

The testing framework provides detailed feedback and failure diagnostics to facilitate problem-solving during development.

### WebAssembly Integration Testing

A key aspect of testing is validating the WebAssembly integration with the NEC2C engine. The test suite includes specialized mock objects for the NEC2C WebAssembly module, allowing the JavaScript interface functionality to be validated without the actual computation engine.

## Deployment and Offline Use

OpenUda is built as a static web app (HTML, CSS, JS, WASM), which makes deployment and distribution extremely convenient. The entire application can be hosted on services like GitHub Pages, Netlify, or Vercel with ease – essentially just by uploading the files. There is no server-side component required for the core functionality, since all processing is done client-side. This means anyone can access the app through a URL and get the full functionality without installation. Furthermore, because it's static and lightweight, one could even run it locally by simply opening the index.html file in a browser.

Importantly, OpenUda is designed with Progressive Web App (PWA) principles in mind. As a PWA, it can offer offline capabilities and the option to "install" the app for a native-like experience. When a user first visits the OpenUda site, the PWA's service worker can cache the essential files (HTML, JavaScript, WASM, CSS, and even preset data) in the browser. This allows subsequent visits to load instantly and, crucially, enables the app to function offline. Users could literally use OpenUda in the field with no internet access – the app would load from the cache and still allow loading saved antenna files, making tweaks, and running simulations, all offline. Progressive Web Apps provide robust options for storing data locally (for example, using localStorage, IndexedDB, or the Cache API) so that users can continue working even if the network is unavailable. OpenUda takes advantage of these technologies: design files that the user saves can be stored in browser storage for quick retrieval, and results can be cached as needed. The PWA manifest also allows users to install OpenUda to their home screen or desktop, launching it in a standalone window without the browser UI. This makes the web app feel like a native application.

When it comes to updates, hosting as a static site means updates are as simple as deploying a new version of the files. Users will get the new version automatically upon next visit (with the service worker handling cache updates in the background). The deployment on platforms like GitHub Pages or Netlify ensures that the app is delivered over HTTPS, an important requirement for enabling service workers and for general security.

In summary, OpenUda is packaged to be easily deployable and shareable. Anyone can host their own instance or use the publicly hosted version. With PWA features, the app is ready for offline use and can store user preferences or last-used designs locally. This makes OpenUda not only powerful in terms of features but also highly accessible – it lowers the barrier to entry for advanced antenna modeling by removing the need for specialized software installation. The end result is a fully functional, high-performance web application for Yagi-Uda antenna design that can be accessed from anywhere, even offline, and is ready for use on day one via simple static hosting. By fulfilling all the requirements above, the OpenUda web app becomes a complete solution for antenna enthusiasts to design, analyze, and optimize Yagi-Uda antennas with professional-grade tools in a user-friendly web interface.

Sources: The design and features of OpenUda take inspiration from established antenna modeling tools and modern web practices. Yagi-Uda theory and typical performance metrics are referenced from antenna engineering resources. File format support is based on common standards used by YagiCAD and NEC simulators. The use of WebAssembly and Web Workers for high-performance computing in the browser follows best practices for heavy web applications. The goal is to deliver comparable capabilities to desktop programs like 4NEC2 in a convenient web app format, while leveraging PWA technology to enhance accessibility and offline functionality. The combination of these approaches results in a robust, deployable OpenUda web app that meets the needs of users looking to design high-gain, directional Yagi-Uda antennas with ease and precision.
