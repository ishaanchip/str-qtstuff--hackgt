"""Procedural photo-to-mesh shirt fitting and a small orthographic CPU renderer.

Coordinates follow MediaPipe: x right, y down, z away from the camera, meters.
The inferred depth is a template assumption, not reconstructed cloth geometry.
"""
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


@dataclass
class ShirtMesh:
    uv: np.ndarray
    faces: np.ndarray
    side: np.ndarray
    texture: np.ndarray


def demo_texture(size=384):
    texture = np.zeros((size, size, 4), np.uint8)
    outline = np.array([(0.32, .03), (.42, .03), (.45, .10), (.55, .10),
                        (.58, .03), (.68, .03), (.98, .27), (.84, .45),
                        (.73, .35), (.73, .98), (.27, .98), (.27, .35),
                        (.16, .45), (.02, .27)])
    cv2.fillPoly(texture, [(outline * (size - 1)).astype(np.int32)], (195, 110, 35, 255))
    cv2.putText(texture, 'TRY ON', (int(size*.32), int(size*.48)),
                cv2.FONT_HERSHEY_SIMPLEX, size/650, (255, 255, 255, 255), 2, cv2.LINE_AA)
    return texture


def load_texture(path=None, remove_white=False):
    if path is None:
        return demo_texture()
    texture = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if texture is None:
        raise ValueError(f'Cannot read shirt image: {path}')
    if texture.dtype != np.uint8:
        raise ValueError('Use an 8-bit PNG or JPEG shirt image.')
    if texture.ndim == 2:
        texture = cv2.cvtColor(texture, cv2.COLOR_GRAY2BGRA)
    elif texture.shape[2] == 3:
        texture = cv2.cvtColor(texture, cv2.COLOR_BGR2BGRA)
    if remove_white:
        # Only remove near-white pixels connected to an image edge. This keeps
        # enclosed white logos, but cannot distinguish a white shirt/background.
        white = (texture[:, :, :3].min(axis=2) > 235).astype(np.uint8)
        _, labels = cv2.connectedComponents(white)
        edge_labels = np.unique(np.concatenate((labels[0], labels[-1], labels[:, 0], labels[:, -1])))
        edge_labels = edge_labels[edge_labels != 0]
        texture[np.isin(labels, edge_labels), 3] = 0
    alpha = texture[:, :, 3]
    if not np.any(alpha > 128):
        raise ValueError('The shirt image is empty after background removal.')
    if not np.any(alpha < 128):
        raise ValueError('Use a transparent shirt PNG, or --remove-white-background for a plain white background.')
    # Normalize the silhouette with a small margin to match the template anchors.
    ys, xs = np.where(alpha > 128)
    crop = texture[ys.min():ys.max()+1, xs.min():xs.max()+1]
    canvas = np.zeros((512, 512, 4), np.uint8)
    canvas[10:502, 10:502] = cv2.resize(crop, (492, 492), interpolation=cv2.INTER_AREA)
    return canvas


def build_mesh(texture, resolution=30):
    """Two UV-textured panels, joined at their silhouette, with fitted depth."""
    if resolution < 8 or resolution > 100:
        raise ValueError('Mesh resolution must be between 8 and 100.')
    u, v = np.meshgrid(np.linspace(0, 1, resolution+1), np.linspace(0, 1, resolution+1))
    uv = np.column_stack((u.ravel(), v.ravel())).astype(np.float32)
    faces = []
    h, w = texture.shape[:2]
    for row in range(resolution):
        for col in range(resolution):
            a = row*(resolution+1)+col
            for tri in ((a, a+1, a+resolution+2), (a, a+resolution+2, a+resolution+1)):
                center = uv[list(tri)].mean(axis=0)
                samples = np.vstack((uv[list(tri)], center))
                samples = np.rint(samples*[w-1, h-1]).astype(int)
                if np.any(texture[samples[:, 1], samples[:, 0], 3] > 128):
                    faces.append(tri)
    if not faces:
        raise ValueError('No garment triangles found; use a larger silhouette or mesh resolution.')
    faces = np.array(faces, dtype=np.int32)
    used, inverse = np.unique(faces, return_inverse=True)
    uv, faces = uv[used], inverse.reshape(-1, 3)
    # Snap exterior grid vertices to the alpha contour so the hem and neck
    # follow the photograph instead of displaying a staircase of grid cells.
    contours, _ = cv2.findContours((texture[:, :, 3] > 128).astype(np.uint8),
                                   cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    boundary = np.concatenate(contours).reshape(-1, 2)
    pixels = np.rint(uv*[w-1, h-1]).astype(int)
    for index, pixel in enumerate(pixels):
        if texture[pixel[1], pixel[0], 3] <= 128:
            nearest = boundary[np.argmin(np.sum((boundary-pixel)**2, axis=1))]
            uv[index] = nearest/[w-1, h-1]
    uv, inverse = np.unique(uv, axis=0, return_inverse=True)
    faces = inverse[faces]
    a, b, c = uv[faces[:, 0]], uv[faces[:, 1]], uv[faces[:, 2]]
    area = (b[:, 0]-a[:, 0])*(c[:, 1]-a[:, 1])-(b[:, 1]-a[:, 1])*(c[:, 0]-a[:, 0])
    faces = faces[area > 1e-8]
    if not len(faces):
        raise ValueError('Garment silhouette is too thin to mesh at this resolution.')
    n = len(uv)
    all_faces = [*faces, *(faces[:, ::-1]+n)]
    edges = {}
    for face in faces:
        for a, b in zip(face, np.roll(face, -1)):
            key = tuple(sorted((a, b)))
            edges.setdefault(key, []).append((a, b))
    for occurrences in edges.values():
        if len(occurrences) == 1:
            a, b = occurrences[0]
            all_faces.extend(((a, b+n, b), (a, a+n, b+n)))
    return ShirtMesh(np.tile(uv, (2, 1)), np.array(all_faces, np.int32),
                     np.repeat([-1., 1.], n), texture)


def fit_mesh(mesh, joints, ease=1.08, depth=.20):
    """Fit shoulders/hips and bend short sleeves toward the elbows.

    UV anchors assume a front-facing, upright, short-sleeved shirt: shoulder
    centers at (.27,.05)/(.73,.05), hem at v=.98. Back reuses the front texture.
    """
    ls, rs, lh, rh = joints[[12, 11, 24, 23]]
    across = rs-ls
    width = np.linalg.norm(across)
    down = (lh+rh-ls-rs)/2
    height = np.linalg.norm(down)
    normal = np.cross(across, down)
    normal_length = np.linalg.norm(normal)
    if width < .05 or height < .05 or normal_length < 1e-5:
        raise ValueError('Degenerate torso landmarks.')
    normal /= normal_length
    vertical = down / height
    u, v = mesh.uv.T
    x = (u-.5)/.46
    y = (v-.05)/.93
    center = (ls+rs)/2 + y[:, None]*down
    # Gentle taper toward the hips, while retaining realistic shoulder breadth.
    hip_width = np.clip(np.linalg.norm(rh-lh)/width, .75, 1.15)
    taper = 1 + np.clip(y, 0, 1)*(hip_width-1)
    vertices = center + (x*ease*taper)[:, None]*across
    # Rounded front/back surfaces, with nonzero thickness at the seam.
    bulge = np.sqrt(np.maximum(.08, 1-np.minimum(np.abs(x)*1.65, .97)**2))
    vertices += (mesh.side*width*depth*bulge)[:, None]*normal
    for sign, shoulder_idx, elbow_idx in ((-1, 12, 14), (1, 11, 13)):
        selected = sign*x > .50
        if not np.any(selected):
            continue
        arm = joints[elbow_idx]-joints[shoulder_idx]
        arm_length = np.linalg.norm(arm)
        if arm_length < .03:
            continue
        direction = arm/arm_length
        sleeve_down = vertical - direction*np.dot(vertical, direction)
        sleeve_down /= max(np.linalg.norm(sleeve_down), 1e-6)
        reach = np.clip((np.abs(x[selected])-.50)/.59, 0, 1)
        sleeve = (joints[shoulder_idx] + reach[:, None]*arm*.65
                  + ((v[selected]-.20)/.93*height)[:, None]*sleeve_down
                  + (mesh.side[selected]*width*depth*.55)[:, None]*normal)
        blend = np.clip((np.abs(x[selected])-.50)/.16, 0, 1)[:, None]
        vertices[selected] = vertices[selected]*(1-blend)+sleeve*blend
    return vertices.astype(np.float32)


def camera_projection(world, normalized, shape):
    """Fit weak-perspective scale/translation from torso landmarks."""
    h, w = shape[:2]
    ids = [11, 12, 23, 24]
    src = world[ids, :2]
    dst = normalized[ids, :2]*[w, h]
    src_center, dst_center = src.mean(axis=0), dst.mean(axis=0)
    denom = np.sum((src-src_center)**2)
    if denom < 1e-8:
        raise ValueError('Torso is too small to project.')
    scale = np.sum((src-src_center)*(dst-dst_center))/denom
    if not np.isfinite(scale) or scale <= 0:
        raise ValueError('Invalid body projection.')
    return scale, dst_center-scale*src_center


def arm_depth_buffer(world, normalized, shape, scale, visibility):
    """Approximate exposed forearms/hands with depth-tested capsules."""
    h, w = shape[:2]
    depth = np.full((h, w), np.inf, np.float32)
    radius = max(3., np.linalg.norm(world[11]-world[12])*scale*.065)
    for a, b in ((13, 15), (15, 19), (14, 16), (16, 20)):
        if min(visibility[a], visibility[b]) < .55:
            continue
        start, end = normalized[[a, b], :2]*[w, h]
        lo = np.maximum(np.floor(np.minimum(start, end)-radius).astype(int), 0)
        hi = np.minimum(np.ceil(np.maximum(start, end)+radius).astype(int)+1, [w, h])
        if np.any(hi <= lo):
            continue
        yy, xx = np.mgrid[lo[1]:hi[1], lo[0]:hi[0]]
        delta = end-start
        t = np.clip(((xx-start[0])*delta[0]+(yy-start[1])*delta[1])/max(np.dot(delta, delta), 1e-6), 0, 1)
        distance = (xx-start[0]-t*delta[0])**2+(yy-start[1]-t*delta[1])**2
        z = world[a, 2]*(1-t)+world[b, 2]*t-radius/scale*.5
        region = depth[lo[1]:hi[1], lo[0]:hi[0]]
        np.minimum(region, np.where(distance <= radius**2, z, np.inf), out=region)
    return depth


def render(frame, mesh, vertices, scale, offset, occluder=None):
    """Rasterize UV triangles with a per-pixel z-buffer and alpha compositing."""
    output = frame.copy()
    h, w = frame.shape[:2]
    screen = vertices[:, :2]*scale+offset
    zbuffer = np.full((h, w), np.inf, np.float32) if occluder is None else occluder.copy()
    th, tw = mesh.texture.shape[:2]
    for face in mesh.faces:
        p = screen[face]
        lo = np.maximum(np.floor(p.min(axis=0)).astype(int), 0)
        hi = np.minimum(np.ceil(p.max(axis=0)).astype(int)+1, [w, h])
        if np.any(hi <= lo):
            continue
        a, b, c = p
        denom = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(denom) < 1e-6:
            continue
        yy, xx = np.mgrid[lo[1]:hi[1], lo[0]:hi[0]]
        xx, yy = xx+.5, yy+.5
        wa = ((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/denom
        wb = ((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/denom
        wc = 1-wa-wb
        z = wa*vertices[face[0], 2]+wb*vertices[face[1], 2]+wc*vertices[face[2], 2]
        region_z = zbuffer[lo[1]:hi[1], lo[0]:hi[0]]
        mask = (wa >= -1e-5)&(wb >= -1e-5)&(wc >= -1e-5)&(z < region_z)
        if not mask.any():
            continue
        uv = wa[..., None]*mesh.uv[face[0]]+wb[..., None]*mesh.uv[face[1]]+wc[..., None]*mesh.uv[face[2]]
        tx = np.clip(np.rint(uv[..., 0]*(tw-1)).astype(int), 0, tw-1)
        ty = np.clip(np.rint(uv[..., 1]*(th-1)).astype(int), 0, th-1)
        rgba = mesh.texture[ty, tx]
        mask &= rgba[..., 3] > 128
        # Stable ambient/diffuse shading makes the inferred volume visible.
        normal = np.cross(vertices[face[1]]-vertices[face[0]], vertices[face[2]]-vertices[face[0]])
        light = .65+.35*abs(normal[2])/max(np.linalg.norm(normal), 1e-9)
        alpha = rgba[..., 3:4]/255.
        region = output[lo[1]:hi[1], lo[0]:hi[0]]
        # Composite against the original frame, so overwritten back faces do not bleed through.
        base = frame[lo[1]:hi[1], lo[0]:hi[0]]
        color = rgba[..., :3]*light*alpha+base*(1-alpha)
        region[mask] = color[mask].astype(np.uint8)
        region_z[mask] = z[mask]
    return output


def reference_pose():
    joints = np.zeros((33, 3), np.float32)
    for shoulder, elbow, wrist, hip, sign in ((12, 14, 16, 24, -1), (11, 13, 15, 23, 1)):
        joints[shoulder] = [sign*.22, -.52, 0]
        joints[elbow] = [sign*.45, -.30, 0]
        joints[wrist] = [sign*.57, -.06, -.03]
        joints[hip] = [sign*.18, 0, 0]
    return joints


def export_obj(path, mesh, vertices):
    """Static fitted mesh in meters; OBJ + MTL + PNG, not an animated rig."""
    path = Path(path).with_suffix('.obj')
    path.parent.mkdir(parents=True, exist_ok=True)
    # Fixed safe sibling names avoid whitespace parsing issues in material paths.
    material = path.with_name(path.stem.replace(' ', '_')+'_material.mtl')
    texture = material.with_suffix('.png')
    if not cv2.imwrite(str(texture), mesh.texture):
        raise OSError(f'Cannot write texture: {texture}')
    material.write_text(f'newmtl shirt\nKd 1 1 1\nKa 0.2 0.2 0.2\nd 1\nmap_Kd {texture.name}\n', encoding='utf-8')
    with path.open('w', encoding='utf-8') as out:
        out.write(f'# meters; x right, y down, z away\nmtllib {material.name}\nusemtl shirt\n')
        for point in vertices:
            out.write('v '+' '.join(f'{value:.6f}' for value in point)+'\n')
        for u, v in mesh.uv:
            out.write(f'vt {u:.6f} {1-v:.6f}\n')
        for face in mesh.faces+1:
            out.write('f '+' '.join(f'{i}/{i}' for i in face)+'\n')
    return path
