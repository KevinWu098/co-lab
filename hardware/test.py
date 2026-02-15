import base64
import io
from PIL import Image
import anthropic

from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("ANTHROPIC_API_KEY")

client = anthropic.Anthropic(api_key=api_key)

image = Image.open("test_data/0.png")
buffered = io.BytesIO()
image.save(buffered, format="PNG")
img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

response = client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=10,
    temperature=0,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Give me the volume of liquid and/or foam in the flask in milliliters as just the number. "
                            "Use the graduation lines for reference. The height of substance may be higher than the highest marking. "
                            "Infer the volume if between markings. The angle of the image may be skewed. "
                            "If there is no flask respond with 0. If the flask overflows respond with 750"
                },
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": img_base64
                    }
                }
            ]
        }
    ]
)

print(response.content[0].text)