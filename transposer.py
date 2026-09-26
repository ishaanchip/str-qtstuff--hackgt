"""
transposer.py — MediaPipe Pose landmark test

Opens your webcam, runs MediaPipe Pose on each frame, and draws
the detected landmarks + skeleton connections live on screen.

Also prints out the pixel coordinates of the key landmarks
you'll need later for garment warping (shoulders, hips, knees, ankles)
so you can sanity-check they look right before building the overlay.

Press 'q' to quit.
"""

import cv2
import mediapipe as mp

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# Landmark indices we'll care about for garment placement later
KEY_LANDMARKS = {
    "L_SHOULDER": mp_pose.PoseLandmark.LEFT_SHOULDER,
    "R_SHOULDER": mp_pose.PoseLandmark.RIGHT_SHOULDER,
    "L_HIP": mp_pose.PoseLandmark.LEFT_HIP,
    "R_HIP": mp_pose.PoseLandmark.RIGHT_HIP,
    "L_KNEE": mp_pose.PoseLandmark.LEFT_KNEE,
    "R_KNEE": mp_pose.PoseLandmark.RIGHT_KNEE,
    "L_ANKLE": mp_pose.PoseLandmark.LEFT_ANKLE,
    "R_ANKLE": mp_pose.PoseLandmark.RIGHT_ANKLE,
}


def main():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Could not open webcam. Check the camera index (try 1 instead of 0).")
        return

    # model_complexity: 0 = lite (fastest), 1 = full, 2 = heavy (most accurate, slowest)
    with mp_pose.Pose(
        model_complexity=0,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                print("Failed to read frame from webcam.")
                break

            # Flip horizontally so it acts like a mirror (more natural for try-on)
            frame = cv2.flip(frame, 1)

            # MediaPipe expects RGB; OpenCV gives BGR
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb_frame.flags.writeable = False  # perf optimization
            results = pose.process(rgb_frame)

            rgb_frame.flags.writeable = True
            frame = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR)

            h, w = frame.shape[:2]

            if results.pose_landmarks:
                # Draw full skeleton overlay
                mp_drawing.draw_landmarks(
                    frame,
                    results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style(),
                )

                # Highlight + print the key landmarks we'll use for garment anchoring
                y_offset = 20
                for name, idx in KEY_LANDMARKS.items():
                    lm = results.pose_landmarks.landmark[idx]
                    px, py = int(lm.x * w), int(lm.y * h)

                    # Draw a bigger colored dot on the key points
                    cv2.circle(frame, (px, py), 8, (0, 255, 0), -1)
                    cv2.putText(
                        frame, name, (px + 10, py),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1
                    )

                    # Print coords + visibility in the corner for debugging
                    text = f"{name}: ({px},{py}) vis={lm.visibility:.2f}"
                    cv2.putText(
                        frame, text, (10, y_offset),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1
                    )
                    y_offset += 15

                # Also check world landmarks (used later for rotation angle)
                if results.pose_world_landmarks:
                    l_sh = results.pose_world_landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
                    r_sh = results.pose_world_landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER]
                    dz = l_sh.z - r_sh.z
                    cv2.putText(
                        frame, f"shoulder dz (rotation cue): {dz:.3f}",
                        (10, y_offset + 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 255), 1
                    )
            else:
                cv2.putText(
                    frame, "No person detected", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2
                )

            cv2.imshow("MediaPipe Pose Test", frame)

            if cv2.waitKey(5) & 0xFF == ord('q'):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()