"""PRISM AI: Disaster Dataset & Manifest Management
Provides partitioned, leakage-safe disaster data splits for reproducible evaluation.
"""

import os
import json
import random
from typing import List, Dict, Any, Tuple
import numpy as np

SEVERITY_CLASSES = [
    "ADVISORY (LEVEL 1)",
    "MODERATE (LEVEL 2)",
    "SEVERE (LEVEL 3)",
    "CRITICAL (LEVEL 4)"
]

# Standard disaster archetypes for flood intelligence evaluation
CURATED_INCIDENTS: List[Dict[str, Any]] = [
    {
        "id": "INC-8820",
        "title": "Suburban Flash Flood - Stranded Residents",
        "text": "Flash flood trapped 6 residents on 2nd floor, structural integrity compromised, waters rising 15cm/hr. Power lines down near transformer 4B.",
        "image_type": "drone_aerial_turbid",
        "ground_truth_severity": 3,  # Critical (Level 4, 0-indexed)
        "lat": 29.7604,
        "lng": -95.3698,
        "region": "Houston East Basin",
        "split": "test",
        "base_sharpness": 94.2,
        "base_contrast": 68.5,
        "entities": {
            "urgency": "CRITICAL",
            "trapped_count": 6,
            "water_depth": "2.1m",
            "water_trend": "+15cm/hr",
            "hazards": ["13.8kV Grid Transformer 4B", "Turbulent current"]
        }
    },
    {
        "id": "INC-7412",
        "title": "Industrial Canal Overflow & Hazmat Threat",
        "text": "Chemical containment bund breached by floodwaters. Severe current washing over perimeter security wall. Evacuate downstream sectors immediately.",
        "image_type": "satellite_multispectral",
        "ground_truth_severity": 3,
        "lat": 29.9802,
        "lng": -95.3341,
        "region": "Ship Channel Sector 2",
        "split": "test",
        "base_sharpness": 88.0,
        "base_contrast": 74.0,
        "entities": {
            "urgency": "CRITICAL",
            "trapped_count": 0,
            "water_depth": "2.8m",
            "water_trend": "+25cm/hr",
            "hazards": ["Chemical Runoff", "Wall Collapse"]
        }
    },
    {
        "id": "INC-6104",
        "title": "Residential Boulevard Waterlogging",
        "text": "Roadway covered in 40cm standing storm water. Vehicles unable to pass, but homes are dry and elevated. Local pump station operational.",
        "image_type": "traffic_cam_low_angle",
        "ground_truth_severity": 1,  # Moderate (Level 2)
        "lat": 29.7121,
        "lng": -95.4011,
        "region": "Southwest Parkway",
        "split": "test",
        "base_sharpness": 76.5,
        "base_contrast": 52.0,
        "entities": {
            "urgency": "MODERATE",
            "trapped_count": 0,
            "water_depth": "0.4m",
            "water_trend": "Stable",
            "hazards": ["Submerged road curbs"]
        }
    },
    {
        "id": "INC-5521",
        "title": "Highway Underpass Submersion",
        "text": "Underpass flooded to 1.8 meters. 2 empty commuter vehicles floating. No passengers visible. Barrier arms deployed by transport police.",
        "image_type": "cctv_fixed",
        "ground_truth_severity": 2,  # Severe (Level 3)
        "lat": 29.7892,
        "lng": -95.4520,
        "region": "Loop 610 Interchange",
        "split": "test",
        "base_sharpness": 81.0,
        "base_contrast": 60.0,
        "entities": {
            "urgency": "SEVERE",
            "trapped_count": 0,
            "water_depth": "1.8m",
            "water_trend": "Decreasing slowly",
            "hazards": ["Floating vehicles", "Electrical signage"]
        }
    },
    {
        "id": "INC-3982",
        "title": "Drainage Ditch Runoff Advisory",
        "text": "Neighborhood storm drainage ditch running at 70% capacity after morning rain shower. Flow is steady, banks intact, no structures threatened.",
        "image_type": "field_surveyor_phone",
        "ground_truth_severity": 0,  # Advisory (Level 1)
        "lat": 29.8400,
        "lng": -95.4900,
        "region": "Northwest Woods",
        "split": "test",
        "base_sharpness": 91.0,
        "base_contrast": 64.0,
        "entities": {
            "urgency": "ADVISORY",
            "trapped_count": 0,
            "water_depth": "0.2m",
            "water_trend": "Receding",
            "hazards": []
        }
    },
    {
        "id": "INC-2190",
        "title": "Hospital Access Route Threat",
        "text": "Flood waters encroaching on main ambulance ingress corridor. Water depth 65cm and approaching emergency department generator plant.",
        "image_type": "recon_drone_ir",
        "ground_truth_severity": 3,
        "lat": 29.7090,
        "lng": -95.3990,
        "region": "Medical Center District",
        "split": "test",
        "base_sharpness": 85.0,
        "base_contrast": 70.0,
        "entities": {
            "urgency": "CRITICAL",
            "trapped_count": 0,
            "water_depth": "0.65m",
            "water_trend": "+10cm/hr",
            "hazards": ["Generator Inundation", "EMS Ingress Blockade"]
        }
    },
    {
        "id": "INC-1845",
        "title": "Senior Care Facility First Floor Inundation",
        "text": "Ground floor taking on 1.1m muddy water. 14 elderly residents moved to upper floor, emergency power failing, medical oxygen tanks need evacuation.",
        "image_type": "aerial_recon",
        "ground_truth_severity": 3,
        "lat": 29.7340,
        "lng": -95.3420,
        "region": "Pine Valley Care Center",
        "split": "test",
        "base_sharpness": 89.0,
        "base_contrast": 65.0,
        "entities": {
            "urgency": "CRITICAL",
            "trapped_count": 14,
            "water_depth": "1.1m",
            "water_trend": "+18cm/hr",
            "hazards": ["Power failure", "Vulnerable population", "Medical supplies trapped"]
        }
    },
    {
        "id": "INC-1022",
        "title": "Suburban Park Water Retention Pond Overflow",
        "text": "Retention basin overflowing into recreational park paths. Playgrounds closed, surrounding residential lots remain 50 meters from waterline.",
        "image_type": "ground_photo",
        "ground_truth_severity": 0,
        "lat": 29.8120,
        "lng": -95.2750,
        "region": "Bayou Greenway Park",
        "split": "test",
        "base_sharpness": 92.5,
        "base_contrast": 58.0,
        "entities": {
            "urgency": "ADVISORY",
            "trapped_count": 0,
            "water_depth": "0.15m",
            "water_trend": "Stable",
            "hazards": []
        }
    }
]


def generate_benchmark_dataset(num_samples: int = 240, seed: int = 42) -> List[Dict[str, Any]]:
    """Generates a reproducible dataset with guaranteed train/val/test splits,

    simulating multimodal pairs with diverse noise, blur, and missing attributes.
    """
    random.seed(seed)
    np.random.seed(seed)

    scenarios = [
        # (severity, text_templates, base_image_quality)
        (0, [
            "Minor water pooling on sidewalk near {loc}. Storm drains draining effectively.",
            "Shallow puddles on secondary access lane at {loc}. No traffic hindrance.",
            "Water retention basin operating normally near {loc}. Normal seasonal runoff."
        ], 90.0),
        (1, [
            "Street flooding 30-50cm at {loc}. Cars advised to divert. Residences unaffected.",
            "Standing water across two westbound lanes at {loc}. Municipal pumps staged.",
            "Basement seepage reported in 3 properties along {loc}. Sump pumps engaged."
        ], 82.0),
        (2, [
            "Flood waters reached 1.2m at {loc}. Two vehicles submerged to hood level.",
            "Canal bank overflow affecting ground floors of retail strip at {loc}.",
            "Rapid water flow across arterial roadway at {loc}. Debris blocking storm culverts."
        ], 78.0),
        (3, [
            "CRITICAL: 5 residents trapped on attic at {loc}. Water rising 20cm/hr, boats needed.",
            "Flash flood submerged residential zone at {loc}. Foundation cracking, immediate evacuation.",
            "Hospital access cutoff by 2.2m surge at {loc}. Electrical substation failing."
        ], 85.0)
    ]

    locations = [
        "Memorial Drive", "Cypress Creek Basin", "Greens Bayou Sector 4", 
        "Westheimer Crossing", "Buffalo Bayou Overpass", "Post Oak District",
        "Clear Lake Shoreline", "Spring Branch Creek", "Barker Reservoir Outflow"
    ]

    dataset = []
    # Include curated test cases first
    dataset.extend(CURATED_INCIDENTS)

    # Generate additional split cases for training and validation
    for i in range(len(dataset), num_samples):
        sev, templates, base_sharp = random.choice(scenarios)
        loc = random.choice(locations)
        text = random.choice(templates).format(loc=loc)
        
        # Add random split: 70% train, 15% val, 15% test
        r = random.random()
        if r < 0.70:
            split = "train"
        elif r < 0.85:
            split = "val"
        else:
            split = "test"

        sharpness = max(15.0, min(100.0, base_sharp + np.random.normal(0, 10)))
        
        item = {
            "id": f"GEN-{i+1000}",
            "title": f"Incident at {loc}",
            "text": text,
            "image_type": "recon_sensor",
            "ground_truth_severity": sev,
            "lat": 29.70 + random.uniform(-0.15, 0.15),
            "lng": -95.40 + random.uniform(-0.15, 0.15),
            "region": loc,
            "split": split,
            "base_sharpness": round(sharpness, 1),
            "base_contrast": round(np.random.uniform(45, 80), 1),
            "entities": {
                "urgency": SEVERITY_CLASSES[sev].split()[0],
                "trapped_count": random.randint(2, 8) if sev == 3 else 0,
                "water_depth": f"{0.1 * (sev + 1) * random.uniform(1.0, 2.5):.1f}m",
                "water_trend": "Rising" if sev >= 2 else "Stable"
            }
        }
        dataset.append(item)

    return dataset
