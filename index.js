//all required libraries and files
const { google } = require('googleapis');
const express = require('express')
const OAuth2Data = require('./google_key.json')
const fs= require('fs')
const app = express()
const content=require('./user-details.json')
const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris;

//setup client using credentials
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;
// route for login
app.get('/', (req, res) => {
    //check if already authenticated
    if (!authed) {
        // Generate an OAuth URL and redirect there
        const url = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://mail.google.com/',
                'https://www.googleapis.com/auth/gmail.modify',
                'https://www.googleapis.com/auth/gmail.compose',
                'https://www.googleapis.com/auth/gmail.send'
            ]
        });
        console.log(url)
        res.redirect(url);
    } else {
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
        gmail.users.getProfile({
            userId: 'me',
        }, (err, res) => {
            //get user email id
            if (err) return console.log('The API returned an error: ' + err);
            const details = res.data;
            //check if details exist
            if (details) {
                console.log('User Details:');
                console.log(details)
                //save the details in a json file
                fs.writeFile('user-details.json',JSON.stringify(details),function (err){
                    if (err) throw err;
                    console.log('Successfully saved')
                })

            } else {
                console.log('No details found.');
            }
        });
        res.send('Logged in')
    }
})
//to handle authenticated callback
app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code
    if (code) {
        // Get an access token based on our OAuth code
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating')
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                //redirect to the main page
                res.redirect('/')
            }
        });
    }
});
//generate email body and send
async function sendemail(auth,to,from,subject,message){
    const gmail=google.gmail({ version: 'v1', auth })
    //email setup
    var str = ["Content-Type: text/html; charset=\"UTF-8\"\n",
        "MIME-Version: 1.0\n",
        "Content-Transfer-Encoding: 7bit\n",
        "to:",to,"\n",
        "from:", from, "\n",
        "subject:", subject, "\n\n",
        message
    ].join('');
    var encodedMail = new Buffer.alloc(str.length).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
    var temp='RnJvbTogWWFzaCBTaGFoIDx5YXNoc2hhaDUxOEBnbWFpbC5jb20-IApUbzogeWFzaHNoYWg1MThAZ21haWwuY29tClN1YmplY3Q6IFNheWluZyBIZWxsbyAKTWVzc2FnZS1JRDogPDEyMzRAbG9jYWwubWFjaGluZS5leGFtcGxlPgoKVGhpcyBpcyBhIG1lc3NhZ2UganVzdCB0byBzYXkgaGVsbG8uIFNvLCAiSGVsbG8iLg'
    //the code works with temp which is encoded online but throws some error when i use encoded email I went throug the docs but no such format is defined for node.js and also the forums do not contain much about the error
    //works fine for temp encoded online
    let email= await gmail.users.messages.send({
        auth: auth,
        userId: 'me',
        resource:{
            raw: temp//specify email
        }
    })
    return email

}
//endpoint to handle the request
app.get('/sendemail',async (req,res,next)=>{
    var emailId=content.emailAddress
    console.log(typeof(emailId))
    let email=await sendemail(oAuth2Client,emailId,'yashshah518@gmail.com','Hello Message',"Hello from emailer app!!")

    res.json({email})
})
//configure port number
const port = process.env.port || 5000
app.listen(port, () => console.log(`Server running at ${port}`));