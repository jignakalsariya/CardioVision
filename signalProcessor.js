class SignalProcessor {
    constructor() {
        this.minBPM = 45;
        this.maxBPM = 180;
    }

    detrend(data) {
        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += i; sumY += data[i];
            sumXY += i * data[i]; sumX2 += i * i;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        return data.map((val, i) => val - (slope * i + intercept));
    }

    computeBPM(rgbData, fps) {
        const L = rgbData.length;
        const rM = rgbData.reduce((a, b) => a + b.r, 0) / L;
        const gM = rgbData.reduce((a, b) => a + b.g, 0) / L;
        const bM = rgbData.reduce((a, b) => a + b.b, 0) / L;

        const R = rgbData.map(d => d.r / (rM || 1));
        const G = rgbData.map(d => d.g / (gM || 1));
        const B = rgbData.map(d => d.b / (bM || 1));

        const chrom = [];
        for (let i = 0; i < L; i++) {
            const X = 3 * R[i] - 2 * G[i];
            const Y = 1.5 * R[i] + G[i] - 1.5 * B[i];
            chrom.push(X / (Y || 1));
        }

        const filtered = this.detrend(chrom).map((v, i) => 
            v * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (L - 1)))
        );

        let maxP = 0, bestB = 45;
        for (let bpm = this.minBPM; bpm <= this.maxBPM; bpm++) {
            let re = 0, im = 0;
            const fHz = bpm / 60.0;
            for (let t = 0; t < L; t++) {
                const ang = (2 * Math.PI * fHz * t) / fps;
                re += filtered[t] * Math.cos(ang);
                im -= filtered[t] * Math.sin(ang);
            }
            const p = re * re + im * im;
            if (p > maxP) { maxP = p; bestB = bpm; }
        }
        return bestB;
    }
}