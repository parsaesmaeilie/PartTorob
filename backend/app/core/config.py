from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    database_url: str = f"sqlite:///{(BASE_DIR / 'data' / 'qatee.db').as_posix()}"
    cors_origins: list[str] = ["http://localhost:3000"]
    # "off" forces the deterministic offline assistant
    ai_mode: str = "on"
    claude_model: str = "claude-opus-5-5"
    max_vehicles: int = 4
    # OTP — in dev mode the code is returned to the client and shown on screen instead of an SMS
    otp_dev_mode: bool = True
    otp_ttl_seconds: int = 120
    otp_resend_seconds: int = 30
    otp_max_attempts: int = 5
    session_days: int = 30
    secret_key: str = "dev-only-change-me"
    # simulated shops live inside the demo frontend; real adapters store the shop's own URL
    storefront_base_url: str = "http://localhost:3000/shop"


settings = Settings()
