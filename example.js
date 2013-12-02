var emlx2json = require("./server"),
    prettyjson = require("prettyjson");

var file1 = "/Users/woutervroege/Library/Mail/V2/IMAP-dgameijer33@mail.tenhorses.com/INBOX.mbox/ABD47E84-69BF-4DF0-AF24-735B3DF8460D/Data/0/0/1/Messages/100443.emlx";
var file2 = "/Users/woutervroege/Library/Mail/V2/IMAP-wouter@woutervroege.nl@mail.greenhost.nl/INBOX.mbox/ABD47E84-69BF-4DF0-AF24-735B3DF8460D/Data/0/0/1/Messages/100006.emlx";

// json = emlx2json.parseFileSync(file1);
// console.log(prettyjson.render(json));

json = emlx2json.parseFileSync(file1);
console.log(prettyjson.render(json));