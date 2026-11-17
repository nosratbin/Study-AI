def names(r):
    assert r.status_code == 200
    return [i["name"] for i in r.json()["items"]]


def test_short_names_and_word_order_find_the_university(client):
    for q in ("Dhaka University", "du", "dhaka uni"):
        assert "University of Dhaka" in names(client.get("/api/meta/institutions", params={"q": q, "level": "university"}))[:3]
    assert names(client.get("/api/meta/institutions", params={"q": "buet"}))[0] == "Bangladesh University of Engineering and Technology"


def test_level_ranks_matching_places_first(client):
    items = client.get("/api/meta/institutions", params={"q": "dhaka", "level": "college"}).json()["items"]
    assert items and all(not i["kinds"] or "college" in i["kinds"] for i in items[:3])


def test_bangla_query_and_short_query(client):
    assert names(client.get("/api/meta/institutions", params={"q": "ঢাকা"}))
    assert names(client.get("/api/meta/institutions", params={"q": "a"})) == []
    assert client.get("/api/meta/institutions", params={"q": "x", "level": "kindergarten"}).status_code == 422


def test_districts_are_the_64_official_ones(client):
    r = client.get("/api/meta/districts")
    items = r.json()["items"]
    assert len(items) == 64 and {"Dhaka", "Chattogram", "Cumilla", "Cox's Bazar"} <= {d["name"] for d in items}
    assert all(d["bn"] for d in items) and "max-age" in r.headers["cache-control"]
