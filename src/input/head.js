/**
 * Head-tilt control for Snack Rain ("เอียงหัว", module-contracts.md › Sprint 3 #3).
 * MediaPipe Tasks Vision 0.10.14 Face Landmarker (VIDEO mode, one face), loaded
 * from jsDelivr only the first time this control is chosen; GPU delegate first,
 * CPU fallback. Video is processed on this device and is never shown.
 *
 * Head roll from the outer eye corners is the main cue, the nose's sideways
 * offset a secondary one (pure math in `head-rules.js`, unit-tested). The
 * neutral pose is calibrated while the round's countdown runs.
 *
 * Camera ownership: when the hand camera is already on, pass its <video> to
 * `start(shared)` and this module only reads frames (the caller pauses hand
 * detection). Otherwise it opens its own front camera into a hidden <video> and
 * `stop()` closes it.
 * @module input/head
 */
import { headPose, poseToAxis, axisToClientX, smoothToward, createCalibrator, HEAD_FEEL } from './head-rules.js';

export * from './head-rules.js';

const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * @param {{ getTime: () => number, feel?: typeof HEAD_FEEL, doc?: Document }} deps
 */
export function createHeadControl({ getTime, feel = HEAD_FEEL, doc = document }) {
  let landmarker = null, loading = null;
  let ownVideo = null, video = null, stream = null, owns = false, on = false;
  let lastVT = -1, lastT = 0, seenT = -99, calibrating = false;
  let axis = 0, target = 0;
  const pose = { roll: 0, nose: 0 }, neutral = { roll: 0, nose: 0 };
  const cal = createCalibrator();

  function hiddenVideo() {
    if (ownVideo) return ownVideo;
    const v = doc.createElement('video');
    v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.muted = true; v.autoplay = true; v.playsInline = true;
    // kept in the DOM (iOS only decodes frames for attached videos) but invisible
    v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;z-index:-1';
    doc.body.appendChild(v);
    return (ownVideo = v);
  }

  async function loadModel() {
    if (landmarker) return landmarker;
    if (!loading) {
      loading = (async () => {
        const { FaceLandmarker, FilesetResolver } = await import(/* @vite-ignore */ `${MP}/vision_bundle.mjs`);
        const files = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
        const make = (delegate) => FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numFaces: 1,
          outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
          minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
        });
        try { landmarker = await make('GPU'); } catch { landmarker = await make('CPU'); }
        return landmarker;
      })();
      loading.catch(() => { loading = null; });
    }
    return loading;
  }

  function closeOwn() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    if (ownVideo) ownVideo.srcObject = null;
  }

  /** Feed one face's landmarks (from detection or a test). */
  function ingest(L, aspect, t) {
    if (!headPose(L, aspect, pose)) return;
    seenT = t;
    if (calibrating) { cal.add(pose); return; }
    target = poseToAxis(pose, neutral, feel);
  }

  return {
    /**
     * Open the camera (or adopt `shared`) and load the model. Must be called from
     * a user gesture the first time (camera permission).
     * @param {HTMLVideoElement|null} [shared] the hand camera's video when it is on
     * @returns {Promise<{ ok: boolean, reason?: string }>} reason: 'api' | 'denied' | 'camera' | 'model'
     */
    async start(shared = null) {
      if (on) return { ok: true };
      owns = !shared;
      if (owns) {
        if (!navigator.mediaDevices?.getUserMedia) return { ok: false, reason: 'api' };
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: 640, height: 480 } });
        } catch (e) {
          const n = e && e.name;
          return { ok: false, reason: n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : 'camera' };
        }
        video = hiddenVideo();
        video.srcObject = stream;
        try { await video.play(); } catch { /* muted autoplay */ }
      } else video = shared;
      try { await loadModel(); } catch (e) {
        console.warn('[head] model', e);
        if (owns) closeOwn();
        return { ok: false, reason: 'model' };
      }
      on = true; lastVT = -1; seenT = -99; axis = target = 0; lastT = getTime();
      return { ok: true };
    },
    /** Stop reading; closes the camera only if this module opened it. Model stays cached. */
    stop() {
      on = false; calibrating = false;
      if (owns) closeOwn();
      video = null; owns = false;
    },
    get on() { return on; },
    /** True when this module opened the camera itself. */
    get ownsCamera() { return owns; },
    /** Start collecting the neutral pose (countdown). Axis reads null meanwhile. */
    beginCalibration() { calibrating = true; cal.reset(); },
    /** Use the collected mean as neutral (keeps the previous neutral if no face was seen). */
    endCalibration() { if (!calibrating) return; calibrating = false; cal.mean(neutral); axis = target = 0; },
    get calibrating() { return calibrating; },
    /** Per frame: detect on a new video frame, then smooth the axis. */
    update() {
      const t = getTime();
      const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
      if (on && landmarker && video && video.readyState >= 2 && video.currentTime !== lastVT) {
        lastVT = video.currentTime;
        try {
          const res = landmarker.detectForVideo(video, performance.now());
          const L = res.faceLandmarks?.[0];
          if (L) ingest(L, (video.videoWidth || 4) / (video.videoHeight || 3), t);
        } catch { /* skip frame */ }
      }
      axis = smoothToward(axis, target, dt, feel.followPerSec);
    },
    /**
     * Movement axis −1..1, or null while calibrating / no face for `lostSeconds`.
     * @returns {number|null}
     */
    axis() {
      if (!on || calibrating || getTime() - seenT > feel.lostSeconds) return null;
      return axis;
    },
    /**
     * Client x across [left, left + width], or null (see `axis`).
     * @param {number} left @param {number} width
     */
    clientX(left, width) { const a = this.axis(); return a == null ? null : axisToClientX(a, left, width); },
    /** Face was seen recently (for the "look at the camera" hint). */
    get tracking() { return on && getTime() - seenT <= feel.lostSeconds; },
    /**
     * Test / debug only: act as if the camera saw a face with these landmarks
     * (`null` = no face). Turns the control on without a camera.
     * @param {Array<{x:number,y:number}>|null} L @param {number} [aspect]
     */
    debugFeed(L, aspect = 4 / 3) {
      if (!on) { on = true; owns = false; lastT = getTime(); }
      if (L) ingest(L, aspect, getTime());
    },
    /** Snapshot for tests. */
    get state() { return { on, calibrating, axis, target, neutral: { ...neutral }, samples: cal.count, owns }; },
  };
}
