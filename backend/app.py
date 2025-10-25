from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import io
import os
import json
import base64
from pathlib import Path
import tempfile
import shutil

app = FastAPI(title="Wind Turbine Damage Detection API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load your trained model
# Get the parent directory (project root) and construct the correct path
current_dir = Path(__file__).parent
project_root = current_dir.parent
model_path = project_root / "runs" / "detect" / "nordtank_damage4" / "weights" / "best.pt"

if not model_path.exists():
    raise FileNotFoundError(f"Model not found at {model_path}")

model = YOLO(str(model_path))

# Create output directory
output_dir = project_root / "outputs"
output_dir.mkdir(exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Wind Turbine Damage Detection API", "status": "running"}

@app.post("/predict/image")
async def predict_image(file: UploadFile = File(...)):
    try:
        # Read and process image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Run prediction
        results = model.predict(image, conf=0.25, save=False)
        
        # Process results
        detections = []
        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = box.conf[0].cpu().numpy()
                    cls = int(box.cls[0].cpu().numpy())
                    class_name = model.names[cls]
                    
                    detections.append({
                        "class": class_name,
                        "confidence": float(conf),
                        "bbox": [float(x1), float(y1), float(x2), float(y2)],
                        "class_id": cls
                    })
        
        # Save annotated image
        annotated_img = results[0].plot()
        annotated_pil = Image.fromarray(annotated_img)
        
        # Convert to base64 for frontend
        buffered = io.BytesIO()
        annotated_pil.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            "success": True,
            "detections": detections,
            "annotated_image": img_str,
            "total_detections": len(detections)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/video")
async def predict_video(file: UploadFile = File(...)):
    try:
        # Save uploaded video temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Run prediction on video
        results = model.predict(tmp_file_path, conf=0.25, save=True, project=str(output_dir), name="video_prediction")
        
        # Find the output video
        output_video_path = None
        for result in results:
            if hasattr(result, 'save_dir'):
                video_files = list(Path(result.save_dir).glob("*.mp4"))
                if video_files:
                    output_video_path = str(video_files[0])
                    break
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
        if output_video_path and os.path.exists(output_video_path):
            return {
                "success": True,
                "output_video": output_video_path,
                "message": "Video processed successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to process video")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/video/frames")
async def predict_video_frames(file: UploadFile = File(...)):
    """Process video frame by frame and return detection data for each frame"""
    try:
        import cv2
        import base64
        
        # Save uploaded video temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Open video
        cap = cv2.VideoCapture(tmp_file_path)
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        
        # Process every 10th frame for performance (adjust as needed)
        frame_interval = max(1, fps // 2)  # Process 2 frames per second
        frame_data = []
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            if frame_count % frame_interval == 0:
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Run prediction
                results = model.predict(frame_rgb, conf=0.25, verbose=False)
                
                # Process detections
                detections = []
                if results[0].boxes is not None:
                    for box in results[0].boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = box.conf[0].cpu().numpy()
                        cls = int(box.cls[0].cpu().numpy())
                        class_name = model.names[cls]
                        
                        detections.append({
                            "class": class_name,
                            "confidence": float(conf),
                            "bbox": [float(x1), float(y1), float(x2), float(y2)],
                            "class_id": cls
                        })
                
                # Convert frame to base64 for frontend
                _, buffer = cv2.imencode('.jpg', frame)
                frame_base64 = base64.b64encode(buffer).decode('utf-8')
                
                frame_data.append({
                    "frame_number": frame_count,
                    "timestamp": frame_count / fps,
                    "detections": detections,
                    "frame_image": frame_base64
                })
            
            frame_count += 1
        
        cap.release()
        os.unlink(tmp_file_path)
        
        return {
            "success": True,
            "fps": fps,
            "total_frames": total_frames,
            "duration": duration,
            "frame_interval": frame_interval,
            "frames": frame_data,
            "message": f"Processed {len(frame_data)} frames"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/info")
async def get_model_info():
    return {
        "model_name": "Wind Turbine Damage Detection",
        "classes": model.names,
        "num_classes": len(model.names),
        "model_path": model_path
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
