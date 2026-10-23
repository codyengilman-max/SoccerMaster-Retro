"""Builds the 120-team career-world registry (src/game/rankings/teams.json).

The 14 established teams keep their IDs, names and colours. The other 106 are fictional working names
(city + invented nickname), assigned to 12 regional background leagues plus one Arizona background
league. Deterministic: rerunning produces the same file.
"""
import hashlib, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/game/rankings/teams.json'
CAT = 'U11-9v9'
TIER_OFFSET = {1: 150, 2: 75, 3: 0, 4: -75, 5: -150}

def h(s):
    return int(hashlib.sha256(s.encode()).hexdigest()[:8], 16)

def rating0(tid, tier):
    return 1500 + TIER_OFFSET[tier] + (h('seed:' + tid) % 41) - 20

def initials(name):
    words = [w for w in name.replace('(', ' ').replace(')', ' ').split() if w[0].isalpha() and w not in ('FC', 'SC', 'of')]
    return ''.join(w[0] for w in words[:2]).upper()

SHAPES = ['shield', 'circle', 'diamond']
PALETTE = [('#1b3a6b', '#f2c14e'), ('#8b1e2d', '#f4ead5'), ('#2f6b3a', '#f4ead5'), ('#e06000', '#1b2a4a'), ('#4a2a7a', '#e8c34a'),
           ('#0f6f78', '#f4ead5'), ('#20262e', '#e04848'), ('#c9a227', '#20262e'), ('#3b6fb6', '#ffffff'), ('#7a3e1d', '#f2c14e'),
           ('#1f7a5a', '#20262e'), ('#b03060', '#f4ead5'), ('#5b6b2e', '#f4ead5'), ('#d24d1f', '#ffffff'), ('#284b63', '#d9d9d9')]

teams = []
def add(tid, name, city, state, region, league, colors, tier, established):
    teams.append({
        'id': tid, 'name': name, 'city': city, 'state': state, 'region': region, 'category': CAT,
        'league': league, 'colors': list(colors), 'badge': {'shape': SHAPES[h('shape:' + tid) % 3], 'initials': initials(name)},
        'tier': tier, 'rating0': rating0(tid, tier), 'origin': established,
    })

# Established teams: IDs, names and colours from the existing season code. Cities for the local clubs are
# working values (the story names Scottsdale as home; the others are not placed by any script).
AZ_LEAGUE = 'az_local'
add('batavia', 'FC Batavia', 'Scottsdale', 'AZ', 'Southwest', AZ_LEAGUE, ('#e06000', '#1b2a4a'), 3, 'league')
add('royal_salt', 'Royal Salt Academy', 'Phoenix', 'AZ', 'Southwest', AZ_LEAGUE, ('#800020', '#002040'), 2, 'league')
add('valley_rising', 'Valley Rising', 'Mesa', 'AZ', 'Southwest', AZ_LEAGUE, ('#c00000', '#e0e0e0'), 3, 'league')
add('desert_tuzon', 'Desert Tuzon', 'Tucson', 'AZ', 'Southwest', AZ_LEAGUE, ('#e0e0e0', '#002080'), 3, 'league')
add('sol_vista', 'Sol Vista', 'Chandler', 'AZ', 'Southwest', AZ_LEAGUE, ('#002040', '#e0e0e0'), 3, 'league')
add('next_horizon', 'Next Horizon', 'Scottsdale', 'AZ', 'Southwest', None, ('#400080', '#6000a0'), 1, 'out_of_league')

OOS = {  # id: (name, city, state, colours) exactly as in season/tournament.ts
    'silver_state': ('Silver State SC (NV)', 'Las Vegas', 'NV', ('#2e7d32', '#ffffff')),
    'pacific_crest': ('Pacific Crest FC (CA)', 'San Diego', 'CA', ('#f9a825', '#1a237e')),
    'wasatch_peak': ('Wasatch Peak United (UT)', 'Salt Lake City', 'UT', ('#6d4c41', '#ffcc80')),
    'rio_grande': ('Rio Grande Rapids (NM)', 'Albuquerque', 'NM', ('#00838f', '#212121')),
    'front_range': ('Front Range FC (CO)', 'Denver', 'CO', ('#c62828', '#eeeeee')),
    'cascade_city': ('Cascade City SC (OR)', 'Portland', 'OR', ('#1b5e20', '#fdd835')),
    'bayou_star': ('Bayou Star FC (LA)', 'New Orleans', 'LA', ('#4a148c', '#ffd54f')),
    'high_plains': ('High Plains United (TX)', 'Amarillo', 'TX', ('#ef6c00', '#263238')),
}

NICK = ['Kestrel', 'Juniper', 'Ironwood', 'Bluestem', 'Lantern', 'Granite', 'Sandhill', 'Cottonwood', 'Larkspur', 'Tamarack', 'Copperleaf',
        'Riverbend', 'Foxglove', 'Hollow Oak', 'Wren', 'Heron', 'Basalt', 'Driftwood', 'Sagebrush', 'Bramble', 'Ember', 'Osprey', 'Thistle',
        'Pinecrest', 'Saltmarsh', 'Lodestar', 'Meadowlark', 'Flint', 'Harrier', 'Quarry', 'Bluebonnet', 'Redtail', 'Cinder', 'Marigold',
        'Northwind', 'Stonebridge', 'Willow Run', 'Arrowhead', 'Clearwater', 'Ridgeback']
SUFFIX = ['SC', 'FC', 'United', 'Athletic', 'Academy']

REGIONS = [  # (region, league id, [(city, state)...], established OOS ids in this league)
    ('Pacific Northwest', 'bg_pnw', [('Tacoma', 'WA'), ('Spokane', 'WA'), ('Bellingham', 'WA'), ('Olympia', 'WA'), ('Eugene', 'OR'), ('Salem', 'OR'), ('Bend', 'OR'), ('Vancouver', 'WA')], ['cascade_city']),
    ('Northern California', 'bg_norcal', [('Sacramento', 'CA'), ('Fresno', 'CA'), ('Santa Rosa', 'CA'), ('Modesto', 'CA'), ('Stockton', 'CA'), ('Chico', 'CA'), ('Redding', 'CA'), ('Davis', 'CA'), ('Monterey', 'CA')], []),
    ('Southern California', 'bg_socal', [('Riverside', 'CA'), ('Bakersfield', 'CA'), ('Oxnard', 'CA'), ('Temecula', 'CA'), ('Palm Springs', 'CA'), ('Santa Barbara', 'CA'), ('Lancaster', 'CA'), ('Escondido', 'CA')], ['pacific_crest']),
    ('Great Basin', 'bg_basin', [('Reno', 'NV'), ('Henderson', 'NV'), ('Provo', 'UT'), ('Ogden', 'UT'), ('Boise', 'ID'), ('Idaho Falls', 'ID'), ('St. George', 'UT')], ['silver_state', 'wasatch_peak']),
    ('Rocky Mountain', 'bg_rockies', [('Colorado Springs', 'CO'), ('Fort Collins', 'CO'), ('Boulder', 'CO'), ('Pueblo', 'CO'), ('Cheyenne', 'WY'), ('Casper', 'WY'), ('Billings', 'MT'), ('Missoula', 'MT')], ['front_range']),
    ('Desert Southwest', 'bg_desert', [('Santa Fe', 'NM'), ('Las Cruces', 'NM'), ('Roswell', 'NM'), ('El Paso', 'TX'), ('Lubbock', 'TX'), ('Midland', 'TX'), ('Farmington', 'NM')], ['rio_grande', 'high_plains']),
    ('Texas', 'bg_texas', [('Austin', 'TX'), ('San Antonio', 'TX'), ('Fort Worth', 'TX'), ('Waco', 'TX'), ('Corpus Christi', 'TX'), ('Tulsa', 'OK'), ('Norman', 'OK'), ('Tyler', 'TX'), ('Denton', 'TX')], []),
    ('Gulf South', 'bg_gulf', [('Baton Rouge', 'LA'), ('Lafayette', 'LA'), ('Shreveport', 'LA'), ('Jackson', 'MS'), ('Biloxi', 'MS'), ('Mobile', 'AL'), ('Huntsville', 'AL'), ('Montgomery', 'AL')], ['bayou_star']),
    ('Upper Midwest', 'bg_midwest', [('Naperville', 'IL'), ('Peoria', 'IL'), ('Rockford', 'IL'), ('Madison', 'WI'), ('Green Bay', 'WI'), ('Milwaukee', 'WI'), ('Duluth', 'MN'), ('Rochester', 'MN'), ('St. Cloud', 'MN')], []),
    ('Great Lakes', 'bg_lakes', [('Toledo', 'OH'), ('Dayton', 'OH'), ('Akron', 'OH'), ('Lansing', 'MI'), ('Grand Rapids', 'MI'), ('Ann Arbor', 'MI'), ('Fort Wayne', 'IN'), ('Bloomington', 'IN'), ('Evansville', 'IN')], []),
    ('Southeast', 'bg_southeast', [('Savannah', 'GA'), ('Macon', 'GA'), ('Athens', 'GA'), ('Tallahassee', 'FL'), ('Gainesville', 'FL'), ('Sarasota', 'FL'), ('Asheville', 'NC'), ('Greensboro', 'NC'), ('Chattanooga', 'TN')], []),
    ('Northeast', 'bg_northeast', [('Albany', 'NY'), ('Syracuse', 'NY'), ('Buffalo', 'NY'), ('Trenton', 'NJ'), ('Princeton', 'NJ'), ('Allentown', 'PA'), ('Harrisburg', 'PA'), ('Worcester', 'MA'), ('Springfield', 'MA')], []),
]
AZ_BG = ('Southwest', 'bg_az', [('Flagstaff', 'AZ'), ('Prescott', 'AZ'), ('Yuma', 'AZ'), ('Gilbert', 'AZ'), ('Glendale', 'AZ'), ('Sierra Vista', 'AZ')])

used_names = set()
k = 0
def fictional(city, state, region, league, tier):
    global k
    while True:
        nick = NICK[(h(city + state) + k) % len(NICK)]
        suffix = SUFFIX[(h(nick + city) + k) % len(SUFFIX)]
        name = f'{city} {nick} {suffix}'
        k += 1
        if name not in used_names and nick not in {n.split()[-2] for n in used_names if n.startswith(city + ' ')}:
            break
    used_names.add(name)
    tid = 'x_' + ''.join(ch if ch.isalnum() else '_' for ch in f'{city}_{nick}'.lower()).strip('_')
    add(tid, name, city, state, region, league, PALETTE[h('pal:' + tid) % len(PALETTE)], tier, 'fictional')

TIERS9 = [1, 2, 2, 3, 3, 3, 4, 4, 5]
for region, league, cities, oos in REGIONS:
    assert len(cities) + len(oos) == 9, region
    for t in oos:
        name, city, state, col = OOS[t]
        add(t, name, city, state, region, league, col, 2, 'out_of_state')
    rest = sorted(TIERS9.copy())
    for t in oos: rest.remove(2)
    order = sorted(cities, key=lambda c: h('tier:' + c[0]))
    for (city, state), tier in zip(order, rest):
        fictional(city, state, region, league, tier)
region, league, cities = AZ_BG
for (city, state), tier in zip(sorted(cities, key=lambda c: h('tier:' + c[0])), [2, 3, 3, 4, 4, 5]):
    fictional(city, state, region, league, tier)

ids = [t['id'] for t in teams]
assert len(teams) == 120 and len(set(ids)) == 120, (len(teams), len(set(ids)))
assert len({t['name'] for t in teams}) == 120
OUT.write_text(json.dumps({'version': 1, 'category': CAT, 'nameStatus': 'working_fictional_names', 'teams': teams}, indent=1) + '\n')
print('wrote', OUT, len(teams))
