import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    """
    Tüm hassas verilerin ve uygulama konfigürasyonunun Environment Variables
    (Ortam Değişkenleri) üzerinden okunmasını sağlayan güvenli sınıf.
    """
    
    # Uygulama Temel Config
    APP_NAME: str = "Interactive Physics Lab"
    ENVIRONMENT: str = "production"  # test, development, production
    DEBUG: bool = False
    
    # JWT Config (Secret Key MUST NOT have a default in real production)
    JWT_SECRET_KEY: str = "DUMMY_SECRET_KEY_REPLACE_IN_PROD_9f8d7e6c5b4a3"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15       # Kısa ömürlü (15 dk)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7          # 7 Gün 
    
    # External API Config
    EXTERNAL_API_URL: str = "https://kurum-api.gov.tr/v1"
    EXTERNAL_API_TIMEOUT: float = 5.0
    EXTERNAL_API_KEY: str = "MOCK_KEY"
    
    # Rate Limiting Config
    RATE_LIMIT_GLOBAL: str = "100/minute"
    RATE_LIMIT_LOGIN: str = "5/minute"          # Brute-force önleyici
    
    # Security Config
    ALLOWED_HOSTS: List[str] = ["*"]
    COOKIE_DOMAIN: str | None = None
    CSRF_SECRET: str = "CSRF_DUMMY_SECRET_REPLACE_IN_PROD"
    
    # pydantic_settings > v2.0 için model_config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Singleton Pattern - Tüm app buradan import edecek
settings = Settings()
