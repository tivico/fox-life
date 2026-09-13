"""Fox Life stylized fox V0.1 — run inside Blender, or with --background --python.

No downloads, textures, add-ons or destructive scene clearing. Creates a NEW scene.
Blender Z-up / forward -Y becomes glTF Y-up / forward +Z. Static asset, not rigged.
CLI: blender --background --python generate_fox_v01.py -- --output PATH --render
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

# Artist controls. Head units exclude ears; crown 1.33 / head height .54 ~= 2.46.
HEIGHT = 1.30  # final meters, including ears
VOXEL_SIZE = 0.012
BODY_TRIANGLE_BUDGET = 8000
FUR = '#BF6038'
CREAM = '#F1E3C5'
GREEN = '#648063'
DARK = '#45352D'
INNER_EAR = '#C78D78'


def linear_color(hex_color):
    values = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + .055) / 1.055) ** 2.4 for v in values) + (1,)


def smooth(a, b, x):
    t = max(0, min(1, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    return tuple(x * (1 - t) + y * t for x, y in zip(a, b))


def material(name, color, painted=False):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = linear_color(color)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = mat.diffuse_color
    shader.inputs['Roughness'].default_value = .88
    shader.inputs['Metallic'].default_value = 0
    shader.inputs['Specular IOR Level'].default_value = .22
    if painted:
        vertex = mat.node_tree.nodes.new('ShaderNodeVertexColor')
        vertex.layer_name = 'FoxColors'
        mat.node_tree.links.new(vertex.outputs['Color'], shader.inputs['Base Color'])
    return mat


def activate(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply(obj, modifier):
    activate(obj)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def ellipsoid(name, location, scale):
    detail = name.startswith(('Eye_', 'Nose', 'Bib_Button'))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12 if detail else 24, ring_count=8 if detail else 16, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def loft(name, rings, sides=24):
    """Closed horizontal elliptical rings: (x,y,z,rx,ry). Used for soft ears."""
    vertices = []
    faces = []
    for x, y, z, rx, ry in rings:
        for j in range(sides):
            angle = 2 * math.pi * j / sides
            vertices.append((x + rx * math.cos(angle), y + ry * math.sin(angle), z))
    for i in range(len(rings) - 1):
        for j in range(sides):
            a, b = i * sides + j, i * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.extend([tuple(reversed(range(sides))), tuple(range((len(rings) - 1) * sides, len(rings) * sides))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def tail():
    # Swept brush, root buried in pelvis. Cross-section is perpendicular to path.
    points = [Vector(v) for v in [(0, .08, .52), (.08, .27, .54), (.24, .49, .64),
                                 (.36, .68, .79), (.40, .82, .96), (.38, .88, 1.08)]]
    radii = [.13, .20, .26, .24, .14, .018]
    # Interpolate the brush before fusion so broad planar ring segments do not survive.
    anchors, widths = points, radii
    points, radii = [], []
    def catmull(a, b, c, d, t):
        return .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
    for segment in range(len(anchors) - 1):
        ids = [max(0, segment - 1), segment, segment + 1, min(len(anchors) - 1, segment + 2)]
        for step in range(8):
            t = step / 8
            points.append(catmull(*(anchors[i] for i in ids), t))
            radii.append(catmull(*(widths[i] for i in ids), t))
    points.append(anchors[-1])
    radii.append(widths[-1])
    vertices, faces = [], []
    sides = 24
    for i, point in enumerate(points):
        tangent = (points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]).normalized()
        u = tangent.cross(Vector((0, 0, 1))).normalized()
        v = tangent.cross(u).normalized()
        for j in range(sides):
            angle = math.tau * j / sides
            vertices.append(point + radii[i] * (math.cos(angle) * u + math.sin(angle) * v))
    for i in range(len(points) - 1):
        for j in range(sides):
            a, b = i * sides + j, i * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.extend([tuple(reversed(range(sides))), tuple(range((len(points) - 1) * sides, len(points) * sides))])
    mesh = bpy.data.meshes.new('Tail_volume')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('Tail_volume', mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def build_body():
    parts = [ellipsoid('Pelvis', (0, 0, .47), (.22, .18, .23)),
             ellipsoid('Torso', (0, 0, .65), (.20, .16, .28)),
             ellipsoid('Neck', (0, 0, .85), (.15, .13, .21)),
             ellipsoid('Head', (0, -.018, 1.06), (.29, .25, .27)),
             ellipsoid('Muzzle', (0, -.215, 1.005), (.17, .17, .10)),
             ellipsoid('Snout', (0, -.345, 1.012), (.085, .095, .06))]
    for sign in (-1, 1):
        parts += [ellipsoid('Thigh', (sign * .108, 0, .31), (.095, .105, .19)),
                  ellipsoid('Foot', (sign * .112, -.038, .105), (.091, .132, .095)),
                  ellipsoid('Shoulder', (sign * .177, 0, .745), (.09, .095, .13)),
                  ellipsoid('Arm', (sign * .235, -.004, .60), (.078, .084, .19)),
                  ellipsoid('Paw', (sign * .26, -.022, .455), (.073, .08, .092))]
        parts.append(loft('Ear', [(sign * .18, .008, 1.235, .125, .085),
                                  (sign * .21, .012, 1.36, .095, .070),
                                  (sign * .228, .016, 1.47, .057, .048),
                                  (sign * .233, .018, 1.515, .026, .028),
                                  (sign * .231, .018, 1.526, .009, .012)]))
    parts.append(tail())
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = 'Fox_Body_Continuous'
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    body.data.remesh_voxel_size = VOXEL_SIZE
    bpy.ops.object.voxel_remesh()
    mod = body.modifiers.new('Soften volume transitions', 'SMOOTH')
    mod.factor, mod.iterations = .75, 8
    apply(body, mod)
    body.data.calc_loop_triangles()
    triangle_count = len(body.data.loop_triangles)
    if triangle_count > BODY_TRIANGLE_BUDGET:
        mod = body.modifiers.new('Low poly budget', 'DECIMATE')
        mod.ratio = BODY_TRIANGLE_BUDGET / triangle_count
        apply(body, mod)
    # Recalculate normals and validate the actual fused export surface.
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if any(not edge.is_manifold for edge in bm.edges):
        raise RuntimeError('Body must be a closed manifold before export')
    seen, components = set(), 0
    for vertex in bm.verts:
        if vertex in seen:
            continue
        components += 1
        stack = [vertex]
        while stack:
            current = stack.pop()
            if current in seen:
                continue
            seen.add(current)
            stack.extend(edge.other_vert(current) for edge in current.link_edges)
    if components != 1:
        raise RuntimeError(f'Expected one continuous body, found {components}')
    bm.to_mesh(body.data)
    bm.free()
    return body


def paint(body):
    colors = [linear_color(c) for c in (FUR, CREAM, GREEN, DARK, INNER_EAR)]
    orange, cream, green, dark, inner = colors
    attr = body.data.color_attributes.new(name='FoxColors', type='FLOAT_COLOR', domain='POINT')
    for vertex in body.data.vertices:
        x, y, z = vertex.co
        ax = abs(x)
        color = orange
        face = (1 - smooth(1.04 - ax * .16, 1.08 - ax * .16, z)) * (1 - smooth(-.17, -.10, y)) * smooth(.86, .93, z)
        color = mix(color, cream, face)
        # Tail tip stays on the fused surface, no separate cream ball.
        color = mix(color, cream, smooth(.69, .76, y))
        if z > 1.31 and y < -.025:
            width = max(.018, .075 * (1 - (z - 1.31) / .22))
            ear = (1 - smooth(width * .65, width, abs(ax - (.20 + (z - 1.31) * .17)))) * smooth(1.31, 1.35, z) * (1 - smooth(1.46, 1.50, z))
            color = mix(color, inner, ear)
        # Conforming overalls are painted into the body. Hands stay orange/dark.
        core = 1 - smooth(.175, .215, ax)
        pants = smooth(.16, .20, z) * (1 - smooth(.53, .57, z)) * core * (1 - smooth(.18, .23, y))
        bib = (1 - smooth(.115, .135, ax)) * smooth(.48, .53, z) * (1 - smooth(.70, .735, z)) * (1 - smooth(-.08, -.045, y))
        strap = (1 - smooth(.022, .031, abs(ax - .115))) * smooth(.66, .70, z) * (1 - smooth(.81, .85, z)) * core * (1 - smooth(.16, .19, abs(y)))
        color = mix(color, green, max(pants, bib, strap))
        paw = (1 - smooth(.12, .18, z)) if z < .25 else (smooth(.22, .25, ax) * (1 - smooth(.43, .48, z)) * (1 - smooth(.08, .16, y)))
        color = mix(color, dark, paw)
        attr.data[vertex.index].color = color
    body.data.materials.clear()
    body.data.materials.append(material('Fox_Matte_VertexPalette', FUR, painted=True))


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def studio(scene):
    scene.world = bpy.data.worlds.new('Fox_Studio_World')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.68, .65, .58, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .35
    bpy.ops.mesh.primitive_plane_add(size=200)
    floor = bpy.context.object
    floor.name = 'PREVIEW_ONLY_Floor'
    floor.location.z = -.006
    floor.data.materials.append(material('Studio_sand', '#D9D2C3'))
    for name, position, energy, size in [('Key', (3, -4, 5), 450, 4), ('Fill', (-3, -1, 3), 250, 3), ('Rim', (1, 3, 4), 500, 3)]:
        data = bpy.data.lights.new(name, 'AREA')
        data.energy, data.shape, data.size = energy, 'DISK', size
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = position
        aim(obj, (0, 0, .65))
    data = bpy.data.cameras.new('Preview_Camera')
    camera = bpy.data.objects.new('Preview_Camera', data)
    scene.collection.objects.link(camera)
    camera.location = (2.8, -4.5, 2.1)
    data.type, data.ortho_scale = 'ORTHO', 1.95
    aim(camera, (0, .12, .65))
    scene.camera = camera
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    return camera


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent / 'generated')
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--overwrite', action='store_true')
    options = parser.parse_args(args)
    output = options.output.resolve()
    if not options.overwrite and any((output / ('fox_v01' + ext)).exists() for ext in ('.blend', '.glb', '_report.json', '_preview.png', '_side.png')):
        raise FileExistsError('Output exists; choose another --output or explicitly pass --overwrite')
    output.mkdir(parents=True, exist_ok=True)
    scene = bpy.data.scenes.new('Fox_Life_Asset_V01')
    bpy.context.window.scene = scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    body = build_body()
    paint(body)
    dark = material('Fox_Eyes_Nose', DARK)
    details = []
    for sign in (-1, 1):
        eye = ellipsoid('Eye_L' if sign < 0 else 'Eye_R', (sign * .126, -.245, 1.10), (.018, .010, .025))
        eye.rotation_euler.z = sign * -.22
        eye.data.materials.append(dark)
        details.append(eye)
    nose = ellipsoid('Nose', (0, -.435, 1.02), (.032, .018, .022))
    nose.data.materials.append(dark)
    details.append(nose)
    buttons = material('Overall_Buttons', '#C8B68B')
    for sign in (-1, 1):
        hit, location, _normal, _index = body.ray_cast(Vector((sign * .11, -1, .704)), Vector((0, 1, 0)))
        if not hit:
            raise RuntimeError('Could not place bib button on garment surface')
        button = ellipsoid('Bib_Button', (sign * .11, location.y - .004, .704), (.013, .008, .013))
        button.data.materials.append(buttons)
        details.append(button)
    models = [body] + details
    min_z = min(v.co.z for v in body.data.vertices)
    max_z = max(v.co.z for v in body.data.vertices)
    scale = HEIGHT / (max_z - min_z)
    root = bpy.data.objects.new('FoxLife_V01', None)
    scene.collection.objects.link(root)
    for obj in models:
        for vertex in obj.data.vertices:
            vertex.co *= scale
        obj.location *= scale
        obj.location.z -= min_z * scale
        activate(obj)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.parent = root
    root['asset_version'] = 'Fox Life low-poly stylized fox V0.1'
    root['forward_blender'] = '-Y'
    root['head_units_excluding_ears'] = 2.46
    root['rigged'] = False
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [root] + models:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(output / 'fox_v01.glb'), export_format='GLB', use_selection=True,
                              use_active_scene=True, export_yup=True, export_animations=False, export_cameras=False,
                              export_lights=False, export_extras=True)
    triangle_count = 0
    for obj in models:
        obj.data.calc_loop_triangles()
        triangle_count += len(obj.data.loop_triangles)
    camera = studio(scene)
    activate(root)
    report = {'blender': bpy.app.version_string, 'height_m': HEIGHT, 'head_units_excluding_ears': 2.46,
              'mesh_objects': len(models), 'triangles': triangle_count, 'body_connected_components': 1,
              'body_manifold': True, 'rigged': False, 'external_textures': 0,
              'glb_forward': '+Z', 'glb_up': '+Y', 'note': 'Static concept mesh; retopology/rigging still needed for deformation.'}
    (output / 'fox_v01_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    scene.render.filepath = str(output / 'fox_v01_preview.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(output / 'fox_v01.blend'))
    if options.render:
        bpy.ops.render.render(write_still=True)
        camera.location = (4, -1, 1.9)
        aim(camera, (0, .16, .65))
        scene.render.filepath = str(output / 'fox_v01_side.png')
        bpy.ops.render.render(write_still=True)
    print('FOX_ASSET_REPORT ' + json.dumps(report))


if __name__ == '__main__':
    main()
