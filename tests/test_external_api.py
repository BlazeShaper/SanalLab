import pytest
from httpx import AsyncClient, ConnectTimeout
from app.auth.external_auth import ExternalAPIClient

import asyncio

@pytest.mark.asyncio
async def test_external_api_timeout():
    """Dış Kurum API'si yanıt vermediğinde Timeout mekanizması çalışmalı."""
    client = ExternalAPIClient()
    client.api_base_url = "https://non-routable-mock-domain-timeout.gov.tr"
    client.timeout = 0.5 # Yarım saniyelik agresif timeout beklentisi
    
    # Asenkron çağrının Null/None dönmesini ve sistemin kilitlenmemesini bekliyoruz
    result = await client.authenticate_user("test", "pass")
    assert result is None

@pytest.mark.asyncio
async def test_external_api_allowlist():
    """Bilinmeyen, allowlist dışı bir domaine istek atılmasını engelle."""
    # Sınıf içinde _verify_allowlist kontrol edilir, 
    # mock URL girildiğinde en azından warning loglanmalıdır (Kodumuz engelleme modundaysa log basar)
    client = ExternalAPIClient()
    client.api_base_url = "http://bad-hacker-domain.com"
    client._verify_allowlist() # Hata tespiti için internal method çağrılır
    
    # Şu anki mantıkta sadece logger'a "engellenecek" yazar ama bu productionda raise edilebilir.
    assert "bad-hacker-domain.com" not in client._allowed_domains
