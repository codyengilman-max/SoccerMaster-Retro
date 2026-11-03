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


assert len(teams) == 120 and len({t['id'] for t in teams}) == 120
for t in teams: t['added'] = 1

# ---- Version 2: 1,000 teams (owner brief, 2026-11). The 120 version-1 teams above are unchanged. ----
TOTAL = 1000
SHORT = {'batavia': 'Batavia', 'royal_salt': 'Royal Salt', 'valley_rising': 'Valley Rising', 'desert_tuzon': 'Desert Tuzon', 'sol_vista': 'Sol Vista',
         'next_horizon': 'Next Horizon', 'silver_state': 'Silver State', 'pacific_crest': 'Pacific Crest', 'wasatch_peak': 'Wasatch Peak',
         'rio_grande': 'Rio Grande', 'front_range': 'Front Range', 'cascade_city': 'Cascade City', 'bayou_star': 'Bayou Star', 'high_plains': 'High Plains'}
ALIASES = {'batavia': ['Batavia', 'FC Batavia', 'Batavia FC', 'F.C. Batavia', 'Batavia F.C.'], 'desert_tuzon': ['Desert Tucson'], 'next_horizon': ['Next Horizon FC']}
# Owner-requested Arizona clubs: directory only (no league, no fixtures this season), available for future Arizona scheduling.
OWNER_AZ = [('westside_united', 'Westside United', 'Westside', 'Phoenix', 2), ('no_soccer_tuesday', 'No Soccer Tuesday', 'NST', 'Scottsdale', 3),
            ('tumbleweed_fc', 'Tumbleweed FC', 'Tumbleweed', 'Chandler', 3), ('dynamics_fc', 'Dynamics FC', 'Dynamics', 'Tempe', 3),
            ('anthem_shockers', 'Anthem Shockers', 'Anthem', 'Anthem', 4)]
AZ_TOTAL = 80          # >= 68 needed so 66 Arizona teams can rank above Batavia with at least one below
AZ_ABOVE_BATAVIA = 66  # Batavia starts 67th in Arizona

NICK += ['Falcon', 'Aspen', 'Mesa Verde', 'Canyon', 'Saguaro', 'Ocotillo', 'Palo Verde', 'Coyote', 'Roadrunner', 'Javelina', 'Monsoon', 'Sunburst',
         'Bobcat', 'Cardinal', 'Hawthorn', 'Summit', 'Prairie', 'Timber', 'Harbor', 'Lighthouse', 'Comet', 'Blue Heron', 'Sycamore', 'Magnolia',
         'Cypress', 'Badger', 'Wolverine', 'Elk Ridge', 'Silver Birch', 'Red Rock', 'Bison', 'Glacier', 'Tidewater', 'Orchard', 'Maple Leaf',
         'Spruce', 'Steelhead', 'Kingfisher', 'Firefly', 'Thunderbird']
SUFFIX += ['Rovers', 'City SC', 'Futbol Club']
STATES = {  # state: (division, population in millions, cities)
 'AL': ('East South Central', 5.1, ['Birmingham', 'Tuscaloosa', 'Auburn', 'Hoover', 'Dothan']),
 'AK': ('Pacific', 0.7, ['Anchorage', 'Fairbanks', 'Juneau', 'Wasilla']),
 'AZ': ('Arizona', 7.4, ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Gilbert', 'Glendale', 'Tempe', 'Peoria', 'Surprise', 'Goodyear', 'Queen Creek', 'Buckeye', 'Avondale', 'Maricopa', 'Casa Grande', 'Oro Valley', 'Marana', 'Fountain Hills', 'Cave Creek', 'Sahuarita', 'Lake Havasu City', 'Kingman', 'Bullhead City', 'Cottonwood', 'Sedona', 'Payson', 'Show Low', 'Florence', 'Apache Junction']),
 'AR': ('West South Central', 3.1, ['Little Rock', 'Fayetteville', 'Bentonville', 'Conway', 'Jonesboro']),
 'CA': ('Pacific', 39.0, ['Los Angeles', 'San Jose', 'San Francisco', 'Oakland', 'Irvine', 'Anaheim', 'Long Beach', 'Pasadena', 'Torrance', 'Fremont', 'Santa Clara', 'Huntington Beach', 'Ontario', 'Chula Vista', 'Carlsbad', 'Visalia', 'Salinas', 'Elk Grove', 'Roseville', 'Thousand Oaks', 'Mission Viejo', 'Walnut Creek', 'Santa Cruz', 'San Mateo', 'Corona']),
 'CO': ('Mountain', 5.9, ['Aurora', 'Lakewood', 'Littleton', 'Arvada', 'Grand Junction', 'Greeley', 'Castle Rock', 'Longmont']),
 'CT': ('New England', 3.6, ['Hartford', 'New Haven', 'Stamford', 'Bridgeport', 'Glastonbury']),
 'DE': ('South Atlantic', 1.0, ['Wilmington', 'Dover', 'Newark', 'Middletown']),
 'FL': ('South Atlantic', 22.6, ['Orlando', 'Tampa', 'Miami', 'Jacksonville', 'Fort Lauderdale', 'St. Petersburg', 'Naples', 'Boca Raton', 'Pensacola', 'Fort Myers', 'Clearwater', 'Melbourne', 'Ocala', 'Weston']),
 'GA': ('South Atlantic', 11.0, ['Atlanta', 'Alpharetta', 'Marietta', 'Augusta', 'Columbus', 'Peachtree City', 'Roswell', 'Valdosta']),
 'HI': ('Pacific', 1.4, ['Honolulu', 'Hilo', 'Kailua', 'Kapolei']),
 'ID': ('Mountain', 1.9, ['Meridian', 'Nampa', 'Coeur d\'Alene', 'Twin Falls', 'Pocatello']),
 'IL': ('East North Central', 12.5, ['Chicago', 'Aurora', 'Joliet', 'Schaumburg', 'Champaign', 'Springfield', 'Evanston', 'Wheaton', 'Elgin']),
 'IN': ('East North Central', 6.8, ['Indianapolis', 'Carmel', 'Fishers', 'South Bend', 'Lafayette', 'Noblesville']),
 'IA': ('West North Central', 3.2, ['Des Moines', 'Cedar Rapids', 'Iowa City', 'Davenport', 'Ames']),
 'KS': ('West North Central', 2.9, ['Wichita', 'Overland Park', 'Olathe', 'Lawrence', 'Topeka']),
 'KY': ('East South Central', 4.5, ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington']),
 'LA': ('West South Central', 4.6, ['Metairie', 'Lake Charles', 'Monroe', 'Mandeville', 'Houma']),
 'ME': ('New England', 1.4, ['Portland', 'Bangor', 'Lewiston', 'Augusta']),
 'MD': ('South Atlantic', 6.2, ['Baltimore', 'Bethesda', 'Columbia', 'Annapolis', 'Frederick', 'Rockville']),
 'MA': ('New England', 7.0, ['Boston', 'Cambridge', 'Lowell', 'Newton', 'Plymouth', 'Framingham']),
 'MI': ('East North Central', 10.0, ['Detroit', 'Troy', 'Novi', 'Kalamazoo', 'Traverse City', 'Livonia', 'Saginaw']),
 'MN': ('West North Central', 5.7, ['Minneapolis', 'St. Paul', 'Bloomington', 'Eden Prairie', 'Mankato', 'Maple Grove']),
 'MS': ('East South Central', 2.9, ['Hattiesburg', 'Oxford', 'Tupelo', 'Gulfport', 'Starkville']),
 'MO': ('West North Central', 6.2, ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Chesterfield', 'Lee\'s Summit']),
 'MT': ('Mountain', 1.1, ['Bozeman', 'Helena', 'Great Falls', 'Kalispell']),
 'NE': ('West North Central', 2.0, ['Omaha', 'Lincoln', 'Kearney', 'Grand Island']),
 'NV': ('Mountain', 3.2, ['Summerlin', 'North Las Vegas', 'Sparks', 'Carson City', 'Elko']),
 'NH': ('New England', 1.4, ['Manchester', 'Nashua', 'Concord', 'Portsmouth']),
 'NJ': ('Mid-Atlantic', 9.3, ['Newark', 'Jersey City', 'Morristown', 'Cherry Hill', 'Edison', 'Hoboken', 'Toms River']),
 'NM': ('Mountain', 2.1, ['Rio Rancho', 'Los Alamos', 'Clovis', 'Gallup']),
 'NY': ('Mid-Atlantic', 19.6, ['New York', 'Brooklyn', 'Queens', 'Rochester', 'Long Island', 'Yonkers', 'White Plains', 'Ithaca', 'Saratoga Springs', 'Binghamton', 'Utica']),
 'NC': ('South Atlantic', 10.8, ['Charlotte', 'Raleigh', 'Durham', 'Wilmington', 'Cary', 'Chapel Hill', 'Winston-Salem', 'Fayetteville']),
 'ND': ('West North Central', 0.8, ['Fargo', 'Bismarck', 'Grand Forks', 'Minot']),
 'OH': ('East North Central', 11.8, ['Columbus', 'Cleveland', 'Cincinnati', 'Dublin', 'Mason', 'Youngstown', 'Canton', 'Westerville']),
 'OK': ('West South Central', 4.1, ['Oklahoma City', 'Edmond', 'Broken Arrow', 'Stillwater', 'Lawton']),
 'OR': ('Pacific', 4.2, ['Beaverton', 'Hillsboro', 'Medford', 'Corvallis', 'Lake Oswego']),
 'PA': ('Mid-Atlantic', 13.0, ['Philadelphia', 'Pittsburgh', 'Lancaster', 'State College', 'Erie', 'Scranton', 'Reading', 'West Chester']),
 'RI': ('New England', 1.1, ['Providence', 'Warwick', 'Newport', 'Cranston']),
 'SC': ('South Atlantic', 5.4, ['Charleston', 'Columbia', 'Greenville', 'Spartanburg', 'Myrtle Beach']),
 'SD': ('West North Central', 0.9, ['Sioux Falls', 'Rapid City', 'Brookings', 'Aberdeen']),
 'TN': ('East South Central', 7.1, ['Nashville', 'Memphis', 'Knoxville', 'Franklin', 'Murfreesboro', 'Clarksville']),
 'TX': ('West South Central', 30.5, ['Houston', 'Dallas', 'Plano', 'Frisco', 'Arlington', 'Katy', 'The Woodlands', 'Round Rock', 'McKinney', 'Sugar Land', 'Irving', 'Laredo', 'Beaumont', 'Brownsville', 'Abilene', 'College Station', 'Allen', 'Pearland']),
 'UT': ('Mountain', 3.4, ['Orem', 'Sandy', 'Logan', 'Lehi', 'West Jordan']),
 'VT': ('New England', 0.6, ['Burlington', 'Montpelier', 'Rutland', 'Stowe']),
 'VA': ('South Atlantic', 8.7, ['Richmond', 'Virginia Beach', 'Arlington', 'Fairfax', 'Norfolk', 'Charlottesville', 'Roanoke']),
 'WA': ('Pacific', 7.8, ['Seattle', 'Bellevue', 'Redmond', 'Everett', 'Kent', 'Yakima', 'Kirkland']),
 'WV': ('South Atlantic', 1.8, ['Charleston', 'Morgantown', 'Huntington', 'Wheeling']),
 'WI': ('East North Central', 5.9, ['Waukesha', 'Appleton', 'Eau Claire', 'Oshkosh', 'Kenosha']),
 'WY': ('Mountain', 0.6, ['Laramie', 'Sheridan', 'Gillette', 'Jackson']),
}
assert len(STATES) == 50
for t in teams:
    t['short'] = SHORT.get(t['id'], (t['name'].split()[-2] if len(t['name'].split()) > 2 else t['name']))
    t['club'] = t['id']
    t['aliases'] = ALIASES.get(t['id'], [])
for t in teams:  # fictional v1 short names: the nickname (one or two words between city and suffix)
    if t['origin'] == 'fictional':
        rest = t['name'][len(t['city']) + 1:]
        t['short'] = rest.rsplit(' ', 1)[0]
BATAVIA = next(t for t in teams if t['id'] == 'batavia')['rating0']

def add2(tid, name, short, city, state, region, league, tier, origin, rating=None):
    colors = PALETTE[h('pal:' + tid) % len(PALETTE)]
    teams.append({'id': tid, 'name': name, 'city': city, 'state': state, 'region': region, 'category': CAT, 'league': league,
                  'colors': list(colors), 'badge': {'shape': SHAPES[h('shape:' + tid) % 3], 'initials': initials(name)},
                  'tier': tier, 'rating0': rating if rating is not None else rating0(tid, tier), 'origin': origin,
                  'added': 2, 'short': short, 'club': tid, 'aliases': []})

for tid, name, short, city, tier in OWNER_AZ:
    add2(tid, name, short, city, 'AZ', 'Southwest', None, tier, 'owner_az')

# Teams per state: Arizona fixed, the rest by population (at least 4), never fewer than the state already has.
have = {}
for t in teams: have[t['state']] = have.get(t['state'], 0) + 1
target = {'AZ': AZ_TOTAL}
others = [s for s in STATES if s != 'AZ']
left = TOTAL - AZ_TOTAL
pop = sum(STATES[s][1] for s in others)
raw = {s: max(4, have.get(s, 0), STATES[s][1] / pop * left) for s in others}
base = {s: int(raw[s]) for s in others}
rem = left - sum(base.values())
for s in sorted(others, key=lambda s: -(raw[s] - base[s]))[:rem]: base[s] += 1
target.update(base)
assert sum(target.values()) == TOTAL, sum(target.values())

used_short = set()
def fictional2(city, state, region, tier, rating=None):
    global k
    while True:
        nick = NICK[(h(city + state + 'v2') + k) % len(NICK)]
        suffix = SUFFIX[(h(nick + city + 'v2') + k) % len(SUFFIX)]
        name = f'{city} {nick} {suffix}'
        k += 1
        tid = 'x_' + ''.join(ch if ch.isalnum() else '_' for ch in f'{state}_{city}_{nick}'.lower()).strip('_')
        if name not in used_names and all(t['id'] != tid for t in teams):
            break
    used_names.add(name)
    add2(tid, name, nick, city, state, region, None, tier, 'fictional', rating)
    return teams[-1]

TIERS9 = [1, 2, 2, 3, 3, 3, 4, 4, 5]
# Arizona: exactly AZ_ABOVE_BATAVIA teams rated above Batavia, the rest below (no Arizona team level with it).
az = [t for t in teams if t['state'] == 'AZ' and t['id'] != 'batavia']
above = sum(t['rating0'] > BATAVIA for t in az)
need_above = AZ_ABOVE_BATAVIA - above
need_below = AZ_TOTAL - 1 - len(az) - need_above
assert need_above >= 0 and need_below >= 0, (need_above, need_below)
az_cities = STATES['AZ'][2]
az_new = []
for i in range(need_above + need_below):
    city = az_cities[i % len(az_cities)]
    if i < need_above:
        tier = [1, 2, 2, 3, 3][i % 5]
        r = rating0('az' + str(i), tier) if tier < 3 else 1500 + (BATAVIA - 1500 + 1) + h('az-up:' + str(i)) % (20 - (BATAVIA - 1500))
    else:
        tier = [3, 4, 5][i % 3]
        r = rating0('az' + str(i), tier) if tier > 3 else 1480 + h('az-down:' + str(i)) % (BATAVIA - 1480)
    az_new.append(fictional2(city, 'AZ', 'Southwest', tier, r))
# Everyone else: fill each state to its target.
new_by_div = {}
for s in sorted(others):
    div, _, cities = STATES[s]
    for i in range(target[s] - have.get(s, 0)):
        tier = TIERS9[h(f'tier:{s}:{i}') % 9]
        t = fictional2(cities[i % len(cities)], s, div, tier)
        new_by_div.setdefault(div, []).append(t)
new_by_div['Arizona'] = az_new

# Background leagues for the new teams: per division, about 9 teams each (balanced sizes).
def slug(x): return ''.join(ch if ch.isalnum() else '_' for ch in x.lower())
for div in sorted(new_by_div):
    ts = sorted(new_by_div[div], key=lambda t: (t['state'], h('lg:' + t['id'])))
    n = max(1, round(len(ts) / 9))
    for j, t in enumerate(ts): t['league'] = f'bg2_{slug(div)}_{j * n // len(ts) + 1}'

ids = [t['id'] for t in teams]
assert len(teams) == TOTAL and len(set(ids)) == TOTAL, (len(teams), len(set(ids)))
assert len({t['name'] for t in teams}) == TOTAL
assert len({t['state'] for t in teams}) == 50
names = {}
for t in teams:
    for n in [t['name'], *t['aliases']]:
        key = ''.join(ch for ch in n.lower() if ch.isalnum())
        assert names.setdefault(key, t['id']) == t['id'], (n, t['id'], names[key])
azr = sorted((t for t in teams if t['state'] == 'AZ'), key=lambda t: -t['rating0'])
assert sum(t['rating0'] > BATAVIA for t in azr) == AZ_ABOVE_BATAVIA and not any(t['rating0'] == BATAVIA for t in azr if t['id'] != 'batavia')
OUT.write_text(json.dumps({'version': 2, 'category': CAT, 'nameStatus': 'working_fictional_names', 'teams': teams}, indent=1) + '\n')
print('wrote', OUT, len(teams))
