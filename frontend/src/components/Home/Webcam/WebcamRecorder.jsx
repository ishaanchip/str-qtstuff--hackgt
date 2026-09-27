import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { FaceLandmarker, FilesetResolver, HandLandmarker, ObjectDetector } from "@mediapipe/tasks-vision";
import SignupPanel from "./SignupPanel";
import LoginPanel from "./LoginPanel";
import ChangePicturePanel from "./ChangePicturePanel";
import { getUserEmail } from "../homeHelper";
import "./WebcamRecorder.css";

/**
 * WebcamRecorder
 * - Shows a live webcam feed with a positioning frame on top
 * - Detects whether the entire face is inside that frame, and whether a hand
 *   or other object is covering any part of it
 * - "Take photo" appears only while the frame is green
 * - The photo opens a signup popup on this same page
 *
 * Props:
 *   frame          – frame box as fractions of the video: { x, y, w, h }.
 *                    Default is the camera itself, inset slightly from the edges.
 *   onSnapshot     – callback(imageDataUrl, timestampMs, kind) where kind is "photo"
 *
 * Install: npm i react-webcam @mediapipe/tasks-vision
 * Keep WebcamRecorder.css in the same folder as this file.
 */

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const OBJECT_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite";

const DETECT_EVERY_MS = 66; // ~15 checks per second is plenty and saves CPU
const OBJECT_EVERY_MS = 280; // object detection is heavier, so it runs less often
const FACE_MEMORY_MS = 500; // keep the last face briefly if a cover hides the landmarks
// Grow the detected oval so forehead, chin, and cheeks count as part of the face.
const FACE_PAD = 0.12;
const COVER_PAD = 0.08; // a fingertip just past the oval still counts as covering
const OBJECT_COVER_RATIO = 0.05; // object overlap, as a fraction of the face area

// MediaPipe face-mesh oval: forehead, cheeks, and chin.
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162,
  21, 54, 103, 67, 109,
];

// The preview is a square crop of the 16:9 camera, like a Polaroid window.
const VIEW_WIDTH = 9 / 16;
const FRAME_INSET = 0.02;
const DEFAULT_FRAME = {
  x: (1 - VIEW_WIDTH) / 2 + FRAME_INSET,
  y: FRAME_INSET,
  w: VIEW_WIDTH - FRAME_INSET * 2,
  h: 1 - FRAME_INSET * 2,
};

const STATUS_TEXT = {
  loading: "Loading Face Tracker…",
  none: "No Face Detected",
  outside: "Keep  Entire Face Inside Frame",
  covered: "Keep Clear View of Face",
  ready: "Take Picture to Start Sign-up",
  error: "Face tracking Unavailable",
};

function ovalBounds(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const i of FACE_OVAL) {
    const lm = landmarks[i];
    if (!lm) return null;
    minX = Math.min(minX, lm.x);
    maxX = Math.max(maxX, lm.x);
    minY = Math.min(minY, lm.y);
    maxY = Math.max(maxY, lm.y);
  }

  if (!Number.isFinite(minX)) return null;
  return { minX, maxX, minY, maxY };
}

function expandBox(bounds, padFraction) {
  const padX = (bounds.maxX - bounds.minX) * padFraction;
  const padY = (bounds.maxY - bounds.minY) * padFraction;
  return {
    minX: bounds.minX - padX,
    maxX: bounds.maxX + padX,
    minY: bounds.minY - padY,
    maxY: bounds.maxY + padY,
  };
}

/** Returns { placement: "none" | "outside" | "inside", bounds } in raw video space. */
function evaluateFace(landmarks, frame, mirrored) {
  const bounds = ovalBounds(landmarks);
  if (!bounds) return { placement: "none", bounds: null };

  const padded = expandBox(bounds, FACE_PAD);
  // Match the mirrored preview when comparing against the on-screen frame.
  const left = mirrored ? 1 - padded.maxX : padded.minX;
  const right = mirrored ? 1 - padded.minX : padded.maxX;
  const entireFaceInside =
    left >= frame.x &&
    right <= frame.x + frame.w &&
    padded.minY >= frame.y &&
    padded.maxY <= frame.y + frame.h;

  return { placement: entireFaceInside ? "inside" : "outside", bounds };
}

function handCoversFace(hands, bounds) {
  if (!bounds || !hands?.length) return false;
  const box = expandBox(bounds, COVER_PAD);
  for (const hand of hands) {
    for (const lm of hand) {
      if (!lm) continue;
      if (lm.x >= box.minX && lm.x <= box.maxX && lm.y >= box.minY && lm.y <= box.maxY) {
        return true;
      }
    }
  }
  return false;
}

function intersectionArea(a, b) {
  const width = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const height = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

function objectCoversFace(detections, bounds, videoWidth, videoHeight) {
  if (!bounds || !detections?.length || !videoWidth || !videoHeight) return false;
  const faceArea = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
  if (faceArea <= 0) return false;

  for (const det of detections) {
    const name = det.categories?.[0]?.categoryName?.toLowerCase() ?? "";
    if (!name || name === "person") continue;
    const bb = det.boundingBox;
    if (!bb || bb.width <= 0 || bb.height <= 0) continue;
    const box = {
      minX: bb.originX / videoWidth,
      maxX: (bb.originX + bb.width) / videoWidth,
      minY: bb.originY / videoHeight,
      maxY: (bb.originY + bb.height) / videoHeight,
    };
    if (intersectionArea(box, bounds) / faceArea >= OBJECT_COVER_RATIO) return true;
  }
  return false;
}

async function createVisionTask(create, vision, options) {
  try {
    return await create(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "GPU" },
    });
  } catch (gpuErr) {
    console.warn("GPU delegate unavailable, using CPU", gpuErr);
    return await create(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "CPU" },
    });
  }
}

export default function WebcamRecorder({
  frame,
  onSnapshot,
  onAccount,
  onSessionStart,
  mode = "signup",
  onImageUpdated,
}) {
  const activeFrame = frame || DEFAULT_FRAME;

  const webcamRef = useRef(null);
  const frameRef = useRef(activeFrame);
  const statusRef = useRef("loading");

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [signupImage, setSignupImage] = useState(null);
  const [authView, setAuthView] = useState("signup");
  const [loginEmail, setLoginEmail] = useState("");
  const [status, setStatus] = useState("loading");
  const [flash, setFlash] = useState(false);

  frameRef.current = activeFrame;

  const updateStatus = useCallback((next) => {
    if (statusRef.current !== next) {
      statusRef.current = next;
      setStatus(next);
    }
  }, []);

  const takePhoto = useCallback(() => {
    const video = webcamRef.current?.video;
    if (!video || !video.videoWidth) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const src = canvas.toDataURL("image/jpeg", 0.9);
    setSignupImage(src);
    setAuthView("signup");
    onSnapshot?.(src, Date.now(), "photo");
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
  }, [onSnapshot]);

  // ---- Face detection loop (runs as long as the component is mounted) ----
  useEffect(() => {
    let landmarker;
    let handLandmarker;
    let objectDetector;
    let rafId;
    let cancelled = false;
    let lastRun = 0;
    let lastObjectRun = 0;
    let detections = [];
    let lastFaceBounds = null;
    let lastFaceAt = 0;

    const handleFace = (landmarks, hands, now, video) => {
      const { placement, bounds } = evaluateFace(
        landmarks,
        frameRef.current,
        true // the preview is mirrored
      );

      if (bounds) {
        lastFaceBounds = bounds;
        lastFaceAt = now;
      }
      const occlusionBounds = bounds || (now - lastFaceAt < FACE_MEMORY_MS ? lastFaceBounds : null);
      const covered =
        handCoversFace(hands, occlusionBounds) ||
        objectCoversFace(detections, occlusionBounds, video.videoWidth, video.videoHeight);

      if (covered) {
        updateStatus("covered");
        return;
      }

      updateStatus(placement === "inside" ? "ready" : placement);
    };

    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        landmarker = await createVisionTask(
          (fileset, options) => FaceLandmarker.createFromOptions(fileset, options),
          vision,
          {
            baseOptions: { modelAssetPath: FACE_MODEL_URL },
            runningMode: "VIDEO",
            numFaces: 1,
          }
        );
        try {
          handLandmarker = await createVisionTask(
            (fileset, options) => HandLandmarker.createFromOptions(fileset, options),
            vision,
            {
              baseOptions: { modelAssetPath: HAND_MODEL_URL },
              runningMode: "VIDEO",
              numHands: 2,
            }
          );
        } catch (err) {
          console.error("Hand tracker failed to load:", err);
        }
        try {
          objectDetector = await createVisionTask(
            (fileset, options) => ObjectDetector.createFromOptions(fileset, options),
            vision,
            {
              baseOptions: { modelAssetPath: OBJECT_MODEL_URL },
              runningMode: "VIDEO",
              scoreThreshold: 0.4,
              maxResults: 5,
              categoryDenylist: ["person"],
            }
          );
        } catch (err) {
          console.error("Object tracker failed to load:", err);
        }
        if (cancelled) {
          landmarker.close();
          handLandmarker?.close();
          objectDetector?.close();
          return;
        }
        updateStatus("none");

        const loop = (now) => {
          if (cancelled) return;
          rafId = requestAnimationFrame(loop);
          if (now - lastRun < DETECT_EVERY_MS) return;
          lastRun = now;

          const video = webcamRef.current?.video;
          if (!video || video.readyState < 2) return;

          try {
            const result = landmarker.detectForVideo(video, now);
            let hands = [];
            if (handLandmarker) {
              hands = handLandmarker.detectForVideo(video, now).landmarks ?? [];
            }
            if (objectDetector && now - lastObjectRun >= OBJECT_EVERY_MS) {
              lastObjectRun = now;
              const found = objectDetector.detectForVideo(video, now).detections ?? [];
              detections = found.map((det) => ({
                categories: det.categories?.map((c) => ({ categoryName: c.categoryName })),
                boundingBox: det.boundingBox ? { ...det.boundingBox } : undefined,
              }));
            }
            handleFace(result.faceLandmarks?.[0], hands, now, video);
          } catch (err) {
            console.error("Face check failed:", err);
          }
        };
        rafId = requestAnimationFrame(loop);
      } catch (err) {
        console.error("Face tracker failed to load:", err);
        if (!cancelled) updateStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      landmarker?.close();
      handLandmarker?.close();
      objectDetector?.close();
    };
  }, [updateStatus]);

  const statusText = STATUS_TEXT[status];
  const showPhotoButton = status === "ready";

  const frameStateClass =
    status === "ready"
      ? "webcam-recorder__frame--ok"
      : status === "outside" || status === "none" || status === "covered"
      ? "webcam-recorder__frame--out"
      : "";

  return (
    <div className="webcam-recorder">
      <div className={`webcam-recorder__polaroid ${frameStateClass}`}>
        {cameraReady && <p className="webcam-recorder__status">{statusText}</p>}
        <div className="webcam-recorder__camera">
          <Webcam
            ref={webcamRef}
            audio={false}
            muted
            mirrored
            screenshotFormat="image/jpeg"
            screenshotQuality={0.9}
            videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
            onUserMedia={() => setCameraReady(true)}
            onUserMediaError={(err) =>
              setCameraError(err?.message || "Camera access was denied.")
            }
            className="webcam-recorder__video"
          />
          {flash && <div className="webcam-recorder__flash" />}
        </div>
        <div className="webcam-recorder__controls">
          {showPhotoButton && (
            <button
              type="button"
              onClick={takePhoto}
              aria-label="Take photo"
              className="webcam-recorder__shutter"
            />
          )}
        </div>
      </div>

      {cameraError && <p className="webcam-recorder__error">{cameraError}</p>}

      {mode === "signup" && (
        <p className="webcam-recorder__login-prompt">
          Have an account?{" "}
          <button
            type="button"
            className="webcam-recorder__login-link"
            onClick={() => {
              setLoginEmail("");
              setAuthView("login");
            }}
          >
            Log in
          </button>
        </p>
      )}

      {mode === "change-picture" && signupImage && (
        <div className="signup-modal">
          <ChangePicturePanel
            image={signupImage}
            onRetake={() => setSignupImage(null)}
            onChanged={(image) => onImageUpdated?.(image)}
          />
        </div>
      )}

      {mode === "signup" && (signupImage || authView === "login") && (
        <div className="signup-modal">
          {authView === "login" ? (
            <LoginPanel
              email={loginEmail}
              onClose={() => {
                setSignupImage(null);
                setAuthView("signup");
                const email = getUserEmail();
                if (email) onSessionStart?.(email);
              }}
            />
          ) : (
            <SignupPanel
              image={signupImage}
              onRetake={() => {
                setSignupImage(null);
                setAuthView("signup");
              }}
              onAccount={onAccount}
              onClose={() => {
                setSignupImage(null);
                setAuthView("signup");
                onSessionStart?.(getUserEmail());
              }}
              onLogin={(email) => {
                setLoginEmail(email || "");
                setAuthView("login");
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}