/**
 * Universal Browser Audio Recorder for Gnani AI Prisma STT
 * Encodes microphone stream directly into standard 16-bit mono 16kHz RIFF WAV format.
 * Compatible with all browsers (Chrome, Edge, Safari, Firefox).
 */

export interface RecorderOptions {
  onSpeechEnd?: () => void
  silenceTimeoutMs?: number
  maxDurationMs?: number
}

export class WavAudioRecorder {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private inputNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private pcmBuffers: Float32Array[] = []
  private recordingLength: number = 0
  private targetSampleRate: number = 16000
  private hasSpoken: boolean = false
  private silenceStart: number = 0
  private recordingStart: number = 0
  private isEnded: boolean = false

  async start(options?: RecorderOptions): Promise<void> {
    this.pcmBuffers = []
    this.recordingLength = 0
    this.hasSpoken = false
    this.silenceStart = Date.now()
    this.recordingStart = Date.now()
    this.isEnded = false

    const silenceLimit = options?.silenceTimeoutMs || 1600
    const maxLimit = options?.maxDurationMs || 15000

    // Request microphone permission
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.audioContext = new AudioContextClass()

    this.inputNode = this.audioContext.createMediaStreamSource(this.mediaStream)
    // 4096 buffer size, 1 input channel, 1 output channel
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1)

    this.processorNode.onaudioprocess = (e) => {
      const inputChannelData = e.inputBuffer.getChannelData(0)
      // Clone buffer
      this.pcmBuffers.push(new Float32Array(inputChannelData))
      this.recordingLength += inputChannelData.length

      // Calculate audio power (RMS)
      let sum = 0
      for (let i = 0; i < inputChannelData.length; i++) {
        sum += inputChannelData[i] * inputChannelData[i]
      }
      const rms = Math.sqrt(sum / inputChannelData.length)

      const now = Date.now()
      if (rms > 0.015) {
        this.hasSpoken = true
        this.silenceStart = now
      } else if (this.hasSpoken) {
        if (now - this.silenceStart > silenceLimit && !this.isEnded) {
          this.isEnded = true
          if (options?.onSpeechEnd) {
            options.onSpeechEnd()
          }
        }
      }

      // Max recording ceiling check
      if (now - this.recordingStart > maxLimit && !this.isEnded) {
        this.isEnded = true
        if (options?.onSpeechEnd) {
          options.onSpeechEnd()
        }
      }
    }

    this.inputNode.connect(this.processorNode)
    this.processorNode.connect(this.audioContext.destination)
  }

  async stop(): Promise<Blob> {
    // Disconnect audio graph
    if (this.processorNode && this.inputNode) {
      this.processorNode.disconnect()
      this.inputNode.disconnect()
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    const currentContext = this.audioContext
    const originalSampleRate = currentContext ? currentContext.sampleRate : 44100

    if (currentContext && currentContext.state !== 'closed') {
      await currentContext.close()
      this.audioContext = null
    }

    // Merge recorded PCM chunks into single buffer
    const mergedBuffer = new Float32Array(this.recordingLength)
    let offset = 0
    for (const buffer of this.pcmBuffers) {
      mergedBuffer.set(buffer, offset)
      offset += buffer.length
    }

    // Resample down to 16,000 Hz for optimal Gnani Prisma recognition
    const resampledBuffer = this.downsample(mergedBuffer, originalSampleRate, this.targetSampleRate)

    // Encode to 16-bit PCM RIFF WAV
    return this.encodeWAV(resampledBuffer, this.targetSampleRate)
  }

  cancel(): void {
    if (this.processorNode && this.inputNode) {
      this.processorNode.disconnect()
      this.inputNode.disconnect()
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }
    this.pcmBuffers = []
    this.recordingLength = 0
  }

  private downsample(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
    if (inputSampleRate === outputSampleRate) {
      return buffer
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate
    const newLength = Math.round(buffer.length / sampleRateRatio)
    const result = new Float32Array(newLength)
    let offsetResult = 0
    let offsetBuffer = 0

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
      let accum = 0
      let count = 0
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i]
        count++
      }
      result[offsetResult] = count > 0 ? accum / count : 0
      offsetResult++
      offsetBuffer = nextOffsetBuffer
    }
    return result
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    this.writeString(view, 8, 'WAVE')

    // "fmt " sub-chunk
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true) // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true) // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true) // SampleRate (16000)
    view.setUint32(28, sampleRate * 2, true) // ByteRate (SampleRate * 1 * 16/8)
    view.setUint16(32, 2, true) // BlockAlign (1 * 16/8)
    view.setUint16(34, 16, true) // BitsPerSample (16 bits)

    // "data" sub-chunk
    this.writeString(view, 36, 'data')
    view.setUint32(40, samples.length * 2, true)

    // Float32 to Int16 PCM samples
    let index = 44
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      index += 2
    }

    return new Blob([view], { type: 'audio/wav' })
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
}
