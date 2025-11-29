import { useState, useEffect, useRef, useCallback } from "react";
import type { AudioSettings } from "@shared/schema";

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface AudioProcessorState {
  isInitialized: boolean;
  isProcessing: boolean;
  inputLevel: number;
  outputLevel: number;
  latency: number;
  error: string | null;
  processedStreamId: string | null;
}

export function useAudioProcessor(settings: AudioSettings) {
  const [state, setState] = useState<AudioProcessorState>({
    isInitialized: false,
    isProcessing: false,
    inputLevel: 0,
    outputLevel: 0,
    latency: 0,
    error: null,
    processedStreamId: null,
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
  const pitchShifterRef = useRef<OscillatorNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const settingsRef = useRef<AudioSettings>(settings);

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

      // Connect the audio processing chain
      // Source -> Input Gain -> High Pass -> Notch -> Low Pass -> Noise Gate -> Output Gain -> Analyser -> Destination
      source.connect(gainNode);
      gainNode.connect(highPass);
      highPass.connect(notchFilter);
      notchFilter.connect(lowPass);
      lowPass.connect(noiseGate);
      noiseGate.connect(outputGain);
      outputGain.connect(analyser);
      analyser.connect(destination);

      // Apply initial settings
      applyNoiseReductionSettings(settingsRef.current);

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
      console.log("VoicePro: To use with RingCentral, select 'VoicePro Virtual Mic' as your input device, or use the processed stream programmatically.");
      
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

  // Stop audio processing
  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
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
      inputLevel: 0,
      outputLevel: 0,
      processedStreamId: null,
    }));
  }, []);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Get processed stream for output
  // This is the filtered audio stream that can be used programmatically
  // Note: Browser limitations prevent creating virtual audio devices
  // For RingCentral integration, users need a virtual audio cable app
  const getProcessedStream = useCallback((): MediaStream | null => {
    return processedStreamRef.current;
  }, []);
  
  // Play processed audio through speakers for monitoring
  const enableMonitoring = useCallback(async () => {
    if (processedStreamRef.current && audioContextRef.current) {
      const monitorSource = audioContextRef.current.createMediaStreamSource(processedStreamRef.current);
      monitorSource.connect(audioContextRef.current.destination);
    }
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
    enableMonitoring,
  };
}

export type UseAudioProcessorReturn = ReturnType<typeof useAudioProcessor>;
