import cv2
import numpy as np
from sklearn.cluster import KMeans
import os
import sys
import json
from ultralytics import YOLO
from PIL import Image

# --- Configuration ---

# Load the YOLOv8 model. 'yolov8n.pt' is a small and fast version.
# The model will be downloaded automatically on the first run.
# All logs from YOLO are suppressed to keep stdout clean for JSON output.
model = YOLO('yolov8n.pt')

# --- Core Computer Vision Functions ---

def get_dominant_color(image, k=4):
    """
    Finds the dominant color in an image region using K-Means clustering.
    Filters out black/white/gray unless they are very dominant.
    """
    # Reshape the image to be a list of pixels
    pixels = image.reshape(-1, 3)
    
    # Apply K-Means clustering
    kmeans = KMeans(n_clusters=k, n_init='auto', random_state=42)
    kmeans.fit(pixels)
    
    # Get cluster centers and labels
    cluster_centers = kmeans.cluster_centers_
    labels = kmeans.labels_
    
    # Count pixels in each cluster
    unique, counts = np.unique(labels, return_counts=True)
    
    # Sort clusters by size
    sorted_clusters = sorted(zip(counts, cluster_centers), key=lambda x: x[0], reverse=True)
    
    # Try to find the first non-achromatic (non-grayscale) color
    for count, color in sorted_clusters:
        r, g, b = color
        # Check if the color is not too gray/white/black
        # A simple check: if the variance of RGB values is low, it's likely grayscale.
        if np.std([r, g, b]) > 15: # Increased threshold to better detect subtle colors
            return tuple(map(int, color))
            
    # If all dominant colors are grayscale, return the most dominant one (the first in the sorted list)
    if sorted_clusters:
        return tuple(map(int, sorted_clusters[0][1]))
        
    # Fallback if something goes wrong
    return (0, 0, 0)

def get_color_name_hsv(rgb_tuple):
    """
    Maps an RGB tuple to a human-readable color name using the HSV color space,
    which is more robust to lighting changes.
    """
    # Convert the RGB color to a 1x1 pixel image, then to HSV
    rgb_color_np = np.uint8([[rgb_tuple]])
    hsv_color_np = cv2.cvtColor(rgb_color_np, cv2.COLOR_RGB2HSV)
    hue, saturation, value = hsv_color_np[0][0]

    # Define HSV ranges for colors. Hue is in [0, 179] in OpenCV.
    # These ranges are approximate and can be fine-tuned.
    if saturation < 25 and value > 180: return "white"
    if value < 50: return "black"
    if saturation < 50 and value < 180: return "gray"

    if (hue >= 0 and hue <= 10) or (hue >= 160 and hue <= 179):
        return "red"
    elif hue >= 11 and hue <= 25:
        return "orange"
    elif hue >= 26 and hue <= 34:
        return "yellow"
    elif hue >= 35 and hue <= 85: # Broadened green range
        return "green"
    elif hue >= 86 and hue <= 125: # Broadened blue range
        return "blue"
    elif hue >= 126 and hue <= 155:
        return "purple"
    elif hue > 155 and hue < 160: # Pink is a light red
        return "pink"
    
    # Fallback for colors like brown which are dark oranges/reds
    if (hue >= 5 and hue <= 25) and value < 130:
        return "brown"

    return "unknown" # Fallback

def process_image(image_path, yolo_model):
    """
    Main function to process an image, detect a person, and infer the shirt/top.
    Args:
        image_path (str): Path to the input image.
        yolo_model: The pre-trained YOLOv8 model.
    Returns:
        list: A list containing a single dictionary for the detected shirt.
    """
    if not os.path.exists(image_path):
        return [{"error": f"Image path not found at {image_path}"}]

    # Load the image with OpenCV and convert to RGB
    img_cv2_bgr = cv2.imread(image_path)
    if img_cv2_bgr is None:
        return [{"error": f"Could not read image from {image_path}"}]
    img_cv2_rgb = cv2.cvtColor(img_cv2_bgr, cv2.COLOR_BGR2RGB)

    # --- Step 1: Detect all objects using YOLOv8 ---
    results = yolo_model(img_cv2_rgb, verbose=False)
    
    detected_items = []
    class_names = yolo_model.names

    # --- Step 2: Filter for 'person' detections ---
    for result in results:
        person_boxes = [box for box, cls in zip(result.boxes.xyxy, result.boxes.cls) if class_names[int(cls)] == 'person']
        
        if not person_boxes:
            continue

        # --- Step 3: For each person, focus only on the shirt/torso area ---
        for box in person_boxes:
            x1, y1, x2, y2 = map(int, box)
            person_height = y2 - y1

            # --- New Heuristic: Isolate the Shirt Area ---
            # Start from 30% down to avoid the face/neck.
            # End at 100% to capture the full shirt.
            torso_y1 = y1 + int(person_height * 0.30)
            torso_y2 = y2 # Use the full bottom of the person box
            torso_crop = img_cv2_rgb[torso_y1:torso_y2, x1:x2]
            
            if torso_crop.size > 0:
                shirt_color_rgb = get_dominant_color(torso_crop)
                color_name = get_color_name_hsv(shirt_color_rgb)
                clothing_type = "shirt" # Simplified type
                detected_items.append({
                    "type": clothing_type,
                    "color": color_name,
                    "box": (x1, torso_y1, x2, torso_y2),
                    "dominant_color_rgb": shirt_color_rgb
                })
            
            # Only process the first person found for simplicity
            if detected_items:
                break
        
        if detected_items:
            break

    return detected_items

# --- Main Execution ---
if __name__ == "__main__":
    # The script expects one argument: the path to the image.
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python detect_clothing.py <image_path>"}), file=sys.stderr)
        sys.exit(1)

    image_to_process = sys.argv[1]
    
    # Process the image
    results = process_image(image_to_process, model)

    # Print the final results as a JSON string to standard output.
    # This is the only thing that should be printed to stdout.
    print(json.dumps(results, indent=4))
