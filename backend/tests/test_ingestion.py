from app.core.text import normalize_text
from app.modules.ingestion.normalize import normalize_listing, parse_price
from app.modules.ingestion.pipeline import run_ingestion
from app.modules.ingestion.sources.market import TRUTH
from app.modules.ingestion.types import RawListing


def raw(title: str, price: str = "1,000,000 تومان", stock: str = "موجود") -> RawListing:
    return RawListing(source_id="t", seller_name="t", external_id="1", url="u", title=title, price_text=price, stock_text=stock, crawled_at="now")


def test_normalize_text_handles_arabic_letters_and_digits():
    assert normalize_text("لنت جلو۲۰۶تيپ۵ ") == "لنت جلو 206 تیپ 5"


def test_price_rial_to_toman_and_persian_digits():
    assert parse_price("۱۲,۵۰۰,۰۰۰ ریال") == 1_250_000
    assert parse_price("تماس بگیرید") is None


def test_brand_is_not_mistaken_for_a_car():
    n = normalize_listing(raw("لنت جلو پارس لنت مناسب پراید"))
    assert n.brand == "pars" and n.platforms == ["pride"]


def test_oil_specs_extracted():
    n = normalize_listing(raw("روغن10w40 بهران سوپر پیشتاز ۴لیتری اصل"))
    assert (n.category, n.viscosity, n.volume_l, n.line, n.is_original) == ("engine-oil", "10W40", 4.0, "سوپر پیشتاز", True)


def test_battery_ampere_with_madda():
    assert normalize_listing(raw("باتری اطلس 74 آمپر")).ampere == 74


def test_junk_is_rejected():
    assert isinstance(normalize_listing(raw("کارت هدیه ۵۰۰ هزار تومانی")), str)


def test_matcher_recovers_ground_truth_exactly():
    products, report = run_ingestion()
    assert report.product_count == len(TRUTH)
    assert all(len(p.offers) >= 1 for p in products)
    assert report.rejected  # junk rows were dropped, not silently merged
