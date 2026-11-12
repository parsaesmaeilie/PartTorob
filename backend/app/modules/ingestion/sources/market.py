"""MARKET SIMULATOR — stands in for real websites during the demo.

It knows the ground-truth products and renders them the way different shops
write listings: mixed digits, Arabic letters, Rial vs Toman, random word order,
English brand names, missing info, junk rows. The pipeline never sees this
ground truth — it has to recover it.
"""
import re
from dataclasses import dataclass, field

from app.core.text import seeded_random
from app.modules.catalog.taxonomy import CATEGORY_BY_ID


@dataclass
class Truth:
    cat: str
    brand_forms: list[str]
    base_price: int
    cat_words: list[str]
    line: str | None = None
    pos: str | None = None  # "جلو" | "عقب"
    viscosity: str | None = None
    volume_l: float | None = None
    ampere: int | None = None
    plug_code: str | None = None
    fits: list[str] = field(default_factory=list)


PAD = ["لنت ترمز", "لنت"]
OIL = ["روغن موتور", "روغن"]

TRUTH: list[Truth] = [
    # brake pads
    Truth("brake-pad", ["بوش", "BOSCH", "Bosch"], 1_850_000, PAD, pos="جلو", fits=["206", "پژو 206", "206 تیپ 5"]),
    Truth("brake-pad", ["ایساکو", "ISACO"], 1_250_000, PAD, pos="جلو", fits=["206", "پژو 206"]),
    Truth("brake-pad", ["پارس لنت", "parslent"], 890_000, PAD, pos="جلو", fits=["206", "پژو 206 تیپ 2"]),
    Truth("brake-pad", ["بوش", "BOSCH"], 2_100_000, PAD, pos="جلو", fits=["پارس", "پژو پارس", "405"]),
    Truth("brake-pad", ["ایساکو", "ISACO"], 1_390_000, PAD, pos="جلو", fits=["سمند", "سمند LX"]),
    Truth("brake-pad", ["پارس لنت"], 690_000, PAD, pos="جلو", fits=["پراید", "پراید 131"]),
    Truth("brake-pad", ["بوش", "Bosch"], 2_350_000, PAD, pos="جلو", fits=["دنا", "دنا پلاس"]),
    Truth("brake-pad", ["ساکورا", "SAKURA"], 2_900_000, PAD, pos="جلو", fits=["هایما", "هایما S7"]),
    Truth("brake-pad", ["ایساکو"], 980_000, PAD, pos="عقب", fits=["206", "پژو 206"]),
    Truth("brake-disc", ["ایساکو"], 3_200_000, ["دیسک ترمز", "دیسک چرخ"], pos="جلو", fits=["206", "پژو 206"]),
    # engine oil
    Truth("engine-oil", ["بهران", "behran"], 1_150_000, OIL, line="سوپر پیشتاز", viscosity="10W40", volume_l=4),
    Truth("engine-oil", ["بهران"], 820_000, OIL, line="رانا", viscosity="20W50", volume_l=4),
    Truth("engine-oil", ["ایرانول", "IRANOL"], 990_000, OIL, line="16000", viscosity="10W40", volume_l=4),
    Truth("engine-oil", ["توتال", "TOTAL", "Total"], 2_450_000, OIL, line="quartz 7000", viscosity="10W40", volume_l=4),
    Truth("engine-oil", ["توتال", "TOTAL"], 3_350_000, OIL, line="quartz 9000", viscosity="5W40", volume_l=4),
    Truth("engine-oil", ["کاسترول", "CASTROL", "Castrol"], 3_650_000, OIL, line="magnatec", viscosity="5W30", volume_l=4),
    Truth("engine-oil", ["کاسترول", "Castrol"], 4_400_000, ["روغن موتور"], line="edge", viscosity="5W30", volume_l=4),
    # filters
    Truth("oil-filter", ["ماهله", "MAHLE"], 310_000, ["فیلتر روغن"], fits=["206", "پژو 206"]),
    Truth("oil-filter", ["ایساکو"], 185_000, ["فیلتر روغن"], fits=["206", "پژو 206"]),
    Truth("oil-filter", ["ایساکو"], 210_000, ["فیلتر روغن"], fits=["سمند", "سمند LX", "EF7"]),
    Truth("oil-filter", ["ساکورا", "SAKURA"], 420_000, ["فیلتر روغن"], fits=["هایما"]),
    Truth("air-filter", ["ماهله", "MAHLE"], 380_000, ["فیلتر هوا"], fits=["206", "پژو 206"]),
    Truth("air-filter", ["ایساکو"], 260_000, ["فیلتر هوا"], fits=["پارس", "405"]),
    Truth("cabin-filter", ["بوش", "BOSCH"], 290_000, ["فیلتر کابین"], fits=["206", "پژو 206"]),
    # spark plugs
    Truth("spark-plug", ["NGK", "ngk"], 640_000, ["شمع موتور", "شمع"], plug_code="BKR6E"),
    Truth("spark-plug", ["بوش", "BOSCH"], 720_000, ["شمع موتور", "شمع"], plug_code="FR7"),
    Truth("spark-plug", ["NGK"], 2_200_000, ["شمع موتور", "شمع"], plug_code="ILZKR7B"),
    # batteries
    Truth("battery", ["سپاهان باتری", "سپاهان"], 3_900_000, ["باتری", "باطری"], ampere=60),
    Truth("battery", ["اطلس بی ایکس", "atlas bx"], 5_600_000, ["باتری", "باطری"], ampere=66),
    Truth("battery", ["اطلس بی ایکس", "atlas"], 6_400_000, ["باتری"], ampere=74),
    # fluids
    Truth("brake-fluid", ["بهران"], 210_000, ["روغن ترمز"], line="DOT4", volume_l=0.5),
    Truth("coolant", ["بهران"], 520_000, ["ضدیخ", "ضد یخ"], volume_l=4),
    # suspension / engine
    Truth("shock-absorber", ["ساکس", "SACHS"], 4_200_000, ["کمک فنر"], pos="جلو", fits=["206", "پژو 206"]),
    Truth("timing-belt", ["گیتس", "GATES"], 1_450_000, ["تسمه تایم"], fits=["206 تیپ 5", "پژو 206 تیپ 5"]),
    Truth("timing-belt", ["گیتس"], 1_680_000, ["تسمه تایم"], fits=["دنا", "دنا پلاس"]),
    Truth("water-pump", ["ایساکو"], 1_750_000, ["واتر پمپ", "واترپمپ"], fits=["206", "پژو 206"]),
    # tools / care
    Truth("tool-set", ["رونیکس", "RONIX"], 3_100_000, ["جعبه بکس"], line="94 پارچه"),
    Truth("jack", ["رونیکس"], 2_400_000, ["جک"], line="سوسماری 2 تن"),
    Truth("car-wax", ["مگوایرز", "Meguiars"], 1_350_000, ["واکس"], line="گلد کلاس"),
    Truth("air-compressor", ["رونیکس"], 1_900_000, ["کمپرسور باد", "پمپ باد"], line="فندکی"),
]

# ── catalogue expansion: every car in the KB gets the common wear parts
TRUTH += [
    # brakes
    Truth("brake-pad", ["ایساکو", "ISACO"], 1_080_000, PAD, pos="عقب", fits=["پارس", "پژو پارس", "405"]),
    Truth("brake-pad", ["پارس لنت"], 960_000, PAD, pos="جلو", fits=["پارس", "پژو پارس"]),
    Truth("brake-pad", ["بوش", "BOSCH"], 1_990_000, PAD, pos="جلو", fits=["سمند", "سمند LX"]),
    Truth("brake-pad", ["ایساکو"], 1_520_000, PAD, pos="جلو", fits=["دنا", "دنا پلاس"]),
    Truth("brake-pad", ["ایساکو", "ISACO"], 820_000, PAD, pos="جلو", fits=["پراید", "پراید 131"]),
    Truth("brake-pad", ["ساکورا", "SAKURA"], 2_350_000, PAD, pos="جلو", fits=["کاپرا", "وانت کاپرا"]),
    Truth("brake-pad", ["برمبو", "BREMBO", "Brembo"], 6_800_000, PAD, pos="جلو", fits=["تویوتا 86", "GT86"]),
    Truth("brake-pad", ["بوش", "Bosch"], 2_450_000, PAD, pos="عقب", fits=["هایما", "هایما S7"]),
    Truth("brake-disc", ["ایساکو"], 3_650_000, ["دیسک ترمز", "دیسک چرخ"], pos="جلو", fits=["پارس", "405"]),
    Truth("brake-disc", ["بوش", "BOSCH"], 4_300_000, ["دیسک ترمز"], pos="جلو", fits=["206", "پژو 206"]),
    Truth("brake-disc", ["فبی", "FEBI"], 3_900_000, ["دیسک ترمز", "دیسک چرخ"], pos="جلو", fits=["سمند"]),
    Truth("brake-disc", ["برمبو", "BREMBO"], 7_200_000, ["دیسک ترمز"], pos="جلو", fits=["هایما"]),
    Truth("brake-disc", ["برمبو", "Brembo"], 12_500_000, ["دیسک ترمز"], pos="جلو", fits=["تویوتا 86"]),
    Truth("brake-fluid", ["بوش", "BOSCH"], 340_000, ["روغن ترمز"], line="DOT4", volume_l=0.5),
    # oils & fluids
    Truth("engine-oil", ["موبیل", "MOBIL", "Mobil"], 3_150_000, OIL, viscosity="5W40", volume_l=4),
    Truth("engine-oil", ["لیکومولی", "LIQUI MOLY"], 4_900_000, OIL, viscosity="5W30", volume_l=4),
    Truth("engine-oil", ["توتال", "TOTAL"], 690_000, OIL, line="quartz 7000", viscosity="10W40", volume_l=1),
    Truth("engine-oil", ["ایرانول", "IRANOL"], 760_000, OIL, viscosity="20W50", volume_l=4),
    Truth("engine-oil", ["بهران", "behran"], 1_250_000, OIL, line="سوپر پیشتاز", viscosity="15W40", volume_l=5),
    Truth("gear-oil", ["بهران"], 310_000, ["روغن گیربکس", "واسکازین"], viscosity="80W90", volume_l=1),
    Truth("gear-oil", ["کاسترول", "Castrol"], 890_000, ["روغن گیربکس"], viscosity="75W90", volume_l=1),
    Truth("coolant", ["ایرانول"], 480_000, ["ضدیخ", "ضد یخ"], volume_l=4),
    Truth("coolant", ["لیکومولی", "LIQUI MOLY"], 1_450_000, ["ضدیخ"], volume_l=1.5),
    # filters
    Truth("oil-filter", ["ماهله", "MAHLE"], 340_000, ["فیلتر روغن"], fits=["سمند", "سمند LX"]),
    Truth("oil-filter", ["ایساکو"], 165_000, ["فیلتر روغن"], fits=["پراید", "پراید 131"]),
    Truth("oil-filter", ["ایساکو"], 195_000, ["فیلتر روغن"], fits=["پارس", "405"]),
    Truth("oil-filter", ["بوش", "BOSCH"], 390_000, ["فیلتر روغن"], fits=["دنا", "دنا پلاس"]),
    Truth("oil-filter", ["دنسو", "DENSO"], 650_000, ["فیلتر روغن"], fits=["تویوتا 86"]),
    Truth("air-filter", ["ماهله", "MAHLE"], 410_000, ["فیلتر هوا"], fits=["سمند"]),
    Truth("air-filter", ["ایساکو"], 210_000, ["فیلتر هوا"], fits=["پراید"]),
    Truth("air-filter", ["ساکورا", "SAKURA"], 520_000, ["فیلتر هوا"], fits=["هایما"]),
    Truth("air-filter", ["بوش", "BOSCH"], 880_000, ["فیلتر هوا"], fits=["تویوتا 86"]),
    Truth("cabin-filter", ["ایساکو"], 240_000, ["فیلتر کابین"], fits=["سمند"]),
    Truth("cabin-filter", ["بوش", "BOSCH"], 360_000, ["فیلتر کابین"], fits=["دنا", "دنا پلاس"]),
    Truth("fuel-filter", ["ایساکو"], 190_000, ["فیلتر بنزین"], fits=["206", "پژو 206"]),
    Truth("fuel-filter", ["بوش", "BOSCH"], 420_000, ["فیلتر بنزین"], fits=["پارس"]),
    # electrical
    Truth("spark-plug", ["بوش", "BOSCH"], 590_000, ["شمع موتور", "شمع"], plug_code="BKR6E"),
    Truth("spark-plug", ["دنسو", "DENSO"], 2_050_000, ["شمع موتور", "شمع"], plug_code="ILZKR7B"),
    Truth("battery", ["وارتا", "VARTA"], 6_900_000, ["باتری", "باطری"], ampere=66),
    Truth("battery", ["وارتا", "VARTA"], 7_800_000, ["باتری"], ampere=74),
    Truth("battery", ["سپاهان باتری", "سپاهان"], 4_600_000, ["باتری", "باطری"], ampere=74),
    Truth("battery", ["اطلس بی ایکس", "atlas bx"], 4_900_000, ["باتری"], ampere=60),
    Truth("battery", ["اطلس بی ایکس", "atlas"], 8_400_000, ["باتری", "باطری"], ampere=88),
    Truth("ignition-coil", ["بوش", "BOSCH"], 2_600_000, ["کوئل", "کویل"], fits=["206", "پژو 206"]),
    Truth("ignition-coil", ["ایساکو"], 1_700_000, ["کوئل"], fits=["سمند", "سمند LX"]),
    # suspension & engine
    Truth("shock-absorber", ["کی وای بی", "KYB"], 3_600_000, ["کمک فنر"], pos="جلو", fits=["206", "پژو 206"]),
    Truth("shock-absorber", ["ساکس", "SACHS"], 4_700_000, ["کمک فنر"], pos="جلو", fits=["پارس", "405"]),
    Truth("shock-absorber", ["کی وای بی", "KYB"], 3_900_000, ["کمک فنر"], pos="جلو", fits=["سمند"]),
    Truth("shock-absorber", ["ایساکو"], 1_950_000, ["کمک فنر"], pos="عقب", fits=["206", "پژو 206"]),
    Truth("ball-joint", ["ایساکو"], 420_000, ["سیبک"], fits=["پراید"]),
    Truth("ball-joint", ["فبی", "FEBI"], 890_000, ["سیبک"], fits=["پارس"]),
    Truth("timing-belt", ["گیتس", "GATES"], 1_520_000, ["تسمه تایم"], fits=["پارس", "405"]),
    Truth("timing-belt", ["ایساکو"], 980_000, ["تسمه تایم"], fits=["پراید"]),
    Truth("timing-belt", ["گیتس"], 1_740_000, ["تسمه تایم"], fits=["سمند"]),
    Truth("water-pump", ["ایساکو"], 1_890_000, ["واتر پمپ", "واترپمپ"], fits=["سمند"]),
    Truth("water-pump", ["والئو", "VALEO"], 2_700_000, ["واتر پمپ"], fits=["پارس"]),
    # tools & care
    Truth("tool-set", ["رونیکس", "RONIX"], 1_650_000, ["جعبه بکس"], line="46 پارچه"),
    Truth("air-compressor", ["بوش", "BOSCH"], 4_200_000, ["کمپرسور باد", "پمپ باد"]),
]


@dataclass
class SellerStyle:
    id: str
    name: str
    trust: float
    persian_digits: bool
    arabic_letters: bool
    rial: bool
    glued_digits: bool
    coverage: float
    price_bias: float
    shipping_days: tuple[int, int]
    groups: tuple[str, ...] | None = None  # specialist shops only list some category groups


SELLERS = [
    SellerStyle("yadakpart", "یدک‌پارت", 0.92, True, False, False, False, 0.85, 0.94, (1, 2)),
    SellerStyle("digiyadak", "دیجی‌یدک", 0.88, False, False, True, False, 0.75, 1.0, (1, 3)),
    SellerStyle("bazareghete", "بازار قطعه", 0.71, True, True, False, True, 0.7, 0.93, (3, 6)),
    SellerStyle("autoshop", "اتوشاپ تهران", 0.8, False, True, True, True, 0.6, 0.97, (2, 4)),
    SellerStyle("lentkade", "لنت‌کده", 0.95, True, False, False, False, 0.7, 1.08, (0, 1), ("brakes", "suspension")),
    SellerStyle("oilmarket", "روغن‌مارکت", 0.9, False, False, False, False, 0.9, 0.98, (1, 2), ("oils",)),
    SellerStyle("ghetekar", "قطعه‌کار", 0.84, True, False, True, False, 0.55, 0.95, (2, 3)),
    SellerStyle("parsyadak", "پارس یدک", 0.78, False, True, False, True, 0.5, 0.92, (2, 5)),
    SellerStyle("tabrizyadak", "تبریز یدک", 0.82, True, True, True, False, 0.45, 0.9, (3, 5)),
    SellerStyle("mashhadparts", "مشهد قطعه", 0.76, True, False, False, True, 0.4, 0.94, (3, 6)),
    SellerStyle("isfahanauto", "اصفهان اتو", 0.86, False, False, True, False, 0.5, 1.01, (2, 4)),
    SellerStyle("yadakbazar", "یدک‌بازار", 0.69, True, True, False, True, 0.6, 0.89, (4, 7)),
    SellerStyle("speedpart", "اسپیدپارت", 0.93, False, False, False, False, 0.55, 1.1, (0, 1)),
    SellerStyle("batrishop", "باتری‌شاپ", 0.89, True, False, False, False, 0.95, 0.97, (1, 2), ("electrical",)),
    SellerStyle("abzarkala", "ابزارکالا", 0.87, False, False, True, False, 0.9, 0.99, (1, 3), ("tools", "care")),
]

_FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
_AR = str.maketrans({"ی": "ي", "ک": "ك"})


def render_listings(s: SellerStyle) -> list[dict]:
    r = seeded_random(f"seller:{s.id}")
    out: list[dict] = []
    for i, p in enumerate(TRUTH):
        if r.random() > s.coverage or (s.groups and CATEGORY_BY_ID[p.cat].group not in s.groups):
            continue
        head = r.choice(p.cat_words) + (f" {p.pos}" if p.pos else "")
        brand = r.choice(p.brand_forms)
        fit = (("مناسب " if r.random() > 0.4 else "") + r.choice(p.fits)) if p.fits else ""
        specs: list[str] = []
        if p.line:
            specs.append(p.line)
        if p.viscosity:
            specs.append(p.viscosity if r.random() > 0.5 else p.viscosity.lower())
        if p.volume_l:
            specs.append("نیم لیتری" if p.volume_l < 1 else f"{int(p.volume_l)}{' ' if r.random() > 0.5 else ''}{r.choice(['لیتری', 'لیتر', 'L'])}")
        if p.ampere:
            specs.append(f"{p.ampere} {r.choice(['آمپر', 'AH', 'Ah'])}")
        if p.plug_code:
            specs.append(p.plug_code)
        original = r.choice(["اصلی", "اصل", "اورجینال"]) if r.random() > 0.55 else ""

        order = r.random()
        if order < 0.4:
            parts = [head, fit, brand, *specs, original]
        elif order < 0.7:
            parts = [head, brand, *specs, fit, original]
        else:
            shuffled = specs[:]
            r.shuffle(shuffled)
            parts = [brand, head, *shuffled, fit, original]

        title = (" - " if r.random() > 0.85 else " ").join(x for x in parts if x)
        if s.glued_digits:
            title = re.sub(r"([؀-ۿ]) (\d)", lambda m: m.group(1) + m.group(2) if r.random() > 0.5 else m.group(0), title)
        if s.arabic_letters:
            title = title.translate(_AR)
        if s.persian_digits:
            title = title.translate(_FA)

        price = round(p.base_price * s.price_bias * (0.9 + r.random() * 0.22) / 1000) * 1000
        num = price * 10 if s.rial else price
        price_text = f"{num:,} " + ("ریال" if s.rial else "تومان")
        if s.persian_digits:
            price_text = price_text.translate(_FA)

        in_stock = r.random() > 0.12
        warranty = r.choice(["گارانتی ۶ ماهه", "۱۲ ماه گارانتی", "ضمانت اصالت کالا", "گارانتی 18 ماه"]) if r.random() > 0.5 else None
        days = s.shipping_days[0] + int(r.random() * (s.shipping_days[1] - s.shipping_days[0] + 1))
        out.append({
            "title": title,
            "price_text": price_text,
            "stock_text": r.choice(["موجود", "در انبار", "ارسال فوری"]) if in_stock else r.choice(["ناموجود", "تماس بگیرید"]),
            "warranty_text": warranty,
            "shipping_text": "ارسال امروز" if days == 0 else f"ارسال {days} روزه",
            "external_id": f"{s.id}-{i}",
        })

    # junk rows every real crawl has
    out.append({"title": "کارت هدیه ۵۰۰ هزار تومانی", "price_text": "500,000 تومان", "stock_text": "موجود", "shipping_text": "ارسال 1 روزه", "external_id": f"{s.id}-junk1"})
    out.append({"title": "قطعه متفرقه کد 33421", "price_text": "تماس بگیرید", "stock_text": "موجود", "shipping_text": "", "external_id": f"{s.id}-junk2"})
    return out
