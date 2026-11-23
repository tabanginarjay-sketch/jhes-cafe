"""Application settings loaded from environment variables (.env)."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed application configuration backed by backend/.env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application metadata
    APP_NAME: str = "Jhe's Cafe' API"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "production"
    DEBUG: bool = False

    # API & CORS
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:3002,http://127.0.0.1:3002"

    # Airtable Web API Configuration
    AIRTABLE_PAT: str = ""
    AIRTABLE_BASE_ID: str = ""
    AIRTABLE_API_URL: str = "https://api.airtable.com/v0"

    # Table Names or Table IDs (tbl...)
    AIRTABLE_TABLE_PRODUCTS: str = "tblcQD4QoANpq0ytK"
    AIRTABLE_TABLE_CATEGORIES: str = "Categories"
    AIRTABLE_TABLE_ORDERS: str = "Orders"
    AIRTABLE_TABLE_ORDER_ITEMS: str = "OrderItems"
    AIRTABLE_TABLE_INVENTORY: str = "Inventory"
    AIRTABLE_TABLE_USERS: str = "Users"
    AIRTABLE_TABLE_STAFF: str = "Staff"
    AIRTABLE_TABLE_PAYMENTS: str = "Payments"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a clean list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_airtable_configured(self) -> bool:
        """Check if both Airtable PAT and Base ID are configured and non-placeholder."""
        pat = self.AIRTABLE_PAT.strip()
        base_id = self.AIRTABLE_BASE_ID.strip()
        if not pat or not base_id:
            return False
        if "YOUR_AIRTABLE_PAT" in pat or "CHANGE_ME" in pat:
            return False
        if "YOUR_BASE_ID" in base_id or "CHANGE_ME" in base_id:
            return False
        return True


@lru_cache
def get_settings() -> Settings:
    """Return cached Settings instance so .env is parsed once per process."""
    return Settings()


settings = get_settings()
