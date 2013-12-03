require("./lib/emlx2json").parseFile("./test.emlx", function(err, json) {
    console.log(err, json);
})