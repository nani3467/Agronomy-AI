"""
Agronomy AI - Project Knowledge Grounding Service (RAG)
======================================================
Retrieves verified project data from `CROPS_DATABASE` and `DISEASE_DATABASE`
based on the farmer's query (in English, Telugu, or Hindi) to ground Gemini's
reasoning in verified local cultivation standards, botanical profiles,
and ICAR/PlantVillage treatment recommendations.
"""

import re
from typing import Dict, Any, List, Optional
from ..crop_data import CROPS_DATABASE
from ..disease_data import DISEASE_DATABASE

# Multilingual Crop Synonym Dictionary
CROP_ALIASES = {
    'rice': ['rice', 'paddy', 'oryza', 'వరి', 'ధాన్యం', 'धान', 'चावल'],
    'wheat': ['wheat', 'triticum', 'గోధుమ', 'गेहूं', 'गेहू'],
    'maize': ['maize', 'corn', 'zea mays', 'మొక్కజొన్న', 'మక్కజొన్న', 'मक्का', 'भुट्टा'],
    'barley': ['barley', 'జావ', 'जौ'],
    'sorghum': ['sorghum', 'జొన్న', 'జొన్నలు', 'ज्वार'],
    'millet': ['millet', 'బాజ్రా', 'సజ్జలు', 'రాగులు', 'కొర్రలు', 'बाजरा', 'रागी', 'कोदो'],
    'tomato': ['tomato', 'lycopersicon', 'solanum lycopersicum', 'టమాటా', 'టమాట', 'టమోటా', 'టమోట', 'टमाटर'],
    'potato': ['potato', 'solanum tuberosum', 'బంగాళాదుంప', 'ఆలూ', 'ఆలు', 'आलू'],
    'onion': ['onion', 'allium cepa', 'ఉల్లిపాయ', 'ఉల్లి', 'ఎర్రగడ్డ', 'प्याज'],
    'brinjal': ['brinjal', 'eggplant', 'aubergine', 'వంకాయ', 'వంగ', 'बैंगन'],
    'mango': ['mango', 'mangifera', 'మామిడి', 'మామిడికాయ', 'आम'],
    'banana': ['banana', 'musa', 'అరటి', 'అరటిపండు', 'కేళా', 'केला'],
    'apple': ['apple', 'malus', 'ఆపిల్', 'యాపిల్', 'సేబు', 'सेब'],
    'cotton': ['cotton', 'gossypium', 'పత్తి', 'ప్రత్తి', 'దూది', 'कपास', 'रूई'],
    'sugarcane': ['sugarcane', 'saccharum', 'చెరకు', 'చెరుకు', 'గన్నా', 'गन्ना', 'ईख'],
    'coffee': ['coffee', 'కాఫీ', 'कॉफी'],
    'groundnut': ['groundnut', 'peanut', 'arachis hypogaea', 'వేరుశనగ', 'వేరుశెనగ', 'పల్లీ', 'పల్లీలు', 'మూంగఫలీ', 'मूंगफली'],
    'chilli': ['chilli', 'chili', 'pepper', 'capsicum annuum', 'మిరప', 'మిర్చి', 'మిరపకాయ', 'మిర్చికాయ', 'मिर्च', 'मिर्ची'],
    'grapes': ['grapes', 'grape', 'vitis vinifera', 'ద్రాక్ష', 'ద్రాక్షపండ్లు', 'అంగూర్', 'अंगूर'],
    'bell_pepper': ['bell pepper', 'capsicum', 'sweet pepper', 'క్యాప్సికమ్', 'క్యాప్సికం', 'शिमला मिर्च'],
    'strawberry': ['strawberry', 'fragaria', 'స్ట్రాబెర్రీ', 'స్ట్రాబెరి', 'स्ट्रॉबेरी'],
    'peach': ['peach', 'prunus persica', 'పీచ్', 'ఆడు', 'आड़ू'],
    'orange': ['orange', 'citrus', 'నారింజ', 'బత్తాయి', 'కమలా', 'సంత్ర', 'संतरा', 'मौसमी'],
}

# Multilingual Disease Keywords Dictionary
DISEASE_KEYWORDS = {
    'blight': ['blight', 'బ్లైట్', 'ఎండ తెగులు', 'మాడు తెగులు', 'ఝులసా', 'झुलसा', 'ब्लाइट'],
    'early blight': ['early blight', 'ముందస్తు బ్లైట్', 'అగేతి ఝులసా', 'अगेती झुलसा'],
    'late blight': ['late blight', 'లేట్ బ్లైట్', 'తరువాతి బ్లైట్', 'పచేతి ఝులసా', 'पछेती झुलसा'],
    'blast': ['blast', 'అగ్గి తెగులు', 'బ్లాస్ట్', 'ब्लास्ट', 'झोंका रोग'],
    'rust': ['rust', 'తుప్పు తెగులు', 'కావి తెగులు', 'గేరువా', 'రస్ట్', 'गेरुआ', 'रतुआ'],
    'rot': ['rot', 'కుళ్ళు తెగులు', 'కుళ్లు', 'రాట్', 'गलन', 'सड़न'],
    'root rot': ['root rot', 'వేరు కుళ్లు', 'వేరు కుళ్ళు', 'जड़ गलन', 'जड़ सड़न'],
    'wilt': ['wilt', 'ఎండు తెగులు', 'విల్ట్', 'ఉక్టా', 'విల్టింగ్', 'उकठा', 'मुरझाना'],
    'mildew': ['mildew', 'బూజు తెగులు', 'బూడిద తెగులు', 'మిల్డ్యూ', 'फफूंद', 'चूर्णिल आसिता', 'मृदुरोमिल'],
    'powdery mildew': ['powdery mildew', 'బూడిద తెగులు', 'పౌడరీ మిల్డ్యూ', 'चूर्णिल आसिता', 'सफेद चूर्ण'],
    'downy mildew': ['downy mildew', 'డౌనీ మిల్డ్యూ', 'ఆకు అడుగు బూజు', 'मृदुरोमिल आसिता'],
    'spot': ['spot', 'మచ్చ తెగులు', 'ఆకు మచ్చ', 'దబ్బా', 'धब्बा', 'टिक्का'],
    'leaf spot': ['leaf spot', 'ఆకు మచ్చ తెగులు', 'పత్తి ఆకు మచ్చ', 'पत्ती धब्बा'],
    'mosaic': ['mosaic', 'మొజాయిక్', 'వైరస్ తెగులు', 'మోజాయిక్', 'मोज़ेक'],
    'curl': ['curl', 'ఆకు ముడుత', 'ముడుత తెగులు', 'కర్ల్', 'पत्ती मरोड़', 'कुंचन'],
    'scab': ['scab', 'పొక్కు తెగులు', 'స్కాబ్', 'स्कैब'],
}


def find_matched_crops(query: str) -> List[str]:
    """Find crop IDs in CROPS_DATABASE that match the user query."""
    q_norm = f" {(query or '').lower()} "
    matched = []
    for crop_id, aliases in CROP_ALIASES.items():
        for alias in aliases:
            # Match word boundary or exact substring for indic scripts
            if re.search(r'(?:^|\W)' + re.escape(alias) + r'(?:$|\W)', q_norm, re.IGNORECASE) or alias in q_norm:
                if crop_id in CROPS_DATABASE and crop_id not in matched:
                    matched.append(crop_id)
                break
    return matched


def find_matched_diseases(query: str, matched_crops: List[str]) -> List[str]:
    """Find disease keys in DISEASE_DATABASE that match query and crop context."""
    q_norm = (query or '').lower()
    matched_diseases = []

    # Check for specific disease keywords
    query_has_disease = any(
        any(k in q_norm for k in kw_list)
        for kw_list in DISEASE_KEYWORDS.values()
    ) or any(w in q_norm for w in ['disease', 'pest', 'fungus', 'bacteria', 'virus', 'తెగులు', 'పురుగు', 'రోగం', 'रोग', 'कीट'])

    for dis_key, dis_data in DISEASE_DATABASE.items():
        if dis_data.get('category') == 'Healthy' or dis_data.get('status') == 'Healthy':
            continue

        dis_name = dis_data.get('name', '').lower()
        dis_plant = dis_data.get('plant', '').lower()

        # Check plant match
        plant_match = False
        if not matched_crops:
            plant_match = True  # If no crop specified, check all
        else:
            for crop_id in matched_crops:
                crop_aliases = CROP_ALIASES.get(crop_id, [crop_id])
                if any(a in dis_plant or dis_plant in a for a in crop_aliases):
                    plant_match = True
                    break

        if not plant_match:
            continue

        # Check disease symptoms / name match
        matched_by_name = False
        for dis_type, aliases in DISEASE_KEYWORDS.items():
            if dis_type in dis_name:
                if any(a in q_norm for a in aliases):
                    matched_by_name = True
                    break

        # Also match if user asked about this crop's diseases generally
        if matched_by_name or (query_has_disease and plant_match and len(matched_diseases) < 3):
            if dis_key not in matched_diseases:
                matched_diseases.append(dis_key)

    return matched_diseases[:4]


def retrieve_project_context(query: str, language: str = 'en') -> str:
    """
    Extract factual ground-truth knowledge from CROPS_DATABASE and DISEASE_DATABASE
    to inject as reference context into the Gemini prompt.
    """
    if not query:
        return ""

    matched_crops = find_matched_crops(query)
    matched_diseases = find_matched_diseases(query, matched_crops)

    if not matched_crops and not matched_diseases:
        return ""

    lines = [
        "=== AGRONOMY AI VERIFIED DATABASE REFERENCE (PROJECT GROUND TRUTH) ===",
        "The following factual records from the Agronomy AI database match the user's query context.",
        "Use this verified data to ensure high scientific accuracy for fertilizers, cultivation, symptoms, and treatments:",
        ""
    ]

    # Add Crop Cultivation Intelligence
    for crop_id in matched_crops[:2]:
        c = CROPS_DATABASE.get(crop_id)
        if not c:
            continue
        lines.append(f"--- CROP PROFILE: {c.get('name')} ({c.get('scientific_name')}) ---")
        lines.append(f"Category: {c.get('category')} | Family: {c.get('family', 'N/A')}")
        lines.append(f"Climate: {c.get('climate')} | Season: {c.get('season')}")
        lines.append(f"Soil Requirements: {c.get('soil')}")
        lines.append(f"Water Requirement: {c.get('water_requirement')}")
        lines.append(f"Yield Potential: {c.get('yield_potential')}")

        fert = c.get('fertilizer_application')
        if fert:
            lines.append("Fertilizer Recommendations (NPK & Micro):")
            if isinstance(fert, dict):
                for stage, desc in fert.items():
                    lines.append(f"  * {stage.capitalize()}: {desc}")
            else:
                lines.append(f"  * {fert}")

        irrig = c.get('irrigation_schedule')
        if irrig:
            lines.append(f"Irrigation Guidance: {irrig}")

        stages = c.get('growth_stages')
        if stages and isinstance(stages, list):
            lines.append(f"Growth Stages ({len(stages)} stages):")
            for st in stages[:4]:
                lines.append(f"  * {st.get('stage')}: {st.get('duration')}, Focus: {st.get('activities')}")

        lines.append("")

    # Add Disease & Pest Pathology Intelligence
    for dis_key in matched_diseases[:3]:
        d = DISEASE_DATABASE.get(dis_key)
        if not d:
            continue
        lines.append(f"--- PATHOLOGY RECORD: {d.get('name')} (Host: {d.get('plant')}) ---")
        lines.append(f"Description: {d.get('description')}")
        lines.append(f"Symptoms: {d.get('symptoms')}")
        lines.append(f"Causes & Spread: {d.get('causes')}")
        lines.append(f"Preventive Measures: {d.get('prevention')}")
        lines.append(f"Biological Treatment: {d.get('biological_treatment')}")
        lines.append(f"Chemical Treatment (Dosage): {d.get('chemical_treatment')}")
        lines.append(f"Safety Precautions: {d.get('safety_precautions')}")
        lines.append("")

    lines.append("=== END OF VERIFIED DATABASE REFERENCE ===")
    return "\n".join(lines)
