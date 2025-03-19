import { createSelector } from "reselect";
export const contentsOfFiles = (selector) => {
    return createSelector([selector], (selected) => {
        return Object.keys(selected).reduce((mm, k) => mm + selected[k], "");
    });
};
export const contentOfFile = (selector) => {
    return createSelector([selector], (selected) => {
        try {
            return selected[Object.keys(selected)[0]];
        }
        catch (e) {
            console.error("error", e);
            console.error("selected", selected);
            console.error("selector", selector);
            process.exit(-1);
        }
    });
};
export const srcAndContentOfFile = (selector, key) => {
    return createSelector([selector], (selected) => {
        return {
            src: key,
            content: selected[key],
        };
    });
};
export const srcAndContentOfFiles = (selector) => {
    return createSelector([selector], (selected) => {
        const keys = Object.keys(selected);
        return keys.map((key) => {
            return {
                src: key,
                content: selected[key],
            };
        });
    });
};
