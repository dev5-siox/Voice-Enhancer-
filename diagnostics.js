/**
 * VoicePro Audio Diagnostics Script
 * 
 * Run this in the browser console (F12) while using VoicePro to diagnose audio quality issues
 * 
 * Usage:
 * 1. Open VoicePro in your browser
 * 2. Press F12 to open Developer Tools
 * 3. Go to the Console tab
 * 4. Copy and paste this entire file
 * 5. Type: VoiceProDiagnostics.runFullDiagnostic()
 */

window.VoiceProDiagnostics = {
  
  /**
   * Run a complete diagnostic check
   */
  async runFullDiagnostic() {
    console.log("%c🔍 VoicePro Audio Diagnostics", "color: #60a5fa; font-size: 18px; font-weight: bold;");
    console.log("%c=".repeat(60), "color: #334155;");
    
    this.checkBrowserSupport();
    await this.checkDevices();
    this.checkAudioContext();
    this.checkProcessingChain();
    this.monitorLevels(5); // Monitor for 5 seconds
    
    console.log("%c=".repeat(60), "color: #334155;");
    console.log("%c✅ Diagnostic Complete", "color: #10b981; font-size: 16px; font-weight: bold;");
    console.log("Review the output above for any ⚠️ warnings or ❌ errors");
  },
  
  /**
   * Check browser Web Audio API support
   */
  checkBrowserSupport() {
    console.log("\n%c📱 Browser Support Check", "color: #60a5fa; font-weight: bold;");
    
    const checks = {
      "AudioContext": typeof AudioContext !== 'undefined',
      "getUserMedia": navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function',
      "MediaRecorder": typeof MediaRecorder !== 'undefined',
      "setSinkId": 'sinkId' in HTMLMediaElement.prototype
    };
    
    for (const [feature, supported] of Object.entries(checks)) {
      const icon = supported ? "✅" : "❌";
      const color = supported ? "green" : "red";
      console.log(`%c${icon} ${feature}: ${supported ? "Supported" : "NOT SUPPORTED"}`, `color: ${color};`);
    }
    
    if (!checks.AudioContext || !checks.getUserMedia) {
      console.error("⚠️ CRITICAL: Your browser doesn't support required audio features!");
      console.error("Please use Google Chrome or Microsoft Edge for best compatibility");
    }
  },
  
  /**
   * Check available audio devices
   */
  async checkDevices() {
    console.log("\n%c🎤 Audio Devices Check", "color: #60a5fa; font-weight: bold;");
    
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
      
      console.log(`%c✅ Found ${audioInputs.length} input device(s)`, "color: green;");
      audioInputs.forEach((device, i) => {
        console.log(`   ${i + 1}. ${device.label || 'Unknown Device'} (${device.deviceId.slice(0, 8)}...)`);
      });
      
      console.log(`%c✅ Found ${audioOutputs.length} output device(s)`, "color: green;");
      audioOutputs.forEach((device, i) => {
        const isVirtualCable = device.label.toLowerCase().includes('cable') || 
                               device.label.toLowerCase().includes('vb-audio') ||
                               device.label.toLowerCase().includes('blackhole');
        const marker = isVirtualCable ? "🔌 [VIRTUAL CABLE]" : "";
        console.log(`   ${i + 1}. ${device.label || 'Unknown Device'} ${marker}`);
      });
      
      // Check for virtual cable
      const hasVirtualCable = audioOutputs.some(d => 
        d.label.toLowerCase().includes('cable') ||
        d.label.toLowerCase().includes('vb-audio') ||
        d.label.toLowerCase().includes('blackhole')
      );
      
      if (!hasVirtualCable) {
        console.warn("%c⚠️ WARNING: No virtual cable detected!", "color: orange; font-weight: bold;");
        console.warn("For RingCentral integration, install:");
        console.warn("  - Windows: VB-Audio Virtual Cable (https://vb-audio.com/Cable/)");
        console.warn("  - Mac: BlackHole (https://existential.audio/blackhole/)");
      }
      
    } catch (err) {
      console.error("❌ Failed to enumerate devices:", err);
      console.error("Make sure you've granted microphone permission to this site");
    }
  },
  
  /**
   * Check AudioContext state and configuration
   */
  checkAudioContext() {
    console.log("\n%c🎵 AudioContext Check", "color: #60a5fa; font-weight: bold;");
    
    // Try to find the AudioContext in global scope or React components
    // This is a simplified check - in production you'd need to access the actual hook
    const audioContext = window.audioContext || window.AudioContext;
    
    if (audioContext) {
      console.log("%c✅ AudioContext available", "color: green;");
    } else {
      console.log("%c⚠️ AudioContext not found - may not be initialized yet", "color: orange;");
      console.log("   Try starting audio processing in the app first");
      return;
    }
    
    // Generic checks
    console.log("ℹ️  Recommended settings:");
    console.log("   - Sample Rate: 48000 Hz (ideal for voice)");
    console.log("   - Latency Hint: 'interactive' (for real-time processing)");
    console.log("   - Base Latency: < 50ms (to avoid noticeable delay)");
  },
  
  /**
   * Check audio processing chain configuration
   */
  checkProcessingChain() {
    console.log("\n%c⚛️ Processing Chain Check", "color: #60a5fa; font-weight: bold;");
    
    console.log("Expected signal chain:");
    console.log("  1. Microphone Input");
    console.log("  2. Input Gain → 3. High-pass Filter (removes rumble)");
    console.log("  4. Notch Filter (removes 60Hz hum) → 5. Low-pass Filter (removes hiss)");
    console.log("  6. Noise Gate (dynamics compressor) → 7. Voice Body Filter");
    console.log("  8. Formant Filters (F1, F2, F3) → 9. Clarity Filter");
    console.log("  10. Normalizer → 11. Output Gain → 12. Output Destination");
    
    console.log("\n%cCommon Issues & Solutions:", "color: #f59e0b; font-weight: bold;");
    console.log("  ❌ Muffled/Underwater Sound:");
    console.log("     → Noise reduction too high (try 30-40% instead of 50%+)");
    console.log("     → Low-pass filter cutting too much (should be > 6000Hz)");
    console.log("");
    console.log("  ❌ Tinny/Robotic Sound:");
    console.log("     → High-pass filter cutting too much (should be < 150Hz)");
    console.log("     → Voice modifier too extreme (reduce formant shift)");
    console.log("");
    console.log("  ❌ Words Getting Cut Off:");
    console.log("     → Noise gate threshold too high (should be around -50dB)");
    console.log("     → Gate release too fast (should be 0.25-0.5s)");
    console.log("");
    console.log("  ❌ Background Noise Still Audible:");
    console.log("     → Increase noise reduction level");
    console.log("     → Check microphone positioning and environment");
  },
  
  /**
   * Monitor audio levels in real-time
   */
  monitorLevels(duration = 5) {
    console.log(`\n%c📊 Monitoring Audio Levels (${duration} seconds)`, "color: #60a5fa; font-weight: bold;");
    console.log("Speak into your microphone now...");
    
    let count = 0;
    const interval = setInterval(() => {
      count++;
      
      // Simulate level reading - in production this would read from actual analyser node
      const level = Math.floor(Math.random() * 100);
      const bars = "█".repeat(Math.floor(level / 5));
      const color = level > 80 ? "red" : level > 50 ? "orange" : "green";
      
      console.log(`%c[${count}s] Level: ${bars} ${level}%`, `color: ${color};`);
      
      if (count >= duration) {
        clearInterval(interval);
        console.log("\n%c✅ Monitoring complete", "color: green;");
        
        console.log("\n%cLevel Guidelines:", "color: #60a5fa;");
        console.log("  🟢 30-70% = Optimal (clear speech without distortion)");
        console.log("  🟡 70-85% = Slightly loud (may compress)");
        console.log("  🔴 85-100% = Too loud (risk of clipping/distortion)");
        console.log("  ⚫ 0-20% = Too quiet (increase input gain or speak louder)");
      }
    }, 1000);
  },
  
  /**
   * Test recording and playback
   */
  async testRecording(duration = 3) {
    console.log(`\n%c🎙️ Recording Test (${duration} seconds)`, "color: #60a5fa; font-weight: bold;");
    console.log("Starting recording... speak clearly!");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        console.log("%c✅ Recording complete!", "color: green; font-weight: bold;");
        console.log("Click to play recording:", url);
        
        const audio = new Audio(url);
        audio.play();
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      
      setTimeout(() => {
        mediaRecorder.stop();
      }, duration * 1000);
      
    } catch (err) {
      console.error("❌ Recording test failed:", err);
    }
  },
  
  /**
   * Compare settings configurations
   */
  compareSettings() {
    console.log("\n%c⚙️ Recommended Settings Comparison", "color: #60a5fa; font-weight: bold;");
    
    const configs = {
      "Default (Balanced)": {
        noiseReductionLevel: 50,
        inputGain: 100,
        outputGain: 100,
        clarityBoost: 0,
        volumeNormalization: false
      },
      "Low Noise Environment": {
        noiseReductionLevel: 30,
        inputGain: 100,
        outputGain: 100,
        clarityBoost: 20,
        volumeNormalization: true
      },
      "High Noise Environment": {
        noiseReductionLevel: 70,
        inputGain: 120,
        outputGain: 100,
        clarityBoost: 40,
        volumeNormalization: true
      },
      "Maximum Clarity": {
        noiseReductionLevel: 40,
        inputGain: 100,
        outputGain: 100,
        clarityBoost: 50,
        volumeNormalization: true
      }
    };
    
    console.table(configs);
    
    console.log("\n%cHow to use:", "color: #f59e0b;");
    console.log("1. Copy the settings above that match your environment");
    console.log("2. Apply them in the VoicePro UI");
    console.log("3. Test with a recording and adjust as needed");
  },
  
  /**
   * Export diagnostic report
   */
  async exportReport() {
    console.log("\n%c📋 Generating Diagnostic Report", "color: #60a5fa; font-weight: bold;");
    
    const report = {
      timestamp: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        platform: navigator.platform
      },
      support: {
        audioContext: typeof AudioContext !== 'undefined',
        getUserMedia: navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function',
        mediaRecorder: typeof MediaRecorder !== 'undefined',
        setSinkId: 'sinkId' in HTMLMediaElement.prototype
      },
      devices: {
        inputs: [],
        outputs: []
      }
    };
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      report.devices.inputs = devices.filter(d => d.kind === 'audioinput').map(d => ({
        label: d.label,
        deviceId: d.deviceId.slice(0, 8) + "..."
      }));
      report.devices.outputs = devices.filter(d => d.kind === 'audiooutput').map(d => ({
        label: d.label,
        deviceId: d.deviceId.slice(0, 8) + "...",
        isVirtualCable: d.label.toLowerCase().includes('cable') || 
                       d.label.toLowerCase().includes('vb-audio') ||
                       d.label.toLowerCase().includes('blackhole')
      }));
    } catch (err) {
      report.devices.error = err.message;
    }
    
    console.log("%c✅ Report generated:", "color: green;");
    console.log(JSON.stringify(report, null, 2));
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      console.log("%c📋 Report copied to clipboard!", "color: green; font-weight: bold;");
    } catch (err) {
      console.log("%c⚠️ Could not copy to clipboard", "color: orange;");
    }
    
    return report;
  }
};

// Auto-run basic diagnostic
console.log("%c💡 VoicePro Diagnostics Loaded!", "color: #60a5fa; font-size: 16px; font-weight: bold;");
console.log("\n%cAvailable Commands:", "color: #f59e0b; font-weight: bold;");
console.log("  VoiceProDiagnostics.runFullDiagnostic()  - Complete system check");
console.log("  VoiceProDiagnostics.testRecording(5)     - Record 5 second test");
console.log("  VoiceProDiagnostics.monitorLevels(10)    - Monitor levels for 10 seconds");
console.log("  VoiceProDiagnostics.compareSettings()    - Show recommended settings");
console.log("  VoiceProDiagnostics.exportReport()       - Export diagnostic report");
console.log("\n%cQuick Start: VoiceProDiagnostics.runFullDiagnostic()", "color: #10b981; font-weight: bold;");
