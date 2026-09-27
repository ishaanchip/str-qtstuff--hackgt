"""MediaPipe Tasks inference, loaded only when an image is analyzed."""
from pathlib import Path
import cv2
import numpy as np


def probability_map(mask: np.ndarray, shape: tuple[int, int]) -> np.ndarray:
    """Normalize Tasks H×W×1/H×W output to the analyzed image coordinates."""
    values = np.asarray(mask, dtype=np.float32).squeeze()
    if values.ndim != 2:
        raise ValueError('Unexpected segmentation probability mask dimensions.')
    if values.shape != shape:
        values = cv2.resize(values, (shape[1], shape[0]), interpolation=cv2.INTER_LINEAR)
    return values.copy()


def detect_regions(rgb: np.ndarray, model_dir: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return pixel landmarks and hair/face-skin probabilities for exactly one face."""
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    face_model = model_dir / 'face_landmarker.task'
    segment_model = model_dir / 'selfie_multiclass.tflite'
    for path in (face_model, segment_model):
        if not path.is_file():
            raise ValueError(f'Missing model: {path}. Run the README model download commands.')
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
    options = vision.FaceLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=str(face_model)), num_faces=2)
    with vision.FaceLandmarker.create_from_options(options) as detector:
        result = detector.detect(image)
    if len(result.face_landmarks) != 1:
        raise ValueError(f'Expected one face; detected {len(result.face_landmarks)}. Use a solo portrait.')
    landmarks = np.array([(p.x * rgb.shape[1], p.y * rgb.shape[0])
                          for p in result.face_landmarks[0]], dtype=np.float32)
    if len(landmarks) < 478:
        raise ValueError('The face model must include the 478-point iris landmarks.')
    options = vision.ImageSegmenterOptions(
        base_options=python.BaseOptions(model_asset_path=str(segment_model)),
        output_confidence_masks=True, output_category_mask=False)
    with vision.ImageSegmenter.create_from_options(options) as segmenter:
        result = segmenter.segment(image)
        if not result.confidence_masks or len(result.confidence_masks) != 6:
            raise ValueError('Expected the six-class SelfieMulticlass model.')
        hair = probability_map(result.confidence_masks[1].numpy_view(), rgb.shape[:2])
        skin = probability_map(result.confidence_masks[3].numpy_view(), rgb.shape[:2])
    return landmarks, hair, skin
