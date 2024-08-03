

# The path can also be read from a config file, etc.

import os
from os.path import *
import pydicom
import numpy as np
from PIL import Image
# from openslide import open_slide
OPENSLIDE_PATH = os.getcwd() + r'\openslide-win64-20231011\bin'
dicom_directory = os.getcwd() + r'\DICOM'
output_directory = os.getcwd() + r'\DZI'

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


def convert_dicom_to_image(dicom_path, output_path):
    # ds = pydicom.dcmread(dicom_path)
    # pixel_array = ds.pixel_array
    # image = Image.fromarray(pixel_array)
    # image.save(output_path)
    ds = pydicom.dcmread(dicom_path)
    rescale_slope = ds.RescaleSlope if 'RescaleSlope' in ds else 1
    rescale_intercept = ds.RescaleIntercept if 'RescaleIntercept' in ds else 0

    pixel_array = ds.pixel_array * rescale_slope + rescale_intercept

    # Normalize to 0-255
    pixel_array = np.clip(pixel_array, 0, 255).astype(np.uint8)
    
    # Create and save image
    image = Image.fromarray(pixel_array,  mode='L')
    image.save(output_path)

# def create_dzi(image_path, dzi_output_path, tile_size=254, overlap=1, limit_bounds=False):
#     slide = open_slide(image_path)
#     dz = DeepZoomGenerator(slide, tile_size=tile_size, overlap=overlap, limit_bounds=limit_bounds)
#     dz.save(dzi_output_path)

def create_dzi(image_path, dzi_output_path, tile_size=512, overlap=0, limit_bounds=False):
    
    slide = open_slide(image_path)
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
    
    # Write the DZI XML file
    dzi_xml = os.path.join(dzi_output_path, "dzi.xml")
    with open(dzi_xml, "w") as f:
        f.write(f"""<?xml version="1.0" encoding="utf-8"?>
             <?xml version="1.0" encoding="UTF-8"?>
            <Image xmlns="http://schemas.microsoft.com/deepzoom/2008"
            Format="jpg"
            Overlap="{overlap}"
            TileSize="{tile_size}"
            >
            <Size 
                Height="{slide.dimensions[1]}"
                Width="{slide.dimensions[0]}"
            />
            </Image>   """)


def get_pixel_spacing(dicom_path):
    ds = pydicom.dcmread(dicom_path)
    
    if 'PixelSpacing' in ds:
        pixel_spacing = ds.PixelSpacing  # This gives a list with two values [row_spacing, column_spacing]
        row_spacing = float(pixel_spacing[0])
        column_spacing = float(pixel_spacing[1])
        return row_spacing, column_spacing
    else:
        raise ValueError("Pixel spacing information is not available in the DICOM file")
    

def process_dicom_batch(dicom_dir, output_dir):
    print("process_dicom_batch.........")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for filename in os.listdir(dicom_dir):
        if filename.lower().endswith('.dcm'):
            dicom_path = os.path.join(dicom_dir, filename)
            image_output_path = os.path.join(output_dir, f'{os.path.splitext(filename)[0]}.tiff')
            dzi_output_path = os.path.join(output_dir, f'{os.path.splitext(filename)[0]}.dzi')
            


            # #####################################################################################
            # row_spacing, column_spacing = get_pixel_spacing(dicom_path)
            # print(f"Row spacing (Y-axis): {row_spacing} mm")
            # print(f"Column spacing (X-axis): {column_spacing} mm")

            # # To convert to pixels per meter:
            # pixels_per_meter_y = 1000 / row_spacing
            # pixels_per_meter_x = 1000 / column_spacing

            # print(f"Pixels per meter (Y-axis): {pixels_per_meter_y}")
            # print(f"Pixels per meter (X-axis): {pixels_per_meter_x}")
            # #####################################################################################

            # Convert DICOM to image
            convert_dicom_to_image(dicom_path, image_output_path)
            # Create DZI
            create_dzi(image_output_path, dzi_output_path)


print(OPENSLIDE_PATH)

process_dicom_batch(dicom_directory, output_directory)


