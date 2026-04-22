import base64
import io
from PIL import Image


def encode_image(uploaded_file) -> dict:
    """Convert a Streamlit UploadedFile to a Claude API image content block."""
    uploaded_file.seek(0)
    img = Image.open(uploaded_file)
    img.thumbnail((1568, 1568))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    b64 = base64.standard_b64encode(buf.getvalue()).decode()

    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": b64,
        },
    }
