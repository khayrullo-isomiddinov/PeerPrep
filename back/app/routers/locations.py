from fastapi import APIRouter, Query
from typing import List

router = APIRouter(prefix="/locations", tags=["locations"])

# Real university locations with coordinates for map integration
_REAL_LOCATIONS = [
    ("New York University", "New York, NY", "40.7295", "-73.9965"),
    ("Columbia University", "New York, NY", "40.8075", "-73.9626"),
    ("MIT", "Cambridge, MA", "42.3601", "-71.0942"),
    ("Harvard University", "Cambridge, MA", "42.3770", "-71.1167"),
    ("Stanford University", "Stanford, CA", "37.4275", "-122.1697"),
    ("UC Berkeley", "Berkeley, CA", "37.8719", "-122.2585"),
    ("UCLA", "Los Angeles, CA", "34.0689", "-118.4452"),
    ("University of Chicago", "Chicago, IL", "41.7886", "-87.5987"),
    ("Northwestern University", "Evanston, IL", "42.0565", "-87.6753"),
    ("University of Michigan", "Ann Arbor, MI", "42.2808", "-83.7430"),
    ("Carnegie Mellon University", "Pittsburgh, PA", "40.4426", "-79.9442"),
    ("University of Pennsylvania", "Philadelphia, PA", "39.9522", "-75.1932"),
    ("Duke University", "Durham, NC", "36.0016", "-78.9382"),
    ("UNC Chapel Hill", "Chapel Hill, NC", "35.9049", "-79.0469"),
    ("Georgia Tech", "Atlanta, GA", "33.7756", "-84.3963"),
    ("University of Texas Austin", "Austin, TX", "30.2849", "-97.7341"),
    ("Rice University", "Houston, TX", "29.7174", "-95.4018"),
    ("University of Washington", "Seattle, WA", "47.6553", "-122.3035"),
    ("University of British Columbia", "Vancouver, BC", "49.2606", "-123.2460"),
    ("McGill University", "Montreal, QC", "45.5048", "-73.5772"),
    ("University of Toronto", "Toronto, ON", "43.6532", "-79.3832"),
    ("University of California San Diego", "San Diego, CA", "32.8801", "-117.2340"),
    ("Cornell University", "Ithaca, NY", "42.4534", "-76.4735"),
    ("Princeton University", "Princeton, NJ", "40.3431", "-74.6550"),
    ("Yale University", "New Haven, CT", "41.3163", "-72.9223"),
    ("Brown University", "Providence, RI", "41.8268", "-71.4025"),
    ("Dartmouth College", "Hanover, NH", "43.7044", "-72.2887"),
    ("Johns Hopkins University", "Baltimore, MD", "39.3289", "-76.6206"),
    ("Northwestern University", "Evanston, IL", "42.0565", "-87.6753"),
    ("Vanderbilt University", "Nashville, TN", "36.1447", "-86.8027"),
]

@router.get("")
def list_locations(query: str = Query("", min_length=0), limit: int = 8) -> List[dict]:
    q = (query or "").strip().lower()
    results = []
    for university, location, lat, lng in _REAL_LOCATIONS:
        text = f"{university}, {location}"
        if not q or q in university.lower() or q in location.lower() or q in text.lower():
            results.append({
                "name": university, 
                "country": location, 
                "full": text,
                "lat": lat,
                "lng": lng
            })
        if len(results) >= limit:
            break
    return results

