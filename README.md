# HistoColAi

# Deployment for windows.

The server for deploy this example is Xampp but it can be deploying using another server wich support Php 5.6.39 and MySql 4.8.4

Steps to deploy in the local host the HistoColAi tool:

1 Download xampp-win32-5.6.39-0-VC11-installer.exe in https://sourceforge.net/projects/xampp/files/XAMPP%20Windows/5.6.39/.

2 Install Xampp.

3 Locate the installation folder and go to the folder /xampp/htdocs and create there a new folder "histocolai".

4 Download the files from git hub and copy them in to folder /xampp/htdocs/histocolai/.

5 initialize phpMyAdmin from xampp console.

6 Create a new data base and named "histocolai".

7 Import to histocolai the data from histocolai.sql locates in the folder DataBase of the repository.

8 Go to https://gofile.me/4sVIM/1uQiIJ6h2 and click on "Dercargar carpeta" to download a test batch.

9 Unzip the file on the root path  /xampp/htdocs/histocolai/images/.

10 Run the apache server from Xampp console.

11 Visit https://localhost/histocolai/histocolai.html?source=images/crowdsourcing/dzi_images.json to enter in the application.

12 Login using user:test2 and password: test2.

Enjoy.

#Linux deployment

1 On linux terminal with a Docker installed execute tomsik68/xampp:5  to dowload Docker image.
2 Run docker service with "docker run --name myXampp -p 41061:22 -p 41062:80 -d -v /directory/gitHIstocolAirepo_fodler/:/opt/lampp/htdocs tomsik68/xampp:5"
3 Attach docker with "docker exec -it myXampp bash"
3 Inser the docker execute "export PATH=/opt/lampp/bin:$PATH"
4 Import Data Base  executing "mysql -u root --password='' < /opt/lampp/htdocs/DataBase/histocolai.sql"




