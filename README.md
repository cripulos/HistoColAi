# HistoColAi

The server for deploy this example is Xampp but it can be deploying using another server wich support Php 5.6.39 and MySql 4.8.4

Steps to deploy in the local host the microdraw tool:

1 Download xampp-win32-5.6.39-0-VC11-installer.exe in https://sourceforge.net/projects/xampp/files/XAMPP%20Windows/5.6.39/.

2 Install Xampp.

3 Locate the installation folder and go to the folder /xampp/htdocs and create there a new folder "anotacion".

4 Download the files from git hub and copy them in to folder /xampp/htdocs/anotacion.

5 initialize phpMyAdmin from xampp console.

6 Create a new data base and named "histocolai".

7 Import to microdraw the data from histocolai.sql locates in the repository.

9 in the root path  /xampp/htdocs/histocolai/images create a new folder "crowdsourcing".

10 Go to https://gofile.me/4sVIM/1uQiIJ6h2 and click on "Dercargar carpeta" to download a test batch.

11 Unzip the file and copy them in the folder "crowdsourcing" in the root path  /xampp/htdocs/anotacion/images.

12 Run the apache server from Xampp console.

13 Visit https://localhost/anotacion/histocolai.html?source=images/crowdsourcing/dzi_images.json to enter in the application.

14 Login using user:test2 and password: test2.

Enjoy.

