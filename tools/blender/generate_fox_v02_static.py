"""Fox v02 static: crisp PBR material blocks, fitted solid overalls; no rig/animation.

Uses v01's geometry builder without changing its script or artifacts.
blender --background --factory-startup --python tools/blender/generate_fox_v02_static.py -- --output assets/fox-v02 --render
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

spec = importlib.util.spec_from_file_location('fox_v01_geometry', Path(__file__).with_name('generate_fox_v01.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

PALETTE = {
    'Orange_Fur': '#BC713F', 'Cream_Fur': '#EEE1C5', 'Green_Overalls': '#647D57',
    'Dark_Paws': '#493C32', 'Eyes': '#362E2B', 'Nose': '#40322A', 'Buttons': '#DFCEAA',
}


def make_materials():
    materials = {}
    for name, color in PALETTE.items():
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = base.linear_color(color)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value = mat.diffuse_color
        shader.inputs['Roughness'].default_value = .95 if name == 'Green_Overalls' else .90
        shader.inputs['Metallic'].default_value = 0
        # Use default specular, driven down visually by high roughness; no extra glTF extension needed.
        materials[name] = mat
    return materials


def cut(bm, normal, distance):
    n = Vector(normal)
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
                          dist=1e-7, plane_co=n * (distance / n.length_squared), plane_no=n,
                          clear_inner=False, clear_outer=False)


def partition(body, materials):
    bm = bmesh.new()
    bm.from_mesh(body.data)
    for z in [.205, .455, .91, 1.35]:
        cut(bm, (0, 0, 1), z)
    for x in [-.217, .217]:
        cut(bm, (1, 0, 0), x)
    for y in [-.14, -.042, .14, .74]:
        cut(bm, (0, 1, 0), y)
    cut(bm, (.18, 0, 1), 1.065)
    cut(bm, (-.18, 0, 1), 1.065)
    for mat in [materials['Orange_Fur'], materials['Cream_Fur'], materials['Dark_Paws']]:
        body.data.materials.append(mat)
    for face in bm.faces:
        x, y, z = face.calc_center_median()
        cream = (y < -.14 and .91 < z and z + .18 * abs(x) < 1.065) or y > .74 or (z > 1.35 and y < -.042)
        paws = z < .205 or (z < .455 and abs(x) > .217 and y < .14)
        face.material_index = 2 if paws else (1 if cream else 0)
        face.smooth = True
    bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=1e-6)
    bmesh.ops.dissolve_limit(bm, angle_limit=.015, verts=list(bm.verts), edges=list(bm.edges),
                             delimit={'MATERIAL'}, use_dissolve_boundaries=False)
    bm.to_mesh(body.data)
    bm.free()
    body.data.update()
    return garment(body, materials['Green_Overalls'])


def garment(body, material):
    # A separate, softly fused trouser shell; clean planar waist and ankle openings.
    parts = [base.ellipsoid('Cloth_Hips', (0, 0, .47), (.238, .199, .25))]
    for sign in [-1, 1]:
        parts.append(base.ellipsoid('Cloth_Leg', (sign * .108, -.003, .31), (.108, .122, .19)))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    pants = bpy.context.object
    pants.name = 'Overalls_Trousers'
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    pants.data.remesh_voxel_size = .014
    bpy.ops.object.voxel_remesh()
    mod = pants.modifiers.new('Soft trouser volume', 'SMOOTH')
    mod.factor, mod.iterations = .65, 4
    base.apply(pants, mod)
    mod = pants.modifiers.new('Low poly garment', 'DECIMATE')
    mod.ratio = .22
    base.apply(pants, mod)
    bm = bmesh.new()
    bm.from_mesh(pants.data)
    for z in [.175, .565]:
        cut(bm, (0, 0, 1), z)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not .175 < f.calc_center_median().z < .565], context='FACES')
    bm.to_mesh(pants.data)
    bm.free()
    pieces = [pants]

    def fit(x, z, front):
        origin = Vector((x, -2 if front else 2, z))
        direction = Vector((0, 1 if front else -1, 0))
        hit, location, _n, _i = body.ray_cast(origin, direction)
        if not hit:
            raise RuntimeError('Garment fitting missed torso')
        location.y += -.013 if front else .013
        return location

    def patch(name, rows, front):
        vertices, faces = [], []
        columns = 8
        for z, low, high in rows:
            for j in range(columns + 1):
                vertices.append(fit(low + (high - low) * j / columns, z, front))
        for i in range(len(rows) - 1):
            for j in range(columns):
                a = i * (columns + 1) + j
                face = (a, a + 1, a + columns + 2, a + columns + 1)
                faces.append(face if front else tuple(reversed(face)))
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        pieces.append(obj)
        return obj

    bib = patch('Overalls_Bib', [(z, -w, w) for z, w in [(.535, .143), (.56, .142), (.60, .137), (.65, .132), (.70, .13), (.735, .125)]], True)
    patch('Overalls_Back', [(z, -.137, .137) for z in [.535, .57, .62, .67, .71]], False)
    for sign in [-1, 1]:
        # Two slim fitted bands, with their top tucked beneath the neck/head overlap.
        for front in [True, False]:
            patch('Overalls_Strap', [(z, sign * .112 - .026, sign * .112 + .026) for z in [.705, .735, .765, .795, .825, .847]], front)
    for obj in pieces:
        obj.data.materials.append(material)
        mod = obj.modifiers.new('Cloth lining and clean hems', 'SOLIDIFY')
        mod.thickness, mod.offset = .006, -1
        mod.use_even_offset = False
        base.apply(obj, mod)
        for face in obj.data.polygons:
            face.use_smooth = True
    # Join garment pieces for a single material primitive. Overlaps are clothing seams, not painted gradients.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in pieces:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bib
    bpy.ops.object.join()
    bib.name = 'Green_Overalls_Garment'
    return bib


def surface_detail(body, name, x, z, radius, material, projection=.002):
    hit, location, _normal, _index = body.ray_cast(Vector((x, -2, z)), Vector((0, 1, 0)))
    if not hit:
        raise RuntimeError(f'Cannot place {name} on surface')
    obj = base.ellipsoid(name, (x, location.y - projection, z), radius)
    obj.data.materials.append(material)
    return obj


def validate_body(body):
    bm = bmesh.new()
    bm.from_mesh(body.data)
    boundary = sum(not e.is_manifold for e in bm.edges)
    seen, components = set(), 0
    for v in bm.verts:
        if v in seen:
            continue
        components += 1
        stack = [v]
        while stack:
            current = stack.pop()
            if current in seen:
                continue
            seen.add(current)
            stack.extend(e.other_vert(current) for e in current.link_edges)
    bm.free()
    if boundary or components != 1:
        raise RuntimeError(f'Body lost continuity: {components} components, {boundary} non-manifold edges')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2] / 'assets' / 'fox-v02')
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--overwrite', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    output = args.output.resolve()
    stem = 'fox_v02_static'
    if not args.overwrite and any(output.glob(stem + '*')):
        raise FileExistsError('v02 output exists; select a new output or explicitly use --overwrite')
    output.mkdir(parents=True, exist_ok=True)
    scene = bpy.data.scenes.new('Fox_v02_Static_Review')
    bpy.context.window.scene = scene
    scene.unit_settings.system = 'METRIC'
    mats = make_materials()
    body = base.build_body()
    body.name = 'Orange_Cream_Paws_Continuous_Body'
    # Very slight broader head / shorter muzzle, referring back to the procedural fox.
    for vertex in body.data.vertices:
        x, y, z = vertex.co
        vertex.co.x *= 1 + .045 * base.smooth(.88, 1.0, z)
        if y < -.20 and z > .9:
            vertex.co.y = -.20 + (y + .20) * .90
    body.data.update()
    cloth = partition(body, mats)
    validate_body(body)
    models = [body, cloth]
    for sign in [-1, 1]:
        models.append(surface_detail(body, 'Eye_L' if sign < 0 else 'Eye_R', sign * .126, 1.10,
                                     (.018, .010, .025), mats['Eyes'], .004))
    models.append(surface_detail(body, 'Nose', 0, 1.02, (.032, .018, .022), mats['Nose'], .005))
    for sign in [-1, 1]:
        models.append(surface_detail(cloth, 'Bib_Button_L' if sign < 0 else 'Bib_Button_R', sign * .11, .718,
                                     (.014, .007, .014), mats['Buttons'], .003))
    bottom = min(v.co.z for v in body.data.vertices)
    scale = 1.30 / (max(v.co.z for v in body.data.vertices) - bottom)
    root = bpy.data.objects.new('Fox_v02_Static', None)
    scene.collection.objects.link(root)
    for obj in models:
        for vertex in obj.data.vertices:
            vertex.co *= scale
        obj.location *= scale
        obj.location.z -= bottom * scale
        base.activate(obj)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        obj.parent = root
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    root['version'] = 'fox_v02_static'
    root['rigged'] = False
    root['material_policy'] = 'Seven explicit flat PBR colors; no vertex colors or textures'
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [root] + models:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(output / (stem + '.glb')), export_format='GLB',
                             use_selection=True, use_active_scene=True, export_yup=True,
                             export_animations=False, export_cameras=False, export_lights=False, export_extras=True)
    report = {'blender': bpy.app.version_string, 'height_m': 1.30, 'rigged': False,
              'materials': PALETTE, 'vertex_colors': False, 'textures': 0,
              'body_components': 1, 'body_manifold': True, 'meshes': [],
              'garment_thickness_local': .006, 'bib_offset_local': .013}
    for obj in models:
        obj.data.calc_loop_triangles()
        report['meshes'].append({'name': obj.name, 'triangles': len(obj.data.loop_triangles)})
    report['triangles'] = sum(m['triangles'] for m in report['meshes'])
    camera = base.studio(scene)
    scene.render.resolution_x = scene.render.resolution_y = 900
    scene.cycles.samples = 32
    base.activate(root)
    (output / (stem + '_report.json')).write_text(json.dumps(report, indent=2), encoding='utf-8')
    camera.location = (2.8, -4.5, 1.8)
    base.aim(camera, (0, .12, .65))
    scene.render.filepath = str(output / (stem + '_three_quarter.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(output / (stem + '.blend')))
    if args.render:
        for view, position in [('front', (0, -5, .78)), ('three_quarter', (2.8, -4.5, 1.8)), ('side', (5, 0, .85))]:
            camera.location = position
            base.aim(camera, (0, .12, .65))
            scene.render.filepath = str(output / (stem + '_' + view + '.png'))
            bpy.ops.render.render(write_still=True)
    print('FOX_V02_REPORT ' + json.dumps(report))


if __name__ == '__main__':
    main()
