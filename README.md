# CardioVision: Medical Heart Rate Monitoring System

**CardioVision** is an advanced, browser-based medical monitoring application that leverages Computer Vision and Photoplethysmography (rPPG) to measure heart rate in real-time. By analyzing subtle color changes in the facial skin caused by blood flow, CardioVision provides a non-invasive cardiovascular assessment without the need for external hardware.

### Live Demo
https://pulsevision.vercel.app

---

## Overview

CardioVision uses the **MediaPipe Face Mesh** to isolate specific Regions of Interest (ROI)—such as the forehead, cheeks, and chin—to track blood volume pulse (BVP). The application is designed with a clinical aesthetic, ensuring ease of use for both patients and healthcare providers.

### Key Features:

- **Real-time Facial Analysis:** High-precision tracking of 468+ 3D face landmarks.
- **Multi-ROI Sampling:** Collects RGB data from the forehead and cheeks to minimize noise and improve accuracy.
- **Medical Protocol Integration:** Configurable measurement durations (1–3 mins) and standard update intervals.
- **Comprehensive Reports:** Generates a cardiovascular assessment including HR categorization (Bradycardia, Normal, Tachycardia).
- **Data Export:** Allows users to download their session data as a JSON report for medical record-keeping.
- **Responsive UI:** Fully optimized for desktops, tablets, and mobile devices.

---

## Technical Stack

### Frontend & UI

- **HTML5/CSS3:** Custom modern medical theme using CSS variables and flexbox/grid layouts.
- **JavaScript (ES6+):** Modular logic for state management and UI navigation.
- **Google Fonts:** Inter & Roboto Mono for high readability.

### Computer Vision & Signal Processing

- **MediaPipe Face Mesh:** Real-time face detection and landmark tracking.

- **Custom Signal Processor:**
  - **Detrending:** Linear regression to remove signal drift.
  - **Chrominance Method (CHROM):** Advanced RGB-to-signal transformation to isolate the pulse.
  - **Fourier Transform (DFT):** Frequency domain analysis to identify the dominant heart rate (BPM).
  - **Hamming Windowing:** Applied to reduce spectral leakage during processing.

---

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Edge, or Safari recommended)
- A functioning webcam/integrated camera
- Adequate lighting (avoid backlighting for best results)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jignakalsariya/CardioVision.git

1. Navigate to the project directory:
   ```bash
   cd CardioVision

3. Run the project:
   - Open `index.html` directly in your browser  
   OR
   - Use a live server (recommended):
     ### VS Code → Right-click index.html → Open with Live Server

## Measurement Protocol

To ensure clinical-grade accuracy, follow these steps:

1. Positioning: Sit comfortably with your face centered in the camera view.
2. Lighting: Ensure your face is evenly lit; avoid strong light sources behind you.
3. Stability: Remain still and avoid talking during the measurement.
4. Duration: A 2-minute measurement is recommended for a stable baseline.

---

## Project Structure

├── index.html          # Application structure & UI sections  
├── style.css           # Modern medical theme & responsive design  
├── main.js             # Application logic, Camera & MediaPipe setup  
├── signalProcessor.js  # Mathematical models for HR extraction  
├── README.md           # Project documentation  

---

## Disclaimer

CardioVision is for informational and educational purposes only.  
The heart rate readings and cardiovascular assessments provided are generated via experimental computer vision techniques and should not be used as a substitute for professional medical diagnosis, advice, or treatment.

Always consult a qualified healthcare provider for medical concerns.

---

If you find this project useful, feel free to star the repository!
