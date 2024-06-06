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

8 Go to https://upvedues-my.sharepoint.com/:u:/g/personal/cripulos_upv_edu_es/EfmRroYGSPhOtvNcAROT5eYBiVcAsw309bZmy-JKQIrfoA?e=wI1ZfB.

9 Unzip the file on the root path  /xampp/htdocs/histocolai/images/.

10 Run the apache server from Xampp console.

11 Visit https://localhost/histocolai/histocolai.html?source=images/batch_spitzoid_proof/dzi_images.json to enter in the application.

12 Login using user:test2 and password: test2.

Enjoy.

#Linux deployment

1 Download repo and go to the folder /image/ and unzip "batch_spitzoid_proof" wich can be dowload from https://upvedues-my.sharepoint.com/:u:/g/personal/cripulos_upv_edu_es/EfmRroYGSPhOtvNcAROT5eYBiVcAsw309bZmy-JKQIrfoA?e=wI1ZfB .

1 On linux terminal with a Docker installed execute tomsik68/xampp:5  to dowload Docker image.

2 Run docker service with "docker run --name myXampp -p 41061:22 -p 41062:80 -d -v /directory/gitHIstocolAirepo_fodler/:/opt/lampp/htdocs tomsik68/xampp:5".

3 Attach docker with "docker exec -it myXampp bash".

3 Inser the docker execute "export PATH=/opt/lampp/bin:$PATH".

4 Import Data Base  executing "mysql -u root --password='' < /opt/lampp/htdocs/DataBase/histocolai.sql".

5 Access by the url http://ServeIP:41062/HistoColAi/histocolai.html?source=images/batch_spitzoid_proof/dzi_images.json# .

6 In case to want to access to the databe http://ServeIP:41062/phpmyadmin/.




