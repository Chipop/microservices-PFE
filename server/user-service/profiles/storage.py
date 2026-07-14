import uuid
from abc import ABC, abstractmethod
from functools import lru_cache
from pathlib import Path
from urllib.parse import urljoin

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils import timezone


class ProfileStorageError(Exception):
    pass


class ProfileStorage(ABC):
    @abstractmethod
    def build_key(self, auth_user_id, filename):
        raise NotImplementedError

    @abstractmethod
    def upload(self, key, file_obj, content_type):
        raise NotImplementedError

    @abstractmethod
    def delete(self, key):
        raise NotImplementedError

    @abstractmethod
    def get_read_url(self, key):
        raise NotImplementedError


class LocalProfileStorage(ProfileStorage):
    def __init__(self):
        root = Path(settings.PROFILE_STORAGE_LOCAL_ROOT)
        self.storage = FileSystemStorage(location=root)
        self.base_url = settings.PROFILE_STORAGE_LOCAL_BASE_URL.rstrip("/") + "/"

    def build_key(self, auth_user_id, filename):
        suffix = Path(filename or "profile-picture").suffix.lower()
        return f"{settings.PROFILE_PICTURE_KEY_PREFIX}/{auth_user_id}/{uuid.uuid4().hex}{suffix}"

    def upload(self, key, file_obj, content_type):
        if self.storage.exists(key):
            self.storage.delete(key)
        self.storage.save(key, file_obj)
        return key

    def delete(self, key):
        if key and self.storage.exists(key):
            self.storage.delete(key)

    def get_read_url(self, key):
        if not key:
            return None
        return urljoin(self.base_url, key)


class AzureBlobProfileStorage(ProfileStorage):
    def __init__(self):
        try:
            from azure.storage.blob import BlobSasPermissions, BlobServiceClient, ContentSettings
            from azure.storage.blob import generate_blob_sas
        except ImportError as exc:
            raise ProfileStorageError("Azure storage backend requires azure-storage-blob.") from exc

        self.BlobSasPermissions = BlobSasPermissions
        self.BlobServiceClient = BlobServiceClient
        self.ContentSettings = ContentSettings
        self.generate_blob_sas = generate_blob_sas

        self.container = settings.AZURE_STORAGE_CONTAINER
        self.account_key = settings.AZURE_STORAGE_ACCOUNT_KEY
        self.account_name = settings.AZURE_STORAGE_ACCOUNT_NAME
        self.credential = None

        if settings.AZURE_STORAGE_CONNECTION_STRING:
            self.client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
            if not self.account_name:
                self.account_name = self.client.account_name
            if not self.account_key:
                parts = dict(
                    item.split("=", 1)
                    for item in settings.AZURE_STORAGE_CONNECTION_STRING.split(";")
                    if "=" in item
                )
                self.account_key = parts.get("AccountKey", "")
        elif settings.AZURE_STORAGE_ACCOUNT_URL:
            try:
                from azure.identity import DefaultAzureCredential
            except ImportError as exc:
                raise ProfileStorageError("Azure workload identity requires azure-identity.") from exc
            self.credential = DefaultAzureCredential()
            self.client = BlobServiceClient(
                account_url=settings.AZURE_STORAGE_ACCOUNT_URL,
                credential=self.credential,
            )
            if not self.account_name:
                self.account_name = self.client.account_name
        else:
            raise ProfileStorageError("Azure storage requires AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_URL.")

        if not self.container:
            raise ProfileStorageError("Azure storage requires AZURE_STORAGE_CONTAINER.")

    def build_key(self, auth_user_id, filename):
        suffix = Path(filename or "profile-picture").suffix.lower()
        return f"{settings.PROFILE_PICTURE_KEY_PREFIX}/{auth_user_id}/{uuid.uuid4().hex}{suffix}"

    def upload(self, key, file_obj, content_type):
        blob = self.client.get_blob_client(container=self.container, blob=key)
        blob.upload_blob(
            file_obj,
            overwrite=True,
            content_settings=self.ContentSettings(content_type=content_type),
        )
        return key

    def delete(self, key):
        if not key:
            return
        blob = self.client.get_blob_client(container=self.container, blob=key)
        try:
            blob.delete_blob()
        except Exception:
            pass

    def get_read_url(self, key):
        if not key:
            return None
        blob = self.client.get_blob_client(container=self.container, blob=key)
        expiry = timezone.now() + settings.PROFILE_PICTURE_SIGNED_URL_TTL
        if not self.account_key:
            user_delegation_key = self.client.get_user_delegation_key(timezone.now(), expiry)
            sas = self.generate_blob_sas(
                account_name=self.account_name,
                container_name=self.container,
                blob_name=key,
                user_delegation_key=user_delegation_key,
                permission=self.BlobSasPermissions(read=True),
                expiry=expiry,
            )
            return f"{blob.url}?{sas}"
        sas = self.generate_blob_sas(
            account_name=self.account_name,
            container_name=self.container,
            blob_name=key,
            account_key=self.account_key,
            permission=self.BlobSasPermissions(read=True),
            expiry=expiry,
        )
        return f"{blob.url}?{sas}"


@lru_cache(maxsize=1)
def get_profile_storage():
    backend = settings.PROFILE_STORAGE_BACKEND.lower()
    if backend == "azure":
        return AzureBlobProfileStorage()
    if backend == "local":
        return LocalProfileStorage()
    raise ProfileStorageError(f"Unsupported PROFILE_STORAGE_BACKEND: {settings.PROFILE_STORAGE_BACKEND}")
