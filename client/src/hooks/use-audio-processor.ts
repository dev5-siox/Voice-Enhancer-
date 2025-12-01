import { useState, useEffect, useRef, useCallback } from "react";
import type { AudioSettings, AccentPresetType } from "@shared/schema";
import { accentPresetConfigs } from "@shared/schema";

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface AudioProcessorState {
  isInitialized: boolean;
  isProcessing: boolean;
  isRecording: boolean;
  isOutputEnabled: boolean;
  inputLevel: number;
  outputLevel: number;
  latency: number;
  error: string | null;
  processedStreamId: string | null;
  recordingDuration: number;
  outputDeviceId: string | null;
}

export function useAudioProcessor(settings: AudioSettings) {
  const [state, setState] = useState<AudioProcessorState>({
    isInitialized: false,
    isProcessing: false,
    isRecording: false,
    isOutputEnabled: false,
    inputLevel: 0,
    outputLevel: 0,
    latency: 0,
    error: null,
    processedStreamId: null,
    recordingDuration: 0,
    outputDeviceId: null,
  });

  const [devices, setDevices] = useState<AudioDevice[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const outputGainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const noiseGateRef = useRef<DynamicsCompressorNode | null>(null);
  const lowPassRef = useRef<BiquadFilterNode | null>(null);
  const highPassRef = useRef<BiquadFilterNode | null>(null);
  const notchFilterRef = useRef<BiquadFilterNode | null>(null);
  const formantFilterRef = useRef<BiquadFilterNode | null>(null);
  const clarityFilterRef = useRef<BiquadFilterNode | null>(null);
  const normalizerRef = useRef<DynamicsCompressorNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const settingsRef = useRef<AudioSettings>(settings);
  
  // Audio output element for routing to virtual cable
  const audioOutputRef = useRef<HTMLAudioElement | null>(null);
  
  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<number | null>(null);

  // Keep settings ref updated
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Get available audio devices
  const refreshDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = deviceList.filter(
        (device) => device.kind === "audioinput" || device.kind === "audiooutput"
      ).map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)})`,
        kind: device.kind,
      }));
      setDevices(audioDevices);
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
    }
  }, []);

  // Initialize audio context and get user media
  const initialize = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));
      
      // Request microphone access with noise suppression handled by Web Audio
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: settingsRef.current.inputDeviceId ? { exact: settingsRef.current.inputDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: false, // We handle this ourselves
          autoGainControl: false, // We handle this ourselves
          sampleRate: 48000,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Create audio context with low latency
      const audioContext = new AudioContext({ 
        latencyHint: "interactive",
        sampleRate: 48000,
      });
      audioContextRef.current = audioContext;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Create input gain node
      const gainNode = audioContext.createGain();
      gainNode.gain.value = settingsRef.current.inputGain / 100;
      gainNodeRef.current = gainNode;

      // === NOISE REDUCTION CHAIN ===
      
      // High-pass filter to remove low-frequency rumble (HVAC, traffic, etc.)
      const highPass = audioContext.createBiquadFilter();
      highPass.type = "highpass";
      highPass.frequency.value = 80;
      highPass.Q.value = 0.7;
      highPassRef.current = highPass;

      // Notch filter to remove 60Hz hum (electrical interference)
      const notchFilter = audioContext.createBiquadFilter();
      notchFilter.type = "notch";
      notchFilter.frequency.value = 60;
      notchFilter.Q.value = 30;
      notchFilterRef.current = notchFilter;

      // Low-pass filter to remove high-frequency hiss
      const lowPass = audioContext.createBiquadFilter();
      lowPass.type = "lowpass";
      lowPass.frequency.value = 8000;
      lowPass.Q.value = 0.7;
      lowPassRef.current = lowPass;

      // Dynamics compressor for noise gate effect
      const noiseGate = audioContext.createDynamicsCompressor();
      noiseGate.threshold.value = -50;
      noiseGate.knee.value = 40;
      noiseGate.ratio.value = 12;
      noiseGate.attack.value = 0.003;
      noiseGate.release.value = 0.25;
      noiseGateRef.current = noiseGate;

      // === VOICE MODIFICATION CHAIN ===

      // Formant filter for accent modification (peaking filter to shape voice)
      const formantFilter = audioContext.createBiquadFilter();
      formantFilter.type = "peaking";
      formantFilter.frequency.value = 1000; // Base formant frequency
      formantFilter.Q.value = 1;
      formantFilter.gain.value = 0;
      formantFilterRef.current = formantFilter;

      // === VOICE ENHANCEMENT CHAIN ===

      // Clarity boost filter (presence boost around 3-5kHz)
      const clarityFilter = audioContext.createBiquadFilter();
      clarityFilter.type = "peaking";
      clarityFilter.frequency.value = 4000;
      clarityFilter.Q.value = 1.5;
      clarityFilter.gain.value = 0;
      clarityFilterRef.current = clarityFilter;

      // Volume normalization compressor
      const normalizer = audioContext.createDynamicsCompressor();
      normalizer.threshold.value = -24;
      normalizer.knee.value = 30;
      normalizer.ratio.value = 4;
      normalizer.attack.value = 0.003;
      normalizer.release.value = 0.25;
      normalizerRef.current = normalizer;

      // Output gain node
      const outputGain = audioContext.createGain();
      outputGain.gain.value = settingsRef.current.outputGain / 100;
      outputGainNodeRef.current = outputGain;

      // Analyser for visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserNodeRef.current = analyser;

      // Create destination for processed audio - THIS IS THE KEY OUTPUT
      const destination = audioContext.createMediaStreamDestination();
      destinationRef.current = destination;
      processedStreamRef.current = destination.stream;

      // Connect the full audio processing chain
      // Source -> Input Gain -> High Pass -> Notch -> Low Pass -> Noise Gate -> 
      // Formant Filter -> Clarity Filter -> Normalizer -> Output Gain -> Analyser -> Destination
      source.connect(gainNode);
      gainNode.connect(highPass);
      highPass.connect(notchFilter);
      notchFilter.connect(lowPass);
      lowPass.connect(noiseGate);
      noiseGate.connect(formantFilter);
      formantFilter.connect(clarityFilter);
      clarityFilter.connect(normalizer);
      normalizer.connect(outputGain);
      outputGain.connect(analyser);
      analyser.connect(destination);

      // Apply initial settings
      applyNoiseReductionSettings(settingsRef.current);
      applyAccentSettings(settingsRef.current);
      applyEnhancementSettings(settingsRef.current);

      // Start level monitoring
      const updateLevels = () => {
        if (analyserNodeRef.current) {
          const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
          analyserNodeRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const normalizedLevel = Math.min(100, (average / 255) * 100 * 2);
          setState((prev) => ({ 
            ...prev, 
            inputLevel: normalizedLevel,
            outputLevel: normalizedLevel * (settingsRef.current.outputGain / 100),
          }));
        }
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();

      // Calculate latency
      const latency = (audioContext.baseLatency || 0) * 1000 + (audioContext.outputLatency || 0) * 1000;
      
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isProcessing: true,
        latency: Math.max(10, Math.round(latency)),
        processedStreamId: destination.stream.id,
      }));

      await refreshDevices();
      
      console.log("VoicePro: Audio processing initialized. Processed stream ID:", destination.stream.id);
      
      // AUTO-ENABLE OUTPUT: Route processed audio to system output immediately
      // This ensures the processed audio is actually playing somewhere
      try {
        if (!audioOutputRef.current) {
          audioOutputRef.current = new Audio();
          audioOutputRef.current.autoplay = true;
        }
        audioOutputRef.current.srcObject = destination.stream;
        await audioOutputRef.current.play();
        setState(prev => ({ ...prev, isOutputEnabled: true }));
        console.log("VoicePro: Audio output auto-enabled - processed audio now playing to system output");
      } catch (outputErr) {
        console.warn("VoicePro: Could not auto-enable output:", outputErr);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize audio";
      setState((prev) => ({ ...prev, error: errorMessage }));
      console.error("Audio initialization error:", err);
    }
  }, [refreshDevices]);

  // Apply noise reduction settings
  const applyNoiseReductionSettings = useCallback((s: AudioSettings) => {
    if (highPassRef.current && lowPassRef.current && noiseGateRef.current && notchFilterRef.current) {
      if (s.noiseReductionEnabled) {
        const intensity = s.noiseReductionLevel / 100;
        
        // Adjust high-pass frequency (cut more low rumble as intensity increases)
        highPassRef.current.frequency.value = 80 + intensity * 120; // 80-200 Hz
        
        // Adjust low-pass frequency (cut more high hiss as intensity increases)
        lowPassRef.current.frequency.value = 8000 - intensity * 3000; // 8000-5000 Hz
        
        // Adjust noise gate threshold (more aggressive as intensity increases)
        noiseGateRef.current.threshold.value = -50 + intensity * 25; // -50 to -25 dB
        noiseGateRef.current.ratio.value = 12 + intensity * 8; // 12:1 to 20:1
        
        // Enable notch filter for 60Hz hum
        notchFilterRef.current.Q.value = 30;
      } else {
        // Bypass mode - minimal filtering
        highPassRef.current.frequency.value = 20;
        lowPassRef.current.frequency.value = 20000;
        noiseGateRef.current.threshold.value = -100;
        noiseGateRef.current.ratio.value = 1;
        notchFilterRef.current.Q.value = 0.01;
      }
    }
  }, []);

  // Apply accent/voice modification settings
  const applyAccentSettings = useCallback((s: AudioSettings) => {
    if (formantFilterRef.current && highPassRef.current && lowPassRef.current) {
      if (s.accentModifierEnabled) {
        const preset = accentPresetConfigs[s.accentPreset as AccentPresetType] || accentPresetConfigs.neutral;
        
        // Apply formant shift (adjust resonant frequency to shape voice character)
        // Positive formant shift = brighter/more nasal, Negative = warmer/deeper
        const formantShift = s.formantShift !== undefined ? s.formantShift : preset.formantShift;
        const baseFormantFreq = 1000;
        const shiftedFreq = baseFormantFreq * Math.pow(2, formantShift / 24); // Semitone-based shift
        
        formantFilterRef.current.frequency.value = Math.max(200, Math.min(4000, shiftedFreq));
        formantFilterRef.current.Q.value = preset.resonanceQ;
        formantFilterRef.current.gain.value = Math.abs(formantShift) * 0.3; // Subtle boost
        
        // Apply preset-specific filtering
        if (!s.noiseReductionEnabled) {
          // Only apply preset filters if noise reduction isn't already filtering
          highPassRef.current.frequency.value = preset.highPassFreq;
          lowPassRef.current.frequency.value = preset.lowPassFreq;
        }
      } else {
        // Disable accent modification
        formantFilterRef.current.gain.value = 0;
        formantFilterRef.current.Q.value = 0.5;
      }
    }
  }, []);

  // Apply voice enhancement settings (clarity boost, volume normalization)
  const applyEnhancementSettings = useCallback((s: AudioSettings) => {
    if (clarityFilterRef.current && normalizerRef.current) {
      // Apply clarity boost
      const clarityBoost = s.clarityBoost || 0;
      clarityFilterRef.current.gain.value = (clarityBoost / 100) * 6; // Up to 6dB boost
      
      // Apply volume normalization
      if (s.volumeNormalization) {
        normalizerRef.current.threshold.value = -24;
        normalizerRef.current.ratio.value = 4;
      } else {
        normalizerRef.current.threshold.value = 0;
        normalizerRef.current.ratio.value = 1; // Bypass
      }
    }
  }, []);

  // Stop audio processing
  const stop = useCallback(() => {
    // Stop recording if active
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach((track) => track.stop());
      processedStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isInitialized: false,
      isProcessing: false,
      isRecording: false,
      inputLevel: 0,
      outputLevel: 0,
      processedStreamId: null,
      recordingDuration: 0,
    }));
  }, [state.isRecording]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!processedStreamRef.current) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(processedStreamRef.current, {
      mimeType: 'audio/webm;codecs=opus',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start(1000); // Collect data every second
    mediaRecorderRef.current = mediaRecorder;
    recordingStartTimeRef.current = Date.now();

    // Update recording duration
    recordingIntervalRef.current = window.setInterval(() => {
      const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      setState((prev) => ({ ...prev, recordingDuration: duration }));
    }, 1000);

    setState((prev) => ({ ...prev, isRecording: true, recordingDuration: 0 }));
  }, []);

  // Stop recording and return blob
  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(new Blob([]));
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        recordedChunksRef.current = [];
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      setState((prev) => ({ ...prev, isRecording: false }));
    });
  }, []);

  // Download recording
  const downloadRecording = useCallback(async () => {
    const blob = await stopRecording();
    if (blob.size === 0) return null;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `voicepro-recording-${timestamp}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return blob;
  }, [stopRecording]);

  // Update input gain when settings change
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        settings.inputGain / 100,
        audioContextRef.current?.currentTime || 0
      );
    }
  }, [settings.inputGain]);

  // Update output gain when settings change
  useEffect(() => {
    if (outputGainNodeRef.current) {
      outputGainNodeRef.current.gain.setValueAtTime(
        settings.outputGain / 100,
        audioContextRef.current?.currentTime || 0
      );
    }
  }, [settings.outputGain]);

  // Update noise reduction when settings change
  useEffect(() => {
    applyNoiseReductionSettings(settings);
  }, [settings.noiseReductionEnabled, settings.noiseReductionLevel, applyNoiseReductionSettings, settings]);

  // Update accent settings when they change
  useEffect(() => {
    applyAccentSettings(settings);
  }, [settings.accentModifierEnabled, settings.accentPreset, settings.formantShift, applyAccentSettings, settings]);

  // Update enhancement settings when they change
  useEffect(() => {
    applyEnhancementSettings(settings);
  }, [settings.clarityBoost, settings.volumeNormalization, applyEnhancementSettings, settings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Get processed stream for output
  const getProcessedStream = useCallback((): MediaStream | null => {
    return processedStreamRef.current;
  }, []);
  
  // Enable audio output to a specific device (for virtual cable routing)
  const enableOutput = useCallback(async (deviceId?: string) => {
    if (!processedStreamRef.current) {
      console.error("VoicePro: No processed stream available");
      return false;
    }

    try {
      // Create or reuse audio element
      if (!audioOutputRef.current) {
        audioOutputRef.current = new Audio();
        audioOutputRef.current.autoplay = true;
      }

      // Set the processed stream as source
      audioOutputRef.current.srcObject = processedStreamRef.current;

      // Try to set output device if specified and browser supports it
      if (deviceId && 'setSinkId' in audioOutputRef.current) {
        try {
          await (audioOutputRef.current as any).setSinkId(deviceId);
          console.log("VoicePro: Audio output set to device:", deviceId);
          setState(prev => ({ ...prev, outputDeviceId: deviceId }));
        } catch (sinkErr) {
          console.warn("VoicePro: Could not set output device, using default:", sinkErr);
        }
      }

      // Start playback
      await audioOutputRef.current.play();
      
      setState(prev => ({ ...prev, isOutputEnabled: true }));
      console.log("VoicePro: Audio output enabled - processed audio now playing to system output");
      return true;
    } catch (err) {
      console.error("VoicePro: Failed to enable audio output:", err);
      return false;
    }
  }, []);

  // Disable audio output
  const disableOutput = useCallback(() => {
    if (audioOutputRef.current) {
      audioOutputRef.current.pause();
      audioOutputRef.current.srcObject = null;
    }
    setState(prev => ({ ...prev, isOutputEnabled: false, outputDeviceId: null }));
    console.log("VoicePro: Audio output disabled");
  }, []);

  // Change output device
  const setOutputDevice = useCallback(async (deviceId: string) => {
    if (audioOutputRef.current && 'setSinkId' in audioOutputRef.current) {
      try {
        await (audioOutputRef.current as any).setSinkId(deviceId);
        setState(prev => ({ ...prev, outputDeviceId: deviceId }));
        console.log("VoicePro: Output device changed to:", deviceId);
        return true;
      } catch (err) {
        console.error("VoicePro: Failed to change output device:", err);
        return false;
      }
    }
    return false;
  }, []);

  // Get analyser data for visualization
  const getAnalyserData = useCallback(() => {
    if (!analyserNodeRef.current) return null;
    const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
    analyserNodeRef.current.getByteFrequencyData(dataArray);
    return dataArray;
  }, []);

  return {
    ...state,
    devices,
    processedStream: processedStreamRef.current,
    initialize,
    stop,
    refreshDevices,
    getProcessedStream,
    getAnalyserData,
    enableOutput,
    disableOutput,
    setOutputDevice,
    startRecording,
    stopRecording,
    downloadRecording,
  };
}

export type UseAudioProcessorReturn = ReturnType<typeof useAudioProcessor>;
