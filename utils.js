/*
 * @package apple-mail-backup
 * @copyright Copyright(c) 2013 Wouter Vroege. <wouter AT woutervroege DOT nl>
 * @author Wouter Vroege <wouter AT woutervroege DOT nl>
 */

var _ = require("underscore");
var sha1 = require('sha1');
var moment = require("moment");
var phpjs = require("phpjs");

/**
 * Constructor
 *
 */

var utils = module.exports = {

    getMessageUUID: function(data) {
        return sha1(data['Subject'] + data['Date'] + data['Message-ID']);
    },

    parseDateToUTCIsoDateTime: function(str) {
        return moment(str).utc().format()
    },

    getNameFromContactHeaderString: function(str) {
        if(!str)
            return "";
        var name = str
            .replace(/\n/g, "")
            .replace(/(^.*?)<.*?$/g, "$1")
            .replace(/(^\s+|\s+$|\"|\')/g, "")
        return utils.removeQuotedPrintables(name);
    },

    getEmailFromContactHeaderString: function(str) {
        if(!str)
            return "";
        var addresses = str
            .replace(/\n/g, "")
            .match(/\b\S+@\S+\.\S\S+\b/g) || [];
        return utils.removeQuotedPrintables(addresses.join(", "));
    },

    getMimeType: function(str) {
        if(!str)
            return "";
        return str
            .split(/;/)[0]
    },

    removeQuotedPrintables: function(html) {
        return phpjs.quoted_printable_decode(html);
    },

    removewhiteSpaces: function(str) {
        return str
            .replace(/(^\s+|\s+$|)/g, "")
    }


}