import os
import requests
from dotenv import load_dotenv

load_dotenv()

class YouTubeManager:
    def __init__(self):
        self.api_key = os.getenv("YOUTUBE_API_KEY")
        self.base_url = "https://www.googleapis.com/youtube/v3"

    def is_api_valid(self):
        if not self.api_key or self.api_key == "your_youtube_api_key_here":
            return False
        return True

    def get_video_suggestions(self, query="trending", max_results=2):
        """
        Fetches YouTube video suggestions based on a query.
        Defaults to trending videos if no query is provided.
        """
        if not self.is_api_valid():
            return {"error": "YouTube API Key is missing or invalid."}

        try:
            if query == "trending":
                endpoint = f"{self.base_url}/videos"
                params = {
                    "part": "snippet,statistics",
                    "chart": "mostPopular",
                    "regionCode": "IN", # Default to India, can be made dynamic
                    "maxResults": max_results,
                    "key": self.api_key
                }
            else:
                endpoint = f"{self.base_url}/search"
                params = {
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "maxResults": max_results,
                    "key": self.api_key
                }

            response = requests.get(endpoint, params=params, timeout=10)
            data = response.json()

            if "error" in data:
                return {"error": data["error"]["message"]}

            videos = []
            items = data.get("items", [])
            
            for item in items:
                video_id = item["id"] if isinstance(item["id"], str) else item["id"].get("videoId")
                snippet = item["snippet"]
                videos.append({
                    "id": video_id,
                    "title": snippet["title"],
                    "thumbnail": snippet["thumbnails"]["high"]["url"],
                    "channel": snippet["channelTitle"],
                    "published": snippet["publishedAt"],
                    "url": f"https://www.youtube.com/watch?v={video_id}"
                })
            
            return {"videos": videos}

        except Exception as e:
            return {"error": str(e)}

youtube_manager = YouTubeManager()
