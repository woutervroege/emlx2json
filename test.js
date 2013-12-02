var emlx2json = require("./lib/emlx2json");
emlx2json.parseFile("/Users/woutervroege/Library/Mail/V2/IMAP-wouter@woutervroege.nl@mail.greenhost.nl/INBOX.mbox/ABD47E84-69BF-4DF0-AF24-735B3DF8460D/Data/0/0/1/Messages/100006.emlx", function(err, json) {
    console.log(JSON.stringify(json));
})