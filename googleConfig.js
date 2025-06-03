const {google} = require('googleapis');

const GOOGLE_CLIENT_ID='179499710765-9o4pl0c3clhhr7tg03v6vjv342lr06fs.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET='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';


exports.oauth2client=new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'postmessage'
)