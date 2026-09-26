from collections import Counter
from types import SimpleNamespace

import cv2
import numpy as np
import pytest

from garment import (arm_depth_buffer, build_mesh, camera_projection, demo_texture,
                     export_obj, fit_mesh, load_texture, reference_pose, render)
from transposer import PoseFilter, main


def test_mesh_has_volume_uvs_and_closed_edges():
    mesh = build_mesh(demo_texture(), 16)
    vertices = fit_mesh(mesh, reference_pose())
    assert vertices[:, 2].min() < -.02
    assert vertices[:, 2].max() > .02
    assert np.all((mesh.uv >= 0) & (mesh.uv <= 1))
    edges = Counter(tuple(sorted((a, b))) for face in mesh.faces for a, b in zip(face, np.roll(face, -1)))
    assert set(edges.values()) == {2}
    assert np.isfinite(vertices).all()


def test_follows_translation_rotation_and_elbows():
    mesh = build_mesh(demo_texture(), 16)
    joints = reference_pose()
    vertices = fit_mesh(mesh, joints)
    translation = np.array([.4, -.2, 1.2])
    np.testing.assert_allclose(fit_mesh(mesh, joints+translation), vertices+translation, atol=1e-6)
    angle = .6
    rotation = np.array([[np.cos(angle), 0, np.sin(angle)], [0, 1, 0], [-np.sin(angle), 0, np.cos(angle)]])
    np.testing.assert_allclose(fit_mesh(mesh, joints@rotation.T), vertices@rotation.T, atol=1e-6)
    joints[13, 1] -= .35
    moved = fit_mesh(mesh, joints)
    assert np.linalg.norm(moved[mesh.uv[:, 0] > .8]-vertices[mesh.uv[:, 0] > .8]) > .1
    np.testing.assert_allclose(moved[mesh.uv[:, 0] < .6], vertices[mesh.uv[:, 0] < .6])


def test_straight_silhouette_edges_have_no_missing_half_cells():
    texture = np.zeros((64, 64, 4), np.uint8)
    texture[9:55, 17:47] = [120, 80, 30, 255]
    mesh = build_mesh(texture, 16)
    front = mesh.faces[np.all(mesh.faces < len(mesh.uv)//2, axis=1)]
    edges = Counter(tuple(sorted((a, b))) for face in front
                    for a, b in zip(face, np.roll(face, -1)))
    for edge, count in edges.items():
        if count == 1:
            points = mesh.uv[list(edge)]
            assert any(np.allclose(points[:, axis], value/63)
                       for axis, value in ((0, 17), (0, 46), (1, 9), (1, 54)))


def test_projection_matches_known_camera():
    world = reference_pose()
    normalized = world.copy()
    normalized[:, :2] = (world[:, :2]*500+[320, 360])/[640, 480]
    scale, offset = camera_projection(world, normalized, (480, 640, 3))
    assert scale == pytest.approx(500, abs=1e-4)
    np.testing.assert_allclose(offset, [320, 360], atol=1e-4)


def test_renderer_depth_order_and_occlusion():
    mesh = build_mesh(demo_texture(), 12)
    vertices = fit_mesh(mesh, reference_pose())
    frame = np.full((200, 240, 3), 50, np.uint8)
    result = render(frame, mesh, vertices, 220, np.array([120, 160]))
    assert np.count_nonzero(result != frame) > 1000
    np.testing.assert_array_equal(result[0, 0], frame[0, 0])
    mesh.faces = mesh.faces[::-1].copy()
    np.testing.assert_array_equal(render(frame, mesh, vertices, 220, np.array([120, 160])), result)
    hidden = render(frame, mesh, vertices, 220, np.array([120, 160]), np.full(frame.shape[:2], -100.))
    np.testing.assert_array_equal(hidden, frame)
    # Fully offscreen geometry is clipped without invalid indexing.
    np.testing.assert_array_equal(render(frame, mesh, vertices, 220, np.array([-1000, -1000])), frame)


def test_white_removal_and_input_errors(tmp_path):
    with pytest.raises(ValueError, match='Cannot read'):
        load_texture(tmp_path/'missing.png')
    img = np.full((100, 100, 3), 255, np.uint8)
    img[20:80, 20:80] = [120, 30, 50]
    img[40:50, 40:50] = 255
    path = tmp_path/'shirt.png'
    cv2.imwrite(str(path), img)
    with pytest.raises(ValueError, match='transparent'):
        load_texture(path)
    texture = load_texture(path, True)
    assert texture[0, 0, 3] == 0
    assert texture[210, 210, 3] == 255  # enclosed white logo survives
    with pytest.raises(ValueError, match='No garment'):
        build_mesh(np.zeros((64, 64, 4), np.uint8))
    with pytest.raises(ValueError, match='Degenerate'):
        fit_mesh(build_mesh(demo_texture()), np.zeros((33, 3)))


def test_forearm_occlusion_confidence():
    world = reference_pose()
    normalized = world.copy()
    normalized[:, :2] = (world[:, :2]*200+[120, 160])/[240, 200]
    depth = arm_depth_buffer(world, normalized, (200, 240), 200, np.ones(33))
    assert np.isfinite(depth).any()
    assert np.isinf(arm_depth_buffer(world, normalized, (200, 240), 200, np.zeros(33))).all()


def test_tracking_loss_clears_smoothing():
    tracker = PoseFilter()
    points = [SimpleNamespace(x=float(p[0]), y=float(p[1]), z=float(p[2]), visibility=1., presence=1.) for p in reference_pose()]
    result = SimpleNamespace(pose_landmarks=[points], pose_world_landmarks=[points])
    assert tracker.update(result) is not None
    points[11].visibility = .1
    assert tracker.update(result) is None
    assert tracker.world is None
    points[11].visibility = 1.
    assert tracker.update(result) is not None
    assert tracker.update(SimpleNamespace(pose_landmarks=[], pose_world_landmarks=[])) is None
    assert tracker.world is None


def test_headless_preview_and_obj(tmp_path):
    preview, obj = tmp_path/'preview.png', tmp_path/'shirt.obj'
    assert main(['--preview', str(preview), '--export', str(obj), '--resolution', '12']) == 0
    assert cv2.imread(str(preview)).shape == (640, 800, 3)
    contents = obj.read_text()
    assert '\nv ' in contents and '\nvt ' in contents and '\nf ' in contents
    assert (tmp_path/'shirt_material.mtl').exists()
    assert cv2.imread(str(tmp_path/'shirt_material.png'), cv2.IMREAD_UNCHANGED).shape[2] == 4
