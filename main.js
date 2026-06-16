// ===== GLOBAL VARIABLES =====
const videoElement = document.getElementById('inputVideo');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const instantHRLabel = document.getElementById('instantHR');
const avgLabel = document.getElementById("avgHR");
const estimatedHRLabel = document.getElementById('estimatedHR');
const finalHRLabel = document.getElementById('finalHR');
const finalAvgHRLabel = document.getElementById('finalAvgHR');
const timerDisplay = document.getElementById('timerDisplay');
const progressBar = document.getElementById('progressBar');
const readingsCountLabel = document.getElementById('readingsCount');
const nextUpdateLabel = document.getElementById('nextUpdate');
const statusLabel = document.getElementById('statusLabel');
const conditionResult = document.getElementById('conditionResult');
const recommendationList = document.getElementById('recommendationList');
const reportTimeLabel = document.getElementById('reportTime');

const processor = new SignalProcessor();
let rgbBuffer = []; 
const BUFFER_SIZE = 150; 
let lastTimestamp = Date.now();

// ===== MEASUREMENT STATE =====
let isMeasuring = false;
let measurementStartTime = null;
let measurementDuration = 120; // 2 minutes in seconds
let updateInterval = 30; // 30 seconds
let lastUpdateTime = 0;
let instantReadings = [];
let averageReadings = [];
let currentInstantHR = 0;
let currentAvgHR = 0;
let measurementTimer = null;
let updateTimer = null;

// ===== UI ELEMENTS =====
const startSection = document.getElementById('startSection');
const cameraSection = document.getElementById('cameraSection');
const resultsSection = document.getElementById('resultsSection');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const durationSelect = document.getElementById('durationSelect');
const updateSelect = document.getElementById('updateSelect');

// ===== MEDIAPIPE SETUP =====
const faceMesh = new FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

// ===== ROI DEFINITIONS =====
const FOREHEAD_ROI = [10, 67, 69, 103, 104, 108, 109, 151, 284, 297, 299, 332, 333, 337, 338];
const LEFT_CHEEK_ROI = [50, 101, 116, 117, 118, 119, 123, 147, 187, 205, 209, 216];
const RIGHT_CHEEK_ROI = [280, 330, 345, 346, 347, 348, 352, 376, 411, 425, 429, 436];
const CHIN_ROI = [152, 148, 176, 140, 369, 396, 377, 400, 361, 132];

const ALL_ROI_INDICES = [
    ...FOREHEAD_ROI, 
    ...LEFT_CHEEK_ROI, 
    ...RIGHT_CHEEK_ROI, 
    ...CHIN_ROI
];

// ===== CAMERA SETUP =====
const camera = new Camera(videoElement, {
  onFrame: async () => { 
    if (isMeasuring) {
      await faceMesh.send({image: videoElement}); 
    }
  },
  width: 640, height: 480
});

// ===== FACE MESH RESULTS =====
faceMesh.onResults((results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    
    canvasCtx.save();
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    const landmarks = results.multiFaceLandmarks[0];
    let sumR = 0, sumG = 0, sumB = 0;
    let pixelCount = 0;

    // Draw ROI points and collect color data
    ALL_ROI_INDICES.forEach(index => {
        const point = landmarks[index];
        const x = Math.floor(point.x * canvasElement.width);
        const y = Math.floor(point.y * canvasElement.height);
        
        // Sample a 5x5 area to reduce sensor noise
        const region = canvasCtx.getImageData(x - 2, y - 2, 5, 5).data;
        for (let i = 0; i < region.length; i += 4) {
            sumR += region[i];
            sumG += region[i + 1];
            sumB += region[i + 2];
            pixelCount++;
        }
        
        // Draw ROI indicator
        canvasCtx.fillStyle = "#00FF00";
        canvasCtx.fillRect(x - 2, y - 2, 4, 4);
    });

    // Add to RGB buffer
    rgbBuffer.push({
        r: sumR / pixelCount,
        g: sumG / pixelCount,
        b: sumB / pixelCount,
        timestamp: Date.now()
    });

    if (rgbBuffer.length > BUFFER_SIZE) rgbBuffer.shift();

    // Calculate heart rate when we have enough data
    if (rgbBuffer.length >= 120) {
        const bpm = processor.computeBPM(rgbBuffer, 30); 
        if (bpm > 45.5) {
            currentInstantHR = Math.round(bpm);
            instantReadings.push(currentInstantHR);
            
            // Update instant HR display
            if (instantHRLabel) {
                instantHRLabel.innerText = currentInstantHR;
            }
            
            // Calculate running average
            if (instantReadings.length > 0) {
                currentAvgHR = Math.round(
                    instantReadings.reduce((a, b) => a + b, 0) / instantReadings.length
                );
                if (avgLabel) {
                    avgLabel.innerText = currentAvgHR;
                }
            }
        }
    }
    
    canvasCtx.restore();
});

// ===== NAVIGATION FUNCTIONS =====
function showStartPage() {
    hideAllSections();
    startSection.classList.add('active');
    resetMeasurement();
}

function showCameraPage() {
    hideAllSections();
    cameraSection.classList.add('active');
}

function showResultsPage() {
    hideAllSections();
    resultsSection.classList.add('active');
    generateResults();
}

function hideAllSections() {
    startSection.classList.remove('active');
    cameraSection.classList.remove('active');
    resultsSection.classList.remove('active');
}

// ===== MEASUREMENT FUNCTIONS =====
function startMeasurement() {
    // Get settings
    measurementDuration = parseInt(durationSelect.value) * 60;
    updateInterval = parseInt(updateSelect.value);
    
    // Reset state
    instantReadings = [];
    averageReadings = [];
    rgbBuffer = [];
    currentInstantHR = 0;
    currentAvgHR = 0;
    lastUpdateTime = 0;
    
    // Start measurement
    isMeasuring = true;
    measurementStartTime = Date.now();
    
    // Start camera
    camera.start();
    
    // Navigate to camera page
    showCameraPage();
    
    // Start timers
    startMeasurementTimer();
    startUpdateTimer();
    
    // Update status
    updateStatus('Monitoring in progress...', 'active');
}

function stopMeasurement() {
    isMeasuring = false;
    
    // Clear timers
    if (measurementTimer) {
        clearInterval(measurementTimer);
        measurementTimer = null;
    }
    
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }
    
    // Stop camera
    camera.stop();
    
    // Show results
    showResultsPage();
}

function resetMeasurement() {
    isMeasuring = false;
    instantReadings = [];
    averageReadings = [];
    rgbBuffer = [];
    currentInstantHR = 0;
    currentAvgHR = 0;
    
    if (measurementTimer) {
        clearInterval(measurementTimer);
        measurementTimer = null;
    }
    
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }
    
    camera.stop();
    
    // Reset displays
    if (instantHRLabel) instantHRLabel.innerText = '--';
    if (avgLabel) avgLabel.innerText = '--';
    if (readingsCountLabel) readingsCountLabel.innerText = '0';
    if (nextUpdateLabel) nextUpdateLabel.innerText = `${updateInterval}s`;
    if (timerDisplay) timerDisplay.innerText = formatTime(measurementDuration);
    if (progressBar) progressBar.style.width = '0%';
    
    updateStatus('Ready to start measurement', 'ready');
}

// ===== TIMER FUNCTIONS =====
function startMeasurementTimer() {
    measurementTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - measurementStartTime) / 1000);
        const remaining = measurementDuration - elapsed;
        
        if (remaining <= 0) {
            stopMeasurement();
            return;
        }
        
        // Update timer display
        if (timerDisplay) {
            timerDisplay.innerText = formatTime(remaining);
        }
        
        // Update progress bar
        const progress = ((measurementDuration - remaining) / measurementDuration) * 100;
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        // Update next update countdown
        const timeSinceLastUpdate = elapsed - lastUpdateTime;
        const nextUpdate = updateInterval - timeSinceLastUpdate;
        if (nextUpdateLabel && nextUpdate > 0) {
            nextUpdateLabel.innerText = `${nextUpdate}s`;
        }
        
    }, 1000);
}

function startUpdateTimer() {
    updateTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - measurementStartTime) / 1000);
        
        if (elapsed >= updateInterval && (elapsed - lastUpdateTime) >= updateInterval) {
            // Update average
            averageReadings.push(currentAvgHR);
            lastUpdateTime = elapsed;
            
            // Update readings count
            if (readingsCountLabel) {
                readingsCountLabel.innerText = averageReadings.length;
            }
        }
    }, 1000);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ===== STATUS FUNCTIONS =====
function updateStatus(message, type) {
    if (statusLabel) {
        statusLabel.innerHTML = `
            <div class="status-dot ${type}"></div>
            <span>${message}</span>
        `;
    }
}

// ===== RESULTS GENERATION =====
function generateResults() {
    // Calculate estimated heart rate from all instant readings
    const estimatedHR = instantReadings.length > 0 ? 
        Math.round(instantReadings.reduce((a, b) => a + b, 0) / instantReadings.length) : 0;
    
    // Update estimated heart rate display
    if (estimatedHRLabel) estimatedHRLabel.innerText = estimatedHR;
    
    // Update timestamp
    if (reportTimeLabel) {
        const now = new Date();
        reportTimeLabel.innerText = `Generated: ${now.toLocaleTimeString()}`;
    }
    
    // Generate condition analysis based on estimated HR
    if (conditionResult) {
        conditionResult.innerHTML = generateConditionAnalysis(estimatedHR);
    }
    
    // Generate recommendations based on estimated HR
    if (recommendationList) {
        recommendationList.innerHTML = generateRecommendations(estimatedHR);
    }
}

function generateConditionAnalysis(hr) {
    if (hr === 0) {
        return '<p>No valid heart rate data collected. Please ensure proper lighting and face positioning.</p>';
    }
    
    let condition = '';
    let description = '';
    
    if (hr < 60) {
        condition = 'Bradycardia';
        description = 'Heart rate is below normal resting range. This may indicate good cardiovascular fitness or require medical evaluation.';
    } else if (hr >= 60 && hr <= 100) {
        condition = 'Normal Sinus Rhythm';
        description = 'Heart rate is within the normal resting range. Cardiovascular function appears healthy.';
    } else if (hr > 100 && hr <= 120) {
        condition = 'Mild Tachycardia';
        description = 'Heart rate is slightly elevated. This may be due to stress, caffeine, or mild physical exertion.';
    } else {
        condition = 'Tachycardia';
        description = 'Heart rate is significantly elevated. Medical evaluation may be recommended.';
    }
    
    return `
        <div class="condition-details">
            <h4>${condition}</h4>
            <p>${description}</p>
            <div class="condition-metrics">
                <div class="metric-row">
                    <span>Measured Heart Rate:</span>
                    <strong>${hr} bpm</strong>
                </div>
                <div class="metric-row">
                    <span>Normal Range:</span>
                    <strong>60-100 bpm</strong>
                </div>
                <div class="metric-row">
                    <span>Status:</span>
                    <strong class="${hr >= 60 && hr <= 100 ? 'normal' : 'attention'}">${hr >= 60 && hr <= 100 ? 'Within Range' : 'Requires Attention'}</strong>
                </div>
            </div>
        </div>
    `;
}

function generateRecommendations(hr) {
    if (hr === 0) {
        return '<p>Unable to generate recommendations due to insufficient data. Please repeat the measurement.</p>';
    }
    
    let recommendations = [];
    
    if (hr < 60) {
        recommendations = [
            'Continue regular cardiovascular exercise',
            'Monitor for symptoms like dizziness or fatigue',
            'Stay hydrated and maintain balanced nutrition',
            'Consider consulting a healthcare provider if symptomatic'
        ];
    } else if (hr >= 60 && hr <= 100) {
        recommendations = [
            'Maintain current lifestyle and exercise routine',
            'Continue regular health monitoring',
            'Stay hydrated and manage stress levels',
            'Consider periodic cardiovascular check-ups'
        ];
    } else if (hr > 100 && hr <= 120) {
        recommendations = [
            'Practice stress reduction techniques',
            'Reduce caffeine intake',
            'Ensure adequate rest and sleep',
            'Consider relaxation exercises like deep breathing'
        ];
    } else {
        recommendations = [
            'Consult a healthcare provider for evaluation',
            'Monitor blood pressure and other vital signs',
            'Avoid strenuous activity until evaluated',
            'Practice immediate stress reduction techniques'
        ];
    }
    
    return `
        <ul class="recommendation-items">
            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
        <div class="disclaimer">
            <p><strong>Disclaimer:</strong> This analysis is for informational purposes only and should not replace professional medical advice.</p>
        </div>
    `;
}

// ===== EVENT LISTENERS =====
startBtn.addEventListener('click', startMeasurement);
stopBtn.addEventListener('click', stopMeasurement);

// ===== EXPORT FUNCTION =====
function exportReport() {
    const estimatedHR = estimatedHRLabel ? estimatedHRLabel.innerText : '0';
    
    const reportData = {
        timestamp: new Date().toISOString(),
        estimatedHeartRate: estimatedHR,
        instantReadings: instantReadings,
        averageReadings: averageReadings,
        measurementDuration: measurementDuration,
        updateInterval: updateInterval
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `heart-rate-report-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Set initial values
    updateStatus('Ready to start measurement', 'ready');
    
    // Initialize displays
    if (readingsCountLabel) readingsCountLabel.innerText = '0';
    if (nextUpdateLabel) nextUpdateLabel.innerText = `${updateInterval}s`;
    if (timerDisplay) timerDisplay.innerText = formatTime(measurementDuration);
});