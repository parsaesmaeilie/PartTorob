from app.modules.search import parse_intent, search_products


def test_intent_parsing():
    i = parse_intent("لنت جلو ارزان برای سمند زیر 2 میلیون")
    assert i.categories == ["brake-pad"]
    assert i.vehicle_ids == ["samand-lx"]
    assert i.priority == "cheap" and i.position == "front" and i.max_price == 2_000_000


def test_oil_results_respect_the_cars_manual():
    res = search_products("روغن موتور", vehicle_id="pride-131")
    assert res.results
    assert all(r.product.attributes.viscosity in {"20W50", "10W40"} for r in res.results)
    assert all(r.fit.status == "fits" for r in res.results)


def test_explicit_viscosity_is_a_hard_filter():
    res = search_products("روغن 5w30")
    assert res.results and all(r.product.attributes.viscosity == "5W30" for r in res.results)


def test_incompatible_parts_hidden_unless_asked():
    hidden = search_products("لنت", vehicle_id="haima-s7")
    shown = search_products("لنت", vehicle_id="haima-s7", hide_incompatible=False)
    assert all(r.fit.status != "no-fit" for r in hidden.results)
    assert len(shown.results) > len(hidden.results)


def test_every_result_is_explained_and_sorted():
    res = search_products("لنت جلو 206")
    scores = [r.score for r in res.results]
    assert scores == sorted(scores, reverse=True)
    assert all(r.reasons for r in res.results)


def test_priorities_stack_instead_of_replacing_each_other():
    from app.modules.search.ranker import weights_for

    base = weights_for([])
    both = weights_for(parse_intent("لنت ارزون با کیفیت").priorities)
    assert both["price"] > base["price"] and both["quality"] > base["quality"]  # "cheap" no longer drowns "quality"
    assert parse_intent("لنت ارزون با کیفیت").terms == []  # priority words are not search terms


def test_fast_and_warranty_change_the_weights():
    from app.modules.search.ranker import weights_for

    base = weights_for([])
    assert weights_for(parse_intent("لنت ارسال سریع").priorities)["speed"] > base["speed"] * 3
    assert weights_for(parse_intent("لنت با گارانتی").priorities)["warranty"] > base["warranty"] * 3


def test_brand_filter_and_facets():
    allr = search_products("لنت جلو")
    assert allr.brand_facets and sum(f.count for f in allr.brand_facets) == len(allr.results)
    bosch = search_products("لنت جلو", brand="bosch")
    assert bosch.results and all(r.product.brand == "bosch" for r in bosch.results)
    assert bosch.brand_facets == allr.brand_facets  # facets stay visible so the user can switch brand
