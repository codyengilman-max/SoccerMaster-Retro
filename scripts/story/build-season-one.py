#!/usr/bin/env python3
"""Offline: compile the Season One dialogue source (docs/story/season-one/src/*.story) into the
validated scene JSON the game reads (docs/story/season-one/season_one_scenes.json).

Source format (one statement per line, '#' comments):
  === SCENE_ID background [rev]    start a scene (scenes chain in file order); a rewritten scene
                                   adds a revision tag (e.g. v2) that prefixes its node ids, so a save
                                   resting on a node of the old text restarts that scene
  Speaker: text                    a dialogue line
  ? key                            a choice; options follow as  * id | Label
    Speaker: text                  (indented) statements for the option above (lines, @if blocks)
  @activity adapter [predicate]    an activity handoff; every outcome continues to the next statement
  @if predicate / @elif / @else / @end   code-resolved branch on saved facts (missing facts -> else)
Run: python3 scripts/story/build-season-one.py
"""
import json, re, sys
from pathlib import Path

VERSION = 's1-v1.0'
FULL = {'crossbar', 'practice', 'match', 'jungle', 'team_training', 'league_match', 'tournament_match'}
root = Path(__file__).resolve().parents[2]
src = root / 'docs/story/season-one/src'
out = root / 'docs/story/season-one/season_one_scenes.json'

def die(msg):
    sys.exit(f'build-season-one: {msg}')

def parse_scenes():
    scenes = []
    for f in sorted(src.glob('*.story')):
        for no, raw in enumerate(f.read_text().splitlines(), 1):
            if not raw.strip() or raw.lstrip().startswith('#'):
                continue
            if raw.startswith('=== '):
                parts = raw[4:].split()
                if len(parts) not in (2, 3) or (len(parts) == 3 and not re.fullmatch(r'v[0-9]{1,3}', parts[2])):
                    die(f'{f.name}:{no}: expected "=== SCENE_ID background [vN]"')
                scenes.append({'id': parts[0], 'background': parts[1], 'rev': parts[2] if len(parts) == 3 else '', 'lines': []})
            else:
                if not scenes:
                    die(f'{f.name}:{no}: statement before scene')
                scenes[-1]['lines'].append((f'{f.name}:{no}', raw))
    return scenes

def parse_block(lines, i, stops):
    items = []
    while i < len(lines):
        where, raw = lines[i]
        s = raw.strip()
        if s.split(' ')[0] in stops and not raw.startswith('  '):
            return items, i
        if raw.startswith('  '):
            die(f'{where}: unexpected indented line')
        if s.startswith('? '):
            key = s[2:].strip()
            opts = []
            i += 1
            while i < len(lines) and lines[i][1].startswith('* '):
                oid, label = [x.strip() for x in lines[i][1][2:].split('|', 1)]
                if len(label) > 48:
                    die(f'{lines[i][0]}: option label over 48 characters: {label!r}')
                i += 1
                sub = []
                while i < len(lines) and lines[i][1].startswith('  '):
                    sub.append((lines[i][0], lines[i][1][2:]))
                    i += 1
                replies, _ = parse_block(sub, 0, set())
                opts.append({'id': oid, 'label': label, 'replies': replies})
            if not opts:
                die(f'{where}: choice without options')
            items.append({'kind': 'choice', 'key': key, 'options': opts})
            continue
        if s.startswith('@activity '):
            parts = s.split()
            items.append({'kind': 'activity', 'adapter': parts[1], 'predicate': parts[2] if len(parts) > 2 else 'always'})
            i += 1
            continue
        if s.startswith('@if '):
            cases = []
            pred = s[4:].strip()
            i += 1
            otherwise = []
            while True:
                block, i = parse_block(lines, i, {'@elif', '@else', '@end'})
                cases.append((pred, block))
                if i >= len(lines):
                    die(f'{where}: unterminated @if')
                tok = lines[i][1].strip()
                if tok.startswith('@elif '):
                    pred = tok[6:].strip()
                    i += 1
                    continue
                if tok == '@else':
                    otherwise, i = parse_block(lines, i + 1, {'@end'})
                    if i >= len(lines):
                        die(f'{where}: unterminated @else')
                i += 1
                break
            items.append({'kind': 'if', 'cases': cases, 'else': otherwise})
            continue
        items.append(line_item(where, s))
        i += 1
    return items, i

def line_item(where, s):
    m = re.match(r'^([A-Za-z][A-Za-z ]{0,30}):\s+(.+)$', s)
    if not m:
        die(f'{where}: expected "Speaker: text", got {s!r}')
    return {'kind': 'line', 'speaker': m.group(1), 'text': m.group(2)}

def compile_scene(sc, next_scene):
    nodes = []
    counter = [0]
    def nid(prefix='n'):
        counter[0] += 1
        return f"{sc['rev']}{prefix}{counter[0]}"
    end_id = 'end'
    def emit(items, cont):
        nxt = cont
        for it in reversed(items):
            k = it['kind']
            if k == 'line':
                me = nid()
                nodes.append({'id': me, 'type': 'line', 'speaker': it['speaker'], 'text': it['text'], 'next': nxt})
                nxt = me
            elif k == 'choice':
                options = []
                for o in it['options']:
                    target = emit(o['replies'], nxt)
                    options.append({'id': o['id'], 'label': o['label'], 'predicate': 'always', 'effects': [{'op': 'remember_choice', 'key': it['key'], 'value': o['id']}], 'next': target})
                nodes.append({'id': it['key'], 'type': 'choice', 'options': options})
                nxt = it['key']
            elif k == 'activity':
                me = nid('a')
                outs = ['completed', 'declined', 'abandoned', 'interrupted'] if it['adapter'] in FULL else ['completed']
                nodes.append({'id': me, 'type': 'activity_handoff', 'adapter': it['adapter'], 'predicate': it['predicate'], 'on_false': nxt, 'outcomes': {o: nxt for o in outs}})
                nxt = me
            elif k == 'if':
                dflt = emit(it['else'], nxt) if it['else'] else nxt
                cases = [{'predicate': p, 'next': emit(b, nxt) if b else nxt} for p, b in it['cases']]
                me = nid('b')
                nodes.append({'id': me, 'type': 'branch', 'cases': cases, 'default': dflt})
                nxt = me
        return nxt
    nodes.append({'id': end_id, 'type': 'end', 'next_scene': next_scene})
    items, i = parse_block(sc['lines'], 0, set())
    entry = emit(items, end_id)
    nodes.reverse()
    return {'id': sc['id'], 'version': VERSION, 'entry': entry, 'background': sc['background'], 'nodes': nodes}

scenes = parse_scenes()
ids = [s['id'] for s in scenes]
if len(set(ids)) != len(ids):
    die('duplicate scene id')
compiled = [compile_scene(s, ids[k + 1] if k + 1 < len(ids) else None) for k, s in enumerate(scenes)]
out.write_text(json.dumps({'version': VERSION, 'entry': ids[0], 'scenes': compiled}, indent=1, ensure_ascii=False) + '\n')
print(f'{len(compiled)} scenes, {sum(len(s["nodes"]) for s in compiled)} nodes -> {out.relative_to(root)}')
