import os
import sys
import json
import logging
import shutil
from datetime import datetime
from typing import List, Dict, Optional

logger = logging.getLogger("profiles_service")

class ProfilesService:
    _root_dir: Optional[str] = None
    _profiles_file: Optional[str] = None

    @classmethod
    def get_app_data_dir(cls) -> str:
        """Get the base directory for persistent app data."""
        if cls._root_dir:
            return cls._root_dir
        
        if os.environ.get('APP_DATA_DIR'):
            cls._root_dir = os.environ.get('APP_DATA_DIR')
        elif getattr(sys, 'frozen', False):
            # Production: Use LOCALAPPDATA
            cls._root_dir = os.path.join(os.environ.get('LOCALAPPDATA', os.path.expanduser("~")), "LMU_Telemetry_Lab")
        else:
            # Development: Use a local folder in the project for visibility, or stay in AppData
            # Let's stick to AppData for consistency between dev/prod logic
            cls._root_dir = os.path.join(os.environ.get('LOCALAPPDATA', os.path.expanduser("~")), "LMU_Telemetry_Lab_Dev")
            
        os.makedirs(cls._root_dir, exist_ok=True)
        return cls._root_dir

    @classmethod
    def _get_profiles_path(cls) -> str:
        if not cls._profiles_file:
            cls._profiles_file = os.path.join(cls.get_app_data_dir(), "profiles.json")
        return cls._profiles_file

    @classmethod
    def list_profiles(cls) -> List[Dict]:
        path = cls._get_profiles_path()
        if not os.path.exists(path):
            return []
        
        try:
            with open(path, 'r', encoding='utf-8') as f:
                profiles = json.load(f)
            
            # Enrich with session counts
            for p in profiles:
                data_dir = cls.get_profile_data_dir(p['id'])
                if os.path.exists(data_dir):
                    # Count .duckdb files
                    files = [f for f in os.listdir(data_dir) if f.endswith(".duckdb")]
                    p['session_count'] = len(files)
                else:
                    p['session_count'] = 0
                    
            return profiles
        except Exception as e:
            logger.error(f"Failed to read profiles.json: {e}")
            return []

    @classmethod
    def ensure_guest_profile(cls):
        """Ensure a guest profile exists."""
        profiles = cls.list_profiles()
        if not profiles:
            cls.create_profile("Guest", is_default=True)

    @classmethod
    def create_profile(cls, name: str, is_default: bool = False, avatar_url: Optional[str] = None) -> Dict:
        path = cls._get_profiles_path()
        profiles = cls.list_profiles()
        
        # Check for duplicates
        if any(p['name'].lower() == name.lower() for p in profiles):
            existing = next(p for p in profiles if p['name'].lower() == name.lower())
            return existing

        profile_id = name.lower().replace(" ", "_")
        if not profile_id: profile_id = "user_" + str(len(profiles))

        new_profile = {
            "id": profile_id,
            "name": name,
            "created_at": datetime.now().isoformat(),
            "last_used": datetime.now().isoformat(),
            "is_default": is_default,
            "avatar_url": avatar_url
        }

        # Create physical directory
        data_path = os.path.join(cls.get_app_data_dir(), "Data", profile_id)
        os.makedirs(os.path.join(data_path, "DuckDB_data"), exist_ok=True)
        os.makedirs(os.path.join(data_path, "cache"), exist_ok=True)
        os.makedirs(os.path.join(data_path, "avatars"), exist_ok=True)

        profiles.append(new_profile)
        cls._save_profiles(profiles)
        
        logger.info(f"Created new profile: {name} (ID: {profile_id})")
        return new_profile

    @classmethod
    def update_profile(cls, profile_id: str, new_name: str) -> bool:
        profiles = cls.list_profiles()
        for p in profiles:
            if p['id'] == profile_id:
                p['name'] = new_name
                cls._save_profiles(profiles)
                logger.info(f"Renamed profile {profile_id} to: {new_name}")
                return True
        return False

    @classmethod
    def update_profile_avatar(cls, profile_id: str, avatar_url: str) -> bool:
        profiles = cls.list_profiles()
        for p in profiles:
            if p['id'] == profile_id:
                p['avatar_url'] = avatar_url
                cls._save_profiles(profiles)
                return True
        return False

    @classmethod
    def _save_profiles(cls, profiles: List[Dict]):
        # Keep only the storage fields (don't save calculated session_count)
        storage_profiles = []
        for p in profiles:
            storage_p = {k: v for k, v in p.items() if k != 'session_count'}
            storage_profiles.append(storage_p)
            
        try:
            with open(cls._get_profiles_path(), 'w', encoding='utf-8') as f:
                json.dump(storage_profiles, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save profiles.json: {e}")

    @classmethod
    def get_profile_data_dir(cls, profile_id: str) -> str:
        """Returns the DuckDB_data path for a specific profile."""
        path = os.path.join(cls.get_app_data_dir(), "Data", profile_id, "DuckDB_data")
        os.makedirs(path, exist_ok=True)
        return path

    @classmethod
    def get_profile_cache_dir(cls, profile_id: str) -> str:
        """Returns the cache path for a specific profile."""
        path = os.path.join(cls.get_app_data_dir(), "Data", profile_id, "cache")
        os.makedirs(path, exist_ok=True)
        return path

    @classmethod
    def migrate_legacy_data(cls, legacy_data_dir: str):
        """Move data from project-root DuckDB_data to Guest profile if Guest is empty."""
        guest_dir = cls.get_profile_data_dir("guest")
        
        if not os.path.exists(legacy_data_dir):
            return

        # Check if Guest already has data
        guest_files = os.listdir(guest_dir)
        if len(guest_files) > 0:
            logger.info("Guest profile already has data, skipping migration from project root.")
            return

        # Perform migration
        legacy_files = [f for f in os.listdir(legacy_data_dir) if f.endswith(".duckdb")]
        if not legacy_files:
            return

        logger.info(f"Migrating {len(legacy_files)} legacy files to Guest profile...")
        for f in legacy_files:
            src = os.path.join(legacy_data_dir, f)
            dst = os.path.join(guest_dir, f)
            try:
                shutil.copy2(src, dst)
                logger.info(f"Migrated: {f}")
            except Exception as e:
                logger.error(f"Failed to migrate {f}: {e}")

    @classmethod
    def delete_profile(cls, profile_id: str):
        if profile_id == "guest":
            return # Protect guest
            
        profiles = cls.list_profiles()
        new_profiles = [p for p in profiles if p['id'] != profile_id]
        
        if len(new_profiles) == len(profiles):
            return # Not found
            
        # Delete files
        data_path = os.path.join(cls.get_app_data_dir(), "Data", profile_id)
        if os.path.exists(data_path):
            shutil.rmtree(data_path)
            
        cls._save_profiles(new_profiles)
        logger.info(f"Deleted profile: {profile_id}")
