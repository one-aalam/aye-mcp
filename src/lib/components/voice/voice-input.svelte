<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { cn } from '@/utils';
  import { Mic, MicOff, X } from '@lucide/svelte';
  import AudioVisualizer from './audio-visualiser.svelte';

  interface Props {
    autoStart?: boolean;
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    class?: string;
    onStart?: () => void;
    onInterim?: (data: { transcript: string }) => void;
    onEnd?: () => void;
    onResult?: (data: { transcript: string }) => void;
    onError?: (error: { error: string }) => void;
    onStop?: () => void;
  }

  let {
    autoStart = true,
    language = 'en-US',
    continuous = true,
    interimResults = true,
    class: className = '',
    onStart,
    onInterim,
    onEnd,
    onResult,
    onError,
    onStop,
  }: Props = $props();


  let recognition: SpeechRecognition | null = null;
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let animationFrame: number | null = null;

  let isRecording = $state(false);
  let isProcessing = $state(false);
  let transcript = $state('');
  let interimTranscript = $state('');
  let error = $state('');
  let audioLevel = $state(0);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  async function startRecording() {
    if (!isSupported) {
      error = 'Speech recognition is not supported in this browser';
      return;
    }

    try {
      // Request microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis for visualization
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      startAudioAnalysis();

      // Set up speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      
      recognition.onstart = () => {
        isRecording = true;
        isProcessing = false;
        error = '';
        onStart?.();
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interim = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        
        if (finalTranscript) {
          transcript = finalTranscript;
          onResult?.({ transcript: finalTranscript });
        }
        
        interimTranscript = interim;
        onInterim?.({ transcript: interim });
      };
      
      recognition.onerror = (event) => {
        error = `Speech recognition error: ${event.error}`;
        isRecording = false;
        isProcessing = false;
        onError?.({ error: event.error });
      };
      
      recognition.onend = () => {
        isRecording = false;
        isProcessing = false;
        onEnd?.();
      };
      
      recognition.start();
      
    } catch (err) {
      error = `Failed to access microphone: ${err}`;
      onError?.({ error: err });
    }
  }

  function stopRecording() {
    if (recognition) {
      recognition.stop();
    }
    cleanup();
  }

  function startAudioAnalysis() {
    if (!analyser) return;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    function analyze() {
      if (!analyser) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      audioLevel = Math.min(average / 128, 1); // Normalize to 0-1
      
      animationFrame = requestAnimationFrame(analyze);
    }
    
    analyze();
  }

  function cleanup() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    
    analyser = null;
    recognition = null;
  }

  function handleClose() {
    stopRecording();
    onStop?.();
  }

  onMount(() => {
    if (autoStart) {
      startRecording();
    }
  });

  onDestroy(() => {
    cleanup();
  });
</script>

{#if !isSupported}
  <div class={cn('text-center p-6', className)}>
    <div class="text-destructive mb-2">
      <MicOff class="w-8 h-8 mx-auto" />
    </div>
    <p class="text-sm text-muted-foreground">
      Speech recognition is not supported in this browser
    </p>
    <button
      class="mt-4 px-4 py-2 bg-muted text-muted-foreground rounded-md"
      onclick={handleClose}
    >
      Close
    </button>
  </div>
{:else}
  <div class={cn('text-center p-6 max-w-md mx-auto', className)}>
    <!-- Close button -->
    <button
      class="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
      onclick={handleClose}
      title="Close voice input"
    >
      <X class="w-4 h-4" />
    </button>

    <!-- Audio visualizer -->
    <div class="mb-6">
      <AudioVisualizer 
        {audioLevel}
        {isRecording}
        size="lg"
      />
    </div>

    <!-- Status -->
    <div class="mb-4">
      {#if error}
        <div class="text-destructive mb-2">
          <p class="text-sm font-medium">Error</p>
          <p class="text-xs">{error}</p>
        </div>
      {:else if isProcessing}
        <div class="text-muted-foreground">
          <p class="text-sm font-medium">Processing...</p>
        </div>
      {:else if isRecording}
        <div class="text-primary">
          <p class="text-sm font-medium">Listening...</p>
          <p class="text-xs text-muted-foreground">Speak clearly into your microphone</p>
        </div>
      {:else}
        <div class="text-muted-foreground">
          <p class="text-sm font-medium">Voice input ready</p>
          <p class="text-xs">Click the microphone to start</p>
        </div>
      {/if}
    </div>

    <!-- Transcript -->
    {#if transcript || interimTranscript}
      <div class="mb-4 p-3 bg-muted rounded-lg text-left">
        <p class="text-sm">
          {#if transcript}
            <span class="text-foreground">{transcript}</span>
          {/if}
          {#if interimTranscript}
            <span class="text-muted-foreground italic">{interimTranscript}</span>
          {/if}
        </p>
      </div>
    {/if}

    <!-- Controls -->
    <div class="flex items-center justify-center gap-4">
      {#if isRecording}
        <button
          class="p-3 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
          onclick={stopRecording}
          title="Stop recording"
        >
          <MicOff class="w-5 h-5" />
        </button>
      {:else}
        <button
          class="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
          onclick={startRecording}
          disabled={!!error}
          title="Start recording"
        >
          <Mic class="w-5 h-5" />
        </button>
      {/if}

      {#if transcript}
        <button
          class="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          onclick={() => onResult?.({ transcript })}
        >
          Use Text
        </button>
      {/if}
    </div>

    <!-- Instructions -->
    <div class="mt-4 text-xs text-muted-foreground">
      <p>Press and hold the microphone button to record</p>
      <p>Release to process your speech</p>
    </div>
  </div>
{/if}