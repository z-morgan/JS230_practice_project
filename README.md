To get the app running:

Assuming npm is installed on your machine:
1. run `npm install` in the project directory
2. run `npm start` to startup the server
3. use a browser to access the app at `http://localhost:3000/`

A note on design:
Each Create, Update, and Delete operation makes a single request to the back-end. Upon recieving a successful response, the app updates a front-end list of contacts and only updates the part of the page where the changed data is displayed. I wanted to try this out since it is a more performant strategy for large applications, however for an app of this size, it made the code more complicated than it needed to be. 
