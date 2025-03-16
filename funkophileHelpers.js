"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.srcAndContentOfFiles = exports.srcAndContentOfFile = exports.contentOfFile = exports.contentsOfFiles = void 0;
var reselect_1 = require("reselect");
var contentsOfFiles = function (selector) {
    return (0, reselect_1.createSelector)([selector], function (selected) {
        return Object.keys(selected).reduce(function (mm, k) { return mm + selected[k]; }, "");
    });
};
exports.contentsOfFiles = contentsOfFiles;
var contentOfFile = function (selector) {
    return (0, reselect_1.createSelector)([selector], function (selected) {
        try {
            return selected[Object.keys(selected)[0]];
        }
        catch (e) {
            console.error("error in contentOfFile", e);
            console.error("selected", selected);
            console.error("selector", selector);
            process.exit(-1);
        }
    });
};
exports.contentOfFile = contentOfFile;
var srcAndContentOfFile = function (selector, key) {
    return (0, reselect_1.createSelector)([selector], function (selected) {
        return {
            src: key,
            content: selected[key],
        };
    });
};
exports.srcAndContentOfFile = srcAndContentOfFile;
var srcAndContentOfFiles = function (selector) {
    return (0, reselect_1.createSelector)([selector], function (selected) {
        var keys = Object.keys(selected);
        return keys.map(function (key) {
            return {
                src: key,
                content: selected[key],
            };
        });
    });
};
exports.srcAndContentOfFiles = srcAndContentOfFiles;
