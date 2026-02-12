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
  // Multiple formant filters for voice character shaping (F1, F2, F3)
  const formantFilter1Ref = useRef<BiquadFilterNode | null>(null);
  const formantFilter2Ref = useRef<BiquadFilterNode | null>(null);
  const formantFilter3Ref = useRef<BiquadFilterNode | null>(null);
  // Voice body filter for warmth/brightness
  const voiceBodyFilterRef = useRef<BiquadFilterNode | null>(null);
  const clarityFilterRef = useRef<BiquadFilterNode | null>(null);
  const normalizerRef = useRef<DynamicsCompressorNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const settingsRef = useRef<AudioSettings>(settings);
  
  // Audio output element for routing to virtual cable (for RingCentral)
  const audioOutputRef = useRef<HTMLAudioElement | null>(null);
  // Monitor output element for routing to speakers (so user can hear themselves)
  const monitorOutputRef = useRef<HTMLAudioElement | null>(null);
  
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
      setState((prev) => ({ 
        ...prev, 
        error: "Could not access audio devices. Please check permissions." 
      }));
    }
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

      // Connect the full audio processing chain
      // Source -> Input Gain -> High Pass -> Notch -> Low Pass -> Noise Gate -> 
      // Voice Body -> F1 -> F2 -> F3 -> Clarity Filter -> Normalizer -> Output Gain -> Analyser -> Destination
      source.connect(gainNode);
      gainNode.connect(highPass);
      highPass.connect(notchFilter);
      notchFilter.connect(lowPass);
      lowPass.connect(noiseGate);
      noiseGate.connect(voiceBodyFilter);
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
      
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isProcessing: true,
        latency: Math.max(10, Math.round(latency)),
        processedStreamId: destination.stream.id,
      }));

      await refreshDevices();
      
      console.log("VoxFilter: Audio processing initialized. Processed stream ID:", destination.stream.id);
      
      // AUTO-ENABLE OUTPUT: Route processed audio to BOTH virtual cable AND speakers
      // This ensures the user can HEAR their processed voice AND RingCentral receives it
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const outputDevices = deviceList.filter(d => d.kind === 'audiooutput');
        
        // Find virtual cable (VB-Audio / BlackHole) for RingCentral
        const virtualCable = outputDevices.find(d => 
          d.label.toLowerCase().includes('cable input') || 
          d.label.toLowerCase().includes('vb-audio') ||
          d.label.toLowerCase().includes('blackhole')
        );
        
        // Find default output / speakers for user to hear themselves
        const defaultOutput = outputDevices.find(d => 
          d.deviceId === 'default' || 
          d.label.toLowerCase().includes('speakers') ||
          d.label.toLowerCase().includes('headphone')
        ) || outputDevices[0];
        
        // 1. MONITOR OUTPUT - Always route to speakers so user can hear processed voice
        if (!monitorOutputRef.current) {
          monitorOutputRef.current = new Audio();
          monitorOutputRef.current.autoplay = true;
        }
        monitorOutputRef.current.srcObject = destination.stream;
        
        // Try to set monitor to speakers/headphones (not virtual cable)
        if (defaultOutput && 'setSinkId' in monitorOutputRef.current) {
          try {
            // Find a real speaker device (not virtual cable)
            const realSpeaker = outputDevices.find(d => 
              !d.label.toLowerCase().includes('cable') && 
              !d.label.toLowerCase().includes('vb-audio') &&
              !d.label.toLowerCase().includes('blackhole') &&
              (d.label.toLowerCase().includes('speaker') || 
               d.label.toLowerCase().includes('headphone') ||
               d.deviceId === 'default')
            );
            if (realSpeaker) {
              await (monitorOutputRef.current as any).setSinkId(realSpeaker.deviceId);
              console.log("VoxFilter: MONITOR output set to:", realSpeaker.label);
            }
          } catch (sinkErr) {
            console.log("VoxFilter: Using default output for monitor");
          }
        }
        await monitorOutputRef.current.play();
        console.log("VoxFilter: MONITOR ENABLED - You can now hear your processed voice!");
        
        // 2. VIRTUAL CABLE OUTPUT - Route to VB-Audio/BlackHole for RingCentral
        if (!audioOutputRef.current) {
          audioOutputRef.current = new Audio();
          audioOutputRef.current.autoplay = true;
        }
        audioOutputRef.current.srcObject = destination.stream;
        
        if (virtualCable && 'setSinkId' in audioOutputRef.current) {
          try {
            await (audioOutputRef.current as any).setSinkId(virtualCable.deviceId);
            console.log("VoxFilter: Virtual cable output set to:", virtualCable.label);
            setState(prev => ({ ...prev, outputDeviceId: virtualCable.deviceId }));
          } catch (sinkErr) {
            console.warn("VoxFilter: Could not set virtual cable output:", sinkErr);
          }
        }
        
        await audioOutputRef.current.play();
        setState(prev => ({ ...prev, isOutputEnabled: true }));
        console.log("VoxFilter: DUAL OUTPUT ENABLED - Monitor (speakers) + Virtual Cable (RingCentral)");
      } catch (outputErr) {
        console.warn("VoxFilter: Could not auto-enable output:", outputErr);
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

  // Apply accent/voice modification settings - EXTREME effects for obvious change
  const applyAccentSettings = useCallback((s: AudioSettings) => {
    const f1 = formantFilter1Ref.current;
    const f2 = formantFilter2Ref.current;
    const f3 = formantFilter3Ref.current;
    const vb = voiceBodyFilterRef.current;
    const hp = highPassRef.current;
    const lp = lowPassRef.current;
    
    if (!f1 || !f2 || !f3 || !vb) {
      console.log("VoxFilter: Formant filters not ready yet - start audio processing first!");
      return;
    }
    
    if (s.accentModifierEnabled) {
      const preset = accentPresetConfigs[s.accentPreset as AccentPresetType] || accentPresetConfigs.neutral;
      const formantShift = s.formantShift !== undefined ? s.formantShift : preset.formantShift;
      const pitchShift = s.pitchShift !== undefined ? s.pitchShift : preset.pitchShift;
      
      console.log(`%cVoxFilter: APPLYING VOICE MOD`, 'color: green; font-weight: bold');
      console.log(`  Preset: ${s.accentPreset}, FormantShift: ${formantShift}, PitchShift: ${pitchShift}`);
      
      // EXTREME formant shifting - these values will be VERY noticeable
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
      
      console.log(`%cVoxFilter: FILTERS ACTIVE`, 'color: blue; font-weight: bold');
      console.log(`  F1: ${f1.type} @ ${f1.frequency.value}Hz, gain: ${f1.gain.value.toFixed(1)}dB`);
      console.log(`  F2: ${f2.type} @ ${f2.frequency.value}Hz, gain: ${f2.gain.value.toFixed(1)}dB`);
      console.log(`  F3: ${f3.type} @ ${f3.frequency.value}Hz, gain: ${f3.gain.value.toFixed(1)}dB`);
      console.log(`  Body: ${vb.type} @ ${vb.frequency.value}Hz, gain: ${vb.gain.value.toFixed(1)}dB`);
      
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
      
      // DO NOT touch hp and lp here - they belong to noise reduction!
      // These lines were causing noise reduction to stop working:
      // if (hp) hp.frequency.value = 80;    // ❌ REMOVED
      // if (lp) lp.frequency.value = 8000;  // ❌ REMOVED
      
      console.log("VoxFilter: Voice modifier DISABLED - flat response");
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
      try {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      } catch (error) {
        console.error("Error stopping media recorder:", error);
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

    // CRITICAL FIX: Disconnect all audio nodes before closing context
    // This prevents memory leaks
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
      console.error("Error disconnecting audio nodes:", error);
    }

    // NOW close the audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch((error) => {
        console.error("Error closing audio context:", error);
      });
      audioContextRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isInitialized: false,
      isProcessing: false,
      isRecording: false,
      isOutputEnabled: false,
      outputDeviceId: null,
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
  
  // Enable audio output to a specific device (for virtual cable routing)
  const enableOutput = useCallback(async (deviceId?: string) => {
    if (!processedStreamRef.current) {
      console.error("VoxFilter: No processed stream available");
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
          console.log("VoxFilter: Audio output set to device:", deviceId);
          setState(prev => ({ ...prev, outputDeviceId: deviceId }));
        } catch (sinkErr) {
          console.warn("VoxFilter: Could not set output device, using default:", sinkErr);
        }
      }

      // Start playback
      await audioOutputRef.current.play();
      
      setState(prev => ({ ...prev, isOutputEnabled: true }));
      console.log("VoxFilter: Audio output enabled - processed audio now playing to system output");
      return true;
    } catch (err) {
      console.error("VoxFilter: Failed to enable audio output:", err);
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
    console.log("VoxFilter: Audio output disabled");
  }, []);

  // Change output device
  const setOutputDevice = useCallback(async (deviceId: string) => {
    if (audioOutputRef.current && 'setSinkId' in audioOutputRef.current) {
      try {
        await (audioOutputRef.current as any).setSinkId(deviceId);
        setState(prev => ({ ...prev, outputDeviceId: deviceId }));
        console.log("VoxFilter: Output device changed to:", deviceId);
        return true;
      } catch (err) {
        console.error("VoxFilter: Failed to change output device:", err);
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
