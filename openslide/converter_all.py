import os
from os.path import *
import pydicom
import numpy as np
from PIL import Image
import json
# from openslide import OpenSlide
# from openslide.deepzoom import DeepZoomGenerator

OPENSLIDE_PATH = os.getcwd() + r'\openslide-win64-20231011\bin'
dicom_directory = os.getcwd() + r'\DICOM'
wsi_directory = os.getcwd() + r'\WSI'
output_directory = os.getcwd() + r'\DZI'
image_directory = ""
pixelsPerMeter = 0

if hasattr(os, 'add_dll_directory'):
    # Windows
    with os.add_dll_directory(OPENSLIDE_PATH):
        print("With...")
        from openslide import *
        from openslide.deepzoom import DeepZoomGenerator
        
        
else:
    print("Else...")
    from openslide import *
    from openslide.deepzoom import DeepZoomGenerator

batch_name = input("Enter the name of the batch: ")
batch_type = input("Enter WSI or DICOM depending the type of image: ")

if(batch_type=="WSI"):
    print("True..............")
    image_directory=wsi_directory
elif(batch_type=="DICOM"):
    image_directory=dicom_directory
else:
    print("Error introducing data image type...")
    exit()



output_directory = output_directory + "\\" + batch_name

if not os.path.exists(output_directory):
    os.makedirs(output_directory)


def convert_dicom_to_image(dicom_path, output_path):
    """Converts a DICOM file to an image and saves it as TIFF."""
    global pixelsPerMeter

    # Read DICOM file
    ds = pydicom.dcmread(dicom_path)
    rescale_slope = ds.RescaleSlope if 'RescaleSlope' in ds else 1
    rescale_intercept = ds.RescaleIntercept if 'RescaleIntercept' in ds else 0

    # Get the Pixel per meter
    if 'PixelSpacing' in ds:
        pixel_spacing = ds.PixelSpacing  # A list like [row_spacing, column_spacing] in mm
    elif 'ImagerPixelSpacing' in ds:
        pixel_spacing = ds.ImagerPixelSpacing  # Backup if PixelSpacing is not available
    else:
        raise ValueError("No PixelSpacing or ImagerPixelSpacing available in DICOM file")

    # Convert spacing from mm to pixels per meter
    row_spacing = float(pixel_spacing[0])
    column_spacing = float(pixel_spacing[1])

    # Get the pixel per meter for JSON
    pixelsPerMeter = round(1000 / row_spacing)  # Pixels per meter for rows (Y-axis)
    pixelsPerMeter_X = round(1000 / column_spacing)

    print(f"Pixels per Meter X: {pixelsPerMeter_X}")

    # Apply rescale slope and intercept
    pixel_array = ds.pixel_array * rescale_slope + rescale_intercept

    # Windowing (contrast adjustment)
    if 'WindowCenter' in ds and 'WindowWidth' in ds:
        window_center = ds.WindowCenter if isinstance(ds.WindowCenter, float) else ds.WindowCenter[0]
        window_width = ds.WindowWidth if isinstance(ds.WindowWidth, float) else ds.WindowWidth[0]

        min_pixel_value = window_center - (window_width / 2)
        max_pixel_value = window_center + (window_width / 2)

        # Clip pixel values to the window range
        pixel_array = np.clip(pixel_array, min_pixel_value, max_pixel_value)

        # Normalize the array to 0-255
        pixel_array = ((pixel_array - min_pixel_value) / (max_pixel_value - min_pixel_value)) * 255.0
    else:
        # Use min and max of the data for scaling if no window info is available
        min_pixel_value = np.min(pixel_array)
        max_pixel_value = np.max(pixel_array)
        pixel_array = ((pixel_array - min_pixel_value) / (max_pixel_value - min_pixel_value)) * 255.0

    # Convert to 8-bit integer
    pixel_array = pixel_array.astype(np.uint8)

    # Create and save image
    image = Image.fromarray(pixel_array, mode='L')
    image.save(output_path)


def create_dzi(image_path, dzi_output_path, tile_size=512, overlap=0, limit_bounds=False):
    """Creates DZI tiles from an image or WSI file."""
    slide = OpenSlide(image_path)
    dz = DeepZoomGenerator(slide, tile_size=tile_size, overlap=overlap, limit_bounds=limit_bounds)

    # Create directories for the tiles
    for level in range(dz.level_count):
        level_dir = os.path.join(dzi_output_path, f"{level}")
        os.makedirs(level_dir, exist_ok=True)

        for row in range(dz.level_tiles[level][1]):
            for col in range(dz.level_tiles[level][0]):
                tile = dz.get_tile(level, (col, row))
                tile_path = os.path.join(level_dir, f"{col}_{row}.jpg")
                tile.save(tile_path)

    
    file_name = image_path.split("\\")[-1].split(".")
    # print("+++++++++")
    # print(file_name)
    # exit()

    # Write the DZI XML file
    dzi_xml = os.path.join(output_directory, file_name[0]+".dzi")
    with open(dzi_xml, "w") as f:
        f.write(f"""<?xml version="1.0" encoding="UTF-8"?>
        <Image xmlns="http://schemas.microsoft.com/deepzoom/2008"
        Format="jpg"
        Overlap="{overlap}"
        TileSize="{tile_size}"
        >
        <Size 
            Height="{slide.dimensions[1]}"
            Width="{slide.dimensions[0]}"
        />
        </Image>""")


def process_batch(input_dir, output_dir):
    """Processes DICOM and WSI files in the input directory."""
    print("Processing batch...")
    print(input_dir)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    directory = sorted(os.listdir(input_dir), reverse=True)
    print(f"Found files: {directory}")

    dzi_folders = []

    for filename in directory:
        file_path = os.path.join(input_dir, filename)
        image_output_path = os.path.join(output_dir, f"{os.path.splitext(filename)[0]}.tiff")
        dzi_output_path = os.path.join(output_dir, f"{os.path.splitext(filename)[0]}_files")

        if filename.lower().endswith('.dcm'):
            # Convert DICOM to image
            convert_dicom_to_image(file_path, image_output_path)
            # Create DZI
            create_dzi(image_output_path, dzi_output_path)
            # Delete TIFF
            os.remove(image_output_path)
        elif filename.lower().endswith(('.tif','.svs', '.ndpi', '.tiff', '.mrxs')):
            # Process WSI files directly
            create_dzi(file_path, dzi_output_path)
        else:
            print(f"Skipping unsupported file: {filename}")
            continue

        image_name = os.path.splitext(filename)[0]
        dzi_folders.append(f"images/{batch_name}/{image_name}.dzi")

    # Write JSON definition
    data = {
        "pixelsPerMeter": pixelsPerMeter,
        "tileSources": dzi_folders,
    }

    json_file_path = os.path.join(output_dir, "dzi_images.json")
    with open(json_file_path, "w") as json_file:
        json.dump(data, json_file, indent=4)

    print("Batch processing complete.")


# Run batch processing
process_batch(image_directory, output_directory)
