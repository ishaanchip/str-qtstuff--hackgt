"""Webcam 3D shirt try-on. Run with --help for image, preview and export options."""
import argparse
from pathlib import Path
import time
import urllib.request

import cv2
import numpy as np

from garment import (arm_depth_buffer, build_mesh, camera_projection, export_obj,
                     fit_mesh, load_texture, reference_pose, render)

MODEL_URL = ('https://storage.googleapis.com/mediapipe-models/pose_landmarker/'
             'pose_landmarker_lite/float16/latest/pose_landmarker_lite.task')
DEFAULT_MODEL = Path(__file__).parent / 'models' / 'pose_landmarker_lite.task'


def positive_float(value):
    number = float(value)
    if not np.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError('Must be a positive finite number.')
    return number


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--shirt', type=Path, help='Front-facing shirt PNG with transparent background; defaults to a demo shirt.')
    parser.add_argument('--remove-white-background', action='store_true', help='Remove edge-connected white background (unsuitable for white shirts).')
    parser.add_argument('--camera', type=int, default=0)
    parser.add_argument('--model', type=Path, default=DEFAULT_MODEL)
    parser.add_argument('--download-model', action='store_true', help='Download the official MediaPipe lite pose model if missing.')
    parser.add_argument('--resolution', type=int, choices=range(8, 101), default=24, metavar='8..100')
    parser.add_argument('--ease', type=positive_float, default=1.08, help='Shirt width multiplier (default 1.08).')
    parser.add_argument('--depth', type=positive_float, default=.20, help='Half-depth as a fraction of shoulder width (default .20).')
    parser.add_argument('--no-mirror', action='store_true')
    parser.add_argument('--no-arm-occlusion', action='store_true')
    parser.add_argument('--export', type=Path, help='Export a reference-pose OBJ, MTL, and texture before running.')
    parser.add_argument('--preview', type=Path, help='Save a synthetic try-on PNG without loading tracking or opening a camera, then exit.')
    return parser.parse_args(argv)


class PoseFilter:
    """Reject uncertain torsos and reset smoothing immediately on tracking loss."""
    def __init__(self, weight=.45):
        self.weight = weight
        self.world = None
        self.normalized = None

    def update(self, result):
        if not result.pose_landmarks or not result.pose_world_landmarks:
            self.reset()
            return None
        image_landmarks = result.pose_landmarks[0]
        world_landmarks = result.pose_world_landmarks[0]
        if len(image_landmarks) != 33 or len(world_landmarks) != 33:
            self.reset()
            return None
        visibility = np.array([min(p.visibility if p.visibility is not None else 0.,
                                   p.presence if p.presence is not None else 0.)
                               for p in image_landmarks])
        world = np.array([[p.x, p.y, p.z] for p in world_landmarks], np.float32)
        normalized = np.array([[p.x, p.y, p.z] for p in image_landmarks], np.float32)
        if (not np.isfinite(world).all() or not np.isfinite(normalized).all()
                or not np.isfinite(visibility).all() or visibility[[11, 12, 23, 24]].min() < .6):
            self.reset()
            return None
        # With an unseen elbow, keep the sleeve in a neutral outward/downward pose.
        for shoulder, elbow, sign in ((12, 14, -1), (11, 13, 1)):
            if visibility[elbow] < .55:
                across = world[11]-world[12]
                down = (world[23]+world[24]-world[11]-world[12])/2
                world[elbow] = world[shoulder]+sign*.35*across+.4*down
        if self.world is not None:
            world = self.weight*world+(1-self.weight)*self.world
            normalized = self.weight*normalized+(1-self.weight)*self.normalized
        self.world, self.normalized = world, normalized
        return world, normalized, visibility

    def reset(self):
        self.world = self.normalized = None


def save_preview(path, mesh, vertices):
    frame = np.full((640, 800, 3), (38, 32, 28), np.uint8)
    scale, offset = 700., np.array([400., 480.])
    joints = reference_pose()
    pixels = (joints[:, :2]*scale+offset).astype(int)
    cv2.ellipse(frame, (400, 68), (45, 55), 0, 0, 360, (180, 190, 205), -1)
    cv2.fillConvexPoly(frame, pixels[[12, 11, 23, 24]], (150, 160, 175))
    for a, b in ((12, 14), (14, 16), (11, 13), (13, 15)):
        cv2.line(frame, tuple(pixels[a]), tuple(pixels[b]), (180, 190, 205), 28)
    frame = render(frame, mesh, vertices, scale, offset)
    cv2.putText(frame, 'Synthetic 3D shirt preview', (20, 610), cv2.FONT_HERSHEY_SIMPLEX, .7, (235, 235, 235), 1)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(path), frame):
        raise OSError(f'Cannot save preview: {path}')


def run_camera(args, mesh):
    if not args.model.is_file():
        if not args.download_model:
            raise ValueError(f'Pose model missing: {args.model}. Run again with --download-model, or supply --model PATH.')
        args.model.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.model.with_suffix('.download')
        print('Downloading the official MediaPipe pose model...')
        try:
            with urllib.request.urlopen(MODEL_URL, timeout=60) as source, temporary.open('wb') as target:
                while chunk := source.read(1024*1024):
                    target.write(chunk)
            temporary.replace(args.model)
        finally:
            temporary.unlink(missing_ok=True)
    # Keep tracking imports lazy: preview/export and geometry tests need no model.
    import mediapipe as mp
    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(args.model)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        num_poses=1, min_pose_detection_confidence=.6,
        min_pose_presence_confidence=.6, min_tracking_confidence=.6)
    cap = cv2.VideoCapture(args.camera)
    try:
        if not cap.isOpened():
            raise RuntimeError(f'Cannot open camera {args.camera}. Check camera permission or try --camera 1.')
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        tracker = PoseFilter()
        last_timestamp = -1
        last_vertices = None
        with mp.tasks.vision.PoseLandmarker.create_from_options(options) as pose:
            print('q / Esc: quit; s: export current fitted shirt to output/fitted_shirt.obj')
            while True:
                ok, frame = cap.read()
                if not ok:
                    raise RuntimeError('Camera stopped providing frames.')
                if not args.no_mirror:
                    frame = cv2.flip(frame, 1)
                start = time.monotonic()
                timestamp = max(last_timestamp+1, time.monotonic_ns()//1_000_000)
                last_timestamp = timestamp
                result = pose.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,
                                                       data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), timestamp)
                tracked = tracker.update(result)
                last_vertices = None
                message = 'Step back: keep shoulders and hips visible'
                if tracked is not None:
                    world, normalized, visibility = tracked
                    try:
                        vertices = fit_mesh(mesh, world, args.ease, args.depth)
                        scale, offset = camera_projection(world, normalized, frame.shape)
                        occluder = None if args.no_arm_occlusion else arm_depth_buffer(
                            world, normalized, frame.shape, scale, visibility)
                        frame = render(frame, mesh, vertices, scale, offset, occluder)
                        last_vertices = vertices
                        message = f'3D try-on | {1/max(time.monotonic()-start, .001):.1f} FPS | q: quit | s: save mesh'
                    except ValueError:
                        tracker.reset()
                        message = 'Face camera with torso visible to fit shirt'
                cv2.putText(frame, message, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, .5, (255, 255, 255), 1, cv2.LINE_AA)
                cv2.imshow('3D Shirt Try-On', frame)
                key = cv2.waitKey(1) & 0xFF
                if key in (ord('q'), 27):
                    break
                if key == ord('s') and last_vertices is not None:
                    print(f'Saved {export_obj(Path("output/fitted_shirt.obj"), mesh, last_vertices)}')
                if cv2.getWindowProperty('3D Shirt Try-On', cv2.WND_PROP_VISIBLE) < 1:
                    break
    finally:
        cap.release()
        cv2.destroyAllWindows()


def main(argv=None):
    args = parse_args(argv)
    try:
        mesh = build_mesh(load_texture(args.shirt, args.remove_white_background), args.resolution)
        vertices = fit_mesh(mesh, reference_pose(), args.ease, args.depth)
        if args.export:
            print(f'Saved {export_obj(args.export, mesh, vertices)}')
        if args.preview:
            save_preview(args.preview, mesh, vertices)
            print(f'Saved {args.preview}')
            return 0
        run_camera(args, mesh)
        return 0
    except (ValueError, RuntimeError, OSError, cv2.error) as exc:
        print(f'Try-on error: {exc}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
