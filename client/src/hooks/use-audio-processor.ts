import { useState, useEffect, useRef, useCallback } from "react";
import type { AudioSettings, AccentPresetType } from "@shared/schema";
import { accentPresetConfigs } from "@shared/schema";

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export type OutputRouteStatus =
  | "inactive"
  | "active"
  | "blocked"
  | "failed"
  | "unsupported";

export type SelfTestStepStatus = "ok" | "warn" | "fail" | "skip";

export interface SelfTestStep {
  id: string;
  name: string;
  status: SelfTestStepStatus;
  message?: string;
  details?: Record<string, unknown>;
}

export interface SelfTestReport {
  createdAt: string;
  overallStatus: SelfTestStepStatus;
  steps: SelfTestStep[];
  details?: {
    audioContextState?: string;
    sampleRate?: number;
    rawTracks?: number;
    processedTracks?: number;
    streamActive?: boolean;
    processedStreamActive?: boolean;
    setSinkIdSupported?: boolean;
    selectedOutputDeviceId?: string | null;
    selectedOutputDeviceLabel?: string | null;
    outputDevices?: Array<{ deviceId: string; label: string; isVirtual: boolean }>;
    levels?: { inputLevel: number; outputLevel: number };
  };
}

interface AudioProcessorState {
  isInitialized: boolean;
  isProcessing: boolean;
  isRecording: boolean;
  isOutputEnabled: boolean;
  isMonitorEnabled: boolean;
  isVirtualOutputEnabled: boolean;
  setSinkIdSupported: boolean | null;
  monitorStatus: OutputRouteStatus;
  virtualStatus: OutputRouteStatus;
  monitorError: string | null;
  virtualError: string | null;
  inputLevel: number;
  outputLevel: number;
  latency: number;
  error: string | null;
  processedStreamId: string | null;
  recordingDuration: number;
  outputDeviceId: string | null;
  selfTestReport: SelfTestReport | null;
  selfTestRecordingUrl: string | null;
  isSelfTesting: boolean;
}

export function useAudioProcessor(settings: AudioSettings) {
  const [state, setState] = useState<AudioProcessorState>({
    isInitialized: false,
    isProcessing: false,
    isRecording: false,
    isOutputEnabled: false,
    isMonitorEnabled: false,
    isVirtualOutputEnabled: false,
    setSinkIdSupported: null,
    monitorStatus: "inactive",
    virtualStatus: "inactive",
    monitorError: null,
    virtualError: null,
    inputLevel: 0,
    outputLevel: 0,
    latency: 0,
    error: null,
    processedStreamId: null,
    recordingDuration: 0,
    outputDeviceId: null,
    selfTestReport: null,
    selfTestRecordingUrl: null,
    isSelfTesting: false,
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
  // Multiple formant filters for voice character shaping (F1, F2, F3)
  const formantFilter1Ref = useRef<BiquadFilterNode | null>(null);
  const formantFilter2Ref = useRef<BiquadFilterNode | null>(null);
  const formantFilter3Ref = useRef<BiquadFilterNode | null>(null);
  // Voice body filter for warmth/brightness
  const voiceBodyFilterRef = useRef<BiquadFilterNode | null>(null);
  const clarityFilterRef = useRef<BiquadFilterNode | null>(null);
  const normalizerRef = useRef<DynamicsCompressorNode | null>(null);
  const pitchShifterNodeRef = useRef<AudioWorkletNode | null>(null);
  const pitchShifterLoadedRef = useRef<boolean>(false);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const settingsRef = useRef<AudioSettings>(settings);
  
  // Audio output element for routing to a virtual cable (for any call app)
  const audioOutputRef = useRef<HTMLAudioElement | null>(null);
  // Monitor output element for routing to speakers (so user can hear themselves)
  const monitorOutputRef = useRef<HTMLAudioElement | null>(null);
  
  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<number | null>(null);
  const selfTestRecordingUrlRef = useRef<string | null>(null);

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
      console.error("VoxFilter: enumerateDevices failed:", err);
      setState((prev) => ({ 
        ...prev, 
        error: "Could not access audio devices. Please check permissions." 
      }));
    }
  }, []);

  // Stop audio processing (hard cleanup; safe to call after partial init failures)
  const stop = useCallback((errorOverride?: string | null) => {
    // Stop recording if active
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      } catch (error) {
        console.error("VoxFilter: Error stopping media recorder:", error);
      }
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    // Stop audio outputs (both monitor and virtual cable)
    if (monitorOutputRef.current) {
      monitorOutputRef.current.pause();
      monitorOutputRef.current.srcObject = null;
      monitorOutputRef.current = null;
    }
    if (audioOutputRef.current) {
      audioOutputRef.current.pause();
      audioOutputRef.current.srcObject = null;
      audioOutputRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach((track) => track.stop());
      processedStreamRef.current = null;
    }

    // Disconnect all audio nodes before closing context
    try {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      if (highPassRef.current) {
        highPassRef.current.disconnect();
        highPassRef.current = null;
      }
      if (lowPassRef.current) {
        lowPassRef.current.disconnect();
        lowPassRef.current = null;
      }
      if (notchFilterRef.current) {
        notchFilterRef.current.disconnect();
        notchFilterRef.current = null;
      }
      if (noiseGateRef.current) {
        noiseGateRef.current.disconnect();
        noiseGateRef.current = null;
      }
      if (formantFilter1Ref.current) {
        formantFilter1Ref.current.disconnect();
        formantFilter1Ref.current = null;
      }
      if (formantFilter2Ref.current) {
        formantFilter2Ref.current.disconnect();
        formantFilter2Ref.current = null;
      }
      if (formantFilter3Ref.current) {
        formantFilter3Ref.current.disconnect();
        formantFilter3Ref.current = null;
      }
      if (voiceBodyFilterRef.current) {
        voiceBodyFilterRef.current.disconnect();
        voiceBodyFilterRef.current = null;
      }
      if (clarityFilterRef.current) {
        clarityFilterRef.current.disconnect();
        clarityFilterRef.current = null;
      }
      if (normalizerRef.current) {
        normalizerRef.current.disconnect();
        normalizerRef.current = null;
      }
      if (pitchShifterNodeRef.current) {
        pitchShifterNodeRef.current.disconnect();
        pitchShifterNodeRef.current = null;
      }
      if (outputGainNodeRef.current) {
        outputGainNodeRef.current.disconnect();
        outputGainNodeRef.current = null;
      }
      if (analyserNodeRef.current) {
        analyserNodeRef.current.disconnect();
        analyserNodeRef.current = null;
      }
      if (destinationRef.current) {
        destinationRef.current.disconnect();
        destinationRef.current = null;
      }
    } catch (error) {
      console.error("VoxFilter: Error disconnecting audio nodes:", error);
    }

    // Close the audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch((error) => {
        console.error("VoxFilter: Error closing audio context:", error);
      });
      audioContextRef.current = null;
    }

    // Revoke any self-test recording URL to avoid leaks
    if (selfTestRecordingUrlRef.current) {
      try {
        URL.revokeObjectURL(selfTestRecordingUrlRef.current);
      } catch {
        // ignore
      }
      selfTestRecordingUrlRef.current = null;
    }

    console.log("VoxFilter: stop()", { error: errorOverride ?? null });

    setState((prev) => ({
      ...prev,
      isInitialized: false,
      isProcessing: false,
      isRecording: false,
      isOutputEnabled: false,
      error: errorOverride ?? null,
      isMonitorEnabled: false,
      isVirtualOutputEnabled: false,
      monitorStatus: "inactive",
      virtualStatus: "inactive",
      monitorError: null,
      virtualError: null,
      outputDeviceId: null,
      inputLevel: 0,
      outputLevel: 0,
      processedStreamId: null,
      recordingDuration: 0,
      selfTestReport: null,
      selfTestRecordingUrl: null,
      isSelfTesting: false,
    }));
  }, []);

  // Initialize audio context and get user media
  const initialize = useCallback(async () => {
    try {
      // CRITICAL FIX: Prevent concurrent initializations
      if (audioContextRef.current) {
        console.warn("VoxFilter: Already initialized. Call stop() first.");
        return;
      }

      // Cancel any existing animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }

      setState((prev) => ({ ...prev, error: null }));
      
      // Smart input device selection: avoid virtual cable devices as input
      let selectedInputDeviceId = settingsRef.current.inputDeviceId;
      
      if (!selectedInputDeviceId) {
        // No device explicitly selected - try to find the real physical microphone
        // First, request temporary permission to get device labels
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach(t => t.stop());
        } catch {
          // Permission denied will be caught later
        }
        
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const inputDevices = allDevices.filter(d => d.kind === "audioinput");
        
        // Virtual cable patterns to AVOID as input sources
        const virtualCablePatterns = [
          /cable\s*output/i,
          /vb-audio/i,
          /virtual\s*cable/i,
          /blackhole/i,
          /soundflower/i,
          /voicemeeter/i,
        ];
        
        const isVirtualDevice = (label: string) => 
          virtualCablePatterns.some(pattern => pattern.test(label));
        
        // Find a real physical microphone (not a virtual cable)
        const physicalMic = inputDevices.find(d => d.label && !isVirtualDevice(d.label));
        
        if (physicalMic) {
          selectedInputDeviceId = physicalMic.deviceId;
          console.log("VoxFilter: Auto-selected physical microphone:", physicalMic.label);
        } else if (inputDevices.length > 0) {
          // Fallback: just use the first available device
          console.warn("VoxFilter: No physical microphone detected, using first available input device");
        }
      }
      
      // Request microphone access with noise suppression handled by Web Audio
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedInputDeviceId ? { exact: selectedInputDeviceId } : undefined,
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
      // Multiple formant filters for dramatic voice character shaping
      // F1 (300-800 Hz) - Controls warmth/body of voice
      const formantFilter1 = audioContext.createBiquadFilter();
      formantFilter1.type = "peaking";
      formantFilter1.frequency.value = 500;
      formantFilter1.Q.value = 2;
      formantFilter1.gain.value = 0;
      formantFilter1Ref.current = formantFilter1;

      // F2 (800-2500 Hz) - Controls brightness/nasality
      const formantFilter2 = audioContext.createBiquadFilter();
      formantFilter2.type = "peaking";
      formantFilter2.frequency.value = 1500;
      formantFilter2.Q.value = 2;
      formantFilter2.gain.value = 0;
      formantFilter2Ref.current = formantFilter2;

      // F3 (2500-3500 Hz) - Controls articulation clarity
      const formantFilter3 = audioContext.createBiquadFilter();
      formantFilter3.type = "peaking";
      formantFilter3.frequency.value = 2800;
      formantFilter3.Q.value = 2;
      formantFilter3.gain.value = 0;
      formantFilter3Ref.current = formantFilter3;

      // Voice body filter - Shelving filter for overall warmth/brightness
      const voiceBodyFilter = audioContext.createBiquadFilter();
      voiceBodyFilter.type = "lowshelf";
      voiceBodyFilter.frequency.value = 300;
      voiceBodyFilter.gain.value = 0;
      voiceBodyFilterRef.current = voiceBodyFilter;

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

      // Load AudioWorklet pitch shifter
      let pitchShifterNode: AudioWorkletNode | null = null;
      if (!pitchShifterLoadedRef.current) {
        try {
          await audioContext.audioWorklet.addModule('/pitch-shifter-processor.js');
          pitchShifterLoadedRef.current = true;
          console.log("VoxFilter: AudioWorklet pitch-shifter loaded");
        } catch (err) {
          console.warn("VoxFilter: AudioWorklet pitch-shifter failed to load, pitch shifting disabled:", err);
        }
      }
      
      if (pitchShifterLoadedRef.current) {
        try {
          pitchShifterNode = new AudioWorkletNode(audioContext, 'pitch-shifter-processor');
          pitchShifterNodeRef.current = pitchShifterNode;
          console.log("VoxFilter: Pitch shifter node created");
        } catch (err) {
          console.warn("VoxFilter: Pitch shifter node creation failed:", err);
        }
      }

      // Connect the full audio processing chain
      // Source -> Input Gain -> High Pass -> Notch -> Low Pass -> Noise Gate -> 
      // Pitch Shifter -> Voice Body -> F1 -> F2 -> F3 -> Clarity Filter -> Normalizer -> Output Gain -> Analyser -> Destination
      source.connect(gainNode);
      gainNode.connect(highPass);
      highPass.connect(notchFilter);
      notchFilter.connect(lowPass);
      lowPass.connect(noiseGate);
      
      if (pitchShifterNode) {
        noiseGate.connect(pitchShifterNode);
        pitchShifterNode.connect(voiceBodyFilter);
      } else {
        noiseGate.connect(voiceBodyFilter);
      }
      
      voiceBodyFilter.connect(formantFilter1);
      formantFilter1.connect(formantFilter2);
      formantFilter2.connect(formantFilter3);
      formantFilter3.connect(clarityFilter);
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

      const rawTracks = stream.getAudioTracks().length;
      const processedTracks = destination.stream.getAudioTracks().length;

      // Prepare output elements (no auto-play; user gesture required)
      if (!monitorOutputRef.current) monitorOutputRef.current = new Audio();
      monitorOutputRef.current.srcObject = destination.stream;
      monitorOutputRef.current.volume = 0.5;

      if (!audioOutputRef.current) audioOutputRef.current = new Audio();
      audioOutputRef.current.srcObject = destination.stream;

      const setSinkIdSupported = typeof (audioOutputRef.current as any)?.setSinkId === "function";

      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isProcessing: true,
        latency: Math.max(10, Math.round(latency)),
        processedStreamId: destination.stream.id,
        // Output routing is explicit. We never claim it's active until a user gesture successfully plays.
        isOutputEnabled: false,
        isMonitorEnabled: false,
        isVirtualOutputEnabled: false,
        setSinkIdSupported,
        monitorStatus: "inactive",
        virtualStatus: setSinkIdSupported ? "inactive" : "unsupported",
        monitorError: null,
        virtualError: null,
        outputDeviceId: null,
        selfTestRecordingUrl: null,
      }));

      await refreshDevices();

      console.log("VoxFilter: initialize() success", {
        audioContextState: audioContext.state,
        sampleRate: audioContext.sampleRate,
        rawTracks,
        processedTracks,
        processedStreamId: destination.stream.id,
        setSinkIdSupported,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize audio";
      console.error("VoxFilter: initialize() failed:", err);
      // IMPORTANT: Cleanup ALWAYS so users can retry without refresh.
      stop(errorMessage);
      throw err instanceof Error ? err : new Error(errorMessage);
    }
  }, [refreshDevices, stop]);

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

      // Minimal, structured log (one per setting change).
      console.log("VoxFilter: noiseReduction applied", {
        enabled: s.noiseReductionEnabled,
        level: s.noiseReductionLevel,
        hpHz: Math.round(highPassRef.current.frequency.value),
        lpHz: Math.round(lowPassRef.current.frequency.value),
        gateThresholdDb: Number(noiseGateRef.current.threshold.value.toFixed(2)),
        gateRatio: Number(noiseGateRef.current.ratio.value.toFixed(2)),
        notchQ: Number(notchFilterRef.current.Q.value.toFixed(2)),
      });
    }
  }, []);

  // Apply accent/voice modification settings - EXTREME effects for obvious change
  const applyAccentSettings = useCallback((s: AudioSettings) => {
    const f1 = formantFilter1Ref.current;
    const f2 = formantFilter2Ref.current;
    const f3 = formantFilter3Ref.current;
    const vb = voiceBodyFilterRef.current;
    const hp = highPassRef.current;
    const lp = lowPassRef.current;
    
    if (!f1 || !f2 || !f3 || !vb) {
      console.warn("VoxFilter: applyAccentSettings skipped (nodes not ready)");
      return;
    }
    
    if (s.accentModifierEnabled) {
      const preset = accentPresetConfigs[s.accentPreset as AccentPresetType] || accentPresetConfigs.neutral;
      const formantShift = s.formantShift !== undefined ? s.formantShift : preset.formantShift;
      const pitchShift = s.pitchShift !== undefined ? s.pitchShift : preset.pitchShift;
      
      // Apply real pitch shifting via AudioWorklet
      if (pitchShifterNodeRef.current) {
        const pitchRatio = Math.pow(2, pitchShift / 12);
        pitchShifterNodeRef.current.port.postMessage({ type: 'setPitchRatio', value: pitchRatio });
        console.log("VoxFilter: pitch shift applied", { semitones: pitchShift, ratio: pitchRatio.toFixed(4) });
      }
      
      // Formant shifting via EQ filters
      // formantShift ranges from -50 to +50
      
      // For "deeper" voice (negative shift): Boost bass, cut highs, lower formants
      // For "higher" voice (positive shift): Cut bass, boost highs, raise formants
      
      if (formantShift < 0) {
        // DEEPER VOICE - make it sound like a big guy/monster
        const intensity = Math.abs(formantShift) / 50; // 0 to 1
        
        // Massive bass boost at 200Hz
        f1.type = "lowshelf";
        f1.frequency.value = 200;
        f1.gain.value = intensity * 15; // Up to +15dB bass boost!
        
        // Cut the mid frequencies to remove nasality
        f2.type = "peaking";
        f2.frequency.value = 1200;
        f2.Q.value = 1;
        f2.gain.value = -intensity * 8; // Cut mids
        
        // Cut highs for darker sound
        f3.type = "highshelf";
        f3.frequency.value = 3000;
        f3.gain.value = -intensity * 12; // Cut highs significantly
        
        // Additional low boost
        vb.type = "lowshelf";
        vb.frequency.value = 300;
        vb.gain.value = intensity * 12;
        
        // Cut high frequencies hard
        if (lp) lp.frequency.value = 4000 + (1 - intensity) * 4000; // 4000-8000Hz
        if (hp) hp.frequency.value = 50; // Let all bass through
        
      } else if (formantShift > 0) {
        // HIGHER VOICE - make it sound thinner/brighter
        const intensity = formantShift / 50; // 0 to 1
        
        // Cut bass significantly
        f1.type = "lowshelf";
        f1.frequency.value = 300;
        f1.gain.value = -intensity * 15; // Cut bass hard
        
        // Boost upper mids for presence
        f2.type = "peaking";
        f2.frequency.value = 2500;
        f2.Q.value = 1;
        f2.gain.value = intensity * 8;
        
        // Boost highs for brightness
        f3.type = "highshelf";
        f3.frequency.value = 4000;
        f3.gain.value = intensity * 10;
        
        // Cut lows more
        vb.type = "highpass";
        vb.frequency.value = 200 + intensity * 200;
        vb.gain.value = 0;
        
        // Open up the high frequencies
        if (lp) lp.frequency.value = 12000;
        if (hp) hp.frequency.value = 100 + intensity * 150; // 100-250Hz
        
      } else {
        // Neutral - minimal effect
        f1.type = "peaking";
        f1.frequency.value = 500;
        f1.Q.value = 1;
        f1.gain.value = 0;
        
        f2.type = "peaking";
        f2.frequency.value = 1500;
        f2.Q.value = 1;
        f2.gain.value = 0;
        
        f3.type = "peaking";
        f3.frequency.value = 2800;
        f3.Q.value = 1;
        f3.gain.value = 0;
        
        vb.type = "lowshelf";
        vb.frequency.value = 250;
        vb.gain.value = 0;
      }

      // Minimal, structured log (one per setting change).
      console.log("VoxFilter: accent applied", {
        preset: s.accentPreset,
        formantShift,
        pitchShift,
        f1: { type: f1.type, freqHz: Math.round(f1.frequency.value), gainDb: Number(f1.gain.value.toFixed(2)) },
        f2: { type: f2.type, freqHz: Math.round(f2.frequency.value), gainDb: Number(f2.gain.value.toFixed(2)) },
        f3: { type: f3.type, freqHz: Math.round(f3.frequency.value), gainDb: Number(f3.gain.value.toFixed(2)) },
        body: { type: vb.type, freqHz: Math.round(vb.frequency.value), gainDb: Number(vb.gain.value.toFixed(2)) },
        hpHz: hp ? Math.round(hp.frequency.value) : null,
        lpHz: lp ? Math.round(lp.frequency.value) : null,
      });
      
    } else {
      // Disable all voice modification - reset formant filters to flat
      // CRITICAL FIX: Only reset formant filters, NOT highPass/lowPass
      // Those filters are owned by noise reduction system!
      if (f1) {
        f1.type = "peaking";
        f1.gain.value = 0;
        f1.Q.value = 1;
      }
      
      if (f2) {
        f2.type = "peaking";
        f2.gain.value = 0;
        f2.Q.value = 1;
      }
      
      if (f3) {
        f3.type = "peaking";
        f3.gain.value = 0;
        f3.Q.value = 1;
      }
      
      if (vb) {
        vb.type = "lowshelf";
        vb.gain.value = 0;
      }
      
      // Reset pitch shifter to normal
      if (pitchShifterNodeRef.current) {
        pitchShifterNodeRef.current.port.postMessage({ type: 'setPitchRatio', value: 1.0 });
      }
      
      console.log("VoxFilter: accent disabled");
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

  // Start recording
  const startRecording = useCallback(() => {
    try {
      const trackCount = processedStreamRef.current?.getAudioTracks?.().length ?? 0;
      console.log("VoxFilter: startRecording() called. processedStream tracks:", trackCount);
    } catch {
      // ignore
    }
    if (!processedStreamRef.current) {
      console.warn("VoxFilter: Cannot record - processed stream not ready yet");
      setState((prev) => ({ ...prev, error: "Recording unavailable: audio processing not ready yet." }));
      return;
    }

    try {
      recordedChunksRef.current = [];

      // Prefer Opus-in-WebM, but fall back gracefully (prevents crashes in some environments).
      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm'];
      const chosenType = preferredTypes.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t));
      console.log("VoxFilter: MediaRecorder chosenType:", chosenType || "(default)");

      const mediaRecorder = new MediaRecorder(
        processedStreamRef.current,
        chosenType ? { mimeType: chosenType } : undefined
      );

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("VoxFilter: MediaRecorder error:", event);
        setState((prev) => ({ ...prev, error: "Recording error: MediaRecorder failed. See console for details." }));
      };

      // In some Chromium/automation environments, audio-only MediaRecorder with timeslice
      // can yield no chunks. Rely on the final dataavailable fired on stop().
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();

      // Update recording duration
      recordingIntervalRef.current = window.setInterval(() => {
        const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setState((prev) => ({ ...prev, recordingDuration: duration }));
      }, 1000);

      console.log("VoxFilter: Recording started, updating UI state");
      setState((prev) => ({ ...prev, isRecording: true, recordingDuration: 0, error: null }));
    } catch (error) {
      console.error("VoxFilter: Failed to start recording:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? `Recording failed: ${error.message}` : "Recording failed to start.",
      }));
    }
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
        console.log(
          "VoxFilter: stopRecording() complete. chunks:",
          recordedChunksRef.current.length,
          "blob.size:",
          blob.size
        );
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

  // Update noise reduction when settings change - ONLY if processing is active
  useEffect(() => {
    if (audioContextRef.current && state.isProcessing) {
      applyNoiseReductionSettings(settings);
    }
  }, [settings.noiseReductionEnabled, settings.noiseReductionLevel, applyNoiseReductionSettings, state.isProcessing]);

  // Update accent settings when they change - ONLY if processing is active
  useEffect(() => {
    if (audioContextRef.current && state.isProcessing) {
      applyAccentSettings(settings);
    }
  }, [settings.accentModifierEnabled, settings.accentPreset, settings.formantShift, applyAccentSettings, state.isProcessing]);

  // Update enhancement settings when they change - ONLY if processing is active
  useEffect(() => {
    if (audioContextRef.current && state.isProcessing) {
      applyEnhancementSettings(settings);
    }
  }, [settings.clarityBoost, settings.volumeNormalization, applyEnhancementSettings, state.isProcessing]);

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

  const isVirtualCableLabel = useCallback((label: string) => {
    const l = label.toLowerCase();
    return (
      l.includes("cable input") ||
      l.includes("vb-audio") ||
      l.includes("blackhole") ||
      l.includes("black hole") ||
      l.includes("loopback") ||
      l.includes("virtual")
    );
  }, []);

  const recordProcessedForMs = useCallback(async (ms: number): Promise<Blob> => {
    if (!processedStreamRef.current) throw new Error("No processed stream");
    if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder not available");

    const preferredTypes = ["audio/webm;codecs=opus", "audio/webm"];
    const chosenType = preferredTypes.find((t) => MediaRecorder.isTypeSupported?.(t));

    return await new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(
          processedStreamRef.current as MediaStream,
          chosenType ? { mimeType: chosenType } : undefined
        );
      } catch (e) {
        reject(e);
        return;
      }

      const timer = window.setTimeout(() => {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }, ms);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };

      recorder.onerror = (event) => {
        window.clearTimeout(timer);
        reject(event);
      };

      recorder.onstop = () => {
        window.clearTimeout(timer);
        resolve(new Blob(chunks, { type: "audio/webm" }));
      };

      recorder.start();
    });
  }, []);

  // Enable audio output to a specific device (for virtual cable routing)
  const enableOutput = useCallback(async (deviceId?: string) => {
    if (!processedStreamRef.current) {
      console.error("VoxFilter: No processed stream available");
      return false;
    }

    try {
      const electronApi = typeof window !== "undefined" ? (window as any).electronAPI : null;
      const canSetAppOutputDevice = typeof electronApi?.audio?.setAppOutputDevice === "function";

      // 1) Local monitor (optional): lets the user hear processed audio.
      let monitorEnabled = false;
      let monitorStatus: OutputRouteStatus = "inactive";
      let monitorError: string | null = null;

      if (monitorOutputRef.current) {
        try {
          monitorOutputRef.current.volume = 0.5; // prevent feedback
          await monitorOutputRef.current.play();
          monitorEnabled = true;
          monitorStatus = "active";
        } catch (e) {
          const name = (e as any)?.name;
          monitorStatus = name === "NotAllowedError" ? "blocked" : "failed";
          monitorError =
            name === "NotAllowedError"
              ? "Playback blocked by browser. Click 'Enable Audio Output' again, then allow autoplay if prompted."
              : "Monitor playback failed. See console for details.";
          console.warn("VoxFilter: monitor play() failed:", e);
        }
      }

      // 2) Virtual cable output (for call apps): must set sink + play.
      const targetDeviceId = deviceId ?? null;
      const out = audioOutputRef.current ?? new Audio();
      audioOutputRef.current = out;
      out.srcObject = processedStreamRef.current;

      const setSinkIdSupported = typeof (out as any)?.setSinkId === "function";
      let virtualEnabled = false;
      let virtualStatus: OutputRouteStatus = setSinkIdSupported ? "inactive" : "unsupported";
      let virtualError: string | null = null;
      let routingMode: "electron" | "setSinkId" | null = null;

      if (!targetDeviceId) {
        virtualStatus = "failed";
        virtualError = "Select a virtual cable output device (VB-Audio CABLE Input / BlackHole) first.";
      } else {
        // Prefer Electron-native routing when available, but fall back to setSinkId.
        // This prevents Electron `setAudioOutputDevice` failures from hard-blocking output routing when
        // Chromium `setSinkId` would still work (common on some Windows setups).
        let routed = false;
        let lastRouteError: unknown = null;

        if (canSetAppOutputDevice) {
          try {
            const ok = await electronApi.audio.setAppOutputDevice(targetDeviceId);
            if (!ok) throw new Error("setAppOutputDevice returned false");
            routed = true;
            routingMode = "electron";
            console.log("VoxFilter: electron setAudioOutputDevice OK", { deviceId: targetDeviceId });
          } catch (e) {
            lastRouteError = e;
            console.warn("VoxFilter: electron setAudioOutputDevice failed; trying setSinkId fallback:", e);
          }
        }

        if (!routed && setSinkIdSupported) {
          try {
            await (out as any).setSinkId(targetDeviceId);
            routed = true;
            routingMode = "setSinkId";
            console.log("VoxFilter: setSinkId OK", { deviceId: targetDeviceId });
          } catch (e) {
            lastRouteError = e;
            virtualStatus = "failed";
            virtualError = "Failed to set output device (setSinkId). See console for details.";
            console.error("VoxFilter: setSinkId failed:", e);
          }
        }

        if (!routed && !setSinkIdSupported && virtualStatus !== "failed") {
          virtualStatus = "unsupported";
          virtualError =
            "Your environment does not support output device routing (setSinkId). Use Chrome/Edge on https/localhost.";
        }

        if (!routed && virtualStatus !== "failed" && virtualStatus !== "unsupported") {
          virtualStatus = "failed";
          virtualError = "Desktop output routing failed. See console for details.";
          console.error("VoxFilter: output routing failed:", lastRouteError);
        }

        if (virtualStatus !== "failed" && virtualStatus !== "unsupported") {
          try {
            await out.play();
            virtualEnabled = true;
            virtualStatus = "active";
            virtualError = null;
          } catch (e) {
            const name = (e as any)?.name;
            virtualStatus = name === "NotAllowedError" ? "blocked" : "failed";
            virtualError =
              name === "NotAllowedError"
                ? "Playback blocked by browser. Click 'Enable Audio Output' to allow audio output."
                : "Virtual output playback failed. See console for details.";
            console.error("VoxFilter: virtual play() failed:", e);
          }
        }
      }

      setState((prev) => ({
        ...prev,
        setSinkIdSupported,
        isMonitorEnabled: monitorEnabled,
        monitorStatus,
        monitorError,
        isVirtualOutputEnabled: virtualEnabled,
        virtualStatus,
        virtualError,
        // Back-compat: this flag now means "virtual cable routing is active"
        isOutputEnabled: virtualEnabled,
        outputDeviceId: targetDeviceId,
      }));

      console.log("VoxFilter: enableOutput() result", {
        monitor: { enabled: monitorEnabled, status: monitorStatus },
        virtual: { enabled: virtualEnabled, status: virtualStatus, deviceId: targetDeviceId, routingMode },
        setSinkIdSupported,
      });

      return virtualEnabled;
    } catch (err) {
      console.error("VoxFilter: Failed to enable audio output:", err);
      return false;
    }
  }, []);

  // Disable audio output
  const disableOutput = useCallback(() => {
    const electronApi = typeof window !== "undefined" ? (window as any).electronAPI : null;
    const canSetAppOutputDevice = typeof electronApi?.audio?.setAppOutputDevice === "function";

    if (canSetAppOutputDevice) {
      try {
        // Reset to default device for this window (best-effort).
        void electronApi.audio.setAppOutputDevice("default");
      } catch {
        // ignore
      }
    }

    // Stop monitor audio
    if (monitorOutputRef.current) {
      monitorOutputRef.current.pause();
    }
    
    // Stop virtual cable output
    if (audioOutputRef.current) {
      audioOutputRef.current.pause();
      audioOutputRef.current.srcObject = null;
    }
    
    setState((prev) => ({
      ...prev,
      isOutputEnabled: false,
      isMonitorEnabled: false,
      isVirtualOutputEnabled: false,
      monitorStatus: "inactive",
      virtualStatus: prev.setSinkIdSupported ? "inactive" : "unsupported",
      monitorError: null,
      virtualError: null,
      outputDeviceId: null,
    }));
    console.log("VoxFilter: disableOutput()");
  }, []);

  // Change output device
  const setOutputDevice = useCallback(async (deviceId: string) => {
    if (deviceId === "default") {
      // Treat "default" as clearing the virtual routing selection.
      if (audioOutputRef.current) {
        try {
          audioOutputRef.current.pause();
        } catch {
          // ignore
        }
      }
      setState((prev) => ({
        ...prev,
        outputDeviceId: null,
        isVirtualOutputEnabled: false,
        isOutputEnabled: false,
        virtualStatus: prev.setSinkIdSupported ? "inactive" : "unsupported",
        virtualError: null,
      }));
      console.log("VoxFilter: setOutputDevice() cleared (default)");
      return true;
    }

    // Always store the selection (even if setSinkId unsupported)
    setState((prev) => ({ ...prev, outputDeviceId: deviceId }));

    const out = audioOutputRef.current;
    if (out && typeof (out as any)?.setSinkId === "function") {
      try {
        await (out as any).setSinkId(deviceId);
        setState((prev) => ({
          ...prev,
          setSinkIdSupported: true,
          virtualStatus: prev.isVirtualOutputEnabled ? "active" : "inactive",
          virtualError: null,
        }));
        console.log("VoxFilter: setOutputDevice() OK", { deviceId });
        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          setSinkIdSupported: true,
          virtualStatus: "failed",
          virtualError: "Failed to set output device (setSinkId). See console for details.",
        }));
        console.error("VoxFilter: setOutputDevice() failed:", err);
        return false;
      }
    }
    setState((prev) => ({
      ...prev,
      setSinkIdSupported: out ? typeof (out as any)?.setSinkId === "function" : prev.setSinkIdSupported,
      virtualStatus: out ? prev.virtualStatus : prev.virtualStatus,
    }));
    return false;
  }, []);

  const runSelfTest = useCallback(
    async (opts?: { outputDeviceId?: string | null }) => {
      const createdAt = new Date().toISOString();
      // Clear any previous self-test recording URL
      if (selfTestRecordingUrlRef.current) {
        try {
          URL.revokeObjectURL(selfTestRecordingUrlRef.current);
        } catch {
          // ignore
        }
        selfTestRecordingUrlRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        isSelfTesting: true,
        selfTestReport: null,
        selfTestRecordingUrl: null,
      }));

      const steps: SelfTestStep[] = [];
      const details: NonNullable<SelfTestReport["details"]> = {
        audioContextState: audioContextRef.current?.state,
        sampleRate: audioContextRef.current?.sampleRate,
        rawTracks: streamRef.current?.getAudioTracks?.().length ?? 0,
        processedTracks: processedStreamRef.current?.getAudioTracks?.().length ?? 0,
        streamActive: streamRef.current?.active,
        processedStreamActive: processedStreamRef.current?.active,
        setSinkIdSupported: state.setSinkIdSupported ?? undefined,
        selectedOutputDeviceId: opts?.outputDeviceId ?? state.outputDeviceId,
        selectedOutputDeviceLabel: null,
        outputDevices: [],
        levels: { inputLevel: state.inputLevel, outputLevel: state.outputLevel },
      };

      const addStep = (step: SelfTestStep) => steps.push(step);

      try {
        // Step 1: ensure processing
        if (
          !audioContextRef.current ||
          !processedStreamRef.current ||
          processedStreamRef.current.getAudioTracks().length === 0
        ) {
          addStep({
            id: "start-processing",
            name: "Start audio processing",
            status: "warn",
            message: "Processing was not active; starting it now.",
          });
          await initialize();
        } else {
          addStep({ id: "start-processing", name: "Start audio processing", status: "ok" });
        }

        details.audioContextState = audioContextRef.current?.state;
        details.sampleRate = audioContextRef.current?.sampleRate;
        details.rawTracks = streamRef.current?.getAudioTracks?.().length ?? 0;
        details.processedTracks = processedStreamRef.current?.getAudioTracks?.().length ?? 0;
        details.streamActive = streamRef.current?.active;
        details.processedStreamActive = processedStreamRef.current?.active;

        // Step 2: tracks exist
        if ((details.rawTracks ?? 0) <= 0) {
          addStep({
            id: "raw-tracks",
            name: "Raw mic tracks",
            status: "fail",
            message: "No raw mic tracks. Check mic permissions/device.",
          });
        } else {
          addStep({
            id: "raw-tracks",
            name: "Raw mic tracks",
            status: "ok",
            message: `Tracks: ${details.rawTracks}`,
          });
        }

        if ((details.processedTracks ?? 0) <= 0) {
          addStep({
            id: "processed-tracks",
            name: "Processed stream tracks",
            status: "fail",
            message: "No processed tracks. Audio graph output is not connected.",
          });
        } else {
          addStep({
            id: "processed-tracks",
            name: "Processed stream tracks",
            status: "ok",
            message: `Tracks: ${details.processedTracks}`,
          });
        }

        // Step 3: enumerate devices + virtual cable detection
        try {
          const deviceList = await navigator.mediaDevices.enumerateDevices();
          const outputs = deviceList.filter((d) => d.kind === "audiooutput");
          details.outputDevices = outputs.map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `audiooutput (${d.deviceId.slice(0, 8)})`,
            isVirtual: d.label ? isVirtualCableLabel(d.label) : false,
          }));

          const selected = details.selectedOutputDeviceId;
          if (selected) {
            const match = outputs.find((d) => d.deviceId === selected);
            details.selectedOutputDeviceLabel = match?.label || null;
          }

          addStep({
            id: "devices",
            name: "Device list",
            status: "ok",
            message: `audiooutput devices: ${outputs.length}`,
          });
        } catch (e) {
          addStep({
            id: "devices",
            name: "Device list",
            status: "warn",
            message: "Could not enumerate devices. See console.",
            details: { error: String(e) },
          });
          console.warn("VoxFilter: self-test enumerateDevices failed:", e);
        }

        // Step 4: record 3 seconds from processed stream
        let blob: Blob | null = null;
        let recordingUrl: string | null = null;
        try {
          blob = await recordProcessedForMs(3000);
          if (blob.size < 1000) {
            addStep({
              id: "record",
              name: "Record processed stream (3s)",
              status: "warn",
              message: `Recording very small (${blob.size} bytes). Speak into mic during test.`,
            });
          } else {
            addStep({
              id: "record",
              name: "Record processed stream (3s)",
              status: "ok",
              message: `Recorded ${blob.size} bytes`,
            });
          }

          recordingUrl = URL.createObjectURL(blob);
          selfTestRecordingUrlRef.current = recordingUrl;
        } catch (e) {
          addStep({
            id: "record",
            name: "Record processed stream (3s)",
            status: "fail",
            message: "Recording failed. See console.",
            details: { error: String(e) },
          });
          console.error("VoxFilter: self-test record failed:", e);
        }

        // Step 5: playback the recorded blob locally (user gesture)
        if (recordingUrl) {
          try {
            const a = new Audio(recordingUrl);
            await a.play();
            addStep({ id: "playback", name: "Local playback", status: "ok" });
            // Cleanup
            a.pause();
          } catch (e) {
            const name = (e as any)?.name;
            addStep({
              id: "playback",
              name: "Local playback",
              status: name === "NotAllowedError" ? "warn" : "fail",
              message:
                name === "NotAllowedError"
                  ? "Playback blocked by browser. Click the test button again."
                  : "Playback failed. See console.",
              details: { error: String(e) },
            });
            console.error("VoxFilter: self-test playback failed:", e);
          }
        } else {
          addStep({
            id: "playback",
            name: "Local playback",
            status: "skip",
            message: "Skipped (no recording)",
          });
        }

        // Step 6: virtual routing (browser: setSinkId + play, Electron: native app output routing)
        const outId = opts?.outputDeviceId ?? state.outputDeviceId;
        if (!outId) {
          addStep({
            id: "virtual-routing",
            name: "Virtual cable routing",
            status: "warn",
            message: "No output device selected. Select VB-Audio CABLE Input / BlackHole and re-run.",
          });
        } else {
          const electronApi = typeof window !== "undefined" ? (window as any).electronAPI : null;
          const canSetAppOutputDevice = typeof electronApi?.audio?.setAppOutputDevice === "function";

          addStep({
            id: "routing-method",
            name: "Routing method",
            status: "ok",
            message: canSetAppOutputDevice ? "Electron native output routing" : "Browser output routing (setSinkId)",
          });

          const ok = await enableOutput(outId);
          addStep({
            id: "virtual-routing",
            name: "Virtual cable routing",
            status: ok ? "ok" : "fail",
            message: ok ? "Virtual routing active" : "Virtual routing failed (see Output Routing card / console)",
            details: { deviceId: outId },
          });
        }

        const overallStatus: SelfTestStepStatus = steps.some((s) => s.status === "fail")
          ? "fail"
          : steps.some((s) => s.status === "warn")
            ? "warn"
            : "ok";

        const report: SelfTestReport = { createdAt, overallStatus, steps, details };
        setState((prev) => ({
          ...prev,
          isSelfTesting: false,
          selfTestReport: report,
          selfTestRecordingUrl: selfTestRecordingUrlRef.current,
        }));
        console.log("VoxFilter: self-test complete", {
          overallStatus,
          steps: steps.map((s) => ({ id: s.id, status: s.status })),
        });
        return report;
      } catch (e) {
        const report: SelfTestReport = {
          createdAt,
          overallStatus: "fail",
          steps: [
            ...steps,
            { id: "unexpected", name: "Unexpected error", status: "fail", message: String(e) },
          ],
          details,
        };
        setState((prev) => ({
          ...prev,
          isSelfTesting: false,
          selfTestReport: report,
          selfTestRecordingUrl: null,
        }));
        console.error("VoxFilter: self-test unexpected error:", e);
        return report;
      }
    },
    [
      enableOutput,
      initialize,
      isVirtualCableLabel,
      recordProcessedForMs,
      state.inputLevel,
      state.outputDeviceId,
      state.outputLevel,
      state.setSinkIdSupported,
    ]
  );

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
    runSelfTest,
    startRecording,
    stopRecording,
    downloadRecording,
  };
}

export type UseAudioProcessorReturn = ReturnType<typeof useAudioProcessor>;
