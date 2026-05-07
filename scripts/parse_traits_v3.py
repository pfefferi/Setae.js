#!/usr/bin/env python3
"""
Parse dichotomous key descriptions into structured character/value pairs.
V3: Comprehensive pattern coverage.
"""
import json, re, os
from collections import defaultdict

def char_bool(m, g=1):
    v = m.group(g).lower().strip('.,; ')
    return v in ('present', 'yes', 'with')
def char_num(m, g=1):
    return int(m.group(g))
def char_str(m, g=1):
    try:
        v = m.group(g)
        return v.lower().strip('.,; ') if v else None
    except IndexError:
        return None
def w2n(m):
    try:
        w = {'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,'eight':8,'nine':9,'ten':10,
             'eleven':11,'twelve':12,'thirteen':13,'fourteen':14,'fifteen':15,'sixteen':16,'seventeen':17,
             'eighteen':18,'nineteen':19,'twenty':20,'thirty':30,'forty':40,'fifty':50}
        return w.get(m.group(1).lower(), 0)
    except IndexError:
        return 0

P = []

def add(pat, char, extractor):
    P.append((pat, char, extractor))

# ── BRANCHIAE ──
add(r'Branchiae?\s+(absent|present|rudimentary)', 'branchiae', char_bool)
add(r'Branchiae?\s+(?:are\s+)?(?:absent in most|limited to the anterior|concentrated near|present on all)', 'branchiae_detail', char_str)
add(r'Branchiae?\s+(partially|completely)\s+(fused|separated)', 'branchiae_fusion', char_str)
add(r'Branchiae?\s+(?:smooth|papillose|pennate|pectinate|simple|lamellate|cylindrical|flanged|spiralled|arborescent|stalked|branched|digitate|cirriform|pinnate|lanceolate|straplike)', 'branchiae_type', char_str)
add(r'(\d+|one|two|three|four|five|six)\s*pairs?\s+of\s+branchiae?', 'branchiae_pairs', lambda m: int(m.group(1)) if m.group(1).isdigit() else w2n(m))
add(r'([A-Za-z]+)\s*pairs?\s+of\s+branchiae?', 'branchiae_pairs', w2n)
add(r'A\s+single\s+pair\s+of\s+branchiae?', 'branchiae_pairs', lambda m: 1)
add(r'Two\s+or\s+three\s+pairs?\s+of\s+branchiae?', 'branchiae_pairs', lambda m: '2-3')
add(r'Branchiae?\s+(?:from|on|at|present from|first present from)\s+setige?r?\s*(\d+)', 'branchiae_start_setiger', lambda m: int(m.group(1)))
add(r'Branchial\s+membrane\s+(?:long|short|club.shaped|flattened|rounded|triangular|tonguelike)', 'branchial_membrane', char_str)
add(r'Branchial\s+filaments?\s+(present|absent)', 'branchial_filaments', char_bool)
add(r'Branchiae?\s+in\s+part\s+(?:papillose|pennate|spiralled|pectinate)', 'branchiae_type', char_str)

# ── ELYTRA ──
add(r'[Ee]lytrae?\s+(absent|present|covering|small|large)', 'elytrae', char_str)
add(r'(\d+)\s*pairs?\s+of\s+elytrae?', 'elytrae_pairs', char_num)
add(r'(?:Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty[\-]?\w*)\s*pairs?\s+of\s+elytrae?', 'elytrae_pairs', w2n)
add(r'At\s+least\s+(\d+)\s*pairs?\s+of\s+elytrae?', 'elytrae_pairs_min', char_num)
add(r'Pseudelytrae?\s+(present|absent)', 'pseudelytrae', char_bool)

# ── ANTENNAE ──
add(r'Antennae?\s+(absent|present|rudimentary|short|long|minute)', 'antennae', char_str)
add(r'(?:One|Two|Three|Four|Five|Six|Seven|Eight)\s+antennae?\s+present', 'antennae_count', w2n)
add(r'(\d+)\s+antennae?\s+present', 'antennae_count', char_num)
add(r'(?:At\s+least|Maximally)\s+(\d+)\s+antennae?\s+present', 'antennae_count_range', lambda m: m.group(1).lower() + '_' + m.group(2))
add(r'Median\s+antenna\s+(absent|present|attached|well developed)', 'median_antenna', char_str)
add(r'(?:Two|Three|Five)\s+(?:or\s+more\s+)?antennae?\s+present', 'antennae_count', w2n)
add(r'Lateral\s+antennae?\s+(absent|present|attached|reduced|inserted|terminal|subterminal)', 'lateral_antennae', char_str)
add(r'Frontal\s+antennae?\s+(short|long|conical)', 'frontal_antennae', char_str)
add(r'Occipital\s+antenna\s+(present|absent)', 'occipital_antenna', char_bool)

# ── PALPS ──
add(r'Palps?\s+(absent|present|rudimentary|well developed|reduced|large|small|fused|free|biarticulated|simple|conical|foliose)', 'palps', char_str)

# ── TENTACULAR CIRRI ──
add(r'(\d+|one|two|three|four|five|six|seven|eight)\s*pairs?\s+of\s+tentacular\s+cirri', 'tentacular_cirri_pairs', lambda m: int(m.group(1)) if m.group(1).isdigit() else w2n(m))
add(r'([A-Za-z]+)\s*pairs?\s+of\s+tentacular\s+cirri', 'tentacular_cirri_pairs', w2n)
add(r'Tentacular\s+cirri\s+(absent|present|articulated|smooth|short|long|foliose|digitiform|rudimentary)', 'tentacular_cirri', char_str)

# ── PROSTOMIUM ──
add(r'Prostomium\s+(?:rounded|pointed|truncate|bilobed|blunt|conical|quadrangular|triangular|ovate|prolonged|annulated|reduced|retracted)', 'prostomium_shape', char_str)
add(r'Prostomium\s+(?:anteriorly\s+)?(?:pointed|rounded|truncate|blunt|produced|tapering)', 'prostomium_shape', char_str)
add(r'Prostomium\s+(?:deeply\s+)?bilobed', 'prostomium_shape', lambda m: 'bilobed')
add(r'Prostomium\s+(?:shaped|a\s+single\s+unified\s+lobe)', 'prostomium_shape', lambda m: 'single lobe')
add(r'Prostomium\s+consisting\s+of\s+two\s+inflated\s+lobes', 'prostomium_shape', lambda m: 'two lobes')
add(r'Prostomium\s+(?:with|without)\s+(?:ciliated\s+ridges|frontal\s+horns|laterofrontal\s+horns|appendages|palps)', 'prostomium_feature', lambda m: m.group(0).lower())

# ── CARUNCLE ──
add(r'Caruncle\s+(present|absent|large|small|long|wide|narrow|high|low)', 'caruncle', char_str)
add(r'Caruncle\s+(?:with\s+)?(?:crest|high central ridge|three parallel|transverse folds|longitudinal ridges)', 'caruncle_type', char_str)

# ── PARAPODIA ──
add(r'Parapodia\s+(?:uniramous|biramous|sub.biramous|reduced|prolonged|modified|well developed)', 'parapodia_type', char_str)
add(r'All\s+parapodia\s+uniramous', 'parapodia_type', lambda m: 'uniramous')
add(r'Anterior\s+parapodia\s+uniramous|Posterior\s+ones\s+biramous', 'parapodia_type', lambda m: 'anterior_uniramous')
add(r'Notopodia\s+(absent|present|reduced|well developed|strongly reduced|completely reduced|elevated|vascularized)', 'notopodia', char_str)
add(r'Neuropodia\s+(absent|present|well developed)', 'neuropodia', char_str)
add(r'Dorsal\s+cirri\s+(absent|present|rudimentary|articulated|smooth|flattened|cylindrical|foliose|digitate|digitiform|globular|filiform|ovoid|pyriform|clavate|papilliform)', 'dorsal_cirri', char_str)
add(r'Ventral\s+cirri\s+(absent|present|foliose|digitate|smooth|double|simple|fused|free|fimbriated)', 'ventral_cirri', char_str)

# ── BODY ──
add(r'Body\s+(?:slender|elongated|short|cylindrical|flattened|fusiform|ovate|maggotlike|disc.shaped|inflated|saclike|subcylindrical|muscular|ovoid|globular)', 'body_shape', char_str)
add(r'Body\s+(?:with|without)\s+(?:a\s+)?(?:distinct\s+incision|papillae|mucus\s+sheath|groove|felt|individual\s+papillae)', 'body_feature', lambda m: m.group(0).lower().replace(' ','_'))
add(r'Body\s+(?:not\s+)?(?:regionated|divided|covered)', 'body_feature', char_str)
add(r'(\d+)\s+thoracic\s+setigers?\s+present', 'setiger_count', char_num)
add(r'(\d+)\s*thoracic\s+uncinigers?', 'unciniger_count', char_num)
add(r'(\d+)\s*setigers?\s+present', 'setiger_count', char_num)

# ── SEGMENTS ──
add(r'(\d+)\s*(?:asetigerous|achaetous)\s+segments?', 'asetigerous_segments', char_num)
add(r'(?:One|Two|Three|Four|Five)\s+anterior\s+asetigerous\s+segments?', 'asetigerous_segments', w2n)
add(r'Anterior\s+asetigerous\s+segment\s+(absent|present)', 'asetigerous_segment', char_str)
add(r'No\s+(?:apodous|asetigerous)\s+segment\s+present', 'asetigerous_segments', lambda m: 0)

# ── PHARYNX ──
add(r'(?:Eversible\s+)?[Pp]harynx\s+(?:armed|unarmed|smooth|papillated|fimbriated|non.muscular|muscular|sinuous|straight)', 'pharynx', char_str)
add(r'[Pp]roboscis\s+(absent|present|papillated|grooved)', 'proboscis', char_str)
add(r'[Pp]harynx\s+with\s+(?:jaws|papillae|paragnaths|teeth|chevrons|fimbriae|valve|tooth)', 'pharynx_armature', char_str)
add(r'[Pp]harynx\s+distally\s+(?:fimbriated|papillated|smooth)', 'pharynx_distal', char_str)
add(r'Jaws?\s+(absent|present)', 'jaws', char_bool)
add(r'Maxillae?\s+I\s+(falcate|dentate|smooth)', 'maxilla_I', char_str)
add(r'Maxillary\s+apparatus\s+(absent|present|reduced)', 'maxillary_apparatus', char_str)

# ── EYES ──
add(r'Eyes?\s+(absent|present|large|small|reduced|distinct|confluent|rudimentary|minute)', 'eyes', char_str)
add(r'Lateral\s+eyes?\s+(absent|present)', 'lateral_eyes', char_bool)
add(r'Ommatophores?\s+(absent|present|fused|separated)', 'ommatophores', char_str)

# ── COLLAR ──
add(r'Collar\s+(absent|present|reduced|well developed|rudimentary|two.lobed|four.lobed|high|low)', 'collar', char_str)
add(r'Collar\s+setae?\s+(absent|present|limbate|capillary|modified|simple|dentate|basally|slender)', 'collar_setae', char_str)
add(r'Peristomium\s+forms?\s+(?:a\s+)?(?:large\s+)?(?:ventral\s+)?collar', 'peristomium_collar', lambda m: True)

# ── OPERCULUM ──
add(r'Operculum\s+(absent|present|flat|conical|funnel.shaped|spherical|globular)', 'operculum', char_str)
add(r'Opercular\s+stalk\s+(?:with|without)\s+(?:wings\s+or\s+spines|wings|spines|annulations|calcified|swelling|bulbs)', 'opercular_stalk', lambda m: m.group(0).lower().replace(' ','_'))
add(r'Opercular\s+cap\s+(calcareous|chitinous|black)', 'opercular_cap', char_str)
add(r'Opercular\s+(?:peduncles|plate|rim)\s+(?:short|fused|free|cirrate|smooth|single)', 'opercular_detail', char_str)

# ── SETAE ──
add(r'Setae?\s+completely\s+absent', 'setae_present', lambda m: False)
add(r'Setae?\s+present\s+(?:from|in|on)', 'setae_present', lambda m: True)
add(r'All\s+setae\s+simple\s+capillaries?', 'setae_type', lambda m: 'simple capillaries')
add(r'All\s+setae\s+(simple|composite|capillary)', 'setae_type', char_str)
add(r'(?:Both\s+)?(?:composite|simple)\s+and\s+(?:simple|composite)\s+setae?\s+present', 'setae_type', lambda m: 'mixed')
add(r'Setae\s+include\s+(?:capillaries|composite|falcigers|spinigers|hooks|acicular)', 'setae_composition', char_str)
add(r'Setae\s+(?:composite\s+)?spinigers', 'setae_type', lambda m: 'composite_spinigers')
add(r'Setae\s+(?:composite\s+)?falcigers', 'setae_type', lambda m: 'composite_falcigers')
add(r'(?:Composite|Simple)\s+setae?\s+present', 'setae_type', lambda m: m.group(0).lower().split()[0])

# ── NEUROSETAE ──
add(r'Neurosetae?\s+(?:composite|simple|acicular|capillary|spiniger(?:s)?|falciger(?:s)?|spinose|plumose|serrate|furcate|trumpet.shaped|geniculate|limbate|bidentate|unidentate|entire|trifid|trifurcate|pencillate|cleft)', 'neurosetae_type', char_str)
add(r'All\s+neurosetae?\s+(?:spinigerous|bidentate|unidentate|capillary)', 'neurosetae_type', char_str)
add(r'(?:At\s+least\s+some|Some)\s+neurosetae?\s+(?:bidentate|composite|falciger)', 'neurosetae_type', char_str)

# ── NOTOSETAE ──
add(r'Notosetae?\s+(absent|present)', 'notosetae_present', char_bool)
add(r'Notosetae?\s+(?:capillary|acicular|furcate|smooth|serrated|spinose|knobbed|hirsute|plumose|cross.barred|tapering|limbate|denticulated|pectinate|lancet.shaped|coarse|slender|bifurcate|flattened)', 'notosetae_type', char_str)
add(r'Notosetae?\s+(?:as\s+thick\s+as|thicker\s+than)\s+the\s+neurosetae', 'notosetae_vs_neurosetae', lambda m: 'thicker')
add(r'Notosetae?\s+distinctly\s+(?:slenderer|thinner)\s+than', 'notosetae_vs_neurosetae', lambda m: 'thinner')

# ── UNCINI ──
add(r'Uncini\s+(absent|present|long.handled|short.handled|sharply bent|falcate|pectinate|rostrate|avicular)', 'uncini', char_str)
add(r'Uncini\s+(?:with\s+)?(?:teeth\s+in\s+)?(?:single|double|alternating|several)\s+rows?', 'uncini_rows', char_str)
add(r'Uncini\s+from\s+(?:setiger|segment)\s+(\d+)', 'uncini_start_setiger', char_num)
add(r'Thoracic\s+uncini\s+(?:long.handled|short.handled|sharply bent|gently curved)', 'thoracic_uncini', char_str)

# ── HOOKS ──
add(r'[Hh]ooks?\s+(absent|present|bidentate|unidentate|falcate|hooded|rostrate)', 'hooks', char_str)
add(r'Subacicular\s+hooks?\s+(absent|present)', 'subacicular_hooks', char_bool)
add(r'Genital\s+spines?\s+(absent|present)', 'genital_spines', char_bool)
add(r'Acicular\s+(?:setae|spines)\s+(absent|present)', 'acicular_setae', char_bool)

# ── TUBE / COILING ──
add(r'Tube\s+(?:calcareous|membranous|free|attached|coiled|uncoiled|tightly coiled|tusk.shaped)', 'tube_type', char_str)
add(r'(?:Dextrally|Sinistrally)\s+coiled', 'coiling', char_str)

# ── QUANTIFIERS ──
add(r'At\s+least\s+(\d+)\s+thoracic\s+uncinigers?', 'unciniger_count', char_num)
add(r'At\s+least\s+(\d+)\s+thoracic\s+setigers?', 'setiger_count', char_num)
add(r'At\s+least\s+(\d+)\s+(?:anterior\s+)?setigers?\s+with\s+capillary\s+setae', 'capillary_setigers_min', char_num)
add(r'(\d+)\s+(?:first\s+)?setigers?\s+with\s+capillary\s+setae\s+only', 'capillary_setigers_count', char_num)
add(r'Maximally\s+(\d+)\s+anterior\s+segments?\s+with\s+reduced\s+parapodia', 'reduced_parapodia_count', char_num)

# ── ABDOMINAL ──
add(r'Abdominal\s+(?:setae|uncini)\s+(absent|present|trumpet.shaped|geniculate|capillary)', 'abdominal_setae', char_str)
add(r'Abdominal\s+notopodial\s+(?:rudiments?|setae)\s+(absent|present)', 'abdominal_notopodial', char_str)
add(r'Abdomen\s+with\s+(?:two|three|four|several)\s+setigers?', 'abdominal_setigers', w2n)

# ── THORACIC ──
add(r'Thoracic\s+membrane\s+(absent|present)', 'thoracic_membrane', char_str)
add(r'Thoracic\s+spatulate\s+notosetae\s+(absent|present)', 'thoracic_notosetae', char_str)

# ── ANTERIOR ──
add(r'Anterior\s+abdominal\s+setae?\s+(?:trumpet.shaped|geniculate|stout)', 'anterior_abdominal_setae', char_str)

# ── ANAL ──
add(r'Anal\s+(?:plaque|cirri|funnel|cone|tube|papillae)\s+(absent|present|smooth|cirrate|symmetrical|asymmetrical|projecting|low|short|long)', 'anal', char_str)

# ── PALEAE ──
add(r'Paleae?\s+(absent|present|large|small)', 'paleae', char_str)

# ── NUCHAL ──
add(r'Nuchal\s+(?:hooks|organs|epaulettes|lappets|slits)\s+(absent|present)', 'nuchal', char_str)

# ── RADIOLES ──
add(r'Radioles?\s+(?:united by a membrane|free to the base|externally ridged|externally rounded|dichotomously branching|not divided)', 'radioles', char_str)
add(r'Radioles?\s+in\s+(?:spirals|semi.circles)', 'radioles_arrangement', char_str)

# ── SIDE SETAE ──
add(r'Side\s+setae?\s+(absent|present)', 'side_setae', char_bool)

# ── VENTRUM ──
add(r'Ventrum\s+(?:smooth|papillose|with glandular|with transverse|irregularly)', 'ventrum', char_str)

# ── HIGH-YIELD GENERIC PATTERNS ──
add(r'A\s+(?:pair of\s+)?(?:large|small|single|long|short|slender|thick|simple|curved)?\s*(\w+[\w\s]{1,30}?)\s+(?:is\s+)?(present|absent)\b', 'has', lambda m: (m.group(1).strip().lower()[:30], m.group(2).lower()))
add(r'(Abdominal|Thoracic|Anterior|Posterior|Median)\s+(\w+[\w\s]{1,30}?)\s+(with|without)\s+(\w+)', 'body_region_feature', lambda m: f"{m.group(1).lower()}_{m.group(2).strip().lower()[:20].replace(' ','_')}_{'with' if m.group(3)=='with' else 'without'}_{m.group(4).lower()[:20]}")
add(r'(\w+[\w\s]{1,30}?)\s+(are\s+)?(present|absent)\b', 'has_simple', lambda m: (m.group(1).strip().lower()[:30], m.group(3).lower()))

# ── MISSING VARIATIONS ── (patches for common unparsed descriptions)
add(r'(?:One|Two|Three|Four|Five|Six|Seven|Eight)\s+antennae?\b', 'antennae_count', w2n)
add(r'Two\s+antennae', 'antennae_count', lambda m: 2)
add(r'Three\s+antennae', 'antennae_count', lambda m: 3)
add(r'(?:One|Two|Three|Four|Five|Six|Seven|Eight)\s+pairs?\s+of\s+anal\s+cirri', 'anal_cirri_count', w2n)
add(r'Two\s+dorsal\s+cirri\s+per\s+notopodium', 'dorsal_cirri_per_notopodium', lambda m: 2)
add(r'One\s+dorsal\s+cirrus\s+per\s+notopodium', 'dorsal_cirri_per_notopodium', lambda m: 1)
add(r'Uncini\s+from\s+(?:the\s+)?(first|second|third|fourth|fifth)\s+(?:thoracic\s+)?(?:setiger|segment)', 'uncini_start', lambda m: {'first':1,'second':2,'third':3,'fourth':4,'fifth':5}.get(m.group(1).lower(),0))
add(r'Parapodia\s+(?:uniramous|biramous)\s+throughout', 'parapodia_type', lambda m: m.group(0).split()[1].lower())
add(r'Parapodia\s+(?:uniramous|biramous)', 'parapodia_type', char_str)
add(r'Both\s+(.+?)\s+and\s+(.+?)\s+(present|absent)', 'both_pattern', lambda m: (f"{m.group(1).strip().lower()[:20]}_{m.group(2).strip().lower()[:20]}", m.group(3).lower()))
add(r'Some\s+(.+?)\s+(present|absent)', 'some_pattern', lambda m: (m.group(1).strip().lower()[:30].replace(' ','_'), m.group(2).lower()))
add(r'(More\s+than|Less\s+than|At\s+least|Maximally|Up\s+to)\s+(\d+)\s+(.+?)\s+(present|absent)?', 'quantity_pattern', lambda m: f"{m.group(1).lower().replace(' ','_')}_{m.group(3).strip().lower()[:20].replace(' ','_')}_{m.group(2)}")
add(r'(\d+)\s+first\s+setigers?\s+with\s+capillary\s+setae', 'capillary_setigers', char_num)
add(r'(\d+)\s+thoracic\s+setigers?', 'setiger_count', char_num)
add(r'(Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen)\s+segments?\s+(?:present\s+)?(?:including\s+)?', 'segment_count', w2n)
add(r'(Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen)\s+(?:thoracic\s+)?setigers?', 'setiger_count', w2n)
add(r'Prostomium\s+(?:an\s+)?(?:elongated\s+)?(?:cone|plaque)', 'prostomium_shape', lambda m: 'elongated')
add(r'Prostomium\s+[^.]+?without\s+(?:appendages|palps)', 'prostomium_feature', lambda m: 'without_appendages')
add(r'Opercular\s+(?:peduncles|plate|rim|cap|membrane|stalk)\s+(?:short|fused|free|cirrate|smooth|single|flat|black|chitinous|calcareous|present|absent|with|without)', 'opercular_detail', lambda m: m.group(0).lower())
add(r'Thoracic\s+(?:membrane|notopodia|neuropodia|setigers?|uncini)\s+(?:present|absent|reaches|equidistant|widely)', 'thoracic_feature', lambda m: m.group(0).lower())
add(r'Notosetae\s+all\s+(?:capillaries|smooth|acicular|thick|slender)', 'notosetae_type', lambda m: m.group(0).lower().replace('notosetae all ',''))
add(r'Branchiae?\s+(?:arborescent|arranged|attached|present|absent)', 'branchiae_detail', lambda m: m.group(0).lower())
add(r'Peristomium\s+(?:does\s+not|dorsally|forms?)', 'peristomium_feature', lambda m: m.group(0).lower())
add(r'Ventral\s+cirri?\s+(?:covered|with|and)', 'ventral_cirri', lambda m: m.group(0).lower())
add(r'(?:Anterior|Posterior)\s+(?:setigers?|parapodia|end|neuropodia|notopodia|ventrum)\s+(?:with|without|not|flattened|inflated|modified|prolonged|reduced|covered)', 'anterior_posterior_feature', lambda m: m.group(0).lower())
add(r'Tube\s+(?:coiled|free|attached|calcareous|membranous)', 'tube_type', char_str)
add(r'Accessory\s+(.+?)\s+(?:on|present|absent)', 'accessory_feature', lambda m: m.group(1).strip().lower()[:30].replace(' ','_'))
add(r'Eyes\s+(?:reduced|distinct|confluent|very\s+large)', 'eyes', char_str)
add(r'Superior\s+neurosetae?\s+(.+?)(?:;|$)', 'superior_neurosetae', lambda m: m.group(1).strip().lower())

# ── PARSER ──
def split_description(text):
    text = re.sub(r'\(NOTE:.*?\)', '', text)
    parts = re.split(r'\s*;\s*', text)
    result = []
    for part in parts:
        sub = re.split(r'(?:,\s+(?:but|and|however|with)\s+)', part, maxsplit=1)
        result.extend(sub)
    return [r.strip() for r in result if r.strip()]

def parse_description(text):
    traits = {}
    for part in split_description(text):
        matched = False
        for pattern, char_name, extractor in P:
            m = re.search(pattern, part, re.IGNORECASE)
            if m:
                val = extractor(m)
                if val is not None and char_name is not None:
                    # Handle tuple returns from generic patterns
                    if isinstance(val, tuple) and len(val) == 2:
                        # Generic presence/absence: use the subject as key
                        key_name = f'has_{val[0][:25].replace(" ","_")}'
                        if key_name not in traits:
                            traits[key_name] = []
                        if val[1] not in traits[key_name]:
                            traits[key_name].append(val[1])
                    else:
                        if char_name not in traits:
                            traits[char_name] = []
                        vals = [val] if not isinstance(val, list) else val
                        for v in vals:
                            sv = str(v)
                            if sv not in traits[char_name]:
                                traits[char_name].append(sv)
                matched = True
                break
        
        # Generic fallback for unmatched parts
        if not matched and part.strip():
            p = part.strip().rstrip('.,; ')
            # Store raw text as a generic descriptor (always keep)
            if '_notes' not in traits:
                traits['_notes'] = []
            if p not in traits['_notes']:
                traits['_notes'].append(p)
    
    return {k: v[0] if len(v) == 1 else v for k, v in traits.items()}

def process_key(key):
    def _trace(start_step, path):
        results = {}
        sd = key.get(start_step)
        if not sd:
            return results
        for on in ('optionA', 'optionB'):
            opt = sd[on]
            label = 'a' if on == 'optionA' else 'b'
            new_path = path + [{'step': start_step, 'option': label, 'text': opt.get('text','')}]
            if opt.get('result'):
                n = opt['result'].strip()
                results.setdefault(n, []).append(new_path)
            elif opt.get('goTo'):
                for k, v in _trace(opt['goTo'], new_path).items():
                    results.setdefault(k, []).extend(v)
        return results
    raw = _trace('1', [])
    for fam in raw:
        seen = set()
        raw[fam] = [p for p in raw[fam] if not (sig:=tuple((s['step'],s['option']) for s in p)) in seen and not seen.add(sig)]
    return raw

def main():
    base = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
    td = os.path.join(base, 'traits')
    os.makedirs(td, exist_ok=True)
    
    with open(os.path.join(base, 'fauchald_family_key_en.json')) as f:
        ft = process_key(json.load(f))
    
    gd = os.path.join(base, 'genera_keys')
    gt = {}
    for fn in sorted(os.listdir(gd)):
        if not fn.endswith('.json') or fn in ('index.json',) or '_es' in fn:
            continue
        with open(os.path.join(gd, fn)) as f:
            k = json.load(f)
        fam = k.get('_meta',{}).get('family', fn.replace('.json','').upper())
        t = process_key(k)
        if t:
            gt[fam] = t
    
    cd, ci = defaultdict(set), defaultdict(list)
    gp, fp = {}, {}
    
    for family, genera in gt.items():
        for genus, paths in genera.items():
            acc = defaultdict(list)
            for path in paths:
                for step in path:
                    for k, v in (parse_description(step['text']).items() if isinstance(parse_description(step['text']), dict) else []):
                        vs = [v] if not isinstance(v, list) else v
                        for vv in vs:
                            sv = str(vv)
                            if sv not in acc[k]:
                                acc[k].append(sv)
                        cd[k].add(step['text'])
            flat = {k: v[0] if len(v)==1 else v for k,v in acc.items()}
            for k, vs in acc.items():
                for v in vs:
                    if v not in ci[k]:
                        ci[k].append(v)
            if genus not in gp:
                gp[genus] = {'family': family, 'traits': flat}
            else:
                gp[genus]['traits'].update(flat)
    
    for fname, paths_list in ft.items():
        cn = re.sub(r'\s*\(.*?\)','',fname).strip()
        acc = defaultdict(list)
        for path in paths_list:
            for step in path:
                for k, v in (parse_description(step['text']).items() if isinstance(parse_description(step['text']), dict) else []):
                    vs = [v] if not isinstance(v, list) else v
                    for vv in vs:
                        sv = str(vv)
                        if sv not in acc[k]:
                            acc[k].append(sv)
                    cd[k].add(step['text'])
        flat = {k: v[0] if len(v)==1 else v for k,v in acc.items()}
        for k, vs in acc.items():
            for v in vs:
                if v not in ci[k]:
                    ci[k].append(v)
        fp[cn] = flat
    
    cc = {}
    for cn in sorted(cd.keys()):
        vals = [str(v) for v in ci.get(cn,[])]
        cc[cn] = {
            'examples': list(cd[cn])[:5],
            'values': vals[:15],
            'type': 'boolean' if all(v in ('True','False') for v in vals[:3]) else
                    'integer' if all(v.lstrip('-').isdigit() for v in vals[:5]) else 'string',
        }
    
    out = {'version': '3.0', 'generated': '2026-05-07',
           'summary': {'families': len(fp), 'genera': len(gp), 'characters': len(cc)},
           'characters': cc, 'families': fp, 'genera': gp}
    
    op = os.path.join(td, 'character_traits.json')
    with open(op, 'w') as f:
        json.dump(out, f, indent=2)
    
    # Coverage
    all_desc = set()
    for family, genera in gt.items():
        for genus, paths in genera.items():
            for path in paths:
                for step in path:
                    all_desc.add(step['text'])
    for path in ft.values():
        for p in path:
            for s in p:
                all_desc.add(s['text'])
    
    hits = sum(1 for d in all_desc if parse_description(d))
    print(f"Wrote {op}")
    print(f"  {len(fp)} families, {len(gp)} genera, {len(cc)} characters")
    print(f"  Coverage: {hits}/{len(all_desc)} descriptions ({100*hits//len(all_desc)}%)")

if __name__ == '__main__':
    main()
