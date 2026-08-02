import os
import json
import logging
import requests
import time
import threading

logger = logging.getLogger("discord_service")

class DiscordService:
    CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "discord_config.json")
    _shares_cache = {}  # key: channel_id -> (timestamp, data_list)
    _shares_cache_lock = threading.Lock()

    @classmethod
    def get_config(cls):
        if not os.path.exists(cls.CONFIG_PATH):
            return None
        try:
            with open(cls.CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load Discord config: {e}")
            return None

    @classmethod
    def is_configured(cls) -> bool:
        config = cls.get_config()
        return bool(config and config.get("bot_token"))

    @classmethod
    def get_invite_url(cls) -> str:
        config = cls.get_config()
        return config.get("invite_url") if config else "https://discord.gg/your-invite-code"

    @classmethod
    def get_channel_id(cls, car_class: str) -> str:
        config = cls.get_config()
        if not config or "channels" not in config:
            return None
        return config["channels"].get(car_class)

    @classmethod
    def get_guild_id(cls) -> str:
        config = cls.get_config()
        return config.get("guild_id") if config else None

    @classmethod
    def fetch_channel_tags(cls, channel_id: str) -> list:
        config = cls.get_config()
        if not config or not config.get("bot_token"):
            return []
        
        url = f"https://discord.com/api/v10/channels/{channel_id}"
        headers = {
            "Authorization": f"Bot {config['bot_token']}"
        }
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                channel_data = response.json()
                return channel_data.get("available_tags", [])
            else:
                logger.error(f"Failed to fetch channel details: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Error fetching channel tags: {e}")
        return []

    @classmethod
    def share_to_forum(cls, car_class: str, title: str, content: str, track_tag_name: str, file_paths: list) -> dict:
        config = cls.get_config()
        if not config or not config.get("bot_token"):
            return {"success": False, "error": "Discord Bot not configured"}

        channel_id = cls.get_channel_id(car_class)
        if not channel_id:
            return {"success": False, "error": f"No Discord channel ID configured for car class: {car_class}"}

        # 1. Fetch tags and match
        applied_tags = []
        if track_tag_name:
            tags = cls.fetch_channel_tags(channel_id)
            clean_track = track_tag_name.lower().strip()
            
            TRACK_ALIASES = {
                "algarve": ["portimao", "portimão"],
                "sarthe": ["le mans", "lemans"],
                "americas": ["cota"],
                "losail": ["lusail"],
                "spa-francorchamps": ["spa"],
                "monza": ["monza"],
                "mugello": ["mugello"],
                "sebring": ["sebring"],
                "fuji": ["fuji"],
                "bahrain": ["bahrain"],
                "interlagos": ["interlagos"],
                "pace": ["interlagos"],
                "imola": ["imola"],
                "silverstone": ["silverstone"],
                "barcelona": ["barcelona"]
            }
            
            potential_names = [clean_track]
            for key, aliases in TRACK_ALIASES.items():
                if key in clean_track:
                    potential_names.extend(aliases)
            
            def get_clean_words(text: str):
                for char in ["-", "_", ",", ".", "(", ")", "[", "]", "/"]:
                    text = text.replace(char, " ")
                return [w for w in text.split() if len(w) > 2]
                
            track_words = []
            for p in potential_names:
                track_words.extend(get_clean_words(p))
            
            matched = False
            for tag in tags:
                tag_name = tag.get("name", "").lower().strip()
                # A. Substring or exact match against any potential name
                if any(tag_name in p or p in tag_name for p in potential_names):
                    applied_tags.append(tag.get("id"))
                    logger.info(f"Matched track tag (substring/alias): {tag.get('name')} (ID: {tag.get('id')})")
                    matched = True
                    break
                # B. Word-based matching
                tag_words = get_clean_words(tag_name)
                if any(word in track_words for word in tag_words):
                    applied_tags.append(tag.get("id"))
                    logger.info(f"Matched track tag (words/alias): {tag.get('name')} (ID: {tag.get('id')})")
                    matched = True
                    break
            
            if not matched:
                logger.warning(f"No matching track tag found for track name: {track_tag_name}")

        # 2. Build files multipart payload
        url = f"https://discord.com/api/v10/channels/{channel_id}/threads"
        headers = {
            "Authorization": f"Bot {config['bot_token']}"
        }

        attachments = []
        files = []
        opened_files = []

        try:
            for idx, fp in enumerate(file_paths):
                if not os.path.exists(fp):
                    continue
                filename = os.path.basename(fp)
                attachments.append({
                    "id": idx,
                    "filename": filename,
                    "description": f"Uploaded file: {filename}"
                })
                f_handle = open(fp, "rb")
                opened_files.append(f_handle)
                files.append((f"files[{idx}]", (filename, f_handle)))

            # 3. Create thread payload_json
            payload = {
                "name": title,
                "message": {
                    "content": content,
                    "attachments": attachments
                }
            }
            if applied_tags:
                payload["applied_tags"] = applied_tags

            # Prepare multipart form fields
            data = {
                "payload_json": json.dumps(payload)
            }

            response = requests.post(url, headers=headers, data=data, files=files, timeout=30)

            # Close all files
            for fh in opened_files:
                fh.close()

            if response.status_code in [200, 201]:
                logger.info(f"Successfully posted to Discord thread: {response.json().get('id')}")
                return {"success": True, "thread_id": response.json().get("id")}
            else:
                logger.error(f"Failed to post to Discord Forum: {response.status_code} - {response.text}")
                return {"success": False, "error": f"Discord API error: {response.status_code} - {response.text}"}
        except Exception as e:
            # Ensure files are closed
            for fh in opened_files:
                try:
                    fh.close()
                except:
                    pass
            logger.error(f"Error posting to Discord Forum: {e}")
            return {"success": False, "error": str(e)}

    @classmethod
    def search_guild_member(cls, username: str) -> dict:
        """Search for a member in the Discord guild matching the given username.
        
        Returns a dict with 'user_id' and 'username' if found, otherwise None.
        """
        config = cls.get_config()
        if not config or not config.get("bot_token") or not config.get("guild_id"):
            logger.error("Discord config missing bot_token or guild_id")
            return None

        guild_id = config.get("guild_id")
        query = username.lstrip("@").strip()
        if not query:
            return None

        url = f"https://discord.com/api/v10/guilds/{guild_id}/members/search"
        headers = {
            "Authorization": f"Bot {config['bot_token']}"
        }
        params = {
            "query": query,
            "limit": 100
        }
        try:
            response = requests.get(url, headers=headers, params=params, timeout=10)
            if response.status_code == 200:
                members = response.json()
                query_lower = query.lower()
                
                # 1. First pass: exact match
                for member in members:
                    user_data = member.get("user", {})
                    user_name = user_data.get("username", "").lower()
                    global_name = user_data.get("global_name", "")
                    global_name_lower = global_name.lower() if global_name else ""
                    nick = member.get("nick", "")
                    nick_lower = nick.lower() if nick else ""

                    if (user_name == query_lower or 
                        global_name_lower == query_lower or 
                        nick_lower == query_lower):
                        return {
                            "user_id": user_data.get("id"),
                            "username": user_data.get("username")
                        }
                
                # 2. Second pass: fallback substring match
                for member in members:
                    user_data = member.get("user", {})
                    user_name = user_data.get("username", "").lower()
                    global_name = user_data.get("global_name", "")
                    global_name_lower = global_name.lower() if global_name else ""
                    nick = member.get("nick", "")
                    nick_lower = nick.lower() if nick else ""

                    if (query_lower in user_name or 
                        query_lower in global_name_lower or 
                        query_lower in nick_lower):
                        return {
                            "user_id": user_data.get("id"),
                            "username": user_data.get("username")
                        }
            else:
                logger.error(f"Failed to search guild members: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Error searching guild members: {e}")
        return None

    @classmethod
    def get_guild_member(cls, user_id: str) -> dict:
        config = cls.get_config()
        if not config or not config.get("bot_token") or not config.get("guild_id"):
            return None
            
        bot_token = config["bot_token"]
        guild_id = config["guild_id"]
        
        url = f"https://discord.com/api/v10/guilds/{guild_id}/members/{user_id}"
        headers = {
            "Authorization": f"Bot {bot_token}"
        }
        try:
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            logger.error(f"Failed to fetch guild member {user_id}: {e}")
        return None

    @classmethod
    def list_shared_laps(cls, car_class: str) -> list:
        config = cls.get_config()
        if not config or not config.get("bot_token") or not config.get("guild_id"):
            logger.error("Discord bot config is incomplete.")
            return []
            
        bot_token = config["bot_token"]
        guild_id = config["guild_id"]
        channel_id = config.get("channels", {}).get(car_class)
        if not channel_id:
            logger.error(f"Channel ID not found for car class: {car_class}")
            return []
            
        now = time.time()
        # Check cache
        with cls._shares_cache_lock:
            if channel_id in cls._shares_cache:
                timestamp, cached_data = cls._shares_cache[channel_id]
                if now - timestamp < 60: # 60 seconds TTL
                    logger.info(f"Returning cached shares for {car_class}")
                    return cached_data
                    
        headers = {
            "Authorization": f"Bot {bot_token}"
        }
        
        try:
            target_threads = []
            
            # A. Fetch active threads in guild and filter by parent_id (since channel-level active threads API doesn't exist in Discord)
            guild_active_url = f"https://discord.com/api/v10/guilds/{guild_id}/threads/active"
            active_r = requests.get(guild_active_url, headers=headers, timeout=10)
            if active_r.status_code == 200:
                all_active = active_r.json().get("threads", [])
                active_threads = [t for t in all_active if str(t.get("parent_id")) == str(channel_id)]
                target_threads.extend(active_threads)
            else:
                logger.error(f"Failed to fetch active guild threads: {active_r.status_code} - {active_r.text}")
                
            # B. Fetch public archived threads for this channel
            archived_url = f"https://discord.com/api/v10/channels/{channel_id}/threads/archived/public"
            archived_r = requests.get(archived_url, headers=headers, timeout=10)
            if archived_r.status_code == 200:
                target_threads.extend(archived_r.json().get("threads", []))
            else:
                logger.error(f"Failed to fetch archived channel threads: {archived_r.status_code} - {archived_r.text}")
                
            # Remove duplicates by thread id and filter out locked threads
            seen_ids = set()
            unique_threads = []
            for t in target_threads:
                tid = t.get("id")
                meta = t.get("thread_metadata", {}) or {}
                is_locked = t.get("locked", False) or meta.get("locked", False)
                if tid and tid not in seen_ids and not is_locked:
                    seen_ids.add(tid)
                    unique_threads.append(t)
            target_threads = unique_threads
            
            # Sort target threads by id descending (latest threads first)
            target_threads.sort(key=lambda t: t.get("id", ""), reverse=True)
            
            shared_laps = []
            # For each thread (limit to latest 20 to avoid rate limits), fetch the starter message
            # The starter message ID is the thread ID
            for t in target_threads[:20]:
                thread_id = t["id"]
                thread_name = t["name"]
                
                # Fetch message with ID = thread_id
                msg_url = f"https://discord.com/api/v10/channels/{thread_id}/messages/{thread_id}"
                msg_r = requests.get(msg_url, headers=headers, timeout=10)
                if msg_r.status_code == 200:
                    msg = msg_r.json()
                    content = msg.get("content", "")
                    cleaned_content = content
                    if "---" in content:
                        parts = content.split("---", 1)
                        cleaned_content = parts[1].strip()
                    
                    # Try to extract actual author from mention in content e.g. "Telemetry Shared by <@12345>"
                    import re
                    mention_match = re.search(r"<@(\d+)>", content)
                    resolved_author = False
                    
                    if mention_match:
                        real_user_id = mention_match.group(1)
                        member_info = cls.get_guild_member(real_user_id)
                        if member_info:
                            user_data = member_info.get("user", {})
                            author_id = user_data.get("id", real_user_id)
                            author_name = user_data.get("username", "Unknown")
                            author_global_name = user_data.get("global_name", "")
                            nick = member_info.get("nick", "")
                            author_display = nick or author_global_name or author_name
                            
                            # Resolve avatar URL
                            avatar_hash = user_data.get("avatar")
                            if avatar_hash:
                                avatar_url = f"https://cdn.discordapp.com/avatars/{author_id}/{avatar_hash}.png"
                            else:
                                default_avatar_index = (int(author_id) >> 22) % 6
                                avatar_url = f"https://cdn.discordapp.com/embed/avatars/{default_avatar_index}.png"
                            resolved_author = True

                    if not resolved_author:
                        author_data = msg.get("author", {})
                        author_name = author_data.get("username", "Unknown")
                        author_global_name = author_data.get("global_name", "")
                        author_display = author_global_name or author_name
                        
                        # Resolve avatar URL
                        avatar_hash = author_data.get("avatar")
                        author_id = author_data.get("id")
                        if avatar_hash:
                            avatar_url = f"https://cdn.discordapp.com/avatars/{author_id}/{avatar_hash}.png"
                        else:
                            default_avatar_index = (int(author_id) >> 22) % 6
                            avatar_url = f"https://cdn.discordapp.com/embed/avatars/{default_avatar_index}.png"
                    attachments = msg.get("attachments", [])
                    
                    # Look for telemetry (.duckdb) and setup (.svm) attachments
                    telemetry_att = None
                    setup_att = None
                    for att in attachments:
                        fn = att.get("filename", "").lower()
                        if fn.endswith(".duckdb"):
                            telemetry_att = {
                                "filename": att.get("filename"),
                                "url": att.get("url"),
                                "size": att.get("size")
                            }
                        elif fn.endswith(".svm"):
                            setup_att = {
                                "filename": att.get("filename"),
                                "url": att.get("url"),
                                "size": att.get("size")
                            }
                            
                    # Only include in lists if it has a telemetry attachment
                    if telemetry_att:
                        shared_laps.append({
                            "thread_id": thread_id,
                            "title": thread_name,
                            "author": {
                                "id": author_id,
                                "username": author_name,
                                "display_name": author_display,
                                "avatar_url": avatar_url
                            },
                            "content": cleaned_content,
                            "telemetry": telemetry_att,
                            "setup": setup_att,
                            "created_at": msg.get("timestamp", "")
                        })
                else:
                    logger.error(f"Failed to fetch starter message for thread {thread_id}: {msg_r.status_code}")
                    
            # Cache the result
            with cls._shares_cache_lock:
                cls._shares_cache[channel_id] = (time.time(), shared_laps)
                
            return shared_laps
            
        except Exception as e:
            logger.error(f"Error fetching shared laps from Discord: {e}", exc_info=True)
            return []

    @classmethod
    def download_discord_file(cls, url: str, dest_path: str):
        """Stream download file from Discord CDN and write to dest_path."""
        try:
            r = requests.get(url, stream=True, timeout=30)
            r.raise_for_status()
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            # Write atomically to prevent partial files on error
            temp_path = dest_path + ".tmp"
            with open(temp_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            os.replace(temp_path, dest_path)
            logger.info(f"Downloaded Discord file successfully to {dest_path}")
        except Exception as e:
            logger.error(f"Failed to download Discord file from {url} to {dest_path}: {e}")
            if os.path.exists(dest_path + ".tmp"):
                try:
                    os.remove(dest_path + ".tmp")
                except:
                    pass
            raise

    @classmethod
    def get_thread_attachments(cls, thread_id: str) -> dict:
        """Fetch starter message for a thread and return its telemetry/setup attachments."""
        config = cls.get_config()
        if not config or not config.get("bot_token"):
            return None
        bot_token = config["bot_token"]
        headers = {"Authorization": f"Bot {bot_token}"}
        # The starter message ID in forum threads is the thread ID itself
        url = f"https://discord.com/api/v10/channels/{thread_id}/messages/{thread_id}"
        try:
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code == 200:
                msg = r.json()
                attachments = msg.get("attachments", [])
                telemetry_att = None
                setup_att = None
                for att in attachments:
                    fn = att.get("filename", "").lower()
                    if fn.endswith(".duckdb"):
                        telemetry_att = {
                            "filename": att.get("filename"),
                            "url": att.get("url"),
                            "size": att.get("size")
                        }
                    elif fn.endswith(".svm"):
                        setup_att = {
                            "filename": att.get("filename"),
                            "url": att.get("url"),
                            "size": att.get("size")
                        }
                return {"telemetry": telemetry_att, "setup": setup_att}
            else:
                logger.error(f"Failed to fetch starter message for thread {thread_id}: {r.status_code} - {r.text}")
        except Exception as e:
            logger.error(f"Failed to fetch attachments for thread {thread_id}: {e}")
        return None


