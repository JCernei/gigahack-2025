import os
import json
import random
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
from PIL import Image
from io import BytesIO
import uvicorn
import uuid

# Load environment variables from .env file
load_dotenv()

# Configure the API key from environment variable
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("Please set the GEMINI_API_KEY in your .env file")

# Load tiles data
try:
    with open('../tile_scraper/tiles_data.json', 'r') as f:
        tiles_data = json.load(f)
except Exception as e:
    raise ValueError(f"Error loading tiles_data.json: {str(e)}")

app = FastAPI(title="Image Generation API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=api_key)

PREDEFINED_PROMPT = """Using the provided images,
    replace the flooring material/pattern from image 2 
    onto the floor area of the room in image 1. 
    If the flooring material/pattern from image 2 
    is a tile, use multiple tiles to cover the entire floor area. 
    Ensure that the features of image 1’s room—walls, furniture, layout, 
    light direction, camera angle remain completely unchanged. 
    The added element should match perspective and scale; align to room 
    boundaries/baseboards; respect occlusions under furniture; 
    inherit lighting/white balance; preserve existing shadows while adding 
    realistic contact shadows/reflections appropriate to the material; 
    keep edges clean at thresholds/doorways."""

def process_uploaded_image(image_data: bytes) -> Image.Image:
    return Image.open(BytesIO(image_data))

@app.get("/tiles")
async def get_random_tile():
    if not tiles_data:
        raise HTTPException(status_code=500, detail="No tiles data available")
    
    random_tile = random.choice(tiles_data)
    tile_image_path = os.path.join('../tile_scraper/downloaded_images', random_tile['image_paths'][0])
    
    if not os.path.exists(tile_image_path):
        raise HTTPException(status_code=404, detail="Tile image not found")
        
    return FileResponse(
        path=tile_image_path,
        media_type="image/jpeg",
        filename=os.path.basename(tile_image_path)
    )

async def generate_with_images(room_image: Image.Image, tile_image: Image.Image):
    """Helper function to generate a new design with given room and tile images"""
    try:
        # Generate content with Gemini
        response = client.models.generate_content(
            model="gemini-2.5-flash-image-preview",
            contents=[room_image, tile_image, PREDEFINED_PROMPT],
        )

        # Extract generated image
        image_parts = [
            part.inline_data.data
            for part in response.candidates[0].content.parts
            if part.inline_data
        ]

        if not image_parts:
            raise HTTPException(status_code=500, detail="No image was generated")

        # Create the generated image
        output_image = Image.open(BytesIO(image_parts[0]))
        return output_image

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tiles/generate-random/")
async def generate_with_random_tile(files: List[UploadFile] = File(...)):
    """Generate a design using the uploaded room image and a random tile"""
    # Validate files
    if not files or len(files) != 1:
        raise HTTPException(status_code=400, detail="Exactly one room image is required")
    
    try:
        # Process the room image
        room_content = await files[0].read()
        room_image = process_uploaded_image(room_content)

        # Get a random tile image
        if not tiles_data:
            raise HTTPException(status_code=500, detail="No tiles data available")
        
        random_tile = random.choice(tiles_data)
        tile_image_path = os.path.join('../tile_scraper/downloaded_images', random_tile['image_paths'][0])
        
        if not os.path.exists(tile_image_path):
            raise HTTPException(status_code=404, detail="Tile image not found")

        # Load the tile image
        tile_image = Image.open(tile_image_path)

        # Generate the design
        output_image = await generate_with_images(room_image, tile_image)
        
        # Save to temporary file with unique name
        output_path = f"generated_image_{uuid.uuid4()}.png"
        output_image.save(output_path)
        
        return FileResponse(
            path=output_path,
            media_type="image/png",
            filename="generated_image.png"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tiles/generate/")
async def generate_image(files: List[UploadFile] = File(...)):
    """Generate a design using both uploaded room and tile images"""
    # Validate number of files
    if len(files) != 2:
        raise HTTPException(status_code=400, detail="Exactly two images are required: room and tile")
    
    try:
        # Process uploaded images
        room_content = await files[0].read()
        tile_content = await files[1].read()
        room_image = process_uploaded_image(room_content)
        tile_image = process_uploaded_image(tile_content)
        
        # Generate the design
        output_image = await generate_with_images(room_image, tile_image)

        # Get the output image from helper function
        output_image = await generate_with_images(room_image, tile_image)
        
        # Save to temporary file with unique name
        output_path = f"generated_image_{uuid.uuid4()}.png"
        output_image.save(output_path)
        
        # Create background task to delete the file after sending
        # background_tasks = BackgroundTasks()
        # background_tasks.add_task(os.unlink, output_path)
        
        # Return the file and set it to be deleted after sending
        return FileResponse(
            path=output_path,
            media_type="image/png",
            filename="generated_image.png",
            # background=background_tasks
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
