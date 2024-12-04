Steps for Conversion:

1 Install Requirements
Before running the conversion script, you need to install the required dependencies. To do this, navigate to the folder using:

    cd folder/HistcolAi/openslide

Then, run the following command to install the requirements:

    pip install -r requirements.txt

2 Run the Conversion Script
After installing the requirements, run the conversion script with:

    python converter.py

3 Provide Batch Name
Once the script starts, you will be prompted with the following text in the terminal:

4 Enter the name of the batch:

Enter the desired name for the batch. This name will appear in the URL, for example:
http://localhost:41062/HistoColAi/histocolai.html?source=images/<batch>/dzi_images.json#

5 Specify File Type
After entering the batch name, you will be prompted to specify the file type:

6 Enter WSI or DICOM depending on the type of image:

Enter either WSI or DICOM depending on the type of files being converted.

6 Finalize and Visualize
Once the conversion process is complete, a folder named after the batch will be created. Inside, you will find the DZI files. Copy this folder to:

/HistcolAi/HistocolAi/images

7 Now you can view the images in the application using the URL:
http://localhost:41062/HistoColAi/histocolai.html?source=images/<batch>/dzi_images.json#
