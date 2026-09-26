export function garmentState(image, prompt, enhance = true) {
  if (!image) throw new Error('Choose at least one outfit item first.');
  if (!prompt.trim()) throw new Error('Enter instructions for the outfit.');
  return { image, prompt: prompt.trim(), enhance };
}

const stopTracks = (stream) => stream?.getTracks().forEach((track) => track.stop());

export class TryOnSession {
  constructor({ model, createClient, getUserMedia, fetchToken, onLocal, onRemote, onState, onError, sessionSeconds = 300 }) {
    Object.assign(this, { model, createClient, getUserMedia, fetchToken, onLocal, onRemote, onState, onError, sessionSeconds });
    this.state = 'idle';
    this.sequence = 0;
    this.pending = false;
  }

  status(state) {
    this.state = state;
    this.onState(state);
  }

  async start(image, prompt, enhance) {
    if (this.state !== 'idle' || this.pending) return;
    const desired = garmentState(image, prompt, enhance);
    const sequence = ++this.sequence;
    const current = () => sequence === this.sequence;
    this.pending = true;
    this.status('camera');
    try {
      const stream = await this.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: this.model.width, height: this.model.height, frameRate: this.model.fps },
      });
      if (!current()) { stopTracks(stream); return; }
      this.local = stream;
      for (const track of stream.getVideoTracks()) {
        track.addEventListener('ended', () => {
          if (current()) { this.stop(); this.onError(new Error('Camera disconnected. Start again to reconnect.')); }
        }, { once: true });
      }
      this.onLocal(stream);
      this.status('connecting');
      this.abort = new AbortController();
      const { apiKey } = await this.fetchToken(this.abort.signal);
      if (!current()) return;
      const client = this.createClient({ apiKey, telemetry: false });
      const connection = await client.realtime.connect(stream, {
        model: this.model,
        mirror: true,
        initialState: { image: desired.image, prompt: { text: desired.prompt, enhance: desired.enhance } },
        onRemoteStream: (remote) => {
          if (!current()) { stopTracks(remote); return; }
          this.remote = remote;
          this.onRemote(remote);
        },
      });
      // The SDK has no connect AbortSignal. Stop releases camera tracks at once;
      // a late connection is disconnected before it can become the active one.
      if (!current()) { connection.disconnect(); return; }
      this.connection = connection;
      connection.on('connectionChange', (state) => {
        if (!current()) return;
        if (state === 'disconnected') this.stop();
        else this.status(state === 'reconnecting' ? 'reconnecting' : 'live');
      });
      connection.on('error', () => {
        if (!current()) return;
        this.stop();
        this.onError(new Error('Lucy disconnected. Check your connection and Decart account, then start again.'));
      });
      connection.on('sessionEnded', () => {
        if (!current()) return;
        this.stop();
        this.onError(new Error('The session has ended. Start again for another try-on.'));
      });
      if (!connection.isConnected()) throw new Error('Lucy could not connect. Please try again.');
      this.status('live');
      this.timer = setTimeout(() => {
        if (!current()) return;
        this.stop();
        this.onError(new Error('Five-minute session complete. Start again to continue.'));
      }, this.sessionSeconds * 1000);
    } catch (error) {
      if (current()) {
        this.stop();
        // Never display raw SDK messages; they may include signed connection URLs.
        const safe = error.name === 'NotAllowedError' ? 'Allow camera access to start the try-on.'
          : error.name === 'NotFoundError' ? 'No camera found. Connect a webcam and try again.'
          : error.name === 'NotReadableError' ? 'The camera is busy. Close the Python preview or other camera apps.'
          : error.userMessage || 'Could not start Lucy. Check your camera, connection, and Decart configuration.';
        this.onError(new Error(safe));
      }
    } finally {
      this.pending = false;
      if (this.state === 'stopping') this.status('idle');
    }
  }

  async apply(image, prompt, enhance) {
    if (!this.connection || this.state !== 'live') throw new Error('Start a live session first.');
    const sequence = this.sequence;
    await this.connection.set(garmentState(image, prompt, enhance));
    return sequence === this.sequence;
  }

  stop() {
    ++this.sequence;
    clearTimeout(this.timer);
    this.abort?.abort();
    const connection = this.connection;
    this.connection = null;
    // Invalidate callbacks before disconnecting, which may emit more events.
    try { connection?.disconnect(); } finally {
      stopTracks(this.local);
      stopTracks(this.remote);
      this.local = this.remote = null;
      this.onLocal(null);
      this.onRemote(null);
      this.status(this.pending ? 'stopping' : 'idle');
    }
  }
}
