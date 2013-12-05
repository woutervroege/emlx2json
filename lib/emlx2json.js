/*
 * @package emlx2json
 * @copyright Copyright(c) 2013 Wouter Vroege. <wouter AT woutervroege DOT nl>
 * @author Wouter Vroege <wouter AT woutervroege DOT nl>
 * @license http://github.com/woutervroege/emlx2json/blob/master/LICENSE MIT License
 */
"use strict";

var fs = require("fs");
var _ = require("underscore");
var mimelib = require("mimelib");

var emlx2json = module.exports = {

    /**
     * Parse File (async)
     *
     * @param {String} filePath
     * @return object
     */

    parseFile: function (filePath, callback) {
        fs.readFile(filePath, function (err, data) {
            if (err)
                return callback(err);
            var message = parse(data.toString());
            callback(null, message);
        })
    },

    /**
     * Parse File (sync)
     *
     * @param {String} filePath
     * @return object
     */

    parseFileSync: function (filePath) {
        var data = fs.readFileSync(filePath).toString();
        return parse(data);
    },

    /**
     * Parse String (async)
     *
     * @param {String} str
     * @return object
     */

    parseString: function (str) {
        return parse(string);
    }
}

    function parse(data) {
        var Message = {};
        var contents = stripUnixNewLines(data);
        var header = parseHeader(contents);
        var body = parseBody(contents);
        var headerKeys = getHeaderKeys(header);
        var kv = parseKeyValuePairs(headerKeys, header);
        _.map(kv, function (item, key) {
            Message[item.key] = item.value;
        })
        var contentTypeBoundaries = getContentTypeBoundaries(Message, body);
        Message['parts'] = parseBodyParts(body, contentTypeBoundaries);
        return Message;
    }

    function parseHeader(contents) {
        return contents.split(/\n\n/)[0];
    }

    function parseBody(contents) {
        var chunks = contents.split(/\n\n/g);
        return contents
            .substr(chunks[0].length)
            .split(/\<?xml /g)[0]
            .replace("<?", "")
            .replace(/\s+$/g, "")
    }

    function getHeaderKeys(header, isPart) {
        var pattern = (isPart) ? eval("/(\\n|^)Content\\-+.*?\\:/g") : eval("/(\\n|^)[A-Z]([A-Za-z]|\\-)+.*?\\:/g");
        return _.uniq(_.map(header.match(pattern), function (item) {
            return item.replace(/(^\n|\:$)/g, "");
        }));
    }

    function parseSubject(subj) {
        return _.map(subj.split(/\n/g), function(line) {
            return mimelib.decodeMimeWord(line)
        }).join("")
    }

    function stripUnixNewLines(content) {
        return content.replace(/\r\n/g, "\n");
    }

    function getBodyParts(content) {
        return content.split(/(\t|\n|\s)boundary=.*?$/gi);
    }

    function parseKeyValuePairs(keys, header) {

        var currentIndex = 0;
        var maxIndex = header.length;

        var content = header.replace(/\-/g, "\\-");

        return _.map(keys, function (key, i) {

            var currentKey = key.replace(/\-/g, "\\-");
            var nextKey = keys[i + 1]

            var pattern = eval("/(^|\\n)" + currentKey + "/");
            var pattern2 = (nextKey) ? eval("/(^|\\n)" + nextKey.replace(/\-/g, "\\-") + "/") : "";
            var start = header.match(pattern).index;
            var end = (nextKey) ? header.match(pattern2).index : maxIndex;

            var chunk = header.substring(start, end);
            var value = chunk
                .replace(eval("/((^|\\n)" + currentKey + "\: |\\n$)/g"), "")
                .replace(/(^\s|\s$|\;$)/g, "");
            return {
                key: key,
                start: start,
                end: end,
                value: (key.toLowerCase() == "subject") ? parseSubject(value) : value
            }
        });
    }

    function getContentTypeBoundaries(message, body) {
        var values = [];
        var headerValue = getHeadercontentTypeBoundaries(message);
        if (headerValue)
            values.push(headerValue);
        var bodyvalues = body.match(/(\t|\n|\s)boundary\=.*?\n/g);
        var b = _.map(bodyvalues, function (item) {
            return item
                .replace(/.*?boundary\=/g, "")
                .replace(/(.*?)\<.*?$/g, "$1")
                .replace(/^\n|\n$|\"/g, "")
                .replace(/^3DApple/, "Apple")
        })
        return _.uniq(values.concat(b));
    }

    function getHeadercontentTypeBoundaries(message) {
        var contentTypeKey = message["Content-Type"] || message["Content-type"];
        if (!contentTypeKey)
            return false;
        var queryBoundary = contentTypeKey.match(/boundary=.*?$/gi);
        return (queryBoundary) ? queryBoundary[0].replace(/(boundary\=|\")/g, "") : false;
    }

    function getBodyParts(body, contentTypeBoundaries) {
        if (contentTypeBoundaries.length === 0)
            return body.replace(/(\s+|\n+)$/g, "");

        var bodyLines = body.split(/\n/g);
        var parts = [
            []
        ];
        var currentPartIndex = 0;

        for (var i in bodyLines) {
            for (var x = 0; x < contentTypeBoundaries.length; x++) {
                if (bodyLines[i].indexOf(contentTypeBoundaries[x]) !== -1) {
                    currentPartIndex++;
                    parts[currentPartIndex] = [];
                } else {
                    var curIndex = parts[currentPartIndex].length - 1;
                    if (parts[currentPartIndex][curIndex] !== bodyLines[i]) {
                        var l = bodyLines[i];
                        for (var z in contentTypeBoundaries) {
                            l = l.replace(eval("/^(-+|)" + escapeSpecialChars(contentTypeBoundaries[z]) + ".*?(\\n|$)/g"), "");
                        }
                        parts[currentPartIndex].push(l);
                    }
                }
            }
        }

        var items = _.map(parts, function (item) {
            return item.join("\n");
        })

        return items;
    }

    function parseBodyParts(body, contentTypeBoundaries) {
        var items = [];
        if(contentTypeBoundaries.length === 0) {
           items.push(parseSingleBodyPart(body));
           return items;
        }
        var bodyParts = getBodyParts(body, contentTypeBoundaries);
        _.map(bodyParts, function (bodyPart) {
            var item = parseSingleBodyPart(bodyPart);
            if (!(Object.keys(item.headers).length === 0 && item.body.length === 0))
                items.push(item);
        })
        return items;
    }

    function parseSingleBodyPart(bodyPart) {
        var part = {
            headers: [],
            body: ""
        };
        var headerAndBodyChunks = bodyPart.split(/\n\n/g);
        var rawHeader = headerAndBodyChunks[0];
        var headerKeys = getHeaderKeys(rawHeader, true);
        console.log(headerKeys);
        var headerKeyValues = parseKeyValuePairs(headerKeys, rawHeader);
        part.headers = parseBodyPartHeadersFromKeyValuePairs(headerKeyValues);
        var body = stickBodyParts(headerAndBodyChunks);
        part.body = cleanupBody(body, part.headers);
        return part;
    }

    function stickBodyParts(bodyParts) {
        return bodyParts.splice(1).join("\n\n");
    }

    function parseBodyPartHeadersFromKeyValuePairs(headerKeyValues) {
        var headers = {};
        _.map(headerKeyValues, function (item) {
            headers[item.key] = item.value;
        });
        return headers;
    }

    function cleanupBody(body, headers) {
        if (headers) {
            if (headers['Content-Type'] && headers['Content-Type'].match(/^text\/html/)) {
                body = removePartsOutsideHtml(stripUselessWhiteSpace(stripNewLines(body)));
            }
        }
        return body;
    }

    function stripNewLines(text) {
        return text.replace(/(\=\n|\n|\=$)/g, "");
    }

    function stripUselessWhiteSpace(text) {
        return text.replace(/\s+/g, " ");
    }

    function removePartsOutsideHtml(text) {
        return text.replace(/\<\/html\>(.*?)$/g, "</html>")
    }

    function escapeSpecialChars(str) {
        var specials = [ /*strict order*/ "-", "[", "]" /*non-strict order */ , "/", "{", "}", "(", ")", "*", "+", "?", ".", "\\", "^", "$", "|"];
        var replacePattern = RegExp('[' + specials.join('\\') + ']', 'g');
        return str.replace(replacePattern, "\\$&");
    }